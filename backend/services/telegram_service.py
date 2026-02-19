"""
Telegram Bot Service for sending alerts
"""
import httpx
from config import settings_collection, logger

TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"

async def get_telegram_config():
    """Get Telegram configuration from settings"""
    settings = await settings_collection.find_one({}, {"_id": 0})
    if not settings:
        return None
    
    bot_token = settings.get("telegram_bot_token")
    chat_ids = settings.get("telegram_chat_ids", [])
    enabled = settings.get("telegram_enabled", False)
    
    if not bot_token or not chat_ids or not enabled:
        return None
    
    return {
        "bot_token": bot_token,
        "chat_ids": chat_ids if isinstance(chat_ids, list) else [chat_ids]
    }

async def send_telegram_message(message: str, parse_mode: str = "HTML") -> dict:
    """Send a message to all configured Telegram chat IDs"""
    config = await get_telegram_config()
    if not config:
        return {"success": False, "error": "Telegram no configurado o deshabilitado"}
    
    results = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for chat_id in config["chat_ids"]:
            try:
                url = TELEGRAM_API_URL.format(token=config["bot_token"])
                response = await client.post(url, json={
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": parse_mode
                })
                if response.status_code == 200:
                    results.append({"chat_id": chat_id, "success": True})
                else:
                    error_data = response.json()
                    results.append({"chat_id": chat_id, "success": False, "error": error_data.get("description", "Unknown error")})
            except Exception as e:
                logger.error(f"Error sending Telegram to {chat_id}: {e}")
                results.append({"chat_id": chat_id, "success": False, "error": str(e)})
    
    success_count = sum(1 for r in results if r["success"])
    return {
        "success": success_count > 0,
        "sent": success_count,
        "total": len(config["chat_ids"]),
        "results": results
    }

async def send_alert_telegram(device_name: str, device_ip: str, port: int, alert_type: str, group_name: str = None) -> bool:
    """Send alert notification via Telegram"""
    try:
        config = await get_telegram_config()
        if not config:
            return False
        
        # Alert type configurations
        alert_configs = {
            "device_down": {"emoji": "🚨", "title": "OFFLINE", "severity": "⚠️ CRÍTICA"},
            "device_up": {"emoji": "✅", "title": "ONLINE", "severity": "ℹ️ INFO"},
            "nas_disconnected": {"emoji": "💾", "title": "NAS DESCONECTADO", "severity": "⚠️ ALTA"},
            "nas_reconnected": {"emoji": "💾", "title": "NAS RECONECTADO", "severity": "ℹ️ INFO"},
            "storage_full": {"emoji": "💾", "title": "ALMACENAMIENTO LLENO", "severity": "⚠️ ALTA"},
            "recording_stopped": {"emoji": "🔴", "title": "GRABACIÓN DETENIDA", "severity": "⚡ MEDIA"}
        }
        
        cfg = alert_configs.get(alert_type, {"emoji": "🔔", "title": alert_type.upper(), "severity": "ℹ️ INFO"})
        
        group_line = f"\n📁 <b>Grupo:</b> {group_name}" if group_name else ""
        
        message = f"""
{cfg['emoji']} <b>ALERTA: {cfg['title']}</b>

🖥️ <b>Dispositivo:</b> {device_name}
🌐 <b>IP:</b> {device_ip}:{port}{group_line}
📊 <b>Severidad:</b> {cfg['severity']}

<i>Siempria Network Monitor</i>
        """.strip()
        
        result = await send_telegram_message(message)
        return result.get("success", False)
    except Exception as e:
        logger.error(f"Error sending Telegram alert: {e}")
        return False

async def send_test_telegram() -> dict:
    """Send a test message to verify Telegram configuration"""
    try:
        config = await get_telegram_config()
        if not config:
            return {"success": False, "error": "Telegram no configurado o deshabilitado"}
        
        message = """
✅ <b>Test de Configuración</b>

🤖 El bot de Telegram está configurado correctamente.
📡 Las notificaciones están activas.

<i>Siempria Network Monitor</i>
        """.strip()
        
        result = await send_telegram_message(message)
        if result.get("success"):
            return {"success": True, "message": f"Mensaje enviado a {result['sent']}/{result['total']} chats"}
        else:
            errors = [r.get("error", "Unknown") for r in result.get("results", []) if not r.get("success")]
            return {"success": False, "error": "; ".join(errors[:3])}
    except Exception as e:
        return {"success": False, "error": str(e)}
