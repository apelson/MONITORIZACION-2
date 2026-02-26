"""
System Stats Routes - Server resource monitoring (CPU, RAM, HDD, Network)
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import psutil
import time

from services.auth_service import get_current_user
from config import logger

router = APIRouter(prefix="/system", tags=["system"])

# Store previous network stats for calculating rate
_prev_net_stats = {"bytes_sent": 0, "bytes_recv": 0, "time": time.time()}

def get_network_speed():
    """Calculate network speed in KB/s"""
    global _prev_net_stats
    
    current = psutil.net_io_counters()
    current_time = time.time()
    
    time_diff = current_time - _prev_net_stats["time"]
    if time_diff <= 0:
        time_diff = 1
    
    # Calculate speed in KB/s
    sent_speed = (current.bytes_sent - _prev_net_stats["bytes_sent"]) / time_diff / 1024
    recv_speed = (current.bytes_recv - _prev_net_stats["bytes_recv"]) / time_diff / 1024
    
    # Update previous stats
    _prev_net_stats = {
        "bytes_sent": current.bytes_sent,
        "bytes_recv": current.bytes_recv,
        "time": current_time
    }
    
    return {
        "upload_kbs": round(sent_speed, 2),
        "download_kbs": round(recv_speed, 2),
        "total_sent_gb": round(current.bytes_sent / (1024**3), 2),
        "total_recv_gb": round(current.bytes_recv / (1024**3), 2)
    }

@router.get("/stats")
async def get_system_stats(user: dict = Depends(get_current_user)):
    """Get current system resource statistics"""
    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        
        # Memory
        memory = psutil.virtual_memory()
        ram_percent = memory.percent
        ram_used_gb = round(memory.used / (1024**3), 2)
        ram_total_gb = round(memory.total / (1024**3), 2)
        
        # Disk
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        disk_used_gb = round(disk.used / (1024**3), 2)
        disk_total_gb = round(disk.total / (1024**3), 2)
        
        # Network
        network = get_network_speed()
        
        # Load average (Unix only)
        try:
            load_avg = psutil.getloadavg()
            load_1, load_5, load_15 = load_avg
        except:
            load_1, load_5, load_15 = 0, 0, 0
        
        return {
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "load_1m": round(load_1, 2),
                "load_5m": round(load_5, 2),
                "load_15m": round(load_15, 2)
            },
            "ram": {
                "percent": ram_percent,
                "used_gb": ram_used_gb,
                "total_gb": ram_total_gb
            },
            "disk": {
                "percent": disk_percent,
                "used_gb": disk_used_gb,
                "total_gb": disk_total_gb
            },
            "network": network,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {
            "cpu": {"percent": 0, "count": 0},
            "ram": {"percent": 0, "used_gb": 0, "total_gb": 0},
            "disk": {"percent": 0, "used_gb": 0, "total_gb": 0},
            "network": {"upload_kbs": 0, "download_kbs": 0},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }
