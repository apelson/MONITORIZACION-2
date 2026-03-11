"""
Data Collector Service - Snapshots camera readings every 5 minutes
Stores historical data in MongoDB for trends, reports and analytics
"""
import asyncio
from datetime import datetime, timezone, timedelta
from config import camera_readings_collection, hourly_snapshots_collection, logger
from services.mobotix_service import fetch_all_cameras_counting

COLLECTION_INTERVAL = 300  # 5 minutes in seconds


async def collect_snapshot():
    """Take a snapshot of all camera readings and store in DB"""
    try:
        data = await fetch_all_cameras_counting()
        now = datetime.now(timezone.utc)
        ts = now.isoformat()
        date_str = now.strftime("%Y-%m-%d")
        hour = now.hour

        cameras = data.get("cameras", {})
        if not cameras:
            return

        # Per-camera readings
        readings = []
        brand_totals = {}
        for cam_id, cam_data in cameras.items():
            bid = cam_data.get("brand_id", "unknown")
            entries = cam_data.get("entries", 0)
            island = cam_data.get("island", "")
            status = cam_data.get("status", "unknown")

            readings.append({
                "camera_id": cam_id,
                "camera_name": cam_data.get("camera_name", ""),
                "brand_id": bid,
                "island": island,
                "entries": entries,
                "exits": cam_data.get("exits", 0),
                "status": status,
                "timestamp": ts,
                "date": date_str,
                "hour": hour
            })

            if bid not in brand_totals:
                brand_totals[bid] = {"entries": 0, "cameras_online": 0, "cameras_total": 0}
            brand_totals[bid]["entries"] += entries
            brand_totals[bid]["cameras_total"] += 1
            if status == "online":
                brand_totals[bid]["cameras_online"] += 1

        # Insert individual camera readings
        if readings:
            await camera_readings_collection.insert_many(readings)

        # Upsert hourly snapshot (aggregated per brand per hour)
        total_entries = sum(bt["entries"] for bt in brand_totals.values())
        total_online = sum(bt["cameras_online"] for bt in brand_totals.values())
        total_cameras = sum(bt["cameras_total"] for bt in brand_totals.values())

        await hourly_snapshots_collection.update_one(
            {"date": date_str, "hour": hour},
            {"$set": {
                "date": date_str,
                "hour": hour,
                "total_entries": total_entries,
                "cameras_online": total_online,
                "cameras_total": total_cameras,
                "brands": brand_totals,
                "last_updated": ts
            }},
            upsert=True
        )

        logger.info(f"Snapshot: {len(readings)} cameras, {total_entries} entries, {total_online}/{total_cameras} online")

    except Exception as e:
        logger.error(f"Data collector error: {e}")


async def cleanup_old_readings(days_to_keep=90):
    """Remove readings older than X days to manage storage"""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        cutoff_str = cutoff.strftime("%Y-%m-%d")
        result = await camera_readings_collection.delete_many({"date": {"$lt": cutoff_str}})
        if result.deleted_count > 0:
            logger.info(f"Cleaned up {result.deleted_count} old readings")
    except Exception as e:
        logger.error(f"Cleanup error: {e}")


async def ensure_indexes():
    """Create indexes for efficient querying"""
    await camera_readings_collection.create_index([("date", 1), ("hour", 1)])
    await camera_readings_collection.create_index([("camera_id", 1), ("date", 1)])
    await camera_readings_collection.create_index([("brand_id", 1), ("date", 1)])
    await hourly_snapshots_collection.create_index([("date", 1), ("hour", 1)], unique=True)
    logger.info("Database indexes ensured")


async def data_collector_loop():
    """Main loop - runs every 5 minutes"""
    await ensure_indexes()
    logger.info(f"Data collector started (interval: {COLLECTION_INTERVAL}s)")

    while True:
        await collect_snapshot()
        # Cleanup once a day (at ~3am)
        now = datetime.now(timezone.utc)
        if now.hour == 3 and now.minute < 6:
            await cleanup_old_readings()
        await asyncio.sleep(COLLECTION_INTERVAL)
