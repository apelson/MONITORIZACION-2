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
            self.session = requests.Session()
            self.session.verify = False
            
            # Try vSphere 7.0.3+ REST API first
            url = f"{self._get_base_url()}/api/session"
            response = self.session.post(
                url,
                auth=(self.username, self.password),
                timeout=15
            )
            
            if response.status_code in [200, 201]:
                # vSphere 7.0.3+ returns session token directly
                try:
                    token = response.json()
                    if isinstance(token, str):
                        self.session_id = token
                    else:
                        self.session_id = response.headers.get('vmware-api-session-id')
                except:
                    self.session_id = response.text.strip('"')
                
                if self.session_id:
                    self.session.headers.update({'vmware-api-session-id': self.session_id})
                    logger.info(f"ESXi connected via /api/session")
                    return True
            
            # Fallback to vSphere 6.5-7.0.2 REST API
            url = f"{self._get_base_url()}/rest/com/vmware/cis/session"
            response = self.session.post(
                url,
                auth=(self.username, self.password),
                timeout=15
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.session_id = data.get('value')
                except:
                    self.session_id = None
                
                if self.session_id:
                    self.session.headers.update({'vmware-api-session-id': self.session_id})
                    logger.info(f"ESXi connected via /rest/com/vmware/cis/session")
                    return True
            
            # Try basic auth for standalone ESXi without vCenter
            url = f"{self._get_base_url()}/sdk/vimServiceVersions.xml"
            response = self.session.get(
                url,
                auth=(self.username, self.password),
                timeout=10
            )
            
            if response.status_code == 200 and 'vim' in response.text.lower():
                # ESXi is reachable via SOAP/SDK, use basic auth for REST
                self.session.auth = (self.username, self.password)
                self.session_id = "basic_auth"
                logger.info(f"ESXi connected via basic auth")
                return True
                
            logger.error(f"ESXi connection failed: status {response.status_code}")
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
        
        vms = []
        try:
            # Try vSphere 7.0.3+ API first (vCenter only)
            endpoints = [
                "/api/vcenter/vm",
                "/rest/vcenter/vm",
            ]
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(
                        f"{self._get_base_url()}{endpoint}",
                        timeout=20
                    )
                    logger.debug(f"ESXi VM endpoint {endpoint}: status {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, dict):
                            vms = data.get('value', data.get('result', []))
                        else:
                            vms = data
                        
                        if isinstance(vms, list) and len(vms) > 0:
                            logger.info(f"ESXi found {len(vms)} VMs via {endpoint}")
                            return vms
                    elif response.status_code == 401:
                        logger.warning(f"ESXi auth failed on {endpoint}")
                        if self.connect():
                            continue
                except Exception as e:
                    logger.debug(f"ESXi endpoint {endpoint} error: {e}")
                    continue
            
            # For standalone ESXi (no vCenter), try MOB/SOAP-based approach via vim-cmd proxy
            # ESXi has limited REST API - try to get VM list from hostd
            try:
                # Try the ESXi MOB API - Get registered VMs
                mob_url = f"{self._get_base_url()}/mob/?moid=ha-folder-vm&doPath=childEntity"
                response = self.session.get(mob_url, timeout=15, auth=(self.username, self.password))
                
                if response.status_code == 200 and 'VirtualMachine' in response.text:
                    # Parse VM IDs from MOB response
                    import re
                    vm_ids = re.findall(r'vm-(\d+)', response.text)
                    logger.info(f"ESXi MOB found {len(vm_ids)} VMs")
                    
                    for vm_id in vm_ids[:20]:  # Limit to 20 VMs
                        try:
                            vm_mob_url = f"{self._get_base_url()}/mob/?moid=vm-{vm_id}"
                            vm_resp = self.session.get(vm_mob_url, timeout=10, auth=(self.username, self.password))
                            
                            if vm_resp.status_code == 200:
                                vm_text = vm_resp.text
                                # Extract VM name
                                name_match = re.search(r'config\.name.*?<td[^>]*>([^<]+)</td>', vm_text, re.DOTALL)
                                power_match = re.search(r'runtime\.powerState.*?<td[^>]*>([^<]+)</td>', vm_text, re.DOTALL)
                                cpu_match = re.search(r'config\.hardware\.numCPU.*?<td[^>]*>(\d+)</td>', vm_text, re.DOTALL)
                                mem_match = re.search(r'config\.hardware\.memoryMB.*?<td[^>]*>(\d+)</td>', vm_text, re.DOTALL)
                                guest_match = re.search(r'config\.guestFullName.*?<td[^>]*>([^<]+)</td>', vm_text, re.DOTALL)
                                
                                vm_info = {
                                    'vm': f'vm-{vm_id}',
                                    'name': name_match.group(1).strip() if name_match else f'VM-{vm_id}',
                                    'power_state': power_match.group(1).strip().upper() if power_match else 'UNKNOWN',
                                    'cpu_count': int(cpu_match.group(1)) if cpu_match else None,
                                    'memory_size_MiB': int(mem_match.group(1)) if mem_match else None,
                                    'guest_OS': guest_match.group(1).strip() if guest_match else None
                                }
                                
                                # Normalize power state
                                if 'on' in vm_info['power_state'].lower():
                                    vm_info['power_state'] = 'POWERED_ON'
                                elif 'off' in vm_info['power_state'].lower():
                                    vm_info['power_state'] = 'POWERED_OFF'
                                elif 'suspend' in vm_info['power_state'].lower():
                                    vm_info['power_state'] = 'SUSPENDED'
                                
                                vms.append(vm_info)
                        except Exception as e:
                            logger.debug(f"Error getting VM vm-{vm_id} details: {e}")
                            continue
                    
                    if vms:
                        return vms
            except Exception as e:
                logger.debug(f"ESXi MOB approach failed: {e}")
            
            # Try SOAP/vim-cmd style endpoint
            try:
                soap_url = f"{self._get_base_url()}/sdk/vimService.wsdl"
                response = self.session.get(soap_url, timeout=10)
                if response.status_code == 200:
                    logger.info("ESXi SOAP available but requires pyvmomi for VM enumeration")
            except:
                pass
            
            return vms
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
                        timeout=15
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data.get('value', data)
                except Exception as e:
                    logger.debug(f"VM details endpoint {endpoint} error: {e}")
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
        
        datastores = []
        try:
            endpoints = ["/api/vcenter/datastore", "/rest/vcenter/datastore"]
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(
                        f"{self._get_base_url()}{endpoint}",
                        timeout=15
                    )
                    logger.debug(f"ESXi datastore endpoint {endpoint}: status {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, dict):
                            datastores = data.get('value', data.get('result', []))
                        else:
                            datastores = data
                        
                        if isinstance(datastores, list) and len(datastores) > 0:
                            logger.info(f"ESXi found {len(datastores)} datastores via {endpoint}")
                            return datastores
                except Exception as e:
                    logger.debug(f"Datastore endpoint {endpoint} error: {e}")
                    continue
            
            # For standalone ESXi, try MOB
            try:
                mob_url = f"{self._get_base_url()}/mob/?moid=ha-folder-datastore&doPath=childEntity"
                response = self.session.get(mob_url, timeout=15, auth=(self.username, self.password))
                
                if response.status_code == 200 and 'Datastore' in response.text:
                    import re
                    ds_ids = re.findall(r'datastore-(\d+)', response.text)
                    logger.info(f"ESXi MOB found {len(ds_ids)} datastores")
                    
                    for ds_id in ds_ids[:10]:
                        try:
                            ds_mob_url = f"{self._get_base_url()}/mob/?moid=datastore-{ds_id}"
                            ds_resp = self.session.get(ds_mob_url, timeout=10, auth=(self.username, self.password))
                            
                            if ds_resp.status_code == 200:
                                ds_text = ds_resp.text
                                name_match = re.search(r'summary\.name.*?<td[^>]*>([^<]+)</td>', ds_text, re.DOTALL)
                                type_match = re.search(r'summary\.type.*?<td[^>]*>([^<]+)</td>', ds_text, re.DOTALL)
                                capacity_match = re.search(r'summary\.capacity.*?<td[^>]*>(\d+)</td>', ds_text, re.DOTALL)
                                free_match = re.search(r'summary\.freeSpace.*?<td[^>]*>(\d+)</td>', ds_text, re.DOTALL)
                                
                                ds_info = {
                                    'datastore': f'datastore-{ds_id}',
                                    'name': name_match.group(1).strip() if name_match else f'Datastore-{ds_id}',
                                    'type': type_match.group(1).strip() if type_match else 'VMFS',
                                    'capacity': int(capacity_match.group(1)) if capacity_match else None,
                                    'free_space': int(free_match.group(1)) if free_match else None
                                }
                                datastores.append(ds_info)
                        except Exception as e:
                            logger.debug(f"Error getting datastore-{ds_id} details: {e}")
                            continue
                    
                    if datastores:
                        return datastores
            except Exception as e:
                logger.debug(f"ESXi MOB datastore approach failed: {e}")
            
            return datastores
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
        """Get disk/volume information from QNAP"""
        if not self.session:
            if not self.connect():
                return []
        
        disks = []
        try:
            # Try multiple QNAP disk endpoints
            disk_endpoints = [
                # QTS 5.x endpoints
                {"url": "/cgi-bin/disk/disk.cgi", "params": {"func": "get_disk_info", "sid": self.sid or ""}},
                {"url": "/cgi-bin/disk/qsmart.cgi", "params": {"func": "get_smart_info", "sid": self.sid or ""}},
                # QTS 4.x endpoints  
                {"url": "/cgi-bin/management/manaRequest.cgi", "params": {"subfunc": "smart_disk_health", "sid": self.sid or ""}},
                {"url": "/cgi-bin/management/manaRequest.cgi", "params": {"subfunc": "disk_info", "sid": self.sid or ""}},
                # Generic disk endpoint
                {"url": "/cgi-bin/storagesmart.cgi", "params": {"func": "get_smart", "sid": self.sid or ""}},
            ]
            
            for endpoint in disk_endpoints:
                try:
                    url = f"{self._get_base_url()}{endpoint['url']}"
                    response = self.session.get(url, params=endpoint['params'], timeout=10)
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            # Handle different response formats
                            if isinstance(data, dict):
                                if 'disks' in data:
                                    disks = data['disks']
                                    break
                                elif 'disk_list' in data:
                                    disks = data['disk_list']
                                    break
                                elif 'result' in data and isinstance(data['result'], list):
                                    disks = data['result']
                                    break
                            elif isinstance(data, list):
                                disks = data
                                break
                        except:
                            # Try parsing XML response
                            import re
                            disk_matches = re.findall(r'<disk[^>]*>.*?</disk>', response.text, re.DOTALL)
                            if disk_matches:
                                for match in disk_matches:
                                    disk_info = {}
                                    name_match = re.search(r'<name>([^<]+)</name>', match)
                                    status_match = re.search(r'<status>([^<]+)</status>', match)
                                    size_match = re.search(r'<size>([^<]+)</size>', match)
                                    temp_match = re.search(r'<temp>([^<]+)</temp>', match)
                                    model_match = re.search(r'<model>([^<]+)</model>', match)
                                    
                                    if name_match:
                                        disk_info['name'] = name_match.group(1)
                                    if status_match:
                                        disk_info['status'] = status_match.group(1)
                                    if size_match:
                                        disk_info['size'] = size_match.group(1)
                                    if temp_match:
                                        disk_info['temp'] = int(temp_match.group(1)) if temp_match.group(1).isdigit() else temp_match.group(1)
                                    if model_match:
                                        disk_info['model'] = model_match.group(1)
                                    
                                    if disk_info:
                                        disks.append(disk_info)
                                
                                if disks:
                                    break
                except Exception as e:
                    logger.debug(f"QNAP disk endpoint {endpoint['url']} failed: {e}")
                    continue
            
            return disks
        except Exception as e:
            logger.error(f"Error getting QNAP disk info: {e}")
            return []
    
    def get_volume_info(self) -> List[Dict[str, Any]]:
        """Get storage volume information from QNAP"""
        if not self.session:
            if not self.connect():
                return []
        
        volumes = []
        try:
            # Try multiple QNAP volume endpoints
            volume_endpoints = [
                # QTS 5.x endpoints
                {"url": "/cgi-bin/storage/storage_pool.cgi", "params": {"func": "pool_list", "sid": self.sid or ""}},
                {"url": "/cgi-bin/storage/volume.cgi", "params": {"func": "vol_list", "sid": self.sid or ""}},
                # QTS 4.x endpoints
                {"url": "/cgi-bin/management/manaRequest.cgi", "params": {"subfunc": "volume_info", "sid": self.sid or ""}},
                {"url": "/cgi-bin/management/manaRequest.cgi", "params": {"subfunc": "storagepool_info", "sid": self.sid or ""}},
            ]
            
            for endpoint in volume_endpoints:
                try:
                    url = f"{self._get_base_url()}{endpoint['url']}"
                    response = self.session.get(url, params=endpoint['params'], timeout=10)
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            if isinstance(data, dict):
                                if 'volumes' in data:
                                    volumes = data['volumes']
                                    break
                                elif 'pool_list' in data:
                                    volumes = data['pool_list']
                                    break
                                elif 'vol_list' in data:
                                    volumes = data['vol_list']
                                    break
                                elif 'result' in data:
                                    volumes = data['result'] if isinstance(data['result'], list) else [data['result']]
                                    break
                            elif isinstance(data, list):
                                volumes = data
                                break
                        except:
                            # Try parsing XML
                            import re
                            vol_matches = re.findall(r'<volume[^>]*>.*?</volume>', response.text, re.DOTALL)
                            if vol_matches:
                                for match in vol_matches:
                                    vol_info = {}
                                    name_match = re.search(r'<name>([^<]+)</name>', match)
                                    status_match = re.search(r'<status>([^<]+)</status>', match)
                                    size_match = re.search(r'<total[^>]*>([^<]+)</total>', match)
                                    used_match = re.search(r'<used[^>]*>([^<]+)</used>', match)
                                    
                                    if name_match:
                                        vol_info['name'] = name_match.group(1)
                                    if status_match:
                                        vol_info['status'] = status_match.group(1)
                                    if size_match:
                                        vol_info['size'] = int(size_match.group(1)) if size_match.group(1).isdigit() else size_match.group(1)
                                    if used_match:
                                        vol_info['used'] = int(used_match.group(1)) if used_match.group(1).isdigit() else used_match.group(1)
                                    
                                    if vol_info:
                                        volumes.append(vol_info)
                                
                                if volumes:
                                    break
                except Exception as e:
                    logger.debug(f"QNAP volume endpoint {endpoint['url']} failed: {e}")
                    continue
            
            return volumes
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
    
    def get_running_services(self) -> List[Dict[str, Any]]:
        """Get list of running services on QNAP"""
        if not self.session:
            if not self.connect():
                return []
        
        services = []
        try:
            # Try to get service status from management API
            url = f"{self._get_base_url()}/cgi-bin/management/manaRequest.cgi"
            params = {"subfunc": "app_status", "sid": self.sid or ""}
            
            response = self.session.get(url, params=params, timeout=10)
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, dict) and 'apps' in data:
                        services = data['apps']
                except:
                    pass
            
            # Also check common QNAP services
            common_services = [
                {"name": "QVR Pro", "port": 443, "path": "/qvrpro/"},
                {"name": "File Station", "port": 443, "path": "/cgi-bin/filemanager/"},
                {"name": "Photo Station", "port": 443, "path": "/photo/"},
                {"name": "Music Station", "port": 443, "path": "/musicstation/"},
                {"name": "Video Station", "port": 443, "path": "/video/"},
                {"name": "Download Station", "port": 443, "path": "/downloadstation/"},
            ]
            
            for svc in common_services:
                try:
                    check_url = f"{self._get_base_url()}{svc['path']}"
                    resp = self.session.head(check_url, timeout=3, allow_redirects=True)
                    if resp.status_code in [200, 301, 302, 401, 403]:
                        services.append({
                            "name": svc["name"],
                            "status": "running",
                            "port": svc["port"]
                        })
                except:
                    pass
            
            return services
        except Exception as e:
            logger.error(f"Error getting QNAP services: {e}")
            return []
    
    def get_utilization(self) -> Optional[Dict[str, Any]]:
        """Get CPU, RAM utilization"""
        if not self.session:
            if not self.connect():
                return None
        
        try:
            url = f"{self._get_base_url()}/cgi-bin/management/manaRequest.cgi"
            params = {"subfunc": "sys_resource", "sid": self.sid or ""}
            
            response = self.session.get(url, params=params, timeout=10)
            if response.status_code == 200:
                try:
                    return response.json()
                except:
                    return None
            return None
        except Exception as e:
            logger.error(f"Error getting QNAP utilization: {e}")
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
            "services": [],
            "utilization": None,
            "health": "unknown"
        }
        
        if self.connect():
            result["connected"] = True
            result["system_info"] = self.get_system_info()
            result["disks"] = self.get_disk_info()
            result["volumes"] = self.get_volume_info()
            result["surveillance"] = self.get_surveillance_info()
            result["services"] = self.get_running_services()
            result["utilization"] = self.get_utilization()
            
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
    
    def get_running_services(self) -> List[Dict[str, Any]]:
        """Get list of running packages/services on Synology"""
        services = []
        try:
            # Get installed packages
            packages = self._api_request("SYNO.Core.Package", "list", version=1)
            if packages and 'packages' in packages:
                for pkg in packages['packages']:
                    if pkg.get('status') == 'running':
                        services.append({
                            "name": pkg.get('dname', pkg.get('id', 'Unknown')),
                            "id": pkg.get('id'),
                            "version": pkg.get('version'),
                            "status": "running"
                        })
            
            # Get core services status
            core_services = self._api_request("SYNO.Core.Service", "get", version=1)
            if core_services and isinstance(core_services, dict):
                for svc_name, svc_info in core_services.items():
                    if isinstance(svc_info, dict) and svc_info.get('enabled'):
                        services.append({
                            "name": svc_name,
                            "status": "enabled",
                            "enabled": True
                        })
            
            return services
        except Exception as e:
            logger.error(f"Error getting Synology services: {e}")
            return []
    
    def get_network_info(self) -> Optional[Dict[str, Any]]:
        """Get network interface information"""
        return self._api_request("SYNO.Core.Network", "get", version=1)
    
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
            "services": [],
            "utilization": None,
            "network": None,
            "health": "unknown"
        }
        
        if self.connect():
            result["connected"] = True
            result["system_info"] = self.get_system_info()
            result["storage"] = self.get_storage_info()
            result["disks"] = self.get_disk_info()
            result["volumes"] = self.get_volume_info()
            result["surveillance"] = self.get_surveillance_info()
            result["services"] = self.get_running_services()
            result["utilization"] = self.get_system_utilization()
            result["network"] = self.get_network_info()
            
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
