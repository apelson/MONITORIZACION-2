"""
VPN Monitoring Routes - OpenVPN tunnel monitoring via ping
Uses existing devices with device_type_id for VPN Tunnel
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import asyncio
import subprocess
import uuid

from services.auth_service import get_current_user, require_role
from config import db, logger, devices_collection, device_types_collection

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

async def ping_host(host: str, timeout: int = 3) -> dict:
    """Ping a host and return status with response time"""
    try:
        # Use ping command with timeout
        process = await asyncio.create_subprocess_exec(
            'ping', '-c', '1', '-W', str(timeout), host,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout + 2)
        
        if process.returncode == 0:
            # Parse response time from output
            output = stdout.decode()
            response_time = None
            for line in output.split('\n'):
                if 'time=' in line:
                    try:
                        time_part = line.split('time=')[1].split()[0]
                        response_time = float(time_part.replace('ms', ''))
                    except:
                        pass
            return {
                "online": True,
                "response_time_ms": response_time,
                "error": None
            }
        else:
            return {
                "online": False,
                "response_time_ms": None,
                "error": "Host unreachable"
            }
    except asyncio.TimeoutError:
        return {
            "online": False,
            "response_time_ms": None,
            "error": "Timeout"
        }
    except Exception as e:
        return {
            "online": False,
            "response_time_ms": None,
            "error": str(e)
        }

def serialize_vpn_device(device: dict) -> dict:
    """Serialize VPN device for API response"""
    return {
        "id": device.get("id"),
        "name": device.get("name"),
        "host": device.get("host"),
        "description": device.get("description"),
        "organization_id": device.get("organization_id"),
        "group_id": device.get("group_id"),
        "enabled": device.get("enabled", True),
        "online": device.get("online", False),
        "response_time_ms": device.get("response_time_ms"),
        "last_check": device.get("last_check"),
        "last_online": device.get("last_online"),
        "created_at": device.get("created_at"),
        "updated_at": device.get("updated_at")
    }

# ============ Routes ============

@router.get("/devices")
async def get_vpn_devices(user: dict = Depends(get_current_user)):
    """Get all VPN devices"""
    devices = await vpn_collection.find({}, {"_id": 0}).to_list(length=100)
    return {"devices": [serialize_vpn_device(d) for d in devices]}

@router.get("/status")
async def get_vpn_status(user: dict = Depends(get_current_user)):
    """Get VPN status summary with all devices"""
    devices = await vpn_collection.find({"enabled": {"$ne": False}}, {"_id": 0}).to_list(length=100)
    
    online_count = sum(1 for d in devices if d.get("online"))
    offline_count = sum(1 for d in devices if not d.get("online"))
    
    return {
        "devices": [serialize_vpn_device(d) for d in devices],
        "summary": {
            "total": len(devices),
            "online": online_count,
            "offline": offline_count
        },
        "last_check": datetime.now(timezone.utc).isoformat()
    }

@router.post("/devices")
async def create_vpn_device(device: VPNDeviceCreate, user: dict = Depends(require_role(["admin", "manager"]))):
    """Create a new VPN device to monitor"""
    new_device = {
        "id": str(uuid.uuid4()),
        "name": device.name,
        "host": device.host,
        "description": device.description,
        "organization_id": device.organization_id,
        "group_id": device.group_id,
        "enabled": True,
        "online": False,
        "response_time_ms": None,
        "last_check": None,
        "last_online": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await vpn_collection.insert_one(new_device)
    logger.info(f"VPN device created: {device.name} ({device.host})")
    
    return {"message": "VPN device created", "device": serialize_vpn_device(new_device)}

@router.put("/devices/{device_id}")
async def update_vpn_device(device_id: str, update: VPNDeviceUpdate, user: dict = Depends(require_role(["admin", "manager"]))):
    """Update a VPN device"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await vpn_collection.update_one(
        {"id": device_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="VPN device not found")
    
    device = await vpn_collection.find_one({"id": device_id}, {"_id": 0})
    return {"message": "VPN device updated", "device": serialize_vpn_device(device)}

@router.delete("/devices/{device_id}")
async def delete_vpn_device(device_id: str, user: dict = Depends(require_role(["admin"]))):
    """Delete a VPN device"""
    result = await vpn_collection.delete_one({"id": device_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="VPN device not found")
    
    return {"message": "VPN device deleted"}

@router.post("/devices/{device_id}/check")
async def check_vpn_device(device_id: str, user: dict = Depends(get_current_user)):
    """Check a specific VPN device"""
    device = await vpn_collection.find_one({"id": device_id}, {"_id": 0})
    
    if not device:
        raise HTTPException(status_code=404, detail="VPN device not found")
    
    # Ping the device
    result = await ping_host(device["host"])
    
    # Update device status
    update_data = {
        "online": result["online"],
        "response_time_ms": result["response_time_ms"],
        "last_check": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if result["online"]:
        update_data["last_online"] = datetime.now(timezone.utc).isoformat()
    
    await vpn_collection.update_one({"id": device_id}, {"$set": update_data})
    
    device.update(update_data)
    return {"device": serialize_vpn_device(device), "check_result": result}

@router.post("/check-all")
async def check_all_vpn_devices(user: dict = Depends(get_current_user)):
    """Check all enabled VPN devices"""
    devices = await vpn_collection.find({"enabled": {"$ne": False}}, {"_id": 0}).to_list(length=100)
    
    results = []
    for device in devices:
        result = await ping_host(device["host"])
        
        update_data = {
            "online": result["online"],
            "response_time_ms": result["response_time_ms"],
            "last_check": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if result["online"]:
            update_data["last_online"] = datetime.now(timezone.utc).isoformat()
        
        await vpn_collection.update_one({"id": device["id"]}, {"$set": update_data})
        
        device.update(update_data)
        results.append({
            "device": serialize_vpn_device(device),
            "check_result": result
        })
    
    online_count = sum(1 for r in results if r["check_result"]["online"])
    offline_count = len(results) - online_count
    
    logger.info(f"VPN check completed: {online_count} online, {offline_count} offline")
    
    return {
        "results": results,
        "summary": {
            "total": len(results),
            "online": online_count,
            "offline": offline_count
        }
    }
