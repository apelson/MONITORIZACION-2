"""
Email service for sending alerts and reports
Supports generic SMTP servers (Gmail, corporate, etc.)
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
import uuid
import ssl

from config import settings_collection, alerts_collection, logger

async def get_smtp_config():
    """Get SMTP configuration from settings"""
    settings = await settings_collection.find_one({}, {"_id": 0})
    if not settings:
        return None
    
    # Check for new generic SMTP settings first, fallback to Gmail settings
    smtp_host = settings.get("smtp_host", "smtp.gmail.com")
    smtp_port = settings.get("smtp_port", 465)
    smtp_user = settings.get("smtp_user") or settings.get("gmail_user")
    smtp_password = settings.get("smtp_password") or settings.get("gmail_app_password")
    smtp_use_ssl = settings.get("smtp_use_ssl", True)
    smtp_use_tls = settings.get("smtp_use_tls", False)
    alert_email = settings.get("alert_email")
    
    if not all([smtp_user, smtp_password, alert_email]):
        return None
    
    return {
        "host": smtp_host,
        "port": smtp_port,
        "user": smtp_user,
        "password": smtp_password,
        "use_ssl": smtp_use_ssl,
        "use_tls": smtp_use_tls,
        "alert_email": alert_email
    }

def send_email_generic(smtp_config: dict, to_email: str, subject: str, html_body: str) -> bool:
    """Send email using generic SMTP configuration"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_config["user"]
        msg['To'] = to_email
        msg.attach(MIMEText(html_body, 'html'))
        
        # Create SSL context that's more permissive for corporate servers
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        if smtp_config["use_ssl"]:
            # SSL connection (port 465)
            with smtplib.SMTP_SSL(smtp_config["host"], smtp_config["port"], context=context) as server:
                server.login(smtp_config["user"], smtp_config["password"])
                server.sendmail(smtp_config["user"], to_email, msg.as_string())
        else:
            # TLS connection (port 587) or plain
            with smtplib.SMTP(smtp_config["host"], smtp_config["port"]) as server:
                if smtp_config["use_tls"]:
                    server.starttls(context=context)
                server.login(smtp_config["user"], smtp_config["password"])
                server.sendmail(smtp_config["user"], to_email, msg.as_string())
        
        return True
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

async def send_alert_email(device_name: str, device_ip: str, port: int, alert_type: str):
    try:
        smtp_config = await get_smtp_config()
        if not smtp_config:
            return False
        
        subject = f"🚨 Alerta: {device_name} {'OFFLINE' if alert_type == 'device_down' else 'ONLINE'}"
        
        if alert_type == "device_down":
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                    <h2 style="color: #dc2626; margin: 0;">⚠️ Dispositivo Offline</h2>
                    <p style="font-size: 18px; margin: 10px 0;"><strong>{device_name}</strong></p>
                    <p>IP: {device_ip}:{port}</p>
                    <p>Hora: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                </div>
                <p style="color: #666; font-size: 12px;">Siempria Network Monitor</p>
            </body>
            </html>
            """
        else:
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0;">
                    <h2 style="color: #16a34a; margin: 0;">✅ Dispositivo Online</h2>
                    <p style="font-size: 18px; margin: 10px 0;"><strong>{device_name}</strong></p>
                    <p>IP: {device_ip}:{port}</p>
                    <p>Hora: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                </div>
                <p style="color: #666; font-size: 12px;">Siempria Network Monitor</p>
            </body>
            </html>
            """
        
        return send_email_generic(smtp_config, smtp_config["alert_email"], subject, body)
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

async def create_alert(device_id: str, device_name: str, device_ip: str, port: int, alert_type: str, extra_info: dict = None):
    """Create an alert and optionally send email notification"""
    
    # Determine alert message based on type
    alert_messages = {
        "device_down": f"Dispositivo se ha desconectado",
        "device_up": f"Dispositivo se ha recuperado",
        "nas_disconnected": f"Cámara ha perdido conexión con el NAS",
        "nas_reconnected": f"Cámara ha recuperado conexión con el NAS",
        "storage_full": f"Almacenamiento del dispositivo está lleno",
        "storage_warning": f"Almacenamiento del dispositivo está casi lleno",
        "recording_stopped": f"La grabación se ha detenido",
        "recording_started": f"La grabación ha iniciado",
    }
    
    message = alert_messages.get(alert_type, f"Alerta: {alert_type}")
    
    # Send email for critical alerts
    email_sent = False
    if alert_type in ["device_down", "nas_disconnected", "storage_full", "recording_stopped"]:
        email_sent = await send_alert_email(device_name, device_ip, port, alert_type)
    
    alert = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "device_name": device_name,
        "alert_type": alert_type,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "email_sent": email_sent,
        "acknowledged": False,
        "extra_info": extra_info or {}
    }
    await alerts_collection.insert_one(alert)
    return alert

async def send_test_email(to_email: str = None) -> dict:
    """Send a test email to verify SMTP configuration"""
    try:
        smtp_config = await get_smtp_config()
        if not smtp_config:
            return {"success": False, "error": "Configuración SMTP no encontrada o incompleta"}
        
        target_email = to_email or smtp_config["alert_email"]
        subject = "🔔 Test - Siempria Network Monitor"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
                <h2 style="color: #3b82f6; margin: 0;">✅ Email de Prueba</h2>
                <p>La configuración de email está funcionando correctamente.</p>
                <p>Servidor: {smtp_config['host']}:{smtp_config['port']}</p>
                <p>Fecha: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
            </div>
            <p style="color: #666; font-size: 12px;">Siempria Network Monitor</p>
        </body>
        </html>
        """
        
        success = send_email_generic(smtp_config, target_email, subject, body)
        if success:
            return {"success": True, "message": f"Email enviado a {target_email}"}
        else:
            return {"success": False, "error": "Error al enviar email"}
    except Exception as e:
        return {"success": False, "error": str(e)}
