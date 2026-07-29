"""
Auth routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Body, Depends, Request
from datetime import datetime, timezone
import uuid

from config import users_collection, access_logs_collection, logger
from services.auth_service import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(request: Request, username: str = Body(...), password: str = Body(...)):
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

    # Record access log
    client_ip = request.headers.get("x-forwarded-for", request.headers.get("x-real-ip", request.client.host if request.client else "unknown"))
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    await access_logs_collection.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "full_name": user.get("full_name", user["username"]),
        "role": user.get("role", "viewer"),
        "ip_address": client_ip,
        "login_time": datetime.now(timezone.utc).isoformat(),
        "user_agent": request.headers.get("user-agent", "unknown")
    })

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user.get("role", "viewer"),
            "full_name": user.get("full_name", user["username"]),
            "allowed_brands": user.get("allowed_brands", []),
            "allowed_islands": user.get("allowed_islands", [])
        }
    }


@router.post("/change-password")
async def change_password(
    current_password: str = Body(...),
    new_password: str = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Change own password"""
    user = await users_collection.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not verify_password(current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Contrasena actual incorrecta")
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="La nueva contrasena debe tener al menos 4 caracteres")

    await users_collection.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": get_password_hash(new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Contrasena actualizada correctamente"}


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
