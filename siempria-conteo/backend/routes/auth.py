"""
Auth routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Body
from datetime import datetime, timezone
import uuid

from config import users_collection, logger
from services.auth_service import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(username: str = Body(...), password: str = Body(...)):
    """Login with username and password"""
    user = await users_collection.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")

    token = create_access_token({"sub": user["id"], "username": user["username"], "role": user.get("role", "viewer")})

    await users_collection.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user.get("role", "viewer"),
            "full_name": user.get("full_name", user["username"])
        }
    }


@router.post("/create-user")
async def create_user(
    username: str = Body(...),
    password: str = Body(...),
    role: str = Body(default="viewer"),
    full_name: str = Body(default="")
):
    """Create a new user (for initial setup)"""
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await users_collection.insert_one(user)

    return {"message": "Usuario creado", "username": username}
