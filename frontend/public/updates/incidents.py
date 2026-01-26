"""
Incidents/Tickets routes for managing system incidents and repairs
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from config import incidents_collection, devices_collection, logger
from services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/incidents", tags=["incidents"])

# ============ MODELS ============

class IncidentCreate(BaseModel):
    title: str
    description: str
    device_id: Optional[str] = None
    priority: str = "medium"  # low, medium, high, critical
    category: Optional[str] = None  # hardware, software, network, other

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    device_id: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None  # open, in_progress, resolved
    assigned_to: Optional[str] = None

class IncidentResolve(BaseModel):
    resolution: str  # Description of how it was fixed
    resolution_notes: Optional[str] = None  # Additional notes

class IncidentNote(BaseModel):
    note: str

# ============ ROUTES ============

@router.get("")
async def list_incidents(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    device_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_role(["admin", "technician"]))
):
    """List all incidents with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if device_id:
        query["device_id"] = device_id
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    cursor = incidents_collection.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    incidents = await cursor.to_list(length=limit)
    total = await incidents_collection.count_documents(query)
    
    # Get device names for reference
    device_ids = list(set([i.get("device_id") for i in incidents if i.get("device_id")]))
    devices = {}
    if device_ids:
        device_cursor = devices_collection.find({"id": {"$in": device_ids}}, {"_id": 0, "id": 1, "name": 1, "ip_address": 1})
        async for d in device_cursor:
            devices[d["id"]] = d
    
    # Enrich incidents with device info
    for incident in incidents:
        if incident.get("device_id") and incident["device_id"] in devices:
            incident["device"] = devices[incident["device_id"]]
    
    return {"incidents": incidents, "total": total, "skip": skip, "limit": limit}


@router.get("/stats")
async def get_incident_stats(
    current_user: dict = Depends(require_role(["admin", "technician"]))
):
    """Get incident statistics"""
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    by_status = {item["_id"]: item["count"] async for item in incidents_collection.aggregate(pipeline)}
    
    priority_pipeline = [
        {"$match": {"status": {"$ne": "resolved"}}},
        {"$group": {
            "_id": "$priority",
            "count": {"$sum": 1}
        }}
    ]
    by_priority = {item["_id"]: item["count"] async for item in incidents_collection.aggregate(priority_pipeline)}
    
    total = await incidents_collection.count_documents({})
    open_count = await incidents_collection.count_documents({"status": "open"})
    in_progress = await incidents_collection.count_documents({"status": "in_progress"})
    resolved = await incidents_collection.count_documents({"status": "resolved"})
    
    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "resolved": resolved,
        "by_status": by_status,
        "by_priority": by_priority
    }


@router.get("/{incident_id}")
async def get_incident(
    incident_id: str,
    current_user: dict = Depends(require_role(["admin", "technician"]))
):
    """Get a single incident with full details"""
    incident = await incidents_collection.find_one({"id": incident_id}, {"_id": 0})
    if not incident:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    # Get device info if linked
    if incident.get("device_id"):
        device = await devices_collection.find_one({"id": incident["device_id"]}, {"_id": 0, "id": 1, "name": 1, "ip_address": 1, "port": 1, "status": 1})
        incident["device"] = device
    
    return incident


@router.post("")
async def create_incident(
    data: IncidentCreate,
    current_user: dict = Depends(require_role(["admin", "technician"]))
):
    """Create a new incident"""
    # Validate device if provided
    if data.device_id:
        device = await devices_collection.find_one({"id": data.device_id})
        if not device:
            raise HTTPException(status_code=400, detail="Dispositivo no encontrado")
    
    incident = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "device_id": data.device_id,
        "priority": data.priority,
        "category": data.category or "other",
        "status": "open",
        "created_by": current_user["id"],
        "created_by_name": current_user.get("full_name") or current_user.get("username"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "assigned_to": None,
        "assigned_to_name": None,
        "resolution": None,
        "resolution_notes": None,
        "resolved_by": None,
        "resolved_by_name": None,
        "resolved_at": None,
        "history": [
            {
                "action": "created",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "user_id": current_user["id"],
                "user_name": current_user.get("full_name") or current_user.get("username"),
                "details": f"Incidencia creada: {data.title}"
            }
        ]
    }
    
    await incidents_collection.insert_one(incident)
    incident.pop("_id", None)
    
    logger.info(f"Incident created: {incident['id']} by {current_user['username']}")
    return {"message": "Incidencia creada", "incident": incident}


@router.put("/{incident_id}")
async def update_incident(
    incident_id: str,
    data: IncidentUpdate,
    current_user: dict = Depends(require_role(["admin", "technician"]))
):
    """Update an incident"""
    incident = await incidents_collection.find_one({"id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    history_entry = {
        "action": "updated",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"],
        "user_name": current_user.get("full_name") or current_user.get("username"),
        "changes": []
    }
    
    if data.title and data.title != incident.get("title"):
        update["title"] = data.title
        history_entry["changes"].append(f"Título: {incident.get('title')} → {data.title}")
    
    if data.description and data.description != incident.get("description"):
        update["description"] = data.description
        history_entry["changes"].append("Descripción actualizada")
    
    if data.priority and data.priority != incident.get("priority"):
        update["priority"] = data.priority
        history_entry["changes"].append(f"Prioridad: {incident.get('priority')} → {data.priority}")
    
    if data.status and data.status != incident.get("status"):
        update["status"] = data.status
        history_entry["changes"].append(f"Estado: {incident.get('status')} → {data.status}")
    
    if data.category and data.category != incident.get("category"):
        update["category"] = data.category
        history_entry["changes"].append(f"Categoría: {incident.get('category')} → {data.category}")
    
    if data.device_id is not None:
        update["device_id"] = data.device_id if data.device_id else None
    
    if data.assigned_to is not None:
        update["assigned_to"] = data.assigned_to if data.assigned_to else None
        # Would need to look up the name, simplified here
        update["assigned_to_name"] = data.assigned_to
        history_entry["changes"].append(f"Asignado a: {data.assigned_to or 'Sin asignar'}")
    
    if history_entry["changes"]:
        history_entry["details"] = ", ".join(history_entry["changes"])
        await incidents_collection.update_one(
            {"id": incident_id},
            {
                "$set": update,
                "$push": {"history": history_entry}
            }
        )
    else:
        await incidents_collection.update_one({"id": incident_id}, {"$set": update})
    
    updated = await incidents_collection.find_one({"id": incident_id}, {"_id": 0})
    return {"message": "Incidencia actualizada", "incident": updated}


@router.post("/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    data: IncidentResolve,
    current_user: dict = Depends(require_role(["admin", "technician"]))
):
    """Resolve an incident with documentation"""
    incident = await incidents_collection.find_one({"id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    if incident.get("status") == "resolved":
        raise HTTPException(status_code=400, detail="La incidencia ya está resuelta")
    
    now = datetime.now(timezone.utc).isoformat()
    
    history_entry = {
        "action": "resolved",
        "timestamp": now,
        "user_id": current_user["id"],
        "user_name": current_user.get("full_name") or current_user.get("username"),
        "details": f"Incidencia resuelta: {data.resolution[:100]}..."
    }
    
    await incidents_collection.update_one(
        {"id": incident_id},
        {
            "$set": {
                "status": "resolved",
                "resolution": data.resolution,
                "resolution_notes": data.resolution_notes,
                "resolved_by": current_user["id"],
                "resolved_by_name": current_user.get("full_name") or current_user.get("username"),
                "resolved_at": now,
                "updated_at": now
            },
            "$push": {"history": history_entry}
        }
    )
    
    updated = await incidents_collection.find_one({"id": incident_id}, {"_id": 0})
    logger.info(f"Incident resolved: {incident_id} by {current_user['username']}")
    return {"message": "Incidencia resuelta", "incident": updated}


@router.post("/{incident_id}/reopen")
async def reopen_incident(
    incident_id: str,
    reason: str = Query(..., min_length=5),
    current_user: dict = Depends(require_role(["admin", "technician"]))
):
    """Reopen a resolved incident"""
    incident = await incidents_collection.find_one({"id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    if incident.get("status") != "resolved":
        raise HTTPException(status_code=400, detail="Solo se pueden reabrir incidencias resueltas")
    
    now = datetime.now(timezone.utc).isoformat()
    
    history_entry = {
        "action": "reopened",
        "timestamp": now,
        "user_id": current_user["id"],
        "user_name": current_user.get("full_name") or current_user.get("username"),
        "details": f"Incidencia reabierta: {reason}"
    }
    
    await incidents_collection.update_one(
        {"id": incident_id},
        {
            "$set": {
                "status": "open",
                "updated_at": now
            },
            "$push": {"history": history_entry}
        }
    )
    
    updated = await incidents_collection.find_one({"id": incident_id}, {"_id": 0})
    return {"message": "Incidencia reabierta", "incident": updated}


@router.post("/{incident_id}/notes")
async def add_note(
    incident_id: str,
    data: IncidentNote,
    current_user: dict = Depends(require_role(["admin", "technician"]))
):
    """Add a note to an incident"""
    incident = await incidents_collection.find_one({"id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    now = datetime.now(timezone.utc).isoformat()
    
    history_entry = {
        "action": "note",
        "timestamp": now,
        "user_id": current_user["id"],
        "user_name": current_user.get("full_name") or current_user.get("username"),
        "details": data.note
    }
    
    await incidents_collection.update_one(
        {"id": incident_id},
        {
            "$set": {"updated_at": now},
            "$push": {"history": history_entry}
        }
    )
    
    return {"message": "Nota añadida"}


@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Delete an incident (admin only)"""
    result = await incidents_collection.delete_one({"id": incident_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    logger.info(f"Incident deleted: {incident_id} by {current_user['username']}")
    return {"message": "Incidencia eliminada"}
