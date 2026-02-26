"""
VPN Monitoring Routes - Uses existing devices with device_type_id for VPN Tunnel
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from services.auth_service import get_current_user
from config import logger, devices_collection, device_types_collection

router = APIRouter(prefix="/vpn", tags=["vpn"])

# ============ Helper Functions ============

async def get_vpn_type_id():
    """Get the device type ID for VPN Tunnel"""
    vpn_type = await device_types_collection.find_one(
        {"$or": [
            {"name": {"$regex": "vpn", "$options": "i"}},
            {"name": {"$regex": "tunnel", "$options": "i"}}
        ]},
        {"_id": 0}
    )
    return vpn_type.get("id") if vpn_type else None

def serialize_vpn_device(device: dict) -> dict:
    """Serialize VPN device for API response"""
    return {
        "id": device.get("id"),
        "name": device.get("name"),
        "host": device.get("ip_address") or device.get("host"),
        "port": device.get("port"),
        "description": device.get("description") or device.get("location"),
        "organization_id": device.get("organization_id"),
        "group_id": device.get("group_id"),
        "enabled": device.get("is_active", True),
        "online": device.get("status") == "online",
        "response_time_ms": device.get("response_time_ms") or device.get("latency"),
        "last_check": device.get("last_check"),
        "last_online": device.get("last_online") or device.get("last_status_change"),
        "created_at": device.get("created_at"),
        "updated_at": device.get("updated_at")
    }

# ============ Routes ============

@router.get("/devices")
async def get_vpn_devices(user: dict = Depends(get_current_user)):
    """Get all VPN devices from main devices collection"""
    vpn_type_id = await get_vpn_type_id()
    
    if not vpn_type_id:
        # Fallback: search by name containing VPN
        devices = await devices_collection.find(
            {"name": {"$regex": "vpn", "$options": "i"}},
            {"_id": 0}
        ).to_list(length=100)
    else:
        devices = await devices_collection.find(
            {"device_type_id": vpn_type_id},
            {"_id": 0}
        ).to_list(length=100)
    
    return {"devices": [serialize_vpn_device(d) for d in devices]}

@router.get("/status")
async def get_vpn_status(user: dict = Depends(get_current_user)):
    """Get VPN status summary with all devices"""
    vpn_type_id = await get_vpn_type_id()
    
    if not vpn_type_id:
        # Fallback: search by name containing VPN
        devices = await devices_collection.find(
            {"name": {"$regex": "vpn", "$options": "i"}},
            {"_id": 0}
        ).to_list(length=100)
    else:
        devices = await devices_collection.find(
            {"device_type_id": vpn_type_id},
            {"_id": 0}
        ).to_list(length=100)
    
    online_count = sum(1 for d in devices if d.get("status") == "online")
    offline_count = sum(1 for d in devices if d.get("status") != "online")
    
    return {
        "devices": [serialize_vpn_device(d) for d in devices],
        "summary": {
            "total": len(devices),
            "online": online_count,
            "offline": offline_count
        },
        "last_check": datetime.now(timezone.utc).isoformat()
    }

@router.post("/check-all")
async def check_all_vpn_devices(user: dict = Depends(get_current_user)):
    """Trigger a check of all VPN devices (uses the normal device check)"""
    vpn_type_id = await get_vpn_type_id()
    
    if not vpn_type_id:
        devices = await devices_collection.find(
            {"name": {"$regex": "vpn", "$options": "i"}},
            {"_id": 0}
        ).to_list(length=100)
    else:
        devices = await devices_collection.find(
            {"device_type_id": vpn_type_id},
            {"_id": 0}
        ).to_list(length=100)
    
    online_count = sum(1 for d in devices if d.get("status") == "online")
    offline_count = len(devices) - online_count
    
    logger.info(f"VPN check: {len(devices)} devices, {online_count} online, {offline_count} offline")
    
    return {
        "message": f"Found {len(devices)} VPN devices",
        "summary": {
            "total": len(devices),
            "online": online_count,
            "offline": offline_count
        }
    }
