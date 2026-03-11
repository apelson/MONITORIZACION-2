"""
Camera configuration routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone

from config import cameras_config_collection, daily_baselines_collection, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("")
async def get_cameras(current_user: dict = Depends(get_current_user)):
    """Get all camera configurations"""
    cameras = await cameras_config_collection.find({}, {"_id": 0}).to_list(100)
    return {"cameras": cameras, "total": len(cameras)}


@router.post("")
async def add_camera(
    camera_id: str = Body(...),
    camera_name: str = Body(...),
    brand_id: str = Body(...),
    island: str = Body(...),
    ip: str = Body(...),
    port: int = Body(default=443),
    username: str = Body(...),
    password: str = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Add or update a camera configuration"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede configurar camaras")

    config = {
        "camera_id": camera_id,
        "camera_name": camera_name,
        "brand_id": brand_id,
        "island": island,
        "ip": ip,
        "port": port,
        "username": username,
        "password": password,
        "enabled": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.get("username")
    }

    await cameras_config_collection.update_one(
        {"camera_id": camera_id}, {"$set": config}, upsert=True
    )
    return {"message": "Camara configurada", "camera_id": camera_id}


@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a camera configuration"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede configurar camaras")

    result = await cameras_config_collection.delete_one({"camera_id": camera_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Camara no encontrada")
    return {"message": "Camara eliminada", "camera_id": camera_id}


@router.post("/reset-baselines")
async def reset_baselines(current_user: dict = Depends(get_current_user)):
    """Manually reset daily baselines (normally done by cron at midnight)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede resetear baselines")

    from services.mobotix_service import fetch_all_cameras_counting
    try:
        data = await fetch_all_cameras_counting()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        for cam_id, cam_data in data.get("cameras", {}).items():
            await daily_baselines_collection.update_one(
                {"camera_id": cam_id, "date": today},
                {"$set": {
                    "entries": cam_data.get("raw_entries", 0),
                    "exits": cam_data.get("raw_exits", 0),
                    "reset_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )

        return {"message": f"Baselines reseteadas para {len(data.get('cameras', {}))} camaras"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
