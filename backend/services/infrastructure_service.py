"""
Infrastructure Services - VMware ESXi, QNAP, and Synology Integration
"""
import ssl
import urllib3
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

# ============ VMware ESXi Service ============
class ESXiService:
    """Service to interact with VMware ESXi/vCenter API"""
    
    def __init__(self, host: str, username: str, password: str, port: int = 443):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.session = None
        self.session_id = None
        
    def _get_base_url(self):
        return f"https://{self.host}:{self.port}"
    
    def connect(self) -> bool:
        """Establish connection to ESXi/vCenter"""
        try:
            # Try vSphere REST API first (vCenter/ESXi 6.5+)
            url = f"{self._get_base_url()}/rest/com/vmware/cis/session"
            self.session = requests.Session()
            self.session.verify = False
            
            response = self.session.post(
                url,
                auth=(self.username, self.password),
                timeout=10
            )
            
            if response.status_code == 200:
                self.session_id = response.json().get('value')
                self.session.headers.update({'vmware-api-session-id': self.session_id})
                return True
            
            # Fallback to older API
            url = f"{self._get_base_url()}/api/session"
            response = self.session.post(
                url,
                auth=(self.username, self.password),
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                self.session_id = response.json() if response.text else response.headers.get('vmware-api-session-id')
                if isinstance(self.session_id, str):
                    self.session.headers.update({'vmware-api-session-id': self.session_id})
                return True
                
            return False
        except Exception as e:
            logger.error(f"ESXi connection error: {e}")
            return False
    
    def disconnect(self):
        """Close the session"""
        if self.session and self.session_id:
            try:
                self.session.delete(f"{self._get_base_url()}/rest/com/vmware/cis/session")
            except:
                pass
        self.session = None
        self.session_id = None
    
    def get_host_info(self) -> Optional[Dict[str, Any]]:
        """Get ESXi host information"""
        if not self.session:
            if not self.connect():
                return None
        
        try:
            # Try multiple API endpoints
            endpoints = [
                "/api/vcenter/host",
                "/rest/vcenter/host",
                "/api/appliance/system/version"
            ]
            
            host_info = {
                "connected": True,
                "hosts": [],
                "version": None
            }
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(
                        f"{self._get_base_url()}{endpoint}",
                        timeout=10
                    )
                    if response.status_code == 200:
                        data = response.json()
                        if 'value' in data:
                            if isinstance(data['value'], list):
                                host_info['hosts'] = data['value']
                            else:
                                host_info['version'] = data['value']
                        else:
                            host_info['hosts'] = data if isinstance(data, list) else [data]
                        break
                except:
                    continue
            
            return host_info
        except Exception as e:
            logger.error(f"Error getting host info: {e}")
            return None
    
    def get_vms(self) -> List[Dict[str, Any]]:
        """Get list of all VMs with their status"""
        if not self.session:
            if not self.connect():
                return []
        
        try:
            endpoints = ["/api/vcenter/vm", "/rest/vcenter/vm"]
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(
                        f"{self._get_base_url()}{endpoint}",
                        timeout=15
                    )
                    if response.status_code == 200:
                        data = response.json()
                        vms = data.get('value', data) if isinstance(data, dict) else data
                        return vms if isinstance(vms, list) else []
                except:
                    continue
            
            return []
        except Exception as e:
            logger.error(f"Error getting VMs: {e}")
            return []
    
    def get_vm_details(self, vm_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed info for a specific VM"""
        if not self.session:
            if not self.connect():
                return None
        
        try:
            endpoints = [f"/api/vcenter/vm/{vm_id}", f"/rest/vcenter/vm/{vm_id}"]
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(
                        f"{self._get_base_url()}{endpoint}",
                        timeout=10
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data.get('value', data)
                except:
                    continue
            
            return None
        except Exception as e:
            logger.error(f"Error getting VM details: {e}")
            return None
    
    def get_datastores(self) -> List[Dict[str, Any]]:
        """Get datastore information"""
        if not self.session:
            if not self.connect():
                return []
        
        try:
            endpoints = ["/api/vcenter/datastore", "/rest/vcenter/datastore"]
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(
                        f"{self._get_base_url()}{endpoint}",
                        timeout=10
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data.get('value', data) if isinstance(data, dict) else data
                except:
                    continue
            
            return []
        except Exception as e:
            logger.error(f"Error getting datastores: {e}")
            return []
    
    def get_full_status(self) -> Dict[str, Any]:
        """Get complete ESXi/vCenter status"""
        result = {
            "connected": False,
            "host": self.host,
            "timestamp": datetime.utcnow().isoformat(),
            "host_info": None,
            "vms": [],
            "datastores": [],
            "summary": {
                "total_vms": 0,
                "powered_on": 0,
                "powered_off": 0,
                "suspended": 0
            }
        }
        
        if self.connect():
            result["connected"] = True
            result["host_info"] = self.get_host_info()
            result["vms"] = self.get_vms()
            result["datastores"] = self.get_datastores()
            
            # Calculate summary
            for vm in result["vms"]:
                result["summary"]["total_vms"] += 1
                power_state = vm.get("power_state", "").upper()
                if power_state == "POWERED_ON":
                    result["summary"]["powered_on"] += 1
                elif power_state == "POWERED_OFF":
                    result["summary"]["powered_off"] += 1
                elif power_state == "SUSPENDED":
                    result["summary"]["suspended"] += 1
            
            self.disconnect()
        
        return result


# ============ QNAP NAS Service ============
class QNAPService:
    """Service to interact with QNAP NAS API"""
    
    def __init__(self, host: str, username: str, password: str, port: int = 443, use_ssl: bool = True):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.session = None
        self.sid = None
        
    def _get_base_url(self):
        protocol = "https" if self.use_ssl else "http"
        return f"{protocol}://{self.host}:{self.port}"
    
    def connect(self) -> bool:
        """Authenticate with QNAP NAS"""
        try:
            self.session = requests.Session()
            self.session.verify = False
            
            # QNAP QTS API login
            url = f"{self._get_base_url()}/cgi-bin/authLogin.cgi"
            params = {
                "user": self.username,
                "pwd": self.password
            }
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                # Parse XML response for SID
                import re
                sid_match = re.search(r'<authSid><!\[CDATA\[([^\]]+)\]\]></authSid>', response.text)
                if sid_match:
                    self.sid = sid_match.group(1)
                    return True
                
                # Try JSON API
                url = f"{self._get_base_url()}/cgi-bin/authLogin.cgi?user={self.username}&pwd={self.password}"
                response = self.session.get(url, timeout=10)
                if 'authSid' in response.text or response.status_code == 200:
                    return True
            
            return False
        except Exception as e:
            logger.error(f"QNAP connection error: {e}")
            return False
    
    def disconnect(self):
        """Logout from QNAP"""
        if self.session and self.sid:
            try:
                url = f"{self._get_base_url()}/cgi-bin/authLogout.cgi?sid={self.sid}"
                self.session.get(url, timeout=5)
            except:
                pass
        self.session = None
        self.sid = None
    
    def get_system_info(self) -> Optional[Dict[str, Any]]:
        """Get QNAP system information"""
        if not self.session:
            if not self.connect():
                return None
        
        try:
            url = f"{self._get_base_url()}/cgi-bin/management/manaRequest.cgi"
            params = {
                "subfunc": "sysinfo",
                "sid": self.sid or ""
            }
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                # Try to parse as JSON first
                try:
                    return response.json()
                except:
                    # Parse XML response
                    return {"raw_response": response.text[:500], "status": "connected"}
            
            return None
        except Exception as e:
            logger.error(f"Error getting QNAP system info: {e}")
            return None
    
    def get_disk_info(self) -> List[Dict[str, Any]]:
        """Get disk/volume information"""
        if not self.session:
            if not self.connect():
                return []
        
        try:
            url = f"{self._get_base_url()}/cgi-bin/management/manaRequest.cgi"
            params = {
                "subfunc": "smart_disk_health",
                "sid": self.sid or ""
            }
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                try:
                    return response.json().get('disks', [])
                except:
                    return []
            
            return []
        except Exception as e:
            logger.error(f"Error getting QNAP disk info: {e}")
            return []
    
    def get_volume_info(self) -> List[Dict[str, Any]]:
        """Get storage volume information"""
        if not self.session:
            if not self.connect():
                return []
        
        try:
            url = f"{self._get_base_url()}/cgi-bin/management/manaRequest.cgi"
            params = {
                "subfunc": "volume_info",
                "sid": self.sid or ""
            }
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                try:
                    return response.json().get('volumes', [])
                except:
                    return []
            
            return []
        except Exception as e:
            logger.error(f"Error getting QNAP volume info: {e}")
            return []
    
    def get_surveillance_info(self) -> Optional[Dict[str, Any]]:
        """Get QVR Pro surveillance status"""
        if not self.session:
            if not self.connect():
                return None
        
        try:
            # QVR Pro API
            url = f"{self._get_base_url()}/qvrpro/apis/qvrpro.cgi"
            params = {
                "act": "get_channel_list",
                "sid": self.sid or ""
            }
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                try:
                    return response.json()
                except:
                    return {"status": "available"}
            
            return None
        except Exception as e:
            logger.error(f"Error getting QNAP surveillance info: {e}")
            return None
    
    def get_full_status(self) -> Dict[str, Any]:
        """Get complete QNAP NAS status"""
        result = {
            "connected": False,
            "host": self.host,
            "timestamp": datetime.utcnow().isoformat(),
            "system_info": None,
            "disks": [],
            "volumes": [],
            "surveillance": None,
            "health": "unknown"
        }
        
        if self.connect():
            result["connected"] = True
            result["system_info"] = self.get_system_info()
            result["disks"] = self.get_disk_info()
            result["volumes"] = self.get_volume_info()
            result["surveillance"] = self.get_surveillance_info()
            
            # Determine overall health
            if result["system_info"]:
                result["health"] = "healthy"
            
            self.disconnect()
        
        return result


# ============ Synology NAS Service ============
class SynologyService:
    """Service to interact with Synology DSM API"""
    
    def __init__(self, host: str, username: str, password: str, port: int = 5001, use_ssl: bool = True):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.session = None
        self.sid = None
        
    def _get_base_url(self):
        protocol = "https" if self.use_ssl else "http"
        return f"{protocol}://{self.host}:{self.port}"
    
    def connect(self) -> bool:
        """Authenticate with Synology DSM"""
        try:
            self.session = requests.Session()
            self.session.verify = False
            
            # Synology DSM API login
            url = f"{self._get_base_url()}/webapi/auth.cgi"
            params = {
                "api": "SYNO.API.Auth",
                "version": "6",
                "method": "login",
                "account": self.username,
                "passwd": self.password,
                "session": "SiempriaMonitor",
                "format": "sid"
            }
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.sid = data.get("data", {}).get("sid")
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Synology connection error: {e}")
            return False
    
    def disconnect(self):
        """Logout from Synology"""
        if self.session and self.sid:
            try:
                url = f"{self._get_base_url()}/webapi/auth.cgi"
                params = {
                    "api": "SYNO.API.Auth",
                    "version": "6",
                    "method": "logout",
                    "session": "SiempriaMonitor",
                    "_sid": self.sid
                }
                self.session.get(url, params=params, timeout=5)
            except:
                pass
        self.session = None
        self.sid = None
    
    def _api_request(self, api: str, method: str, version: int = 1, **kwargs) -> Optional[Dict]:
        """Make a Synology API request"""
        if not self.session:
            if not self.connect():
                return None
        
        try:
            url = f"{self._get_base_url()}/webapi/entry.cgi"
            params = {
                "api": api,
                "version": version,
                "method": method,
                "_sid": self.sid or "",
                **kwargs
            }
            
            response = self.session.get(url, params=params, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return data.get("data", {})
            
            return None
        except Exception as e:
            logger.error(f"Synology API error: {e}")
            return None
    
    def get_system_info(self) -> Optional[Dict[str, Any]]:
        """Get Synology system information"""
        return self._api_request("SYNO.DSM.Info", "getinfo", version=2)
    
    def get_storage_info(self) -> Optional[Dict[str, Any]]:
        """Get storage/volume information"""
        return self._api_request("SYNO.Storage.CGI.Storage", "load_info", version=1)
    
    def get_disk_info(self) -> List[Dict[str, Any]]:
        """Get disk SMART information"""
        data = self._api_request("SYNO.Storage.CGI.Storage", "load_info", version=1)
        if data:
            return data.get("disks", [])
        return []
    
    def get_volume_info(self) -> List[Dict[str, Any]]:
        """Get volume information"""
        data = self._api_request("SYNO.Storage.CGI.Storage", "load_info", version=1)
        if data:
            return data.get("volumes", [])
        return []
    
    def get_surveillance_info(self) -> Optional[Dict[str, Any]]:
        """Get Surveillance Station information"""
        try:
            # Get camera list
            cameras = self._api_request("SYNO.SurveillanceStation.Camera", "List", version=9)
            
            # Get recording status
            info = self._api_request("SYNO.SurveillanceStation.Info", "GetInfo", version=5)
            
            return {
                "cameras": cameras.get("cameras", []) if cameras else [],
                "info": info
            }
        except Exception as e:
            logger.error(f"Error getting Synology surveillance info: {e}")
            return None
    
    def get_system_utilization(self) -> Optional[Dict[str, Any]]:
        """Get CPU, RAM, Network utilization"""
        return self._api_request("SYNO.Core.System.Utilization", "get", version=1)
    
    def get_full_status(self) -> Dict[str, Any]:
        """Get complete Synology NAS status"""
        result = {
            "connected": False,
            "host": self.host,
            "timestamp": datetime.utcnow().isoformat(),
            "system_info": None,
            "storage": None,
            "disks": [],
            "volumes": [],
            "surveillance": None,
            "utilization": None,
            "health": "unknown"
        }
        
        if self.connect():
            result["connected"] = True
            result["system_info"] = self.get_system_info()
            result["storage"] = self.get_storage_info()
            result["disks"] = self.get_disk_info()
            result["volumes"] = self.get_volume_info()
            result["surveillance"] = self.get_surveillance_info()
            result["utilization"] = self.get_system_utilization()
            
            # Determine overall health
            if result["system_info"]:
                result["health"] = "healthy"
                # Check disk health
                for disk in result["disks"]:
                    if disk.get("status") not in ["normal", "healthy"]:
                        result["health"] = "warning"
                        break
            
            self.disconnect()
        
        return result


# ============ Unified Infrastructure Service ============
class InfrastructureService:
    """Unified service for all infrastructure monitoring"""
    
    @staticmethod
    def check_esxi(host: str, username: str, password: str, port: int = 443) -> Dict[str, Any]:
        """Check ESXi/vCenter status"""
        service = ESXiService(host, username, password, port)
        return service.get_full_status()
    
    @staticmethod
    def check_qnap(host: str, username: str, password: str, port: int = 443, use_ssl: bool = True) -> Dict[str, Any]:
        """Check QNAP NAS status"""
        service = QNAPService(host, username, password, port, use_ssl)
        return service.get_full_status()
    
    @staticmethod
    def check_synology(host: str, username: str, password: str, port: int = 5001, use_ssl: bool = True) -> Dict[str, Any]:
        """Check Synology NAS status"""
        service = SynologyService(host, username, password, port, use_ssl)
        return service.get_full_status()
    
    @staticmethod
    def check_device(device_type: str, host: str, username: str, password: str, port: int = None, use_ssl: bool = True) -> Dict[str, Any]:
        """Check any infrastructure device"""
        if device_type.lower() == "esxi":
            return InfrastructureService.check_esxi(host, username, password, port or 443)
        elif device_type.lower() == "qnap":
            return InfrastructureService.check_qnap(host, username, password, port or 443, use_ssl)
        elif device_type.lower() == "synology":
            return InfrastructureService.check_synology(host, username, password, port or 5001, use_ssl)
        else:
            return {"error": f"Unknown device type: {device_type}", "connected": False}
