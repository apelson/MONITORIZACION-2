"""
WebSocket manager for real-time alert notifications
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Set
import json
import asyncio
from datetime import datetime, timezone

from config import logger

class WebSocketManager:
    """Manages WebSocket connections for real-time alerts"""
    
    def __init__(self):
        # Active connections: {user_id: [websocket1, websocket2, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # All connections for broadcast
        self.all_connections: Set[WebSocket] = set()
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_id: str = "anonymous"):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        async with self._lock:
            # Add to all connections
            self.all_connections.add(websocket)
            
            # Add to user-specific connections
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
        
        logger.info(f"[WS] Client connected: {user_id} (Total: {len(self.all_connections)})")
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connected",
            "message": "Connected to alert stream",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, websocket)
    
    async def disconnect(self, websocket: WebSocket, user_id: str = "anonymous"):
        """Remove a WebSocket connection"""
        async with self._lock:
            # Remove from all connections
            self.all_connections.discard(websocket)
            
            # Remove from user-specific connections
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                # Clean up empty lists
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
        
        logger.info(f"[WS] Client disconnected: {user_id} (Total: {len(self.all_connections)})")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"[WS] Error sending personal message: {e}")
    
    async def broadcast(self, message: dict):
        """Send a message to all connected clients"""
        if not self.all_connections:
            return
        
        disconnected = []
        
        for connection in list(self.all_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"[WS] Error broadcasting, marking for disconnect: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.all_connections.discard(conn)
    
    async def broadcast_alert(self, alert: dict):
        """Broadcast a new alert to all connected clients"""
        message = {
            "type": "alert",
            "data": {
                "id": alert.get("id"),
                "device_id": alert.get("device_id"),
                "device_name": alert.get("device_name"),
                "alert_type": alert.get("alert_type"),
                "message": alert.get("message"),
                "timestamp": alert.get("timestamp"),
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"[WS] Broadcasting alert to {len(self.all_connections)} clients: {alert.get('alert_type')} - {alert.get('device_name')}")
        await self.broadcast(message)
    
    async def broadcast_device_status(self, device_id: str, device_name: str, old_status: str, new_status: str):
        """Broadcast a device status change to all connected clients"""
        message = {
            "type": "device_status",
            "data": {
                "device_id": device_id,
                "device_name": device_name,
                "old_status": old_status,
                "new_status": new_status,
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.broadcast(message)
    
    def get_connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self.all_connections)


# Global instance
websocket_manager = WebSocketManager()
