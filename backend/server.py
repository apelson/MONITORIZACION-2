from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
from datetime import datetime, timezone, timedelta
import socket
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import jwt
from passlib.context import CryptContext
import time

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
users_collection = db["users"]
groups_collection = db["groups"]

# Scheduler
scheduler = AsyncIOScheduler()

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "siempria-network-monitor-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ============ AUTH MODELS ============

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "viewer"  # admin, manager, viewer
    full_name: Optional[str] = ""

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: str = "viewer"
    full_name: str = ""
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

# ============ GROUP MODELS ============

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#3b82f6"  # Default blue

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class Group(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    color: str = "#3b82f6"
    created_by: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============ DEVICE MODELS ============

class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    port: int
    description: Optional[str] = ""
    group_id: Optional[str] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    description: Optional[str] = None
    group_id: Optional[str] = None

class Device(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ip_address: str
    port: int
    description: str = ""
    group_id: Optional[str] = None
    status: str = "unknown"
    last_check: Optional[str] = None
    last_online: Optional[str] = None
    created_by: str = ""
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
    alert_type: str
    message: str
    email_sent: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmailSettings(BaseModel):
    alert_email: EmailStr
    gmail_user: str
    gmail_app_password: str

# ============ AUTH FUNCTIONS ============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        user = await users_collection.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Usuario desactivado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
        return current_user
    return role_checker

# ============ EMAIL SERVICE ============

async def send_alert_email(device_name: str, device_ip: str, port: int, alert_type: str):
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
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #4a4a4a; font-size: 18px; margin: 0;">SIEMPRIA</h1>
                        <p style="color: #888; font-size: 12px; margin: 4px 0 0 0;">Network Monitor</p>
                    </div>
                    <h2 style="color: {'#ef4444' if alert_type == 'device_down' else '#22c55e'}; margin-top: 0;">
                        {'⚠️ Dispositivo Offline' if alert_type == 'device_down' else '✅ Dispositivo Recuperado'}
                    </h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #71717a;">Nombre:</td><td style="padding: 8px 0; font-weight: 500; font-family: monospace;">{device_name}</td></tr>
                        <tr><td style="padding: 8px 0; color: #71717a;">IP:</td><td style="padding: 8px 0; font-family: monospace;">{device_ip}</td></tr>
                        <tr><td style="padding: 8px 0; color: #71717a;">Puerto:</td><td style="padding: 8px 0; font-family: monospace;">{port}</td></tr>
                        <tr><td style="padding: 8px 0; color: #71717a;">Hora:</td><td style="padding: 8px 0;">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</td></tr>
                    </table>
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
    try:
        start_time = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        end_time = time.time()
        sock.close()
        response_time = (end_time - start_time) * 1000
        success = result == 0
        logger.info(f"TCP check {ip}:{port} - result={result}, success={success}, time={response_time:.0f}ms")
        return success, response_time
    except Exception as e:
        logger.error(f"TCP check error for {ip}:{port}: {str(e)}")
        return False, 0

def check_ping(ip: str, timeout: float = 5.0) -> tuple[bool, float]:
    try:
        start_time = time.time()
        for test_port in [80, 443, 22, 8080]:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((ip, test_port))
                sock.close()
                if result == 0:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000
                    return True, response_time
            except:
                continue
        return False, 0
    except Exception as e:
        logger.error(f"Ping check error for {ip}: {str(e)}")
        return False, 0

async def check_device(device: dict) -> dict:
    device_id = device["id"]
    ip = device["ip_address"]
    port = device["port"]
    
    loop = asyncio.get_event_loop()
    ping_success, ping_time = await loop.run_in_executor(None, check_ping, ip)
    port_success, port_time = await loop.run_in_executor(None, check_tcp_port, ip, port)
    
    is_online = port_success
    response_time = port_time if port_success else ping_time
    new_status = "online" if is_online else "offline"
    old_status = device.get("status", "unknown")
    now = datetime.now(timezone.utc).isoformat()
    
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
    
    update_data = {"status": new_status, "last_check": now}
    if is_online:
        update_data["last_online"] = now
    
    await devices_collection.update_one({"id": device_id}, {"$set": update_data})
    
    if old_status != "unknown" and old_status != new_status:
        alert_type = "device_down" if new_status == "offline" else "device_up"
        email_sent = await send_alert_email(device["name"], device["ip_address"], device["port"], alert_type)
        
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
    
    return {"device_id": device_id, "status": new_status, "ping_success": ping_success, "port_success": port_success, "response_time_ms": response_time}

async def monitor_all_devices():
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
    scheduler.add_job(monitor_all_devices, IntervalTrigger(minutes=5), id="device_monitor_job", replace_existing=True)
    scheduler.start()
    logger.info("Device monitoring scheduler started (every 5 minutes)")
    
    await devices_collection.create_index("id", unique=True)
    await history_collection.create_index([("device_id", 1), ("timestamp", -1)])
    await alerts_collection.create_index("timestamp")
    await users_collection.create_index("id", unique=True)
    await users_collection.create_index("username", unique=True)
    await groups_collection.create_index("id", unique=True)
    
    # Create default admin if not exists
    admin = await users_collection.find_one({"username": "admin"})
    if not admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "email": "admin@siempria.com",
            "password_hash": get_password_hash("admin123"),
            "role": "admin",
            "full_name": "Administrador",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await users_collection.insert_one(admin_user)
        logger.info("Default admin user created (admin/admin123)")
    
    yield
    
    scheduler.shutdown()
    client.close()

# ============ APP SETUP ============

app = FastAPI(title="Siempria Network Monitor", version="2.0.0", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ============ AUTH ROUTES ============

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await users_collection.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Usuario desactivado")
    
    token = create_access_token({"sub": user["id"], "username": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user.get("full_name", "")
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/change-password")
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    user = await users_collection.find_one({"id": current_user["id"]})
    if not verify_password(data.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    
    await users_collection.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": get_password_hash(data.new_password)}}
    )
    return {"message": "Contraseña actualizada"}

# ============ USER ROUTES (Admin only) ============

@api_router.get("/users")
async def get_users(current_user: dict = Depends(require_role(["admin"]))):
    users = await users_collection.find({}, {"_id": 0, "password_hash": 0}).to_list(length=None)
    return {"users": users}

@api_router.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_role(["admin"]))):
    existing = await users_collection.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    
    user = {
        "id": str(uuid.uuid4()),
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role,
        "full_name": user_data.full_name or "",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await users_collection.insert_one(user)
    del user["password_hash"]
    del user["_id"] if "_id" in user else None
    return {"message": "Usuario creado", "user": user}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(require_role(["admin"]))):
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_dict:
        await users_collection.update_one({"id": user_id}, {"$set": update_dict})
    
    updated = await users_collection.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"message": "Usuario actualizado", "user": updated}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    result = await users_collection.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}

@api_router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    new_password = "password123"
    await users_collection.update_one({"id": user_id}, {"$set": {"password_hash": get_password_hash(new_password)}})
    return {"message": f"Contraseña restablecida a: {new_password}"}

# ============ GROUP ROUTES ============

@api_router.get("/groups")
async def get_groups(current_user: dict = Depends(get_current_user)):
    groups = await groups_collection.find({}, {"_id": 0}).to_list(length=None)
    # Get device count per group
    for group in groups:
        count = await devices_collection.count_documents({"group_id": group["id"]})
        group["device_count"] = count
    return {"groups": groups}

@api_router.post("/groups")
async def create_group(group_data: GroupCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    group = Group(
        name=group_data.name,
        description=group_data.description or "",
        color=group_data.color or "#3b82f6",
        created_by=current_user["id"]
    )
    await groups_collection.insert_one(group.model_dump())
    return {"message": "Grupo creado", "group": group.model_dump()}

@api_router.put("/groups/{group_id}")
async def update_group(group_id: str, group_data: GroupUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    group = await groups_collection.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    update_dict = {k: v for k, v in group_data.model_dump().items() if v is not None}
    if update_dict:
        await groups_collection.update_one({"id": group_id}, {"$set": update_dict})
    
    updated = await groups_collection.find_one({"id": group_id}, {"_id": 0})
    return {"message": "Grupo actualizado", "group": updated}

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(require_role(["admin", "manager"]))):
    result = await groups_collection.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # Remove group_id from devices
    await devices_collection.update_many({"group_id": group_id}, {"$set": {"group_id": None}})
    return {"message": "Grupo eliminado"}

# ============ DEVICE ROUTES ============

@api_router.get("/devices")
async def get_devices(group_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"group_id": group_id} if group_id else {}
    devices = await devices_collection.find(query, {"_id": 0}).to_list(length=None)
    return {"devices": devices}

@api_router.post("/devices")
async def create_device(device_data: DeviceCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    existing = await devices_collection.find_one({"ip_address": device_data.ip_address, "port": device_data.port})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con esa IP y puerto")
    
    device = Device(
        name=device_data.name,
        ip_address=device_data.ip_address,
        port=device_data.port,
        description=device_data.description or "",
        group_id=device_data.group_id,
        created_by=current_user["id"]
    )
    await devices_collection.insert_one(device.model_dump())
    return {"message": "Dispositivo creado", "device": device.model_dump()}

@api_router.get("/devices/{device_id}")
async def get_device(device_id: str, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return device

@api_router.put("/devices/{device_id}")
async def update_device(device_id: str, device_data: DeviceUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    update_dict = {k: v for k, v in device_data.model_dump().items() if v is not None}
    if update_dict:
        await devices_collection.update_one({"id": device_id}, {"$set": update_dict})
    
    updated = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    return {"message": "Dispositivo actualizado", "device": updated}

@api_router.delete("/devices/{device_id}")
async def delete_device(device_id: str, current_user: dict = Depends(require_role(["admin", "manager"]))):
    result = await devices_collection.delete_one({"id": device_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    await history_collection.delete_many({"device_id": device_id})
    return {"message": "Dispositivo eliminado"}

@api_router.post("/devices/{device_id}/check")
async def check_device_manual(device_id: str, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    await devices_collection.update_one({"id": device_id}, {"$set": {"status": "checking"}})
    result = await check_device(device)
    return {"message": "Verificación completada", "result": result}

@api_router.post("/devices/check-all")
async def check_all_devices(current_user: dict = Depends(get_current_user)):
    await monitor_all_devices()
    return {"message": "Verificación de todos los dispositivos iniciada"}

# ============ HISTORY & ALERTS ============

@api_router.get("/devices/{device_id}/history")
async def get_device_history(device_id: str, limit: int = 100, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    history = await history_collection.find({"device_id": device_id}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    return {"device": device, "history": history}

@api_router.get("/alerts")
async def get_alerts(limit: int = 50, current_user: dict = Depends(get_current_user)):
    alerts = await alerts_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    return {"alerts": alerts}

# ============ SETTINGS ============

@api_router.get("/settings")
async def get_settings(current_user: dict = Depends(require_role(["admin"]))):
    settings = await settings_collection.find_one({}, {"_id": 0})
    if settings:
        settings["gmail_app_password"] = "********" if settings.get("gmail_app_password") else None
    return {"settings": settings}

@api_router.post("/settings")
async def save_settings(settings: EmailSettings, current_user: dict = Depends(require_role(["admin"]))):
    await settings_collection.update_one({}, {"$set": settings.model_dump()}, upsert=True)
    return {"message": "Configuración guardada"}

@api_router.post("/settings/test-email")
async def test_email(current_user: dict = Depends(require_role(["admin"]))):
    settings = await settings_collection.find_one({}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=400, detail="No hay configuración de email")
    
    try:
        gmail_user = settings.get("gmail_user")
        gmail_password = settings.get("gmail_app_password")
        alert_email = settings.get("alert_email")
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "✅ Test - Siempria Network Monitor"
        msg['From'] = gmail_user
        msg['To'] = alert_email
        
        html = """<html><body style="font-family: Arial; padding: 20px;">
            <h2 style="color: #22c55e;">✅ Configuración Correcta</h2>
            <p>Este es un email de prueba de Siempria Network Monitor.</p>
        </body></html>"""
        msg.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, [alert_email], msg.as_string())
        
        return {"message": "Email de prueba enviado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enviando email: {str(e)}")

@api_router.get("/")
async def root():
    return {"message": "Siempria Network Monitor API v2.0"}

# ============ INCLUDE ROUTER & MIDDLEWARE ============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
