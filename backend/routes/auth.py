"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import uuid

from config import users_collection
from models import UserLogin, UserCreate, ChangePassword
from services.auth_service import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_role
)
from services.logging_service import log_access
from services.security_service import (
    check_ip_allowed, check_account_allowed, 
    record_failed_attempt, record_successful_login
)

router = APIRouter(prefix="/auth", tags=["auth"])

def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

@router.post("/login")
async def login(credentials: UserLogin, request: Request):
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "unknown")
    
    # Security check 1: Is this IP allowed?
    ip_allowed, ip_reason = await check_ip_allowed(ip_address)
    if not ip_allowed:
        await log_access(
            log_type="auth_blocked",
            username=credentials.username,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "ip_blocked", "message": ip_reason},
            success=False
        )
        raise HTTPException(status_code=403, detail=ip_reason)
    
    # Security check 2: Is this account allowed?
    account_allowed, account_reason = await check_account_allowed(credentials.username)
    if not account_allowed:
        await log_access(
            log_type="auth_blocked",
            username=credentials.username,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "account_blocked", "message": account_reason},
            success=False
        )
        raise HTTPException(status_code=403, detail=account_reason)
    
    user = await users_collection.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        # Record failed attempt for security tracking
        await record_failed_attempt(ip_address, credentials.username)
        
        # Log failed attempt
        await log_access(
            log_type="auth_failed",
            username=credentials.username,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "invalid_credentials"},
            success=False
        )
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not user.get("is_active", True):
        await log_access(
            log_type="auth_failed",
            user_id=user["id"],
            username=user["username"],
            user_role=user["role"],
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "user_disabled"},
            success=False
        )
        raise HTTPException(status_code=401, detail="Usuario desactivado")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    
    # Clear failed attempts on successful login
    await record_successful_login(ip_address, credentials.username)
    
    # Log successful login
    await log_access(
        log_type="auth_login",
        user_id=user["id"],
        username=user["username"],
        user_role=user["role"],
        ip_address=ip_address,
        user_agent=user_agent,
        success=True
    )
    
    # Get feature flags for tenant_admin users (admins have all features)
    feature_flags = user.get("feature_flags", None)
    if user["role"] == "admin":
        # Admins always have all features enabled
        feature_flags = {
            "devices": True, "alerts": True, "cra": True, "dahua": True,
            "live_view": True, "incidents": True, "reports": True,
            "ai_insights": True, "gallery": True
        }
    elif user["role"] == "tenant_admin" and not feature_flags:
        # Default all enabled for tenant_admin without flags
        feature_flags = {
            "devices": True, "alerts": True, "cra": True, "dahua": True,
            "live_view": True, "incidents": True, "reports": True,
            "ai_insights": True, "gallery": True
        }
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user.get("full_name", ""),
            "group_ids": user.get("group_ids", []),
            "organization_ids": user.get("organization_ids", []),
            "feature_flags": feature_flags
        }
    }

@router.post("/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """Log user logout"""
    ip_address = get_client_ip(request)
    
    await log_access(
        log_type="auth_logout",
        user_id=current_user["id"],
        username=current_user["username"],
        user_role=current_user["role"],
        ip_address=ip_address,
        success=True
    )
    
    return {"message": "Sesión cerrada"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

@router.post("/change-password")
async def change_password(data: ChangePassword, request: Request, current_user: dict = Depends(get_current_user)):
    ip_address = get_client_ip(request)
    
    user = await users_collection.find_one({"id": current_user["id"]})
    if not verify_password(data.current_password, user.get("password_hash", "")):
        await log_access(
            log_type="user_password",
            user_id=current_user["id"],
            username=current_user["username"],
            user_role=current_user["role"],
            ip_address=ip_address,
            target_type="user",
            target_id=current_user["id"],
            details={"action": "change_own_password", "reason": "wrong_current"},
            success=False
        )
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    
    await users_collection.update_one(
        {"id": current_user["id"]}, 
        {"$set": {"password_hash": get_password_hash(data.new_password)}}
    )
    
    await log_access(
        log_type="user_password",
        user_id=current_user["id"],
        username=current_user["username"],
        user_role=current_user["role"],
        ip_address=ip_address,
        target_type="user",
        target_id=current_user["id"],
        details={"action": "change_own_password"},
        success=True
    )
    
    return {"message": "Contraseña actualizada"}


@router.post("/forgot-password")
async def forgot_password(data: dict):
    """Send password reset email"""
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email requerido")
    
    # Find user by email
    user = await users_collection.find_one({"email": email})
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "Si el email existe, recibirás instrucciones para recuperar tu contraseña"}
    
    # Generate reset token
    import secrets
    reset_token = secrets.token_urlsafe(32)
    reset_expires = datetime.now(timezone.utc).timestamp() + 3600  # 1 hour
    
    # Store reset token in user document
    await users_collection.update_one(
        {"id": user["id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_expires": reset_expires
        }}
    )
    
    # Send email with reset link
    try:
        from services.email_service import send_password_reset_email
        await send_password_reset_email(
            to_email=email,
            username=user["username"],
            reset_token=reset_token
        )
    except Exception as e:
        print(f"Error sending reset email: {e}")
        # Don't reveal error to user
    
    return {"message": "Si el email existe, recibirás instrucciones para recuperar tu contraseña"}


@router.post("/reset-password")
async def reset_password(data: dict):
    """Reset password with token"""
    token = data.get("token")
    new_password = data.get("new_password")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token y contraseña requeridos")
    
    # Find user with valid token
    user = await users_collection.find_one({
        "reset_token": token,
        "reset_expires": {"$gt": datetime.now(timezone.utc).timestamp()}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    # Update password and clear reset token
    await users_collection.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": get_password_hash(new_password)
        }, "$unset": {
            "reset_token": "",
            "reset_expires": ""
        }}
    )
    
    return {"message": "Contraseña actualizada correctamente"}

