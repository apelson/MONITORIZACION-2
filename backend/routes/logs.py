"""
Access logs routes for viewing and managing activity logs
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
import io

from services.auth_service import require_role, get_current_user
from services.logging_service import (
    get_access_logs, get_security_alerts, get_user_activity_summary,
    get_logs_stats, cleanup_old_logs, LOG_TYPES, LOG_CATEGORIES
)
from config import access_logs_collection, logger

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("")
async def list_access_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    log_type: Optional[str] = None,
    category: Optional[str] = None,
    target_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    success_only: Optional[bool] = None,
    ip_address: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Get access logs with optional filters"""
    return await get_access_logs(
        skip=skip,
        limit=limit,
        user_id=user_id,
        username=username,
        log_type=log_type,
        category=category,
        target_id=target_id,
        start_date=start_date,
        end_date=end_date,
        success_only=success_only,
        ip_address=ip_address
    )

@router.get("/types")
async def get_log_types(current_user: dict = Depends(require_role(["admin"]))):
    """Get available log types and categories"""
    return {
        "types": LOG_TYPES,
        "categories": LOG_CATEGORIES
    }

@router.get("/stats")
async def get_statistics(
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Get log statistics for dashboard"""
    return await get_logs_stats(days)

@router.get("/security")
async def get_security_report(
    hours: int = Query(24, ge=1, le=168),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Get security alerts and suspicious activity"""
    return await get_security_alerts(hours)

@router.get("/user/{user_id}")
async def get_user_logs(
    user_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Get activity summary for a specific user"""
    return await get_user_activity_summary(user_id, days)

@router.delete("/cleanup")
async def cleanup_logs(
    days: int = Query(90, ge=30, le=365),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Delete logs older than specified days"""
    deleted = await cleanup_old_logs(days)
    return {"message": f"Eliminados {deleted} logs antiguos", "deleted_count": deleted}

@router.get("/export")
async def export_logs(
    format: str = Query("csv", regex="^(csv|json)$"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Export logs to CSV or JSON"""
    # Get logs
    result = await get_access_logs(
        skip=0,
        limit=10000,  # Max export
        start_date=start_date,
        end_date=end_date,
        category=category
    )
    logs = result["logs"]
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if format == "csv":
        # Create CSV
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Fecha/Hora", "Usuario", "Rol", "Tipo", "Categoría", 
            "Objetivo", "IP", "Éxito", "Detalles"
        ])
        
        # Data
        for log in logs:
            writer.writerow([
                log.get("timestamp", ""),
                log.get("username", ""),
                log.get("user_role", ""),
                log.get("log_type", ""),
                log.get("category", ""),
                log.get("target_name", "") or log.get("target_id", ""),
                log.get("ip_address", ""),
                "Sí" if log.get("success") else "No",
                str(log.get("details", {}))
            ])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=logs_{timestamp}.csv"}
        )
    else:
        # JSON
        import json
        json_data = json.dumps(logs, indent=2, ensure_ascii=False)
        return StreamingResponse(
            io.BytesIO(json_data.encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=logs_{timestamp}.json"}
        )

@router.get("/my-activity")
async def get_my_activity(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's own activity (available to all users)"""
    return await get_user_activity_summary(current_user["id"], days)
