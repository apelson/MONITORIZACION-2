"""
Infrastructure Routes - VMware ESXi, QNAP, and Synology API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

from services.infrastructure_service import InfrastructureService, ESXiService, QNAPService, SynologyService
from services.auth_service import get_current_user
from config import db

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])

# ============ Pydantic Models ============
class InfraDeviceCreate(BaseModel):
    name: str
    device_type: str  # esxi, qnap, synology
    host: str
    port: Optional[int] = None
    username: str
    password: str
    use_ssl: Optional[bool] = True
    organization_id: Optional[str] = None
    group_id: Optional[str] = None
    notes: Optional[str] = None

class InfraDeviceUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    use_ssl: Optional[bool] = None
    organization_id: Optional[str] = None
    group_id: Optional[str] = None
    notes: Optional[str] = None
    enabled: Optional[bool] = None

class TestConnectionRequest(BaseModel):
    device_type: str
    host: str
    port: Optional[int] = None
    username: str
    password: str
    use_ssl: Optional[bool] = True

# ============ Helper Functions ============
def get_default_port(device_type: str, use_ssl: bool = True) -> int:
    """Get default port for device type"""
    if device_type.lower() == "esxi":
        return 443
    elif device_type.lower() == "qnap":
        return 443 if use_ssl else 8080
    elif device_type.lower() == "synology":
        return 5001 if use_ssl else 5000
    return 443

def serialize_infra_device(device: dict) -> dict:
    """Serialize infrastructure device for API response"""
    return {
        "id": str(device["_id"]),
        "name": device.get("name"),
        "device_type": device.get("device_type"),
        "host": device.get("host"),
        "port": device.get("port"),
        "username": device.get("username"),
        "use_ssl": device.get("use_ssl", True),
        "organization_id": device.get("organization_id"),
        "group_id": device.get("group_id"),
        "notes": device.get("notes"),
        "enabled": device.get("enabled", True),
        "status": device.get("status", "unknown"),
        "last_check": device.get("last_check"),
        "last_status": device.get("last_status", {}),
        "created_at": device.get("created_at"),
        "updated_at": device.get("updated_at")
    }

# ============ Routes ============

@router.post("/test-connection")
async def test_connection(request: TestConnectionRequest, user: dict = Depends(get_current_user)):
    """Test connection to an infrastructure device"""
    try:
        port = request.port or get_default_port(request.device_type, request.use_ssl)
        
        result = InfrastructureService.check_device(
            device_type=request.device_type,
            host=request.host,
            username=request.username,
            password=request.password,
            port=port,
            use_ssl=request.use_ssl
        )
        
        return {
            "success": result.get("connected", False),
            "message": "Conexión exitosa" if result.get("connected") else "No se pudo conectar",
            "details": result
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error de conexión: {str(e)}",
            "details": None
        }

@router.get("/devices")
async def get_infra_devices(user: dict = Depends(get_current_user)):
    """Get all infrastructure devices"""
    try:
        devices = await db.infrastructure_devices.find({}).to_list(length=1000)
        return {
            "devices": [serialize_infra_device(d) for d in devices]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/devices")
async def create_infra_device(device: InfraDeviceCreate, user: dict = Depends(get_current_user)):
    """Create a new infrastructure device"""
    if user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear dispositivos de infraestructura")
    
    try:
        port = device.port or get_default_port(device.device_type, device.use_ssl)
        
        new_device = {
            "name": device.name,
            "device_type": device.device_type.lower(),
            "host": device.host,
            "port": port,
            "username": device.username,
            "password": device.password,  # In production, encrypt this
            "use_ssl": device.use_ssl,
            "organization_id": device.organization_id,
            "group_id": device.group_id,
            "notes": device.notes,
            "enabled": True,
            "status": "unknown",
            "last_check": None,
            "last_status": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.infrastructure_devices.insert_one(new_device)
        new_device["_id"] = result.inserted_id
        
        return serialize_infra_device(new_device)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{device_id}")
async def get_infra_device(device_id: str, user: dict = Depends(get_current_user)):
    """Get a specific infrastructure device"""
    try:
        device = await db.infrastructure_devices.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        return serialize_infra_device(device)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/devices/{device_id}")
async def update_infra_device(device_id: str, update: InfraDeviceUpdate, user: dict = Depends(get_current_user)):
    """Update an infrastructure device"""
    if user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar dispositivos de infraestructura")
    
    try:
        device = await db.infrastructure_devices.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        await db.infrastructure_devices.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": update_data}
        )
        
        device = await db.infrastructure_devices.find_one({"_id": ObjectId(device_id)})
        return serialize_infra_device(device)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/devices/{device_id}")
async def delete_infra_device(device_id: str, user: dict = Depends(get_current_user)):
    """Delete an infrastructure device"""
    if user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar dispositivos de infraestructura")
    
    try:
        result = await db.infrastructure_devices.delete_one({"_id": ObjectId(device_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        return {"message": "Dispositivo eliminado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/devices/{device_id}/check")
async def check_infra_device(device_id: str, user: dict = Depends(get_current_user)):
    """Check status of an infrastructure device"""
    try:
        device = await db.infrastructure_devices.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
        result = InfrastructureService.check_device(
            device_type=device["device_type"],
            host=device["host"],
            username=device["username"],
            password=device["password"],
            port=device.get("port", 443),
            use_ssl=device.get("use_ssl", True)
        )
        
        # Update device status
        status = "online" if result.get("connected") else "offline"
        await db.infrastructure_devices.update_one(
            {"_id": ObjectId(device_id)},
            {
                "$set": {
                    "status": status,
                    "last_check": datetime.utcnow(),
                    "last_status": result
                }
            }
        )
        
        return {
            "device_id": device_id,
            "status": status,
            "details": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/devices/check-all")
async def check_all_infra_devices(user: dict = Depends(get_current_user)):
    """Check status of all infrastructure devices"""
    try:
        devices = await db.infrastructure_devices.find({"enabled": True}).to_list(length=1000)
        results = []
        
        for device in devices:
            try:
                result = InfrastructureService.check_device(
                    device_type=device["device_type"],
                    host=device["host"],
                    username=device["username"],
                    password=device["password"],
                    port=device.get("port", 443),
                    use_ssl=device.get("use_ssl", True)
                )
                
                status = "online" if result.get("connected") else "offline"
                await db.infrastructure_devices.update_one(
                    {"_id": device["_id"]},
                    {
                        "$set": {
                            "status": status,
                            "last_check": datetime.utcnow(),
                            "last_status": result
                        }
                    }
                )
                
                results.append({
                    "device_id": str(device["_id"]),
                    "name": device["name"],
                    "status": status
                })
            except Exception as e:
                results.append({
                    "device_id": str(device["_id"]),
                    "name": device["name"],
                    "status": "error",
                    "error": str(e)
                })
        
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{device_id}/vms")
async def get_device_vms(device_id: str, user: dict = Depends(get_current_user)):
    """Get VMs from an ESXi device"""
    try:
        device = db.infrastructure_devices.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
        if device["device_type"] != "esxi":
            raise HTTPException(status_code=400, detail="Este endpoint solo es para dispositivos ESXi")
        
        service = ESXiService(
            host=device["host"],
            username=device["username"],
            password=device["password"],
            port=device.get("port", 443)
        )
        
        if not service.connect():
            raise HTTPException(status_code=503, detail="No se pudo conectar al servidor ESXi")
        
        vms = service.get_vms()
        service.disconnect()
        
        return {"vms": vms}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{device_id}/datastores")
async def get_device_datastores(device_id: str, user: dict = Depends(get_current_user)):
    """Get datastores from an ESXi device"""
    try:
        device = db.infrastructure_devices.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
        if device["device_type"] != "esxi":
            raise HTTPException(status_code=400, detail="Este endpoint solo es para dispositivos ESXi")
        
        service = ESXiService(
            host=device["host"],
            username=device["username"],
            password=device["password"],
            port=device.get("port", 443)
        )
        
        if not service.connect():
            raise HTTPException(status_code=503, detail="No se pudo conectar al servidor ESXi")
        
        datastores = service.get_datastores()
        service.disconnect()
        
        return {"datastores": datastores}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{device_id}/disks")
async def get_device_disks(device_id: str, user: dict = Depends(get_current_user)):
    """Get disk info from a NAS device"""
    try:
        device = db.infrastructure_devices.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
        if device["device_type"] not in ["qnap", "synology"]:
            raise HTTPException(status_code=400, detail="Este endpoint solo es para dispositivos NAS")
        
        if device["device_type"] == "qnap":
            service = QNAPService(
                host=device["host"],
                username=device["username"],
                password=device["password"],
                port=device.get("port", 443),
                use_ssl=device.get("use_ssl", True)
            )
        else:
            service = SynologyService(
                host=device["host"],
                username=device["username"],
                password=device["password"],
                port=device.get("port", 5001),
                use_ssl=device.get("use_ssl", True)
            )
        
        if not service.connect():
            raise HTTPException(status_code=503, detail="No se pudo conectar al NAS")
        
        disks = service.get_disk_info()
        service.disconnect()
        
        return {"disks": disks}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{device_id}/surveillance")
async def get_device_surveillance(device_id: str, user: dict = Depends(get_current_user)):
    """Get surveillance info from a NAS device"""
    try:
        device = db.infrastructure_devices.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
        if device["device_type"] not in ["qnap", "synology"]:
            raise HTTPException(status_code=400, detail="Este endpoint solo es para dispositivos NAS")
        
        if device["device_type"] == "qnap":
            service = QNAPService(
                host=device["host"],
                username=device["username"],
                password=device["password"],
                port=device.get("port", 443),
                use_ssl=device.get("use_ssl", True)
            )
        else:
            service = SynologyService(
                host=device["host"],
                username=device["username"],
                password=device["password"],
                port=device.get("port", 5001),
                use_ssl=device.get("use_ssl", True)
            )
        
        if not service.connect():
            raise HTTPException(status_code=503, detail="No se pudo conectar al NAS")
        
        surveillance = service.get_surveillance_info()
        service.disconnect()
        
        return {"surveillance": surveillance}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
async def get_infrastructure_summary(user: dict = Depends(get_current_user)):
    """Get summary of all infrastructure"""
    try:
        devices = list(db.infrastructure_devices.find({}))
        
        summary = {
            "total_devices": len(devices),
            "online": 0,
            "offline": 0,
            "unknown": 0,
            "by_type": {
                "esxi": {"total": 0, "online": 0, "total_vms": 0, "vms_on": 0},
                "qnap": {"total": 0, "online": 0},
                "synology": {"total": 0, "online": 0}
            }
        }
        
        for device in devices:
            status = device.get("status", "unknown")
            device_type = device.get("device_type", "").lower()
            
            if status == "online":
                summary["online"] += 1
            elif status == "offline":
                summary["offline"] += 1
            else:
                summary["unknown"] += 1
            
            if device_type in summary["by_type"]:
                summary["by_type"][device_type]["total"] += 1
                if status == "online":
                    summary["by_type"][device_type]["online"] += 1
                
                # Add VM counts for ESXi
                if device_type == "esxi" and device.get("last_status"):
                    vm_summary = device["last_status"].get("summary", {})
                    summary["by_type"]["esxi"]["total_vms"] += vm_summary.get("total_vms", 0)
                    summary["by_type"]["esxi"]["vms_on"] += vm_summary.get("powered_on", 0)
        
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
