"""
Security service for rate limiting, IP blocking, and brute force protection
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
import asyncio

from config import db, settings_collection, logger

# In-memory cache for rate limiting (for performance)
# In production, consider using Redis
failed_attempts_cache: Dict[str, list] = {}  # IP -> list of timestamps
blocked_ips_cache: Dict[str, datetime] = {}  # IP -> unblock time
blocked_accounts_cache: Dict[str, datetime] = {}  # username -> unblock time

# Collections
ip_blacklist_collection = db["ip_blacklist"]
security_events_collection = db["security_events"]

# Configuration
MAX_FAILED_ATTEMPTS_PER_IP = 5
MAX_FAILED_ATTEMPTS_PER_ACCOUNT = 10
IP_BLOCK_DURATION_MINUTES = 30
ACCOUNT_BLOCK_DURATION_MINUTES = 60
ATTEMPT_WINDOW_MINUTES = 15


async def check_ip_allowed(ip_address: str) -> tuple[bool, str]:
    """
    Check if an IP is allowed to attempt login
    Returns (allowed, reason)
    """
    # Check permanent blacklist first
    blacklisted = await ip_blacklist_collection.find_one({"ip": ip_address, "active": True})
    if blacklisted:
        return False, f"IP bloqueada permanentemente: {blacklisted.get('reason', 'Actividad sospechosa')}"
    
    # Check temporary block
    if ip_address in blocked_ips_cache:
        unblock_time = blocked_ips_cache[ip_address]
        if datetime.now(timezone.utc) < unblock_time:
            remaining = (unblock_time - datetime.now(timezone.utc)).seconds // 60
            return False, f"IP bloqueada temporalmente. Intenta en {remaining} minutos."
        else:
            # Block expired, remove from cache
            del blocked_ips_cache[ip_address]
    
    return True, ""


async def check_account_allowed(username: str) -> tuple[bool, str]:
    """
    Check if an account is allowed to attempt login
    """
    if username in blocked_accounts_cache:
        unblock_time = blocked_accounts_cache[username]
        if datetime.now(timezone.utc) < unblock_time:
            remaining = (unblock_time - datetime.now(timezone.utc)).seconds // 60
            return False, f"Cuenta bloqueada temporalmente. Intenta en {remaining} minutos."
        else:
            del blocked_accounts_cache[username]
    
    return True, ""


async def record_failed_attempt(ip_address: str, username: str):
    """
    Record a failed login attempt and check if blocking is needed
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=ATTEMPT_WINDOW_MINUTES)
    
    # Clean old attempts from cache
    if ip_address in failed_attempts_cache:
        failed_attempts_cache[ip_address] = [
            t for t in failed_attempts_cache[ip_address] 
            if t > window_start
        ]
    else:
        failed_attempts_cache[ip_address] = []
    
    # Add new attempt
    failed_attempts_cache[ip_address].append(now)
    
    # Check if IP should be blocked
    if len(failed_attempts_cache[ip_address]) >= MAX_FAILED_ATTEMPTS_PER_IP:
        blocked_ips_cache[ip_address] = now + timedelta(minutes=IP_BLOCK_DURATION_MINUTES)
        logger.warning(f"IP {ip_address} blocked for {IP_BLOCK_DURATION_MINUTES} minutes due to {len(failed_attempts_cache[ip_address])} failed attempts")
        
        # Record security event
        await security_events_collection.insert_one({
            "event_type": "ip_blocked",
            "ip_address": ip_address,
            "username": username,
            "timestamp": now.isoformat(),
            "reason": f"{len(failed_attempts_cache[ip_address])} intentos fallidos",
            "block_duration_minutes": IP_BLOCK_DURATION_MINUTES
        })
        
        # Send alert email if configured
        await send_security_alert(ip_address, username, "ip_blocked")
        
        return True  # IP was blocked
    
    # Check account blocking (count attempts for this username across all IPs)
    # This would need a more sophisticated tracking in production
    
    return False


async def record_successful_login(ip_address: str, username: str):
    """
    Record successful login and clear failed attempts for this IP
    """
    if ip_address in failed_attempts_cache:
        del failed_attempts_cache[ip_address]


async def send_security_alert(ip_address: str, username: str, event_type: str):
    """
    Send email alert for security events
    """
    try:
        settings = await settings_collection.find_one({}, {"_id": 0})
        if not settings:
            return
        
        alert_email = settings.get("alert_email")
        gmail_user = settings.get("gmail_user")
        gmail_password = settings.get("gmail_app_password")
        
        if not alert_email or not gmail_user or not gmail_password:
            return
        
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"🚨 Alerta de Seguridad - Siempria Network Monitor"
        msg['From'] = gmail_user
        msg['To'] = alert_email
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="background: #dc2626; color: white; padding: 15px; border-radius: 8px;">
                <h2 style="margin: 0;">🚨 Alerta de Seguridad</h2>
            </div>
            <div style="padding: 20px; background: #fef2f2; border-radius: 0 0 8px 8px;">
                <p><strong>Evento:</strong> {'IP bloqueada por múltiples intentos fallidos' if event_type == 'ip_blocked' else event_type}</p>
                <p><strong>IP:</strong> {ip_address}</p>
                <p><strong>Usuario intentado:</strong> {username}</p>
                <p><strong>Fecha/Hora:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                <hr>
                <p style="font-size: 12px; color: #666;">
                    Esta IP ha sido bloqueada temporalmente por {IP_BLOCK_DURATION_MINUTES} minutos.
                    Si esta actividad es sospechosa, considera añadir la IP a la lista negra permanente.
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, [alert_email], msg.as_string())
        
        logger.info(f"Security alert sent to {alert_email}")
        
    except Exception as e:
        logger.error(f"Error sending security alert: {e}")


# ============ IP BLACKLIST MANAGEMENT ============

async def add_ip_to_blacklist(ip_address: str, reason: str, added_by: str) -> dict:
    """Add an IP to the permanent blacklist"""
    existing = await ip_blacklist_collection.find_one({"ip": ip_address})
    if existing:
        await ip_blacklist_collection.update_one(
            {"ip": ip_address},
            {"$set": {"active": True, "reason": reason, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await ip_blacklist_collection.insert_one({
            "ip": ip_address,
            "reason": reason,
            "added_by": added_by,
            "added_at": datetime.now(timezone.utc).isoformat(),
            "active": True
        })
    
    logger.warning(f"IP {ip_address} added to blacklist by {added_by}: {reason}")
    return {"message": f"IP {ip_address} añadida a la lista negra"}


async def remove_ip_from_blacklist(ip_address: str) -> dict:
    """Remove an IP from the blacklist"""
    result = await ip_blacklist_collection.update_one(
        {"ip": ip_address},
        {"$set": {"active": False}}
    )
    if result.modified_count:
        return {"message": f"IP {ip_address} eliminada de la lista negra"}
    return {"message": "IP no encontrada en la lista negra"}


async def get_blacklisted_ips() -> list:
    """Get all blacklisted IPs"""
    cursor = ip_blacklist_collection.find({"active": True}, {"_id": 0})
    return await cursor.to_list(length=1000)


async def get_blocked_ips() -> list:
    """Get currently temporarily blocked IPs"""
    now = datetime.now(timezone.utc)
    blocked = []
    for ip, unblock_time in blocked_ips_cache.items():
        if unblock_time > now:
            blocked.append({
                "ip": ip,
                "unblock_at": unblock_time.isoformat(),
                "remaining_minutes": (unblock_time - now).seconds // 60
            })
    return blocked


async def get_security_events(limit: int = 100) -> list:
    """Get recent security events"""
    cursor = security_events_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def unblock_ip(ip_address: str) -> dict:
    """Manually unblock a temporarily blocked IP"""
    if ip_address in blocked_ips_cache:
        del blocked_ips_cache[ip_address]
        return {"message": f"IP {ip_address} desbloqueada"}
    return {"message": "IP no estaba bloqueada temporalmente"}
