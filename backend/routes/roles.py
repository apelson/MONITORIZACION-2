"""
Role-based Permission System Routes
Manages roles, permissions, and access control
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
from config import roles_collection, users_collection, logger
from services.auth_service import get_current_user
import uuid

router = APIRouter(prefix="/roles", tags=["roles"])

# ============ PERMISSION DEFINITIONS ============
# All available permissions in the system
AVAILABLE_PERMISSIONS = {
    "devices": {
        "name": "Dispositivos",
        "permissions": ["view", "edit", "delete", "create"]
    },
    "gallery": {
        "name": "Galería",
        "permissions": ["view", "upload", "delete"]
    },
    "cra": {
        "name": "Panel CRA",
        "permissions": ["view", "manage"]
    },
    "live": {
        "name": "Vista en Directo",
        "permissions": ["view"]
    },
    "statistics": {
        "name": "Estadísticas",
        "permissions": ["view", "export"]
    },
    "alerts": {
        "name": "Alertas",
        "permissions": ["view", "acknowledge", "delete"]
    },
    "users": {
        "name": "Usuarios",
        "permissions": ["view", "edit", "delete", "create"]
    },
    "settings": {
        "name": "Configuración",
        "permissions": ["view", "edit"]
    },
    "export": {
        "name": "Exportar Datos",
        "permissions": ["pdf", "excel", "csv"]
    },
    "organizations": {
        "name": "Organizaciones",
        "permissions": ["view", "edit", "delete", "create"]
    },
    "groups": {
        "name": "Grupos",
        "permissions": ["view", "edit", "delete", "create"]
    },
    "reports": {
        "name": "Informes",
        "permissions": ["view", "create", "schedule"]
    },
    "incidents": {
        "name": "Incidencias",
        "permissions": ["view", "create", "edit", "delete"]
    },
    "roles": {
        "name": "Roles",
        "permissions": ["view", "edit", "delete", "create"]
    }
}

# Default role templates
DEFAULT_ROLES = [
    {
        "id": "admin",
        "name": "Administrador",
        "description": "Acceso total al sistema",
        "is_system": True,
        "permissions": {section: perms["permissions"] for section, perms in AVAILABLE_PERMISSIONS.items()},
        "group_access": "all",  # "all" or list of group IDs
        "organization_access": "all"
    },
    {
        "id": "technician",
        "name": "Técnico",
        "description": "Acceso técnico para mantenimiento",
        "is_system": True,
        "permissions": {
            "devices": ["view", "edit"],
            "gallery": ["view", "upload"],
            "cra": [],
            "live": ["view"],
            "statistics": ["view"],
            "alerts": ["view", "acknowledge"],
            "users": [],
            "settings": ["view"],
            "export": [],
            "organizations": ["view"],
            "groups": ["view"],
            "reports": ["view"],
            "incidents": ["view", "create", "edit"],
            "roles": []
        },
        "group_access": "all",
        "organization_access": "all"
    },
    {
        "id": "client",
        "name": "Cliente",
        "description": "Solo visualización de sus dispositivos",
        "is_system": True,
        "permissions": {
            "devices": ["view"],
            "gallery": ["view"],
            "cra": [],
            "live": ["view"],
            "statistics": ["view"],
            "alerts": ["view"],
            "users": [],
            "settings": [],
            "export": [],
            "organizations": [],
            "groups": [],
            "reports": ["view"],
            "incidents": ["view", "create"],
            "roles": []
        },
        "group_access": "assigned",  # Only assigned groups
        "organization_access": "assigned"
    },
    {
        "id": "operator",
        "name": "Operador CRA",
        "description": "Monitorización y gestión de alertas CRA",
        "is_system": True,
        "permissions": {
            "devices": ["view"],
            "gallery": ["view"],
            "cra": ["view", "manage"],
            "live": ["view"],
            "statistics": ["view"],
            "alerts": ["view", "acknowledge"],
            "users": [],
            "settings": [],
            "export": [],
            "organizations": ["view"],
            "groups": ["view"],
            "reports": ["view"],
            "incidents": ["view", "create"],
            "roles": []
        },
        "group_access": "all",
        "organization_access": "all"
    }
]

# ============ MODELS ============
class RolePermissions(BaseModel):
    devices: Optional[List[str]] = []
    gallery: Optional[List[str]] = []
    cra: Optional[List[str]] = []
    live: Optional[List[str]] = []
    statistics: Optional[List[str]] = []
    alerts: Optional[List[str]] = []
    users: Optional[List[str]] = []
    settings: Optional[List[str]] = []
    export: Optional[List[str]] = []
    organizations: Optional[List[str]] = []
    groups: Optional[List[str]] = []
    reports: Optional[List[str]] = []
    incidents: Optional[List[str]] = []
    roles: Optional[List[str]] = []

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: Dict[str, List[str]]
    group_access: Optional[str] = "all"  # "all" or "assigned"
    organization_access: Optional[str] = "all"
    allowed_groups: Optional[List[str]] = []  # Specific group IDs if group_access is "assigned"
    allowed_organizations: Optional[List[str]] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict[str, List[str]]] = None
    group_access: Optional[str] = None
    organization_access: Optional[str] = None
    allowed_groups: Optional[List[str]] = None
    allowed_organizations: Optional[List[str]] = None

# ============ ENDPOINTS ============
@router.get("/available-permissions")
async def get_available_permissions(current_user: dict = Depends(get_current_user)):
    """Get all available permissions in the system"""
    return {
        "permissions": AVAILABLE_PERMISSIONS
    }

@router.get("/my-permissions")
async def get_my_permissions(current_user: dict = Depends(get_current_user)):
    """Get permissions for the current user"""
    role = await get_user_role(current_user)
    
    return {
        "user_id": current_user.get("id"),
        "username": current_user.get("username"),
        "role_id": current_user.get("role_id", "admin"),
        "role_name": role.get("name", "Administrador"),
        "permissions": role.get("permissions", {}),
        "group_access": role.get("group_access", "all"),
        "organization_access": role.get("organization_access", "all"),
        "allowed_groups": role.get("allowed_groups", []),
        "allowed_organizations": role.get("allowed_organizations", [])
    }

@router.get("/user/{user_id}/permissions")
async def get_user_permissions(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get all permissions for a specific user"""
    user = await users_collection.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    role = await get_user_role(user)
    
    return {
        "user_id": user_id,
        "username": user.get("username"),
        "role_id": user.get("role_id", "admin"),
        "role_name": role.get("name", "Administrador"),
        "permissions": role.get("permissions", {}),
        "group_access": role.get("group_access", "all"),
        "organization_access": role.get("organization_access", "all"),
        "allowed_groups": role.get("allowed_groups", []),
        "allowed_organizations": role.get("allowed_organizations", [])
    }

@router.get("")
async def get_roles(current_user: dict = Depends(get_current_user)):
    """Get all roles"""
    roles = await roles_collection.find({}, {"_id": 0}).to_list(100)
    
    # If no roles exist, initialize with defaults
    if not roles:
        for role in DEFAULT_ROLES:
            role["created_at"] = datetime.now(timezone.utc).isoformat()
            role["created_by"] = "system"
            await roles_collection.insert_one(role)
        roles = await roles_collection.find({}, {"_id": 0}).to_list(100)
    
    return {"roles": roles}

@router.get("/{role_id}")
async def get_role(role_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific role"""
    role = await roles_collection.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role

@router.post("")
async def create_role(role_data: RoleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new role"""
    # Check if user has permission to create roles
    user_role = await get_user_role(current_user)
    if not has_permission(user_role, "roles", "create"):
        raise HTTPException(status_code=403, detail="No tienes permiso para crear roles")
    
    # Check if role name already exists
    existing = await roles_collection.find_one({"name": role_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un rol con ese nombre")
    
    role = {
        "id": str(uuid.uuid4())[:8],
        "name": role_data.name,
        "description": role_data.description,
        "is_system": False,
        "permissions": role_data.permissions,
        "group_access": role_data.group_access,
        "organization_access": role_data.organization_access,
        "allowed_groups": role_data.allowed_groups,
        "allowed_organizations": role_data.allowed_organizations,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("username", "unknown"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await roles_collection.insert_one(role)
    logger.info(f"Role created: {role['name']} by {current_user.get('username')}")
    
    return {"message": "Rol creado correctamente", "role": {k: v for k, v in role.items() if k != "_id"}}

@router.put("/{role_id}")
async def update_role(role_id: str, role_data: RoleUpdate, current_user: dict = Depends(get_current_user)):
    """Update a role"""
    # Check if user has permission
    user_role = await get_user_role(current_user)
    if not has_permission(user_role, "roles", "edit"):
        raise HTTPException(status_code=403, detail="No tienes permiso para editar roles")
    
    role = await roles_collection.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    # Prevent editing system roles' core permissions
    if role.get("is_system") and role_id == "admin":
        raise HTTPException(status_code=403, detail="No se puede modificar el rol de Administrador")
    
    update_data = {k: v for k, v in role_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = current_user.get("username", "unknown")
    
    await roles_collection.update_one({"id": role_id}, {"$set": update_data})
    logger.info(f"Role updated: {role_id} by {current_user.get('username')}")
    
    updated_role = await roles_collection.find_one({"id": role_id}, {"_id": 0})
    return {"message": "Rol actualizado correctamente", "role": updated_role}

@router.delete("/{role_id}")
async def delete_role(role_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a role"""
    # Check if user has permission
    user_role = await get_user_role(current_user)
    if not has_permission(user_role, "roles", "delete"):
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar roles")
    
    role = await roles_collection.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    if role.get("is_system"):
        raise HTTPException(status_code=403, detail="No se pueden eliminar roles del sistema")
    
    # Check if any users have this role
    users_with_role = await users_collection.count_documents({"role_id": role_id})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Hay {users_with_role} usuarios con este rol. Asígnales otro rol antes de eliminar")
    
    await roles_collection.delete_one({"id": role_id})
    logger.info(f"Role deleted: {role_id} by {current_user.get('username')}")
    
    return {"message": "Rol eliminado correctamente"}

@router.post("/initialize")
async def initialize_default_roles(current_user: dict = Depends(get_current_user)):
    """Initialize or reset default roles"""
    user_role = await get_user_role(current_user)
    if not has_permission(user_role, "roles", "create"):
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    for role in DEFAULT_ROLES:
        existing = await roles_collection.find_one({"id": role["id"]})
        if not existing:
            role["created_at"] = datetime.now(timezone.utc).isoformat()
            role["created_by"] = "system"
            await roles_collection.insert_one(role)
    
    return {"message": "Roles por defecto inicializados"}

# ============ HELPER FUNCTIONS ============
async def get_user_role(user: dict) -> dict:
    """Get the role object for a user"""
    role_id = user.get("role_id", "admin")  # Default to admin for backwards compatibility
    
    # Check if roles collection has data
    count = await roles_collection.count_documents({})
    if count == 0:
        # Initialize default roles
        for role in DEFAULT_ROLES:
            role["created_at"] = datetime.now(timezone.utc).isoformat()
            role["created_by"] = "system"
            await roles_collection.insert_one(role)
    
    role = await roles_collection.find_one({"id": role_id}, {"_id": 0})
    if not role:
        # Fallback to admin if role not found
        role = await roles_collection.find_one({"id": "admin"}, {"_id": 0})
    
    return role or DEFAULT_ROLES[0]

def has_permission(role: dict, section: str, permission: str) -> bool:
    """Check if a role has a specific permission"""
    if not role:
        return False
    
    permissions = role.get("permissions", {})
    section_perms = permissions.get(section, [])
    
    return permission in section_perms

@router.get("/user/{user_id}/permissions")
async def get_user_permissions(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get all permissions for a specific user"""
    user = await users_collection.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    role = await get_user_role(user)
    
    return {
        "user_id": user_id,
        "username": user.get("username"),
        "role_id": user.get("role_id", "admin"),
        "role_name": role.get("name", "Administrador"),
        "permissions": role.get("permissions", {}),
        "group_access": role.get("group_access", "all"),
        "organization_access": role.get("organization_access", "all"),
        "allowed_groups": role.get("allowed_groups", []),
        "allowed_organizations": role.get("allowed_organizations", [])
    }

@router.get("/my-permissions")
async def get_my_permissions(current_user: dict = Depends(get_current_user)):
    """Get permissions for the current user"""
    role = await get_user_role(current_user)
    
    return {
        "user_id": current_user.get("id"),
        "username": current_user.get("username"),
        "role_id": current_user.get("role_id", "admin"),
        "role_name": role.get("name", "Administrador"),
        "permissions": role.get("permissions", {}),
        "group_access": role.get("group_access", "all"),
        "organization_access": role.get("organization_access", "all"),
        "allowed_groups": role.get("allowed_groups", []),
        "allowed_organizations": role.get("allowed_organizations", [])
    }
