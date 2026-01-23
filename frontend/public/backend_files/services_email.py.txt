"""
Email service for sending alerts and reports
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
import uuid

from config import settings_collection, alerts_collection, logger

async def send_alert_email(device_name: str, device_ip: str, port: int, alert_type: str):
    try:
        settings = await settings_collection.find_one({}, {"_id": 0})
        if not settings:
            return False
        gmail_user = settings.get("gmail_user")
        gmail_password = settings.get("gmail_app_password")
        alert_email = settings.get("alert_email")
        
        if not all([gmail_user, gmail_password, alert_email]):
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
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = gmail_user
        msg['To'] = alert_email
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, alert_email, msg.as_string())
        
        return True
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

async def create_alert(device_id: str, device_name: str, device_ip: str, port: int, alert_type: str):
    email_sent = await send_alert_email(device_name, device_ip, port, alert_type)
    alert = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "device_name": device_name,
        "alert_type": alert_type,
        "message": f"Dispositivo {'se ha desconectado' if alert_type == 'device_down' else 'se ha recuperado'}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "email_sent": email_sent,
        "acknowledged": False
    }
    await alerts_collection.insert_one(alert)
    return alert
