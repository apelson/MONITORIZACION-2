"""
Push Notifications API - Notificaciones push para dispositivos CRA
Permite suscribirse a notificaciones y enviar alertas cuando dispositivos CRA se desconectan
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import json

# Try to import pywebpush, handle gracefully if not installed
try:
    from pywebpush import webpush, WebPushException
    PUSH_AVAILABLE = True
except ImportError:
    PUSH_AVAILABLE = False

from config import db, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/push", tags=["push-notifications"])

# Collection for push subscriptions
push_subscriptions_collection = db["push_subscriptions"]

# VAPID keys from environment
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_EMAIL = os.environ.get("VAPID_EMAIL", "mailto:soporte@siempria.com")

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # Contains p256dh and auth keys

class PushMessage(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/logo192.png"
    badge: Optional[str] = "/logo192.png"
    tag: Optional[str] = None
    data: Optional[dict] = None

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get the VAPID public key for client subscription"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}

@router.post("/subscribe")
async def subscribe_to_push(
    subscription: PushSubscription,
    current_user=Depends(get_current_user)
):
    """Subscribe a client to push notifications"""
    if not PUSH_AVAILABLE:
        raise HTTPException(status_code=503, detail="Push notifications not available")
    
    # Check if subscription already exists
    existing = await push_subscriptions_collection.find_one({
        "user_id": current_user["id"],
        "endpoint": subscription.endpoint
    })
    
    if existing:
        # Update existing subscription
        await push_subscriptions_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "keys": subscription.keys,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        return {"message": "Subscription updated", "status": "updated"}
    
    # Create new subscription
    sub_doc = {
        "user_id": current_user["id"],
        "username": current_user.get("username"),
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "active": True
    }
    
    await push_subscriptions_collection.insert_one(sub_doc)
    logger.info(f"New push subscription for user {current_user['id']}")
    
    return {"message": "Successfully subscribed to push notifications", "status": "subscribed"}

@router.delete("/unsubscribe")
async def unsubscribe_from_push(
    subscription: PushSubscription,
    current_user=Depends(get_current_user)
):
    """Unsubscribe a client from push notifications"""
    result = await push_subscriptions_collection.delete_one({
        "user_id": current_user["id"],
        "endpoint": subscription.endpoint
    })
    
    if result.deleted_count > 0:
        return {"message": "Successfully unsubscribed", "status": "unsubscribed"}
    
    raise HTTPException(status_code=404, detail="Subscription not found")

@router.get("/subscriptions")
async def get_my_subscriptions(
    current_user=Depends(get_current_user)
):
    """Get current user's push subscriptions"""
    cursor = push_subscriptions_collection.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "endpoint": 1, "created_at": 1, "active": 1}
    )
    
    subscriptions = await cursor.to_list(length=100)
    return {"subscriptions": subscriptions, "count": len(subscriptions)}

async def send_push_notification(user_id: str, message: PushMessage) -> dict:
    """
    Send push notification to a specific user
    Returns dict with success/failure counts
    """
    if not PUSH_AVAILABLE or not VAPID_PRIVATE_KEY:
        logger.warning("Push notifications not configured")
        return {"sent": 0, "failed": 0, "error": "Not configured"}
    
    cursor = push_subscriptions_collection.find({"user_id": user_id, "active": True})
    subscriptions = await cursor.to_list(length=100)
    
    sent = 0
    failed = 0
    
    payload = json.dumps({
        "title": message.title,
        "body": message.body,
        "icon": message.icon,
        "badge": message.badge,
        "tag": message.tag,
        "data": message.data or {}
    })
    
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"]
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_EMAIL}
            )
            sent += 1
        except WebPushException as e:
            logger.error(f"Push failed for {sub['endpoint'][:50]}: {e}")
            failed += 1
            # If subscription is invalid, mark as inactive
            if e.response and e.response.status_code in [404, 410]:
                await push_subscriptions_collection.update_one(
                    {"_id": sub["_id"]},
                    {"$set": {"active": False}}
                )
    
    return {"sent": sent, "failed": failed}

async def send_cra_alert(device_name: str, device_ip: str, status: str):
    """
    Send CRA alert to all subscribed users
    Called when a CRA device goes offline or comes back online
    """
    if not PUSH_AVAILABLE or not VAPID_PRIVATE_KEY:
        return 0
    
    cursor = push_subscriptions_collection.find({"active": True})
    subscriptions = await cursor.to_list(length=500)
    
    if status == "offline":
        title = "⚠️ ALERTA CRA"
        body = f"{device_name} ({device_ip}) se ha desconectado"
        tag = f"cra-offline-{device_ip}"
    else:
        title = "✅ CRA Recuperado"
        body = f"{device_name} ({device_ip}) está de nuevo online"
        tag = f"cra-online-{device_ip}"
    
    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": "/logo192.png",
        "badge": "/logo192.png",
        "tag": tag,
        "data": {
            "type": "cra_alert",
            "device_name": device_name,
            "device_ip": device_ip,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    })
    
    sent = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"]
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_EMAIL}
            )
            sent += 1
        except Exception as e:
            logger.error(f"CRA push failed: {e}")
    
    logger.info(f"CRA alert sent to {sent} subscribers: {device_name} {status}")
    return sent

# Endpoint to test push notifications
@router.post("/test")
async def test_push_notification(
    current_user=Depends(get_current_user)
):
    """Send a test push notification to current user"""
    message = PushMessage(
        title="🔔 Test de Notificación",
        body="Las notificaciones push están funcionando correctamente",
        tag="test-notification"
    )
    
    result = await send_push_notification(current_user["id"], message)
    return {"message": "Test notification sent", "result": result}
