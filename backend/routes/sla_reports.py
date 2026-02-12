"""
SLA Report Routes
Endpoints for generating SLA PDF reports
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import io
import logging

from config import get_db
from routes.devices import get_current_user
from services.sla_report_service import sla_report_generator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sla-reports", tags=["SLA Reports"])


@router.get("/generate")
async def generate_sla_report(
    organization_id: Optional[str] = Query(None, description="Filter by organization"),
    period: str = Query("month", description="Period: week, month, quarter"),
    sla_target: float = Query(99.9, description="SLA target percentage"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate SLA report PDF
    """
    try:
        # Calculate period dates
        now = datetime.utcnow()
        if period == "week":
            period_start = now - timedelta(days=7)
        elif period == "quarter":
            period_start = now - timedelta(days=90)
        else:  # month
            period_start = now - timedelta(days=30)
        
        # Get organization name
        org_name = "Todas las organizaciones"
        device_filter = {}
        
        if organization_id:
            from bson import ObjectId
            org = await db.organizations.find_one({"_id": ObjectId(organization_id)})
            if org:
                org_name = org.get("name", "Organización")
                device_filter["organization_id"] = organization_id
        
        # Get devices
        devices = await db.devices.find(device_filter).to_list(1000)
        
        # Add organization names to devices
        org_cache = {}
        for device in devices:
            org_id = device.get("organization_id")
            if org_id and org_id not in org_cache:
                org = await db.organizations.find_one({"_id": org_id}) if isinstance(org_id, str) == False else await db.organizations.find_one({"id": org_id})
                org_cache[org_id] = org.get("name", "Sin organización") if org else "Sin organización"
            device["organization_name"] = org_cache.get(org_id, "Sin organización")
            device["_id"] = str(device["_id"])
        
        # Calculate stats
        total = len(devices)
        online = sum(1 for d in devices if d.get("status") == "online")
        offline = total - online
        uptime_percent = (online / total * 100) if total > 0 else 0
        
        # Get average latency
        latencies = [d.get("response_time_ms", 0) for d in devices if d.get("response_time_ms")]
        avg_latency = sum(latencies) / len(latencies) if latencies else 0
        
        # Get alerts for period
        alerts = await db.alerts.find({
            "timestamp": {"$gte": period_start.isoformat()}
        }).to_list(1000)
        
        # Calculate MTTR (Mean Time To Recovery)
        down_events = [a for a in alerts if a.get("alert_type") == "device_down"]
        up_events = [a for a in alerts if a.get("alert_type") == "device_up"]
        mttr_minutes = 0
        
        if down_events and up_events:
            # Simple MTTR calculation
            total_down_time = 0
            recovery_count = 0
            for down in down_events:
                device_name = down.get("device_name")
                down_time = datetime.fromisoformat(down.get("timestamp", "").replace("Z", ""))
                # Find corresponding up event
                for up in up_events:
                    if up.get("device_name") == device_name:
                        up_time = datetime.fromisoformat(up.get("timestamp", "").replace("Z", ""))
                        if up_time > down_time:
                            total_down_time += (up_time - down_time).total_seconds() / 60
                            recovery_count += 1
                            break
            
            mttr_minutes = total_down_time / recovery_count if recovery_count > 0 else 0
        
        stats = {
            "total": total,
            "online": online,
            "offline": offline,
            "uptime_percent": round(uptime_percent, 2),
            "avg_latency": round(avg_latency, 2),
            "total_alerts": len(alerts),
            "critical_incidents": sum(1 for a in alerts if a.get("severity") == "critical"),
            "mttr_minutes": round(mttr_minutes, 2)
        }
        
        # Get downtime history
        pipeline = [
            {"$match": {"alert_type": "device_down", "timestamp": {"$gte": period_start.isoformat()}}},
            {"$group": {
                "_id": "$device_name",
                "count": {"$sum": 1},
                "lastDown": {"$max": "$timestamp"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        
        downtime_agg = await db.alerts.aggregate(pipeline).to_list(20)
        downtime_history = [{"name": d["_id"], "count": d["count"], "lastDown": d["lastDown"]} for d in downtime_agg]
        
        # Generate PDF
        pdf_bytes = sla_report_generator.generate_sla_report(
            organization_name=org_name,
            period_start=period_start,
            period_end=now,
            stats=stats,
            devices=devices,
            alerts=alerts,
            downtime_history=downtime_history,
            sla_target=sla_target
        )
        
        # Return as downloadable PDF
        filename = f"SLA_Report_{org_name.replace(' ', '_')}_{now.strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating SLA report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview")
async def preview_sla_data(
    organization_id: Optional[str] = Query(None),
    period: str = Query("month"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Preview SLA data before generating PDF
    """
    try:
        now = datetime.utcnow()
        if period == "week":
            period_start = now - timedelta(days=7)
        elif period == "quarter":
            period_start = now - timedelta(days=90)
        else:
            period_start = now - timedelta(days=30)
        
        # Get devices
        device_filter = {}
        if organization_id:
            device_filter["organization_id"] = organization_id
        
        devices = await db.devices.find(device_filter).to_list(1000)
        total = len(devices)
        online = sum(1 for d in devices if d.get("status") == "online")
        
        # Get alerts
        alerts = await db.alerts.find({
            "timestamp": {"$gte": period_start.isoformat()}
        }).to_list(1000)
        
        return {
            "period": period,
            "period_start": period_start.isoformat(),
            "period_end": now.isoformat(),
            "stats": {
                "total_devices": total,
                "online": online,
                "offline": total - online,
                "uptime_percent": round((online / total * 100) if total > 0 else 0, 2),
                "total_alerts": len(alerts)
            }
        }
        
    except Exception as e:
        logger.error(f"Error previewing SLA data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
