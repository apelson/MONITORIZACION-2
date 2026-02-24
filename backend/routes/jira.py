"""
JIRA Integration Routes
API endpoints for JIRA integration management and operations
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timezone

from config import users_collection, organizations_collection
from services.auth_service import get_current_user, require_role
from services.jira_service import JiraService, JiraApiError

router = APIRouter(prefix="/jira", tags=["JIRA Integration"])


# Pydantic Models
class JiraConfigBase(BaseModel):
    enabled: bool = False
    jira_type: str = "cloud"  # "cloud" or "server"
    jira_url: str = ""
    jira_email: Optional[str] = None
    jira_api_token: Optional[str] = None
    jira_username: Optional[str] = None
    jira_password: Optional[str] = None
    default_project: str = ""
    
    # Auto-ticket settings
    auto_ticket_enabled: bool = False
    auto_ticket_offline_minutes: int = 10
    auto_ticket_issue_type: str = "Incidencia"
    auto_ticket_priority: str = "High"
    
    # Feature toggles
    manual_tickets_enabled: bool = True
    sync_enabled: bool = False
    dashboard_widget_enabled: bool = True


class JiraConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    jira_type: Optional[str] = None
    jira_url: Optional[str] = None
    jira_email: Optional[str] = None
    jira_api_token: Optional[str] = None
    jira_username: Optional[str] = None
    jira_password: Optional[str] = None
    default_project: Optional[str] = None
    auto_ticket_enabled: Optional[bool] = None
    auto_ticket_offline_minutes: Optional[int] = None
    auto_ticket_issue_type: Optional[str] = None
    auto_ticket_priority: Optional[str] = None
    manual_tickets_enabled: Optional[bool] = None
    sync_enabled: Optional[bool] = None
    dashboard_widget_enabled: Optional[bool] = None


class CreateTicketRequest(BaseModel):
    summary: str
    description: Optional[str] = None
    issue_type: str = "Task"
    project_key: Optional[str] = None
    priority: Optional[str] = None
    labels: Optional[List[str]] = None
    device_id: Optional[str] = None  # Link to device if applicable
    incident_id: Optional[str] = None  # Link to incident if applicable


class UpdateTicketRequest(BaseModel):
    summary: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    comment: Optional[str] = None


class TransitionTicketRequest(BaseModel):
    transition_id: str
    comment: Optional[str] = None


class AddCommentRequest(BaseModel):
    comment: str


class SearchTicketsRequest(BaseModel):
    jql: Optional[str] = None
    project_key: Optional[str] = None
    status: Optional[str] = None
    max_results: int = 50


# Helper to get JIRA service for current user
async def get_user_jira_service(current_user: dict) -> JiraService:
    """Get JIRA service for the current user's tenant"""
    jira_config = current_user.get("jira_config")
    
    if not jira_config or not jira_config.get("enabled"):
        raise HTTPException(
            status_code=400,
            detail="JIRA no esta configurado para este usuario"
        )
    
    return JiraService(jira_config)


# Configuration Endpoints

@router.get("/config")
async def get_jira_config(current_user: dict = Depends(get_current_user)):
    """Get current user's JIRA configuration (without sensitive data)"""
    jira_config = current_user.get("jira_config", {})
    
    # Return config without sensitive fields
    return {
        "enabled": jira_config.get("enabled", False),
        "jira_type": jira_config.get("jira_type", "cloud"),
        "jira_url": jira_config.get("jira_url", ""),
        "jira_email": jira_config.get("jira_email", ""),
        "default_project": jira_config.get("default_project", ""),
        "auto_ticket_enabled": jira_config.get("auto_ticket_enabled", False),
        "auto_ticket_offline_minutes": jira_config.get("auto_ticket_offline_minutes", 10),
        "auto_ticket_issue_type": jira_config.get("auto_ticket_issue_type", "Incidencia"),
        "auto_ticket_priority": jira_config.get("auto_ticket_priority", "High"),
        "manual_tickets_enabled": jira_config.get("manual_tickets_enabled", True),
        "sync_enabled": jira_config.get("sync_enabled", False),
        "dashboard_widget_enabled": jira_config.get("dashboard_widget_enabled", True),
        "has_credentials": bool(jira_config.get("jira_api_token") or jira_config.get("jira_password"))
    }


@router.put("/config")
async def update_jira_config(
    config: JiraConfigUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update JIRA configuration for current user"""
    update_data = {}
    
    for field, value in config.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[f"jira_config.{field}"] = value
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    update_data["jira_config.updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await users_collection.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    return {"message": "Configuracion JIRA actualizada", "updated_fields": list(config.model_dump(exclude_unset=True).keys())}


@router.post("/config/test")
async def test_jira_connection(current_user: dict = Depends(get_current_user)):
    """Test JIRA connection with current configuration"""
    try:
        jira_service = await get_user_jira_service(current_user)
        result = jira_service.test_connection()
        
        if result.get("success"):
            return {
                "success": True,
                "message": "Conexion exitosa",
                "user": result.get("user"),
                "email": result.get("email")
            }
        else:
            return {
                "success": False,
                "message": "Error de conexion",
                "error": result.get("error")
            }
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "message": "Error de conexion",
            "error": str(e)
        }


@router.get("/projects")
async def get_jira_projects(current_user: dict = Depends(get_current_user)):
    """Get available JIRA projects"""
    try:
        jira_service = await get_user_jira_service(current_user)
        projects = jira_service.get_projects()
        return {"projects": projects}
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/issue-types")
async def get_issue_types(
    project_key: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get available issue types for a project"""
    try:
        jira_service = await get_user_jira_service(current_user)
        issue_types = jira_service.get_issue_types(project_key)
        return {"issue_types": issue_types}
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/priorities")
async def get_priorities(current_user: dict = Depends(get_current_user)):
    """Get available JIRA priorities"""
    try:
        jira_service = await get_user_jira_service(current_user)
        priorities = jira_service.get_priorities()
        return {"priorities": priorities}
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Ticket Management Endpoints

@router.post("/tickets")
async def create_ticket(
    request: CreateTicketRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new JIRA ticket"""
    try:
        jira_service = await get_user_jira_service(current_user)
        
        # Check if manual tickets are enabled
        jira_config = current_user.get("jira_config", {})
        if not jira_config.get("manual_tickets_enabled", True):
            raise HTTPException(
                status_code=403,
                detail="La creacion manual de tickets esta deshabilitada"
            )
        
        result = jira_service.create_issue(
            summary=request.summary,
            description=request.description,
            issue_type=request.issue_type,
            project_key=request.project_key,
            priority=request.priority,
            labels=request.labels
        )
        
        # TODO: Store ticket reference in our database if linked to device/incident
        
        return result
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/{issue_key}")
async def get_ticket(
    issue_key: str,
    current_user: dict = Depends(get_current_user)
):
    """Get ticket details"""
    try:
        jira_service = await get_user_jira_service(current_user)
        result = jira_service.get_issue(issue_key)
        return result
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/tickets/{issue_key}")
async def update_ticket(
    issue_key: str,
    request: UpdateTicketRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a JIRA ticket"""
    try:
        jira_service = await get_user_jira_service(current_user)
        
        fields = {}
        if request.summary:
            fields["summary"] = request.summary
        if request.priority:
            fields["priority"] = {"name": request.priority}
        
        result = jira_service.update_issue(
            issue_key=issue_key,
            fields=fields if fields else None,
            comment=request.comment
        )
        
        return result
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/{issue_key}/transitions")
async def get_ticket_transitions(
    issue_key: str,
    current_user: dict = Depends(get_current_user)
):
    """Get available transitions for a ticket"""
    try:
        jira_service = await get_user_jira_service(current_user)
        transitions = jira_service.get_transitions(issue_key)
        return {"transitions": transitions}
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tickets/{issue_key}/transition")
async def transition_ticket(
    issue_key: str,
    request: TransitionTicketRequest,
    current_user: dict = Depends(get_current_user)
):
    """Transition a ticket to a new status"""
    try:
        jira_service = await get_user_jira_service(current_user)
        result = jira_service.transition_issue(
            issue_key=issue_key,
            transition_id=request.transition_id,
            comment=request.comment
        )
        return result
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tickets/{issue_key}/comment")
async def add_ticket_comment(
    issue_key: str,
    request: AddCommentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add a comment to a ticket"""
    try:
        jira_service = await get_user_jira_service(current_user)
        result = jira_service.add_comment(issue_key, request.comment)
        return result
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/search")
async def search_tickets(
    request: SearchTicketsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search JIRA tickets"""
    try:
        jira_service = await get_user_jira_service(current_user)
        jira_config = current_user.get("jira_config", {})
        
        # Build JQL
        if request.jql:
            jql = request.jql
        else:
            conditions = []
            project = request.project_key or jira_config.get("default_project")
            if project:
                conditions.append(f"project = {project}")
            if request.status:
                conditions.append(f'status = "{request.status}"')
            
            jql = " AND ".join(conditions) if conditions else "ORDER BY created DESC"
        
        result = jira_service.search_issues(
            jql=jql,
            max_results=request.max_results
        )
        
        return result
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/recent")
async def get_recent_tickets(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get recent tickets from default project"""
    try:
        jira_service = await get_user_jira_service(current_user)
        jira_config = current_user.get("jira_config", {})
        
        project = jira_config.get("default_project", "")
        jql = f"project = {project} ORDER BY created DESC" if project else "ORDER BY created DESC"
        
        result = jira_service.search_issues(
            jql=jql,
            max_results=limit,
            fields=["summary", "status", "priority", "created", "assignee"]
        )
        
        return result
    except HTTPException:
        raise
    except JiraApiError as e:
        raise HTTPException(status_code=400, detail=str(e))
