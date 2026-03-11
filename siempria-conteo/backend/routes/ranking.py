"""
Ranking routes for Siempria Conteo
Uses real-time camera data for all ranking views
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta

from config import (
    cameras_config_collection, brand_daily_collection,
    brand_hourly_collection, brands_collection, centers_collection,
    camera_readings_collection, hourly_snapshots_collection, logger
)
from services.auth_service import get_current_user
from services.mobotix_service import fetch_all_cameras_counting, fetch_all_cameras_trends

router = APIRouter(prefix="/ranking", tags=["ranking"])

DEFAULT_BRANDS = [
    {"id": "audi", "name": "AUDI", "color": "#BB0A1E"},
    {"id": "volkswagen", "name": "VOLKSWAGEN", "color": "#001E50"},
    {"id": "skoda", "name": "SKODA", "color": "#4BA82E"},
    {"id": "honda", "name": "HONDA", "color": "#CC0000"},
    {"id": "ducati", "name": "DUCATI", "color": "#D40000"},
    {"id": "daocasion", "name": "DAOCASION", "color": "#FF6B00"},
]

DEFAULT_CENTERS = [
    {"id": "tenerife", "name": "Tenerife", "island": "tenerife"},
    {"id": "gran-canaria", "name": "Gran Canaria", "island": "gran-canaria"},
    {"id": "lanzarote", "name": "Lanzarote", "island": "lanzarote"},
    {"id": "fuerteventura", "name": "Fuerteventura", "island": "fuerteventura"},
    {"id": "la-palma", "name": "La Palma", "island": "la-palma"},
]


async def get_brands():
    brands = await brands_collection.find({"active": True}, {"_id": 0}).to_list(100)
    if not brands:
        for b in DEFAULT_BRANDS:
            await brands_collection.update_one({"id": b["id"]}, {"$set": {**b, "active": True}}, upsert=True)
        brands = DEFAULT_BRANDS
    return brands


async def get_centers():
    centers = await centers_collection.find({"active": True}, {"_id": 0}).to_list(100)
    if not centers:
        for c in DEFAULT_CENTERS:
            await centers_collection.update_one({"id": c["id"]}, {"$set": {**c, "active": True}}, upsert=True)
        centers = DEFAULT_CENTERS
    return centers


async def get_realtime_data():
    """Shared function to get realtime camera data aggregated"""
    data = await fetch_all_cameras_counting()
    brands = await get_brands()
    centers = await get_centers()

    brand_totals = {}
    center_totals = {}

    for cam_id, cam_data in data.get("cameras", {}).items():
        bid = cam_data.get("brand_id")
        island = cam_data.get("island", "")
        entries = cam_data.get("entries", 0)

        if bid:
            if bid not in brand_totals:
                brand_info = next((b for b in brands if b["id"] == bid), {})
                brand_totals[bid] = {
                    "brand_id": bid,
                    "brand_name": brand_info.get("name", bid),
                    "brand_color": brand_info.get("color", "#666"),
                    "entries": 0,
                    "exits": 0,
                    "cameras": []
                }
            brand_totals[bid]["entries"] += entries
            brand_totals[bid]["exits"] += cam_data.get("exits", 0)
            brand_totals[bid]["cameras"].append({
                "camera_id": cam_id,
                "camera_name": cam_data.get("camera_name", ""),
                "entries": entries,
                "exits": cam_data.get("exits", 0),
                "status": cam_data.get("status", "offline"),
                "island": island
            })

            # Center totals (brand + island combo)
            center_key = f"{bid}_{island}"
            if center_key not in center_totals:
                island_info = next((c for c in centers if c.get("island") == island or c.get("id") == island), None)
                brand_info = next((b for b in brands if b["id"] == bid), {})
                center_totals[center_key] = {
                    "center_id": center_key,
                    "center_name": f"{brand_info.get('name', bid)} - {island_info['name'] if island_info else island.replace('-', ' ').title()}",
                    "brand_id": bid,
                    "brand_name": brand_info.get("name", bid),
                    "brand_color": brand_info.get("color", "#666"),
                    "island": island,
                    "island_name": island_info["name"] if island_info else island.replace("-", " ").title(),
                    "total_visits": 0
                }
            center_totals[center_key]["total_visits"] += entries

    return data, brand_totals, center_totals


def filter_by_permissions(brand_totals, center_totals, user):
    """Filter data based on user's allowed_brands and allowed_islands"""
    ab = user.get("allowed_brands") or []
    ai = user.get("allowed_islands") or []
    # Admin or empty lists = see everything
    if user.get("role") == "admin" and not ab and not ai:
        return brand_totals, center_totals
    filtered_brands = {}
    for bid, bdata in brand_totals.items():
        if ab and bid not in ab:
            continue
        if ai:
            filtered_cams = [c for c in bdata.get("cameras", []) if c.get("island") in ai]
            if not filtered_cams and bdata.get("cameras"):
                continue
            entries = sum(c.get("entries", 0) for c in filtered_cams) if filtered_cams else bdata["entries"]
            filtered_brands[bid] = {**bdata, "entries": entries, "cameras": filtered_cams}
        else:
            filtered_brands[bid] = bdata
    filtered_centers = {}
    for cid, cdata in center_totals.items():
        if ab and cdata.get("brand_id") not in ab:
            continue
        if ai and cdata.get("island") not in ai:
            continue
        filtered_centers[cid] = cdata
    return filtered_brands, filtered_centers


@router.get("/realtime")
async def get_realtime(current_user: dict = Depends(get_current_user)):
    """Get real-time counting data from all cameras"""
    try:
        data, brand_totals, center_totals = await get_realtime_data()
        brand_totals, _ = filter_by_permissions(brand_totals, center_totals, current_user)
        ranking = sorted(brand_totals.values(), key=lambda x: x["entries"], reverse=True)

        return {
            "ranking": ranking,
            "totals": {"entries": sum(b["entries"] for b in brand_totals.values())},
            "cameras_total": len(data.get("cameras", {})),
            "cameras_online": sum(1 for c in data.get("cameras", {}).values() if c.get("status") == "online"),
            "last_update": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting realtime: {e}")
        return {
            "ranking": [], "totals": {"entries": 0},
            "cameras_total": 0, "cameras_online": 0,
            "last_update": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }


@router.get("/by-brand")
async def get_ranking_by_brand(
    period: str = Query("day"),
    island: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get ranking by brand - uses realtime data"""
    try:
        data, brand_totals, center_totals = await get_realtime_data()
        brand_totals, _ = filter_by_permissions(brand_totals, center_totals, current_user)

        if island:
            filtered = {}
            for bid, bdata in brand_totals.items():
                island_entries = sum(c["entries"] for c in bdata["cameras"] if c.get("island") == island)
                if island_entries > 0:
                    filtered[bid] = {**bdata, "entries": island_entries}
            brand_totals = filtered

        ranking = sorted(
            [{"brand_id": b["brand_id"], "brand_name": b["brand_name"],
              "brand_color": b["brand_color"], "total_visits": int(b.get("entries", 0) or 0),
              "entries": int(b.get("entries", 0) or 0)}
             for b in brand_totals.values()],
            key=lambda x: x["total_visits"], reverse=True
        )

        return {"ranking": ranking, "period": period, "island": island, "total_brands": len(ranking)}
    except Exception as e:
        logger.error(f"Error in by-brand: {e}")
        return {"ranking": [], "period": period, "island": island, "total_brands": 0, "error": str(e)}


@router.get("/by-center")
async def get_ranking_by_center(
    period: str = Query("day"),
    current_user: dict = Depends(get_current_user)
):
    """Get ranking by center - uses realtime data"""
    try:
        _, brand_totals, center_totals = await get_realtime_data()
        _, center_totals = filter_by_permissions(brand_totals, center_totals, current_user)
        ranking = sorted(center_totals.values(), key=lambda x: x["total_visits"], reverse=True)
        return {"ranking": ranking, "period": period, "total_centers": len(ranking)}
    except Exception as e:
        logger.error(f"Error in by-center: {e}")
        return {"ranking": [], "period": period, "total_centers": 0, "error": str(e)}


@router.get("/by-island")
async def get_ranking_by_island(current_user: dict = Depends(get_current_user)):
    """Get statistics grouped by island - uses realtime data"""
    try:
        data, _, _ = await get_realtime_data()
        centers = await get_centers()
        ab = current_user.get("allowed_brands") or []
        ai = current_user.get("allowed_islands") or []
        is_admin_all = current_user.get("role") == "admin" and not ab and not ai
        islands = {}

        for cam_id, cam_data in data.get("cameras", {}).items():
            island = cam_data.get("island", "")
            bid = cam_data.get("brand_id", "")
            if not island:
                continue
            if not is_admin_all:
                if ab and bid not in ab:
                    continue
                if ai and island not in ai:
                    continue
            if island not in islands:
                island_info = next((c for c in centers if c.get("island") == island or c.get("id") == island), None)
                islands[island] = {
                    "total": 0,
                    "name": island_info["name"] if island_info else island.replace("-", " ").title()
                }
            islands[island]["total"] += cam_data.get("entries", 0)

        return {"islands": islands, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    except Exception as e:
        logger.error(f"Error in by-island: {e}")
        return {"islands": {}, "error": str(e)}


@router.get("/trends")
async def get_trends(current_user: dict = Depends(get_current_user)):
    """Get hourly/daily trend data for charts"""
    try:
        trends = await fetch_all_cameras_trends()
        return {
            "hourly_today": trends.get("hourly_today", []),
            "daily_week": trends.get("daily_week", []),
            "brand_hourly": trends.get("brand_hourly", {}),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        }
    except Exception as e:
        logger.error(f"Error getting trends: {e}")
        return {"hourly_today": [], "daily_week": [], "brand_hourly": {}, "error": str(e)}


@router.get("/summary")
async def get_summary(current_user: dict = Depends(get_current_user)):
    """Get overall statistics summary"""
    try:
        data, brand_totals, _ = await get_realtime_data()
        total_entries = sum(b["entries"] for b in brand_totals.values())
        cameras = await cameras_config_collection.find({"enabled": True}, {"_id": 0}).to_list(100)

        return {
            "today_visits": total_entries,
            "cameras_configured": len(cameras),
            "cameras_online": sum(1 for c in data.get("cameras", {}).values() if c.get("status") == "online"),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {"today_visits": 0, "cameras_configured": 0, "cameras_online": 0, "error": str(e)}


@router.get("/brands")
async def list_brands(current_user: dict = Depends(get_current_user)):
    brands = await get_brands()
    return {"brands": brands}


@router.get("/centers")
async def list_centers(current_user: dict = Depends(get_current_user)):
    centers = await get_centers()
    return {"centers": centers}



@router.get("/historical")
async def get_historical(
    days: int = Query(default=7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """Get historical data from stored snapshots"""
    try:
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=days)).strftime("%Y-%m-%d")
        today = now.strftime("%Y-%m-%d")
        yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")

        # Get hourly snapshots for the period
        snapshots = await hourly_snapshots_collection.find(
            {"date": {"$gte": start_date}},
            {"_id": 0}
        ).sort([("date", 1), ("hour", 1)]).to_list(5000)

        # Aggregate daily totals
        daily_totals = {}
        brand_daily = {}
        for snap in snapshots:
            d = snap["date"]
            entries = snap.get("total_entries", 0)
            if d not in daily_totals:
                daily_totals[d] = 0
            daily_totals[d] = max(daily_totals[d], entries)

            for bid, bdata in snap.get("brands", {}).items():
                if bid not in brand_daily:
                    brand_daily[bid] = {}
                if d not in brand_daily[bid]:
                    brand_daily[bid][d] = 0
                brand_daily[bid][d] = max(brand_daily[bid][d], bdata.get("entries", 0))

        # Today's hourly breakdown
        today_hourly = [s for s in snapshots if s["date"] == today]
        yesterday_hourly = [s for s in snapshots if s["date"] == yesterday]

        # Calculate yesterday's total for comparison
        yesterday_total = daily_totals.get(yesterday, 0)
        today_total = daily_totals.get(today, 0)

        # Build daily series
        daily_series = []
        cursor = now - timedelta(days=days)
        while cursor.strftime("%Y-%m-%d") <= today:
            d = cursor.strftime("%Y-%m-%d")
            day_name = cursor.strftime("%a")
            daily_series.append({
                "date": d,
                "day": day_name,
                "entries": daily_totals.get(d, 0)
            })
            cursor += timedelta(days=1)

        # Brand daily series
        brand_series = {}
        for bid, days_data in brand_daily.items():
            brand_series[bid] = [
                {"date": d, "entries": days_data.get(d, 0)}
                for d in sorted(days_data.keys())
            ]

        # Stats count
        readings_count = await camera_readings_collection.count_documents(
            {"date": {"$gte": start_date}}
        )

        return {
            "period_days": days,
            "today_total": today_total,
            "yesterday_total": yesterday_total,
            "trend_pct": round(((today_total - yesterday_total) / max(yesterday_total, 1)) * 100, 1) if yesterday_total > 0 else 0,
            "daily_series": daily_series,
            "today_hourly": [{"hour": s["hour"], "label": f"{s['hour']:02d}:00", "entries": s.get("total_entries", 0)} for s in today_hourly],
            "yesterday_hourly": [{"hour": s["hour"], "label": f"{s['hour']:02d}:00", "entries": s.get("total_entries", 0)} for s in yesterday_hourly],
            "brand_daily": brand_series,
            "readings_stored": readings_count,
            "last_snapshot": snapshots[-1].get("last_updated") if snapshots else None
        }
    except Exception as e:
        logger.error(f"Error getting historical: {e}")
        return {"error": str(e), "daily_series": [], "today_hourly": [], "yesterday_hourly": []}


@router.get("/collector-status")
async def collector_status(current_user: dict = Depends(get_current_user)):
    """Check data collector status"""
    try:
        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")

        total_readings = await camera_readings_collection.count_documents({})
        today_readings = await camera_readings_collection.count_documents({"date": today})
        last_reading = await camera_readings_collection.find_one(
            {}, {"_id": 0, "timestamp": 1}, sort=[("timestamp", -1)]
        )
        total_snapshots = await hourly_snapshots_collection.count_documents({})

        return {
            "active": True,
            "total_readings": total_readings,
            "today_readings": today_readings,
            "total_snapshots": total_snapshots,
            "last_reading": last_reading.get("timestamp") if last_reading else None,
            "interval_seconds": 300
        }
    except Exception as e:
        return {"active": False, "error": str(e)}
