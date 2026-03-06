"""
Fail2ban Integration Service
Provides monitoring, configuration and alerting for fail2ban intrusion detection
"""
import subprocess
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, List
import os

from config import db, logger

# Collections
fail2ban_logs_collection = db["fail2ban_logs"]
fail2ban_config_collection = db["fail2ban_config"]

# Default configuration
DEFAULT_CONFIG = {
    "enabled": True,
    "max_retry": 5,
    "ban_time": 1800,  # 30 minutes in seconds
    "find_time": 600,  # 10 minutes window
    "jail_name": "siempria-auth",
    "log_path": "/var/log/siempria/auth.log",
    "notify_telegram": True,
    "notify_email": True,
}


async def get_fail2ban_config() -> dict:
    """Get fail2ban configuration from database"""
    config = await fail2ban_config_collection.find_one({"_id": "config"})
    if not config:
        # Return default config
        return DEFAULT_CONFIG
    config.pop("_id", None)
    return config


async def save_fail2ban_config(config: dict) -> dict:
    """Save fail2ban configuration to database"""
    config["updated_at"] = datetime.now(timezone.utc).isoformat()
    await fail2ban_config_collection.update_one(
        {"_id": "config"},
        {"$set": config},
        upsert=True
    )
    return config


async def get_fail2ban_status() -> dict:
    """
    Get fail2ban status - runs fail2ban-client commands
    Returns status info or simulated data if fail2ban is not installed
    """
    try:
        # Try to get fail2ban status
        result = subprocess.run(
            ["fail2ban-client", "status"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            # Parse output
            output = result.stdout
            jails = []
            
            # Extract jail list
            for line in output.split("\n"):
                if "Jail list:" in line:
                    jail_str = line.split(":")[-1].strip()
                    if jail_str:
                        jails = [j.strip() for j in jail_str.split(",")]
            
            return {
                "installed": True,
                "running": True,
                "jails": jails,
                "jail_count": len(jails)
            }
        else:
            return {
                "installed": True,
                "running": False,
                "error": result.stderr,
                "jails": [],
                "jail_count": 0
            }
            
    except FileNotFoundError:
        # fail2ban not installed
        return {
            "installed": False,
            "running": False,
            "jails": [],
            "jail_count": 0,
            "message": "fail2ban no está instalado en el sistema"
        }
    except subprocess.TimeoutExpired:
        return {
            "installed": True,
            "running": False,
            "error": "Timeout al consultar fail2ban",
            "jails": [],
            "jail_count": 0
        }
    except Exception as e:
        logger.error(f"Error checking fail2ban status: {e}")
        return {
            "installed": False,
            "running": False,
            "error": str(e),
            "jails": [],
            "jail_count": 0
        }


async def get_jail_status(jail_name: str = "siempria-auth") -> dict:
    """Get detailed status of a specific jail"""
    try:
        result = subprocess.run(
            ["fail2ban-client", "status", jail_name],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            output = result.stdout
            status = {
                "jail": jail_name,
                "active": True,
                "currently_banned": 0,
                "total_banned": 0,
                "banned_ips": [],
                "currently_failed": 0,
                "total_failed": 0
            }
            
            for line in output.split("\n"):
                line = line.strip()
                if "Currently banned:" in line:
                    status["currently_banned"] = int(line.split(":")[-1].strip())
                elif "Total banned:" in line:
                    status["total_banned"] = int(line.split(":")[-1].strip())
                elif "Banned IP list:" in line:
                    ips = line.split(":")[-1].strip()
                    if ips:
                        status["banned_ips"] = [ip.strip() for ip in ips.split()]
                elif "Currently failed:" in line:
                    status["currently_failed"] = int(line.split(":")[-1].strip())
                elif "Total failed:" in line:
                    status["total_failed"] = int(line.split(":")[-1].strip())
            
            return status
        else:
            return {
                "jail": jail_name,
                "active": False,
                "error": result.stderr or "Jail no encontrado"
            }
            
    except FileNotFoundError:
        return {
            "jail": jail_name,
            "active": False,
            "error": "fail2ban no está instalado"
        }
    except Exception as e:
        return {
            "jail": jail_name,
            "active": False,
            "error": str(e)
        }


async def ban_ip(ip: str, jail_name: str = "siempria-auth") -> dict:
    """Manually ban an IP using fail2ban"""
    try:
        result = subprocess.run(
            ["fail2ban-client", "set", jail_name, "banip", ip],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            # Log the action
            await fail2ban_logs_collection.insert_one({
                "action": "ban",
                "ip": ip,
                "jail": jail_name,
                "manual": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            return {"success": True, "message": f"IP {ip} bloqueada en {jail_name}"}
        else:
            return {"success": False, "error": result.stderr}
            
    except FileNotFoundError:
        # Fallback: Use our internal blocking system
        from services.security_service import add_ip_to_blacklist
        result = await add_ip_to_blacklist(ip, f"Bloqueado via fail2ban (manual)", "system")
        return {"success": True, "message": result.get("message", "IP bloqueada internamente")}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def unban_ip(ip: str, jail_name: str = "siempria-auth") -> dict:
    """Manually unban an IP using fail2ban"""
    try:
        result = subprocess.run(
            ["fail2ban-client", "set", jail_name, "unbanip", ip],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            # Log the action
            await fail2ban_logs_collection.insert_one({
                "action": "unban",
                "ip": ip,
                "jail": jail_name,
                "manual": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            return {"success": True, "message": f"IP {ip} desbloqueada de {jail_name}"}
        else:
            return {"success": False, "error": result.stderr}
            
    except FileNotFoundError:
        # Fallback: Use our internal system
        from services.security_service import remove_ip_from_blacklist, unblock_ip
        await remove_ip_from_blacklist(ip)
        await unblock_ip(ip)
        return {"success": True, "message": "IP desbloqueada internamente"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_fail2ban_logs(limit: int = 50) -> list:
    """Get recent fail2ban action logs from database"""
    cursor = fail2ban_logs_collection.find(
        {}, 
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    
    return await cursor.to_list(length=limit)


async def generate_jail_config() -> str:
    """
    Generate fail2ban jail configuration for Siempria
    Returns the configuration file content
    """
    config = await get_fail2ban_config()
    
    jail_config = f"""# Siempria Network Monitor - fail2ban jail configuration
# Generated: {datetime.now(timezone.utc).isoformat()}
# Place this file in /etc/fail2ban/jail.d/siempria.conf

[{config.get('jail_name', 'siempria-auth')}]
enabled = true
port = http,https
filter = siempria-auth
logpath = {config.get('log_path', '/var/log/siempria/auth.log')}
maxretry = {config.get('max_retry', 5)}
findtime = {config.get('find_time', 600)}
bantime = {config.get('ban_time', 1800)}
action = %(action_mwl)s

# Additional protection for API endpoints
[siempria-api]
enabled = true
port = http,https
filter = siempria-api
logpath = /var/log/siempria/api.log
maxretry = 10
findtime = 300
bantime = 3600
"""
    
    return jail_config


async def generate_filter_config() -> str:
    """
    Generate fail2ban filter configuration for Siempria
    Returns the filter file content
    """
    filter_config = """# Siempria Network Monitor - fail2ban filter
# Place this file in /etc/fail2ban/filter.d/siempria-auth.conf

[Definition]
# Match failed login attempts in our security log format
failregex = ^.*auth_failed.*ip_address.*<HOST>.*$
            ^.*auth_blocked.*ip_address.*<HOST>.*$
            ^.*ip_blocked.*<HOST>.*$
            ^.*Failed login attempt from <HOST>.*$
            ^.*Invalid credentials from <HOST>.*$

ignoreregex =

# Date pattern (ISO format)
datepattern = %%Y-%%m-%%dT%%H:%%M:%%S
"""
    
    return filter_config


async def get_installation_guide() -> dict:
    """
    Get fail2ban installation and configuration guide
    """
    jail_config = await generate_jail_config()
    filter_config = await generate_filter_config()
    
    return {
        "installation_steps": [
            {
                "step": 1,
                "title": "Instalar fail2ban",
                "command": "sudo apt-get update && sudo apt-get install -y fail2ban"
            },
            {
                "step": 2,
                "title": "Crear directorio de logs",
                "command": "sudo mkdir -p /var/log/siempria && sudo touch /var/log/siempria/auth.log"
            },
            {
                "step": 3,
                "title": "Crear filtro de Siempria",
                "command": "sudo nano /etc/fail2ban/filter.d/siempria-auth.conf",
                "content": filter_config
            },
            {
                "step": 4,
                "title": "Crear jail de Siempria",
                "command": "sudo nano /etc/fail2ban/jail.d/siempria.conf",
                "content": jail_config
            },
            {
                "step": 5,
                "title": "Reiniciar fail2ban",
                "command": "sudo systemctl restart fail2ban"
            },
            {
                "step": 6,
                "title": "Verificar estado",
                "command": "sudo fail2ban-client status siempria-auth"
            }
        ],
        "jail_config": jail_config,
        "filter_config": filter_config,
        "notes": [
            "El servicio de Siempria debe estar configurado para escribir logs en /var/log/siempria/auth.log",
            "Los logs deben incluir la IP del cliente en formato: ip_address: X.X.X.X",
            "Ajusta maxretry, findtime y bantime según tus necesidades de seguridad"
        ]
    }


async def sync_with_internal_security() -> dict:
    """
    Synchronize fail2ban bans with our internal security system
    """
    try:
        from services.security_service import get_blacklisted_ips, get_blocked_ips
        
        # Get IPs from our internal system
        blacklisted = await get_blacklisted_ips()
        blocked = await get_blocked_ips()
        
        # Get fail2ban status
        f2b_status = await get_fail2ban_status()
        
        synced_count = 0
        
        if f2b_status.get("installed") and f2b_status.get("running"):
            # Sync blacklisted IPs to fail2ban
            for item in blacklisted:
                result = await ban_ip(item["ip"])
                if result.get("success"):
                    synced_count += 1
        
        return {
            "synced": synced_count,
            "internal_blacklist": len(blacklisted),
            "internal_blocked": len(blocked),
            "fail2ban_available": f2b_status.get("installed", False)
        }
        
    except Exception as e:
        logger.error(f"Error syncing with fail2ban: {e}")
        return {"error": str(e), "synced": 0}
