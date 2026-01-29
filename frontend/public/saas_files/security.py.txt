"""
Security routes for managing IP blocking and security settings
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional

from services.auth_service import require_role
from services.security_service import (
    add_ip_to_blacklist, remove_ip_from_blacklist,
    get_blacklisted_ips, get_blocked_ips, get_security_events,
    unblock_ip
)

router = APIRouter(prefix="/security", tags=["security"])


class BlacklistIP(BaseModel):
    ip: str
    reason: str


@router.get("/blocked-ips")
async def list_blocked_ips(current_user: dict = Depends(require_role(["admin"]))):
    """Get temporarily blocked IPs"""
    return {"blocked_ips": await get_blocked_ips()}


@router.post("/unblock-ip")
async def unblock_ip_address(
    ip: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Manually unblock a temporarily blocked IP"""
    return await unblock_ip(ip)


@router.get("/blacklist")
async def list_blacklisted_ips(current_user: dict = Depends(require_role(["admin"]))):
    """Get permanently blacklisted IPs"""
    return {"blacklist": await get_blacklisted_ips()}


@router.post("/blacklist")
async def blacklist_ip(
    data: BlacklistIP,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Add an IP to the permanent blacklist"""
    return await add_ip_to_blacklist(
        data.ip, 
        data.reason, 
        current_user.get("username", "admin")
    )


@router.delete("/blacklist/{ip}")
async def remove_from_blacklist(
    ip: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Remove an IP from the blacklist"""
    return await remove_ip_from_blacklist(ip)


@router.get("/events")
async def list_security_events(
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Get recent security events"""
    return {"events": await get_security_events(limit)}
