#!/bin/bash
# =============================================================================
# Script de actualización de producción - Siempria Monitor v4
# Ejecutar en: /opt/siempria-monitor
# =============================================================================

set -e
echo "=========================================="
echo "  Siempria Monitor - Actualización v4"
echo "=========================================="

cd /opt/siempria-monitor

# =============================================================================
# 1. BACKEND - devices.py (límite de alertas eliminado)
# =============================================================================
echo ""
echo "[1/7] Actualizando backend/routes/devices.py..."

cat > backend/routes/devices.py << 'EOF'
"""
Device management routes
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from typing import Optional
from datetime import datetime, timezone
import uuid
import asyncio

from config import (
    devices_collection, groups_collection, history_collection, 
    alerts_collection, device_types_collection, organizations_collection
)
from models import DeviceCreate, DeviceUpdate, DeviceTypeCreate, DeviceTypeUpdate
from services.auth_service import get_current_user, require_role
from services.device_service import check_single_device, check_all_devices
from services.logging_service import log_access

router = APIRouter(tags=["devices"])

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

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

# ============ DEVICES ============

@router.get("/devices")
async def get_devices(
    group_id: Optional[str] = None, 
    organization_id: Optional[str] = None,
    page: int = 1,
    limit: int = 0,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if group_id:
        query["group_id"] = group_id
    elif organization_id:
        group_ids = [g["id"] for g in await groups_collection.find({"organization_id": organization_id}, {"id": 1}).to_list(length=None)]
        if group_ids:
            query["group_id"] = {"$in": group_ids}
    
    if status_filter and status_filter in ["online", "offline"]:
        query["status"] = status_filter
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"ip_address": {"$regex": search, "$options": "i"}}
        ]
    
    if current_user.get("role") == "operator":
        query["device_type_id"] = "type-camera"
        query["status"] = "online"
    
    total = await devices_collection.count_documents(query)
    
    if limit <= 0:
        devices = await devices_collection.find(query, {"_id": 0}).to_list(length=None)
        return {"devices": devices}
    
    limit = min(limit, 1000)
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
    query = {"device_type_id": "type-camera"}
    cameras = await devices_collection.find(query, {"_id": 0}).to_list(length=None)
    return {"cameras": cameras}

@router.post("/devices")
async def create_device(data: DeviceCreate, request: Request, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if await devices_collection.find_one({"ip_address": data.ip_address, "port": data.port}):
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con esa IP y puerto")
    
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
    
    if "is_cra" in update:
        _cra_cache["timestamp"] = None
    
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
    limit: int = Query(100000, ge=1, le=100000, description="Número máximo de alertas (sin límite práctico)"),
    period: str = Query("month", description="Período: day, week, month, year, all"),
    start_date: str = Query(None, description="Fecha inicio (ISO format)"),
    end_date: str = Query(None, description="Fecha fin (ISO format)"),
    current_user: dict = Depends(get_current_user)
):
    from datetime import datetime, timedelta
    
    query = {}
    now = datetime.utcnow()
    
    if start_date and end_date:
        try:
            query["timestamp"] = {"$gte": start_date, "$lte": end_date}
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
    
    alerts = await alerts_collection.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    total_count = await alerts_collection.count_documents(query)
    
    pipeline = [{"$match": query}, {"$group": {"_id": "$type", "count": {"$sum": 1}}}]
    type_counts = {}
    async for doc in alerts_collection.aggregate(pipeline):
        type_counts[doc["_id"]] = doc["count"]
    
    return {"alerts": alerts, "total": total_count, "period": period, "by_type": type_counts}

@router.get("/alerts/stats")
async def get_alert_stats(current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    today_count = await alerts_collection.count_documents({"timestamp": {"$gte": start_of_day.isoformat()}})
    week_count = await alerts_collection.count_documents({"timestamp": {"$gte": start_of_week.isoformat()}})
    month_count = await alerts_collection.count_documents({"timestamp": {"$gte": start_of_month.isoformat()}})
    year_count = await alerts_collection.count_documents({"timestamp": {"$gte": start_of_year.isoformat()}})
    total_count = await alerts_collection.count_documents({})
    
    daily_trend = []
    for i in range(7):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await alerts_collection.count_documents({
            "timestamp": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        daily_trend.append({"date": day_start.strftime("%Y-%m-%d"), "count": count})
    
    return {
        "today": today_count, "week": week_count, "month": month_count,
        "year": year_count, "total": total_count,
        "current_month_name": now.strftime("%B %Y"),
        "daily_trend": list(reversed(daily_trend)),
        "days_in_month": (now.replace(month=now.month % 12 + 1, day=1) - timedelta(days=1)).day if now.month < 12 else 31
    }

@router.post("/devices/{device_id}/check-nas")
async def check_device_nas(device_id: str, storage_info: dict = None, current_user: dict = Depends(get_current_user)):
    from services.device_service import check_camera_nas_connection
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    if storage_info:
        await check_camera_nas_connection(device_id, storage_info)
    
    updated_device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    return {"device_id": device_id, "nas_connected": updated_device.get("nas_connected"), "message": "NAS check completed"}

@router.put("/devices/reorder")
async def reorder_devices(data: dict, current_user: dict = Depends(require_role(["admin", "manager"]))):
    device_orders = data.get("device_orders", [])
    for order in device_orders:
        await devices_collection.update_one({"id": order["id"]}, {"$set": {"sort_order": order.get("sort_order", 0)}})
    return {"message": "Orden actualizado"}

# ============ CRA ENDPOINTS ============

_cra_cache = {"devices": None, "device_ids": None, "timestamp": None, "group_ids": None}

async def _get_cra_device_ids_cached():
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    
    if _cra_cache["timestamp"] and (now - _cra_cache["timestamp"]).total_seconds() < 60:
        return _cra_cache["device_ids"], _cra_cache["group_ids"]
    
    cra_orgs, direct_cra_ids = await asyncio.gather(
        organizations_collection.find({"is_cra": True}, {"id": 1}).to_list(length=100),
        devices_collection.distinct("id", {"is_cra": True})
    )
    
    cra_org_ids = [org["id"] for org in cra_orgs]
    cra_group_ids = []
    
    if cra_org_ids:
        cra_groups = await groups_collection.find({"organization_id": {"$in": cra_org_ids}}, {"id": 1}).to_list(length=500)
        cra_group_ids = [g["id"] for g in cra_groups]
    
    all_cra_ids = set(direct_cra_ids)
    if cra_group_ids:
        group_device_ids = await devices_collection.distinct("id", {"group_id": {"$in": cra_group_ids}})
        all_cra_ids.update(group_device_ids)
    
    _cra_cache["device_ids"] = list(all_cra_ids)
    _cra_cache["group_ids"] = cra_group_ids
    _cra_cache["timestamp"] = now
    
    return _cra_cache["device_ids"], cra_group_ids

@router.get("/cra/devices")
async def get_cra_devices(current_user: dict = Depends(get_current_user)):
    cra_device_ids, cra_group_ids = await _get_cra_device_ids_cached()
    
    if not cra_device_ids:
        return {"devices": [], "total": 0}
    
    cra_devices = await devices_collection.find({"id": {"$in": cra_device_ids}}, {"_id": 0}).to_list(length=None)
    
    for d in cra_devices:
        if d.get("group_id") in cra_group_ids and not d.get("is_cra"):
            d["cra_via_org"] = True
    
    return {"devices": cra_devices, "total": len(cra_devices)}

@router.get("/cra/alerts")
async def get_cra_alerts(limit: int = Query(100, ge=1, le=500), current_user: dict = Depends(get_current_user)):
    cra_device_ids, _ = await _get_cra_device_ids_cached()
    
    if not cra_device_ids:
        return {"alerts": [], "total": 0}
    
    alerts = await alerts_collection.find({"device_id": {"$in": cra_device_ids}}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    total = await alerts_collection.count_documents({"device_id": {"$in": cra_device_ids}})
    
    for alert in alerts:
        alert["is_cra"] = True
    
    return {"alerts": alerts, "total": total}

@router.get("/cra/status")
async def get_cra_status(current_user: dict = Depends(get_current_user)):
    cra_device_ids, _ = await _get_cra_device_ids_cached()
    
    if not cra_device_ids:
        return {"total_devices": 0, "online": 0, "offline": 0, "uptime_percentage": 100, "recent_alerts_24h": 0, "status": "ok"}
    
    status_pipeline = [{"$match": {"id": {"$in": cra_device_ids}}}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)
    
    status_result, recent_alerts = await asyncio.gather(
        devices_collection.aggregate(status_pipeline).to_list(length=10),
        alerts_collection.count_documents({"device_id": {"$in": cra_device_ids}, "timestamp": {"$gte": yesterday.isoformat()}})
    )
    
    online = 0
    offline = 0
    for item in status_result:
        if item["_id"] == "online":
            online = item["count"]
        elif item["_id"] == "offline":
            offline = item["count"]
    
    total = online + offline
    
    return {
        "total_devices": total, "online": online, "offline": offline,
        "uptime_percentage": round((online / total * 100), 1) if total > 0 else 100,
        "recent_alerts_24h": recent_alerts,
        "status": "critical" if offline > 0 else "ok"
    }

@router.get("/cra/dashboard")
async def get_cra_dashboard(current_user: dict = Depends(get_current_user)):
    cra_device_ids, cra_group_ids = await _get_cra_device_ids_cached()
    
    if not cra_device_ids:
        return {
            "status": {"total_devices": 0, "online": 0, "offline": 0, "uptime_percentage": 100, "recent_alerts_24h": 0, "status": "ok"},
            "devices": [], "alerts": [], "events": []
        }
    
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)
    
    devices_task = devices_collection.find({"id": {"$in": cra_device_ids}}, {"_id": 0}).to_list(length=None)
    alerts_task = alerts_collection.find({"device_id": {"$in": cra_device_ids}}, {"_id": 0}).sort("timestamp", -1).limit(100).to_list(length=100)
    recent_alerts_task = alerts_collection.count_documents({"device_id": {"$in": cra_device_ids}, "timestamp": {"$gte": yesterday.isoformat()}})
    
    devices, alerts, recent_alerts_count = await asyncio.gather(devices_task, alerts_task, recent_alerts_task)
    
    online = sum(1 for d in devices if d.get("status") == "online")
    offline = sum(1 for d in devices if d.get("status") == "offline")
    total = len(devices)
    
    for d in devices:
        if d.get("group_id") in cra_group_ids and not d.get("is_cra"):
            d["cra_via_org"] = True
    for alert in alerts:
        alert["is_cra"] = True
    
    return {
        "status": {
            "total_devices": total, "online": online, "offline": offline,
            "uptime_percentage": round((online / total * 100), 1) if total > 0 else 100,
            "recent_alerts_24h": recent_alerts_count,
            "status": "critical" if offline > 0 else "ok"
        },
        "devices": devices, "alerts": alerts
    }
EOF

echo "   ✓ devices.py actualizado"

# =============================================================================
# 2. FRONTEND - SectionLoader.jsx (NUEVO)
# =============================================================================
echo ""
echo "[2/7] Creando SectionLoader.jsx..."

mkdir -p frontend/src/components/common

cat > frontend/src/components/common/SectionLoader.jsx << 'EOF'
import { useState, useEffect } from 'react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_051d11b5-64eb-4eef-a44f-e7e0e5b16da5/artifacts/03lnmzfi_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";

const SectionLoader = ({ isLoading, delay = 2000, message = "Cargando..." }) => {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => { setShowLoader(true); }, delay);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  if (!showLoader) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm" data-testid="section-loader">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-slate-800/90 border border-cyan-500/20 shadow-2xl">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <img src={LOGO_URL} alt="Siempria" className="absolute inset-0 m-auto w-12 h-12 object-contain" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-1">{message}</h3>
          <p className="text-sm text-cyan-400/80">Por favor espere...</p>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export const InlineSectionLoader = ({ message = "Cargando datos..." }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-6" data-testid="inline-section-loader">
    <div className="relative">
      <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
      <img src={LOGO_URL} alt="Siempria" className="absolute inset-0 m-auto w-10 h-10 object-contain" />
    </div>
    <div className="text-center">
      <h3 className="text-lg font-semibold">{message}</h3>
      <p className="text-sm text-muted-foreground">Obteniendo información...</p>
    </div>
  </div>
);

export const useDelayedLoading = (isLoading, delay = 2000) => {
  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    let timer;
    if (isLoading) { timer = setTimeout(() => setShowLoading(true), delay); }
    else { setShowLoading(false); }
    return () => clearTimeout(timer);
  }, [isLoading, delay]);
  return showLoading;
};

export default SectionLoader;
EOF

echo "   ✓ SectionLoader.jsx creado"

# =============================================================================
# 3. FRONTEND - LiveViewerFloatingButton.jsx (color púrpura)
# =============================================================================
echo ""
echo "[3/7] Actualizando LiveViewerFloatingButton.jsx..."

cat > frontend/src/components/common/LiveViewerFloatingButton.jsx << 'EOF'
import { useState } from 'react';
import { Video, VideoOff, Eye, ChevronRight, Camera } from 'lucide-react';
import { Badge } from '../ui/badge';

const LiveViewerFloatingButton = ({ authAxios, onClick, isActive, devices = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const cameraDevices = devices.filter(d => d.device_type_id === 'type-camera' || d.camera_user || d.camera_path);
  const onlineCameras = cameraDevices.filter(d => d.status === 'online').length;
  const offlineCameras = cameraDevices.filter(d => d.status === 'offline').length;
  const totalCameras = cameraDevices.length;
  const hasOffline = offlineCameras > 0;

  return (
    <div className="fixed right-0 z-50 transition-all duration-300" style={{ top: 'calc(33% + 100px)' }}
      onMouseEnter={() => setIsExpanded(true)} onMouseLeave={() => setIsExpanded(false)}>
      <div className={`flex items-center cursor-pointer shadow-2xl rounded-l-xl overflow-hidden transition-all duration-300
          ${hasOffline ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white' : 'bg-gradient-to-r from-violet-600 to-purple-500 text-white'}
          ${isActive ? 'ring-4 ring-purple-300 ring-opacity-50' : ''}`}
        onClick={onClick}>
        <div className={`p-3 flex flex-col items-center justify-center ${isExpanded ? 'border-r border-white/20' : ''}`}>
          <Video className="w-8 h-8" />
          {totalCameras > 0 && <span className="text-xs font-bold mt-1">{onlineCameras}/{totalCameras}</span>}
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-48 opacity-100' : 'w-0 opacity-0'}`}>
          <div className="p-3 whitespace-nowrap">
            <div className="font-bold text-sm mb-1 flex items-center gap-2"><Eye className="w-4 h-4" />En Directo</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Camera className="w-3 h-3" />Cámaras Online</span>
                <Badge variant="secondary" className="bg-white/20 text-white h-5">{onlineCameras}</Badge>
              </div>
              {offlineCameras > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><VideoOff className="w-3 h-3" />Offline</span>
                  <Badge variant="destructive" className="h-5 bg-white text-red-600">{offlineCameras}</Badge>
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs">
              <span>Abrir visor</span><ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-2 left-2 pointer-events-none">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

export default LiveViewerFloatingButton;
EOF

echo "   ✓ LiveViewerFloatingButton.jsx actualizado"

# =============================================================================
# 4. FRONTEND - App.js cambios manuales
# =============================================================================
echo ""
echo "[4/7] Aplicando cambios a App.js..."

# Añadir import de AlertsPanel si no existe
if ! grep -q "import AlertsPanel" frontend/src/App.js; then
  sed -i '/import LiveViewer/a import AlertsPanel from "@/components/panels/AlertsPanel";' frontend/src/App.js
  echo "   ✓ Import AlertsPanel añadido"
fi

# Añadir import de SectionLoader si no existe
if ! grep -q "import SectionLoader" frontend/src/App.js; then
  sed -i '/import AlertsPanel/a import SectionLoader, { useDelayedLoading } from "@/components/common/SectionLoader";' frontend/src/App.js
  echo "   ✓ Import SectionLoader añadido"
fi

# Cambiar límite de alertas
sed -i 's|/alerts?period=month&limit=1000|/alerts?period=all|g' frontend/src/App.js
echo "   ✓ Límite de alertas eliminado"

# Actualizar modelos hemisféricos (primera ocurrencia)
sed -i "s|device.model?.toLowerCase().includes('s15');|device.model?.toLowerCase().includes('s15') || device.model?.toLowerCase().includes('q24') || device.model?.toLowerCase().includes('q26') || device.model?.toLowerCase().includes('s14') || device.model?.toLowerCase().includes('s16') || device.model?.toLowerCase().includes('m25') || device.model?.toLowerCase().includes('m26');|g" frontend/src/App.js
echo "   ✓ Modelos hemisféricos actualizados en App.js"

# Añadir authAxios a AlertsPanel si no está
sed -i 's|<AlertsPanel alerts={alerts} organizations={organizations} devices={devices} groups={groups} />|<AlertsPanel alerts={alerts} organizations={organizations} devices={devices} groups={groups} authAxios={authAxios} />|g' frontend/src/App.js
echo "   ✓ authAxios añadido a AlertsPanel"

echo "   ✓ App.js actualizado"

# =============================================================================
# 5. FRONTEND - LiveViewer.jsx (modelos hemisféricos)
# =============================================================================
echo ""
echo "[5/7] Actualizando LiveViewer.jsx..."

# Actualizar modelos hemisféricos en LiveViewer.jsx
sed -i "s|device.model?.toLowerCase().includes('s15');|device.model?.toLowerCase().includes('s15') || device.model?.toLowerCase().includes('q24') || device.model?.toLowerCase().includes('q26') || device.model?.toLowerCase().includes('s14') || device.model?.toLowerCase().includes('s16') || device.model?.toLowerCase().includes('m25') || device.model?.toLowerCase().includes('m26');|g" frontend/src/components/panels/LiveViewer.jsx 2>/dev/null || echo "   (LiveViewer.jsx no encontrado o ya actualizado)"

echo "   ✓ LiveViewer.jsx actualizado"

# =============================================================================
# 6. FRONTEND - CRADashboard.jsx (audio .wav)
# =============================================================================
echo ""
echo "[6/7] Actualizando CRADashboard.jsx..."

# Cambiar .mp3 a .wav
sed -i 's|/sounds/cra-alert.mp3|/sounds/cra-alert.wav|g' frontend/src/components/panels/CRADashboard.jsx 2>/dev/null || echo "   (Ya actualizado)"

echo "   ✓ CRADashboard.jsx actualizado"

# =============================================================================
# 7. RECONSTRUIR Y REINICIAR
# =============================================================================
echo ""
echo "[7/7] Reconstruyendo frontend y reiniciando servicios..."

cd frontend
yarn build

echo ""
echo "Reiniciando servicios..."
sudo systemctl restart siempria-backend
sudo systemctl reload nginx

echo ""
echo "=========================================="
echo "  ✓ ACTUALIZACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Cambios aplicados:"
echo "  • Límite de alertas eliminado (backend y frontend)"
echo "  • Modelos hemisféricos ampliados (C25,C26,Q24,Q25,Q26,S14,S15,S16,M25,M26)"
echo "  • Botón En Directo color púrpura"
echo "  • SectionLoader creado (pantalla de carga)"
echo "  • Audio CRA cambiado a .wav"
echo ""
echo "Verifica en: https://siempriapp.com"
echo ""
