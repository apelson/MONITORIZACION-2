"""
Camera Stream Proxy - Proxies MJPEG streams and snapshots from cameras
Supports Mobotix cameras with authentication
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import httpx
import asyncio
import base64
import time

from config import devices_collection, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/camera-stream", tags=["camera-stream"])

# Timeout settings
CONNECT_TIMEOUT = 10.0
READ_TIMEOUT = 30.0


def get_auth_header(username: str, password: str) -> dict:
    """Create Basic Auth header"""
    if username and password:
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        return {"Authorization": f"Basic {credentials}"}
    return {}


@router.get("/snapshot/{device_id}")
async def get_camera_snapshot(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single snapshot from camera - works with Mobotix"""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    # Mobotix snapshot URLs to try
    snapshot_urls = [
        f"{protocol}://{ip}:{port}/cgi-bin/image.jpg",
        f"{protocol}://{ip}:{port}/record/current.jpg",
        f"{protocol}://{ip}:{port}/cgi-bin/faststream.jpg?stream=full&needlength&fps=1",
    ]
    
    headers = get_auth_header(username, password)
    
    async with httpx.AsyncClient(timeout=CONNECT_TIMEOUT, verify=False) as client:
        for url in snapshot_urls:
            try:
                logger.info(f"Trying snapshot URL: {url}")
                response = await client.get(url, headers=headers, follow_redirects=True)
                
                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "")
                    
                    # If it's an image, return it
                    if "image" in content_type:
                        return Response(
                            content=response.content,
                            media_type="image/jpeg",
                            headers={
                                "Cache-Control": "no-cache, no-store, must-revalidate",
                                "Pragma": "no-cache",
                                "Access-Control-Allow-Origin": "*"
                            }
                        )
                    
                    # For MJPEG stream, extract first frame
                    if "multipart" in content_type:
                        # Get first frame from stream
                        content = response.content
                        # Find JPEG start and end markers
                        start = content.find(b'\xff\xd8')
                        end = content.find(b'\xff\xd9')
                        if start != -1 and end != -1:
                            return Response(
                                content=content[start:end+2],
                                media_type="image/jpeg",
                                headers={"Cache-Control": "no-cache"}
                            )
                            
            except Exception as e:
                logger.warning(f"Snapshot URL {url} failed: {e}")
                continue
    
    raise HTTPException(status_code=503, detail="No se pudo obtener imagen de la cámara")


@router.get("/mjpeg/{device_id}")
async def stream_camera_mjpeg(
    device_id: str,
    fps: int = Query(default=3, ge=1, le=10),
    current_user: dict = Depends(get_current_user)
):
    """
    Stream camera as MJPEG by polling snapshots
    More reliable than proxying native MJPEG stream
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
    headers = get_auth_header(username, password)
    interval = 1.0 / fps
    
    async def generate_mjpeg():
        """Generate MJPEG stream by polling snapshots"""
        async with httpx.AsyncClient(timeout=CONNECT_TIMEOUT, verify=False) as client:
            while True:
                try:
                    response = await client.get(snapshot_url, headers=headers)
                    if response.status_code == 200:
                        frame = response.content
                        # MJPEG frame format
                        yield b"--frame\r\n"
                        yield b"Content-Type: image/jpeg\r\n"
                        yield f"Content-Length: {len(frame)}\r\n\r\n".encode()
                        yield frame
                        yield b"\r\n"
                except Exception as e:
                    logger.error(f"Frame capture error: {e}")
                
                await asyncio.sleep(interval)
    
    return StreamingResponse(
        generate_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )


@router.get("/proxy/{device_id}")
async def proxy_native_stream(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Proxy native MJPEG stream from Mobotix camera
    Uses the camera's built-in MJPEG streaming
    """
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    # Mobotix native MJPEG stream URL
    stream_url = f"{protocol}://{ip}:{port}/cgi-bin/faststream.jpg?stream=full&fps=5"
    headers = get_auth_header(username, password)
    
    async def proxy_stream():
        """Proxy the native MJPEG stream"""
        async with httpx.AsyncClient(timeout=None, verify=False) as client:
            try:
                async with client.stream("GET", stream_url, headers=headers) as response:
                    if response.status_code != 200:
                        logger.error(f"Stream error: {response.status_code}")
                        return
                    
                    async for chunk in response.aiter_bytes(chunk_size=4096):
                        yield chunk
                        
            except Exception as e:
                logger.error(f"Stream proxy error: {e}")
    
    return StreamingResponse(
        proxy_stream(),
        media_type="multipart/x-mixed-replace; boundary=--myboundary",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )


@router.get("/test/{device_id}")
async def test_camera_connection(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test camera connection and return available URLs"""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    # URLs to test
    test_urls = [
        ("snapshot", f"{protocol}://{ip}:{port}/cgi-bin/image.jpg"),
        ("record", f"{protocol}://{ip}:{port}/record/current.jpg"),
        ("faststream", f"{protocol}://{ip}:{port}/cgi-bin/faststream.jpg?stream=full&fps=1"),
        ("control", f"{protocol}://{ip}:{port}/control/faststream.jpg?stream=full"),
    ]
    
    headers = get_auth_header(username, password)
    results = []
    
    async with httpx.AsyncClient(timeout=5.0, verify=False) as client:
        for name, url in test_urls:
            try:
                response = await client.get(url, headers=headers)
                results.append({
                    "name": name,
                    "url": url,
                    "status": response.status_code,
                    "content_type": response.headers.get("content-type", ""),
                    "size": len(response.content) if response.status_code == 200 else 0,
                    "works": response.status_code == 200
                })
            except Exception as e:
                results.append({
                    "name": name,
                    "url": url,
                    "status": "error",
                    "error": str(e),
                    "works": False
                })
    
    return {
        "device_id": device_id,
        "device_name": device.get("name"),
        "ip": ip,
        "port": port,
        "has_credentials": bool(username and password),
        "test_results": results
    }


@router.get("/info/{device_id}")
async def get_camera_info(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get camera connection info for debugging"""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    return {
        "device_id": device_id,
        "name": device.get("name"),
        "ip": device.get("ip_address"),
        "port": device.get("port"),
        "protocol": device.get("camera_protocol", "http"),
        "has_user": bool(device.get("camera_user")),
        "has_password": bool(device.get("camera_password")),
        "snapshot_url": f"/api/camera-stream/snapshot/{device_id}",
        "mjpeg_url": f"/api/camera-stream/mjpeg/{device_id}",
        "proxy_url": f"/api/camera-stream/proxy/{device_id}",
        "test_url": f"/api/camera-stream/test/{device_id}"
    }
