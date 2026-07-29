"""
User management routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from config import users_collection, access_logs_collection, logger
from services.auth_service import get_current_user, get_password_hash

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def get_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver usuarios")
    users = await users_collection.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    for u in users:
        if "is_active" not in u:
            u["is_active"] = True
        if "allowed_brands" not in u:
            u["allowed_brands"] = []
        if "allowed_islands" not in u:
            u["allowed_islands"] = []
    return {"users": users, "total": len(users)}


@router.post("")
async def create_user(
    username: str = Body(...),
    password: str = Body(...),
    role: str = Body(default="viewer"),
    full_name: str = Body(default=""),
    allowed_brands: Optional[List[str]] = Body(default=[]),
    allowed_islands: Optional[List[str]] = Body(default=[]),
    current_user: dict = Depends(get_current_user)
):
    """Create a new user (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear usuarios")

    existing = await users_collection.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": get_password_hash(password),
        "role": role,
        "full_name": full_name or username,
        "is_active": True,
        "allowed_brands": allowed_brands or [],
        "allowed_islands": allowed_islands or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("username")
    }
    await users_collection.insert_one(user)
    return {"message": "Usuario creado", "username": username, "role": role}


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    full_name: Optional[str] = Body(None),
    role: Optional[str] = Body(None),
    is_active: Optional[bool] = Body(None),
    password: Optional[str] = Body(None),
    allowed_brands: Optional[List[str]] = Body(None),
    allowed_islands: Optional[List[str]] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a user (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede editar usuarios")

    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if full_name is not None:
        update["full_name"] = full_name
    if role is not None:
        update["role"] = role
    if is_active is not None:
        update["is_active"] = is_active
    if password:
        update["password_hash"] = get_password_hash(password)
    if allowed_brands is not None:
        update["allowed_brands"] = allowed_brands
    if allowed_islands is not None:
        update["allowed_islands"] = allowed_islands

    await users_collection.update_one({"id": user_id}, {"$set": update})
    return {"message": "Usuario actualizado"}


@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a user (admin only, cannot delete self)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede eliminar usuarios")

    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")

    result = await users_collection.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}


@router.get("/access-logs")
async def get_access_logs(
    limit: int = 100,
    skip: int = 0,
    username: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get access logs (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver logs de acceso")

    query = {}
    if username:
        query["username"] = username

    total = await access_logs_collection.count_documents(query)
    logs = await access_logs_collection.find(query, {"_id": 0}).sort("login_time", -1).skip(skip).limit(limit).to_list(limit)
    return {"logs": logs, "total": total, "limit": limit, "skip": skip}
