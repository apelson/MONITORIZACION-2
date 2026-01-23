"""
Access logging service for tracking user activities
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import uuid

from config import access_logs_collection, logger

# Log types
LOG_TYPES = {
    "AUTH_LOGIN": "auth_login",
    "AUTH_LOGOUT": "auth_logout", 
    "AUTH_FAILED": "auth_failed",
    "DEVICE_VIEW": "device_view",
    "DEVICE_CREATE": "device_create",
    "DEVICE_UPDATE": "device_update",
    "DEVICE_DELETE": "device_delete",
    "CAMERA_VIEW": "camera_view",
    "CAMERA_IMAGE": "camera_image",
    "CAMERA_STATS": "camera_stats",
    "ORG_CREATE": "org_create",
    "ORG_UPDATE": "org_update",
    "ORG_DELETE": "org_delete",
    "GROUP_CREATE": "group_create",
    "GROUP_UPDATE": "group_update",
    "GROUP_DELETE": "group_delete",
    "USER_CREATE": "user_create",
    "USER_UPDATE": "user_update",
    "USER_DELETE": "user_delete",
    "USER_PASSWORD": "user_password",
    "SETTINGS_UPDATE": "settings_update",
    "BACKUP_CREATE": "backup_create",
    "BACKUP_RESTORE": "backup_restore",
    "BACKUP_DOWNLOAD": "backup_download",
    "EXPORT_DATA": "export_data",
}

# Log categories for filtering
LOG_CATEGORIES = {
    "auth": ["auth_login", "auth_logout", "auth_failed"],
    "devices": ["device_view", "device_create", "device_update", "device_delete"],
    "cameras": ["camera_view", "camera_image", "camera_stats"],
    "organizations": ["org_create", "org_update", "org_delete", "group_create", "group_update", "group_delete"],
    "users": ["user_create", "user_update", "user_delete", "user_password"],
    "system": ["settings_update", "backup_create", "backup_restore", "backup_download", "export_data"],
}

async def log_access(
    log_type: str,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    user_role: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_name: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    success: bool = True
):
    """
    Log an access event
    
    Args:
        log_type: Type of log (from LOG_TYPES)
        user_id: ID of the user performing the action
        username: Username of the user
        user_role: Role of the user
        ip_address: IP address of the request
        user_agent: Browser/client user agent
        target_type: Type of target (device, organization, user, etc.)
        target_id: ID of the target entity
        target_name: Name of the target entity
        details: Additional details about the action
        success: Whether the action was successful
    """
    try:
        # Determine category
        category = "other"
        for cat, types in LOG_CATEGORIES.items():
            if log_type in types:
                category = cat
                break
        
        log_entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "log_type": log_type,
            "category": category,
            "user_id": user_id,
            "username": username or "anonymous",
            "user_role": user_role or "unknown",
            "ip_address": ip_address or "unknown",
            "user_agent": user_agent,
            "target_type": target_type,
            "target_id": target_id,
            "target_name": target_name,
            "details": details or {},
            "success": success
        }
        
        await access_logs_collection.insert_one(log_entry)
        
        # Log security events
        if log_type == "auth_failed":
            logger.warning(f"Failed login attempt for user '{username}' from IP {ip_address}")
        
    except Exception as e:
        logger.error(f"Error logging access: {e}")

async def get_access_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    log_type: Optional[str] = None,
    category: Optional[str] = None,
    target_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    success_only: Optional[bool] = None,
    ip_address: Optional[str] = None
):
    """Get access logs with filters"""
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    if username:
        query["username"] = {"$regex": username, "$options": "i"}
    if log_type:
        query["log_type"] = log_type
    if category:
        query["category"] = category
    if target_id:
        query["target_id"] = target_id
    if ip_address:
        query["ip_address"] = {"$regex": ip_address, "$options": "i"}
    if success_only is not None:
        query["success"] = success_only
    
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = end_date
        else:
            query["timestamp"] = {"$lte": end_date}
    
    cursor = access_logs_collection.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    total = await access_logs_collection.count_documents(query)
    
    return {"logs": logs, "total": total, "skip": skip, "limit": limit}

async def get_security_alerts(hours: int = 24):
    """Get security alerts (failed logins, suspicious activity)"""
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    
    # Get failed login attempts
    pipeline = [
        {"$match": {"log_type": "auth_failed", "timestamp": {"$gte": since}}},
        {"$group": {
            "_id": {"ip": "$ip_address", "username": "$username"},
            "count": {"$sum": 1},
            "last_attempt": {"$max": "$timestamp"}
        }},
        {"$match": {"count": {"$gte": 3}}},  # 3+ failed attempts
        {"$sort": {"count": -1}}
    ]
    
    failed_logins = await access_logs_collection.aggregate(pipeline).to_list(length=100)
    
    # Get unusual activity (many actions in short time)
    activity_pipeline = [
        {"$match": {"timestamp": {"$gte": since}, "success": True}},
        {"$group": {
            "_id": {"user_id": "$user_id", "username": "$username"},
            "action_count": {"$sum": 1}
        }},
        {"$match": {"action_count": {"$gte": 100}}},  # 100+ actions in timeframe
        {"$sort": {"action_count": -1}}
    ]
    
    high_activity = await access_logs_collection.aggregate(activity_pipeline).to_list(length=100)
    
    return {
        "failed_logins": [
            {
                "ip_address": item["_id"]["ip"],
                "username": item["_id"]["username"],
                "attempts": item["count"],
                "last_attempt": item["last_attempt"]
            }
            for item in failed_logins
        ],
        "high_activity_users": [
            {
                "user_id": item["_id"]["user_id"],
                "username": item["_id"]["username"],
                "action_count": item["action_count"]
            }
            for item in high_activity
        ]
    }

async def get_user_activity_summary(user_id: str, days: int = 30):
    """Get activity summary for a specific user"""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}}},
        {"$group": {
            "_id": "$log_type",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    activity = await access_logs_collection.aggregate(pipeline).to_list(length=100)
    
    # Get last login
    last_login = await access_logs_collection.find_one(
        {"user_id": user_id, "log_type": "auth_login"},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    
    return {
        "activity_by_type": {item["_id"]: item["count"] for item in activity},
        "total_actions": sum(item["count"] for item in activity),
        "last_login": last_login
    }

async def get_logs_stats(days: int = 7):
    """Get log statistics for dashboard"""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Total logs
    total = await access_logs_collection.count_documents({"timestamp": {"$gte": since}})
    
    # By category
    category_pipeline = [
        {"$match": {"timestamp": {"$gte": since}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_category = await access_logs_collection.aggregate(category_pipeline).to_list(length=20)
    
    # By day
    day_pipeline = [
        {"$match": {"timestamp": {"$gte": since}}},
        {"$project": {
            "date": {"$substr": ["$timestamp", 0, 10]}
        }},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    by_day = await access_logs_collection.aggregate(day_pipeline).to_list(length=30)
    
    # Active users
    users_pipeline = [
        {"$match": {"timestamp": {"$gte": since}, "user_id": {"$ne": None}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "active_users"}
    ]
    active_result = await access_logs_collection.aggregate(users_pipeline).to_list(length=1)
    active_users = active_result[0]["active_users"] if active_result else 0
    
    # Failed logins count
    failed_logins = await access_logs_collection.count_documents({
        "timestamp": {"$gte": since},
        "log_type": "auth_failed"
    })
    
    return {
        "total_logs": total,
        "by_category": {item["_id"]: item["count"] for item in by_category},
        "by_day": [{"date": item["_id"], "count": item["count"]} for item in by_day],
        "active_users": active_users,
        "failed_logins": failed_logins,
        "period_days": days
    }

async def cleanup_old_logs(days: int = 90):
    """Delete logs older than specified days"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    result = await access_logs_collection.delete_many({"timestamp": {"$lt": cutoff}})
    
    logger.info(f"Cleaned up {result.deleted_count} logs older than {days} days")
    return result.deleted_count
