"""
Integrated Super Admin Routes
Allows main app admin to manage tenants/companies
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import hashlib

from config import db, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])

# Collections
tenants_collection = db["tenants"]
tenant_users_collection = db["tenant_users"]

# ============ MODELS ============
class TenantCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    email: str
    admin_username: str
    admin_password: str
    plan: Optional[str] = "free"

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None

# ============ HELPER FUNCTIONS ============
def require_super_admin(current_user: dict):
    """Check if user has super admin privileges"""
    # For now, any admin of the main app can be super admin
    # In production, you'd have a specific "is_super_admin" field
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Se requiere permisos de Super Admin")
    return current_user

def hash_password(password: str) -> str:
    """Simple password hashing (use bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()

# ============ ENDPOINTS ============
@router.get("/stats")
async def get_global_stats(current_user: dict = Depends(get_current_user)):
    """Get global statistics across all tenants"""
    require_super_admin(current_user)
    
    total_tenants = await tenants_collection.count_documents({})
    active_tenants = await tenants_collection.count_documents({"is_active": True})
    total_users = await tenant_users_collection.count_documents({})
    
    # Count devices across all tenant databases
    total_devices = 0
    tenants = await tenants_collection.find({}, {"id": 1, "slug": 1}).to_list(100)
    for tenant in tenants:
        try:
            tenant_db = db.client[f"tenant_{tenant.get('slug', tenant['id'])}"]
            count = await tenant_db.devices.count_documents({})
            total_devices += count
        except Exception:
            pass
    
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_users": total_users,
        "total_devices": total_devices
    }

@router.get("/tenants")
async def list_tenants(current_user: dict = Depends(get_current_user)):
    """List all tenants"""
    require_super_admin(current_user)
    
    tenants = await tenants_collection.find({}, {"_id": 0}).to_list(100)
    
    # Add stats for each tenant
    enriched = []
    for tenant in tenants:
        tenant_id = tenant.get("id")
        slug = tenant.get("slug", tenant_id)
        
        # Get user count
        user_count = await tenant_users_collection.count_documents({"tenant_id": tenant_id})
        
        # Get device count from tenant database
        device_count = 0
        try:
            tenant_db = db.client[f"tenant_{slug}"]
            device_count = await tenant_db.devices.count_documents({})
        except Exception:
            pass
        
        enriched.append({
            **tenant,
            "stats": {
                "users": user_count,
                "devices": device_count
            }
        })
    
    return {"tenants": enriched, "total": len(enriched)}

@router.get("/tenants/{tenant_id}")
async def get_tenant_details(tenant_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed information about a tenant"""
    require_super_admin(current_user)
    
    tenant = await tenants_collection.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Get users
    users = await tenant_users_collection.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    # Get stats from tenant database
    slug = tenant.get("slug", tenant_id)
    stats = {"devices": 0, "alerts": 0, "groups": 0}
    try:
        tenant_db = db.client[f"tenant_{slug}"]
        stats["devices"] = await tenant_db.devices.count_documents({})
        stats["alerts"] = await tenant_db.alerts.count_documents({})
        stats["groups"] = await tenant_db.groups.count_documents({})
    except Exception:
        pass
    
    return {
        "tenant": tenant,
        "users": users,
        "stats": stats
    }

@router.post("/tenants")
async def create_tenant(data: TenantCreate, current_user: dict = Depends(get_current_user)):
    """Create a new tenant/company"""
    require_super_admin(current_user)
    
    # Generate slug if not provided
    slug = data.slug or data.name.lower().replace(" ", "-").replace(".", "")
    
    # Check if slug already exists
    existing = await tenants_collection.find_one({"$or": [{"slug": slug}, {"email": data.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese nombre o email")
    
    tenant_id = str(uuid.uuid4())[:8]
    
    # Create tenant record
    tenant = {
        "id": tenant_id,
        "name": data.name,
        "slug": slug,
        "email": data.email,
        "plan": data.plan,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("username", "superadmin")
    }
    
    await tenants_collection.insert_one(tenant)
    
    # Create admin user for the tenant
    admin_user = {
        "id": str(uuid.uuid4())[:8],
        "tenant_id": tenant_id,
        "username": data.admin_username,
        "email": data.email,
        "password_hash": hash_password(data.admin_password),
        "role": "admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await tenant_users_collection.insert_one(admin_user)
    
    # Create tenant database and initialize collections
    tenant_db = db.client[f"tenant_{slug}"]
    await tenant_db.devices.insert_one({"_init": True})
    await tenant_db.devices.delete_one({"_init": True})
    await tenant_db.alerts.insert_one({"_init": True})
    await tenant_db.alerts.delete_one({"_init": True})
    await tenant_db.groups.insert_one({"_init": True})
    await tenant_db.groups.delete_one({"_init": True})
    
    logger.info(f"Tenant created: {data.name} by {current_user.get('username')}")
    
    return {
        "message": "Empresa creada correctamente",
        "tenant": {k: v for k, v in tenant.items() if k != "_id"}
    }

@router.patch("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, current_user: dict = Depends(get_current_user)):
    """Update tenant details"""
    require_super_admin(current_user)
    
    tenant = await tenants_collection.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await tenants_collection.update_one({"id": tenant_id}, {"$set": update_data})
    
    return {"message": "Empresa actualizada"}

@router.post("/tenants/{tenant_id}/suspend")
async def suspend_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    """Suspend a tenant"""
    require_super_admin(current_user)
    
    result = await tenants_collection.update_one(
        {"id": tenant_id},
        {"$set": {"is_active": False, "suspended_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    return {"message": "Empresa suspendida"}

@router.post("/tenants/{tenant_id}/activate")
async def activate_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    """Activate a suspended tenant"""
    require_super_admin(current_user)
    
    result = await tenants_collection.update_one(
        {"id": tenant_id},
        {"$set": {"is_active": True}, "$unset": {"suspended_at": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    return {"message": "Empresa activada"}

@router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a tenant and all its data"""
    require_super_admin(current_user)
    
    tenant = await tenants_collection.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Delete tenant users
    await tenant_users_collection.delete_many({"tenant_id": tenant_id})
    
    # Delete tenant database
    slug = tenant.get("slug", tenant_id)
    try:
        await db.client.drop_database(f"tenant_{slug}")
    except Exception as e:
        logger.error(f"Error dropping tenant database: {e}")
    
    # Delete tenant record
    await tenants_collection.delete_one({"id": tenant_id})
    
    logger.info(f"Tenant deleted: {tenant['name']} by {current_user.get('username')}")
    
    return {"message": "Empresa eliminada"}
