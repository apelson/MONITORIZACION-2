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

# Logo URL for email templates
SIEMPRIA_LOGO_URL = "https://customer-assets.emergentagent.com/job_09ef3697-d40a-4ee8-b643-bfc2e0d4b202/artifacts/rat8xd9t_logo%20principal.png"
APP_URL = "https://siempriapp.com"

async def send_alert_email(device_name: str, device_ip: str, port: int, alert_type: str, group_name: str = None):
    try:
        smtp_config = await get_smtp_config()
        if not smtp_config:
            return False
        
        # Define alert styles and messages
        alert_configs = {
            "device_down": {
                "subject": f"🚨 ALERTA CRÍTICA: {device_name} OFFLINE",
                "color": "#dc2626",
                "bg_gradient": "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                "light_bg": "#fee2e2",
                "icon": "⚠️",
                "title": "Dispositivo Offline",
                "severity": "CRÍTICA"
            },
            "device_up": {
                "subject": f"✅ RECUPERADO: {device_name} ONLINE",
                "color": "#16a34a",
                "bg_gradient": "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                "light_bg": "#dcfce7",
                "icon": "✅",
                "title": "Dispositivo Recuperado",
                "severity": "INFO"
            },
            "nas_disconnected": {
                "subject": f"🚨 ALERTA: {device_name} - NAS Desconectado",
                "color": "#dc2626",
                "bg_gradient": "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                "light_bg": "#fee2e2",
                "icon": "💾",
                "title": "Conexión NAS Perdida",
                "severity": "ALTA"
            },
            "nas_reconnected": {
                "subject": f"✅ RECUPERADO: {device_name} - NAS Reconectado",
                "color": "#16a34a",
                "bg_gradient": "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                "light_bg": "#dcfce7",
                "icon": "💾",
                "title": "NAS Reconectado",
                "severity": "INFO"
            },
            "storage_full": {
                "subject": f"🚨 ALERTA: {device_name} - Almacenamiento Lleno",
                "color": "#dc2626",
                "bg_gradient": "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                "light_bg": "#fee2e2",
                "icon": "💾",
                "title": "Almacenamiento Lleno",
                "severity": "ALTA"
            },
            "recording_stopped": {
                "subject": f"⚠️ ALERTA: {device_name} - Grabación Detenida",
                "color": "#f97316",
                "bg_gradient": "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                "light_bg": "#ffedd5",
                "icon": "🔴",
                "title": "Grabación Detenida",
                "severity": "MEDIA"
            }
        }
        
        config = alert_configs.get(alert_type, {
            "subject": f"🔔 Alerta: {device_name}",
            "color": "#6b7280",
            "bg_gradient": "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
            "light_bg": "#f3f4f6",
            "icon": "🔔",
            "title": alert_type,
            "severity": "INFO"
        })
        
        now = datetime.now(timezone.utc)
        group_info = f"<p style='color: #64748b; font-size: 14px; margin: 5px 0;'>📁 Grupo: <strong>{group_name}</strong></p>" if group_name else ""
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                            <!-- Header with Logo -->
                            <tr>
                                <td style="background: {config['bg_gradient']}; padding: 30px; text-align: center;">
                                    <img src="{SIEMPRIA_LOGO_URL}" alt="Siempria" style="height: 50px; margin-bottom: 15px;" />
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{config['icon']} {config['title']}</h1>
                                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                                        Severidad: <strong>{config['severity']}</strong>
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <div style="background-color: {config['light_bg']}; border-radius: 10px; padding: 25px; border-left: 5px solid {config['color']};">
                                        <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 22px;">{device_name}</h2>
                                        <p style="color: #64748b; font-size: 14px; margin: 5px 0;">
                                            🌐 IP: <strong>{device_ip}:{port}</strong>
                                        </p>
                                        {group_info}
                                        <p style="color: #64748b; font-size: 14px; margin: 5px 0;">
                                            🕐 Hora: <strong>{now.strftime('%d/%m/%Y %H:%M:%S')} UTC</strong>
                                        </p>
                                    </div>
                                    
                                    <!-- Action Button -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                                        <tr>
                                            <td align="center">
                                                <a href="{APP_URL}" 
                                                   style="display: inline-block; padding: 14px 35px; background: {config['bg_gradient']}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                                                    Ver en Dashboard
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #1e293b; padding: 25px; text-align: center;">
                                    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px 0;">
                                        <strong>Siempria Network Monitor</strong> - Sistema de Monitorización 24/7
                                    </p>
                                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                                        © {now.year} Siempria Infinite Tech Solutions | <a href="{APP_URL}" style="color: #38bdf8;">siempriapp.com</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return send_email_generic(smtp_config, smtp_config["alert_email"], config["subject"], body)
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

async def create_alert(device_id: str, device_name: str, device_ip: str, port: int, alert_type: str, extra_info: dict = None, group_name: str = None):
    """Create an alert and optionally send email/telegram notification"""
    from config import devices_collection, groups_collection
    from services.telegram_service import send_alert_telegram
    
    # Check if device is in maintenance mode
    device = await devices_collection.find_one({"id": device_id})
    if device:
        maintenance_mode = device.get("maintenance_mode", False)
        maintenance_until = device.get("maintenance_until")
        
        if maintenance_mode and maintenance_until:
            try:
                maint_end = datetime.fromisoformat(maintenance_until.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) < maint_end:
                    # Device is in maintenance mode - skip alert creation
                    logger.info(f"Device {device_name} in maintenance mode - skipping alert")
                    return None
            except Exception as e:
                logger.warning(f"Error parsing maintenance_until: {e}")
        
        # Get group name if not provided
        if not group_name and device.get("group_id"):
            group = await groups_collection.find_one({"id": device["group_id"]})
            if group:
                group_name = group.get("name")
    
    # Determine alert message based on type
    alert_messages = {
        "device_down": "Dispositivo se ha desconectado",
        "device_up": "Dispositivo se ha recuperado",
        "nas_disconnected": "Cámara ha perdido conexión con el NAS",
        "nas_reconnected": "Cámara ha recuperado conexión con el NAS",
        "storage_full": "Almacenamiento del dispositivo está lleno",
        "storage_warning": "Almacenamiento del dispositivo está casi lleno",
        "recording_stopped": "La grabación se ha detenido",
        "recording_started": "La grabación ha iniciado",
    }
    
    message = alert_messages.get(alert_type, f"Alerta: {alert_type}")
    
    # Send notifications for critical alerts
    email_sent = False
    telegram_sent = False
    
    if alert_type in ["device_down", "nas_disconnected", "storage_full", "recording_stopped"]:
        # Send email
        email_sent = await send_alert_email(device_name, device_ip, port, alert_type, group_name)
        # Send Telegram
        telegram_sent = await send_alert_telegram(device_name, device_ip, port, alert_type, group_name)
    
    alert = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "device_name": device_name,
        "group_name": group_name,
        "alert_type": alert_type,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "email_sent": email_sent,
        "telegram_sent": telegram_sent,
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
        subject = "✅ Test de Email - Siempria Network Monitor"
        now = datetime.now(timezone.utc)
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                            <!-- Header with Logo -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 30px; text-align: center;">
                                    <img src="{SIEMPRIA_LOGO_URL}" alt="Siempria" style="height: 50px; margin-bottom: 15px;" />
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">✅ Test de Configuración</h1>
                                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                                        Sistema de Notificaciones
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <div style="background-color: #ecfdf5; border-radius: 10px; padding: 25px; border-left: 5px solid #10b981; margin-bottom: 25px;">
                                        <h2 style="color: #065f46; margin: 0 0 10px 0; font-size: 18px;">🎉 ¡Configuración Correcta!</h2>
                                        <p style="color: #047857; font-size: 15px; margin: 0;">
                                            Las notificaciones por email están funcionando correctamente.
                                        </p>
                                    </div>
                                    
                                    <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">Detalles de Configuración:</h3>
                                    <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px;">
                                        <tr>
                                            <td style="color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">📧 Servidor SMTP:</td>
                                            <td style="color: #1e293b; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{smtp_config['host']}:{smtp_config['port']}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">👤 Usuario:</td>
                                            <td style="color: #1e293b; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{smtp_config['user']}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">🔒 SSL/TLS:</td>
                                            <td style="color: #1e293b; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{'SSL' if smtp_config.get('use_ssl') else 'TLS' if smtp_config.get('use_tls') else 'No'}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b; font-size: 14px;">🕐 Fecha del Test:</td>
                                            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">{now.strftime('%d/%m/%Y %H:%M:%S')} UTC</td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Action Button -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                                        <tr>
                                            <td align="center">
                                                <a href="{APP_URL}" 
                                                   style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                                                    Ir al Dashboard
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #1e293b; padding: 25px; text-align: center;">
                                    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px 0;">
                                        <strong>Siempria Network Monitor</strong> - Sistema de Monitorización 24/7
                                    </p>
                                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                                        © {now.year} Siempria Infinite Tech Solutions | <a href="{APP_URL}" style="color: #38bdf8;">siempriapp.com</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
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


async def send_password_reset_email(to_email: str, username: str, reset_token: str):
    """Send password reset email"""
    smtp_config = await get_smtp_config()
    if not smtp_config:
        logger.warning("Cannot send password reset email: SMTP not configured")
        return False
    
    # For local development, use localhost. For production, use actual domain
    # You may want to get this from environment or settings
    base_url = "http://siempriapp.com"  # Change to your actual domain
    reset_link = f"{base_url}/reset-password?token={reset_token}"
    
    subject = "🔐 Recuperar Contraseña - Siempria Monitor"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0891b2 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Recuperar Contraseña</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Hola <strong>{username}</strong>,
                                </p>
                                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Siempria Network Monitor.
                                </p>
                                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Haz clic en el botón siguiente para crear una nueva contraseña:
                                </p>
                                
                                <!-- Reset Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding: 20px 0;">
                                            <a href="{reset_link}" 
                                               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #0891b2 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                                Restablecer Contraseña
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding: 20px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #0891b2;">
                                    <strong>⏰ Este enlace expirará en 1 hora</strong><br>
                                    Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                                </p>
                                
                                <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;">
                                    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                                    <a href="{reset_link}" style="color: #0891b2; word-break: break-all;">{reset_link}</a>
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                    <strong>Siempria Network Monitor</strong>
                                </p>
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    © {datetime.now().year} Siempria - Sistema de Monitorización de Red
                                </p>
                                <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                                    📧 soporte@siempria.com | 📞 822 22 00 22
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    success = send_email_generic(smtp_config, to_email, subject, html_body)
    
    if success:
        logger.info(f"Password reset email sent to {to_email}")
    else:
        logger.error(f"Failed to send password reset email to {to_email}")
    
    return success

