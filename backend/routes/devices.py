"""
Device management routes - OPTIMIZED FOR SCALE
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import asyncio
import time

from config import (
    devices_collection, groups_collection, history_collection, 
    alerts_collection, device_types_collection, organizations_collection
)
from models import DeviceCreate, DeviceUpdate, DeviceTypeCreate, DeviceTypeUpdate
from services.auth_service import get_current_user, require_role
from services.device_service import check_single_device, check_all_devices
from services.logging_service import log_access
from services.multitenancy_service import (
    build_device_filter, build_alert_filter, 
    should_filter_by_tenant, get_user_group_ids
)

router = APIRouter(tags=["devices"])

# ============ CACHE FOR PERFORMANCE ============
_stats_cache = {"data": None, "timestamp": 0, "ttl": 10}  # 10 second cache

async def get_cached_stats():
    """Get device stats with 10-second cache"""
    now = time.time()
    if _stats_cache["data"] and (now - _stats_cache["timestamp"]) < _stats_cache["ttl"]:
        return _stats_cache["data"]
    
    # Aggregate stats in one query
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    status_counts = {"online": 0, "offline": 0, "unknown": 0}
    async for doc in devices_collection.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]
    
    # Count CRA devices
    cra_count = await devices_collection.count_documents({"is_cra": True})
    
    stats = {
        "total": sum(status_counts.values()),
        "online": status_counts.get("online", 0),
        "offline": status_counts.get("offline", 0),
        "cra": cra_count
    }
    
    _stats_cache["data"] = stats
    _stats_cache["timestamp"] = now
    return stats

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# ============ OPTIMIZED STATS ENDPOINT ============

@router.get("/devices/stats")
async def get_device_stats(current_user: dict = Depends(get_current_user)):
    """Fast endpoint for header stats - uses cache for admin, filtered for others"""
    # For non-admin users, we need to filter
    if should_filter_by_tenant(current_user):
        device_filter = await build_device_filter(current_user)
        
        # If user has no access to any groups
        if device_filter.get("group_id", {}).get("$in") == []:
            return {"total": 0, "online": 0, "offline": 0, "cra": 0}
        
        # Aggregate stats for user's devices only
        total = await devices_collection.count_documents(device_filter)
        online = await devices_collection.count_documents({**device_filter, "status": "online"})
        offline = await devices_collection.count_documents({**device_filter, "status": "offline"})
        cra = await devices_collection.count_documents({**device_filter, "is_cra": True})
        
        return {"total": total, "online": online, "offline": offline, "cra": cra}
    
    # Admin uses cache
    return await get_cached_stats()

# ============ DEVICE TYPES ============

@router.get("/device-types")
async def get_device_types(current_user: dict = Depends(get_current_user)):
    return {"device_types": await device_types_collection.find({}, {"_id": 0}).to_list(length=None)}

@router.post("/device-types")
async def create_device_type(data: DeviceTypeCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    dt = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "icon": data.icon,
        "color": data.color or "#6b7280",
        "is_critical": data.is_critical or False,
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await device_types_collection.insert_one(dt)
    dt.pop("_id", None)
    return {"message": "Tipo creado", "device_type": dt}

@router.put("/device-types/{type_id}")
async def update_device_type(type_id: str, data: DeviceTypeUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if not await device_types_collection.find_one({"id": type_id}):
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await device_types_collection.update_one({"id": type_id}, {"$set": update})
    return {"message": "Tipo actualizado", "device_type": await device_types_collection.find_one({"id": type_id}, {"_id": 0})}

@router.delete("/device-types/{type_id}")
async def delete_device_type(type_id: str, current_user: dict = Depends(require_role(["admin", "manager"]))):
    dt = await device_types_collection.find_one({"id": type_id})
    if not dt:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    if dt.get("is_default"):
        raise HTTPException(status_code=400, detail="No se pueden eliminar tipos predeterminados")
    await device_types_collection.delete_one({"id": type_id})
    await devices_collection.update_many({"device_type_id": type_id}, {"$set": {"device_type_id": None}})
    return {"message": "Tipo eliminado"}

# ============ CRITICAL DEVICES ============

@router.get("/devices/critical-offline")
async def get_critical_offline_devices(current_user: dict = Depends(get_current_user)):
    """
    Get devices that are offline and belong to critical device types.
    Returns device info including name, IP, last_seen, and device type.
    """
    try:
        # First, get all critical device types
        critical_types = await device_types_collection.find(
            {"is_critical": True}, 
            {"_id": 0, "id": 1, "name": 1, "icon": 1, "color": 1}
        ).to_list(length=None)
        
        if not critical_types:
            return {"devices": [], "count": 0, "critical_types": []}
        
        critical_type_ids = [t["id"] for t in critical_types]
        
        # Get offline devices of those types
        devices = await devices_collection.find(
            {
                "status": "offline",
                "device_type_id": {"$in": critical_type_ids}
            },
            {
                "_id": 0,
                "id": 1,
                "name": 1,
                "ip_address": 1,
                "last_seen": 1,
                "device_type_id": 1,
                "group_id": 1
            }
        ).to_list(length=None)
        
        # Enrich devices with type info
        type_map = {t["id"]: t for t in critical_types}
        for device in devices:
            type_id = device.get("device_type_id")
            if type_id and type_id in type_map:
                device["device_type"] = type_map[type_id]
        
        return {
            "devices": devices,
            "count": len(devices),
            "critical_types": critical_types
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ DEVICES ============

@router.get("/devices")
async def get_devices(
    group_id: Optional[str] = None, 
    organization_id: Optional[str] = None,
    page: int = 1,
    limit: int = 0,  # 0 means no limit (return all)
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get devices with optional pagination and filtering
    - page: Page number (default 1)
    - limit: Items per page (0 = all, default 0 for backwards compatibility)
    - status_filter: Filter by status (online/offline)
    - search: Search by name or IP
    """
    query = {}
    if group_id:
        query["group_id"] = group_id
    elif organization_id:
        group_ids = [g["id"] for g in await groups_collection.find({"organization_id": organization_id}, {"id": 1}).to_list(length=None)]
        if group_ids:
            query["group_id"] = {"$in": group_ids}
    
    # Status filter
    if status_filter and status_filter in ["online", "offline"]:
        query["status"] = status_filter
    
    # Search filter
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"ip_address": {"$regex": search, "$options": "i"}}
        ]
    
    # Operators only see cameras that are online
    if current_user.get("role") == "operator":
        query["device_type_id"] = "type-camera"
        query["status"] = "online"
    
    # Get total count
    total = await devices_collection.count_documents(query)
    
    # If limit is 0 or not specified, return all devices (backwards compatible)
    if limit <= 0:
        devices = await devices_collection.find(query, {"_id": 0}).to_list(length=None)
        return {"devices": devices}
    
    # Otherwise, apply pagination
    limit = min(limit, 1000)  # Cap at 1000 max
    skip = (page - 1) * limit
    devices = await devices_collection.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "devices": devices,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@router.get("/cameras")
async def get_cameras(current_user: dict = Depends(get_current_user)):
    """Get all cameras (for operators view)"""
    query = {"device_type_id": "type-camera"}
    cameras = await devices_collection.find(query, {"_id": 0}).to_list(length=None)
    return {"cameras": cameras}

@router.post("/devices")
async def create_device(data: DeviceCreate, request: Request, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if await devices_collection.find_one({"ip_address": data.ip_address, "port": data.port}):
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con esa IP y puerto")
    
    # Build image_url from camera fields if provided
    image_url = data.image_url or ""
    protocol = data.camera_protocol or "http"
    if data.camera_user and data.camera_password and data.camera_path:
        image_url = f"{protocol}://{data.camera_user}:{data.camera_password}@{data.ip_address}:{data.port}{data.camera_path}"
    
    device = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "ip_address": data.ip_address,
        "port": data.port,
        "description": data.description or "",
        "group_id": data.group_id,
        "device_type_id": data.device_type_id,
        "brand": data.brand or "",
        "model": data.model or "",
        "location": data.location or "",
        "notes": data.notes or "",
        "image_url": image_url,
        "camera_protocol": protocol,
        "camera_user": data.camera_user or "",
        "camera_password": data.camera_password or "",
        "camera_path": data.camera_path or "",
        "has_statistics": data.has_statistics or False,
        "is_cra": data.is_cra or False,
        "status": "unknown",
        "last_check": None,
        "last_online": None,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await devices_collection.insert_one(device)
    device.pop("_id", None)
    
    # Log device creation
    await log_access(
        log_type="device_create",
        user_id=current_user["id"],
        username=current_user["username"],
        user_role=current_user["role"],
        ip_address=get_client_ip(request),
        target_type="device",
        target_id=device["id"],
        target_name=device["name"],
        details={"ip": data.ip_address, "port": data.port, "type": data.device_type_id}
    )
    
    return {"message": "Dispositivo creado", "device": device}

@router.get("/devices/{device_id}")
async def get_device(device_id: str, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return device

@router.put("/devices/{device_id}")
async def update_device(device_id: str, data: DeviceUpdate, request: Request, current_user: dict = Depends(require_role(["admin", "manager"]))):
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Invalidate CRA cache if is_cra field is updated
    if "is_cra" in update:
        _cra_cache["timestamp"] = None
    
    # Rebuild image_url if camera fields are updated
    camera_protocol = update.get("camera_protocol", device.get("camera_protocol", "http"))
    camera_user = update.get("camera_user", device.get("camera_user", ""))
    camera_password = update.get("camera_password", device.get("camera_password", ""))
    camera_path = update.get("camera_path", device.get("camera_path", ""))
    ip_address = update.get("ip_address", device.get("ip_address", ""))
    port = update.get("port", device.get("port", ""))
    
    if camera_user and camera_password and camera_path:
        update["image_url"] = f"{camera_protocol}://{camera_user}:{camera_password}@{ip_address}:{port}{camera_path}"
    
    if update:
        await devices_collection.update_one({"id": device_id}, {"$set": update})
    
    # Log device update
    await log_access(
        log_type="device_update",
        user_id=current_user["id"],
        username=current_user["username"],
        user_role=current_user["role"],
        ip_address=get_client_ip(request),
        target_type="device",
        target_id=device_id,
        target_name=device.get("name"),
        details={"updated_fields": list(update.keys())}
    )
    
    updated_device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    return {"message": "Dispositivo actualizado", "device": updated_device}

@router.delete("/devices/{device_id}")
async def delete_device(device_id: str, request: Request, current_user: dict = Depends(require_role(["admin", "manager"]))):
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    result = await devices_collection.delete_one({"id": device_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    await history_collection.delete_many({"device_id": device_id})
    
    # Log device deletion
    await log_access(
        log_type="device_delete",
        user_id=current_user["id"],
        username=current_user["username"],
        user_role=current_user["role"],
        ip_address=get_client_ip(request),
        target_type="device",
        target_id=device_id,
        target_name=device.get("name"),
        details={"ip": device.get("ip_address")}
    )
    
    return {"message": "Dispositivo eliminado"}

@router.post("/devices/{device_id}/check")
async def check_device_manual(device_id: str, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    await devices_collection.update_one({"id": device_id}, {"$set": {"status": "checking"}})
    result = await check_single_device(device_id, background_alert=False)
    return {"message": "Verificación completada", "result": result}

@router.post("/devices/check-all")
async def check_all_devices_endpoint(current_user: dict = Depends(get_current_user)):
    asyncio.create_task(check_all_devices())
    return {"message": "Verificación iniciada"}

# ============ HISTORY & ALERTS ============

@router.get("/devices/{device_id}/history")
async def get_device_history(device_id: str, limit: int = 100, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    history = await history_collection.find({"device_id": device_id}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    return {"device": device, "history": history}

@router.get("/alerts")
async def get_alerts(
    limit: int = Query(500, ge=1, le=10000, description="Número máximo de alertas"),
    period: str = Query("month", description="Período: day, week, month, year, all"),
    start_date: str = Query(None, description="Fecha inicio (ISO format)"),
    end_date: str = Query(None, description="Fecha fin (ISO format)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get alerts with flexible filtering:
    - period: day (hoy), week (esta semana), month (este mes), year (este año), all (todo)
    - start_date/end_date: rango personalizado
    """
    from datetime import datetime, timedelta
    
    query = {}
    now = datetime.utcnow()
    
    # Calculate date range based on period
    if start_date and end_date:
        # Custom date range
        try:
            query["timestamp"] = {
                "$gte": start_date,
                "$lte": end_date
            }
        except Exception:
            pass
    elif period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query["timestamp"] = {"$gte": start.isoformat()}
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        query["timestamp"] = {"$gte": start.isoformat()}
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query["timestamp"] = {"$gte": start.isoformat()}
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        query["timestamp"] = {"$gte": start.isoformat()}
    # period == "all" -> no filter
    
    alerts = await alerts_collection.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Get stats for the period
    total_count = await alerts_collection.count_documents(query)
    
    # Count by type
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ]
    type_counts = {}
    async for doc in alerts_collection.aggregate(pipeline):
        type_counts[doc["_id"]] = doc["count"]
    
    return {
        "alerts": alerts,
        "total": total_count,
        "period": period,
        "by_type": type_counts
    }

@router.get("/alerts/stats")
async def get_alert_stats(current_user: dict = Depends(get_current_user)):
    """
    Get alert statistics for dashboard:
    - Monthly count (resets on day 1)
    - Daily, weekly, yearly counts
    - Historical totals
    """
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    
    # Calculate date boundaries
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Count alerts for each period
    today_count = await alerts_collection.count_documents({"timestamp": {"$gte": start_of_day.isoformat()}})
    week_count = await alerts_collection.count_documents({"timestamp": {"$gte": start_of_week.isoformat()}})
    month_count = await alerts_collection.count_documents({"timestamp": {"$gte": start_of_month.isoformat()}})
    year_count = await alerts_collection.count_documents({"timestamp": {"$gte": start_of_year.isoformat()}})
    total_count = await alerts_collection.count_documents({})
    
    # Get last 7 days trend
    daily_trend = []
    for i in range(7):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await alerts_collection.count_documents({
            "timestamp": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        daily_trend.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count
        })
    
    return {
        "today": today_count,
        "week": week_count,
        "month": month_count,
        "year": year_count,
        "total": total_count,
        "current_month_name": now.strftime("%B %Y"),
        "daily_trend": list(reversed(daily_trend)),
        "days_in_month": (now.replace(month=now.month % 12 + 1, day=1) - timedelta(days=1)).day if now.month < 12 else 31
    }

@router.post("/devices/{device_id}/check-nas")
async def check_device_nas(device_id: str, storage_info: dict = None, current_user: dict = Depends(get_current_user)):
    """Check if device (camera) has lost NAS connection"""
    from services.device_service import check_camera_nas_connection
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # If storage info is provided, check NAS connection
    if storage_info:
        await check_camera_nas_connection(device_id, storage_info)
    
    # Return current NAS state
    updated_device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    return {
        "device_id": device_id,
        "nas_connected": updated_device.get("nas_connected"),
        "message": "NAS check completed"
    }

@router.put("/devices/reorder")
async def reorder_devices(data: dict, current_user: dict = Depends(require_role(["admin", "manager"]))):
    """Update device order (from drag and drop)"""
    device_orders = data.get("device_orders", [])
    for order in device_orders:
        await devices_collection.update_one(
            {"id": order["id"]},
            {"$set": {"sort_order": order.get("sort_order", 0)}}
        )
    return {"message": "Orden actualizado"}


# ============ CRA ENDPOINTS ============

# ============ CRA OPTIMIZED ENDPOINTS ============

# Cache for CRA device IDs (refreshed every 60 seconds)
_cra_cache = {"devices": None, "device_ids": None, "timestamp": None, "group_ids": None}

async def _get_cra_device_ids_cached():
    """Get CRA device IDs with caching to avoid repeated queries"""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    
    # Use cache if valid (60 seconds)
    if _cra_cache["timestamp"] and (now - _cra_cache["timestamp"]).total_seconds() < 60:
        return _cra_cache["device_ids"], _cra_cache["group_ids"]
    
    # Get CRA organizations and their group IDs in parallel
    cra_orgs, direct_cra_ids = await asyncio.gather(
        organizations_collection.find({"is_cra": True}, {"id": 1}).to_list(length=100),
        devices_collection.distinct("id", {"is_cra": True})
    )
    
    cra_org_ids = [org["id"] for org in cra_orgs]
    cra_group_ids = []
    
    if cra_org_ids:
        cra_groups = await groups_collection.find(
            {"organization_id": {"$in": cra_org_ids}}, {"id": 1}
        ).to_list(length=500)
        cra_group_ids = [g["id"] for g in cra_groups]
    
    # Get all CRA device IDs (direct + via group)
    all_cra_ids = set(direct_cra_ids)
    if cra_group_ids:
        group_device_ids = await devices_collection.distinct("id", {"group_id": {"$in": cra_group_ids}})
        all_cra_ids.update(group_device_ids)
    
    # Update cache
    _cra_cache["device_ids"] = list(all_cra_ids)
    _cra_cache["group_ids"] = cra_group_ids
    _cra_cache["timestamp"] = now
    
    return _cra_cache["device_ids"], cra_group_ids

@router.get("/cra/devices")
async def get_cra_devices(current_user: dict = Depends(get_current_user)):
    """Get all CRA (critical) devices - optimized with caching"""
    cra_device_ids, cra_group_ids = await _get_cra_device_ids_cached()
    
    if not cra_device_ids:
        return {"devices": [], "total": 0}
    
    # Single query to get all CRA devices
    cra_devices = await devices_collection.find(
        {"id": {"$in": cra_device_ids}},
        {"_id": 0}
    ).to_list(length=None)
    
    # Mark devices from CRA orgs
    for d in cra_devices:
        if d.get("group_id") in cra_group_ids and not d.get("is_cra"):
            d["cra_via_org"] = True
    
    return {"devices": cra_devices, "total": len(cra_devices)}

@router.get("/cra/alerts")
async def get_cra_alerts(
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user)
):
    """Get alerts for CRA devices only - optimized with pagination"""
    cra_device_ids, _ = await _get_cra_device_ids_cached()
    
    if not cra_device_ids:
        return {"alerts": [], "total": 0}
    
    # Get alerts with limit for performance
    alerts = await alerts_collection.find(
        {"device_id": {"$in": cra_device_ids}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Get total count separately (faster than fetching all)
    total = await alerts_collection.count_documents({"device_id": {"$in": cra_device_ids}})
    
    # Mark alerts as CRA
    for alert in alerts:
        alert["is_cra"] = True
    
    return {"alerts": alerts, "total": total}

@router.get("/cra/status")
async def get_cra_status(current_user: dict = Depends(get_current_user)):
    """Get CRA dashboard status summary - optimized with aggregation"""
    cra_device_ids, _ = await _get_cra_device_ids_cached()
    
    if not cra_device_ids:
        return {
            "total_devices": 0, "online": 0, "offline": 0,
            "uptime_percentage": 100, "recent_alerts_24h": 0, "status": "ok"
        }
    
    # Use aggregation for status counts (single query)
    status_pipeline = [
        {"$match": {"id": {"$in": cra_device_ids}}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    # Get alerts count for last 24h
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)
    
    # Run both queries in parallel
    status_result, recent_alerts = await asyncio.gather(
        devices_collection.aggregate(status_pipeline).to_list(length=10),
        alerts_collection.count_documents({
            "device_id": {"$in": cra_device_ids},
            "timestamp": {"$gte": yesterday.isoformat()}
        })
    )
    
    # Parse status counts
    online = 0
    offline = 0
    for item in status_result:
        if item["_id"] == "online":
            online = item["count"]
        elif item["_id"] == "offline":
            offline = item["count"]
    
    total = online + offline
    
    return {
        "total_devices": total,
        "online": online,
        "offline": offline,
        "uptime_percentage": round((online / total * 100), 1) if total > 0 else 100,
        "recent_alerts_24h": recent_alerts,
        "status": "critical" if offline > 0 else "ok"
    }

@router.get("/cra/dashboard")
async def get_cra_dashboard(current_user: dict = Depends(get_current_user)):
    """Combined CRA dashboard data - single endpoint for all CRA data"""
    cra_device_ids, cra_group_ids = await _get_cra_device_ids_cached()
    
    if not cra_device_ids:
        return {
            "status": {"total_devices": 0, "online": 0, "offline": 0, "uptime_percentage": 100, "recent_alerts_24h": 0, "status": "ok"},
            "devices": [],
            "alerts": [],
            "events": []
        }
    
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)
    
    # Run all queries in parallel for maximum performance
    devices_task = devices_collection.find({"id": {"$in": cra_device_ids}}, {"_id": 0}).to_list(length=None)
    alerts_task = alerts_collection.find(
        {"device_id": {"$in": cra_device_ids}}, {"_id": 0}
    ).sort("timestamp", -1).limit(100).to_list(length=100)
    recent_alerts_task = alerts_collection.count_documents({
        "device_id": {"$in": cra_device_ids},
        "timestamp": {"$gte": yesterday.isoformat()}
    })
    
    devices, alerts, recent_alerts_count = await asyncio.gather(
        devices_task, alerts_task, recent_alerts_task
    )
    
    # Calculate status
    online = sum(1 for d in devices if d.get("status") == "online")
    offline = sum(1 for d in devices if d.get("status") == "offline")
    total = len(devices)
    
    # Mark devices and alerts
    for d in devices:
        if d.get("group_id") in cra_group_ids and not d.get("is_cra"):
            d["cra_via_org"] = True
    for alert in alerts:
        alert["is_cra"] = True
    
    return {
        "status": {
            "total_devices": total,
            "online": online,
            "offline": offline,
            "uptime_percentage": round((online / total * 100), 1) if total > 0 else 100,
            "recent_alerts_24h": recent_alerts_count,
            "status": "critical" if offline > 0 else "ok"
        },
        "devices": devices,
        "alerts": alerts
    }

# ============ MAINTENANCE MODE ============

class MaintenanceRequest(BaseModel):
    duration_minutes: int = 60
    reason: Optional[str] = None

@router.get("/maintenance/devices")
async def get_maintenance_devices(current_user: dict = Depends(get_current_user)):
    """Get all devices currently in maintenance mode"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Find devices where maintenance_mode is True and maintenance_until > now
    devices = await devices_collection.find(
        {
            "maintenance_mode": True,
            "maintenance_until": {"$gt": now}
        },
        {"_id": 0}
    ).to_list(length=None)
    
    # Calculate remaining time for each device
    for device in devices:
        if device.get("maintenance_until"):
            maintenance_end = datetime.fromisoformat(device["maintenance_until"].replace("Z", "+00:00"))
            remaining = (maintenance_end - datetime.now(timezone.utc)).total_seconds()
            device["maintenance_remaining_minutes"] = max(0, int(remaining / 60))
    
    return {"devices": devices, "count": len(devices)}

@router.post("/devices/{device_id}/maintenance")
async def enable_maintenance_mode(
    device_id: str, 
    data: MaintenanceRequest,
    request: Request,
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """Enable maintenance mode for a device"""
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    now = datetime.now(timezone.utc)
    maintenance_until = now + timedelta(minutes=data.duration_minutes)
    
    update_data = {
        "maintenance_mode": True,
        "maintenance_until": maintenance_until.isoformat(),
        "maintenance_reason": data.reason or "",
        "maintenance_started_by": current_user["username"],
        "maintenance_started_at": now.isoformat()
    }
    
    await devices_collection.update_one({"id": device_id}, {"$set": update_data})
    
    # Log the action
    await log_access(
        log_type="maintenance_enabled",
        user_id=current_user["id"],
        username=current_user["username"],
        user_role=current_user["role"],
        ip_address=get_client_ip(request),
        target_type="device",
        target_id=device_id,
        target_name=device.get("name"),
        details={"duration_minutes": data.duration_minutes, "reason": data.reason}
    )
    
    return {
        "message": f"Modo mantenimiento activado por {data.duration_minutes} minutos",
        "maintenance_until": maintenance_until.isoformat(),
        "device_id": device_id
    }

@router.delete("/devices/{device_id}/maintenance")
async def disable_maintenance_mode(
    device_id: str,
    request: Request,
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """Disable maintenance mode for a device"""
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    update_data = {
        "maintenance_mode": False,
        "maintenance_until": None,
        "maintenance_reason": None,
        "maintenance_started_by": None,
        "maintenance_started_at": None
    }
    
    await devices_collection.update_one({"id": device_id}, {"$set": update_data})
    
    # Log the action
    await log_access(
        log_type="maintenance_disabled",
        user_id=current_user["id"],
        username=current_user["username"],
        user_role=current_user["role"],
        ip_address=get_client_ip(request),
        target_type="device",
        target_id=device_id,
        target_name=device.get("name"),
        details={}
    )
    
    return {"message": "Modo mantenimiento desactivado", "device_id": device_id}
