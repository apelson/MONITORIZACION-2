"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from config import users_collection
from models import UserLogin, UserCreate, ChangePassword
from services.auth_service import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_role
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(credentials: UserLogin):
    user = await users_collection.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Usuario desactivado")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user.get("full_name", ""),
            "group_ids": user.get("group_ids", [])
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

@router.post("/change-password")
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    user = await users_collection.find_one({"id": current_user["id"]})
    if not verify_password(data.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    await users_collection.update_one(
        {"id": current_user["id"]}, 
        {"$set": {"password_hash": get_password_hash(data.new_password)}}
    )
    return {"message": "Contraseña actualizada"}
