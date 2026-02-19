"""
Dahua P2P Device Routes
API endpoints for managing Dahua DVR/NVR devices via P2P
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from services.auth_service import get_current_user, require_role
from services.dahua_service import (
    dahua_service,
    get_all_dahua_devices,
    get_dahua_device,
    create_dahua_device,
    update_dahua_device,
    delete_dahua_device,
    send_dahua_status_alert,
    dahua_devices_collection
)

router = APIRouter(tags=["dahua"])


class DahuaDeviceCreate(BaseModel):
    name: str
    serial_number: str
    username: str = "admin"
    password: str
    group_id: Optional[str] = None
    organization_id: Optional[str] = None


class DahuaDeviceUpdate(BaseModel):
    name: Optional[str] = None
    serial_number: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    group_id: Optional[str] = None
    organization_id: Optional[str] = None


# ============ CRUD ENDPOINTS ============

@router.get("/dahua/devices")
async def list_dahua_devices(current_user: dict = Depends(get_current_user)):
    """List all registered Dahua P2P devices"""
    devices = await get_all_dahua_devices()
    
    # Hide passwords in response
    for device in devices:
        if "password" in device:
            device["password"] = "********"
    
    return {"devices": devices, "count": len(devices)}


@router.get("/dahua/devices/{device_id}")
async def get_single_dahua_device(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single Dahua device by ID"""
    device = await get_dahua_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Hide password
    if "password" in device:
        device["password"] = "********"
    
    return device


@router.post("/dahua/devices")
async def create_new_dahua_device(
    data: DahuaDeviceCreate,
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """Create a new Dahua P2P device"""
    device = await create_dahua_device(data.dict())
    
    # Hide password in response
    device["password"] = "********"
    
    return {"message": "Dispositivo Dahua creado", "device": device}


@router.put("/dahua/devices/{device_id}")
async def update_existing_dahua_device(
    device_id: str,
    data: DahuaDeviceUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """Update an existing Dahua device"""
    device = await get_dahua_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    updated = await update_dahua_device(device_id, data.dict(exclude_unset=True))
    
    # Hide password
    if updated and "password" in updated:
        updated["password"] = "********"
    
    return {"message": "Dispositivo actualizado", "device": updated}


@router.delete("/dahua/devices/{device_id}")
async def delete_existing_dahua_device(
    device_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Delete a Dahua device"""
    device = await get_dahua_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    await delete_dahua_device(device_id)
    return {"message": "Dispositivo eliminado"}


# ============ CHECK ENDPOINTS ============

@router.post("/dahua/devices/{device_id}/check")
async def check_single_dahua_device(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Check a single Dahua device - connects via P2P and retrieves status
    This may take 10-30 seconds depending on network conditions
    """
    device = await get_dahua_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Add id to device dict
    device["id"] = device_id
    
    result = await dahua_service.check_device_full(device)
    return result


@router.post("/dahua/check-all")
async def check_all_dahua_devices(
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """
    Check all registered Dahua devices
    Warning: This may take a long time if you have many devices
    """
    results = await dahua_service.check_all_devices()
    
    summary = {
        "total": len(results),
        "online": sum(1 for r in results if r.get("online")),
        "offline": sum(1 for r in results if not r.get("online")),
        "recording_issues": sum(1 for r in results if r.get("recording") and not r["recording"].get("recording_active")),
        "storage_warnings": sum(1 for r in results if r.get("storage") and r["storage"].get("used_percent", 0) > 90),
        "hdd_errors": sum(1 for r in results if r.get("hdd_health") and not r["hdd_health"].get("all_healthy"))
    }
    
    return {
        "summary": summary,
        "results": results,
        "checked_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/dahua/status")
async def get_dahua_status_summary(current_user: dict = Depends(get_current_user)):
    """Get a quick summary of all Dahua devices status (from last check)"""
    devices = await get_all_dahua_devices()
    
    summary = {
        "total": len(devices),
        "online": sum(1 for d in devices if d.get("online")),
        "offline": sum(1 for d in devices if not d.get("online")),
        "recording": sum(1 for d in devices if d.get("recording_active")),
        "not_recording": sum(1 for d in devices if d.get("recording_active") is False),
        "storage_warnings": sum(1 for d in devices if (d.get("storage_used_percent") or 0) > 90),
        "hdd_errors": sum(1 for d in devices if d.get("hdd_healthy") is False)
    }
    
    # Get devices with issues
    issues = []
    for d in devices:
        device_issues = []
        if not d.get("online"):
            device_issues.append("offline")
        if d.get("recording_active") is False:
            device_issues.append("not_recording")
        if (d.get("storage_used_percent") or 0) > 90:
            device_issues.append("storage_full")
        if d.get("hdd_healthy") is False:
            device_issues.append("hdd_error")
        
        if device_issues:
            issues.append({
                "name": d.get("name"),
                "serial_number": d.get("serial_number"),
                "issues": device_issues
            })
    
    return {
        "summary": summary,
        "issues": issues
    }


@router.post("/dahua/quick-check/{serial_number}")
async def quick_check_serial(
    serial_number: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Quick check if a device is registered in Easy4IP P2P Cloud.
    Useful for validating serial numbers before adding devices.
    """
    result = await dahua_service.quick_check(serial_number)
    return result
