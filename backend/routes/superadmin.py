"""
Super Admin routes for managing all tenants
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

from services.tenant_service import (
    list_all_tenants, get_tenant_by_id, get_tenant_stats,
    update_tenant_plan, get_master_db
)
from models.tenant import PlanType
from routes.tenant_auth import get_current_tenant_user

router = APIRouter(prefix="/saas/admin", tags=["Super Admin"])

# Super admin credentials (should be in env vars in production)
SUPER_ADMIN_TENANT_ID = "siempria_master"

def require_super_admin():
    """Dependency to require super admin access"""
    async def checker(current: dict = Depends(get_current_tenant_user)):
        # Check if user is from the master tenant or has super_admin role
        tenant = current["tenant"]
        user = current["user"]
        
        # You can configure which tenant/user is super admin
        if user.get("role") != "super_admin" and tenant.slug != "siempria":
            raise HTTPException(status_code=403, detail="Acceso denegado. Se requiere Super Admin.")
        return current
    return checker

class UpdatePlanRequest(BaseModel):
    plan: PlanType

class UpdateTenantRequest(BaseModel):
    is_active: Optional[bool] = None
    plan: Optional[PlanType] = None
    subscription_end: Optional[datetime] = None

# ============ ROUTES ============

@router.get("/tenants")
async def list_tenants(current: dict = Depends(require_super_admin())):
    """List all tenants in the system"""
    tenants = await list_all_tenants()
    
    # Add stats for each tenant
    enriched = []
    for t in tenants:
        stats = await get_tenant_stats(t["id"])
        enriched.append({
            **t,
            "stats": stats
        })
    
    return {"tenants": enriched, "total": len(enriched)}

@router.get("/tenants/{tenant_id}")
async def get_tenant_details(
    tenant_id: str, 
    current: dict = Depends(require_super_admin())
):
    """Get detailed information about a tenant"""
    tenant = await get_tenant_by_id(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    
    stats = await get_tenant_stats(tenant_id)
    
    # Get users for this tenant
    master_db = get_master_db()
    users = await master_db.users.find(
        {"tenant_id": tenant_id}, 
        {"_id": 0, "password_hash": 0}
    ).to_list(length=None)
    
    return {
        "tenant": tenant.model_dump(),
        "stats": stats,
        "users": users
    }

@router.patch("/tenants/{tenant_id}")
async def update_tenant(
    tenant_id: str,
    data: UpdateTenantRequest,
    current: dict = Depends(require_super_admin())
):
    """Update tenant settings (plan, active status, etc.)"""
    master_db = get_master_db()
    
    tenant = await get_tenant_by_id(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    if data.plan is not None:
        update_data["plan"] = data.plan.value
    
    if data.subscription_end is not None:
        update_data["subscription_end"] = data.subscription_end
    
    await master_db.tenants.update_one(
        {"id": tenant_id},
        {"$set": update_data}
    )
    
    return {"message": "Tenant actualizado", "updated_fields": list(update_data.keys())}

@router.post("/tenants/{tenant_id}/suspend")
async def suspend_tenant(
    tenant_id: str,
    current: dict = Depends(require_super_admin())
):
    """Suspend a tenant account"""
    master_db = get_master_db()
    
    result = await master_db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    
    return {"message": "Tenant suspendido"}

@router.post("/tenants/{tenant_id}/activate")
async def activate_tenant(
    tenant_id: str,
    current: dict = Depends(require_super_admin())
):
    """Activate a suspended tenant account"""
    master_db = get_master_db()
    
    result = await master_db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    
    return {"message": "Tenant activado"}

@router.get("/stats")
async def get_platform_stats(current: dict = Depends(require_super_admin())):
    """Get overall platform statistics"""
    master_db = get_master_db()
    
    total_tenants = await master_db.tenants.count_documents({})
    active_tenants = await master_db.tenants.count_documents({"is_active": True})
    total_users = await master_db.users.count_documents({})
    
    # Count by plan
    plan_counts = {}
    for plan in PlanType:
        count = await master_db.tenants.count_documents({"plan": plan.value})
        plan_counts[plan.value] = count
    
    # Recent registrations (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc).replace(day=1)
    recent_tenants = await master_db.tenants.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    return {
        "tenants": {
            "total": total_tenants,
            "active": active_tenants,
            "suspended": total_tenants - active_tenants,
            "new_this_month": recent_tenants
        },
        "users": {
            "total": total_users
        },
        "plans": plan_counts
    }

@router.delete("/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    confirm: bool = False,
    current: dict = Depends(require_super_admin())
):
    """Delete a tenant and all their data (DANGEROUS)"""
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Añade ?confirm=true para confirmar la eliminación"
        )
    
    master_db = get_master_db()
    
    # Get tenant info
    tenant = await get_tenant_by_id(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    
    # Delete tenant database
    from motor.motor_asyncio import AsyncIOMotorClient
    from config import mongo_url
    client = AsyncIOMotorClient(mongo_url)
    await client.drop_database(f"tenant_{tenant.slug}")
    
    # Delete users
    await master_db.users.delete_many({"tenant_id": tenant_id})
    
    # Delete tenant record
    await master_db.tenants.delete_one({"id": tenant_id})
    
    return {"message": f"Tenant '{tenant.name}' eliminado completamente"}
