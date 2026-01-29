"""
Multi-tenant service for managing tenants and database connections
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, Dict
from datetime import datetime, timezone, timedelta
import re
import secrets
from passlib.context import CryptContext

from models.tenant import (
    Tenant, TenantUser, TenantCreate, PlanType, 
    PLAN_CONFIGS, PlanLimits
)
from config import mongo_url, logger

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Cache for tenant database connections
_tenant_db_cache: Dict[str, AsyncIOMotorDatabase] = {}

# Master database connection
_master_client: Optional[AsyncIOMotorClient] = None
_master_db: Optional[AsyncIOMotorDatabase] = None

def get_master_db() -> AsyncIOMotorDatabase:
    """Get the master database for tenant management"""
    global _master_client, _master_db
    if _master_db is None:
        _master_client = AsyncIOMotorClient(mongo_url)
        _master_db = _master_client["siempriapp_master"]
    return _master_db

def get_tenant_db(tenant_slug: str) -> AsyncIOMotorDatabase:
    """Get database connection for a specific tenant"""
    if tenant_slug not in _tenant_db_cache:
        client = AsyncIOMotorClient(mongo_url)
        db_name = f"tenant_{tenant_slug}"
        _tenant_db_cache[tenant_slug] = client[db_name]
    return _tenant_db_cache[tenant_slug]

def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    return text[:50]

async def create_tenant(data: TenantCreate) -> dict:
    """Create a new tenant with their own database"""
    master_db = get_master_db()
    
    # Generate unique slug
    base_slug = slugify(data.name)
    slug = base_slug
    counter = 1
    
    while await master_db.tenants.find_one({"slug": slug}):
        slug = f"{base_slug}_{counter}"
        counter += 1
    
    # Create tenant record
    tenant_id = f"tenant_{secrets.token_hex(8)}"
    tenant = Tenant(
        id=tenant_id,
        name=data.name,
        slug=slug,
        email=data.email,
        plan=PlanType.FREE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    await master_db.tenants.insert_one(tenant.model_dump())
    
    # Create admin user for tenant
    user_id = f"user_{secrets.token_hex(8)}"
    admin_user = TenantUser(
        id=user_id,
        tenant_id=tenant_id,
        username="admin",
        email=data.email,
        password_hash=pwd_context.hash(data.password),
        role="admin",
        full_name="Administrador",
        created_at=datetime.now(timezone.utc)
    )
    
    await master_db.users.insert_one(admin_user.model_dump())
    
    # Initialize tenant database with default structure
    tenant_db = get_tenant_db(slug)
    
    # Create default device types
    default_device_types = [
        {"id": "type-camera", "name": "Cámara", "icon": "video", "color": "#00a3d9", "is_default": True},
        {"id": "type-nvr", "name": "NVR", "icon": "hard-drive", "color": "#10b981", "is_default": True},
        {"id": "type-switch", "name": "Switch", "icon": "network", "color": "#f59e0b", "is_default": True},
        {"id": "type-router", "name": "Router", "icon": "router", "color": "#ef4444", "is_default": True},
        {"id": "type-server", "name": "Servidor", "icon": "server", "color": "#8b5cf6", "is_default": True},
        {"id": "type-other", "name": "Otro", "icon": "box", "color": "#6b7280", "is_default": True},
    ]
    
    await tenant_db.device_types.insert_many(default_device_types)
    
    # Create default organization
    default_org = {
        "id": f"org_{secrets.token_hex(6)}",
        "name": data.company_name or data.name,
        "created_at": datetime.now(timezone.utc)
    }
    await tenant_db.organizations.insert_one(default_org)
    
    # Create indexes for tenant database
    await tenant_db.devices.create_index("id", unique=True)
    await tenant_db.devices.create_index("group_id")
    await tenant_db.devices.create_index("status")
    await tenant_db.groups.create_index("id", unique=True)
    await tenant_db.groups.create_index("organization_id")
    await tenant_db.alerts.create_index([("timestamp", -1)])
    await tenant_db.status_history.create_index([("device_id", 1), ("timestamp", -1)])
    
    logger.info(f"Created new tenant: {tenant.name} (slug: {slug})")
    
    return {
        "tenant_id": tenant_id,
        "slug": slug,
        "message": "Tenant creado exitosamente"
    }

async def get_tenant_by_slug(slug: str) -> Optional[Tenant]:
    """Get tenant by slug"""
    master_db = get_master_db()
    data = await master_db.tenants.find_one({"slug": slug}, {"_id": 0})
    if data:
        return Tenant(**data)
    return None

async def get_tenant_by_id(tenant_id: str) -> Optional[Tenant]:
    """Get tenant by ID"""
    master_db = get_master_db()
    data = await master_db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if data:
        return Tenant(**data)
    return None

async def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email from master database"""
    master_db = get_master_db()
    return await master_db.users.find_one({"email": email}, {"_id": 0})

async def get_user_by_username_and_tenant(username: str, tenant_id: str) -> Optional[dict]:
    """Get user by username within a tenant"""
    master_db = get_master_db()
    return await master_db.users.find_one(
        {"username": username, "tenant_id": tenant_id}, 
        {"_id": 0}
    )

async def authenticate_user(email_or_username: str, password: str) -> Optional[dict]:
    """Authenticate user and return user + tenant info"""
    master_db = get_master_db()
    
    # Try to find by email first
    user = await master_db.users.find_one({"email": email_or_username}, {"_id": 0})
    
    if not user:
        # Try by username (need to check all matching usernames)
        user = await master_db.users.find_one({"username": email_or_username}, {"_id": 0})
    
    if not user:
        return None
    
    # Verify password
    if not pwd_context.verify(password, user.get("password_hash", "")):
        return None
    
    # Get tenant info
    tenant = await get_tenant_by_id(user["tenant_id"])
    if not tenant or not tenant.is_active:
        return None
    
    # Update last login
    await master_db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    return {
        "user": user,
        "tenant": tenant.model_dump(),
        "limits": PLAN_CONFIGS[tenant.plan].model_dump()
    }

async def get_tenant_limits(tenant_id: str) -> PlanLimits:
    """Get the plan limits for a tenant"""
    tenant = await get_tenant_by_id(tenant_id)
    if tenant:
        return PLAN_CONFIGS[tenant.plan]
    return PLAN_CONFIGS[PlanType.FREE]

async def check_device_limit(tenant_id: str) -> dict:
    """Check if tenant can add more devices"""
    tenant = await get_tenant_by_id(tenant_id)
    if not tenant:
        return {"allowed": False, "reason": "Tenant no encontrado"}
    
    limits = PLAN_CONFIGS[tenant.plan]
    
    if tenant.current_devices >= limits.max_devices:
        return {
            "allowed": False,
            "reason": f"Límite de dispositivos alcanzado ({limits.max_devices}). Actualiza tu plan.",
            "current": tenant.current_devices,
            "max": limits.max_devices
        }
    
    return {
        "allowed": True,
        "current": tenant.current_devices,
        "max": limits.max_devices
    }

async def check_verification_limit(tenant_id: str) -> dict:
    """Check if tenant can perform more verifications today"""
    master_db = get_master_db()
    tenant = await get_tenant_by_id(tenant_id)
    if not tenant:
        return {"allowed": False, "reason": "Tenant no encontrado"}
    
    limits = PLAN_CONFIGS[tenant.plan]
    
    # Reset counter if it's a new day
    now = datetime.now(timezone.utc)
    if tenant.last_verification_reset:
        last_reset = tenant.last_verification_reset
        if isinstance(last_reset, str):
            last_reset = datetime.fromisoformat(last_reset.replace('Z', '+00:00'))
        
        if last_reset.date() < now.date():
            await master_db.tenants.update_one(
                {"id": tenant_id},
                {"$set": {"verifications_today": 0, "last_verification_reset": now}}
            )
            tenant.verifications_today = 0
    
    if tenant.verifications_today >= limits.max_verifications_per_day:
        return {
            "allowed": False,
            "reason": f"Límite de verificaciones alcanzado ({limits.max_verifications_per_day}/día). Actualiza tu plan.",
            "current": tenant.verifications_today,
            "max": limits.max_verifications_per_day
        }
    
    return {
        "allowed": True,
        "current": tenant.verifications_today,
        "max": limits.max_verifications_per_day
    }

async def increment_verification_count(tenant_id: str):
    """Increment the verification counter for a tenant"""
    master_db = get_master_db()
    await master_db.tenants.update_one(
        {"id": tenant_id},
        {
            "$inc": {"verifications_today": 1},
            "$set": {"last_verification_reset": datetime.now(timezone.utc)}
        }
    )

async def update_device_count(tenant_id: str, count: int):
    """Update the device count for a tenant"""
    master_db = get_master_db()
    await master_db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"current_devices": count}}
    )

async def update_tenant_plan(tenant_id: str, new_plan: PlanType) -> bool:
    """Update tenant's subscription plan"""
    master_db = get_master_db()
    result = await master_db.tenants.update_one(
        {"id": tenant_id},
        {
            "$set": {
                "plan": new_plan.value,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    return result.modified_count > 0

async def list_all_tenants() -> list:
    """List all tenants (for super admin)"""
    master_db = get_master_db()
    tenants = await master_db.tenants.find({}, {"_id": 0}).to_list(length=None)
    return tenants

async def get_tenant_stats(tenant_id: str) -> dict:
    """Get usage statistics for a tenant"""
    tenant = await get_tenant_by_id(tenant_id)
    if not tenant:
        return {}
    
    tenant_db = get_tenant_db(tenant.slug)
    
    device_count = await tenant_db.devices.count_documents({})
    online_count = await tenant_db.devices.count_documents({"status": "online"})
    user_count = await (get_master_db()).users.count_documents({"tenant_id": tenant_id})
    alert_count = await tenant_db.alerts.count_documents({})
    
    limits = PLAN_CONFIGS[tenant.plan]
    
    return {
        "devices": {
            "current": device_count,
            "max": limits.max_devices,
            "online": online_count,
            "offline": device_count - online_count
        },
        "users": {
            "current": user_count,
            "max": limits.max_users
        },
        "verifications": {
            "today": tenant.verifications_today,
            "max_per_day": limits.max_verifications_per_day
        },
        "alerts_total": alert_count,
        "plan": tenant.plan.value,
        "features": {
            "export": limits.can_export,
            "api": limits.can_use_api,
            "custom_alerts": limits.can_custom_alerts,
            "public_dashboard": limits.can_public_dashboard,
            "email_alerts": limits.email_alerts,
            "whatsapp_alerts": limits.whatsapp_alerts
        }
    }
