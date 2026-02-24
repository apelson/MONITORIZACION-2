"""
JIRA Integration Service
Supports both JIRA Cloud and JIRA Server/Data Center
Multi-tenant: each tenant can configure their own JIRA instance
"""
import base64
import requests
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import logging

logger = logging.getLogger(__name__)


class JiraService:
    """
    Unified JIRA client supporting both Cloud and Server/Data Center.
    """
    
    def __init__(self, config: Dict):
        """
        Initialize JIRA service with tenant configuration.
        
        config should contain:
        - jira_type: "cloud" or "server"
        - jira_url: Base URL of JIRA instance
        - jira_email: Email for Cloud auth
        - jira_api_token: API token
        - jira_username: Username for Server auth
        - jira_password: Password for Server auth
        - default_project: Default project key
        """
        self.config = config
        self.jira_type = config.get("jira_type", "cloud")
        self.base_url = config.get("jira_url", "").rstrip('/')
        self.default_project = config.get("default_project", "")
        self.session = self._create_session()
        self.auth_headers = self._setup_auth()
    
    def _create_session(self) -> requests.Session:
        """Create a requests session with retry logic"""
        session = requests.Session()
        
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.3,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=["HEAD", "GET", "POST", "PUT", "DELETE"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def _setup_auth(self) -> Dict[str, str]:
        """Set up authentication headers based on JIRA type"""
        if self.jira_type == "cloud":
            email = self.config.get("jira_email", "")
            token = self.config.get("jira_api_token", "")
            credentials = f"{email}:{token}"
            encoded = base64.b64encode(credentials.encode()).decode()
            return {
                "Authorization": f"Basic {encoded}",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        else:
            # Server uses basic auth
            username = self.config.get("jira_username", "")
            password = self.config.get("jira_password", "")
            credentials = f"{username}:{password}"
            encoded = base64.b64encode(credentials.encode()).decode()
            return {
                "Authorization": f"Basic {encoded}",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
    
    def _get_api_url(self, endpoint: str) -> str:
        """Construct API URL based on JIRA type"""
        api_version = "3" if self.jira_type == "cloud" else "2"
        return f"{self.base_url}/rest/api/{api_version}/{endpoint.lstrip('/')}"
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        json_data: Dict = None,
        params: Dict = None
    ) -> Dict[str, Any]:
        """Make HTTP request to JIRA"""
        url = self._get_api_url(endpoint)
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=self.auth_headers,
                json=json_data,
                params=params,
                timeout=30
            )
            
            if response.status_code == 204:
                return {"success": True, "status_code": 204}
            
            if response.status_code >= 400:
                error_data = {}
                try:
                    error_data = response.json()
                except:
                    error_data = {"message": response.text}
                
                logger.error(f"JIRA API error {response.status_code}: {error_data}")
                raise JiraApiError(
                    f"JIRA API error: {response.status_code}",
                    status_code=response.status_code,
                    error_details=error_data
                )
            
            return response.json() if response.text else {"success": True}
        
        except requests.exceptions.RequestException as e:
            logger.error(f"JIRA request failed: {str(e)}")
            raise JiraApiError(f"Request failed: {str(e)}")
    
    def test_connection(self) -> Dict:
        """Test JIRA connection and return server info"""
        try:
            result = self._make_request("GET", "myself")
            return {
                "success": True,
                "user": result.get("displayName", result.get("name", "Unknown")),
                "email": result.get("emailAddress", ""),
                "account_id": result.get("accountId", result.get("key", ""))
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_projects(self) -> List[Dict]:
        """Get all accessible projects"""
        try:
            result = self._make_request("GET", "project")
            return [
                {
                    "id": p.get("id"),
                    "key": p.get("key"),
                    "name": p.get("name"),
                    "project_type": p.get("projectTypeKey", "")
                }
                for p in result
            ]
        except Exception as e:
            logger.error(f"Error getting projects: {e}")
            return []
    
    def get_issue_types(self, project_key: str = None) -> List[Dict]:
        """Get available issue types for a project"""
        project = project_key or self.default_project
        try:
            result = self._make_request("GET", f"project/{project}")
            issue_types = result.get("issueTypes", [])
            return [
                {
                    "id": it.get("id"),
                    "name": it.get("name"),
                    "description": it.get("description", ""),
                    "subtask": it.get("subtask", False)
                }
                for it in issue_types
            ]
        except Exception as e:
            logger.error(f"Error getting issue types: {e}")
            return []
    
    def create_issue(
        self,
        summary: str,
        description: str = None,
        issue_type: str = "Task",
        project_key: str = None,
        priority: str = None,
        labels: List[str] = None,
        custom_fields: Dict = None
    ) -> Dict:
        """
        Create a new JIRA issue.
        """
        project = project_key or self.default_project
        
        # Build description in Atlassian Document Format for Cloud
        if self.jira_type == "cloud" and description:
            description_field = {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {"type": "text", "text": description}
                        ]
                    }
                ]
            }
        else:
            description_field = description
        
        fields = {
            "project": {"key": project},
            "issuetype": {"name": issue_type},
            "summary": summary
        }
        
        if description_field:
            fields["description"] = description_field
        
        if priority:
            fields["priority"] = {"name": priority}
        
        if labels:
            fields["labels"] = labels
        
        if custom_fields:
            fields.update(custom_fields)
        
        payload = {"fields": fields}
        
        result = self._make_request("POST", "issue", json_data=payload)
        
        return {
            "success": True,
            "issue_key": result.get("key"),
            "issue_id": result.get("id"),
            "self": result.get("self"),
            "url": f"{self.base_url}/browse/{result.get('key')}"
        }
    
    def get_issue(self, issue_key: str, expand: str = None) -> Dict:
        """Retrieve issue details by key"""
        params = {}
        if expand:
            params["expand"] = expand
        
        result = self._make_request("GET", f"issue/{issue_key}", params=params)
        
        return {
            "key": result.get("key"),
            "id": result.get("id"),
            "summary": result.get("fields", {}).get("summary"),
            "status": result.get("fields", {}).get("status", {}).get("name"),
            "priority": result.get("fields", {}).get("priority", {}).get("name"),
            "assignee": result.get("fields", {}).get("assignee", {}).get("displayName") if result.get("fields", {}).get("assignee") else None,
            "reporter": result.get("fields", {}).get("reporter", {}).get("displayName") if result.get("fields", {}).get("reporter") else None,
            "created": result.get("fields", {}).get("created"),
            "updated": result.get("fields", {}).get("updated"),
            "url": f"{self.base_url}/browse/{result.get('key')}"
        }
    
    def update_issue(
        self,
        issue_key: str,
        fields: Dict = None,
        comment: str = None
    ) -> Dict:
        """Update an existing JIRA issue"""
        payload = {}
        
        if fields:
            payload["fields"] = fields
        
        if comment:
            if self.jira_type == "cloud":
                comment_body = {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": comment}]
                        }
                    ]
                }
            else:
                comment_body = comment
            
            payload["update"] = {
                "comment": [{"add": {"body": comment_body}}]
            }
        
        self._make_request("PUT", f"issue/{issue_key}", json_data=payload)
        
        return {"success": True, "issue_key": issue_key}
    
    def get_transitions(self, issue_key: str) -> List[Dict]:
        """Get available transitions for an issue"""
        result = self._make_request("GET", f"issue/{issue_key}/transitions")
        
        return [
            {
                "id": t.get("id"),
                "name": t.get("name"),
                "to_status": t.get("to", {}).get("name")
            }
            for t in result.get("transitions", [])
        ]
    
    def transition_issue(
        self,
        issue_key: str,
        transition_id: str,
        comment: str = None
    ) -> Dict:
        """Transition an issue to a new status"""
        payload = {
            "transition": {"id": transition_id}
        }
        
        if comment:
            if self.jira_type == "cloud":
                comment_body = {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": comment}]
                        }
                    ]
                }
            else:
                comment_body = comment
            
            payload["update"] = {
                "comment": [{"add": {"body": comment_body}}]
            }
        
        self._make_request("POST", f"issue/{issue_key}/transitions", json_data=payload)
        
        return {"success": True, "issue_key": issue_key}
    
    def add_comment(self, issue_key: str, comment: str) -> Dict:
        """Add a comment to an issue"""
        if self.jira_type == "cloud":
            body = {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": comment}]
                    }
                ]
            }
        else:
            body = comment
        
        result = self._make_request(
            "POST",
            f"issue/{issue_key}/comment",
            json_data={"body": body}
        )
        
        return {
            "success": True,
            "comment_id": result.get("id"),
            "issue_key": issue_key
        }
    
    def search_issues(
        self,
        jql: str,
        start_at: int = 0,
        max_results: int = 50,
        fields: List[str] = None
    ) -> Dict:
        """Search for issues using JQL"""
        params = {
            "jql": jql,
            "startAt": start_at,
            "maxResults": max_results
        }
        
        if fields:
            params["fields"] = ",".join(fields)
        
        result = self._make_request("GET", "search", params=params)
        
        issues = []
        for issue in result.get("issues", []):
            issues.append({
                "key": issue.get("key"),
                "summary": issue.get("fields", {}).get("summary"),
                "status": issue.get("fields", {}).get("status", {}).get("name"),
                "priority": issue.get("fields", {}).get("priority", {}).get("name") if issue.get("fields", {}).get("priority") else None,
                "assignee": issue.get("fields", {}).get("assignee", {}).get("displayName") if issue.get("fields", {}).get("assignee") else None,
                "created": issue.get("fields", {}).get("created"),
                "updated": issue.get("fields", {}).get("updated"),
                "url": f"{self.base_url}/browse/{issue.get('key')}"
            })
        
        return {
            "total": result.get("total", 0),
            "start_at": result.get("startAt", 0),
            "max_results": result.get("maxResults", 50),
            "issues": issues
        }
    
    def get_priorities(self) -> List[Dict]:
        """Get available priorities"""
        try:
            result = self._make_request("GET", "priority")
            return [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "description": p.get("description", "")
                }
                for p in result
            ]
        except Exception as e:
            logger.error(f"Error getting priorities: {e}")
            return []


class JiraApiError(Exception):
    """Custom exception for JIRA API errors"""
    
    def __init__(self, message: str, status_code: int = None, error_details: Dict = None):
        self.message = message
        self.status_code = status_code
        self.error_details = error_details
        super().__init__(self.message)


# Factory function to create JIRA service from tenant config
async def get_jira_service_for_tenant(tenant_id: str, db) -> Optional[JiraService]:
    """
    Get JIRA service configured for a specific tenant.
    Returns None if tenant has no JIRA configuration.
    """
    from config import users_collection
    
    # Get tenant's JIRA config
    tenant = await users_collection.find_one({"id": tenant_id})
    
    if not tenant:
        return None
    
    jira_config = tenant.get("jira_config")
    
    if not jira_config or not jira_config.get("enabled"):
        return None
    
    return JiraService(jira_config)


# Helper to create ticket from device alert
async def create_device_offline_ticket(
    jira_service: JiraService,
    device: Dict,
    organization: Dict = None,
    offline_duration_minutes: int = 0
) -> Dict:
    """
    Create a JIRA ticket for a device that went offline.
    """
    org_name = organization.get("name", "Desconocida") if organization else "Desconocida"
    
    summary = f"[ALERTA] Dispositivo offline: {device.get('name', device.get('ip', 'Desconocido'))}"
    
    description = f"""
Dispositivo detectado como OFFLINE en el sistema de monitoreo.

**Detalles del dispositivo:**
- Nombre: {device.get('name', 'N/A')}
- IP: {device.get('ip', 'N/A')}
- Tipo: {device.get('device_type', 'N/A')}
- Organizacion: {org_name}
- Grupo: {device.get('group_name', 'N/A')}

**Informacion del evento:**
- Tiempo offline: {offline_duration_minutes} minutos
- Detectado: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

**Acciones recomendadas:**
1. Verificar conectividad de red
2. Revisar estado fisico del dispositivo
3. Contactar con el responsable de la ubicacion

---
Ticket generado automaticamente por Siempria Network Monitor
    """.strip()
    
    return jira_service.create_issue(
        summary=summary,
        description=description,
        issue_type="Incidencia",
        priority="High",
        labels=["siempria", "auto-generated", "device-offline"]
    )
