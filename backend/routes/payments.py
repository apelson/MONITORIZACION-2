"""
Stripe payment routes for SaaS subscriptions
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, 
    CheckoutStatusResponse, CheckoutSessionRequest
)
from routes.tenant_auth import get_current_tenant_user
from services.tenant_service import get_master_db, get_tenant_by_id, update_tenant_plan
from models.tenant import PlanType

router = APIRouter(prefix="/payments", tags=["Payments"])

# Plan pricing (in EUR)
PLAN_PRICES = {
    "basic": 29.00,
    "pro": 79.00,
    "enterprise": 299.00  # Custom, contact sales
}

class UpgradePlanRequest(BaseModel):
    plan: str
    origin_url: str

class CheckoutStatusRequest(BaseModel):
    session_id: str

# ============ STRIPE CHECKOUT ============

@router.post("/checkout")
async def create_checkout_session(
    data: UpgradePlanRequest,
    request: Request,
    current: dict = Depends(get_current_tenant_user)
):
    """Create a Stripe checkout session for plan upgrade"""
    tenant = current["tenant"]
    user = current["user"]
    
    # Validate plan
    if data.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Plan inválido")
    
    # Don't allow downgrade via checkout
    current_plan_order = {"free": 0, "basic": 1, "pro": 2, "enterprise": 3}
    if current_plan_order.get(data.plan, 0) <= current_plan_order.get(tenant.plan.value, 0):
        raise HTTPException(status_code=400, detail="No puedes cambiar a un plan inferior desde aquí")
    
    # Get amount from server-side (security)
    amount = PLAN_PRICES[data.plan]
    
    # Build URLs
    success_url = f"{data.origin_url}/saas?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/saas?payment=cancelled"
    
    # Initialize Stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe no configurado")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/payments/webhook"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "tenant_id": tenant.id,
            "tenant_name": tenant.name,
            "user_email": user["email"],
            "plan": data.plan,
            "type": "subscription_upgrade"
        }
    )
    
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear sesión: {str(e)}")
    
    # Save transaction to database
    master_db = get_master_db()
    transaction = {
        "session_id": session.session_id,
        "tenant_id": tenant.id,
        "user_email": user["email"],
        "plan": data.plan,
        "amount": amount,
        "currency": "eur",
        "status": "pending",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc)
    }
    await master_db.payment_transactions.insert_one(transaction)
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id
    }

@router.get("/status/{session_id}")
async def get_payment_status(
    session_id: str,
    current: dict = Depends(get_current_tenant_user)
):
    """Get payment status and update tenant plan if successful"""
    tenant = current["tenant"]
    
    # Get transaction from DB
    master_db = get_master_db()
    transaction = await master_db.payment_transactions.find_one({
        "session_id": session_id,
        "tenant_id": tenant.id
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    # If already processed, return cached status
    if transaction.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "plan": transaction.get("plan"),
            "message": "Plan actualizado correctamente"
        }
    
    # Check with Stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        return {
            "status": "error",
            "payment_status": transaction.get("payment_status", "unknown"),
            "message": str(e)
        }
    
    # Update transaction
    await master_db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # If paid, update tenant plan
    if status.payment_status == "paid":
        new_plan = transaction.get("plan")
        if new_plan:
            plan_enum = PlanType(new_plan)
            await update_tenant_plan(tenant.id, plan_enum)
            
            # Update Stripe customer ID if available
            if status.metadata and status.metadata.get("customer"):
                await master_db.tenants.update_one(
                    {"id": tenant.id},
                    {"$set": {"stripe_customer_id": status.metadata.get("customer")}}
                )
            
            return {
                "status": "complete",
                "payment_status": "paid",
                "plan": new_plan,
                "message": f"¡Plan actualizado a {new_plan}!"
            }
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "plan": transaction.get("plan"),
        "message": "Procesando pago..."
    }

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe no configurado")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Update transaction and tenant plan
            master_db = get_master_db()
            
            transaction = await master_db.payment_transactions.find_one({
                "session_id": webhook_response.session_id
            })
            
            if transaction:
                # Update transaction
                await master_db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "status": "complete",
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
                
                # Update tenant plan
                new_plan = transaction.get("plan")
                if new_plan:
                    plan_enum = PlanType(new_plan)
                    await update_tenant_plan(transaction["tenant_id"], plan_enum)
        
        return {"status": "ok"}
        
    except Exception as e:
        # Log but don't fail - Stripe will retry
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/plans")
async def get_plans():
    """Get available plans and pricing"""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "currency": "eur",
                "period": "siempre",
                "features": ["4 cámaras", "24 verificaciones/día", "7 días historial"]
            },
            {
                "id": "basic",
                "name": "Básico",
                "price": 29,
                "currency": "eur",
                "period": "mes",
                "features": ["50 dispositivos", "1440 verificaciones/día", "30 días historial", "Alertas email"]
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 79,
                "currency": "eur",
                "period": "mes",
                "features": ["200 dispositivos", "Verificaciones ilimitadas", "90 días historial", "Alertas email + WhatsApp", "API access"]
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 299,
                "currency": "eur",
                "period": "mes",
                "features": ["Dispositivos ilimitados", "Todo ilimitado", "1 año historial", "Soporte prioritario"]
            }
        ]
    }
