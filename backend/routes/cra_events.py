"""
CRA Events API - Manages events from FTP Proxy and CRA alerts
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List
import uuid
import os

from config import db, devices_collection, organizations_collection, groups_collection, logger
from services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/cra-events", tags=["cra-events"])

# CRA Events collection
cra_events_collection = db["cra_events"]

# Storage directories
CRA_STORAGE_DIR = Path(__file__).parent.parent / "uploads" / "cra_events"
CRA_THUMBNAILS_DIR = CRA_STORAGE_DIR / "thumbnails"
CRA_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
CRA_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)


@router.get("")
async def get_cra_events(
    camera_ip: Optional[str] = None,
    device_id: Optional[str] = None,
    days: int = 7,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get CRA events with optional filters"""
    query = {}
    
    # Filter by camera IP
    if camera_ip:
        query["camera_ip"] = camera_ip
    
    # Filter by device_id
    if device_id:
        query["device_id"] = device_id
    
    # Filter by date range
    if days > 0:
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        query["timestamp"] = {"$gte": start_date.isoformat()}
    
    events = await cra_events_collection.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Enrich with device info
    for event in events:
        if event.get("camera_ip"):
            device = await devices_collection.find_one(
                {"ip_address": event["camera_ip"]},
                {"_id": 0, "id": 1, "name": 1, "group_id": 1}
            )
            if device:
                event["device_id"] = device.get("id")
                event["device_name"] = device.get("name")
                event["group_id"] = device.get("group_id")
                
                # Get organization
                if device.get("group_id"):
                    group = await groups_collection.find_one(
                        {"id": device["group_id"]},
                        {"_id": 0, "name": 1, "organization_id": 1}
                    )
                    if group:
                        event["group_name"] = group.get("name")
                        org = await organizations_collection.find_one(
                            {"id": group["organization_id"]},
                            {"_id": 0, "name": 1}
                        )
                        if org:
                            event["organization_name"] = org.get("name")
    
    return {"events": events, "total": len(events)}


@router.get("/stats")
async def get_cra_events_stats(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get CRA events statistics"""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Total events
    total = await cra_events_collection.count_documents({
        "timestamp": {"$gte": start_date.isoformat()}
    })
    
    # Events today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today = await cra_events_collection.count_documents({
        "timestamp": {"$gte": today_start.isoformat()}
    })
    
    # Events by camera (top 10)
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$camera_ip", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_camera = await cra_events_collection.aggregate(pipeline).to_list(length=10)
    
    # Events by hour (for chart)
    pipeline_hourly = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$addFields": {
            "hour": {"$hour": {"$dateFromString": {"dateString": "$timestamp"}}}
        }},
        {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    by_hour = await cra_events_collection.aggregate(pipeline_hourly).to_list(length=24)
    
    return {
        "total_events": total,
        "events_today": today,
        "events_by_camera": by_camera,
        "events_by_hour": by_hour,
        "period_days": days
    }


@router.get("/{event_id}")
async def get_cra_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific CRA event"""
    event = await cra_events_collection.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"event": event}


@router.get("/file/{filename}")
async def get_cra_event_file(filename: str):
    """Serve CRA event file (video/image)"""
    file_path = CRA_STORAGE_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    ext = Path(filename).suffix.lower()
    content_types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.mp4': 'video/mp4', '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
        '.mov': 'video/quicktime', '.mxg': 'video/x-mxg'
    }
    
    return FileResponse(
        file_path,
        media_type=content_types.get(ext, 'application/octet-stream'),
        headers={"Cache-Control": "max-age=86400"}
    )


@router.get("/thumbnail/{filename}")
async def get_cra_event_thumbnail(filename: str):
    """Serve CRA event thumbnail"""
    thumb_path = CRA_THUMBNAILS_DIR / filename
    
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail no encontrado")
    
    return FileResponse(
        thumb_path,
        media_type='image/jpeg',
        headers={"Cache-Control": "max-age=86400"}
    )


@router.delete("/{event_id}")
async def delete_cra_event(
    event_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Delete a CRA event"""
    event = await cra_events_collection.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    # Delete associated files
    if event.get("saved_filename"):
        file_path = CRA_STORAGE_DIR / event["saved_filename"]
        if file_path.exists():
            try:
                os.remove(file_path)
            except:
                pass
        
        # Delete thumbnail
        thumb_name = Path(event["saved_filename"]).stem + ".jpg"
        thumb_path = CRA_THUMBNAILS_DIR / thumb_name
        if thumb_path.exists():
            try:
                os.remove(thumb_path)
            except:
                pass
    
    await cra_events_collection.delete_one({"id": event_id})
    return {"message": "Evento eliminado"}


@router.post("/manual")
async def create_manual_cra_event(
    camera_ip: str = Form(...),
    description: str = Form(""),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Manually create a CRA event (for testing or manual registration)"""
    
    saved_filename = None
    file_size = 0
    
    if file:
        ext = Path(file.filename).suffix.lower() or '.dat'
        saved_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = CRA_STORAGE_DIR / saved_filename
        
        contents = await file.read()
        file_size = len(contents)
        
        with open(file_path, 'wb') as f:
            f.write(contents)
    
    # Find device by IP
    device = await devices_collection.find_one({"ip_address": camera_ip}, {"_id": 0})
    
    event = {
        "id": str(uuid.uuid4()),
        "camera_ip": camera_ip,
        "device_id": device.get("id") if device else None,
        "device_name": device.get("name") if device else None,
        "original_filename": file.filename if file else None,
        "saved_filename": saved_filename,
        "file_size": file_size,
        "description": description,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": "manual",
        "created_by": current_user.get("username"),
        "has_thumbnail": False
    }
    
    await cra_events_collection.insert_one(event)
    event.pop("_id", None)
    
    return {"message": "Evento CRA registrado", "event": event}


# Function to be called by FTP Proxy
async def register_ftp_event(event_data: dict):
    """Register an FTP event from the proxy"""
    # Find device by IP
    device = await devices_collection.find_one(
        {"ip_address": event_data.get("camera_ip")},
        {"_id": 0, "id": 1, "name": 1}
    )
    
    if device:
        event_data["device_id"] = device.get("id")
        event_data["device_name"] = device.get("name")
    
    await cra_events_collection.insert_one(event_data)
    logger.info(f"CRA Event registered: {event_data.get('original_filename')} from {event_data.get('camera_ip')}")


# Sync function for use in FTP proxy (thread-safe)
def register_ftp_event_sync(event_data: dict):
    """Synchronous version for FTP proxy callback"""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(register_ftp_event(event_data))
        else:
            loop.run_until_complete(register_ftp_event(event_data))
    except Exception as e:
        logger.error(f"Error registering FTP event: {e}")
