"""
Device management routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid
import asyncio

from config import (
    devices_collection, groups_collection, history_collection, 
    alerts_collection, device_types_collection
)
from models import DeviceCreate, DeviceUpdate, DeviceTypeCreate, DeviceTypeUpdate
from services.auth_service import get_current_user, require_role
from services.device_service import check_single_device, check_all_devices

router = APIRouter(tags=["devices"])

# ============ DEVICE TYPES ============

@router.get("/device-types")
async def get_device_types(current_user: dict = Depends(get_current_user)):
    return {"device_types": await device_types_collection.find({}, {"_id": 0}).to_list(length=None)}

@router.post("/device-types")
async def create_device_type(data: DeviceTypeCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    dt = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "icon": data.icon,
        "color": data.color or "#6b7280",
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await device_types_collection.insert_one(dt)
    dt.pop("_id", None)
    return {"message": "Tipo creado", "device_type": dt}

@router.put("/device-types/{type_id}")
async def update_device_type(type_id: str, data: DeviceTypeUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if not await device_types_collection.find_one({"id": type_id}):
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await device_types_collection.update_one({"id": type_id}, {"$set": update})
    return {"message": "Tipo actualizado", "device_type": await device_types_collection.find_one({"id": type_id}, {"_id": 0})}

@router.delete("/device-types/{type_id}")
async def delete_device_type(type_id: str, current_user: dict = Depends(require_role(["admin", "manager"]))):
    dt = await device_types_collection.find_one({"id": type_id})
    if not dt:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    if dt.get("is_default"):
        raise HTTPException(status_code=400, detail="No se pueden eliminar tipos predeterminados")
    await device_types_collection.delete_one({"id": type_id})
    await devices_collection.update_many({"device_type_id": type_id}, {"$set": {"device_type_id": None}})
    return {"message": "Tipo eliminado"}

# ============ DEVICES ============

@router.get("/devices")
async def get_devices(group_id: Optional[str] = None, organization_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if group_id:
        query["group_id"] = group_id
    elif organization_id:
        group_ids = [g["id"] for g in await groups_collection.find({"organization_id": organization_id}, {"id": 1}).to_list(length=None)]
        if group_ids:
            query["group_id"] = {"$in": group_ids}
    
    # Operators only see cameras that are online
    if current_user.get("role") == "operator":
        query["device_type_id"] = "type-camera"
        query["status"] = "online"
    
    # Technicians see ALL devices (read-only access)
    return {"devices": await devices_collection.find(query, {"_id": 0}).to_list(length=None)}

@router.get("/cameras")
async def get_cameras(current_user: dict = Depends(get_current_user)):
    """Get all cameras (for operators view)"""
    query = {"device_type_id": "type-camera"}
    cameras = await devices_collection.find(query, {"_id": 0}).to_list(length=None)
    return {"cameras": cameras}

@router.post("/devices")
async def create_device(data: DeviceCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if await devices_collection.find_one({"ip_address": data.ip_address, "port": data.port}):
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con esa IP y puerto")
    
    # Build image_url from camera fields if provided
    image_url = data.image_url or ""
    protocol = data.camera_protocol or "http"
    if data.camera_user and data.camera_password and data.camera_path:
        image_url = f"{protocol}://{data.camera_user}:{data.camera_password}@{data.ip_address}:{data.port}{data.camera_path}"
    
    device = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "ip_address": data.ip_address,
        "port": data.port,
        "description": data.description or "",
        "group_id": data.group_id,
        "device_type_id": data.device_type_id,
        "brand": data.brand or "",
        "model": data.model or "",
        "location": data.location or "",
        "notes": data.notes or "",
        "image_url": image_url,
        "camera_protocol": protocol,
        "camera_user": data.camera_user or "",
        "camera_password": data.camera_password or "",
        "camera_path": data.camera_path or "",
        "has_statistics": data.has_statistics or False,
        "status": "unknown",
        "last_check": None,
        "last_online": None,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await devices_collection.insert_one(device)
    device.pop("_id", None)
    return {"message": "Dispositivo creado", "device": device}

@router.get("/devices/{device_id}")
async def get_device(device_id: str, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return device

@router.put("/devices/{device_id}")
async def update_device(device_id: str, data: DeviceUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Rebuild image_url if camera fields are updated
    camera_protocol = update.get("camera_protocol", device.get("camera_protocol", "http"))
    camera_user = update.get("camera_user", device.get("camera_user", ""))
    camera_password = update.get("camera_password", device.get("camera_password", ""))
    camera_path = update.get("camera_path", device.get("camera_path", ""))
    ip_address = update.get("ip_address", device.get("ip_address", ""))
    port = update.get("port", device.get("port", ""))
    
    if camera_user and camera_password and camera_path:
        update["image_url"] = f"{camera_protocol}://{camera_user}:{camera_password}@{ip_address}:{port}{camera_path}"
    
    if update:
        await devices_collection.update_one({"id": device_id}, {"$set": update})
    
    updated_device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    return {"message": "Dispositivo actualizado", "device": updated_device}

@router.delete("/devices/{device_id}")
async def delete_device(device_id: str, current_user: dict = Depends(require_role(["admin", "manager"]))):
    result = await devices_collection.delete_one({"id": device_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    await history_collection.delete_many({"device_id": device_id})
    return {"message": "Dispositivo eliminado"}

@router.post("/devices/{device_id}/check")
async def check_device_manual(device_id: str, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    await devices_collection.update_one({"id": device_id}, {"$set": {"status": "checking"}})
    result = await check_single_device(device_id, background_alert=False)
    return {"message": "Verificación completada", "result": result}

@router.post("/devices/check-all")
async def check_all_devices_endpoint(current_user: dict = Depends(get_current_user)):
    asyncio.create_task(check_all_devices())
    return {"message": "Verificación iniciada"}

# ============ HISTORY & ALERTS ============

@router.get("/devices/{device_id}/history")
async def get_device_history(device_id: str, limit: int = 100, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    history = await history_collection.find({"device_id": device_id}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    return {"device": device, "history": history}

@router.get("/alerts")
async def get_alerts(limit: int = 50, current_user: dict = Depends(get_current_user)):
    return {"alerts": await alerts_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)}

@router.put("/devices/reorder")
async def reorder_devices(data: dict, current_user: dict = Depends(require_role(["admin", "manager"]))):
    """Update device order (from drag and drop)"""
    device_orders = data.get("device_orders", [])
    for order in device_orders:
        await devices_collection.update_one(
            {"id": order["id"]},
            {"$set": {"sort_order": order.get("sort_order", 0)}}
        )
    return {"message": "Orden actualizado"}
