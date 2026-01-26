"""
Daily reports service for system downtime and statistics
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import io

from config import (
    settings_collection, devices_collection, alerts_collection,
    organizations_collection, groups_collection, history_collection,
    logger
)

async def get_daily_report_data(days: int = 1):
    """
    Collect data for the daily downtime report
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    since_iso = since.isoformat()
    
    # Get all devices
    devices = await devices_collection.find({}, {"_id": 0}).to_list(length=1000)
    
    # Get all alerts from the period
    alerts = await alerts_collection.find(
        {"timestamp": {"$gte": since_iso}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(length=1000)
    
    # Get organizations and groups for context
    organizations = {o["id"]: o for o in await organizations_collection.find({}, {"_id": 0}).to_list(length=100)}
    groups = {g["id"]: g for g in await groups_collection.find({}, {"_id": 0}).to_list(length=100)}
    
    # Process device statistics
    device_stats = []
    total_downtime_events = 0
    devices_with_issues = set()
    
    for device in devices:
        # Count alerts for this device
        device_alerts = [a for a in alerts if a.get("device_id") == device["id"]]
        down_alerts = [a for a in device_alerts if a.get("alert_type") == "device_down"]
        up_alerts = [a for a in device_alerts if a.get("alert_type") == "device_up"]
        
        if down_alerts:
            devices_with_issues.add(device["id"])
            total_downtime_events += len(down_alerts)
            
            # Get group and org info
            group = groups.get(device.get("group_id", ""), {})
            org = organizations.get(group.get("organization_id", ""), {})
            
            device_stats.append({
                "device_id": device["id"],
                "device_name": device.get("name", "Sin nombre"),
                "ip_address": f"{device.get('ip_address', '')}:{device.get('port', '')}",
                "organization": org.get("name", "Sin organización"),
                "group": group.get("name", "Sin grupo"),
                "current_status": device.get("status", "unknown"),
                "down_count": len(down_alerts),
                "up_count": len(up_alerts),
                "last_down": down_alerts[0].get("timestamp") if down_alerts else None,
                "alerts": down_alerts[:5]  # Last 5 down alerts
            })
    
    # Sort by down_count descending
    device_stats.sort(key=lambda x: x["down_count"], reverse=True)
    
    # Summary stats
    total_devices = len(devices)
    online_devices = len([d for d in devices if d.get("status") == "online"])
    offline_devices = len([d for d in devices if d.get("status") == "offline"])
    
    return {
        "period_start": since.isoformat(),
        "period_end": datetime.now(timezone.utc).isoformat(),
        "period_days": days,
        "summary": {
            "total_devices": total_devices,
            "online_now": online_devices,
            "offline_now": offline_devices,
            "devices_with_issues": len(devices_with_issues),
            "total_downtime_events": total_downtime_events
        },
        "devices_with_downtime": device_stats,
        "all_alerts": alerts[:100]  # Last 100 alerts
    }


def generate_html_report(data: dict) -> str:
    """
    Generate HTML email content for the daily report
    """
    summary = data["summary"]
    devices = data["devices_with_downtime"]
    
    # Determine overall status color
    if summary["offline_now"] == 0:
        status_color = "#16a34a"
        status_icon = "✅"
        status_text = "Todos los sistemas operativos"
    elif summary["offline_now"] < summary["total_devices"] * 0.1:
        status_color = "#f59e0b"
        status_icon = "⚠️"
        status_text = f"{summary['offline_now']} sistema(s) offline"
    else:
        status_color = "#dc2626"
        status_icon = "🚨"
        status_text = f"{summary['offline_now']} sistemas offline - Atención requerida"
    
    # Build devices table rows
    device_rows = ""
    for dev in devices[:20]:  # Top 20
        status_badge = "🔴" if dev["current_status"] == "offline" else "🟢"
        device_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{status_badge} {dev['device_name']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{dev['organization']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{dev['ip_address']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #dc2626;">{dev['down_count']}</td>
        </tr>
        """
    
    if not device_rows:
        device_rows = """
        <tr>
            <td colspan="4" style="padding: 20px; text-align: center; color: #16a34a;">
                ✅ No se registraron caídas en el período
            </td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Informe Diario - Siempria Network Monitor</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">📊 Informe Diario de Sistemas</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Siempria Network Monitor</p>
            </div>
            
            <!-- Status Banner -->
            <div style="background: {status_color}; color: white; padding: 15px 20px; text-align: center;">
                <span style="font-size: 20px;">{status_icon} {status_text}</span>
            </div>
            
            <!-- Summary Cards -->
            <div style="background: white; padding: 25px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 18px;">Resumen del período</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 15px; text-align: center; background: #f0fdf4; border-radius: 8px; width: 25%;">
                            <div style="font-size: 28px; font-weight: bold; color: #16a34a;">{summary['online_now']}</div>
                            <div style="color: #666; font-size: 12px;">Online</div>
                        </td>
                        <td style="width: 10px;"></td>
                        <td style="padding: 15px; text-align: center; background: #fef2f2; border-radius: 8px; width: 25%;">
                            <div style="font-size: 28px; font-weight: bold; color: #dc2626;">{summary['offline_now']}</div>
                            <div style="color: #666; font-size: 12px;">Offline</div>
                        </td>
                        <td style="width: 10px;"></td>
                        <td style="padding: 15px; text-align: center; background: #fefce8; border-radius: 8px; width: 25%;">
                            <div style="font-size: 28px; font-weight: bold; color: #ca8a04;">{summary['total_downtime_events']}</div>
                            <div style="color: #666; font-size: 12px;">Caídas</div>
                        </td>
                        <td style="width: 10px;"></td>
                        <td style="padding: 15px; text-align: center; background: #f3f4f6; border-radius: 8px; width: 25%;">
                            <div style="font-size: 28px; font-weight: bold; color: #374151;">{summary['total_devices']}</div>
                            <div style="color: #666; font-size: 12px;">Total</div>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Devices with downtime -->
            <div style="background: white; padding: 25px;">
                <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 18px;">
                    🔻 Dispositivos con caídas ({len(devices)})
                </h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Dispositivo</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Organización</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">IP</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Caídas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {device_rows}
                    </tbody>
                </table>
            </div>
            
            <!-- Footer -->
            <div style="background: #1f2937; color: white; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
                <p style="margin: 0; font-size: 12px; opacity: 0.8;">
                    Generado: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC
                </p>
                <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.6;">
                    Siempria Network Monitor - Informe automático
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


async def send_daily_report(recipients: List[str] = None, days: int = 1) -> dict:
    """
    Generate and send the daily downtime report
    """
    try:
        # Get settings
        settings = await settings_collection.find_one({}, {"_id": 0})
        if not settings:
            return {"success": False, "error": "No hay configuración de email"}
        
        gmail_user = settings.get("gmail_user")
        gmail_password = settings.get("gmail_app_password")
        
        if not gmail_user or not gmail_password:
            return {"success": False, "error": "Credenciales de email no configuradas"}
        
        # Use provided recipients or fall back to alert_email
        if not recipients:
            alert_email = settings.get("alert_email")
            if alert_email:
                recipients = [alert_email]
            else:
                return {"success": False, "error": "No hay destinatarios configurados"}
        
        # Get report data
        data = await get_daily_report_data(days)
        
        # Generate HTML
        html_content = generate_html_report(data)
        
        # Create email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"📊 Informe {'Diario' if days == 1 else f'de {days} días'} - Siempria Network Monitor"
        msg['From'] = gmail_user
        msg['To'] = ", ".join(recipients)
        
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, recipients, msg.as_string())
        
        logger.info(f"Daily report sent to {recipients}")
        
        return {
            "success": True,
            "recipients": recipients,
            "summary": data["summary"],
            "devices_reported": len(data["devices_with_downtime"])
        }
        
    except Exception as e:
        logger.error(f"Error sending daily report: {e}")
        return {"success": False, "error": str(e)}


async def get_report_settings():
    """Get daily report configuration"""
    settings = await settings_collection.find_one({}, {"_id": 0})
    if not settings:
        return {}
    
    return {
        "daily_report_enabled": settings.get("daily_report_enabled", False),
        "daily_report_time": settings.get("daily_report_time", "08:00"),
        "daily_report_recipients": settings.get("daily_report_recipients", []),
        "weekly_report_enabled": settings.get("weekly_report_enabled", False),
        "weekly_report_day": settings.get("weekly_report_day", "monday")
    }


async def update_report_settings(
    daily_enabled: bool = None,
    daily_time: str = None,
    recipients: List[str] = None,
    weekly_enabled: bool = None,
    weekly_day: str = None
):
    """Update daily report configuration"""
    update = {}
    if daily_enabled is not None:
        update["daily_report_enabled"] = daily_enabled
    if daily_time is not None:
        update["daily_report_time"] = daily_time
    if recipients is not None:
        update["daily_report_recipients"] = recipients
    if weekly_enabled is not None:
        update["weekly_report_enabled"] = weekly_enabled
    if weekly_day is not None:
        update["weekly_report_day"] = weekly_day
    
    if update:
        await settings_collection.update_one({}, {"$set": update}, upsert=True)
    
    return await get_report_settings()
