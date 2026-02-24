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
    if should_filter_by_tenant(current_user):
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
async def create_group(data: GroupCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    # Verify organization exists
    org = await organizations_collection.find_one({"id": data.organization_id})
    if not org:
        raise HTTPException(status_code=400, detail="La organización no existe")
    
    group = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "organization_id": data.organization_id,
        "description": data.description or "",
        "color": data.color or "#22c55e",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await groups_collection.insert_one(group)
    group.pop("_id", None)
    return {"group": group}

@router.put("/groups/{group_id}")
async def update_group(group_id: str, data: GroupUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
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
async def delete_group(group_id: str, current_user: dict = Depends(require_role(["admin"]))):
    # Check if group has devices
    device_count = await devices_collection.count_documents({"group_id": group_id})
    if device_count > 0:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar: tiene {device_count} dispositivos asociados")
    result = await groups_collection.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return {"message": "Grupo eliminado"}
