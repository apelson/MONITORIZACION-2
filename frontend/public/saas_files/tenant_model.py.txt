"""
Multi-tenant models for SaaS architecture
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class PlanType(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class PlanLimits(BaseModel):
    """Limits for each plan"""
    max_devices: int
    max_users: int
    max_verifications_per_day: int
    history_retention_days: int
    can_export: bool = False
    can_use_api: bool = False
    can_custom_alerts: bool = False
    can_public_dashboard: bool = False
    email_alerts: bool = False
    whatsapp_alerts: bool = False

# Plan configurations
PLAN_CONFIGS = {
    PlanType.FREE: PlanLimits(
        max_devices=4,
        max_users=1,
        max_verifications_per_day=24,  # 1 per hour
        history_retention_days=7,
        can_export=False,
        can_use_api=False,
        can_custom_alerts=False,
        can_public_dashboard=False,
        email_alerts=False,
        whatsapp_alerts=False
    ),
    PlanType.BASIC: PlanLimits(
        max_devices=50,
        max_users=3,
        max_verifications_per_day=1440,  # 1 per minute
        history_retention_days=30,
        can_export=True,
        can_use_api=False,
        can_custom_alerts=True,
        can_public_dashboard=False,
        email_alerts=True,
        whatsapp_alerts=False
    ),
    PlanType.PRO: PlanLimits(
        max_devices=200,
        max_users=10,
        max_verifications_per_day=999999,  # Unlimited
        history_retention_days=90,
        can_export=True,
        can_use_api=True,
        can_custom_alerts=True,
        can_public_dashboard=True,
        email_alerts=True,
        whatsapp_alerts=True
    ),
    PlanType.ENTERPRISE: PlanLimits(
        max_devices=999999,  # Unlimited
        max_users=999999,
        max_verifications_per_day=999999,
        history_retention_days=365,
        can_export=True,
        can_use_api=True,
        can_custom_alerts=True,
        can_public_dashboard=True,
        email_alerts=True,
        whatsapp_alerts=True
    )
}

class Tenant(BaseModel):
    """Tenant/Client model"""
    id: str
    name: str  # Company name
    slug: str  # URL-friendly name (used for DB name)
    email: str  # Primary contact email
    plan: PlanType = PlanType.FREE
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Billing info (optional)
    billing_email: Optional[str] = None
    company_address: Optional[str] = None
    tax_id: Optional[str] = None  # CIF/NIF
    
    # Usage tracking
    current_devices: int = 0
    verifications_today: int = 0
    last_verification_reset: Optional[datetime] = None
    
    # Subscription
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    
    # Custom settings
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#00a3d9"
    
class TenantUser(BaseModel):
    """User within a tenant"""
    id: str
    tenant_id: str
    username: str
    email: str
    password_hash: str
    role: str = "admin"  # admin, manager, technician, operator
    full_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class TenantCreate(BaseModel):
    """Model for creating a new tenant"""
    name: str
    email: str
    password: str  # For admin user
    company_name: Optional[str] = None

class TenantResponse(BaseModel):
    """Response model for tenant info"""
    id: str
    name: str
    slug: str
    email: str
    plan: PlanType
    is_active: bool
    limits: PlanLimits
    current_devices: int
    verifications_today: int
    subscription_end: Optional[datetime] = None
