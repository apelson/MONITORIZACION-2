"""
Fail2ban Integration Routes
API endpoints for fail2ban monitoring and configuration
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from services.auth_service import require_role
from services.fail2ban_service import (
    get_fail2ban_status,
    get_jail_status,
    get_fail2ban_config,
    save_fail2ban_config,
    ban_ip,
    unban_ip,
    get_fail2ban_logs,
    generate_jail_config,
    generate_filter_config,
    get_installation_guide,
    sync_with_internal_security
)

router = APIRouter(prefix="/fail2ban", tags=["Fail2ban"])


class Fail2banConfig(BaseModel):
    enabled: bool = True
    max_retry: int = 5
    ban_time: int = 1800
    find_time: int = 600
    jail_name: str = "siempria-auth"
    log_path: str = "/var/log/siempria/auth.log"
    notify_telegram: bool = True
    notify_email: bool = True


class BanIPRequest(BaseModel):
    ip: str
    jail_name: Optional[str] = "siempria-auth"


# ============ STATUS ENDPOINTS ============

@router.get("/status")
async def get_status(current_user: dict = Depends(require_role(["admin"]))):
    """Get overall fail2ban status"""
    status = await get_fail2ban_status()
    return {"status": status}


@router.get("/jail/{jail_name}")
async def get_jail(
    jail_name: str = "siempria-auth",
    current_user: dict = Depends(require_role(["admin"]))
):
    """Get detailed status of a specific jail"""
    status = await get_jail_status(jail_name)
    return {"jail_status": status}


# ============ CONFIGURATION ============

@router.get("/config")
async def get_config(current_user: dict = Depends(require_role(["admin"]))):
    """Get fail2ban configuration"""
    config = await get_fail2ban_config()
    return {"config": config}


@router.post("/config")
async def update_config(
    config: Fail2banConfig,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Update fail2ban configuration"""
    saved = await save_fail2ban_config(config.model_dump())
    return {"message": "Configuración guardada", "config": saved}


# ============ BAN/UNBAN ============

@router.post("/ban")
async def ban_ip_address(
    data: BanIPRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Manually ban an IP address"""
    result = await ban_ip(data.ip, data.jail_name)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Error al bloquear IP"))
    return result


@router.post("/unban")
async def unban_ip_address(
    data: BanIPRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Manually unban an IP address"""
    result = await unban_ip(data.ip, data.jail_name)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Error al desbloquear IP"))
    return result


# ============ LOGS ============

@router.get("/logs")
async def get_logs(
    limit: int = 50,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Get recent fail2ban action logs"""
    logs = await get_fail2ban_logs(limit)
    return {"logs": logs, "count": len(logs)}


# ============ INSTALLATION ============

@router.get("/installation-guide")
async def get_guide(current_user: dict = Depends(require_role(["admin"]))):
    """Get fail2ban installation and configuration guide"""
    guide = await get_installation_guide()
    return guide


@router.get("/config/jail")
async def get_jail_config(current_user: dict = Depends(require_role(["admin"]))):
    """Get generated jail configuration file content"""
    config = await generate_jail_config()
    return {"config": config, "filename": "siempria.conf", "path": "/etc/fail2ban/jail.d/"}


@router.get("/config/filter")
async def get_filter_config(current_user: dict = Depends(require_role(["admin"]))):
    """Get generated filter configuration file content"""
    config = await generate_filter_config()
    return {"config": config, "filename": "siempria-auth.conf", "path": "/etc/fail2ban/filter.d/"}


# ============ SYNC ============

@router.post("/sync")
async def sync_security(current_user: dict = Depends(require_role(["admin"]))):
    """Synchronize internal security blocks with fail2ban"""
    result = await sync_with_internal_security()
    return {"result": result}
