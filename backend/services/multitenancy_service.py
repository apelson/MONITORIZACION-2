"""
Multi-tenancy service for data filtering based on user role and tenant
This is for the MAIN platform (not SaaS), where:
- admin: sees ALL data across all tenants
- tenant_admin: sees only data from their assigned tenant (organization_ids)
- manager/operator/etc: filtered by their group_ids or organization_ids
"""
from typing import Optional, List, Dict, Any
from config import (
    organizations_collection, groups_collection, devices_collection, roles_collection
)

# Try to import dahua_devices_collection safely
dahua_devices_collection = None
try:
    from services.dahua_service import dahua_devices_collection
except ImportError:
    pass


async def _get_role_access(user: dict) -> dict:
    """Get the role's access config (group_access, organization_access) from roles collection."""
    if not roles_collection:
        return {}
    role_id = user.get("role_id") or user.get("role", "")
    if not role_id:
        return {}
    role = await roles_collection.find_one({"id": role_id}, {"_id": 0, "group_access": 1, "organization_access": 1})
    return role or {}


async def get_user_organization_ids(user: dict) -> List[str]:
    """
    Get the list of organization IDs that a user has access to.
    - admin: all organizations (returns empty list to indicate "all")
    - roles with organization_access "all": same as admin
    - tenant_admin: only their assigned organization_ids
    - others: based on their organization_ids or group memberships
    """
    role = user.get("role", "")
    
    # Admin sees everything - return empty list as a signal to not filter
    if role == "admin":
        return []
    
    # Check if user's role has organization_access "all"
    role_access = await _get_role_access(user)
    if role_access.get("organization_access") == "all":
        return []
    
    # tenant_admin sees only their assigned organizations
    if role == "tenant_admin":
        return user.get("organization_ids", [])
    
    # Other roles - check organization_ids or derive from group_ids
    org_ids = user.get("organization_ids", [])
    if org_ids:
        return org_ids
    
    # If user has group_ids, get their organization IDs
    group_ids = user.get("group_ids", [])
    if group_ids:
        groups = await groups_collection.find(
            {"id": {"$in": group_ids}},
            {"organization_id": 1}
        ).to_list(length=None)
        return list(set(g["organization_id"] for g in groups if g.get("organization_id")))
    
    return []


async def get_user_group_ids(user: dict) -> List[str]:
    """
    Get the list of group IDs that a user has access to.
    """
    role = user.get("role", "")
    
    # Admin sees everything
    if role == "admin":
        return []
    
    # Check if user's role has group_access "all"
    role_access = await _get_role_access(user)
    if role_access.get("group_access") == "all":
        return []
    
    # tenant_admin: get all groups from their organizations
    if role == "tenant_admin":
        org_ids = user.get("organization_ids", [])
        if not org_ids:
            return []
        groups = await groups_collection.find(
            {"organization_id": {"$in": org_ids}},
            {"id": 1}
        ).to_list(length=None)
        return [g["id"] for g in groups]
    
    # Other roles
    return user.get("group_ids", [])


async def should_filter_by_tenant(user: dict) -> bool:
    """
    Determine if data should be filtered for this user.
    Returns False for admin or roles with 'all' access, True for others.
    """
    if user.get("role") == "admin":
        return False
    
    # Check if the user's role has group_access or organization_access "all"
    role_access = await _get_role_access(user)
    if role_access.get("group_access") == "all" or role_access.get("organization_access") == "all":
        return False
    
    return True


async def build_organization_filter(user: dict) -> Dict[str, Any]:
    """
    Build a MongoDB filter for organizations based on user access.
    Returns {} for admin (no filter), or {"id": {"$in": [...]}} for others.
    """
    if not await should_filter_by_tenant(user):
        return {}
    
    org_ids = await get_user_organization_ids(user)
    if not org_ids:
        # User has no assigned organizations - return impossible filter
        return {"id": {"$in": []}}
    
    return {"id": {"$in": org_ids}}


async def build_group_filter(user: dict) -> Dict[str, Any]:
    """
    Build a MongoDB filter for groups based on user access.
    """
    if not await should_filter_by_tenant(user):
        return {}
    
    org_ids = await get_user_organization_ids(user)
    if not org_ids:
        return {"id": {"$in": []}}
    
    return {"organization_id": {"$in": org_ids}}


async def build_device_filter(user: dict, extra_filter: dict = None) -> Dict[str, Any]:
    """
    Build a MongoDB filter for devices based on user access.
    Devices are linked to groups, which are linked to organizations.
    """
    base_filter = extra_filter.copy() if extra_filter else {}
    
    if not await should_filter_by_tenant(user):
        return base_filter
    
    # Get group IDs the user can access
    group_ids = await get_user_group_ids(user)
    if not group_ids:
        # No access to any groups - return impossible filter
        base_filter["group_id"] = {"$in": []}
        return base_filter
    
    base_filter["group_id"] = {"$in": group_ids}
    return base_filter


async def build_alert_filter(user: dict, extra_filter: dict = None) -> Dict[str, Any]:
    """
    Build a MongoDB filter for alerts based on user access.
    Alerts are linked to devices, so we need to get accessible device IDs.
    """
    base_filter = extra_filter.copy() if extra_filter else {}
    
    if not await should_filter_by_tenant(user):
        return base_filter
    
    # Get device IDs the user can access
    device_filter = await build_device_filter(user)
    if "group_id" in device_filter and device_filter["group_id"].get("$in") == []:
        # No access to any devices
        base_filter["device_id"] = {"$in": []}
        return base_filter
    
    # Get all device IDs for the user's groups
    devices = await devices_collection.find(
        device_filter,
        {"id": 1}
    ).to_list(length=None)
    
    device_ids = [d["id"] for d in devices]
    if not device_ids:
        base_filter["device_id"] = {"$in": []}
        return base_filter
    
    base_filter["device_id"] = {"$in": device_ids}
    return base_filter


async def build_dahua_device_filter(user: dict, extra_filter: dict = None) -> Dict[str, Any]:
    """
    Build a MongoDB filter for Dahua devices based on user access.
    Dahua devices have organization_id directly.
    """
    base_filter = extra_filter.copy() if extra_filter else {}
    
    if not await should_filter_by_tenant(user):
        return base_filter
    
    org_ids = await get_user_organization_ids(user)
    if not org_ids:
        base_filter["organization_id"] = {"$in": []}
        return base_filter
    
    base_filter["organization_id"] = {"$in": org_ids}
    return base_filter


async def filter_response_list(items: List[dict], user: dict, id_field: str = "organization_id") -> List[dict]:
    """
    Filter a list of items based on user access.
    Useful for filtering response data that's already been fetched.
    """
    if not await should_filter_by_tenant(user):
        return items
    
    org_ids = await get_user_organization_ids(user)
    if not org_ids:
        return []
    
    return [item for item in items if item.get(id_field) in org_ids]


async def get_tenant_stats_for_user(user: dict) -> Dict[str, int]:
    """
    Get device/organization/group counts for a user's tenant.
    """
    if not await should_filter_by_tenant(user):
        # Admin - get all stats
        total_devices = await devices_collection.count_documents({})
        online_devices = await devices_collection.count_documents({"status": "online"})
        offline_devices = await devices_collection.count_documents({"status": "offline"})
        total_orgs = await organizations_collection.count_documents({})
        total_groups = await groups_collection.count_documents({})
    else:
        # Filtered stats
        org_filter = await build_organization_filter(user)
        group_filter = await build_group_filter(user)
        device_filter = await build_device_filter(user)
        
        total_devices = await devices_collection.count_documents(device_filter)
        online_devices = await devices_collection.count_documents({**device_filter, "status": "online"})
        offline_devices = await devices_collection.count_documents({**device_filter, "status": "offline"})
        total_orgs = await organizations_collection.count_documents(org_filter)
        total_groups = await groups_collection.count_documents(group_filter)
    
    return {
        "total_devices": total_devices,
        "online": online_devices,
        "offline": offline_devices,
        "organizations": total_orgs,
        "groups": total_groups
    }
