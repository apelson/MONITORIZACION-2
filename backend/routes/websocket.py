"""
WebSocket routes for real-time notifications
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import jwt
import os

from config import logger
from services.websocket_service import websocket_manager

router = APIRouter(prefix="/ws", tags=["websocket"])

SECRET_KEY = os.environ.get("JWT_SECRET", "siempria-secret-key-2024")

def get_user_from_token(token: str) -> Optional[str]:
    """Extract user ID from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
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
