"""
AI Analysis Routes
Endpoints for AI-powered device monitoring analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging

from config import devices_collection, alerts_collection, incidents_collection
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Analysis"])

# Import AI service
from services.ai_analysis_service import ai_service

@router.get("/predictions")
async def get_failure_predictions(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get AI-powered failure predictions based on device history
    """
    try:
        # Get alerts from last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        alerts = await alerts_collection.find({
            "timestamp": {"$gte": seven_days_ago.isoformat()}
        }).sort("timestamp", -1).limit(500).to_list(500)
        
        # Convert to list of dicts
        history = []
        for alert in alerts:
            history.append({
                "device_name": alert.get("device_name", ""),
                "alert_type": alert.get("alert_type", ""),
                "timestamp": alert.get("timestamp", ""),
                "response_time_ms": alert.get("response_time_ms", 0)
            })
        
        # Get AI predictions
        result = await ai_service.analyze_device_patterns(history)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomalies")
async def detect_anomalies(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Detect anomalies in current metrics vs historical averages
    """
    try:
        # Get current stats
        total = await devices_collection.count_documents({})
        online = await devices_collection.count_documents({"status": "online"})
        offline = total - online
        
        # Get average latency
        pipeline = [
            {"$match": {"response_time_ms": {"$gt": 0}}},
            {"$group": {"_id": None, "avg_latency": {"$avg": "$response_time_ms"}}}
        ]
        latency_result = await devices_collection.aggregate(pipeline).to_list(1)
        avg_latency = latency_result[0]["avg_latency"] if latency_result else 0
        
        current_metrics = {
            "total_devices": total,
            "online": online,
            "offline": offline,
            "offline_percent": (offline / total * 100) if total > 0 else 0,
            "avg_latency_ms": round(avg_latency, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Historical averages (could be stored in DB)
        historical_avg = {
            "offline_percent": 5.0,
            "avg_latency_ms": 100.0,
        }
        
        result = await ai_service.detect_anomalies(current_metrics, historical_avg)
        result["current_metrics"] = current_metrics
        
        return result
        
    except Exception as e:
        logger.error(f"Error detecting anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/smart-alerts")
async def get_smart_alerts(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get AI-filtered and prioritized alerts
    """
    try:
        # Get recent alerts
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        
        alerts = await alerts_collection.find({
            "timestamp": {"$gte": twenty_four_hours_ago.isoformat()}
        }).sort("timestamp", -1).limit(100).to_list(100)
        
        # Convert ObjectId to string
        for alert in alerts:
            alert["id"] = str(alert.pop("_id", ""))
        
        total_count = len(alerts)
        
        result = await ai_service.generate_smart_alert(alerts, total_count)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting smart alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily-summary")
async def get_daily_summary(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get AI-generated daily summary with insights
    """
    try:
        # Get current stats
        total = await devices_collection.count_documents({})
        online = await devices_collection.count_documents({"status": "online"})
        
        stats = {
            "total": total,
            "online": online,
            "offline": total - online,
            "uptime_percent": round((online / total * 100) if total > 0 else 0, 2)
        }
        
        # Get alerts from last 24h
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        alerts = await alerts_collection.find({
            "timestamp": {"$gte": twenty_four_hours_ago.isoformat()}
        }).to_list(200)
        
        # Get open incidents
        incidents = []
        try:
            incidents = await incidents_collection.find({
                "status": {"$ne": "resolved"}
            }).to_list(50)
        except:
            pass
        
        result = await ai_service.generate_daily_summary(stats, alerts, incidents)
        
        return result
        
    except Exception as e:
        logger.error(f"Error generating daily summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
