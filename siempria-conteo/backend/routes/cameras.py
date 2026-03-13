"""
Camera configuration routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

from config import cameras_config_collection, daily_baselines_collection, logger, MAIN_PLATFORM_MONGO_URL, MAIN_PLATFORM_DB_NAME
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
        "heatmap_profile": "default",
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
    heatmap_profile: str = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a camera configuration"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede configurar camaras")

    existing = await cameras_config_collection.find_one({"camera_id": camera_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Camara no encontrada")

    update = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": current_user.get("username")}
    if not existing.get("heatmap_profile"):
        update["heatmap_profile"] = "default"
    for field, val in [("camera_name", camera_name), ("brand_id", brand_id), ("island", island),
                       ("ip", ip), ("port", port), ("username", username), ("password", password),
                       ("enabled", enabled), ("heatmap_profile", heatmap_profile)]:
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
    """Migrate camera configurations from main siempria platform database"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede migrar camaras")

    try:
        main_client = AsyncIOMotorClient(MAIN_PLATFORM_MONGO_URL)

        # Try multiple database names
        db_names_to_try = [
            MAIN_PLATFORM_DB_NAME,
            "siempria_monitor",
            "siempria_network_monitor",
            "siempria",
        ]

        # Try multiple collection names
        collection_names_to_try = [
            "brand_cameras_config",
            "brand_cameras",
            "cameras",
            "camaras",
            "cameras_config",
        ]

        main_cameras = []
        found_db = None
        found_collection = None

        for db_name in db_names_to_try:
            if main_cameras:
                break
            try:
                test_db = main_client[db_name]
                collections = await test_db.list_collection_names()
                logger.info(f"DB '{db_name}' tiene colecciones: {collections}")

                for col_name in collection_names_to_try:
                    if col_name in collections:
                        cams = await test_db[col_name].find({}, {"_id": 0}).to_list(200)
                        if cams:
                            main_cameras = cams
                            found_db = db_name
                            found_collection = col_name
                            logger.info(f"Encontradas {len(cams)} camaras en {db_name}.{col_name}")
                            break
            except Exception as e:
                logger.warning(f"Error accediendo DB '{db_name}': {e}")
                continue

        if not main_cameras:
            # List all databases for debugging
            all_dbs = await main_client.list_database_names()
            main_client.close()
            raise HTTPException(
                status_code=404,
                detail=f"No se encontraron camaras. DBs disponibles: {all_dbs}. Verifica MAIN_PLATFORM_DB_NAME en .env"
            )

        migrated = 0
        skipped = 0
        errors = []
        for cam in main_cameras:
            try:
                # Try different ID field names
                cam_id = cam.get("camera_id") or cam.get("id") or cam.get("name") or cam.get("_id_str")
                if not cam_id:
                    # Generate ID from name/brand/island
                    name = cam.get("camera_name") or cam.get("name") or ""
                    brand = cam.get("brand_id") or cam.get("brand") or ""
                    cam_id = f"{brand}-{name}".lower().replace(" ", "-")[:30] if name else None

                if not cam_id:
                    errors.append(f"Camara sin ID: {str(cam)[:80]}")
                    continue

                existing = await cameras_config_collection.find_one({"camera_id": cam_id})
                if existing:
                    skipped += 1
                    continue

                # Normalize camera data
                new_cam = {
                    "camera_id": cam_id,
                    "camera_name": cam.get("camera_name") or cam.get("name") or cam_id,
                    "brand_id": (cam.get("brand_id") or cam.get("brand") or "").lower(),
                    "island": (cam.get("island") or cam.get("location") or "").lower(),
                    "ip": cam.get("ip") or cam.get("host") or "",
                    "port": int(cam.get("port") or 443),
                    "username": cam.get("username") or cam.get("user") or "",
                    "password": cam.get("password") or cam.get("pass") or "",
                    "enabled": cam.get("enabled", True) if "enabled" in cam else cam.get("active", True),
                    "migrated_at": datetime.now(timezone.utc).isoformat(),
                    "migrated_from": f"{found_db}.{found_collection}",
                }

                # Copy any extra fields
                for key in ["center", "center_id", "center_name", "credentials"]:
                    if key in cam:
                        new_cam[key] = cam[key]

                await cameras_config_collection.insert_one(new_cam)
                migrated += 1
            except Exception as e:
                errors.append(f"Error con camara: {str(e)[:80]}")

        main_client.close()
        result = {
            "message": f"Migracion completada: {migrated} nuevas, {skipped} existentes",
            "source": f"{found_db}.{found_collection}",
            "migrated": migrated,
            "skipped": skipped,
            "total_in_main": len(main_cameras),
        }
        if errors:
            result["errors"] = errors[:5]
        return result
    except HTTPException:
        raise
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


@router.get("/debug/main-db")
async def debug_main_db(current_user: dict = Depends(get_current_user)):
    """Debug: Show databases and collections available in main platform"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")

    try:
        main_client = AsyncIOMotorClient(MAIN_PLATFORM_MONGO_URL)
        all_dbs = await main_client.list_database_names()

        result = {"mongo_url": MAIN_PLATFORM_MONGO_URL.split("@")[-1] if "@" in MAIN_PLATFORM_MONGO_URL else "localhost",
                  "configured_db": MAIN_PLATFORM_DB_NAME, "databases": {}}

        for db_name in all_dbs:
            if db_name in ["admin", "local", "config"]:
                continue
            try:
                test_db = main_client[db_name]
                cols = await test_db.list_collection_names()
                db_info = {"collections": cols}
                # Check camera-related collections
                for col in cols:
                    if "camera" in col.lower() or "brand" in col.lower():
                        count = await test_db[col].count_documents({})
                        sample = await test_db[col].find_one({}, {"_id": 0})
                        db_info[f"sample_{col}"] = {"count": count, "fields": list(sample.keys()) if sample else [], "sample": {k: str(v)[:50] for k, v in (sample or {}).items()}}
                result["databases"][db_name] = db_info
            except Exception as e:
                result["databases"][db_name] = {"error": str(e)}

        main_client.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
