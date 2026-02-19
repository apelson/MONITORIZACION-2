"""
Device checking and monitoring service
Enhanced with detailed logging for debugging
"""
import socket
import asyncio
from datetime import datetime, timezone
import uuid

from config import devices_collection, history_collection, logger
from services.email_service import create_alert
from services.telegram_service import send_alert_telegram

# WebSocket connections manager (will be set by server.py)
websocket_manager = None

def set_websocket_manager(manager):
    """Set the WebSocket manager for real-time notifications"""
    global websocket_manager
    websocket_manager = manager

async def check_device_status(ip: str, port: int, timeout: float = 2.0) -> tuple:
    """Check if device is online with optimized timeout. Returns (status, response_time_ms)"""
    try:
        loop = asyncio.get_event_loop()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        
        start_time = asyncio.get_event_loop().time()
        result = await loop.run_in_executor(None, lambda: sock.connect_ex((ip, port)))
        end_time = asyncio.get_event_loop().time()
        
        response_time_ms = round((end_time - start_time) * 1000, 2) if result == 0 else None
        sock.close()
        
        return ("online", response_time_ms) if result == 0 else ("offline", None)
    except Exception as e:
        logger.warning(f"Error checking {ip}:{port}: {e}")
        return ("offline", None)

async def check_single_device(device_id: str, background_alert: bool = True):
    """Check a single device and create alerts on status change"""
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        logger.warning(f"Device not found: {device_id}")
        return None
    
    device_name = device.get("name", "Unknown")
    ip_address = device.get("ip_address", "N/A")
    port = device.get("port", 80)
    
    # Get current status and response time from check
    new_status, response_time_ms = await check_device_status(ip_address, port)
    old_status = device.get("status", "unknown")
    now = datetime.now(timezone.utc).isoformat()
    
    # Prepare update data - include response_time
    update_data = {"status": new_status, "last_check": now, "response_time_ms": response_time_ms}
    
    # Log status check for debugging
    logger.debug(f"[CHECK] {device_name} ({ip_address}:{port}) - Old: {old_status}, New: {new_status}")
    
    # Record history entry with response time
    history_entry = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "status": new_status,
        "timestamp": now,
        "response_time": response_time_ms
    }
    await history_collection.insert_one(history_entry)
    
    # Detect status change and create alert
    status_changed = old_status != new_status
    
    if status_changed:
        # Update last_status_change timestamp
        update_data["last_status_change"] = now
        
        logger.info(f"[STATUS CHANGE] {device_name}: {old_status} -> {new_status}")
        
        # Create alert only if old_status was valid (not unknown/None)
        if background_alert and old_status not in ("unknown", None, ""):
            alert = None
            if new_status == "offline":
                logger.info(f"[ALERT] Creating device_down alert for {device_name}")
                alert = await create_alert(device_id, device_name, ip_address, port, "device_down")
            elif new_status == "online" and old_status == "offline":
                logger.info(f"[ALERT] Creating device_up alert for {device_name}")
                alert = await create_alert(device_id, device_name, ip_address, port, "device_up")
            
            # Send WebSocket notification if alert was created
            if alert and websocket_manager:
                try:
                    await websocket_manager.broadcast_alert(alert)
                    logger.debug(f"[WEBSOCKET] Alert broadcasted: {alert.get('alert_type')}")
                except Exception as e:
                    logger.error(f"[WEBSOCKET] Error broadcasting alert: {e}")
        
        # If old_status was unknown, initialize it without creating alert
        elif old_status in ("unknown", None, ""):
            logger.info(f"[INIT] Device {device_name} initialized with status: {new_status}")
    
    # Update device in database
    await devices_collection.update_one({"id": device_id}, {"$set": update_data})
    
    updated = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    return updated

async def check_camera_nas_connection(device_id: str, storage_info: dict):
    """Check if a camera has lost NAS connection and create alert if needed"""
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        return
    
    device_name = device.get("name", "Unknown")
    
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
            logger.info(f"[NAS ALERT] {device_name}: NAS disconnected")
            alert = await create_alert(
                device_id, 
                device["name"], 
                device["ip_address"], 
                device["port"], 
                "nas_disconnected",
                {"storage_state": storage_state}
            )
            if alert and websocket_manager:
                await websocket_manager.broadcast_alert(alert)
                
        elif prev_nas_state is False and current_nas_connected is True:
            # NAS reconnected - create recovery alert
            logger.info(f"[NAS ALERT] {device_name}: NAS reconnected")
            alert = await create_alert(
                device_id, 
                device["name"], 
                device["ip_address"], 
                device["port"], 
                "nas_reconnected",
                {"storage_state": storage_state}
            )
            if alert and websocket_manager:
                await websocket_manager.broadcast_alert(alert)
    
    # Update device with current NAS state
    if current_nas_connected is not None:
        await devices_collection.update_one(
            {"id": device_id},
            {"$set": {"nas_connected": current_nas_connected}}
        )

async def check_all_devices():
    """Check all devices in parallel batches for better performance"""
    start_time = datetime.now(timezone.utc)
    logger.info("=" * 50)
    logger.info(f"[SCHEDULER] Starting device check at {start_time.isoformat()}")
    
    devices = await devices_collection.find({}, {"_id": 0}).to_list(length=None)
    total_devices = len(devices)
    
    logger.info(f"[SCHEDULER] Found {total_devices} devices to check")
    
    if total_devices == 0:
        logger.warning("[SCHEDULER] No devices found in database!")
        return
    
    # Count initial statuses
    status_counts = {"online": 0, "offline": 0, "unknown": 0}
    for d in devices:
        status = d.get("status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    logger.info(f"[SCHEDULER] Initial status: Online={status_counts.get('online', 0)}, Offline={status_counts.get('offline', 0)}, Unknown={status_counts.get('unknown', 0)}")
    
    # Process in batches of 20 devices concurrently
    batch_size = 20
    checked = 0
    errors = 0
    
    for i in range(0, total_devices, batch_size):
        batch = devices[i:i + batch_size]
        tasks = [check_single_device(d["id"], background_alert=True) for d in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                errors += 1
                logger.error(f"[SCHEDULER] Error checking device: {result}")
            else:
                checked += 1
    
    # Calculate duration
    end_time = datetime.now(timezone.utc)
    duration = (end_time - start_time).total_seconds()
    
    logger.info(f"[SCHEDULER] Completed: {checked}/{total_devices} devices checked in {duration:.2f}s ({errors} errors)")
    logger.info("=" * 50)
