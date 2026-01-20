from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import socket
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
devices_collection = db["devices"]
history_collection = db["status_history"]
alerts_collection = db["alerts"]
settings_collection = db["settings"]

# Scheduler
scheduler = AsyncIOScheduler()

# ============ MODELS ============

class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    port: int
    description: Optional[str] = ""

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    description: Optional[str] = None

class Device(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ip_address: str
    port: int
    description: str = ""
    status: str = "unknown"  # online, offline, checking, unknown
    last_check: Optional[str] = None
    last_online: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StatusHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    status: str
    ping_success: bool
    port_success: bool
    response_time_ms: Optional[float] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    device_name: str
    device_ip: str
    alert_type: str  # device_down, device_up
    message: str
    email_sent: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmailSettings(BaseModel):
    alert_email: EmailStr
    gmail_user: str
    gmail_app_password: str

# ============ EMAIL SERVICE ============

async def send_alert_email(device_name: str, device_ip: str, port: int, alert_type: str):
    """Send email alert when device status changes"""
    try:
        settings = await settings_collection.find_one({}, {"_id": 0})
        if not settings:
            logger.warning("No email settings configured")
            return False
        
        gmail_user = settings.get("gmail_user")
        gmail_password = settings.get("gmail_app_password")
        alert_email = settings.get("alert_email")
        
        if not all([gmail_user, gmail_password, alert_email]):
            logger.warning("Incomplete email settings")
            return False
        
        subject = f"🔴 ALERTA: {device_name} está OFFLINE" if alert_type == "device_down" else f"🟢 RECUPERADO: {device_name} está ONLINE"
        
        html_body = f"""
        <html>
            <body style="font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; border: 1px solid #e4e4e7;">
                    <h2 style="color: {'#ef4444' if alert_type == 'device_down' else '#22c55e'}; margin-top: 0;">
                        {'⚠️ Dispositivo Offline' if alert_type == 'device_down' else '✅ Dispositivo Recuperado'}
                    </h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #71717a;">Nombre:</td>
                            <td style="padding: 8px 0; font-weight: 500; font-family: monospace;">{device_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #71717a;">IP:</td>
                            <td style="padding: 8px 0; font-family: monospace;">{device_ip}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #71717a;">Puerto:</td>
                            <td style="padding: 8px 0; font-family: monospace;">{port}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #71717a;">Hora:</td>
                            <td style="padding: 8px 0;">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
                        </tr>
                    </table>
                    <p style="color: #71717a; font-size: 12px; margin-top: 20px; margin-bottom: 0;">
                        Monitor de Equipos - Alerta Automática
                    </p>
                </div>
            </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = gmail_user
        msg['To'] = alert_email
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, [alert_email], msg.as_string())
        
        logger.info(f"Alert email sent to {alert_email} for {device_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

# ============ MONITORING SERVICE ============

def check_tcp_port(ip: str, port: int, timeout: float = 5.0) -> tuple[bool, float]:
    """Check if TCP port is open and measure response time"""
    try:
        import time
        start_time = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        end_time = time.time()
        sock.close()
        response_time = (end_time - start_time) * 1000  # Convert to ms
        success = result == 0
        logger.info(f"TCP check {ip}:{port} - result={result}, success={success}, time={response_time:.0f}ms")
        return success, response_time
    except Exception as e:
        logger.error(f"TCP check error for {ip}:{port}: {str(e)}")
        return False, 0

def check_ping(ip: str, timeout: float = 5.0) -> tuple[bool, float]:
    """Simulate ping using TCP connection to common ports"""
    try:
        import time
        start_time = time.time()
        # Try to connect to common ports for ping simulation
        for test_port in [80, 443, 22, 8080]:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((ip, test_port))
                sock.close()
                if result == 0:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000
                    logger.info(f"Ping check {ip} - success on port {test_port}, time={response_time:.0f}ms")
                    return True, response_time
            except:
                continue
        logger.info(f"Ping check {ip} - failed on all common ports")
        return False, 0
    except Exception as e:
        logger.error(f"Ping check error for {ip}: {str(e)}")
        return False, 0

async def check_device(device: dict) -> dict:
    """Check device status (ping + port)"""
    device_id = device["id"]
    ip = device["ip_address"]
    port = device["port"]
    
    # Run checks
    loop = asyncio.get_event_loop()
    ping_success, ping_time = await loop.run_in_executor(None, check_ping, ip)
    port_success, port_time = await loop.run_in_executor(None, check_tcp_port, ip, port)
    
    # Device is online if port check succeeds
    is_online = port_success
    response_time = port_time if port_success else ping_time
    
    new_status = "online" if is_online else "offline"
    old_status = device.get("status", "unknown")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Save history
    history_doc = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "status": new_status,
        "ping_success": ping_success,
        "port_success": port_success,
        "response_time_ms": response_time if response_time > 0 else None,
        "timestamp": now
    }
    await history_collection.insert_one(history_doc)
    
    # Update device status
    update_data = {
        "status": new_status,
        "last_check": now
    }
    if is_online:
        update_data["last_online"] = now
    
    await devices_collection.update_one(
        {"id": device_id},
        {"$set": update_data}
    )
    
    # Check for status change and send alert
    if old_status != "unknown" and old_status != new_status:
        alert_type = "device_down" if new_status == "offline" else "device_up"
        
        # Send email alert
        email_sent = await send_alert_email(
            device["name"],
            device["ip_address"],
            device["port"],
            alert_type
        )
        
        # Save alert to database
        alert_doc = {
            "id": str(uuid.uuid4()),
            "device_id": device_id,
            "device_name": device["name"],
            "device_ip": device["ip_address"],
            "alert_type": alert_type,
            "message": f"Dispositivo {device['name']} ({ip}:{port}) cambió a {new_status}",
            "email_sent": email_sent,
            "timestamp": now
        }
        await alerts_collection.insert_one(alert_doc)
        logger.info(f"Alert created for device {device['name']}: {alert_type}")
    
    return {
        "device_id": device_id,
        "status": new_status,
        "ping_success": ping_success,
        "port_success": port_success,
        "response_time_ms": response_time
    }

async def monitor_all_devices():
    """Monitor all registered devices"""
    try:
        devices = await devices_collection.find({}, {"_id": 0}).to_list(length=None)
        logger.info(f"Monitoring {len(devices)} devices...")
        
        for device in devices:
            try:
                await check_device(device)
            except Exception as e:
                logger.error(f"Error checking device {device.get('name', 'unknown')}: {str(e)}")
                
    except Exception as e:
        logger.error(f"Error in monitor_all_devices: {str(e)}")

# ============ LIFESPAN ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.add_job(
        monitor_all_devices,
        IntervalTrigger(minutes=5),
        id="device_monitor_job",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Device monitoring scheduler started (every 5 minutes)")
    
    # Create indexes
    await devices_collection.create_index("id", unique=True)
    await history_collection.create_index([("device_id", 1), ("timestamp", -1)])
    await alerts_collection.create_index("timestamp")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    client.close()
    logger.info("Scheduler stopped and DB connection closed")

# ============ APP SETUP ============

app = FastAPI(title="Monitor de Equipos", version="1.0.0", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Monitor de Equipos API v1.0"}

# --- Devices ---

@api_router.get("/devices")
async def get_devices():
    devices = await devices_collection.find({}, {"_id": 0}).to_list(length=None)
    return {"devices": devices}

@api_router.post("/devices")
async def create_device(device_data: DeviceCreate):
    # Check if device with same IP:port exists
    existing = await devices_collection.find_one({
        "ip_address": device_data.ip_address,
        "port": device_data.port
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con esa IP y puerto")
    
    device = Device(
        name=device_data.name,
        ip_address=device_data.ip_address,
        port=device_data.port,
        description=device_data.description or ""
    )
    
    await devices_collection.insert_one(device.model_dump())
    return {"message": "Dispositivo creado", "device": device.model_dump()}

@api_router.get("/devices/{device_id}")
async def get_device(device_id: str):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return device

@api_router.put("/devices/{device_id}")
async def update_device(device_id: str, device_data: DeviceUpdate):
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    update_dict = {k: v for k, v in device_data.model_dump().items() if v is not None}
    if update_dict:
        await devices_collection.update_one({"id": device_id}, {"$set": update_dict})
    
    updated = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    return {"message": "Dispositivo actualizado", "device": updated}

@api_router.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    result = await devices_collection.delete_one({"id": device_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Also delete history
    await history_collection.delete_many({"device_id": device_id})
    
    return {"message": "Dispositivo eliminado"}

@api_router.post("/devices/{device_id}/check")
async def check_device_manual(device_id: str, background_tasks: BackgroundTasks):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Update status to checking
    await devices_collection.update_one({"id": device_id}, {"$set": {"status": "checking"}})
    
    # Perform check
    result = await check_device(device)
    return {"message": "Verificación completada", "result": result}

@api_router.post("/devices/check-all")
async def check_all_devices():
    await monitor_all_devices()
    return {"message": "Verificación de todos los dispositivos iniciada"}

# --- History ---

@api_router.get("/devices/{device_id}/history")
async def get_device_history(device_id: str, limit: int = 100):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    history = await history_collection.find(
        {"device_id": device_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    return {"device": device, "history": history}

# --- Alerts ---

@api_router.get("/alerts")
async def get_alerts(limit: int = 50):
    alerts = await alerts_collection.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    return {"alerts": alerts}

# --- Settings ---

@api_router.get("/settings")
async def get_settings():
    settings = await settings_collection.find_one({}, {"_id": 0})
    if settings:
        # Hide password
        settings["gmail_app_password"] = "********" if settings.get("gmail_app_password") else None
    return {"settings": settings}

@api_router.post("/settings")
async def save_settings(settings: EmailSettings):
    settings_dict = settings.model_dump()
    
    # Upsert settings
    await settings_collection.update_one(
        {},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Configuración guardada"}

@api_router.post("/settings/test-email")
async def test_email():
    """Send a test email to verify configuration"""
    settings = await settings_collection.find_one({}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=400, detail="No hay configuración de email")
    
    try:
        gmail_user = settings.get("gmail_user")
        gmail_password = settings.get("gmail_app_password")
        alert_email = settings.get("alert_email")
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "✅ Test de Email - Monitor de Equipos"
        msg['From'] = gmail_user
        msg['To'] = alert_email
        
        html = """
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #22c55e;">✅ Configuración Correcta</h2>
                <p>Este es un email de prueba del Monitor de Equipos.</p>
                <p>Si recibes este mensaje, la configuración de alertas por email está funcionando correctamente.</p>
            </body>
        </html>
        """
        msg.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, [alert_email], msg.as_string())
        
        return {"message": "Email de prueba enviado correctamente"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enviando email: {str(e)}")

# ============ INCLUDE ROUTER & MIDDLEWARE ============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
