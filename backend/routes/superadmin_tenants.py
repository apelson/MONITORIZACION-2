"""
Super Admin routes for main platform multi-tenancy management
Manages tenant_admin users, organization assignments, and feature flags
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

from config import users_collection, organizations_collection, groups_collection, devices_collection
from services.auth_service import get_password_hash, get_current_user, require_role

router = APIRouter(prefix="/admin/tenants", tags=["Admin - Tenant Management"])

# Default feature flags - all enabled by default
DEFAULT_FEATURE_FLAGS = {
    "devices": True,       # Dispositivos/Cámaras
    "alerts": True,        # Alertas
    "cra": True,           # CRA (Central Receptora de Alarmas)
    "dahua": True,         # Grabadores DVR/NVR Dahua
    "live_view": True,     # Vista en directo
    "incidents": True,     # Incidencias
    "reports": True,       # Reportes y estadísticas
    "ai_insights": True,   # Panel AI Insights
    "gallery": True,       # Galería de imágenes
}


class FeatureFlags(BaseModel):
    """Feature flags for tenant access control"""
    devices: bool = True
    alerts: bool = True
    cra: bool = True
    dahua: bool = True
    live_view: bool = True
    incidents: bool = True
    reports: bool = True
    ai_insights: bool = True
    gallery: bool = True


class TenantAdminCreate(BaseModel):
    """Create a new tenant admin user"""
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    organization_ids: List[str] = []
    feature_flags: Optional[FeatureFlags] = None


class TenantAdminUpdate(BaseModel):
    """Update tenant admin user"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    organization_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    feature_flags: Optional[FeatureFlags] = None


class SetPasswordRequest(BaseModel):
    new_password: str


class UpdateFeatureFlagsRequest(BaseModel):
    feature_flags: FeatureFlags


# ============ STATS ============

@router.get("/stats")
async def get_platform_stats(current_user: dict = Depends(require_role(["admin"]))):
    """Get overall platform statistics for super admin dashboard"""
    
    # Count users by role
    total_users = await users_collection.count_documents({})
    admin_users = await users_collection.count_documents({"role": "admin"})
    tenant_admin_users = await users_collection.count_documents({"role": "tenant_admin"})
    other_users = total_users - admin_users - tenant_admin_users
    
    # Count organizations and their assignments
    total_orgs = await organizations_collection.count_documents({})
    
    # Count organizations that have at least one tenant_admin assigned
    tenant_admins = await users_collection.find({"role": "tenant_admin"}).to_list(length=None)
    assigned_org_ids = set()
    for ta in tenant_admins:
        assigned_org_ids.update(ta.get("organization_ids", []))
    assigned_orgs = len(assigned_org_ids)
    unassigned_orgs = total_orgs - assigned_orgs
    
    # Count groups and devices
    total_groups = await groups_collection.count_documents({})
    total_devices = await devices_collection.count_documents({})
    online_devices = await devices_collection.count_documents({"status": "online"})
    offline_devices = await devices_collection.count_documents({"status": "offline"})
    
    return {
        "users": {
            "total": total_users,
            "admins": admin_users,
            "tenant_admins": tenant_admin_users,
            "others": other_users
        },
        "organizations": {
            "total": total_orgs,
            "assigned": assigned_orgs,
            "unassigned": unassigned_orgs
        },
        "groups": {
            "total": total_groups
        },
        "devices": {
            "total": total_devices,
            "online": online_devices,
            "offline": offline_devices
        }
    }


# ============ TENANT ADMINS ============

@router.get("/tenant-admins")
async def get_tenant_admins(current_user: dict = Depends(require_role(["admin"]))):
    """List all tenant admin users with their assigned organizations"""
    
    tenant_admins = await users_collection.find(
        {"role": "tenant_admin"},
        {"_id": 0, "password_hash": 0}
    ).to_list(length=None)
    
    # Enrich with organization names
    for ta in tenant_admins:
        org_ids = ta.get("organization_ids", [])
        if org_ids:
            orgs = await organizations_collection.find(
                {"id": {"$in": org_ids}},
                {"_id": 0, "id": 1, "name": 1}
            ).to_list(length=None)
            ta["organizations"] = orgs
        else:
            ta["organizations"] = []
        
        # Count resources in their tenant
        group_ids = []
        if org_ids:
            groups = await groups_collection.find(
                {"organization_id": {"$in": org_ids}},
                {"id": 1}
            ).to_list(length=None)
            group_ids = [g["id"] for g in groups]
        
        device_count = 0
        if group_ids:
            device_count = await devices_collection.count_documents({"group_id": {"$in": group_ids}})
        
        ta["stats"] = {
            "organizations": len(org_ids),
            "groups": len(group_ids),
            "devices": device_count
        }
    
    return {"tenant_admins": tenant_admins, "total": len(tenant_admins)}


@router.post("/tenant-admins")
async def create_tenant_admin(
    data: TenantAdminCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Create a new tenant admin user"""
    
    # Check username doesn't exist
    existing = await users_collection.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    # Check email doesn't exist
    existing_email = await users_collection.find_one({"email": data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Validate organization IDs exist
    if data.organization_ids:
        for org_id in data.organization_ids:
            org = await organizations_collection.find_one({"id": org_id})
            if not org:
                raise HTTPException(status_code=400, detail=f"Organización no encontrada: {org_id}")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "username": data.username,
        "email": data.email,
        "password_hash": get_password_hash(data.password),
        "role": "tenant_admin",
        "full_name": data.full_name or "",
        "is_active": True,
        "organization_ids": data.organization_ids,
        "tenant_id": f"tenant_{data.username}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    await users_collection.insert_one(user)
    
    # Return without sensitive data
    user.pop("_id", None)
    user.pop("password_hash", None)
    
    # Add organization names
    if data.organization_ids:
        orgs = await organizations_collection.find(
            {"id": {"$in": data.organization_ids}},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(length=None)
        user["organizations"] = orgs
    else:
        user["organizations"] = []
    
    return {"message": "Usuario tenant_admin creado", "user": user}


@router.get("/tenant-admins/{user_id}")
async def get_tenant_admin(
    user_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Get detailed information about a tenant admin"""
    
    user = await users_collection.find_one(
        {"id": user_id, "role": "tenant_admin"},
        {"_id": 0, "password_hash": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario tenant_admin no encontrado")
    
    # Get organizations
    org_ids = user.get("organization_ids", [])
    orgs = []
    if org_ids:
        orgs = await organizations_collection.find(
            {"id": {"$in": org_ids}},
            {"_id": 0}
        ).to_list(length=None)
        
        # Add group count to each org
        for org in orgs:
            org["group_count"] = await groups_collection.count_documents({"organization_id": org["id"]})
    
    user["organizations"] = orgs
    
    # Get groups
    groups = []
    group_ids = []
    if org_ids:
        groups = await groups_collection.find(
            {"organization_id": {"$in": org_ids}},
            {"_id": 0}
        ).to_list(length=None)
        group_ids = [g["id"] for g in groups]
        
        # Add device count to each group
        for group in groups:
            group["device_count"] = await devices_collection.count_documents({"group_id": group["id"]})
    
    user["groups"] = groups
    
    # Get device stats
    device_stats = {"total": 0, "online": 0, "offline": 0}
    if group_ids:
        device_stats["total"] = await devices_collection.count_documents({"group_id": {"$in": group_ids}})
        device_stats["online"] = await devices_collection.count_documents({"group_id": {"$in": group_ids}, "status": "online"})
        device_stats["offline"] = await devices_collection.count_documents({"group_id": {"$in": group_ids}, "status": "offline"})
    
    user["device_stats"] = device_stats
    
    return user


@router.put("/tenant-admins/{user_id}")
async def update_tenant_admin(
    user_id: str,
    data: TenantAdminUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Update a tenant admin user"""
    
    user = await users_collection.find_one({"id": user_id, "role": "tenant_admin"})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario tenant_admin no encontrado")
    
    update_data = {}
    
    if data.email is not None:
        # Check email not taken by another user
        existing = await users_collection.find_one({"email": data.email, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado")
        update_data["email"] = data.email
    
    if data.full_name is not None:
        update_data["full_name"] = data.full_name
    
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    if data.organization_ids is not None:
        # Validate all org IDs exist
        for org_id in data.organization_ids:
            org = await organizations_collection.find_one({"id": org_id})
            if not org:
                raise HTTPException(status_code=400, detail=f"Organización no encontrada: {org_id}")
        update_data["organization_ids"] = data.organization_ids
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await users_collection.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "Usuario actualizado", "updated_fields": list(update_data.keys())}


@router.post("/tenant-admins/{user_id}/set-password")
async def set_tenant_admin_password(
    user_id: str,
    data: SetPasswordRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Set a new password for a tenant admin"""
    
    user = await users_collection.find_one({"id": user_id, "role": "tenant_admin"})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario tenant_admin no encontrado")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    await users_collection.update_one(
        {"id": user_id},
        {"$set": {"password_hash": get_password_hash(data.new_password)}}
    )
    
    return {"message": "Contraseña actualizada"}


@router.delete("/tenant-admins/{user_id}")
async def delete_tenant_admin(
    user_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Delete a tenant admin user"""
    
    user = await users_collection.find_one({"id": user_id, "role": "tenant_admin"})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario tenant_admin no encontrado")
    
    # Prevent deleting yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    await users_collection.delete_one({"id": user_id})
    
    return {"message": "Usuario eliminado"}


# ============ ORGANIZATIONS (for assignment) ============

@router.get("/organizations")
async def get_all_organizations(current_user: dict = Depends(require_role(["admin"]))):
    """Get all organizations for assignment to tenant admins"""
    
    orgs = await organizations_collection.find({}, {"_id": 0}).to_list(length=None)
    
    # Check which orgs are assigned to tenant_admins
    tenant_admins = await users_collection.find(
        {"role": "tenant_admin"},
        {"organization_ids": 1, "username": 1}
    ).to_list(length=None)
    
    # Create a map of org_id -> assigned users
    org_assignments = {}
    for ta in tenant_admins:
        for org_id in ta.get("organization_ids", []):
            if org_id not in org_assignments:
                org_assignments[org_id] = []
            org_assignments[org_id].append(ta["username"])
    
    # Enrich organizations
    for org in orgs:
        org["group_count"] = await groups_collection.count_documents({"organization_id": org["id"]})
        org["assigned_to"] = org_assignments.get(org["id"], [])
        org["is_assigned"] = len(org["assigned_to"]) > 0
    
    return {"organizations": orgs, "total": len(orgs)}


@router.post("/tenant-admins/{user_id}/assign-organization/{org_id}")
async def assign_organization(
    user_id: str,
    org_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Assign an organization to a tenant admin"""
    
    user = await users_collection.find_one({"id": user_id, "role": "tenant_admin"})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario tenant_admin no encontrado")
    
    org = await organizations_collection.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    
    current_orgs = user.get("organization_ids", [])
    if org_id in current_orgs:
        raise HTTPException(status_code=400, detail="La organización ya está asignada")
    
    current_orgs.append(org_id)
    
    await users_collection.update_one(
        {"id": user_id},
        {"$set": {"organization_ids": current_orgs}}
    )
    
    return {"message": f"Organización '{org['name']}' asignada al usuario"}


@router.delete("/tenant-admins/{user_id}/assign-organization/{org_id}")
async def unassign_organization(
    user_id: str,
    org_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Remove an organization from a tenant admin"""
    
    user = await users_collection.find_one({"id": user_id, "role": "tenant_admin"})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario tenant_admin no encontrado")
    
    current_orgs = user.get("organization_ids", [])
    if org_id not in current_orgs:
        raise HTTPException(status_code=400, detail="La organización no está asignada a este usuario")
    
    current_orgs.remove(org_id)
    
    await users_collection.update_one(
        {"id": user_id},
        {"$set": {"organization_ids": current_orgs}}
    )
    
    return {"message": "Organización desasignada del usuario"}
