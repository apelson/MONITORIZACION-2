"""
Backup and restore routes
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from pathlib import Path
import json
import io
import os
import asyncio
import zipfile

from config import (
    devices_collection, organizations_collection, groups_collection,
    device_types_collection, users_collection, alerts_collection,
    settings_collection, history_collection, scheduled_reports_collection,
    public_dashboards_collection, logger
)
from services.auth_service import require_role

router = APIRouter(prefix="/backup", tags=["backup"])

# Backup directory
BACKUP_DIR = Path(__file__).parent.parent / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

# Collections to backup
COLLECTIONS = {
    "organizations": organizations_collection,
    "groups": groups_collection,
    "devices": devices_collection,
    "device_types": device_types_collection,
    "users": users_collection,
    "alerts": alerts_collection,
    "settings": settings_collection,
    "history": history_collection,
    "scheduled_reports": scheduled_reports_collection,
    "public_dashboards": public_dashboards_collection,
}

async def create_backup_data(include_history: bool = True):
    """Create backup data from all collections"""
    backup = {
        "version": "1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "collections": {}
    }
    
    for name, collection in COLLECTIONS.items():
        # Skip history if not requested (can be very large)
        if name == "history" and not include_history:
            continue
        
        try:
            docs = await collection.find({}, {"_id": 0}).to_list(length=None)
            backup["collections"][name] = docs
            logger.info(f"Backup: {name} - {len(docs)} documents")
        except Exception as e:
            logger.error(f"Error backing up {name}: {e}")
            backup["collections"][name] = []
    
    return backup

@router.get("/download")
async def download_backup(
    include_history: bool = False,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Download a complete backup as JSON"""
    backup = await create_backup_data(include_history)
    
    # Create JSON
    json_data = json.dumps(backup, indent=2, ensure_ascii=False, default=str)
    
    # Create filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"siempria_backup_{timestamp}.json"
    
    return StreamingResponse(
        io.BytesIO(json_data.encode('utf-8')),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/download-zip")
async def download_backup_zip(
    include_history: bool = False,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Download a complete backup as ZIP (smaller file)"""
    backup = await create_backup_data(include_history)
    
    # Create JSON
    json_data = json.dumps(backup, indent=2, ensure_ascii=False, default=str)
    
    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("backup.json", json_data)
    
    zip_buffer.seek(0)
    
    # Create filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"siempria_backup_{timestamp}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    merge: bool = False,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Restore data from a backup file"""
    try:
        contents = await file.read()
        
        # Handle ZIP files
        if file.filename.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(contents)) as zip_file:
                contents = zip_file.read("backup.json")
        
        backup = json.loads(contents.decode('utf-8'))
        
        if "collections" not in backup:
            raise HTTPException(status_code=400, detail="Formato de backup inválido")
        
        restored = {}
        
        for name, docs in backup["collections"].items():
            if name not in COLLECTIONS:
                continue
            
            collection = COLLECTIONS[name]
            
            # If not merging, clear existing data first
            if not merge:
                await collection.delete_many({})
            
            # Insert documents
            if docs:
                # For merge mode, use upsert
                if merge:
                    for doc in docs:
                        if "id" in doc:
                            await collection.update_one(
                                {"id": doc["id"]},
                                {"$set": doc},
                                upsert=True
                            )
                else:
                    await collection.insert_many(docs)
            
            restored[name] = len(docs)
            logger.info(f"Restored: {name} - {len(docs)} documents")
        
        return {
            "message": "Backup restaurado correctamente",
            "restored": restored,
            "mode": "merge" if merge else "replace"
        }
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="El archivo no es un JSON válido")
    except Exception as e:
        logger.error(f"Error restoring backup: {e}")
        raise HTTPException(status_code=500, detail=f"Error al restaurar: {str(e)}")

@router.get("/list")
async def list_backups(current_user: dict = Depends(require_role(["admin"]))):
    """List automatic backups stored on server"""
    backups = []
    
    if BACKUP_DIR.exists():
        for f in sorted(BACKUP_DIR.glob("*.json"), reverse=True):
            stat = f.stat()
            backups.append({
                "filename": f.name,
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        for f in sorted(BACKUP_DIR.glob("*.zip"), reverse=True):
            stat = f.stat()
            backups.append({
                "filename": f.name,
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    
    return {"backups": backups[:20]}  # Last 20 backups

@router.get("/auto/{filename}")
async def download_auto_backup(
    filename: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Download a specific automatic backup"""
    file_path = BACKUP_DIR / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Backup no encontrado")
    
    # Security check - ensure file is in backup directory
    if not str(file_path.resolve()).startswith(str(BACKUP_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    media_type = "application/zip" if filename.endswith('.zip') else "application/json"
    
    return StreamingResponse(
        open(file_path, 'rb'),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.delete("/auto/{filename}")
async def delete_auto_backup(
    filename: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Delete a specific automatic backup"""
    file_path = BACKUP_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Backup no encontrado")
    
    # Security check
    if not str(file_path.resolve()).startswith(str(BACKUP_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    os.remove(file_path)
    return {"message": "Backup eliminado"}

@router.post("/create-auto")
async def create_auto_backup(
    include_history: bool = False,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Create an automatic backup on the server"""
    backup = await create_backup_data(include_history)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"auto_backup_{timestamp}.json"
    file_path = BACKUP_DIR / filename
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(backup, f, indent=2, ensure_ascii=False, default=str)
    
    # Cleanup old backups (keep last 10)
    await cleanup_old_backups(keep=10)
    
    return {
        "message": "Backup automático creado",
        "filename": filename,
        "size": file_path.stat().st_size
    }

async def cleanup_old_backups(keep: int = 10):
    """Remove old automatic backups, keeping only the most recent ones"""
    if not BACKUP_DIR.exists():
        return
    
    all_backups = sorted(
        list(BACKUP_DIR.glob("auto_backup_*.json")) + list(BACKUP_DIR.glob("auto_backup_*.zip")),
        key=lambda f: f.stat().st_mtime,
        reverse=True
    )
    
    for old_backup in all_backups[keep:]:
        try:
            os.remove(old_backup)
            logger.info(f"Deleted old backup: {old_backup.name}")
        except Exception as e:
            logger.error(f"Error deleting old backup: {e}")

async def scheduled_backup():
    """Function to be called by scheduler for automatic backups"""
    logger.info("Starting scheduled backup...")
    try:
        backup = await create_backup_data(include_history=False)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"auto_backup_{timestamp}.json"
        file_path = BACKUP_DIR / filename
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(backup, f, ensure_ascii=False, default=str)
        
        await cleanup_old_backups(keep=10)
        logger.info(f"Scheduled backup completed: {filename}")
    except Exception as e:
        logger.error(f"Scheduled backup failed: {e}")
