"""
Heatmap Routes - Generate, store and retrieve Mobotix heatmaps
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from datetime import datetime, timezone
from typing import Optional
import base64
import uuid

from config import cameras_config_collection, logger
from services.auth_service import get_current_user
from services.heatmap_service import fetch_heatmap_from_camera

import motor.motor_asyncio
from config import db

heatmaps_collection = db["heatmaps"]

router = APIRouter(prefix="/heatmap", tags=["heatmap"])


@router.get("/cameras")
async def get_heatmap_cameras(current_user: dict = Depends(get_current_user)):
    """List cameras that have heatmap profiles configured"""
    cameras = await cameras_config_collection.find(
        {"heatmap_profile": {"$exists": True, "$ne": ""}},
        {"_id": 0}
    ).to_list(100)
    return {"cameras": cameras}


@router.post("/generate")
async def generate_heatmap(
    camera_id: str = Query(...),
    range_type: str = Query(default="yesterday", description="yesterday, today, week, month, custom"),
    custom_date: Optional[str] = Query(default=None, description="YYYY-MM-DD for custom range"),
    current_user: dict = Depends(get_current_user)
):
    """Generate and store a heatmap from a camera"""
    camera = await cameras_config_collection.find_one(
        {"camera_id": camera_id},
        {"_id": 0}
    )
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    heatmap_profile = camera.get("heatmap_profile")
    if not heatmap_profile:
        raise HTTPException(status_code=400, detail="Camera has no heatmap profile configured")

    # Determine custom_range parameter
    custom_range = None
    now = datetime.now()
    if range_type == "yesterday":
        from datetime import timedelta
        custom_range = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    elif range_type == "today":
        custom_range = now.strftime("%Y-%m-%d")
    elif range_type == "week":
        custom_range = now.strftime("%Y-%m-%d")
    elif range_type == "month":
        custom_range = now.strftime("%Y-%m")
    elif range_type == "custom" and custom_date:
        custom_range = custom_date

    # Fetch from camera
    jpeg_data = await fetch_heatmap_from_camera(
        ip=camera["ip"],
        port=camera["port"],
        username=camera.get("username", "admin"),
        password=camera.get("password", ""),
        heatmap_profile=heatmap_profile,
        custom_range=custom_range
    )

    if not jpeg_data:
        raise HTTPException(status_code=502, detail="Failed to generate heatmap from camera")

    # Store in MongoDB
    heatmap_id = str(uuid.uuid4())[:12]
    doc = {
        "heatmap_id": heatmap_id,
        "camera_id": camera_id,
        "camera_name": camera.get("camera_name", ""),
        "brand_id": camera.get("brand_id", ""),
        "island": camera.get("island", ""),
        "range_type": range_type,
        "custom_range": custom_range,
        "image_b64": base64.b64encode(jpeg_data).decode("utf-8"),
        "image_size": len(jpeg_data),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": current_user.get("username", "system")
    }
    await heatmaps_collection.insert_one(doc)

    return {
        "heatmap_id": heatmap_id,
        "camera_id": camera_id,
        "camera_name": camera.get("camera_name", ""),
        "range_type": range_type,
        "custom_range": custom_range,
        "image_size": len(jpeg_data),
        "generated_at": doc["generated_at"]
    }


@router.get("/image/{heatmap_id}")
async def get_heatmap_image(heatmap_id: str, token: str = Query(default=None)):
    """Get a stored heatmap as JPEG image (accepts token as query param for img src)"""
    import jwt as pyjwt
    from config import SECRET_KEY
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    try:
        pyjwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    doc = await heatmaps_collection.find_one(
        {"heatmap_id": heatmap_id},
        {"_id": 0, "image_b64": 1}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Heatmap not found")

    jpeg_data = base64.b64decode(doc["image_b64"])
    return Response(content=jpeg_data, media_type="image/jpeg")


@router.get("/history")
async def get_heatmap_history(
    camera_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """List stored heatmaps (without image data)"""
    query = {}
    if camera_id:
        query["camera_id"] = camera_id

    docs = await heatmaps_collection.find(
        query,
        {"_id": 0, "image_b64": 0}
    ).sort("generated_at", -1).limit(limit).to_list(limit)

    total = await heatmaps_collection.count_documents(query)

    return {"heatmaps": docs, "total": total}


@router.delete("/{heatmap_id}")
async def delete_heatmap(heatmap_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a stored heatmap"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await heatmaps_collection.delete_one({"heatmap_id": heatmap_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Heatmap not found")
    return {"deleted": True}
