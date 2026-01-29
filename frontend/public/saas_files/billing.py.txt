"""
Stripe payment routes for SaaS subscriptions
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)
from services.tenant_service import get_master_db, get_tenant_by_id, update_tenant_plan
from routes.tenant_auth import get_current_tenant_user
from models.tenant import PlanType
from config import logger

router = APIRouter(prefix="/saas/billing", tags=["Billing"])

# Fixed pricing packages - amounts in EUR
SUBSCRIPTION_PLANS = {
    "basic": {
        "name": "Básico",
        "price": 29.00,
        "currency": "eur",
        "plan_type": PlanType.BASIC
    },
    "pro": {
        "name": "Pro", 
        "price": 79.00,
        "currency": "eur",
        "plan_type": PlanType.PRO
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 299.00,
        "currency": "eur",
        "plan_type": PlanType.ENTERPRISE
    }
}

class CheckoutRequest(BaseModel):
    plan_id: str  # basic, pro, or enterprise
    origin_url: str  # Frontend origin for success/cancel URLs

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

# ============ ROUTES ============

@router.get("/plans")
async def get_plans():
    """Get available subscription plans"""
    plans = []
    for plan_id, plan in SUBSCRIPTION_PLANS.items():
        plans.append({
            "id": plan_id,
            "name": plan["name"],
            "price": plan["price"],
            "currency": plan["currency"]
        })
    return {"plans": plans}

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    data: CheckoutRequest,
    request: Request,
    current: dict = Depends(get_current_tenant_user)
):
    """Create a Stripe checkout session for subscription upgrade"""
    # Validate plan
    if data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Plan no válido")
    
    plan = SUBSCRIPTION_PLANS[data.plan_id]
    tenant = current["tenant"]
    user = current["user"]
    
    # Don't allow downgrade through checkout (would need separate flow)
    current_plan_order = ["free", "basic", "pro", "enterprise"]
    current_idx = current_plan_order.index(tenant.plan.value)
    new_idx = current_plan_order.index(data.plan_id)
    
    if new_idx <= current_idx:
        raise HTTPException(status_code=400, detail="No puedes hacer downgrade a través de este flujo")
    
    # Initialize Stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Build success/cancel URLs from frontend origin
    success_url = f"{data.origin_url}/saas?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/saas?payment=cancelled"
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=plan["price"],
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "tenant_id": tenant.id,
            "user_id": user["id"],
            "plan_id": data.plan_id,
            "email": user["email"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    master_db = get_master_db()
    transaction = {
        "session_id": session.session_id,
        "tenant_id": tenant.id,
        "user_id": user["id"],
        "email": user["email"],
        "plan_id": data.plan_id,
        "amount": plan["price"],
        "currency": plan["currency"],
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    await master_db.payment_transactions.insert_one(transaction)
    
    logger.info(f"Created checkout session {session.session_id} for tenant {tenant.id} - Plan: {data.plan_id}")
    
    return CheckoutResponse(
        checkout_url=session.url,
        session_id=session.session_id
    )

@router.get("/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    request: Request,
    current: dict = Depends(get_current_tenant_user)
):
    """Check the status of a checkout session and update subscription if paid"""
    master_db = get_master_db()
    
    # Get transaction record
    transaction = await master_db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    # Verify ownership
    tenant = current["tenant"]
    if transaction["tenant_id"] != tenant.id:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # If already processed, return current status
    if transaction["payment_status"] in ["paid", "completed"]:
        return {
            "status": "complete",
            "payment_status": transaction["payment_status"],
            "plan_id": transaction["plan_id"],
            "message": "Plan actualizado correctamente"
        }
    
    # Check with Stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"Error checking Stripe status: {e}")
        return {
            "status": "pending",
            "payment_status": "pending",
            "message": "Verificando pago..."
        }
    
    # Update transaction based on Stripe status
    if status.payment_status == "paid":
        # Update transaction
        await master_db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},  # Prevent double processing
            {"$set": {
                "payment_status": "paid",
                "paid_at": datetime.now(timezone.utc)
            }}
        )
        
        # Update tenant plan
        plan_id = transaction["plan_id"]
        new_plan = SUBSCRIPTION_PLANS[plan_id]["plan_type"]
        await update_tenant_plan(transaction["tenant_id"], new_plan)
        
        logger.info(f"Payment completed for tenant {tenant.id} - Upgraded to {plan_id}")
        
        return {
            "status": "complete",
            "payment_status": "paid",
            "plan_id": plan_id,
            "message": f"¡Plan actualizado a {SUBSCRIPTION_PLANS[plan_id]['name']}!"
        }
    
    elif status.status == "expired":
        await master_db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "expired"}}
        )
        return {
            "status": "expired",
            "payment_status": "expired",
            "message": "La sesión de pago ha expirado"
        }
    
    return {
        "status": "pending",
        "payment_status": "pending", 
        "message": "Pago en proceso..."
    }

@router.get("/transactions")
async def get_transactions(current: dict = Depends(get_current_tenant_user)):
    """Get payment transaction history for current tenant"""
    master_db = get_master_db()
    tenant = current["tenant"]
    
    transactions = await master_db.payment_transactions.find(
        {"tenant_id": tenant.id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=50)
    
    return {"transactions": transactions}

# ============ WEBHOOK ============

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            master_db = get_master_db()
            session_id = webhook_response.session_id
            
            # Get transaction
            transaction = await master_db.payment_transactions.find_one(
                {"session_id": session_id}
            )
            
            if transaction and transaction["payment_status"] != "paid":
                # Update transaction
                await master_db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "paid_at": datetime.now(timezone.utc)
                    }}
                )
                
                # Update tenant plan
                plan_id = transaction["plan_id"]
                new_plan = SUBSCRIPTION_PLANS[plan_id]["plan_type"]
                await update_tenant_plan(transaction["tenant_id"], new_plan)
                
                logger.info(f"Webhook: Payment completed for session {session_id}")
        
        return {"status": "ok"}
    
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}
