"""
Ranking routes for Siempria Conteo
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta

from config import (
    cameras_config_collection, brand_daily_collection,
    brand_hourly_collection, brands_collection, centers_collection, logger
)
from services.auth_service import get_current_user
from services.mobotix_service import fetch_all_cameras_counting

router = APIRouter(prefix="/ranking", tags=["ranking"])

# Default brands
DEFAULT_BRANDS = [
    {"id": "audi", "name": "AUDI", "color": "#BB0A1E", "logo": "/assets/brands/audi.jpg"},
    {"id": "volkswagen", "name": "VOLKSWAGEN", "color": "#001E50", "logo": "/assets/brands/volkswagen.png"},
    {"id": "skoda", "name": "SKODA", "color": "#4BA82E", "logo": "/assets/brands/skoda.png"},
    {"id": "honda", "name": "HONDA", "color": "#CC0000", "logo": "/assets/brands/honda.png"},
    {"id": "ducati", "name": "DUCATI", "color": "#D40000", "logo": "/assets/brands/ducati.png"},
    {"id": "daocasion", "name": "DAOCASION", "color": "#FF6B00", "logo": "/assets/brands/daocasion.png"},
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


@router.get("/realtime")
async def get_realtime(current_user: dict = Depends(get_current_user)):
    """Get real-time counting data from all cameras"""
    try:
        data = await fetch_all_cameras_counting()
        brands = await get_brands()

        # Aggregate by brand
        brand_totals = {}
        for cam_id, cam_data in data.get("cameras", {}).items():
            bid = cam_data.get("brand_id")
            if bid:
                if bid not in brand_totals:
                    brand_info = next((b for b in brands if b["id"] == bid), {})
                    brand_totals[bid] = {
                        "brand_id": bid,
                        "brand_name": brand_info.get("name", bid),
                        "brand_color": brand_info.get("color", "#666"),
                        "brand_logo": brand_info.get("logo", ""),
                        "entries": 0,
                        "exits": 0,
                        "cameras": []
                    }
                brand_totals[bid]["entries"] += cam_data.get("entries", 0)
                brand_totals[bid]["exits"] += cam_data.get("exits", 0)
                brand_totals[bid]["cameras"].append({
                    "camera_id": cam_id,
                    "camera_name": cam_data.get("camera_name", ""),
                    "entries": cam_data.get("entries", 0),
                    "exits": cam_data.get("exits", 0),
                    "status": cam_data.get("status", "offline"),
                    "island": cam_data.get("island", "")
                })

        ranking = sorted(brand_totals.values(), key=lambda x: x["entries"], reverse=True)

        return {
            "ranking": ranking,
            "totals": data.get("totals", {"entries": 0, "exits": 0}),
            "cameras_total": len(data.get("cameras", {})),
            "cameras_online": sum(1 for c in data.get("cameras", {}).values() if c.get("status") == "online"),
            "last_update": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting realtime: {e}")
        return {
            "ranking": [],
            "totals": {"entries": 0, "exits": 0},
            "cameras_total": 0,
            "cameras_online": 0,
            "last_update": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }


@router.get("/by-center")
async def get_ranking_by_center(
    period: str = Query("day"),
    current_user: dict = Depends(get_current_user)
):
    """Get ranking aggregated by center (brand + island)"""
    brands = await get_brands()
    centers = await get_centers()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    pipeline = [
        {"$match": {"date": today}},
        {"$group": {
            "_id": {"brand_id": "$brand_id", "island": "$island"},
            "total_visits": {"$sum": "$visits"}
        }},
        {"$project": {"brand_id": "$_id.brand_id", "island": "$_id.island", "total_visits": 1, "_id": 0}},
        {"$sort": {"total_visits": -1}}
    ]

    results = await brand_daily_collection.aggregate(pipeline).to_list(100)

    ranking = []
    for r in results:
        brand_info = next((b for b in brands if b["id"] == r["brand_id"]), None)
        island_info = next((c for c in centers if c.get("island") == r["island"]), None)
        if brand_info:
            ranking.append({
                "center_id": f"{r['brand_id']}_{r['island']}",
                "center_name": f"{brand_info['name']} - {island_info['name'] if island_info else r['island'].replace('-', ' ').title()}",
                "brand_id": r["brand_id"],
                "brand_name": brand_info["name"],
                "brand_color": brand_info["color"],
                "brand_logo": brand_info.get("logo", ""),
                "island": r["island"],
                "island_name": island_info["name"] if island_info else r["island"].replace("-", " ").title(),
                "total_visits": r["total_visits"]
            })

    return {"ranking": ranking, "period": period, "total_centers": len(ranking)}


@router.get("/by-brand")
async def get_ranking_by_brand(
    period: str = Query("day"),
    island: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get ranking by brand"""
    brands = await get_brands()
    now = datetime.now(timezone.utc)

    if period == "day":
        start_date = now.strftime("%Y-%m-%d")
    elif period == "week":
        start_date = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    elif period == "month":
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    else:
        start_date = now.strftime("%Y-%m-%d")

    query = {"date": {"$gte": start_date}}
    if island:
        query["island"] = island

    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$brand_id",
            "total_visits": {"$sum": "$visits"}
        }},
        {"$project": {"brand_id": "$_id", "total_visits": 1, "_id": 0}},
        {"$sort": {"total_visits": -1}}
    ]

    results = await brand_daily_collection.aggregate(pipeline).to_list(100)

    ranking = []
    for r in results:
        brand_info = next((b for b in brands if b["id"] == r["brand_id"]), None)
        if brand_info:
            ranking.append({
                **r,
                "brand_name": brand_info["name"],
                "brand_color": brand_info["color"],
                "brand_logo": brand_info.get("logo", "")
            })

    if not ranking:
        ranking = [{
            "brand_id": b["id"],
            "brand_name": b["name"],
            "brand_color": b["color"],
            "brand_logo": b.get("logo", ""),
            "total_visits": 0
        } for b in brands]

    return {"ranking": ranking, "period": period, "island": island, "total_brands": len(ranking)}


@router.get("/summary")
async def get_summary(current_user: dict = Depends(get_current_user)):
    """Get overall statistics summary"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

    today_pipeline = [
        {"$match": {"date": today}},
        {"$group": {"_id": None, "total": {"$sum": "$visits"}}}
    ]
    today_result = await brand_daily_collection.aggregate(today_pipeline).to_list(1)
    today_visits = today_result[0]["total"] if today_result else 0

    week_pipeline = [
        {"$match": {"date": {"$gte": week_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$visits"}}}
    ]
    week_result = await brand_daily_collection.aggregate(week_pipeline).to_list(1)
    week_visits = week_result[0]["total"] if week_result else 0

    cameras = await cameras_config_collection.find({"enabled": True}, {"_id": 0}).to_list(100)

    return {
        "today_visits": today_visits,
        "week_visits": week_visits,
        "cameras_configured": len(cameras),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


@router.get("/brands")
async def list_brands(current_user: dict = Depends(get_current_user)):
    """Get all brands"""
    brands = await get_brands()
    return {"brands": brands}


@router.get("/centers")
async def list_centers(current_user: dict = Depends(get_current_user)):
    """Get all centers"""
    centers = await get_centers()
    return {"centers": centers}
