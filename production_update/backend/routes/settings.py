"""
Settings and email configuration routes
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
import io
import platform
import psutil
import subprocess

from config import (
    settings_collection, scheduled_reports_collection, organizations_collection,
    groups_collection, devices_collection, logger, cache, db
)
from models import EmailSettings, ScheduledReportConfig
from services.auth_service import get_current_user, require_role
from services.email_service import send_test_email, get_smtp_config, send_email_generic

router = APIRouter(tags=["settings"])

# Cache TTL for settings (5 minutes)
SETTINGS_CACHE_TTL = 300

class SMTPSettings(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 465
    smtp_user: str
    smtp_password: str
    smtp_use_ssl: bool = True
    smtp_use_tls: bool = False
    alert_email: str
    
    # Legacy fields for backwards compatibility
    gmail_user: Optional[str] = None
    gmail_app_password: Optional[str] = None

# ============ CACHED SETTINGS HELPER ============
async def get_cached_settings():
    """Get settings with caching for performance"""
    cached = cache.get("settings", SETTINGS_CACHE_TTL)
    if cached:
        return cached
    
    settings = await settings_collection.find_one({}, {"_id": 0})
    if settings:
        cache.set("settings", settings)
    return settings

def invalidate_settings_cache():
    """Invalidate settings cache when updated"""
    cache.invalidate("settings")

# ============ EMAIL SETTINGS ============

@router.get("/settings")
async def get_settings(current_user: dict = Depends(require_role(["admin"]))):
    settings = await get_cached_settings()
    if settings:
        # Return a copy with masked passwords
        settings_copy = dict(settings)
        if settings_copy.get("gmail_app_password"):
            settings_copy["gmail_app_password"] = "********"
        if settings_copy.get("smtp_password"):
            settings_copy["smtp_password"] = "********"
        return {"settings": settings_copy}
    return {"settings": settings}

@router.post("/settings")
async def save_settings(settings: EmailSettings, current_user: dict = Depends(require_role(["admin"]))):
    await settings_collection.update_one({}, {"$set": settings.model_dump()}, upsert=True)
    invalidate_settings_cache()  # Clear cache on update
    return {"message": "Configuración guardada"}

@router.post("/settings/smtp")
async def save_smtp_settings(smtp: SMTPSettings, current_user: dict = Depends(require_role(["admin"]))):
    """Save SMTP configuration (supports any SMTP server, not just Gmail)"""
    update_data = {
        "smtp_host": smtp.smtp_host,
        "smtp_port": smtp.smtp_port,
        "smtp_user": smtp.smtp_user,
        "smtp_password": smtp.smtp_password,
        "smtp_use_ssl": smtp.smtp_use_ssl,
        "smtp_use_tls": smtp.smtp_use_tls,
        "alert_email": smtp.alert_email,
        # Also update legacy fields for backwards compatibility
        "gmail_user": smtp.smtp_user,
        "gmail_app_password": smtp.smtp_password
    }
    await settings_collection.update_one({}, {"$set": update_data}, upsert=True)
    invalidate_settings_cache()  # Clear cache on update
    return {"message": "Configuración SMTP guardada"}

@router.post("/settings/test-email")
async def test_email(current_user: dict = Depends(require_role(["admin"]))):
    """Send test email using configured SMTP settings"""
    result = await send_test_email()
    if result["success"]:
        return {"message": result["message"]}
    else:
        raise HTTPException(status_code=500, detail=result["error"])

# ============ SCHEDULED REPORTS ============

@router.get("/scheduled-reports")
async def get_scheduled_reports(current_user: dict = Depends(require_role(["admin"]))):
    config = await scheduled_reports_collection.find_one({}, {"_id": 0})
    return {"config": config or {
        "enabled": False, "frequency": "weekly", "day_of_week": 0, "day_of_month": 1,
        "hour": 8, "recipient_emails": [], "include_offline_list": True,
        "include_uptime_stats": True, "organization_ids": []
    }}

@router.post("/scheduled-reports")
async def save_scheduled_reports(config: ScheduledReportConfig, current_user: dict = Depends(require_role(["admin"]))):
    await scheduled_reports_collection.update_one({}, {"$set": config.model_dump()}, upsert=True)
    return {"message": "Configuración de reportes guardada"}

@router.post("/scheduled-reports/send-now")
async def send_report_now(current_user: dict = Depends(require_role(["admin"]))):
    try:
        await generate_and_send_report()
        return {"message": "Reporte enviado correctamente"}
    except Exception as e:
        logger.error(f"Error sending manual report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al enviar reporte: {str(e)}")

async def generate_and_send_report():
    """Generate and send scheduled report using generic SMTP"""
    config = await scheduled_reports_collection.find_one({}, {"_id": 0})
    if not config or not config.get("enabled"):
        logger.info("Scheduled reports disabled, skipping")
        return
    
    smtp_config = await get_smtp_config()
    if not smtp_config:
        logger.error("No SMTP settings configured for reports")
        return
    
    recipient_emails = config.get("recipient_emails", [])
    if not recipient_emails:
        recipient_emails = [smtp_config["alert_email"]]
    
    org_filter = {}
    if config.get("organization_ids"):
        org_filter = {"id": {"$in": config["organization_ids"]}}
    
    organizations = await organizations_collection.find(org_filter, {"_id": 0}).to_list(length=100)
    now = datetime.now(timezone.utc)
    
    if config.get("frequency") == "daily":
        start_date = now - timedelta(days=1)
        period_name = "Último día"
    elif config.get("frequency") == "weekly":
        start_date = now - timedelta(days=7)
        period_name = "Última semana"
    else:
        start_date = now - timedelta(days=30)
        period_name = "Último mes"
    
    all_devices = await devices_collection.find({}, {"_id": 0}).to_list(length=1000)
    total_devices = len(all_devices)
    online_devices = len([d for d in all_devices if d.get("status") == "online"])
    offline_devices = len([d for d in all_devices if d.get("status") == "offline"])
    uptime_percent = (online_devices / total_devices * 100) if total_devices > 0 else 0
    
    html_content = f"""
    <html><body style="font-family: Arial; padding: 20px;">
        <h1 style="color:#3b82f6">Siempria Network Monitor - Reporte</h1>
        <p>{period_name} - {now.strftime('%d/%m/%Y %H:%M')} UTC</p>
        <div style="display:flex;gap:20px;margin:20px 0;">
            <div style="padding:20px;background:#f0f9ff;border-radius:8px;text-align:center;">
                <div style="font-size:36px;font-weight:bold;color:#3b82f6">{total_devices}</div>
                <div>Total</div>
            </div>
            <div style="padding:20px;background:#dcfce7;border-radius:8px;text-align:center;">
                <div style="font-size:36px;font-weight:bold;color:#22c55e">{online_devices}</div>
                <div>Online</div>
            </div>
            <div style="padding:20px;background:#fee2e2;border-radius:8px;text-align:center;">
                <div style="font-size:36px;font-weight:bold;color:#ef4444">{offline_devices}</div>
                <div>Offline</div>
            </div>
        </div>
        <p style="color:#666;font-size:12px">Siempria Network Monitor</p>
    </body></html>
    """
    
    try:
        subject = f"📊 Reporte de Monitoreo - {period_name}"
        for recipient in recipient_emails:
            send_email_generic(smtp_config, recipient, subject, html_content)
        logger.info(f"Report sent to {len(recipient_emails)} recipients")
    except Exception as e:
        logger.error(f"Error sending report: {e}")
        raise



# ============ SYSTEM STATUS / HEALTH CHECK ============

@router.get("/system-status")
async def get_system_status(current_user: dict = Depends(get_current_user)):
    """Get comprehensive system status for diagnostics dashboard"""
    
    status = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {},
        "system": {},
        "database": {},
        "application": {}
    }
    
    # 1. Backend Status (obviously running if we're here)
    status["services"]["backend"] = {
        "status": "running",
        "uptime": None,
        "port": 8001
    }
    
    # 2. Check MongoDB
    try:
        await db.command("ping")
        db_stats = await db.command("dbStats")
        collections = await db.list_collection_names()
        status["database"] = {
            "status": "connected",
            "name": db.name,
            "collections": len(collections),
            "size_mb": round(db_stats.get("dataSize", 0) / (1024 * 1024), 2),
            "objects": db_stats.get("objects", 0)
        }
    except Exception as e:
        status["database"] = {
            "status": "error",
            "error": str(e)
        }
    
    # 3. System Resources
    try:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        status["system"] = {
            "platform": platform.system(),
            "hostname": platform.node(),
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "percent": round(disk.percent, 1)
            }
        }
    except Exception as e:
        status["system"] = {"error": str(e)}
    
    # 4. Check Nginx (via subprocess - works on production server)
    try:
        result = subprocess.run(
            ["systemctl", "is-active", "nginx"],
            capture_output=True, text=True, timeout=5
        )
        nginx_status = result.stdout.strip()
        status["services"]["nginx"] = {
            "status": nginx_status if nginx_status in ["active", "inactive", "failed"] else "unknown",
            "port": 443
        }
    except Exception:
        # In container/dev environment, nginx might not be accessible via systemctl
        status["services"]["nginx"] = {
            "status": "unknown",
            "note": "systemctl not available in this environment"
        }
    
    # 5. Application Stats
    try:
        device_count = await devices_collection.count_documents({})
        online_count = await devices_collection.count_documents({"status": "online"})
        offline_count = await devices_collection.count_documents({"status": "offline"})
        
        status["application"] = {
            "devices": {
                "total": device_count,
                "online": online_count,
                "offline": offline_count
            },
            "api_url": "Active"
        }
    except Exception as e:
        status["application"] = {"error": str(e)}
    
    return status


@router.get("/system-status/quick")
async def get_quick_status():
    """Public quick health check endpoint (no auth required)"""
    try:
        await db.command("ping")
        db_ok = True
    except:
        db_ok = False
    
    return {
        "status": "ok" if db_ok else "degraded",
        "backend": "running",
        "database": "connected" if db_ok else "error",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============ UPTIME RECORD ============

class UptimeRecord(BaseModel):
    days: int = 0
    hours: int = 0
    minutes: int = 0
    seconds: int = 0

@router.get("/uptime-record")
async def get_uptime_record(current_user: dict = Depends(get_current_user)):
    """Get the best uptime record (time without incidents)"""
    try:
        record = await settings_collection.find_one({"type": "uptime_record"}, {"_id": 0})
        if record:
            return {"record": record.get("record", {"days": 0, "hours": 0, "minutes": 0, "seconds": 0})}
        return {"record": {"days": 0, "hours": 0, "minutes": 0, "seconds": 0}}
    except Exception as e:
        logger.error(f"Error getting uptime record: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/uptime-record")
async def save_uptime_record(record: UptimeRecord, current_user: dict = Depends(require_role(["admin"]))):
    """Save a new uptime record (only if better than current)"""
    try:
        current = await settings_collection.find_one({"type": "uptime_record"})
        
        new_total_seconds = record.days * 86400 + record.hours * 3600 + record.minutes * 60 + record.seconds
        
        if current:
            current_record = current.get("record", {})
            current_total = (current_record.get("days", 0) * 86400 + 
                          current_record.get("hours", 0) * 3600 + 
                          current_record.get("minutes", 0) * 60 + 
                          current_record.get("seconds", 0))
            
            if new_total_seconds <= current_total:
                return {"message": "Current record is better", "record": current_record}
        
        await settings_collection.update_one(
            {"type": "uptime_record"},
            {"$set": {
                "type": "uptime_record",
                "record": {
                    "days": record.days,
                    "hours": record.hours,
                    "minutes": record.minutes,
                    "seconds": record.seconds
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        return {"message": "New record saved!", "record": {
            "days": record.days,
            "hours": record.hours,
            "minutes": record.minutes,
            "seconds": record.seconds
        }}
    except Exception as e:
        logger.error(f"Error saving uptime record: {e}")
        raise HTTPException(status_code=500, detail=str(e))
