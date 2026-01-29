"""
Multi-tenant authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt
import secrets

from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS, logger
from services.tenant_service import (
    create_tenant, authenticate_user, get_tenant_by_id,
    get_master_db, get_tenant_db, PLAN_CONFIGS
)
from models.tenant import TenantCreate, PlanType

router = APIRouter(prefix="/saas", tags=["Multi-tenant Auth"])
security = HTTPBearer(auto_error=False)

class LoginRequest(BaseModel):
    email: str  # Can be email or username
    password: str

class RegisterRequest(BaseModel):
    company_name: str
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str
    user: dict
    tenant: dict
    limits: dict

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Create JWT token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_tenant_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Get current user and tenant from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        tenant_id = payload.get("tenant_id")
        
        if not user_id or not tenant_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        # Get user from master DB
        master_db = get_master_db()
        user = await master_db.users.find_one({"id": user_id}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        
        # Get tenant
        tenant = await get_tenant_by_id(tenant_id)
        if not tenant or not tenant.is_active:
            raise HTTPException(status_code=401, detail="Cuenta suspendida")
        
        return {
            "user": user,
            "tenant": tenant,
            "tenant_db": get_tenant_db(tenant.slug),
            "limits": PLAN_CONFIGS[tenant.plan]
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def require_tenant_role(allowed_roles: list):
    """Dependency to require specific roles within tenant"""
    async def role_checker(
        current: dict = Depends(get_current_tenant_user)
    ) -> dict:
        user_role = current["user"].get("role", "")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Rol '{user_role}' no autorizado. Se requiere: {allowed_roles}"
            )
        return current
    return role_checker

# ============ ROUTES ============

@router.post("/register")
async def register_tenant(data: RegisterRequest):
    """Register a new tenant (company) with free plan"""
    master_db = get_master_db()
    
    # Check if email already exists
    existing = await master_db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Este email ya está registrado")
    
    # Create tenant
    result = await create_tenant(TenantCreate(
        name=data.company_name,
        email=data.email,
        password=data.password,
        company_name=data.company_name
    ))
    
    logger.info(f"New tenant registered: {data.company_name} ({data.email})")
    
    return {
        "message": "Registro exitoso. Ya puedes iniciar sesión.",
        "tenant_slug": result["slug"]
    }

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request):
    """Login for tenant users"""
    # Get client IP
    client_ip = request.headers.get("X-Real-IP", request.client.host if request.client else "unknown")
    
    # Authenticate
    result = await authenticate_user(data.email, data.password)
    
    if not result:
        logger.warning(f"Failed login attempt for '{data.email}' from IP {client_ip}")
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    user = result["user"]
    tenant = result["tenant"]
    
    # Create token with tenant info
    token = create_access_token({
        "user_id": user["id"],
        "tenant_id": tenant["id"],
        "tenant_slug": tenant["slug"],
        "role": user.get("role", "user")
    })
    
    logger.info(f"User '{user['username']}' logged in for tenant '{tenant['name']}'")
    
    # Remove sensitive data
    user_safe = {k: v for k, v in user.items() if k != "password_hash"}
    
    return TokenResponse(
        token=token,
        user=user_safe,
        tenant={
            "id": tenant["id"],
            "name": tenant["name"],
            "slug": tenant["slug"],
            "plan": tenant["plan"],
            "logo_url": tenant.get("logo_url"),
            "primary_color": tenant.get("primary_color", "#00a3d9")
        },
        limits=result["limits"]
    )

@router.get("/me")
async def get_current_user_info(current: dict = Depends(get_current_tenant_user)):
    """Get current user and tenant information"""
    user = current["user"]
    tenant = current["tenant"]
    limits = current["limits"]
    
    # Remove sensitive data
    user_safe = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {
        "user": user_safe,
        "tenant": {
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "plan": tenant.plan.value,
            "logo_url": tenant.logo_url,
            "primary_color": tenant.primary_color
        },
        "limits": limits.model_dump()
    }

@router.post("/logout")
async def logout():
    """Logout (client-side token removal)"""
    return {"message": "Sesión cerrada"}
