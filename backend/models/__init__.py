"""
Pydantic models for Siempria Network Monitor
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional

# ============ USER MODELS ============

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "viewer"
    full_name: Optional[str] = ""
    group_ids: Optional[List[str]] = []

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    group_ids: Optional[List[str]] = None

class UserLogin(BaseModel):
    username: str
    password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class AdminSetPassword(BaseModel):
    new_password: str

# ============ ORGANIZATION MODELS ============

class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#3b82f6"
    logo_url: Optional[str] = ""
    country: Optional[str] = ""
    city: Optional[str] = ""
    address: Optional[str] = ""
    postal_code: Optional[str] = ""
    phone: Optional[str] = ""
    contact_email: Optional[str] = ""
    # Responsable del centro
    responsible_name: Optional[str] = ""
    responsible_phone: Optional[str] = ""
    responsible_email: Optional[str] = ""
    # CRA - Central Receptora de Alarmas
    is_cra: Optional[bool] = False

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    logo_url: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    contact_email: Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_phone: Optional[str] = None
    responsible_email: Optional[str] = None
    is_cra: Optional[bool] = None

# ============ GROUP MODELS ============

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

# ============ DEVICE TYPE MODELS ============

class DeviceTypeCreate(BaseModel):
    name: str
    icon: str = "server"
    color: Optional[str] = "#6b7280"

class DeviceTypeUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

# ============ DEVICE MODELS ============

class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    port: int
    description: Optional[str] = ""
    group_id: Optional[str] = None
    device_type_id: Optional[str] = None
    brand: Optional[str] = ""
    model: Optional[str] = ""
    location: Optional[str] = ""
    notes: Optional[str] = ""
    image_url: Optional[str] = ""
    camera_protocol: Optional[str] = "http"
    camera_user: Optional[str] = ""
    camera_password: Optional[str] = ""
    camera_path: Optional[str] = ""
    has_statistics: Optional[bool] = False
    is_cra: Optional[bool] = False  # CRA - Critical device

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
    camera_protocol: Optional[str] = None
    camera_user: Optional[str] = None
    camera_password: Optional[str] = None
    camera_path: Optional[str] = None
    has_statistics: Optional[bool] = None
    is_cra: Optional[bool] = None

# ============ SETTINGS MODELS ============

class EmailSettings(BaseModel):
    alert_email: EmailStr
    gmail_user: str
    gmail_app_password: str

class ScheduledReportConfig(BaseModel):
    enabled: bool = False
    frequency: str = "weekly"
    day_of_week: int = 0
    day_of_month: int = 1
    hour: int = 8
    recipient_emails: List[str] = []
    include_offline_list: bool = True
    include_uptime_stats: bool = True
    organization_ids: List[str] = []

class PublicDashboardConfig(BaseModel):
    enabled: bool = False
    password: Optional[str] = None
    show_images: bool = True
    show_details: bool = False

# ============ DEVICE IMAGE MODELS ============

class DeviceImageCreate(BaseModel):
    device_id: str
    description: Optional[str] = ""
    installation_date: Optional[str] = ""

class DeviceImageUpdate(BaseModel):
    description: Optional[str] = None
    installation_date: Optional[str] = None
