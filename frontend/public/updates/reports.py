"""
Daily reports routes for configuring and sending scheduled reports
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional

from services.auth_service import require_role
from services.report_service import (
    get_daily_report_data, send_daily_report,
    get_report_settings, update_report_settings
)

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportSettingsUpdate(BaseModel):
    daily_report_enabled: Optional[bool] = None
    daily_report_time: Optional[str] = None  # Format: "HH:MM"
    daily_report_recipients: Optional[List[str]] = None
    weekly_report_enabled: Optional[bool] = None
    weekly_report_day: Optional[str] = None  # monday, tuesday, etc.


@router.get("/settings")
async def get_settings(current_user: dict = Depends(require_role(["admin"]))):
    """Get current report settings"""
    return await get_report_settings()


@router.put("/settings")
async def update_settings(
    data: ReportSettingsUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Update report settings"""
    return await update_report_settings(
        daily_enabled=data.daily_report_enabled,
        daily_time=data.daily_report_time,
        recipients=data.daily_report_recipients,
        weekly_enabled=data.weekly_report_enabled,
        weekly_day=data.weekly_report_day
    )


@router.get("/preview")
async def preview_report(
    days: int = Query(1, ge=1, le=30),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Preview report data without sending"""
    data = await get_daily_report_data(days)
    return data


@router.post("/send")
async def send_report_now(
    days: int = Query(1, ge=1, le=30),
    recipients: Optional[List[str]] = None,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Send a report immediately"""
    result = await send_daily_report(recipients=recipients, days=days)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Error al enviar"))
    
    return result


@router.post("/test")
async def send_test_report(
    email: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Send a test report to a specific email"""
    result = await send_daily_report(recipients=[email], days=1)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Error al enviar"))
    
    return {"message": f"Informe de prueba enviado a {email}", **result}
