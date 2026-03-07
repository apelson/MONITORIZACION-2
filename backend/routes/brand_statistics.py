"""
Brand Statistics Routes - Vehicle brand visit ranking system
Processes camera counting data and associates with vehicle brands:
AUDI, VOLKSWAGEN, SKODA, HONDA, DUCATI, DAOCASION
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from config import db, devices_collection, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/brand-statistics", tags=["brand-statistics"])

# MongoDB collection for brand statistics
brand_statistics_collection = db["brand_statistics"]
brand_daily_collection = db["brand_daily_statistics"]

# Supported vehicle brands
VEHICLE_BRANDS = [
    {"id": "audi", "name": "AUDI", "color": "#BB0A1E"},
    {"id": "volkswagen", "name": "VOLKSWAGEN", "color": "#001E50"},
    {"id": "skoda", "name": "SKODA", "color": "#4BA82E"},
    {"id": "honda", "name": "HONDA", "color": "#CC0000"},
    {"id": "ducati", "name": "DUCATI", "color": "#D40000"},
    {"id": "daocasion", "name": "DAOCASION", "color": "#FF6B00"}
]


@router.get("/brands")
async def get_brands(current_user: dict = Depends(get_current_user)):
    """Get list of supported vehicle brands"""
    return {"brands": VEHICLE_BRANDS}


@router.get("/ranking")
async def get_brand_ranking(
    island: Optional[str] = Query(None, description="Filter by island: tenerife, gran-canaria, lanzarote, etc."),
    period: str = Query("week", description="Period: day, week, month, year"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get brand visit ranking, optionally filtered by island.
    Returns aggregated visit counts per brand sorted by total visits.
    """
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=7)
    
    # Build query
    query = {"timestamp": {"$gte": start_date.isoformat()}}
    if island:
        query["island"] = island
    
    # Aggregate by brand
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$brand_id",
            "total_visits": {"$sum": "$visit_count"},
            "entries": {"$sum": "$entries"},
            "exits": {"$sum": "$exits"},
            "cameras_count": {"$addToSet": "$camera_id"}
        }},
        {"$project": {
            "brand_id": "$_id",
            "total_visits": 1,
            "entries": 1,
            "exits": 1,
            "cameras_count": {"$size": "$cameras_count"},
            "_id": 0
        }},
        {"$sort": {"total_visits": -1}}
    ]
    
    results = await brand_statistics_collection.aggregate(pipeline).to_list(length=100)
    
    # Enrich with brand info
    ranking = []
    for r in results:
        brand_info = next((b for b in VEHICLE_BRANDS if b["id"] == r["brand_id"]), None)
        if brand_info:
            ranking.append({
                **r,
                "brand_name": brand_info["name"],
                "brand_color": brand_info["color"]
            })
    
    # If no data, return all brands with zero counts
    if not ranking:
        ranking = [
            {
                "brand_id": b["id"],
                "brand_name": b["name"],
                "brand_color": b["color"],
                "total_visits": 0,
                "entries": 0,
                "exits": 0,
                "cameras_count": 0
            }
            for b in VEHICLE_BRANDS
        ]
    
    return {
        "ranking": ranking,
        "period": period,
        "island": island,
        "start_date": start_date.isoformat(),
        "end_date": now.isoformat(),
        "total_brands": len(ranking)
    }


@router.get("/ranking-by-island")
async def get_ranking_by_island(
    period: str = Query("week", description="Period: day, week, month, year"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get brand ranking comparison across all islands.
    Returns a matrix of brand visits per island.
    """
    islands = [
        "tenerife", "gran-canaria", "lanzarote", 
        "fuerteventura", "la-palma", "la-gomera", "el-hierro"
    ]
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=7)
    
    # Build query
    query = {"timestamp": {"$gte": start_date.isoformat()}}
    
    # Aggregate by brand and island
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {"brand_id": "$brand_id", "island": "$island"},
            "total_visits": {"$sum": "$visit_count"}
        }},
        {"$project": {
            "brand_id": "$_id.brand_id",
            "island": "$_id.island",
            "total_visits": 1,
            "_id": 0
        }}
    ]
    
    results = await brand_statistics_collection.aggregate(pipeline).to_list(length=500)
    
    # Build matrix
    matrix = {}
    for brand in VEHICLE_BRANDS:
        matrix[brand["id"]] = {
            "brand_name": brand["name"],
            "brand_color": brand["color"],
            "islands": {island: 0 for island in islands},
            "total": 0
        }
    
    for r in results:
        brand_id = r.get("brand_id")
        island = r.get("island")
        if brand_id in matrix and island in matrix[brand_id]["islands"]:
            matrix[brand_id]["islands"][island] = r["total_visits"]
            matrix[brand_id]["total"] += r["total_visits"]
    
    return {
        "matrix": matrix,
        "islands": islands,
        "brands": VEHICLE_BRANDS,
        "period": period,
        "start_date": start_date.isoformat()
    }


@router.post("/record")
async def record_brand_visit(
    brand_id: str = Body(...),
    camera_id: str = Body(...),
    island: str = Body(...),
    entries: int = Body(default=0),
    exits: int = Body(default=0),
    current_user: dict = Depends(get_current_user)
):
    """
    Record a brand visit event from a camera.
    Can be called manually or by automated systems processing camera data.
    """
    if brand_id not in [b["id"] for b in VEHICLE_BRANDS]:
        raise HTTPException(status_code=400, detail=f"Invalid brand_id. Must be one of: {[b['id'] for b in VEHICLE_BRANDS]}")
    
    # Get camera info
    camera = await devices_collection.find_one({"id": camera_id}, {"_id": 0, "name": 1})
    
    record = {
        "id": str(uuid.uuid4()),
        "brand_id": brand_id,
        "camera_id": camera_id,
        "camera_name": camera.get("name") if camera else "Unknown",
        "island": island,
        "entries": entries,
        "exits": exits,
        "visit_count": entries + exits,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "recorded_by": current_user.get("username")
    }
    
    await brand_statistics_collection.insert_one(record)
    
    # Update daily aggregation
    await brand_daily_collection.update_one(
        {
            "brand_id": brand_id,
            "island": island,
            "date": record["date"]
        },
        {
            "$inc": {"entries": entries, "exits": exits, "total_visits": entries + exits},
            "$set": {"brand_name": next(b["name"] for b in VEHICLE_BRANDS if b["id"] == brand_id)}
        },
        upsert=True
    )
    
    return {
        "message": "Visit recorded successfully",
        "record_id": record["id"],
        "brand_id": brand_id,
        "visit_count": record["visit_count"]
    }


@router.get("/daily-trend/{brand_id}")
async def get_brand_daily_trend(
    brand_id: str,
    days: int = Query(30, ge=1, le=365),
    island: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get daily visit trend for a specific brand"""
    if brand_id not in [b["id"] for b in VEHICLE_BRANDS]:
        raise HTTPException(status_code=400, detail="Invalid brand_id")
    
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    query = {"brand_id": brand_id, "date": {"$gte": start_date}}
    if island:
        query["island"] = island
    
    records = await brand_daily_collection.find(
        query,
        {"_id": 0}
    ).sort("date", 1).to_list(length=days)
    
    brand_info = next((b for b in VEHICLE_BRANDS if b["id"] == brand_id), None)
    
    return {
        "brand_id": brand_id,
        "brand_name": brand_info["name"] if brand_info else brand_id,
        "brand_color": brand_info["color"] if brand_info else "#666666",
        "island": island,
        "days": days,
        "trend": records,
        "total_visits": sum(r.get("total_visits", 0) for r in records)
    }


@router.get("/summary")
async def get_statistics_summary(
    current_user: dict = Depends(get_current_user)
):
    """Get overall statistics summary"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Today's visits
    today_pipeline = [
        {"$match": {"date": today}},
        {"$group": {"_id": None, "total": {"$sum": "$total_visits"}}}
    ]
    today_result = await brand_daily_collection.aggregate(today_pipeline).to_list(1)
    today_visits = today_result[0]["total"] if today_result else 0
    
    # This week's visits
    week_pipeline = [
        {"$match": {"date": {"$gte": week_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_visits"}}}
    ]
    week_result = await brand_daily_collection.aggregate(week_pipeline).to_list(1)
    week_visits = week_result[0]["total"] if week_result else 0
    
    # This month's visits
    month_pipeline = [
        {"$match": {"date": {"$gte": month_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_visits"}}}
    ]
    month_result = await brand_daily_collection.aggregate(month_pipeline).to_list(1)
    month_visits = month_result[0]["total"] if month_result else 0
    
    # Top brand this week
    top_brand_pipeline = [
        {"$match": {"date": {"$gte": week_ago}}},
        {"$group": {"_id": "$brand_id", "total": {"$sum": "$total_visits"}}},
        {"$sort": {"total": -1}},
        {"$limit": 1}
    ]
    top_brand_result = await brand_daily_collection.aggregate(top_brand_pipeline).to_list(1)
    top_brand = None
    if top_brand_result:
        brand_info = next((b for b in VEHICLE_BRANDS if b["id"] == top_brand_result[0]["_id"]), None)
        if brand_info:
            top_brand = {
                "brand_id": brand_info["id"],
                "brand_name": brand_info["name"],
                "brand_color": brand_info["color"],
                "visits": top_brand_result[0]["total"]
            }
    
    return {
        "today_visits": today_visits,
        "week_visits": week_visits,
        "month_visits": month_visits,
        "top_brand_week": top_brand,
        "total_brands": len(VEHICLE_BRANDS),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


@router.delete("/clear-test-data")
async def clear_test_data(
    current_user: dict = Depends(get_current_user)
):
    """Clear all brand statistics data (admin only - for testing)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can clear data")
    
    stats_result = await brand_statistics_collection.delete_many({})
    daily_result = await brand_daily_collection.delete_many({})
    
    return {
        "message": "Test data cleared",
        "statistics_deleted": stats_result.deleted_count,
        "daily_deleted": daily_result.deleted_count
    }
