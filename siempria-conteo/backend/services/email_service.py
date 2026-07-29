"""
Email service for Siempria Conteo
Uses SMTP (configurable via admin panel, stored in MongoDB)
"""
import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

logger = logging.getLogger("email_service")

DEFAULT_SMTP = {
    "smtp_host": "",
    "smtp_port": 587,
    "smtp_user": "",
    "smtp_password": "",
    "from_email": "alertas@siempria.com",
    "from_name": "Siempria Conteo",
    "enabled": False
}


async def get_email_config(db):
    """Get email config from DB or return defaults"""
    config = await db["email_config"].find_one({"_id": "smtp_settings"})
    if not config:
        return DEFAULT_SMTP.copy()
    config.pop("_id", None)
    return config


async def save_email_config(db, config_data):
    """Save email config to DB"""
    config_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db["email_config"].update_one(
        {"_id": "smtp_settings"},
        {"$set": config_data},
        upsert=True
    )


def _send_email_sync(config, to_email, subject, html_body):
    """Synchronous email send via SMTP"""
    if not config.get("enabled"):
        logger.info(f"[EMAIL DISABLED] To: {to_email} | Subject: {subject}")
        return False

    if not config.get("smtp_host") or not config.get("smtp_user"):
        logger.warning("[EMAIL] SMTP not configured")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{config.get('from_name', 'Siempria')} <{config.get('from_email', 'alertas@siempria.com')}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(config["smtp_host"], int(config.get("smtp_port", 587)), timeout=10) as server:
            server.starttls()
            server.login(config["smtp_user"], config["smtp_password"])
            server.send_message(msg)
        logger.info(f"[EMAIL OK] To: {to_email} | Subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL ERROR] {e}")
        return False


async def send_email(db, to_email, subject, html_body):
    """Async wrapper for sending email"""
    config = await get_email_config(db)
    return await asyncio.to_thread(_send_email_sync, config, to_email, subject, html_body)


async def send_failed_login_alert(db, username, ip_address, attempts):
    """Send alert when user fails login multiple times"""
    config = await get_email_config(db)
    alert_email = config.get("alert_email", "luis.gonzalez@siempria.com")
    now = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S UTC")

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:#e74c3c;padding:16px 24px;">
        <h2 style="margin:0;color:#fff;">Alerta de Seguridad - Siempria Conteo</h2>
      </div>
      <div style="padding:24px;">
        <p style="font-size:16px;">Se han detectado <strong style="color:#e74c3c;">{attempts} intentos fallidos</strong> de inicio de sesion:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#888;">Usuario:</td><td style="padding:8px;"><strong>{username}</strong></td></tr>
          <tr><td style="padding:8px;color:#888;">IP:</td><td style="padding:8px;"><code>{ip_address}</code></td></tr>
          <tr><td style="padding:8px;color:#888;">Fecha:</td><td style="padding:8px;">{now}</td></tr>
        </table>
        <p style="color:#888;font-size:13px;">Este es un mensaje automatico de Siempria Conteo.</p>
      </div>
    </div>
    """
    await send_email(db, alert_email, f"[ALERTA] {attempts} intentos fallidos - {username}", html)
