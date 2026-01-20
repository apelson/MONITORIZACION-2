from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
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
import io
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import urllib.request
import base64
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
devices_collection = db["devices"]
history_collection = db["status_history"]
alerts_collection = db["alerts"]
settings_collection = db["settings"]
users_collection = db["users"]
organizations_collection = db["organizations"]
groups_collection = db["groups"]
device_types_collection = db["device_types"]
scheduled_reports_collection = db["scheduled_reports"]
public_dashboards_collection = db["public_dashboards"]

scheduler = AsyncIOScheduler()

SECRET_KEY = os.environ.get("SECRET_KEY", "siempria-network-monitor-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ============ MODELS ============

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "viewer"
    full_name: Optional[str] = ""

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    username: str
    password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

# Organization
class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#3b82f6"
    logo_url: Optional[str] = ""

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    logo_url: Optional[str] = None

# Group (belongs to Organization)
class GroupCreate(BaseModel):
    name: str
    organization_id: str
    description: Optional[str] = ""
    color: Optional[str] = "#22c55e"

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    organization_id: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

# Device Type
class DeviceTypeCreate(BaseModel):
    name: str
    icon: str = "server"  # lucide icon name
    color: Optional[str] = "#6b7280"

class DeviceTypeUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

# Device (expanded)
class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    port: int
    description: Optional[str] = ""
    group_id: Optional[str] = None
    device_type_id: Optional[str] = None
    # New fields
    brand: Optional[str] = ""
    model: Optional[str] = ""
    location: Optional[str] = ""
    notes: Optional[str] = ""
    image_url: Optional[str] = ""
    # Camera fields
    camera_protocol: Optional[str] = "http"  # http or https
    camera_user: Optional[str] = ""
    camera_password: Optional[str] = ""
    camera_path: Optional[str] = ""

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    description: Optional[str] = None
    group_id: Optional[str] = None
    device_type_id: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    camera_protocol: Optional[str] = None  # http or https
    camera_user: Optional[str] = None
    camera_password: Optional[str] = None
    camera_path: Optional[str] = None

class EmailSettings(BaseModel):
    alert_email: EmailStr
    gmail_user: str
    gmail_app_password: str

class ScheduledReportConfig(BaseModel):
    enabled: bool = False
    frequency: str = "weekly"  # daily, weekly, monthly
    day_of_week: int = 0  # 0=Monday, 6=Sunday (for weekly)
    day_of_month: int = 1  # 1-28 (for monthly)
    hour: int = 8  # Hour to send (0-23)
    recipient_emails: List[str] = []
    include_offline_list: bool = True
    include_uptime_stats: bool = True
    organization_ids: List[str] = []  # Empty = all organizations

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
            return False
        gmail_user = settings.get("gmail_user")
        gmail_password = settings.get("gmail_app_password")
        alert_email = settings.get("alert_email")
        if not all([gmail_user, gmail_password, alert_email]):
            return False
        
        subject = f"🔴 ALERTA: {device_name} está OFFLINE" if alert_type == "device_down" else f"🟢 RECUPERADO: {device_name} está ONLINE"
        html_body = f"""
        <html><body style="font-family: 'Inter', Arial; background: #f4f4f5; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; border: 1px solid #e4e4e7;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4a4a4a; font-size: 18px; margin: 0;">SIEMPRIA Network Monitor</h1>
                </div>
                <h2 style="color: {'#ef4444' if alert_type == 'device_down' else '#22c55e'};">
                    {'⚠️ Dispositivo Offline' if alert_type == 'device_down' else '✅ Dispositivo Recuperado'}
                </h2>
                <table style="width: 100%;">
                    <tr><td style="padding: 8px 0; color: #71717a;">Nombre:</td><td style="font-weight: 500; font-family: monospace;">{device_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #71717a;">IP:</td><td style="font-family: monospace;">{device_ip}:{port}</td></tr>
                    <tr><td style="padding: 8px 0; color: #71717a;">Hora:</td><td>{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</td></tr>
                </table>
            </div>
        </body></html>
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
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

# ============ MONITORING ============

def check_tcp_port(ip: str, port: int, timeout: float = 5.0) -> tuple[bool, float]:
    try:
        start_time = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        end_time = time.time()
        sock.close()
        return result == 0, (end_time - start_time) * 1000
    except:
        return False, 0

def check_ping(ip: str, timeout: float = 5.0) -> tuple[bool, float]:
    try:
        start_time = time.time()
        for test_port in [80, 443, 22, 8080]:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                if sock.connect_ex((ip, test_port)) == 0:
                    sock.close()
                    return True, (time.time() - start_time) * 1000
                sock.close()
            except:
                continue
        return False, 0
    except:
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
    
    await history_collection.insert_one({
        "id": str(uuid.uuid4()), "device_id": device_id, "status": new_status,
        "ping_success": ping_success, "port_success": port_success,
        "response_time_ms": response_time if response_time > 0 else None, "timestamp": now
    })
    
    update_data = {"status": new_status, "last_check": now}
    if is_online:
        update_data["last_online"] = now
    await devices_collection.update_one({"id": device_id}, {"$set": update_data})
    
    if old_status != "unknown" and old_status != new_status:
        alert_type = "device_down" if new_status == "offline" else "device_up"
        email_sent = await send_alert_email(device["name"], ip, port, alert_type)
        await alerts_collection.insert_one({
            "id": str(uuid.uuid4()), "device_id": device_id, "device_name": device["name"],
            "device_ip": ip, "alert_type": alert_type,
            "message": f"Dispositivo {device['name']} ({ip}:{port}) cambió a {new_status}",
            "email_sent": email_sent, "timestamp": now
        })
    
    return {"device_id": device_id, "status": new_status, "ping_success": ping_success, "port_success": port_success, "response_time_ms": response_time}

async def monitor_all_devices():
    try:
        devices = await devices_collection.find({}, {"_id": 0}).to_list(length=None)
        for device in devices:
            try:
                await check_device(device)
            except Exception as e:
                logger.error(f"Error checking device {device.get('name')}: {e}")
    except Exception as e:
        logger.error(f"Error in monitor_all_devices: {e}")

# ============ LIFESPAN ============

DEFAULT_DEVICE_TYPES = [
    {"id": "type-camera", "name": "Cámara", "icon": "camera", "color": "#8b5cf6"},
    {"id": "type-nas", "name": "NAS", "icon": "hard-drive", "color": "#f59e0b"},
    {"id": "type-switch", "name": "Switch", "icon": "network", "color": "#22c55e"},
    {"id": "type-router", "name": "Router", "icon": "router", "color": "#3b82f6"},
    {"id": "type-server", "name": "Servidor", "icon": "server", "color": "#ef4444"},
    {"id": "type-pc", "name": "PC/Workstation", "icon": "monitor", "color": "#06b6d4"},
    {"id": "type-printer", "name": "Impresora", "icon": "printer", "color": "#84cc16"},
    {"id": "type-access-point", "name": "Access Point", "icon": "wifi", "color": "#ec4899"},
    {"id": "type-firewall", "name": "Firewall", "icon": "shield", "color": "#f97316"},
    {"id": "type-other", "name": "Otro", "icon": "box", "color": "#6b7280"},
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(monitor_all_devices, IntervalTrigger(minutes=5), id="device_monitor_job", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started")
    
    # Indexes
    await devices_collection.create_index("id", unique=True)
    await history_collection.create_index([("device_id", 1), ("timestamp", -1)])
    await alerts_collection.create_index("timestamp")
    await users_collection.create_index("id", unique=True)
    await users_collection.create_index("username", unique=True)
    await organizations_collection.create_index("id", unique=True)
    await groups_collection.create_index("id", unique=True)
    await device_types_collection.create_index("id", unique=True)
    
    # Default admin
    if not await users_collection.find_one({"username": "admin"}):
        await users_collection.insert_one({
            "id": str(uuid.uuid4()), "username": "admin", "email": "admin@siempria.com",
            "password_hash": get_password_hash("admin123"), "role": "admin",
            "full_name": "Administrador", "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Default operator
    if not await users_collection.find_one({"username": "operador"}):
        await users_collection.insert_one({
            "id": str(uuid.uuid4()), "username": "operador", "email": "operador@siempria.com",
            "password_hash": get_password_hash("operador123"), "role": "operator",
            "full_name": "Operador", "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Default device types
    for dt in DEFAULT_DEVICE_TYPES:
        if not await device_types_collection.find_one({"id": dt["id"]}):
            await device_types_collection.insert_one({**dt, "is_default": True, "created_at": datetime.now(timezone.utc).isoformat()})
    
    yield
    scheduler.shutdown()
    client.close()

# ============ APP ============

app = FastAPI(title="Siempria Network Monitor", version="2.1.0", lifespan=lifespan)
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
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "username": user["username"], "email": user["email"], "role": user["role"], "full_name": user.get("full_name", "")}}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/change-password")
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    user = await users_collection.find_one({"id": current_user["id"]})
    if not verify_password(data.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    await users_collection.update_one({"id": current_user["id"]}, {"$set": {"password_hash": get_password_hash(data.new_password)}})
    return {"message": "Contraseña actualizada"}

# ============ USER ROUTES ============

@api_router.get("/users")
async def get_users(current_user: dict = Depends(require_role(["admin"]))):
    return {"users": await users_collection.find({}, {"_id": 0, "password_hash": 0}).to_list(length=None)}

@api_router.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_role(["admin"]))):
    if await users_collection.find_one({"username": user_data.username}):
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    user = {"id": str(uuid.uuid4()), "username": user_data.username, "email": user_data.email,
            "password_hash": get_password_hash(user_data.password), "role": user_data.role,
            "full_name": user_data.full_name or "", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    await users_collection.insert_one(user)
    user.pop("password_hash"); user.pop("_id", None)
    return {"message": "Usuario creado", "user": user}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(require_role(["admin"]))):
    if not await users_collection.find_one({"id": user_id}):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    update = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update:
        await users_collection.update_one({"id": user_id}, {"$set": update})
    return {"message": "Usuario actualizado", "user": await users_collection.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})}

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
    if not await users_collection.find_one({"id": user_id}):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await users_collection.update_one({"id": user_id}, {"$set": {"password_hash": get_password_hash("password123")}})
    return {"message": "Contraseña restablecida a: password123"}

# ============ ORGANIZATION ROUTES ============

@api_router.get("/organizations")
async def get_organizations(current_user: dict = Depends(get_current_user)):
    orgs = await organizations_collection.find({}, {"_id": 0}).to_list(length=None)
    for org in orgs:
        org["group_count"] = await groups_collection.count_documents({"organization_id": org["id"]})
    return {"organizations": orgs}

@api_router.post("/organizations")
async def create_organization(data: OrganizationCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    org = {"id": str(uuid.uuid4()), "name": data.name, "description": data.description or "",
           "color": data.color or "#3b82f6", "logo_url": data.logo_url or "",
           "created_by": current_user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await organizations_collection.insert_one(org)
    return {"message": "Organización creada", "organization": org}

@api_router.put("/organizations/{org_id}")
async def update_organization(org_id: str, data: OrganizationUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if not await organizations_collection.find_one({"id": org_id}):
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await organizations_collection.update_one({"id": org_id}, {"$set": update})
    return {"message": "Organización actualizada", "organization": await organizations_collection.find_one({"id": org_id}, {"_id": 0})}

@api_router.delete("/organizations/{org_id}")
async def delete_organization(org_id: str, current_user: dict = Depends(require_role(["admin", "manager"]))):
    result = await organizations_collection.delete_one({"id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    # Delete groups and unassign devices
    group_ids = [g["id"] for g in await groups_collection.find({"organization_id": org_id}, {"id": 1}).to_list(length=None)]
    await groups_collection.delete_many({"organization_id": org_id})
    if group_ids:
        await devices_collection.update_many({"group_id": {"$in": group_ids}}, {"$set": {"group_id": None}})
    return {"message": "Organización eliminada"}

# ============ GROUP ROUTES ============

@api_router.get("/groups")
async def get_groups(organization_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"organization_id": organization_id} if organization_id else {}
    groups = await groups_collection.find(query, {"_id": 0}).to_list(length=None)
    for g in groups:
        g["device_count"] = await devices_collection.count_documents({"group_id": g["id"]})
    return {"groups": groups}

@api_router.post("/groups")
async def create_group(data: GroupCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if not await organizations_collection.find_one({"id": data.organization_id}):
        raise HTTPException(status_code=400, detail="Organización no encontrada")
    group = {"id": str(uuid.uuid4()), "name": data.name, "organization_id": data.organization_id,
             "description": data.description or "", "color": data.color or "#22c55e",
             "created_by": current_user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await groups_collection.insert_one(group)
    return {"message": "Grupo creado", "group": group}

@api_router.put("/groups/{group_id}")
async def update_group(group_id: str, data: GroupUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if not await groups_collection.find_one({"id": group_id}):
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await groups_collection.update_one({"id": group_id}, {"$set": update})
    return {"message": "Grupo actualizado", "group": await groups_collection.find_one({"id": group_id}, {"_id": 0})}

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(require_role(["admin", "manager"]))):
    result = await groups_collection.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    await devices_collection.update_many({"group_id": group_id}, {"$set": {"group_id": None}})
    return {"message": "Grupo eliminado"}

# ============ DEVICE TYPE ROUTES ============

@api_router.get("/device-types")
async def get_device_types(current_user: dict = Depends(get_current_user)):
    return {"device_types": await device_types_collection.find({}, {"_id": 0}).to_list(length=None)}

@api_router.post("/device-types")
async def create_device_type(data: DeviceTypeCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    dt = {"id": str(uuid.uuid4()), "name": data.name, "icon": data.icon, "color": data.color or "#6b7280",
          "is_default": False, "created_at": datetime.now(timezone.utc).isoformat()}
    await device_types_collection.insert_one(dt)
    return {"message": "Tipo creado", "device_type": dt}

@api_router.put("/device-types/{type_id}")
async def update_device_type(type_id: str, data: DeviceTypeUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if not await device_types_collection.find_one({"id": type_id}):
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await device_types_collection.update_one({"id": type_id}, {"$set": update})
    return {"message": "Tipo actualizado", "device_type": await device_types_collection.find_one({"id": type_id}, {"_id": 0})}

@api_router.delete("/device-types/{type_id}")
async def delete_device_type(type_id: str, current_user: dict = Depends(require_role(["admin", "manager"]))):
    dt = await device_types_collection.find_one({"id": type_id})
    if not dt:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    if dt.get("is_default"):
        raise HTTPException(status_code=400, detail="No se pueden eliminar tipos predeterminados")
    await device_types_collection.delete_one({"id": type_id})
    await devices_collection.update_many({"device_type_id": type_id}, {"$set": {"device_type_id": None}})
    return {"message": "Tipo eliminado"}

# ============ DEVICE ROUTES ============

@api_router.get("/devices")
async def get_devices(group_id: Optional[str] = None, organization_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if group_id:
        query["group_id"] = group_id
    elif organization_id:
        group_ids = [g["id"] for g in await groups_collection.find({"organization_id": organization_id}, {"id": 1}).to_list(length=None)]
        if group_ids:
            query["group_id"] = {"$in": group_ids}
    
    # Operators only see cameras (type-camera) that are online
    if current_user.get("role") == "operator":
        query["device_type_id"] = "type-camera"
        query["status"] = "online"
    
    return {"devices": await devices_collection.find(query, {"_id": 0}).to_list(length=None)}

# Operator cameras view - only online cameras with images
@api_router.get("/cameras")
async def get_cameras(current_user: dict = Depends(get_current_user)):
    """Get all cameras (for operators view)"""
    query = {"device_type_id": "type-camera"}
    cameras = await devices_collection.find(query, {"_id": 0}).to_list(length=None)
    return {"cameras": cameras}

@api_router.post("/devices")
async def create_device(data: DeviceCreate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    if await devices_collection.find_one({"ip_address": data.ip_address, "port": data.port}):
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con esa IP y puerto")
    
    # Build image_url from camera fields if provided
    image_url = data.image_url or ""
    protocol = data.camera_protocol or "http"
    if data.camera_user and data.camera_password and data.camera_path:
        image_url = f"{protocol}://{data.camera_user}:{data.camera_password}@{data.ip_address}:{data.port}{data.camera_path}"
    
    device = {
        "id": str(uuid.uuid4()), "name": data.name, "ip_address": data.ip_address, "port": data.port,
        "description": data.description or "", "group_id": data.group_id, "device_type_id": data.device_type_id,
        "brand": data.brand or "", "model": data.model or "", "location": data.location or "",
        "notes": data.notes or "", "image_url": image_url,
        "camera_protocol": protocol,
        "camera_user": data.camera_user or "", "camera_password": data.camera_password or "",
        "camera_path": data.camera_path or "",
        "status": "unknown", "last_check": None, "last_online": None,
        "created_by": current_user["id"], "created_at": datetime.now(timezone.utc).isoformat()
    }
    await devices_collection.insert_one(device)
    return {"message": "Dispositivo creado", "device": device}

@api_router.get("/devices/{device_id}")
async def get_device(device_id: str, current_user: dict = Depends(get_current_user)):
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return device

@api_router.put("/devices/{device_id}")
async def update_device(device_id: str, data: DeviceUpdate, current_user: dict = Depends(require_role(["admin", "manager"]))):
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Rebuild image_url if camera fields are updated
    camera_protocol = update.get("camera_protocol", device.get("camera_protocol", "http"))
    camera_user = update.get("camera_user", device.get("camera_user", ""))
    camera_password = update.get("camera_password", device.get("camera_password", ""))
    camera_path = update.get("camera_path", device.get("camera_path", ""))
    ip_address = update.get("ip_address", device.get("ip_address", ""))
    port = update.get("port", device.get("port", ""))
    
    if camera_user and camera_password and camera_path:
        update["image_url"] = f"{camera_protocol}://{camera_user}:{camera_password}@{ip_address}:{port}{camera_path}"
    
    if update:
        await devices_collection.update_one({"id": device_id}, {"$set": update})
    return {"message": "Dispositivo actualizado", "device": await devices_collection.find_one({"id": device_id}, {"_id": 0})}

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
    asyncio.create_task(monitor_all_devices())
    return {"message": "Verificación iniciada"}

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
    return {"alerts": await alerts_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)}

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
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "✅ Test - Siempria Network Monitor"
        msg['From'] = settings["gmail_user"]
        msg['To'] = settings["alert_email"]
        msg.attach(MIMEText("<h2 style='color:#22c55e'>✅ Configuración correcta</h2><p>Email de prueba de Siempria Network Monitor.</p>", 'html'))
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(settings["gmail_user"], settings["gmail_app_password"])
            server.sendmail(settings["gmail_user"], [settings["alert_email"]], msg.as_string())
        return {"message": "Email enviado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@api_router.get("/")
async def root():
    return {"message": "Siempria Network Monitor API v2.2"}

# ============ IMAGE PROXY ============

@api_router.get("/image-proxy/{device_id}")
async def image_proxy(device_id: str, current_user: dict = Depends(get_current_user)):
    """Proxy to load device images with authentication"""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Build URL from individual fields to avoid @ parsing issues in passwords
    protocol = device.get("camera_protocol", "http")
    ip = device.get("ip_address", "")
    port = device.get("port", 80)
    camera_user = device.get("camera_user", "")
    camera_password = device.get("camera_password", "")
    camera_path = device.get("camera_path", "")
    
    # If no camera path, try to use image_url directly
    if not camera_path:
        image_url = device.get("image_url", "")
        if not image_url:
            raise HTTPException(status_code=404, detail="No hay imagen configurada")
        # For URLs without separate fields, try direct fetch
        try:
            request = urllib.request.Request(image_url)
            request.add_header("User-Agent", "Mozilla/5.0 SiempriaMonitor/1.0")
            with urllib.request.urlopen(request, timeout=10) as response:
                image_data = response.read()
                content_type = response.headers.get('Content-Type', 'image/jpeg')
            return StreamingResponse(
                io.BytesIO(image_data),
                media_type=content_type,
                headers={"Cache-Control": "max-age=30"}
            )
        except Exception as e:
            logger.error(f"Error fetching image from URL for device {device_id}: {str(e)}")
            raise HTTPException(status_code=502, detail="No se pudo cargar la imagen")
    
    # Build clean URL without credentials
    clean_url = f"{protocol}://{ip}:{port}{camera_path}"
    
    try:
        request = urllib.request.Request(clean_url)
        
        # Add basic auth if credentials exist
        if camera_user and camera_password:
            credentials = base64.b64encode(f"{camera_user}:{camera_password}".encode()).decode()
            request.add_header("Authorization", f"Basic {credentials}")
        
        request.add_header("User-Agent", "Mozilla/5.0 SiempriaMonitor/1.0")
        
        # Fetch image with timeout
        with urllib.request.urlopen(request, timeout=10) as response:
            image_data = response.read()
            content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        return StreamingResponse(
            io.BytesIO(image_data),
            media_type=content_type,
            headers={"Cache-Control": "max-age=30"}
        )
        
    except urllib.error.HTTPError as e:
        logger.error(f"HTTP error fetching image for device {device_id}: {e.code}")
        raise HTTPException(status_code=502, detail=f"Error al cargar imagen: HTTP {e.code}")
    except urllib.error.URLError as e:
        logger.error(f"URL error fetching image for device {device_id}: {e.reason}")
        raise HTTPException(status_code=502, detail="No se pudo conectar al dispositivo")
    except Exception as e:
        logger.error(f"Error fetching image for device {device_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al cargar imagen")

# ============ MOBOTIX CAMERA INFO ============

@api_router.get("/devices/{device_id}/mobotix-info")
async def get_mobotix_info(device_id: str, current_user: dict = Depends(get_current_user)):
    """Get Mobotix camera information using HTTP API"""
    device = await devices_collection.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Build base URL with authentication
    protocol = device.get("camera_protocol", "http")
    ip = device.get("ip_address", "")
    port = device.get("port", 80)
    camera_user = device.get("camera_user", "")
    camera_password = device.get("camera_password", "")
    
    if not ip:
        raise HTTPException(status_code=400, detail="IP del dispositivo no configurada")
    
    base_url = f"{protocol}://{ip}:{port}"
    info = {
        "device_id": device_id,
        "device_name": device.get("name", ""),
        "ip_address": f"{ip}:{port}",
        "protocol": protocol,
        "mobotix_info": None,
        "device_status": None,
        "configuration": None,
        "errors": []
    }
    
    # Helper to make authenticated requests
    def make_request(url_path: str, timeout: int = 5):
        try:
            full_url = f"{base_url}{url_path}"
            request = urllib.request.Request(full_url)
            if camera_user and camera_password:
                credentials = base64.b64encode(f"{camera_user}:{camera_password}".encode()).decode()
                request.add_header("Authorization", f"Basic {credentials}")
            request.add_header("User-Agent", "Mozilla/5.0 SiempriaMonitor/1.0")
            
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read().decode('utf-8', errors='ignore')
        except urllib.error.HTTPError as e:
            return f"HTTP_ERROR:{e.code}"
        except urllib.error.URLError as e:
            return f"URL_ERROR:{str(e.reason)}"
        except Exception as e:
            return f"ERROR:{str(e)}"
    
    # Try to get device info from Mobotix HTTP API
    # Method 1: Try /control/control with deviceinfo
    loop = asyncio.get_event_loop()
    
    # Try different Mobotix endpoints
    endpoints_to_try = [
        ("/control/control?listsection=deviceinfo", "device_info"),
        ("/control/control?listsection=network", "network_info"),
        ("/control/control?listsection=recording", "recording_info"),
        ("/admin/remoteconfig?action=view&section=DEVICEINFO", "remoteconfig_deviceinfo"),
        ("/cgi-bin/admin/param.cgi?action=list&group=DeviceInformation", "cgi_deviceinfo"),
    ]
    
    mobotix_data = {}
    for endpoint, key in endpoints_to_try:
        result = await loop.run_in_executor(None, make_request, endpoint)
        if not result.startswith(("HTTP_ERROR", "URL_ERROR", "ERROR")):
            mobotix_data[key] = result
        else:
            info["errors"].append(f"{key}: {result}")
    
    if mobotix_data:
        info["mobotix_info"] = mobotix_data
        info["device_status"] = "Mobotix API accessible"
    else:
        # Try generic status check
        info["device_status"] = "No Mobotix API response - may not be a Mobotix camera"
    
    # Parse common Mobotix info patterns
    parsed_info = {}
    for key, data in mobotix_data.items():
        if "=" in data:
            for line in data.split("\n"):
                if "=" in line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        param_name = parts[0].strip()
                        param_value = parts[1].strip().strip('"')
                        if param_value:
                            parsed_info[param_name] = param_value
    
    if parsed_info:
        info["configuration"] = parsed_info
    
    return info

# ============ EXPORT ROUTES ============

@api_router.get("/export/excel")
async def export_excel(organization_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Export devices to Excel file"""
    # Get all data
    devices = await devices_collection.find({}, {"_id": 0}).to_list(length=None)
    organizations = await organizations_collection.find({}, {"_id": 0}).to_list(length=None)
    groups = await groups_collection.find({}, {"_id": 0}).to_list(length=None)
    device_types = await device_types_collection.find({}, {"_id": 0}).to_list(length=None)
    
    # Filter by organization if specified
    if organization_id:
        org_group_ids = [g["id"] for g in groups if g.get("organization_id") == organization_id]
        devices = [d for d in devices if d.get("group_id") in org_group_ids]
    
    # Create lookup dicts
    org_dict = {o["id"]: o for o in organizations}
    group_dict = {g["id"]: g for g in groups}
    type_dict = {t["id"]: t for t in device_types}
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Dispositivos"
    
    # Styles
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell_alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["Nombre", "IP:Puerto", "Estado", "Tipo", "Organización", "Grupo", 
               "Marca", "Modelo", "Ubicación", "Descripción", "Notas", "Último Check", "Última Online"]
    
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border
    
    # Data rows
    for row_num, device in enumerate(devices, 2):
        group = group_dict.get(device.get("group_id"))
        org = org_dict.get(group.get("organization_id")) if group else None
        device_type = type_dict.get(device.get("device_type_id"))
        
        row_data = [
            device.get("name", ""),
            f"{device.get('ip_address', '')}:{device.get('port', '')}",
            "Online" if device.get("status") == "online" else "Offline" if device.get("status") == "offline" else "Desconocido",
            device_type.get("name", "") if device_type else "",
            org.get("name", "") if org else "",
            group.get("name", "") if group else "",
            device.get("brand", ""),
            device.get("model", ""),
            device.get("location", ""),
            device.get("description", ""),
            device.get("notes", ""),
            device.get("last_check", "")[:19].replace("T", " ") if device.get("last_check") else "",
            device.get("last_online", "")[:19].replace("T", " ") if device.get("last_online") else ""
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col, value=value)
            cell.alignment = cell_alignment
            cell.border = thin_border
            
            # Color status
            if col == 3:
                if value == "Online":
                    cell.fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
                    cell.font = Font(color="006100")
                elif value == "Offline":
                    cell.fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
                    cell.font = Font(color="9C0006")
    
    # Adjust column widths
    column_widths = [25, 20, 12, 15, 20, 20, 15, 20, 25, 30, 30, 20, 20]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width
    
    # Freeze header row
    ws.freeze_panes = "A2"
    
    # Save to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/export/pdf")
async def export_pdf(organization_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Export devices to PDF file"""
    # Get all data
    devices = await devices_collection.find({}, {"_id": 0}).to_list(length=None)
    organizations = await organizations_collection.find({}, {"_id": 0}).to_list(length=None)
    groups = await groups_collection.find({}, {"_id": 0}).to_list(length=None)
    device_types = await device_types_collection.find({}, {"_id": 0}).to_list(length=None)
    
    selected_org = None
    if organization_id:
        selected_org = next((o for o in organizations if o["id"] == organization_id), None)
        org_group_ids = [g["id"] for g in groups if g.get("organization_id") == organization_id]
        devices = [d for d in devices if d.get("group_id") in org_group_ids]
    
    # Create lookup dicts
    org_dict = {o["id"]: o for o in organizations}
    group_dict = {g["id"]: g for g in groups}
    type_dict = {t["id"]: t for t in device_types}
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), leftMargin=1*cm, rightMargin=1*cm, topMargin=1*cm, bottomMargin=2*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, alignment=TA_CENTER, spaceAfter=10)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER, textColor=colors.grey, spaceAfter=20)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER, textColor=colors.grey)
    
    # Siempria Logo (always included)
    SIEMPRIA_LOGO_URL = "https://customer-assets.emergentagent.com/job_equip-tracker-39/artifacts/796492pi_version%20autorizada%202.png"
    try:
        logo_buffer = io.BytesIO(urllib.request.urlopen(SIEMPRIA_LOGO_URL, timeout=5).read())
        siempria_logo = Image(logo_buffer, width=2.5*inch, height=1*inch)
        siempria_logo.hAlign = 'CENTER'
        elements.append(siempria_logo)
        elements.append(Spacer(1, 15))
    except Exception as e:
        logger.warning(f"Could not load Siempria logo: {e}")
    
    # Organization logo if available
    if selected_org and selected_org.get("logo_url"):
        try:
            org_logo_buffer = io.BytesIO(urllib.request.urlopen(selected_org["logo_url"], timeout=5).read())
            org_logo = Image(org_logo_buffer, width=1.5*inch, height=0.6*inch)
            org_logo.hAlign = 'CENTER'
            elements.append(org_logo)
            elements.append(Spacer(1, 10))
        except:
            pass
    
    title = f"Inventario de Dispositivos"
    if selected_org:
        title = f"Inventario - {selected_org['name']}"
    elements.append(Paragraph(title, title_style))
    elements.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')} | Total: {len(devices)} dispositivos", subtitle_style))
    
    # Table data
    table_data = [["Nombre", "IP:Puerto", "Estado", "Tipo", "Grupo", "Marca", "Modelo", "Ubicación"]]
    
    for device in devices:
        group = group_dict.get(device.get("group_id"))
        device_type = type_dict.get(device.get("device_type_id"))
        
        status = "Online" if device.get("status") == "online" else "Offline" if device.get("status") == "offline" else "?"
        
        table_data.append([
            device.get("name", "")[:25],
            f"{device.get('ip_address', '')}:{device.get('port', '')}",
            status,
            (device_type.get("name", "") if device_type else "")[:15],
            (group.get("name", "") if group else "")[:20],
            device.get("brand", "")[:15],
            device.get("model", "")[:20],
            device.get("location", "")[:25]
        ])
    
    # Create table
    col_widths = [3*cm, 3.5*cm, 1.8*cm, 2.5*cm, 3*cm, 2.5*cm, 3*cm, 4*cm]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    # Table style
    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ])
    
    # Color status cells
    for i, row in enumerate(table_data[1:], 1):
        if row[2] == "Online":
            table_style.add('BACKGROUND', (2, i), (2, i), colors.HexColor('#C6EFCE'))
            table_style.add('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#006100'))
        elif row[2] == "Offline":
            table_style.add('BACKGROUND', (2, i), (2, i), colors.HexColor('#FFC7CE'))
            table_style.add('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#9C0006'))
        
        # Alternate row colors
        if i % 2 == 0:
            table_style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F5F5F5'))
    
    table.setStyle(table_style)
    elements.append(table)
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(f"© {datetime.now().year} Siempria Network Monitor - Documento generado automáticamente", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])
