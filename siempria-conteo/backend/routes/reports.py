"""
Report configuration routes
All authenticated users can create/manage their own reports
Admin can see all reports
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from config import db, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def get_reports(current_user: dict = Depends(get_current_user)):
    """Get reports - admin sees all, others see only their own"""
    query = {} if current_user.get("role") == "admin" else {"created_by": current_user["id"]}
    reports = await db["report_configs"].find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"reports": reports, "total": len(reports)}


@router.post("")
async def create_report(
    name: str = Body(...),
    report_type: str = Body(default="daily"),
    frequency: str = Body(default="daily"),
    email: str = Body(...),
    brands: Optional[List[str]] = Body(default=[]),
    centers: Optional[List[str]] = Body(default=[]),
    islands: Optional[List[str]] = Body(default=[]),
    enabled: bool = Body(default=True),
    current_user: dict = Depends(get_current_user)
):
    """Create a new report config"""
    report = {
        "id": str(uuid.uuid4()),
        "name": name,
        "report_type": report_type,
        "frequency": frequency,
        "email": email,
        "brands": brands or [],
        "centers": centers or [],
        "islands": islands or [],
        "enabled": enabled,
        "created_by": current_user["id"],
        "created_by_name": current_user.get("username", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_sent": None
    }
    await db["report_configs"].insert_one(report)
    return {"message": "Reporte creado", "report": {k: v for k, v in report.items() if k != "_id"}}


@router.put("/{report_id}")
async def update_report(
    report_id: str,
    name: Optional[str] = Body(None),
    report_type: Optional[str] = Body(None),
    frequency: Optional[str] = Body(None),
    email: Optional[str] = Body(None),
    brands: Optional[List[str]] = Body(None),
    centers: Optional[List[str]] = Body(None),
    islands: Optional[List[str]] = Body(None),
    enabled: Optional[bool] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a report config"""
    report = await db["report_configs"].find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if current_user.get("role") != "admin" and report.get("created_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este reporte")

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name is not None: update["name"] = name
    if report_type is not None: update["report_type"] = report_type
    if frequency is not None: update["frequency"] = frequency
    if email is not None: update["email"] = email
    if brands is not None: update["brands"] = brands
    if centers is not None: update["centers"] = centers
    if islands is not None: update["islands"] = islands
    if enabled is not None: update["enabled"] = enabled

    await db["report_configs"].update_one({"id": report_id}, {"$set": update})
    return {"message": "Reporte actualizado"}


@router.delete("/{report_id}")
async def delete_report(report_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a report config"""
    report = await db["report_configs"].find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if current_user.get("role") != "admin" and report.get("created_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")

    await db["report_configs"].delete_one({"id": report_id})
    return {"message": "Reporte eliminado"}
