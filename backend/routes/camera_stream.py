"""
Camera Stream Proxy - Proxies MJPEG streams from cameras with authentication
Handles authentication and CORS for browser compatibility
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import Optional
import httpx
import asyncio
import base64

from config import devices_collection, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/camera-stream", tags=["camera-stream"])

# Timeout settings
STREAM_TIMEOUT = 30.0
CONNECT_TIMEOUT = 10.0


async def proxy_mjpeg_stream(url: str, username: str, password: str):
    """Generator that proxies MJPEG stream from camera"""
    auth = None
    if username and password:
        auth = httpx.BasicAuth(username, password)
    
    async with httpx.AsyncClient(timeout=None, auth=auth) as client:
        try:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    logger.error(f"Camera stream error: {response.status_code}")
                    return
                
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    yield chunk
                    
        except httpx.TimeoutException:
            logger.error("Camera stream timeout")
        except Exception as e:
            logger.error(f"Camera stream error: {e}")


async def get_single_frame(url: str, username: str, password: str) -> Optional[bytes]:
    """Get a single frame from camera (for snapshot mode)"""
    auth = None
    if username and password:
        auth = httpx.BasicAuth(username, password)
    
    async with httpx.AsyncClient(timeout=CONNECT_TIMEOUT, auth=auth) as client:
        try:
            response = await client.get(url)
            if response.status_code == 200:
                return response.content
        except Exception as e:
            logger.error(f"Snapshot error: {e}")
    return None


@router.get("/mjpeg/{device_id}")
async def stream_camera_mjpeg(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Stream MJPEG from a camera through proxy"""
    # Get device info
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Build stream URL for Mobotix
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    # Mobotix MJPEG stream URL
    # Common Mobotix paths: /cgi-bin/faststream.jpg, /control/faststream.jpg
    stream_url = f"{protocol}://{ip}:{port}/cgi-bin/faststream.jpg?stream=full&fps=3"
    
    logger.info(f"Starting MJPEG stream for device {device_id} ({ip})")
    
    return StreamingResponse(
        proxy_mjpeg_stream(stream_url, username, password),
        media_type="multipart/x-mixed-replace; boundary=--myboundary",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/snapshot/{device_id}")
async def get_camera_snapshot(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single snapshot from camera"""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    # Mobotix snapshot URL
    snapshot_url = f"{protocol}://{ip}:{port}/cgi-bin/image.jpg"
    
    frame = await get_single_frame(snapshot_url, username, password)
    
    if frame:
        return Response(
            content=frame,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache"
            }
        )
    else:
        raise HTTPException(status_code=503, detail="No se pudo obtener imagen de la cámara")


@router.get("/snapshot-poll/{device_id}")
async def poll_camera_snapshot(
    device_id: str,
    fps: int = 3,
    current_user: dict = Depends(get_current_user)
):
    """
    Polling-based snapshot stream (alternative to MJPEG)
    Returns snapshots at specified FPS rate
    """
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    snapshot_url = f"{protocol}://{ip}:{port}/cgi-bin/image.jpg"
    interval = 1.0 / max(1, min(fps, 10))  # Limit 1-10 FPS
    
    async def generate_frames():
        while True:
            frame = await get_single_frame(snapshot_url, username, password)
            if frame:
                # Format as MJPEG-like stream
                yield b"--frame\r\n"
                yield b"Content-Type: image/jpeg\r\n\r\n"
                yield frame
                yield b"\r\n"
            await asyncio.sleep(interval)
    
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/test/{device_id}")
async def test_camera_connection(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test camera connection and return info"""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    # Try to get a snapshot to test connection
    snapshot_url = f"{protocol}://{ip}:{port}/cgi-bin/image.jpg"
    
    auth = None
    if username and password:
        auth = httpx.BasicAuth(username, password)
    
    try:
        async with httpx.AsyncClient(timeout=CONNECT_TIMEOUT, auth=auth) as client:
            response = await client.get(snapshot_url)
            
            return {
                "device_id": device_id,
                "device_name": device.get("name"),
                "ip": ip,
                "port": port,
                "connection": "success" if response.status_code == 200 else "failed",
                "status_code": response.status_code,
                "content_type": response.headers.get("content-type", "unknown"),
                "has_auth": bool(username and password)
            }
    except httpx.TimeoutException:
        return {
            "device_id": device_id,
            "connection": "timeout",
            "error": "Connection timeout"
        }
    except Exception as e:
        return {
            "device_id": device_id,
            "connection": "error",
            "error": str(e)
        }
