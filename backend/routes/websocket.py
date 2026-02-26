"""
WebSocket routes for real-time notifications
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import jwt
import asyncio
import psutil

from config import logger, SECRET_KEY, ALGORITHM
from services.websocket_service import websocket_manager

router = APIRouter(prefix="/ws", tags=["websocket"])

def get_user_from_token(token: str) -> Optional[str]:
    """Extract user ID from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub") or payload.get("user_id") or "authenticated"
    except Exception as e:
        logger.warning(f"[WS] Invalid token: {e}")
        return None

@router.websocket("/alerts")
async def websocket_alerts(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time alert notifications
    
    Connect with: ws://host/api/ws/alerts?token=<jwt_token>
    
    Messages received:
    - {"type": "alert", "data": {...}} - New alert created
    - {"type": "device_status", "data": {...}} - Device status changed
    - {"type": "connected", "message": "..."} - Connection confirmed
    - {"type": "pong"} - Response to ping
    """
    # Authenticate user (optional - allows anonymous for now)
    user_id = "anonymous"
    if token:
        user_id = get_user_from_token(token) or "anonymous"
    
    await websocket_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Wait for messages from client (ping/pong, etc.)
            try:
                data = await websocket.receive_json()
                
                # Handle ping
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                
                # Handle subscription changes (future feature)
                elif data.get("type") == "subscribe":
                    # Could filter by device/group in the future
                    pass
                    
            except Exception as e:
                # Client might have disconnected
                if "disconnect" in str(e).lower():
                    break
                logger.debug(f"[WS] Receive error (may be normal): {e}")
                
    except WebSocketDisconnect:
        logger.info(f"[WS] Client {user_id} disconnected normally")
    except Exception as e:
        logger.error(f"[WS] Unexpected error: {e}")
    finally:
        await websocket_manager.disconnect(websocket, user_id)

@router.get("/status")
async def websocket_status():
    """Get WebSocket server status"""
    return {
        "active_connections": websocket_manager.get_connection_count(),
        "status": "running"
    }

@router.websocket("/system-metrics")
async def websocket_system_metrics(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time system metrics (CPU, RAM, HDD, Network)
    
    Connect with: ws://host/api/ws/system-metrics?token=<jwt_token>
    
    Sends metrics every 2 seconds:
    - {"type": "metrics", "cpu": 25.5, "ram": 45.2, "hdd": 60.0, "net_up": 1.5, "net_down": 10.2}
    """
    # Authenticate user
    user_id = "anonymous"
    if token:
        user_id = get_user_from_token(token) or "anonymous"
    
    await websocket.accept()
    logger.info(f"[WS-Metrics] Client {user_id} connected")
    
    # Track previous network counters for calculating speed
    prev_net = psutil.net_io_counters()
    prev_time = asyncio.get_event_loop().time()
    
    try:
        while True:
            try:
                # Get system metrics
                cpu_percent = psutil.cpu_percent(interval=0.1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                # Calculate network speed (bytes per second)
                current_net = psutil.net_io_counters()
                current_time = asyncio.get_event_loop().time()
                time_delta = current_time - prev_time
                
                if time_delta > 0:
                    # Convert to MB/s
                    net_up = (current_net.bytes_sent - prev_net.bytes_sent) / time_delta / (1024 * 1024)
                    net_down = (current_net.bytes_recv - prev_net.bytes_recv) / time_delta / (1024 * 1024)
                else:
                    net_up = 0
                    net_down = 0
                
                prev_net = current_net
                prev_time = current_time
                
                # Send metrics
                await websocket.send_json({
                    "type": "metrics",
                    "cpu": round(cpu_percent, 1),
                    "ram": round(memory.percent, 1),
                    "hdd": round(disk.percent, 1),
                    "net_up": round(net_up, 2),
                    "net_down": round(net_down, 2),
                    "timestamp": current_time
                })
                
                # Wait 2 seconds before next update
                await asyncio.sleep(2)
                
            except Exception as e:
                if "disconnect" in str(e).lower() or "close" in str(e).lower():
                    break
                logger.debug(f"[WS-Metrics] Error: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"[WS-Metrics] Client {user_id} disconnected")
    except Exception as e:
        logger.error(f"[WS-Metrics] Unexpected error: {e}")
    finally:
        logger.info(f"[WS-Metrics] Connection closed for {user_id}")
