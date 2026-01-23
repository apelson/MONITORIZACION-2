"""
Mobotix camera statistics routes
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
import urllib.request
import ssl
import base64
import asyncio
import io

from config import devices_collection, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/cameras", tags=["statistics"])

@router.get("/{camera_id}/mobotix/overview")
async def get_mobotix_overview(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Get overview of Mobotix camera statistics capabilities"""
    camera = await devices_collection.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    
    if not camera.get("has_statistics"):
        raise HTTPException(status_code=400, detail="Esta cámara no tiene estadísticas habilitadas")
    
    try:
        protocol = camera.get("camera_protocol", "http")
        ip = camera.get("ip_address")
        port = camera.get("port", 80)
        user = camera.get("camera_user", "")
        password = camera.get("camera_password", "")
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        url = f"{protocol}://{ip}:{port}/control/stat_export?function=counter"
        auth_string = base64.b64encode(f"{user}:{password}".encode()).decode()
        
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth_string}")
        
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            import json
            data = json.loads(response.read().decode())
            return {"camera_id": camera_id, "camera_name": camera.get("name"), "data": data}
    except Exception as e:
        logger.error(f"Error fetching Mobotix overview for {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener datos: {str(e)}")

@router.get("/{camera_id}/mobotix/info")
async def get_mobotix_info(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Get Mobotix camera counter information"""
    camera = await devices_collection.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    
    if not camera.get("has_statistics"):
        raise HTTPException(status_code=400, detail="Esta cámara no tiene estadísticas habilitadas")
    
    try:
        protocol = camera.get("camera_protocol", "http")
        ip = camera.get("ip_address")
        port = camera.get("port", 80)
        user = camera.get("camera_user", "")
        password = camera.get("camera_password", "")
        
        url = f"{protocol}://{ip}:{port}/control/stat_export?function=counter"
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        auth_string = base64.b64encode(f"{user}:{password}".encode()).decode()
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth_string}")
        
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            import json
            data = json.loads(response.read().decode())
            return {"camera_id": camera_id, "camera_name": camera.get("name"), "counter": data}
    except Exception as e:
        logger.error(f"Error fetching Mobotix counter for {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener contador: {str(e)}")

@router.get("/{camera_id}/mobotix/report")
async def get_mobotix_report(
    camera_id: str, 
    report_type: str = "week",
    export_range: str = "current",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get counting corridor report from a Mobotix camera"""
    camera = await devices_collection.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    
    if not camera.get("has_statistics"):
        raise HTTPException(status_code=400, detail="Esta cámara no tiene estadísticas habilitadas")
    
    try:
        protocol = camera.get("camera_protocol", "http")
        ip = camera.get("ip_address")
        port = camera.get("port", 80)
        user = camera.get("camera_user", "")
        password = camera.get("camera_password", "")
        
        if start_date and end_date:
            url = f"{protocol}://{ip}:{port}/control/stat_export?report&corridors=2&start={start_date}&end={end_date}&export_format=json"
        else:
            url = f"{protocol}://{ip}:{port}/control/stat_export?report&export_type={report_type}&export_range={export_range}&export_format=json"
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        auth_string = base64.b64encode(f"{user}:{password}".encode()).decode()
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth_string}")
        
        with urllib.request.urlopen(req, timeout=20, context=ctx) as response:
            import json
            data = json.loads(response.read().decode())
            return {
                "camera_id": camera_id, 
                "camera_name": camera.get("name"), 
                "report_type": report_type, 
                "export_range": export_range,
                "start_date": start_date,
                "end_date": end_date,
                "report": data
            }
    except Exception as e:
        logger.error(f"Error fetching Mobotix report for {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener reporte: {str(e)}")

@router.get("/{camera_id}/mobotix/heatmap")
async def get_mobotix_heatmap(
    camera_id: str,
    heatmap_type: str = "week",
    export_range: str = "last",
    current_user: dict = Depends(get_current_user)
):
    """Get heatmap image from a Mobotix camera"""
    camera = await devices_collection.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    
    if not camera.get("has_statistics"):
        raise HTTPException(status_code=400, detail="Esta cámara no tiene estadísticas habilitadas")
    
    try:
        protocol = camera.get("camera_protocol", "http")
        ip = camera.get("ip_address")
        port = camera.get("port", 80)
        user = camera.get("camera_user", "")
        password = camera.get("camera_password", "")
        
        url = f"{protocol}://{ip}:{port}/control/stat_export?heatmap&export_type={heatmap_type}&export_range={export_range}&start=0800&end=2200&daylist=1,2,3,4,5,6&export_format=jpeg&legend=1"
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        auth_string = base64.b64encode(f"{user}:{password}".encode()).decode()
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth_string}")
        
        with urllib.request.urlopen(req, timeout=20, context=ctx) as response:
            image_data = response.read()
            image_base64 = base64.b64encode(image_data).decode()
            return {
                "camera_id": camera_id, 
                "camera_name": camera.get("name"), 
                "heatmap_type": heatmap_type,
                "export_range": export_range,
                "image": f"data:image/jpeg;base64,{image_base64}"
            }
    except Exception as e:
        logger.error(f"Error fetching Mobotix heatmap for {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener mapa de calor: {str(e)}")
