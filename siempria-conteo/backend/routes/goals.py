"""
Goals Routes - Monthly objectives per brand/dealership
"""
from fastapi import APIRouter, Depends, Body, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
import uuid

from config import db, logger
from services.auth_service import get_current_user

goals_collection = db["goals"]

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("")
async def get_goals(
    month: Optional[str] = Query(default=None, description="YYYY-MM format"),
    current_user: dict = Depends(get_current_user)
):
    """Get goals for a specific month (defaults to current month)"""
    if not month:
        month = datetime.now().strftime("%Y-%m")

    goals = await goals_collection.find(
        {"month": month}, {"_id": 0}
    ).to_list(100)

    return {"goals": goals, "month": month}


@router.post("")
async def create_goal(
    brand_id: str = Body(...),
    month: str = Body(..., description="YYYY-MM"),
    target_visits: int = Body(..., ge=1),
    label: str = Body(default=""),
    current_user: dict = Depends(get_current_user)
):
    """Create or update a monthly goal for a brand"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear objetivos")

    existing = await goals_collection.find_one(
        {"brand_id": brand_id, "month": month}
    )

    doc = {
        "brand_id": brand_id,
        "month": month,
        "target_visits": target_visits,
        "label": label,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.get("username")
    }

    if existing:
        await goals_collection.update_one(
            {"brand_id": brand_id, "month": month},
            {"$set": doc}
        )
        return {"message": "Objetivo actualizado", "goal_id": existing.get("goal_id")}
    else:
        doc["goal_id"] = str(uuid.uuid4())[:12]
        doc["created_at"] = doc["updated_at"]
        doc["created_by"] = doc["updated_by"]
        await goals_collection.insert_one(doc)
        return {"message": "Objetivo creado", "goal_id": doc["goal_id"]}


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    result = await goals_collection.delete_one({"goal_id": goal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    return {"deleted": True}
