"""
Dahua P2P Device Routes
API endpoints for managing Dahua DVR/NVR devices via P2P
With multi-tenancy support
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
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
    dahua_devices_collection,
    import_smartpss_xml
)
from services.multitenancy_service import (
    build_dahua_device_filter, should_filter_by_tenant, get_user_organization_ids
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
    """List all registered Dahua P2P devices - filtered by tenant"""
    # Apply multi-tenancy filter
    device_filter = await build_dahua_device_filter(current_user)
    
    # Check if user has no access
    if device_filter.get("organization_id", {}).get("$in") == []:
        return {"devices": [], "count": 0}
    
    devices = await dahua_devices_collection.find(device_filter, {"_id": 0}).to_list(length=None)
    
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
    
    # Multi-tenancy check: verify user has access to this device's organization
    if should_filter_by_tenant(current_user):
        user_org_ids = await get_user_organization_ids(current_user)
        device_org_id = device.get("organization_id")
        if device_org_id and device_org_id not in user_org_ids:
            raise HTTPException(status_code=403, detail="No tienes acceso a este dispositivo")
    
    # Hide password
    if "password" in device:
        device["password"] = "********"
    
    return device


@router.post("/dahua/devices")
async def create_new_dahua_device(
    data: DahuaDeviceCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "tenant_admin"]))
):
    """Create a new Dahua P2P device"""
    # Multi-tenancy check: tenant_admin can only create in their orgs
    if should_filter_by_tenant(current_user) and data.organization_id:
        user_org_ids = await get_user_organization_ids(current_user)
        if data.organization_id not in user_org_ids:
            raise HTTPException(status_code=403, detail="No puedes crear dispositivos en esta organización")
    
    device = await create_dahua_device(data.dict())
    
    # Hide password in response
    device["password"] = "********"
    
    return {"message": "Dispositivo Dahua creado", "device": device}


@router.put("/dahua/devices/{device_id}")
async def update_existing_dahua_device(
    device_id: str,
    data: DahuaDeviceUpdate,
    current_user: dict = Depends(require_role(["admin", "manager", "tenant_admin"]))
):
    """Update an existing Dahua device"""
    device = await get_dahua_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Multi-tenancy check
    if should_filter_by_tenant(current_user):
        user_org_ids = await get_user_organization_ids(current_user)
        if device.get("organization_id") and device["organization_id"] not in user_org_ids:
            raise HTTPException(status_code=403, detail="No tienes acceso a este dispositivo")
    
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
    
    # Store old status before check
    old_online = device.get("online")
    
    # Add id to device dict
    device["id"] = device_id
    
    result = await dahua_service.check_device_full(device)
    new_online = result.get("online", False)
    
    # Update database with new status
    await dahua_devices_collection.update_one(
        {"id": device_id},
        {"$set": {
            "last_check": result["checked_at"],
            "online": new_online,
            "firmware_version": result.get("firmware_version"),
            "last_error": result.get("error")
        }}
    )
    
    # Send alert if status changed
    if old_online is not None and old_online != new_online:
        await send_dahua_status_alert(device, new_online, old_online)
    
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


# ============ IMPORT ENDPOINTS ============

class ImportXMLRequest(BaseModel):
    xml_content: str


@router.post("/dahua/import/smartpss")
async def import_from_smartpss(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """
    Import Dahua devices from SmartPSS XML export file.
    - Devices with existing serial numbers will be updated (overwritten).
    - New devices will be created with default password 'Spw@2018'.
    """
    if not file.filename.endswith(('.xml', '.XML')):
        raise HTTPException(
            status_code=400, 
            detail="Formato de archivo no válido. Por favor sube un archivo XML."
        )
    
    try:
        content = await file.read()
        xml_content = content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            xml_content = content.decode('latin-1')
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="No se pudo leer el archivo. Asegúrate de que sea un XML válido."
            )
    
    result = await import_smartpss_xml(xml_content)
    
    return {
        "message": f"Importación completada: {result['imported']} nuevos, {result['updated']} actualizados, {result['skipped']} omitidos",
        "imported": result["imported"],
        "updated": result["updated"],
        "skipped": result["skipped"],
        "errors": result["errors"],
        "devices": result["devices"][:50]  # Limit response size
    }


@router.post("/dahua/import/smartpss-text")
async def import_from_smartpss_text(
    data: ImportXMLRequest,
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """
    Import Dahua devices from SmartPSS XML content (as text).
    Alternative endpoint for direct XML content submission.
    """
    result = await import_smartpss_xml(data.xml_content)
    
    return {
        "message": f"Importación completada: {result['imported']} nuevos, {result['updated']} actualizados, {result['skipped']} omitidos",
        "imported": result["imported"],
        "updated": result["updated"],
        "skipped": result["skipped"],
        "errors": result["errors"],
        "devices": result["devices"][:50]
    }
