"""
Device installation images routes
Gallery for documenting device installations
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import uuid
import os

from config import device_images_collection, devices_collection, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/device-images", tags=["device-images"])

# Upload directory for device images
DEVICE_IMAGES_DIR = Path(__file__).parent.parent / "uploads" / "device_images"
DEVICE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Allowed extensions
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB for installation photos


@router.get("")
async def get_all_device_images(
    device_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all device images, optionally filtered by device_id"""
    query = {}
    if device_id:
        query["device_id"] = device_id
    
    images = await device_images_collection.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=None)
    
    # Enrich with device info
    for img in images:
        device = await devices_collection.find_one({"id": img.get("device_id")}, {"_id": 0, "name": 1, "ip_address": 1, "group_id": 1})
        if device:
            img["device_name"] = device.get("name", "")
            img["device_ip"] = device.get("ip_address", "")
            img["group_id"] = device.get("group_id", "")
    
    return {"images": images}


@router.get("/device/{device_id}")
async def get_device_images(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all images for a specific device"""
    # Verify device exists
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    images = await device_images_collection.find(
        {"device_id": device_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=None)
    
    return {
        "device_id": device_id,
        "device_name": device.get("name", ""),
        "images": images
    }


@router.post("")
async def upload_device_image(
    file: UploadFile = File(...),
    device_id: str = Form(...),
    description: str = Form(""),
    installation_date: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Upload a new installation image for a device"""
    
    # Verify device exists
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido. Usa: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read and check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande. Máximo 10MB")
    
    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = DEVICE_IMAGES_DIR / unique_name
    
    # Ensure directory exists
    try:
        DEVICE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Cannot create device images directory: {e}")
        raise HTTPException(status_code=500, detail="Error al crear directorio de imágenes")
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Create database record
        image_record = {
            "id": str(uuid.uuid4()),
            "device_id": device_id,
            "filename": unique_name,
            "original_filename": file.filename,
            "url": f"/api/device-images/file/{unique_name}",
            "description": description,
            "installation_date": installation_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "uploaded_by": current_user.get("username", "unknown"),
            "uploaded_by_id": current_user.get("id", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "file_size": len(contents)
        }
        
        await device_images_collection.insert_one(image_record)
        image_record.pop("_id", None)
        
        logger.info(f"Device image uploaded: {unique_name} for device {device_id} by {current_user.get('username')}")
        
        return {
            "message": "Imagen subida correctamente",
            "image": image_record
        }
        
    except Exception as e:
        logger.error(f"Error uploading device image: {e}")
        # Clean up file if database insert failed
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error al guardar imagen: {str(e)}")


@router.get("/file/{filename}")
async def get_device_image_file(filename: str):
    """Serve a device image file"""
    file_path = DEVICE_IMAGES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    # Determine content type
    ext = Path(filename).suffix.lower()
    content_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return FileResponse(
        file_path,
        media_type=content_type,
        headers={"Cache-Control": "max-age=86400"}
    )


@router.put("/{image_id}")
async def update_device_image(
    image_id: str,
    description: str = Form(None),
    installation_date: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Update image description or installation date"""
    image = await device_images_collection.find_one({"id": image_id})
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    update_data = {}
    if description is not None:
        update_data["description"] = description
    if installation_date is not None:
        update_data["installation_date"] = installation_date
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = current_user.get("username", "unknown")
        await device_images_collection.update_one({"id": image_id}, {"$set": update_data})
    
    return {"message": "Imagen actualizada"}


@router.delete("/{image_id}")
async def delete_device_image(
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a device image"""
    image = await device_images_collection.find_one({"id": image_id})
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    # Delete file
    file_path = DEVICE_IMAGES_DIR / image.get("filename", "")
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception as e:
            logger.error(f"Error deleting image file: {e}")
    
    # Delete database record
    await device_images_collection.delete_one({"id": image_id})
    
    logger.info(f"Device image deleted: {image_id} by {current_user.get('username')}")
    
    return {"message": "Imagen eliminada"}


@router.get("/stats")
async def get_image_stats(current_user: dict = Depends(get_current_user)):
    """Get statistics about device images"""
    total_images = await device_images_collection.count_documents({})
    
    # Count devices with images
    pipeline = [
        {"$group": {"_id": "$device_id"}},
        {"$count": "devices_with_images"}
    ]
    result = await device_images_collection.aggregate(pipeline).to_list(length=1)
    devices_with_images = result[0]["devices_with_images"] if result else 0
    
    # Recent uploads
    recent = await device_images_collection.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(length=5)
    
    return {
        "total_images": total_images,
        "devices_with_images": devices_with_images,
        "recent_uploads": recent
    }
