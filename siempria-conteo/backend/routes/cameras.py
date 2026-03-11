"""
Camera configuration routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

from config import cameras_config_collection, daily_baselines_collection, MONGO_URL, logger
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
    enabled: bool = Body(default=True),
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
        "enabled": enabled,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.get("username")
    }

    await cameras_config_collection.update_one(
        {"camera_id": camera_id}, {"$set": config}, upsert=True
    )
    return {"message": "Camara configurada", "camera_id": camera_id}


@router.put("/{camera_id}")
async def update_camera(
    camera_id: str,
    camera_name: str = Body(None),
    brand_id: str = Body(None),
    island: str = Body(None),
    ip: str = Body(None),
    port: int = Body(None),
    username: str = Body(None),
    password: str = Body(None),
    enabled: bool = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a camera configuration"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede configurar camaras")

    existing = await cameras_config_collection.find_one({"camera_id": camera_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Camara no encontrada")

    update = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": current_user.get("username")}
    for field, val in [("camera_name", camera_name), ("brand_id", brand_id), ("island", island),
                       ("ip", ip), ("port", port), ("username", username), ("password", password), ("enabled", enabled)]:
        if val is not None:
            update[field] = val

    await cameras_config_collection.update_one({"camera_id": camera_id}, {"$set": update})
    return {"message": "Camara actualizada", "camera_id": camera_id}


@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a camera configuration"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede configurar camaras")

    result = await cameras_config_collection.delete_one({"camera_id": camera_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Camara no encontrada")
    return {"message": "Camara eliminada", "camera_id": camera_id}


@router.post("/migrate-from-main")
async def migrate_cameras(current_user: dict = Depends(get_current_user)):
    """Migrate camera configurations from main siempria_network_monitor database"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede migrar camaras")

    try:
        main_client = AsyncIOMotorClient(MONGO_URL)
        main_db = main_client["siempria_network_monitor"]
        main_cameras = await main_db["brand_cameras_config"].find({}, {"_id": 0}).to_list(200)

        if not main_cameras:
            main_cameras = await main_db["brand_cameras"].find({}, {"_id": 0}).to_list(200)

        migrated = 0
        skipped = 0
        for cam in main_cameras:
            cam_id = cam.get("camera_id")
            if not cam_id:
                continue
            existing = await cameras_config_collection.find_one({"camera_id": cam_id})
            if existing:
                skipped += 1
                continue
            cam["migrated_at"] = datetime.now(timezone.utc).isoformat()
            cam["migrated_from"] = "siempria_network_monitor"
            if "enabled" not in cam:
                cam["enabled"] = True
            await cameras_config_collection.insert_one(cam)
            migrated += 1

        main_client.close()
        return {
            "message": f"Migracion completada: {migrated} nuevas, {skipped} existentes",
            "migrated": migrated,
            "skipped": skipped,
            "total_in_main": len(main_cameras)
        }
    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset-baselines")
async def reset_baselines(current_user: dict = Depends(get_current_user)):
    """Manually reset daily baselines"""
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
