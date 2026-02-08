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



@router.get("/ftp-status/{device_id}")
async def get_camera_ftp_status(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get FTP configuration status from Mobotix camera"""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    headers = get_auth_header(username, password)
    base_url = f"{protocol}://{ip}:{port}"
    
    ftp_info = {
        "device_id": device_id,
        "device_name": device.get("name"),
        "ftp_enabled": False,
        "ftp_server": None,
        "ftp_path": None,
        "ftp_user": None,
        "ftp_mode": None,
        "event_enabled": False,
        "raw_config": {}
    }
    
    async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
        try:
            # Mobotix API to get FTP settings
            # Try different Mobotix API endpoints for FTP config
            ftp_endpoints = [
                "/admin/fileserver",
                "/control/control?list&section=fileserver",
                "/admin/remoteconfig?action=get&section=transfer",
                "/cgi-bin/admin/remoteconfig?action=get&section=transfer",
            ]
            
            for endpoint in ftp_endpoints:
                try:
                    response = await client.get(f"{base_url}{endpoint}", headers=headers)
                    if response.status_code == 200:
                        content = response.text
                        ftp_info["raw_config"][endpoint] = content[:500]  # First 500 chars
                        
                        # Parse common Mobotix FTP config patterns
                        if "ftp" in content.lower() or "fileserver" in content.lower():
                            # Check for FTP enabled
                            if "enabled=yes" in content.lower() or "ftpenabled=1" in content.lower():
                                ftp_info["ftp_enabled"] = True
                            
                            # Extract server
                            import re
                            server_match = re.search(r'(?:server|ftpserver|host)=([^\s&\n]+)', content, re.IGNORECASE)
                            if server_match:
                                ftp_info["ftp_server"] = server_match.group(1)
                            
                            # Extract path
                            path_match = re.search(r'(?:path|ftppath|directory)=([^\s&\n]+)', content, re.IGNORECASE)
                            if path_match:
                                ftp_info["ftp_path"] = path_match.group(1)
                            
                            # Extract user
                            user_match = re.search(r'(?:user|ftpuser|username)=([^\s&\n]+)', content, re.IGNORECASE)
                            if user_match:
                                ftp_info["ftp_user"] = user_match.group(1)
                except Exception as e:
                    logger.debug(f"FTP endpoint {endpoint} failed: {e}")
                    continue
            
            # Also check event/alarm settings for FTP triggers
            event_endpoints = [
                "/admin/event_control",
                "/control/control?list&section=event",
                "/cgi-bin/admin/remoteconfig?action=get&section=action",
            ]
            
            for endpoint in event_endpoints:
                try:
                    response = await client.get(f"{base_url}{endpoint}", headers=headers)
                    if response.status_code == 200:
                        content = response.text
                        if "ftp" in content.lower() and ("enabled" in content.lower() or "active" in content.lower()):
                            ftp_info["event_enabled"] = True
                        ftp_info["raw_config"][f"event_{endpoint}"] = content[:300]
                except:
                    continue
                    
        except Exception as e:
            logger.error(f"Error getting FTP status for {device_id}: {e}")
            ftp_info["error"] = str(e)
    
    return ftp_info


@router.get("/hemispheric/{device_id}")
async def get_hemispheric_image(
    device_id: str,
    view: str = Query("full", description="View type: full, north, south, panorama, quad"),
    quality: int = Query(80, ge=10, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get hemispheric/fisheye camera image with different view modes
    
    Mobotix hemispheric cameras (c25, c26, S15, Q25, etc.) support different views:
    - full: Complete fisheye image (circular)
    - panorama: 360° panoramic view (dewarped)
    - north/south: Hemisphere views
    - quad: 4 views in one image
    """
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    headers = get_auth_header(username, password)
    base_url = f"{protocol}://{ip}:{port}"
    
    # Mobotix hemispheric view parameters
    view_params = {
        "full": "mode=hemisphere&view=full",
        "panorama": "mode=hemisphere&view=panorama",
        "north": "mode=hemisphere&view=north",
        "south": "mode=hemisphere&view=south",
        "quad": "mode=hemisphere&view=quad",
        "surround": "mode=hemisphere&view=surround",
        "double_panorama": "mode=hemisphere&view=doublepanorama",
    }
    
    view_param = view_params.get(view, view_params["full"])
    
    # Mobotix hemispheric image URLs to try
    hemispheric_urls = [
        # MxPEG with hemispheric view
        f"{base_url}/cgi-bin/image.jpg?{view_param}&quality={quality}",
        f"{base_url}/cgi-bin/faststream.jpg?stream=full&{view_param}&quality={quality}",
        # Full resolution fisheye
        f"{base_url}/record/current.jpg?{view_param}",
        # Alternative Mobotix API
        f"{base_url}/control/control?action=snapshot&{view_param}&quality={quality}",
        # Standard snapshot as fallback
        f"{base_url}/cgi-bin/image.jpg?quality={quality}",
    ]
    
    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        for url in hemispheric_urls:
            try:
                response = await client.get(url, headers=headers, follow_redirects=True)
                
                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "")
                    
                    if "image" in content_type:
                        return Response(
                            content=response.content,
                            media_type="image/jpeg",
                            headers={
                                "Cache-Control": "no-cache, no-store, must-revalidate",
                                "X-View-Mode": view,
                                "X-Camera-Type": "hemispheric",
                                "Access-Control-Allow-Origin": "*"
                            }
                        )
            except Exception as e:
                logger.debug(f"Hemispheric URL failed: {url} - {e}")
                continue
    
    raise HTTPException(status_code=500, detail="No se pudo obtener imagen hemisférica")


@router.get("/camera-config/{device_id}")
async def get_full_camera_config(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get complete camera configuration including FTP, events, storage, etc."""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    ip = device.get("ip_address")
    port = device.get("port", 80)
    protocol = device.get("camera_protocol", "http")
    username = device.get("camera_user", "")
    password = device.get("camera_password", "")
    
    headers = get_auth_header(username, password)
    base_url = f"{protocol}://{ip}:{port}"
    
    config = {
        "device_id": device_id,
        "device_name": device.get("name"),
        "brand": device.get("brand"),
        "model": device.get("model"),
        "connection": {
            "ip": ip,
            "port": port,
            "protocol": protocol,
            "reachable": False
        },
        "camera_type": "unknown",
        "is_hemispheric": False,
        "ftp": {
            "enabled": False,
            "server": None,
            "configured": False
        },
        "storage": {
            "internal": None,
            "nas_connected": device.get("nas_connected"),
            "sd_card": None
        },
        "events": {
            "motion_detection": False,
            "alarm_input": False,
            "ftp_on_event": False
        },
        "system": {
            "firmware": device.get("firmware_version"),
            "uptime": None,
            "temperature": None
        },
        "raw_data": {}
    }
    
    async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
        try:
            # Test connection
            response = await client.get(f"{base_url}/", headers=headers, follow_redirects=True)
            config["connection"]["reachable"] = response.status_code < 400
            
            # Get system info
            try:
                resp = await client.get(f"{base_url}/admin/system", headers=headers)
                if resp.status_code == 200:
                    content = resp.text
                    config["raw_data"]["system"] = content[:1000]
                    
                    # Check if hemispheric
                    if any(x in content.lower() for x in ["hemisphere", "c25", "c26", "q25", "s15", "fisheye"]):
                        config["is_hemispheric"] = True
                        config["camera_type"] = "hemispheric"
                    elif "mx-" in content.lower():
                        config["camera_type"] = "mobotix"
                    
                    # Extract firmware
                    import re
                    fw_match = re.search(r'(?:software|firmware)[:\s=]+([^\s<]+)', content, re.IGNORECASE)
                    if fw_match:
                        config["system"]["firmware"] = fw_match.group(1)
                    
                    # Extract temperature
                    temp_match = re.search(r'(?:temperature|temp)[:\s=]+([0-9.]+)', content, re.IGNORECASE)
                    if temp_match:
                        config["system"]["temperature"] = f"{temp_match.group(1)}°C"
            except:
                pass
            
            # Get FTP/transfer config
            try:
                resp = await client.get(f"{base_url}/admin/fileserver", headers=headers)
                if resp.status_code == 200:
                    content = resp.text.lower()
                    config["raw_data"]["fileserver"] = resp.text[:500]
                    config["ftp"]["configured"] = "ftp" in content
                    if "enabled" in content or "active" in content:
                        config["ftp"]["enabled"] = True
            except:
                pass
            
            # Get storage info
            try:
                resp = await client.get(f"{base_url}/admin/storage", headers=headers)
                if resp.status_code == 200:
                    content = resp.text
                    config["raw_data"]["storage"] = content[:500]
                    if "sd" in content.lower():
                        config["storage"]["sd_card"] = "detected"
                    if "nas" in content.lower() or "network" in content.lower():
                        config["storage"]["nas_connected"] = "connected" in content.lower()
            except:
                pass
            
            # Get event/alarm config
            try:
                resp = await client.get(f"{base_url}/admin/event_control", headers=headers)
                if resp.status_code == 200:
                    content = resp.text.lower()
                    config["raw_data"]["events"] = resp.text[:500]
                    config["events"]["motion_detection"] = "motion" in content and "enabled" in content
                    config["events"]["alarm_input"] = "alarm" in content
                    config["events"]["ftp_on_event"] = "ftp" in content
            except:
                pass
                
        except Exception as e:
            config["error"] = str(e)
    
    return config
