"""
User management routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from config import users_collection
from models import UserCreate, UserUpdate, AdminSetPassword
from services.auth_service import get_password_hash, get_current_user, require_role

router = APIRouter(prefix="/users", tags=["users"])

@router.get("")
async def get_users(current_user: dict = Depends(require_role(["admin"]))):
    return {"users": await users_collection.find({}, {"_id": 0, "password_hash": 0}).to_list(length=None)}

@router.post("")
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_role(["admin"]))):
    if await users_collection.find_one({"username": user_data.username}):
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    user = {
        "id": str(uuid.uuid4()),
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role,
        "full_name": user_data.full_name or "",
        "is_active": True,
        "group_ids": user_data.group_ids or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await users_collection.insert_one(user)
    del user["password_hash"]
    del user["_id"] if "_id" in user else None
    return {"user": user}

@router.put("/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(require_role(["admin"]))):
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    await users_collection.update_one({"id": user_id}, {"$set": update_data})
    return {"message": "Usuario actualizado"}

@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await users_collection.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}

@router.post("/{user_id}/reset-password")
async def reset_user_password(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    if not await users_collection.find_one({"id": user_id}):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await users_collection.update_one({"id": user_id}, {"$set": {"password_hash": get_password_hash("password123")}})
    return {"message": "Contraseña restablecida a: password123"}

@router.post("/{user_id}/set-password")
async def set_user_password(user_id: str, data: AdminSetPassword, current_user: dict = Depends(require_role(["admin"]))):
    if not await users_collection.find_one({"id": user_id}):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    await users_collection.update_one({"id": user_id}, {"$set": {"password_hash": get_password_hash(data.new_password)}})
    return {"message": "Contraseña actualizada correctamente"}
