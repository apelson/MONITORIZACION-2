"""
Organization and Group routes
With multi-tenancy support for filtering by user's tenant
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from config import organizations_collection, groups_collection, devices_collection
from models import OrganizationCreate, OrganizationUpdate, GroupCreate, GroupUpdate
from services.auth_service import get_current_user, require_role
from services.multitenancy_service import (
    build_organization_filter, build_group_filter, should_filter_by_tenant
)

router = APIRouter(tags=["organizations"])

# ============ ORGANIZATIONS ============

@router.get("/organizations")
async def get_organizations(current_user: dict = Depends(get_current_user)):
    # Apply multi-tenancy filter
    org_filter = await build_organization_filter(current_user)
    orgs = await organizations_collection.find(org_filter, {"_id": 0}).to_list(length=None)
    for org in orgs:
        org["group_count"] = await groups_collection.count_documents({"organization_id": org["id"]})
    return {"organizations": orgs}

@router.post("/organizations")
async def create_organization(data: OrganizationCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    # Note: tenant_admin cannot create new organizations (only admin can assign them)
    org = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description or "",
        "color": data.color or "#3b82f6",
        "logo_url": data.logo_url or "",
        "country": data.country or "",
        "city": data.city or "",
        "address": data.address or "",
        "postal_code": data.postal_code or "",
        "phone": data.phone or "",
        "contact_email": data.contact_email or "",
        "responsible_name": data.responsible_name or "",
        "responsible_phone": data.responsible_phone or "",
        "responsible_email": data.responsible_email or "",
        "is_cra": data.is_cra or False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await organizations_collection.insert_one(org)
    org.pop("_id", None)
    return {"organization": org}

@router.put("/organizations/{org_id}")
async def update_organization(org_id: str, data: OrganizationUpdate, current_user: dict = Depends(require_role(["admin", "manager", "tenant_admin"]))):
    # Multi-tenancy: tenant_admin can only update their own organizations
    if await should_filter_by_tenant(current_user):
        org_filter = await build_organization_filter(current_user)
        org = await organizations_collection.find_one({"id": org_id, **org_filter})
        if not org:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta organización")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    await organizations_collection.update_one({"id": org_id}, {"$set": update_data})
    return {"message": "Organización actualizada"}

@router.delete("/organizations/{org_id}")
async def delete_organization(org_id: str, current_user: dict = Depends(require_role(["admin"]))):
    # Only admin can delete organizations (not tenant_admin)
    # Check if organization has groups
    group_count = await groups_collection.count_documents({"organization_id": org_id})
    if group_count > 0:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar: tiene {group_count} grupos asociados")
    result = await organizations_collection.delete_one({"id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    return {"message": "Organización eliminada"}


# ============ ORGANIZATION FEATURE FLAGS ============

# Default feature flags for organizations
DEFAULT_ORG_FEATURE_FLAGS = {
    "devices": True,
    "alerts": True,
    "cra": True,
    "dahua": True,
    "live_view": True,
    "incidents": True,
    "reports": True,
    "ai_insights": True,
    "gallery": True,
    "vpn": True,
    "infrastructure": True,
}

@router.get("/organizations/{org_id}/features")
async def get_organization_features(org_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Get feature flags for an organization"""
    org = await organizations_collection.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    
    # Return existing flags or defaults
    features = org.get("feature_flags", DEFAULT_ORG_FEATURE_FLAGS)
    return {"organization_id": org_id, "name": org.get("name"), "feature_flags": features}


@router.put("/organizations/{org_id}/features")
async def update_organization_features(org_id: str, feature_flags: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Update feature flags for an organization (superadmin only)"""
    org = await organizations_collection.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    
    # Validate feature flags
    valid_flags = set(DEFAULT_ORG_FEATURE_FLAGS.keys())
    cleaned_flags = {k: bool(v) for k, v in feature_flags.items() if k in valid_flags}
    
    # Merge with defaults for any missing flags
    final_flags = {**DEFAULT_ORG_FEATURE_FLAGS, **cleaned_flags}
    
    await organizations_collection.update_one(
        {"id": org_id},
        {"$set": {"feature_flags": final_flags, "features_updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Features actualizados", "organization_id": org_id, "feature_flags": final_flags}


@router.get("/organizations/all/features")
async def get_all_organizations_features(current_user: dict = Depends(require_role(["admin"]))):
    """Get all organizations with their feature flags (superadmin dashboard)"""
    orgs = await organizations_collection.find({}, {"_id": 0, "id": 1, "name": 1, "feature_flags": 1}).to_list(length=None)
    
    # Ensure all orgs have feature_flags
    for org in orgs:
        if "feature_flags" not in org:
            org["feature_flags"] = DEFAULT_ORG_FEATURE_FLAGS
    
    return {"organizations": orgs}

# ============ GROUPS ============

@router.get("/groups")
async def get_groups(current_user: dict = Depends(get_current_user)):
    # Apply multi-tenancy filter
    group_filter = await build_group_filter(current_user)
    groups = await groups_collection.find(group_filter, {"_id": 0}).to_list(length=None)
    for group in groups:
        group["device_count"] = await devices_collection.count_documents({"group_id": group["id"]})
    return {"groups": groups}

@router.post("/groups")
async def create_group(data: GroupCreate, current_user: dict = Depends(require_role(["admin", "manager", "tenant_admin"]))):
    # Verify organization exists
    org = await organizations_collection.find_one({"id": data.organization_id})
    if not org:
        raise HTTPException(status_code=400, detail="La organización no existe")
    
    # Multi-tenancy: tenant_admin can only create groups in their organizations
    if await should_filter_by_tenant(current_user):
        org_filter = await build_organization_filter(current_user)
        org = await organizations_collection.find_one({"id": data.organization_id, **org_filter})
        if not org:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta organización")
    
    group = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "organization_id": data.organization_id,
        "description": data.description or "",
        "color": data.color or "#22c55e",
        "island": data.island or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await groups_collection.insert_one(group)
    group.pop("_id", None)
    return {"group": group}

@router.put("/groups/{group_id}")
async def update_group(group_id: str, data: GroupUpdate, current_user: dict = Depends(require_role(["admin", "manager", "tenant_admin"]))):
    # Multi-tenancy: verify access to this group
    if await should_filter_by_tenant(current_user):
        group_filter = await build_group_filter(current_user)
        group = await groups_collection.find_one({"id": group_id, **group_filter})
        if not group:
            raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    if "organization_id" in update_data:
        org = await organizations_collection.find_one({"id": update_data["organization_id"]})
        if not org:
            raise HTTPException(status_code=400, detail="La organización no existe")
    await groups_collection.update_one({"id": group_id}, {"$set": update_data})
    return {"message": "Grupo actualizado"}

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(require_role(["admin", "tenant_admin"]))):
    # Multi-tenancy: verify access to delete this group
    if await should_filter_by_tenant(current_user):
        group_filter = await build_group_filter(current_user)
        group = await groups_collection.find_one({"id": group_id, **group_filter})
        if not group:
            raise HTTPException(status_code=403, detail="No tienes acceso a eliminar este grupo")
    
    # Check if group has devices
    device_count = await devices_collection.count_documents({"group_id": group_id})
    if device_count > 0:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar: tiene {device_count} dispositivos asociados")
    result = await groups_collection.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return {"message": "Grupo eliminado"}
