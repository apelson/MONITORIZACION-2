"""
Multi-tenant device routes - devices are scoped to tenant database
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import secrets

from routes.tenant_auth import get_current_tenant_user, require_tenant_role
from services.tenant_service import (
    check_device_limit, update_device_count, 
    check_verification_limit, increment_verification_count
)

router = APIRouter(prefix="/devices", tags=["Tenant Devices"])

class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    port: int = 80
    group_id: Optional[str] = None
    device_type_id: str = "type-other"
    image_url: Optional[str] = None
    web_url: Optional[str] = None
    camera_user: Optional[str] = None
    camera_password: Optional[str] = None
    camera_path: Optional[str] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    group_id: Optional[str] = None
    device_type_id: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    web_url: Optional[str] = None
    camera_user: Optional[str] = None
    camera_password: Optional[str] = None
    camera_path: Optional[str] = None

# ============ ROUTES ============

@router.get("")
async def get_devices(
    group_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current: dict = Depends(get_current_tenant_user)
):
    """Get all devices for the current tenant"""
    tenant_db = current["tenant_db"]
    user = current["user"]
    limits = current["limits"]
    
    query = {}
    
    if group_id:
        query["group_id"] = group_id
    
    if status_filter and status_filter in ["online", "offline"]:
        query["status"] = status_filter
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"ip_address": {"$regex": search, "$options": "i"}}
        ]
    
    # Operators only see online cameras
    if user.get("role") == "operator":
        query["device_type_id"] = "type-camera"
        query["status"] = "online"
    
    devices = await tenant_db.devices.find(query, {"_id": 0}).to_list(length=None)
    
    return {
        "devices": devices,
        "limits": {
            "current": len(devices),
            "max": limits.max_devices
        }
    }

@router.post("")
async def create_device(
    device: DeviceCreate,
    current: dict = Depends(require_tenant_role(["admin", "manager"]))
):
    """Create a new device for the current tenant"""
    tenant_db = current["tenant_db"]
    tenant = current["tenant"]
    
    # Check device limit
    limit_check = await check_device_limit(tenant.id)
    if not limit_check["allowed"]:
        raise HTTPException(status_code=403, detail=limit_check["reason"])
    
    # Check if IP:port already exists
    existing = await tenant_db.devices.find_one({
        "ip_address": device.ip_address,
        "port": device.port
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con esta IP y puerto")
    
    # Create device
    device_id = f"dev_{secrets.token_hex(8)}"
    device_doc = {
        "id": device_id,
        **device.model_dump(),
        "status": "unknown",
        "last_check": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await tenant_db.devices.insert_one(device_doc)
    
    # Update device count
    count = await tenant_db.devices.count_documents({})
    await update_device_count(tenant.id, count)
    
    return {"message": "Dispositivo creado", "device": {k: v for k, v in device_doc.items() if k != "_id"}}

@router.get("/{device_id}")
async def get_device(
    device_id: str,
    current: dict = Depends(get_current_tenant_user)
):
    """Get a specific device"""
    tenant_db = current["tenant_db"]
    
    device = await tenant_db.devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    return {"device": device}

@router.put("/{device_id}")
async def update_device(
    device_id: str,
    data: DeviceUpdate,
    current: dict = Depends(require_tenant_role(["admin", "manager"]))
):
    """Update a device"""
    tenant_db = current["tenant_db"]
    
    # Check device exists
    existing = await tenant_db.devices.find_one({"id": device_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Prepare update data
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await tenant_db.devices.update_one(
        {"id": device_id},
        {"$set": update_data}
    )
    
    return {"message": "Dispositivo actualizado"}

@router.delete("/{device_id}")
async def delete_device(
    device_id: str,
    current: dict = Depends(require_tenant_role(["admin", "manager"]))
):
    """Delete a device"""
    tenant_db = current["tenant_db"]
    tenant = current["tenant"]
    
    result = await tenant_db.devices.delete_one({"id": device_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Update device count
    count = await tenant_db.devices.count_documents({})
    await update_device_count(tenant.id, count)
    
    # Delete related history and alerts
    await tenant_db.status_history.delete_many({"device_id": device_id})
    await tenant_db.alerts.delete_many({"device_id": device_id})
    
    return {"message": "Dispositivo eliminado"}

@router.post("/{device_id}/check")
async def check_device_status(
    device_id: str,
    current: dict = Depends(get_current_tenant_user)
):
    """Manually trigger a device status check"""
    tenant_db = current["tenant_db"]
    tenant = current["tenant"]
    
    # Check verification limit
    limit_check = await check_verification_limit(tenant.id)
    if not limit_check["allowed"]:
        raise HTTPException(status_code=429, detail=limit_check["reason"])
    
    device = await tenant_db.devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Perform ping check
    import subprocess
    try:
        result = subprocess.run(
            ["ping", "-c", "1", "-W", "2", device["ip_address"]],
            capture_output=True,
            timeout=5
        )
        new_status = "online" if result.returncode == 0 else "offline"
    except:
        new_status = "offline"
    
    # Update device status
    now = datetime.now(timezone.utc)
    await tenant_db.devices.update_one(
        {"id": device_id},
        {"$set": {"status": new_status, "last_check": now}}
    )
    
    # Increment verification counter
    await increment_verification_count(tenant.id)
    
    return {
        "device_id": device_id,
        "status": new_status,
        "checked_at": now.isoformat(),
        "verifications_remaining": limit_check["max"] - limit_check["current"] - 1
    }
