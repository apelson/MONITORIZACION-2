"""
Device checking and monitoring service
"""
import socket
import asyncio
from datetime import datetime, timezone
import uuid

from config import devices_collection, history_collection, logger
from services.email_service import create_alert

async def check_device_status(ip: str, port: int, timeout: float = 3.0) -> str:
    try:
        loop = asyncio.get_event_loop()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = await loop.run_in_executor(None, lambda: sock.connect_ex((ip, port)))
        sock.close()
        return "online" if result == 0 else "offline"
    except Exception as e:
        logger.warning(f"Error checking {ip}:{port}: {e}")
        return "offline"

async def check_single_device(device_id: str, background_alert: bool = True):
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        return None
    
    new_status = await check_device_status(device["ip_address"], device["port"])
    old_status = device.get("status", "unknown")
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {"status": new_status, "last_check": now}
    
    # Record history
    history_entry = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "status": new_status,
        "timestamp": now,
        "response_time": None
    }
    await history_collection.insert_one(history_entry)
    
    # Alert on status change
    if background_alert and old_status != "unknown" and old_status != new_status:
        if new_status == "offline":
            await create_alert(device_id, device["name"], device["ip_address"], device["port"], "device_down")
        elif new_status == "online" and old_status == "offline":
            await create_alert(device_id, device["name"], device["ip_address"], device["port"], "device_up")
    
    await devices_collection.update_one({"id": device_id}, {"$set": update_data})
    
    updated = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    return updated

async def check_camera_nas_connection(device_id: str, storage_info: dict):
    """Check if a camera has lost NAS connection and create alert if needed"""
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        return
    
    # Get previous NAS state
    prev_nas_state = device.get("nas_connected", None)
    
    # Determine current NAS state from storage info
    current_nas_connected = True
    storage_state = storage_info.get("storage_state", "").lower() if storage_info else ""
    
    # Check for various disconnection indicators
    if storage_info:
        if "not" in storage_state or "error" in storage_state or "fail" in storage_state or "offline" in storage_state:
            current_nas_connected = False
        # Also check if storage is empty but should have data
        if not storage_info.get("current_usage") and not storage_info.get("sequences"):
            # If no storage data at all, might be disconnected
            if storage_state == "" or storage_state == "unknown":
                current_nas_connected = None  # Unknown state
    else:
        current_nas_connected = None  # No storage info available
    
    # Only create alerts on state change
    if prev_nas_state is not None and current_nas_connected is not None:
        if prev_nas_state is True and current_nas_connected is False:
            # NAS disconnected - create alert
            await create_alert(
                device_id, 
                device["name"], 
                device["ip_address"], 
                device["port"], 
                "nas_disconnected",
                {"storage_state": storage_state}
            )
        elif prev_nas_state is False and current_nas_connected is True:
            # NAS reconnected - create recovery alert
            await create_alert(
                device_id, 
                device["name"], 
                device["ip_address"], 
                device["port"], 
                "nas_reconnected",
                {"storage_state": storage_state}
            )
    
    # Update device with current NAS state
    if current_nas_connected is not None:
        await devices_collection.update_one(
            {"id": device_id},
            {"$set": {"nas_connected": current_nas_connected}}
        )

async def check_all_devices():
    logger.info("Starting scheduled device check...")
    devices = await devices_collection.find({}, {"_id": 0}).to_list(length=None)
    
    for device in devices:
        try:
            await check_single_device(device["id"], background_alert=True)
            await asyncio.sleep(0.1)  # Small delay between checks
        except Exception as e:
            logger.error(f"Error checking device {device.get('name', 'unknown')}: {e}")
    
    logger.info(f"Completed check for {len(devices)} devices")
