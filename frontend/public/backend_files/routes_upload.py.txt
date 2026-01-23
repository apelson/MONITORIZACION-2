"""
File upload routes for images/logos
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
import uuid
import os
import shutil

from services.auth_service import get_current_user, require_role
from config import logger

router = APIRouter(prefix="/upload", tags=["upload"])

# Upload directory
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed extensions
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.jfif', '.bmp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """Upload an image file and return the URL"""
    
    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo de archivo no permitido. Usa: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande. Máximo 5MB")
    
    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
        
        logger.info(f"File uploaded: {unique_name} by {current_user.get('username')}")
        
        # Return the URL path (will be served by the API)
        return {
            "message": "Archivo subido correctamente",
            "filename": unique_name,
            "url": f"/api/upload/{unique_name}"
        }
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar el archivo")

@router.get("/{filename}")
async def get_uploaded_file(filename: str):
    """Serve an uploaded file"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    # Determine content type
    ext = Path(filename).suffix.lower()
    content_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return FileResponse(
        file_path, 
        media_type=content_type,
        headers={"Cache-Control": "max-age=86400"}  # Cache 1 day
    )

@router.delete("/{filename}")
async def delete_uploaded_file(
    filename: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Delete an uploaded file"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    try:
        os.remove(file_path)
        logger.info(f"File deleted: {filename} by {current_user.get('username')}")
        return {"message": "Archivo eliminado"}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar el archivo")
