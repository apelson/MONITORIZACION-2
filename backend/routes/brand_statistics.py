"""
Brand Statistics Routes - Vehicle brand visit ranking system
Processes camera counting data and associates with vehicle brands:
AUDI, VOLKSWAGEN, SKODA, HONDA, DUCATI, DAOCASION

Only ENTRIES (visits) are tracked - exits are ignored.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import csv
import io

from config import db, devices_collection, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/brand-statistics", tags=["brand-statistics"])

# MongoDB collections
brand_statistics_collection = db["brand_statistics"]
brand_daily_collection = db["brand_daily_statistics"]
brand_hourly_collection = db["brand_hourly_statistics"]
brand_weekly_collection = db["brand_weekly_statistics"]
brands_collection = db["brands"]
centers_collection = db["centers"]

# Default vehicle brands (used to seed the database)
DEFAULT_BRANDS = [
    {"id": "audi", "name": "AUDI", "color": "#BB0A1E", "logo": "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/g8sy2ozg_Logo_audi.jpg", "active": True},
    {"id": "volkswagen", "name": "VOLKSWAGEN", "color": "#001E50", "logo": "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/d772iqi2_Volkswagen_logo_2019.svg.png", "active": True},
    {"id": "skoda", "name": "SKODA", "color": "#4BA82E", "logo": "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/vbhseao1_%C5%A0koda_nieuw.png", "active": True},
    {"id": "honda", "name": "HONDA", "color": "#CC0000", "logo": "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/syfdh3vw_Honda_Logo.svg.png", "active": True},
    {"id": "ducati", "name": "DUCATI", "color": "#D40000", "logo": "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/380b1h0d_Ducati_red_logo.PNG", "active": True},
    {"id": "daocasion", "name": "DAOCASION", "color": "#FF6B00", "logo": "https://customer-assets.emergentagent.com/job_56a630f4-4ecb-45b7-b12a-65eeb5453053/artifacts/58znr83b_dag_ocasion_color.png", "active": True},
    {"id": "ocasion-domingo-alonso", "name": "Ocasión Domingo Alonso", "color": "#1E5AA8", "logo": "https://customer-assets.emergentagent.com/job_56a630f4-4ecb-45b7-b12a-65eeb5453053/artifacts/2sliyeer_dag_ocasion_color.png", "active": True}
]

# Default centers/islands
DEFAULT_CENTERS = [
    {"id": "tenerife", "name": "Tenerife", "island": "tenerife", "active": True},
    {"id": "gran-canaria", "name": "Gran Canaria", "island": "gran-canaria", "active": True},
    {"id": "lanzarote", "name": "Lanzarote", "island": "lanzarote", "active": True},
    {"id": "fuerteventura", "name": "Fuerteventura", "island": "fuerteventura", "active": True},
    {"id": "la-palma", "name": "La Palma", "island": "la-palma", "active": True},
    {"id": "la-gomera", "name": "La Gomera", "island": "la-gomera", "active": True},
    {"id": "el-hierro", "name": "El Hierro", "island": "el-hierro", "active": True}
]


async def get_brands_from_db():
    """Get brands from database, seed if empty"""
    brands = await brands_collection.find({"active": True}, {"_id": 0}).to_list(length=100)
    if not brands:
        # Seed default brands
        for brand in DEFAULT_BRANDS:
            await brands_collection.update_one({"id": brand["id"]}, {"$set": brand}, upsert=True)
        brands = DEFAULT_BRANDS
    return brands


async def get_centers_from_db():
    """Get centers from database, seed if empty"""
    centers = await centers_collection.find({"active": True}, {"_id": 0}).to_list(length=100)
    if not centers:
        # Seed default centers
        for center in DEFAULT_CENTERS:
            await centers_collection.update_one({"id": center["id"]}, {"$set": center}, upsert=True)
        centers = DEFAULT_CENTERS
    return centers


# Legacy compatibility - for old code that uses VEHICLE_BRANDS
VEHICLE_BRANDS = DEFAULT_BRANDS


@router.get("/brands")
async def get_brands(current_user: dict = Depends(get_current_user)):
    """Get list of vehicle brands from database"""
    brands = await get_brands_from_db()
    return {"brands": brands}


@router.post("/brands")
async def create_brand(
    id: str = Body(...),
    name: str = Body(...),
    color: str = Body(default="#666666"),
    logo: str = Body(default=""),
    current_user: dict = Depends(get_current_user)
):
    """Create a new brand"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede gestionar marcas")
    
    existing = await brands_collection.find_one({"id": id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una marca con ese ID")
    
    brand = {
        "id": id,
        "name": name,
        "color": color,
        "logo": logo,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await brands_collection.insert_one(brand)
    return {"message": "Marca creada", "brand": {k: v for k, v in brand.items() if k != "_id"}}


@router.put("/brands/{brand_id}")
async def update_brand(
    brand_id: str,
    name: str = Body(None),
    color: str = Body(None),
    logo: str = Body(None),
    active: bool = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing brand"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede gestionar marcas")
    
    update_data = {}
    if name is not None: update_data["name"] = name
    if color is not None: update_data["color"] = color
    if logo is not None: update_data["logo"] = logo
    if active is not None: update_data["active"] = active
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await brands_collection.update_one({"id": brand_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    
    updated = await brands_collection.find_one({"id": brand_id}, {"_id": 0})
    return {"message": "Marca actualizada", "brand": updated}


@router.delete("/brands/{brand_id}")
async def delete_brand(
    brand_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a brand (soft delete - sets active=False)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede gestionar marcas")
    
    result = await brands_collection.update_one(
        {"id": brand_id}, 
        {"$set": {"active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    
    return {"message": "Marca eliminada", "brand_id": brand_id}


# ============== CENTERS/ISLANDS MANAGEMENT ==============

@router.get("/centers")
async def get_centers(current_user: dict = Depends(get_current_user)):
    """Get list of centers/islands from database"""
    centers = await get_centers_from_db()
    return {"centers": centers}


@router.post("/centers")
async def create_center(
    id: str = Body(...),
    name: str = Body(...),
    island: str = Body(None),
    address: str = Body(default=""),
    brand_id: str = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Create a new center/location"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede gestionar centros")
    
    existing = await centers_collection.find_one({"id": id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un centro con ese ID")
    
    center = {
        "id": id,
        "name": name,
        "island": island or id,
        "address": address,
        "brand_id": brand_id,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await centers_collection.insert_one(center)
    return {"message": "Centro creado", "center": {k: v for k, v in center.items() if k != "_id"}}


@router.put("/centers/{center_id}")
async def update_center(
    center_id: str,
    name: str = Body(None),
    island: str = Body(None),
    address: str = Body(None),
    brand_id: str = Body(None),
    active: bool = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing center"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede gestionar centros")
    
    update_data = {}
    if name is not None: update_data["name"] = name
    if island is not None: update_data["island"] = island
    if address is not None: update_data["address"] = address
    if brand_id is not None: update_data["brand_id"] = brand_id
    if active is not None: update_data["active"] = active
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await centers_collection.update_one({"id": center_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Centro no encontrado")
    
    updated = await centers_collection.find_one({"id": center_id}, {"_id": 0})
    return {"message": "Centro actualizado", "center": updated}


@router.delete("/centers/{center_id}")
async def delete_center(
    center_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a center (soft delete)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede gestionar centros")
    
    result = await centers_collection.update_one(
        {"id": center_id}, 
        {"$set": {"active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Centro no encontrado")
    
    return {"message": "Centro eliminado", "center_id": center_id}


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
                "brand_color": brand_info["color"],
                "brand_logo": brand_info.get("logo", "")
            })
    
    # If no data, return all brands with zero counts
    if not ranking:
        ranking = [
            {
                "brand_id": b["id"],
                "brand_name": b["name"],
                "brand_color": b["color"],
                "brand_logo": b.get("logo", ""),
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



# Store for real-time counting data (in-memory cache)
realtime_counting_cache = {
    "last_update": None,
    "cameras": {},
    "totals": {"entries": 0, "exits": 0}
}


@router.get("/realtime")
async def get_realtime_counting(
    current_user: dict = Depends(get_current_user)
):
    """
    Get real-time counting data from all configured cameras.
    This returns the latest cached data from the polling service.
    """
    return {
        "last_update": realtime_counting_cache.get("last_update"),
        "cameras": realtime_counting_cache.get("cameras", {}),
        "totals": realtime_counting_cache.get("totals", {"entries": 0, "exits": 0}),
        "brands": VEHICLE_BRANDS
    }


@router.post("/realtime/refresh")
async def refresh_realtime_counting(
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger a refresh of real-time counting data from all cameras.
    """
    from services.mobotix_counting_service import fetch_all_cameras_counting
    
    try:
        result = await fetch_all_cameras_counting()
        realtime_counting_cache["last_update"] = datetime.now(timezone.utc).isoformat()
        realtime_counting_cache["cameras"] = result.get("cameras", {})
        realtime_counting_cache["totals"] = result.get("totals", {"entries": 0, "exits": 0})
        
        return {
            "success": True,
            "message": "Real-time data refreshed",
            "last_update": realtime_counting_cache["last_update"],
            "cameras_count": len(realtime_counting_cache["cameras"])
        }
    except Exception as e:
        logger.error(f"Error refreshing real-time data: {e}")
        return {
            "success": False,
            "message": str(e),
            "last_update": realtime_counting_cache.get("last_update")
        }


@router.get("/cameras-config")
async def get_cameras_config(
    current_user: dict = Depends(get_current_user)
):
    """Get list of cameras configured for brand statistics counting"""
    cameras_config_collection = db["brand_cameras_config"]
    cameras = await cameras_config_collection.find({}, {"_id": 0}).to_list(length=100)
    return {"cameras": cameras, "total": len(cameras)}


@router.post("/cameras-config")
async def add_camera_config(
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
    """Add a camera configuration for brand statistics counting"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can configure cameras")
    
    if brand_id not in [b["id"] for b in VEHICLE_BRANDS]:
        raise HTTPException(status_code=400, detail=f"Invalid brand_id")
    
    cameras_config_collection = db["brand_cameras_config"]
    
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("username")
    }
    
    # Upsert by camera_id
    await cameras_config_collection.update_one(
        {"camera_id": camera_id},
        {"$set": config},
        upsert=True
    )
    
    return {"message": "Camera configuration saved", "camera_id": camera_id}


@router.delete("/cameras-config/{camera_id}")
async def delete_camera_config(
    camera_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a camera configuration"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can configure cameras")
    
    cameras_config_collection = db["brand_cameras_config"]
    result = await cameras_config_collection.delete_one({"camera_id": camera_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    return {"message": "Camera configuration deleted", "camera_id": camera_id}



# ==================== HISTORICAL DATA ENDPOINTS ====================

@router.post("/store-snapshot")
async def store_counting_snapshot(
    current_user: dict = Depends(get_current_user)
):
    """
    Store current counting data as a historical snapshot.
    Should be called periodically (e.g., every hour) to build history.
    Only stores ENTRIES (visits).
    """
    from services.mobotix_counting_service import fetch_all_cameras_counting
    
    try:
        data = await fetch_all_cameras_counting()
        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        hour = now.strftime("%H:00")
        week_num = now.isocalendar()[1]
        year = now.year
        
        stored_count = 0
        
        for cam_id, cam_data in data.get("cameras", {}).items():
            if cam_data.get("status") != "online":
                continue
            
            brand_id = cam_data.get("brand_id")
            island = cam_data.get("island")
            visits = cam_data.get("entries", 0)  # Solo entradas
            
            if not brand_id:
                continue
            
            # Store hourly snapshot
            await brand_hourly_collection.update_one(
                {
                    "brand_id": brand_id,
                    "island": island,
                    "date": today,
                    "hour": hour
                },
                {
                    "$set": {
                        "visits": visits,
                        "camera_id": cam_id,
                        "camera_name": cam_data.get("camera_name"),
                        "updated_at": now.isoformat()
                    }
                },
                upsert=True
            )
            
            # Update daily aggregate
            await brand_daily_collection.update_one(
                {
                    "brand_id": brand_id,
                    "island": island,
                    "date": today
                },
                {
                    "$set": {
                        "visits": visits,
                        "brand_name": next((b["name"] for b in VEHICLE_BRANDS if b["id"] == brand_id), brand_id),
                        "updated_at": now.isoformat()
                    }
                },
                upsert=True
            )
            
            # Update weekly aggregate
            await brand_weekly_collection.update_one(
                {
                    "brand_id": brand_id,
                    "island": island,
                    "year": year,
                    "week": week_num
                },
                {
                    "$set": {
                        "visits": visits,
                        "brand_name": next((b["name"] for b in VEHICLE_BRANDS if b["id"] == brand_id), brand_id),
                        "updated_at": now.isoformat()
                    }
                },
                upsert=True
            )
            
            stored_count += 1
        
        return {
            "success": True,
            "message": f"Stored snapshot for {stored_count} cameras",
            "timestamp": now.isoformat(),
            "date": today,
            "hour": hour
        }
    except Exception as e:
        logger.error(f"Error storing snapshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/daily")
async def get_daily_history(
    brand_id: Optional[str] = None,
    island: Optional[str] = None,
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get daily historical data for visits (entries only)"""
    if not start_date:
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": start_date, "$lte": end_date}}
    if brand_id:
        query["brand_id"] = brand_id
    if island:
        query["island"] = island
    
    records = await brand_daily_collection.find(
        query,
        {"_id": 0}
    ).sort("date", 1).to_list(length=1000)
    
    return {
        "data": records,
        "start_date": start_date,
        "end_date": end_date,
        "total_records": len(records)
    }


@router.get("/history/weekly")
async def get_weekly_history(
    brand_id: Optional[str] = None,
    island: Optional[str] = None,
    year: Optional[int] = None,
    weeks: int = Query(12, ge=1, le=52),
    current_user: dict = Depends(get_current_user)
):
    """Get weekly historical data for visits"""
    now = datetime.now(timezone.utc)
    current_year = year or now.year
    current_week = now.isocalendar()[1]
    
    query = {"year": current_year}
    if brand_id:
        query["brand_id"] = brand_id
    if island:
        query["island"] = island
    
    records = await brand_weekly_collection.find(
        query,
        {"_id": 0}
    ).sort([("year", -1), ("week", -1)]).to_list(length=weeks * 10)
    
    return {
        "data": records,
        "year": current_year,
        "current_week": current_week,
        "total_records": len(records)
    }


@router.get("/history/compare")
async def compare_periods(
    brand_id: str,
    period1_start: str = Query(..., description="YYYY-MM-DD"),
    period1_end: str = Query(..., description="YYYY-MM-DD"),
    period2_start: str = Query(..., description="YYYY-MM-DD"),
    period2_end: str = Query(..., description="YYYY-MM-DD"),
    island: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Compare visits between two periods"""
    query1 = {
        "brand_id": brand_id,
        "date": {"$gte": period1_start, "$lte": period1_end}
    }
    query2 = {
        "brand_id": brand_id,
        "date": {"$gte": period2_start, "$lte": period2_end}
    }
    
    if island:
        query1["island"] = island
        query2["island"] = island
    
    # Get period 1 data
    period1_data = await brand_daily_collection.find(query1, {"_id": 0}).to_list(length=1000)
    period1_total = sum(r.get("visits", 0) for r in period1_data)
    
    # Get period 2 data
    period2_data = await brand_daily_collection.find(query2, {"_id": 0}).to_list(length=1000)
    period2_total = sum(r.get("visits", 0) for r in period2_data)
    
    # Calculate change
    change = period2_total - period1_total
    change_percent = ((period2_total - period1_total) / period1_total * 100) if period1_total > 0 else 0
    
    brand_info = next((b for b in VEHICLE_BRANDS if b["id"] == brand_id), None)
    
    return {
        "brand_id": brand_id,
        "brand_name": brand_info["name"] if brand_info else brand_id,
        "island": island,
        "period1": {
            "start": period1_start,
            "end": period1_end,
            "total_visits": period1_total,
            "days": len(period1_data)
        },
        "period2": {
            "start": period2_start,
            "end": period2_end,
            "total_visits": period2_total,
            "days": len(period2_data)
        },
        "comparison": {
            "change": change,
            "change_percent": round(change_percent, 2),
            "trend": "up" if change > 0 else "down" if change < 0 else "stable"
        }
    }


@router.get("/history/year-over-year")
async def year_over_year_comparison(
    brand_id: Optional[str] = None,
    island: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Compare current year vs previous year"""
    now = datetime.now(timezone.utc)
    current_year = now.year
    previous_year = current_year - 1
    
    query_current = {"year": current_year}
    query_previous = {"year": previous_year}
    
    if brand_id:
        query_current["brand_id"] = brand_id
        query_previous["brand_id"] = brand_id
    if island:
        query_current["island"] = island
        query_previous["island"] = island
    
    # Aggregate by brand for current year
    pipeline_current = [
        {"$match": query_current},
        {"$group": {
            "_id": "$brand_id",
            "total_visits": {"$sum": "$visits"}
        }}
    ]
    
    pipeline_previous = [
        {"$match": query_previous},
        {"$group": {
            "_id": "$brand_id",
            "total_visits": {"$sum": "$visits"}
        }}
    ]
    
    current_data = await brand_weekly_collection.aggregate(pipeline_current).to_list(100)
    previous_data = await brand_weekly_collection.aggregate(pipeline_previous).to_list(100)
    
    # Build comparison
    comparison = []
    for brand in VEHICLE_BRANDS:
        current_visits = next((d["total_visits"] for d in current_data if d["_id"] == brand["id"]), 0)
        previous_visits = next((d["total_visits"] for d in previous_data if d["_id"] == brand["id"]), 0)
        
        change = current_visits - previous_visits
        change_percent = ((current_visits - previous_visits) / previous_visits * 100) if previous_visits > 0 else 0
        
        comparison.append({
            "brand_id": brand["id"],
            "brand_name": brand["name"],
            "brand_color": brand["color"],
            "current_year": current_year,
            "current_visits": current_visits,
            "previous_year": previous_year,
            "previous_visits": previous_visits,
            "change": change,
            "change_percent": round(change_percent, 2),
            "trend": "up" if change > 0 else "down" if change < 0 else "stable"
        })
    
    return {
        "current_year": current_year,
        "previous_year": previous_year,
        "island": island,
        "comparison": comparison
    }


# ==================== EXPORT ENDPOINTS ====================

@router.get("/export/csv")
async def export_csv(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    brand_id: Optional[str] = None,
    island: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export historical data to CSV"""
    query = {"date": {"$gte": start_date, "$lte": end_date}}
    if brand_id:
        query["brand_id"] = brand_id
    if island:
        query["island"] = island
    
    records = await brand_daily_collection.find(
        query,
        {"_id": 0}
    ).sort("date", 1).to_list(length=10000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Fecha", "Marca", "Isla", "Visitas", "Actualizado"])
    
    # Data rows
    for record in records:
        brand_info = next((b for b in VEHICLE_BRANDS if b["id"] == record.get("brand_id")), None)
        writer.writerow([
            record.get("date", ""),
            brand_info["name"] if brand_info else record.get("brand_id", ""),
            record.get("island", ""),
            record.get("visits", 0),
            record.get("updated_at", "")
        ])
    
    output.seek(0)
    
    filename = f"visitas_{start_date}_{end_date}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/summary")
async def export_summary(
    year: int = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Export annual summary by brand"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    # Aggregate by brand and month
    pipeline = [
        {"$match": {"date": {"$regex": f"^{year}"}}},
        {"$addFields": {
            "month": {"$substr": ["$date", 5, 2]}
        }},
        {"$group": {
            "_id": {"brand_id": "$brand_id", "month": "$month"},
            "total_visits": {"$sum": "$visits"}
        }},
        {"$sort": {"_id.brand_id": 1, "_id.month": 1}}
    ]
    
    results = await brand_daily_collection.aggregate(pipeline).to_list(200)
    
    # Build summary by brand
    summary = {}
    for brand in VEHICLE_BRANDS:
        summary[brand["id"]] = {
            "brand_name": brand["name"],
            "brand_color": brand["color"],
            "months": {str(m).zfill(2): 0 for m in range(1, 13)},
            "total": 0
        }
    
    for r in results:
        brand_id = r["_id"]["brand_id"]
        month = r["_id"]["month"]
        visits = r["total_visits"]
        
        if brand_id in summary:
            summary[brand_id]["months"][month] = visits
            summary[brand_id]["total"] += visits
    
    return {
        "year": year,
        "summary": summary,
        "brands": VEHICLE_BRANDS
    }



@router.get("/history/compare-months")
async def compare_months(
    month1: int = Query(..., ge=1, le=12, description="Month 1 (1-12)"),
    year1: int = Query(..., description="Year 1"),
    month2: int = Query(..., ge=1, le=12, description="Month 2 (1-12)"),
    year2: int = Query(..., description="Year 2"),
    brand_id: Optional[str] = None,
    island: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Compare visits between two specific months (e.g., March 2025 vs March 2026)
    """
    # Build date patterns
    month1_pattern = f"{year1}-{str(month1).zfill(2)}"
    month2_pattern = f"{year2}-{str(month2).zfill(2)}"
    
    query1 = {"date": {"$regex": f"^{month1_pattern}"}}
    query2 = {"date": {"$regex": f"^{month2_pattern}"}}
    
    if brand_id:
        query1["brand_id"] = brand_id
        query2["brand_id"] = brand_id
    if island:
        query1["island"] = island
        query2["island"] = island
    
    # Get data for both months
    month1_data = await brand_daily_collection.find(query1, {"_id": 0}).to_list(length=500)
    month2_data = await brand_daily_collection.find(query2, {"_id": 0}).to_list(length=500)
    
    # Aggregate by brand
    month1_by_brand = {}
    month2_by_brand = {}
    
    for record in month1_data:
        bid = record.get("brand_id")
        if bid:
            month1_by_brand[bid] = month1_by_brand.get(bid, 0) + (record.get("visits", 0) or 0)
    
    for record in month2_data:
        bid = record.get("brand_id")
        if bid:
            month2_by_brand[bid] = month2_by_brand.get(bid, 0) + (record.get("visits", 0) or 0)
    
    # Build comparison
    comparison = []
    month_names = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                   "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    
    for brand in VEHICLE_BRANDS:
        visits1 = month1_by_brand.get(brand["id"], 0)
        visits2 = month2_by_brand.get(brand["id"], 0)
        change = visits2 - visits1
        change_percent = ((visits2 - visits1) / visits1 * 100) if visits1 > 0 else 0
        
        comparison.append({
            "brand_id": brand["id"],
            "brand_name": brand["name"],
            "brand_color": brand["color"],
            "brand_logo": brand.get("logo", ""),
            "month1_visits": visits1,
            "month2_visits": visits2,
            "change": change,
            "change_percent": round(change_percent, 2),
            "trend": "up" if change > 0 else "down" if change < 0 else "stable"
        })
    
    return {
        "period1": {
            "month": month1,
            "month_name": month_names[month1],
            "year": year1,
            "total": sum(month1_by_brand.values())
        },
        "period2": {
            "month": month2,
            "month_name": month_names[month2],
            "year": year2,
            "total": sum(month2_by_brand.values())
        },
        "island": island,
        "comparison": comparison
    }


@router.get("/history/compare-weeks")
async def compare_weeks(
    week1: int = Query(..., ge=1, le=53, description="Week number 1"),
    year1: int = Query(..., description="Year 1"),
    week2: int = Query(..., ge=1, le=53, description="Week number 2"),
    year2: int = Query(..., description="Year 2"),
    brand_id: Optional[str] = None,
    island: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Compare visits between two specific weeks (e.g., Week 10 2025 vs Week 10 2026)
    """
    query1 = {"year": year1, "week": week1}
    query2 = {"year": year2, "week": week2}
    
    if brand_id:
        query1["brand_id"] = brand_id
        query2["brand_id"] = brand_id
    if island:
        query1["island"] = island
        query2["island"] = island
    
    # Get data for both weeks
    week1_data = await brand_weekly_collection.find(query1, {"_id": 0}).to_list(length=100)
    week2_data = await brand_weekly_collection.find(query2, {"_id": 0}).to_list(length=100)
    
    # Aggregate by brand
    week1_by_brand = {r.get("brand_id"): r.get("visits", 0) for r in week1_data}
    week2_by_brand = {r.get("brand_id"): r.get("visits", 0) for r in week2_data}
    
    # Build comparison
    comparison = []
    for brand in VEHICLE_BRANDS:
        visits1 = week1_by_brand.get(brand["id"], 0)
        visits2 = week2_by_brand.get(brand["id"], 0)
        change = visits2 - visits1
        change_percent = ((visits2 - visits1) / visits1 * 100) if visits1 > 0 else 0
        
        comparison.append({
            "brand_id": brand["id"],
            "brand_name": brand["name"],
            "brand_color": brand["color"],
            "brand_logo": brand.get("logo", ""),
            "week1_visits": visits1,
            "week2_visits": visits2,
            "change": change,
            "change_percent": round(change_percent, 2),
            "trend": "up" if change > 0 else "down" if change < 0 else "stable"
        })
    
    return {
        "period1": {
            "week": week1,
            "year": year1,
            "total": sum(week1_by_brand.values())
        },
        "period2": {
            "week": week2,
            "year": year2,
            "total": sum(week2_by_brand.values())
        },
        "island": island,
        "comparison": comparison
    }


@router.get("/history/by-island")
async def get_history_by_island(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    brand_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get historical data grouped by island for comparison
    """
    query = {"date": {"$gte": start_date, "$lte": end_date}}
    if brand_id:
        query["brand_id"] = brand_id
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {"island": "$island", "brand_id": "$brand_id"},
            "total_visits": {"$sum": "$visits"},
            "days_count": {"$sum": 1}
        }},
        {"$sort": {"total_visits": -1}}
    ]
    
    results = await brand_daily_collection.aggregate(pipeline).to_list(length=500)
    
    # Organize by island
    islands_data = {}
    islands = ["tenerife", "gran-canaria", "lanzarote", "fuerteventura", "la-palma", "la-gomera", "el-hierro"]
    
    for island in islands:
        islands_data[island] = {
            "total": 0,
            "brands": {}
        }
    
    for r in results:
        island = r["_id"].get("island")
        brand_id = r["_id"].get("brand_id")
        
        if island and island in islands_data:
            islands_data[island]["total"] += r["total_visits"]
            islands_data[island]["brands"][brand_id] = r["total_visits"]
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "islands": islands_data,
        "brands": VEHICLE_BRANDS
    }
