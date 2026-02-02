"""
Infrastructure Services - VMware ESXi, QNAP, and Synology Integration
"""
import ssl
import urllib3
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import re

# SSH support for ESXi fallback
try:
    import paramiko
    HAS_PARAMIKO = True
except ImportError:
    HAS_PARAMIKO = False

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
                logger.warning("ESXi: Could not establish session for VM listing")
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
                    logger.info(f"ESXi VM endpoint {endpoint}: status {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        logger.debug(f"ESXi VM data type: {type(data)}, keys: {data.keys() if isinstance(data, dict) else 'N/A'}")
                        if isinstance(data, dict):
                            vms = data.get('value', data.get('result', []))
                        else:
                            vms = data
                        
                        if isinstance(vms, list) and len(vms) > 0:
                            logger.info(f"ESXi found {len(vms)} VMs via {endpoint}")
                            return vms
                        else:
                            logger.info(f"ESXi endpoint {endpoint} returned empty VM list")
                    elif response.status_code == 401:
                        logger.warning(f"ESXi auth failed on {endpoint}, attempting reconnect")
                        if self.connect():
                            continue
                except Exception as e:
                    logger.warning(f"ESXi endpoint {endpoint} error: {e}")
                    continue
            
            # For standalone ESXi (no vCenter), try MOB/SOAP-based approach via vim-cmd proxy
            logger.info("ESXi: Attempting MOB approach for standalone ESXi")
            try:
                # Try the ESXi MOB API - Get registered VMs
                mob_url = f"{self._get_base_url()}/mob/?moid=ha-folder-vm&doPath=childEntity"
                response = self.session.get(mob_url, timeout=15, auth=(self.username, self.password))
                logger.info(f"ESXi MOB response: status {response.status_code}")
                
                if response.status_code == 200 and 'VirtualMachine' in response.text:
                    # Parse VM IDs from MOB response
                    vm_ids = re.findall(r'vm-(\d+)', response.text)
                    logger.info(f"ESXi MOB found {len(vm_ids)} VM IDs: {vm_ids[:5]}")
                    
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
                                logger.debug(f"ESXi extracted VM: {vm_info['name']}")
                        except Exception as e:
                            logger.debug(f"Error getting VM vm-{vm_id} details: {e}")
                            continue
                    
                    if vms:
                        logger.info(f"ESXi MOB successfully extracted {len(vms)} VMs")
                        return vms
                else:
                    logger.warning(f"ESXi MOB returned status {response.status_code}, 'VirtualMachine' in response: {'VirtualMachine' in response.text if response.status_code == 200 else 'N/A'}")
            except Exception as e:
                logger.warning(f"ESXi MOB approach failed: {e}")
            
            # SSH Fallback - for standalone ESXi when MOB is disabled
            if HAS_PARAMIKO:
                logger.info("ESXi: Attempting SSH fallback for VM listing")
                try:
                    vms = self._get_vms_via_ssh()
                    if vms:
                        logger.info(f"ESXi SSH successfully extracted {len(vms)} VMs")
                        return vms
                except Exception as e:
                    logger.warning(f"ESXi SSH approach failed: {e}")
            else:
                logger.warning("ESXi: Paramiko not installed, SSH fallback unavailable")
            
            logger.warning(f"ESXi: No VMs found using any method. ESXi may have no VMs or limited API access.")
            return vms
        except Exception as e:
            logger.error(f"Error getting VMs: {e}")
            return []
    
    def _get_vms_via_ssh(self) -> List[Dict[str, Any]]:
        """Fallback method to get VMs via SSH using vim-cmd"""
        if not HAS_PARAMIKO:
            return []
        
        vms = []
        ssh = None
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            logger.info(f"ESXi SSH: Connecting to {self.host} as {self.username}")
            ssh.connect(
                hostname=self.host,
                port=22,
                username=self.username,
                password=self.password,
                timeout=15,
                allow_agent=False,
                look_for_keys=False
            )
            
            # Get list of all VMs using vim-cmd
            stdin, stdout, stderr = ssh.exec_command('vim-cmd vmsvc/getallvms', timeout=30)
            output = stdout.read().decode('utf-8', errors='ignore')
            err = stderr.read().decode('utf-8', errors='ignore')
            
            if err:
                logger.warning(f"ESXi SSH vim-cmd stderr: {err}")
            
            logger.debug(f"ESXi SSH vim-cmd output:\n{output[:500]}")
            
            # Parse vim-cmd output
            # Format: Vmid    Name                       File                           Guest OS         Version   Annotation
            lines = output.strip().split('\n')
            for line in lines[1:]:  # Skip header line
                if not line.strip():
                    continue
                
                # Split by multiple spaces and extract fields
                parts = line.split()
                if len(parts) >= 4:
                    try:
                        vmid = parts[0]
                        # The name can contain spaces, so we need to parse more carefully
                        # Find the .vmx file path which indicates end of name
                        vmx_match = re.search(r'\[([^\]]+)\]\s+([^\s]+\.vmx)', line)
                        if vmx_match:
                            vmx_idx = line.find(vmx_match.group(0))
                            name = line[len(vmid):vmx_idx].strip()
                            
                            # Get power state for this VM
                            try:
                                stdin2, stdout2, stderr2 = ssh.exec_command(f'vim-cmd vmsvc/power.getstate {vmid}', timeout=10)
                                power_output = stdout2.read().decode('utf-8', errors='ignore')
                                if 'Powered on' in power_output:
                                    power_state = 'POWERED_ON'
                                elif 'Powered off' in power_output:
                                    power_state = 'POWERED_OFF'
                                elif 'Suspended' in power_output:
                                    power_state = 'SUSPENDED'
                                else:
                                    power_state = 'UNKNOWN'
                            except:
                                power_state = 'UNKNOWN'
                            
                            # Get VM summary for CPU/memory
                            cpu_count = None
                            memory_mb = None
                            guest_os = None
                            try:
                                stdin3, stdout3, stderr3 = ssh.exec_command(f'vim-cmd vmsvc/get.summary {vmid}', timeout=10)
                                summary_output = stdout3.read().decode('utf-8', errors='ignore')
                                
                                cpu_match = re.search(r'numCpu\s*=\s*(\d+)', summary_output)
                                mem_match = re.search(r'memorySizeMB\s*=\s*(\d+)', summary_output)
                                guest_match = re.search(r'guestFullName\s*=\s*"([^"]+)"', summary_output)
                                
                                if cpu_match:
                                    cpu_count = int(cpu_match.group(1))
                                if mem_match:
                                    memory_mb = int(mem_match.group(1))
                                if guest_match:
                                    guest_os = guest_match.group(1)
                            except:
                                pass
                            
                            vm_info = {
                                'vm': f'vm-{vmid}',
                                'name': name,
                                'power_state': power_state,
                                'cpu_count': cpu_count,
                                'memory_size_MiB': memory_mb,
                                'guest_OS': guest_os
                            }
                            vms.append(vm_info)
                            logger.debug(f"ESXi SSH extracted VM: {name} ({power_state})")
                    except Exception as e:
                        logger.debug(f"Error parsing VM line '{line}': {e}")
                        continue
            
            return vms
        except paramiko.AuthenticationException:
            logger.error("ESXi SSH: Authentication failed")
            return []
        except paramiko.SSHException as e:
            logger.error(f"ESXi SSH: SSH error - {e}")
            return []
        except Exception as e:
            logger.error(f"ESXi SSH: Error - {e}")
            return []
        finally:
            if ssh:
                try:
                    ssh.close()
                except:
                    pass
    
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
            
            # Try multiple QNAP authentication methods
            auth_methods = [
                # Method 1: Standard authLogin.cgi with params
                {
                    "url": f"{self._get_base_url()}/cgi-bin/authLogin.cgi",
                    "params": {"user": self.username, "pwd": self.password}
                },
                # Method 2: Direct URL with credentials
                {
                    "url": f"{self._get_base_url()}/cgi-bin/authLogin.cgi?user={self.username}&pwd={self.password}",
                    "params": {}
                },
                # Method 3: Basic auth for newer QTS
                {
                    "url": f"{self._get_base_url()}/cgi-bin/authLogin.cgi",
                    "params": {},
                    "auth": (self.username, self.password)
                }
            ]
            
            import re
            for method in auth_methods:
                try:
                    if "auth" in method:
                        response = self.session.get(
                            method["url"], 
                            params=method["params"],
                            auth=method["auth"],
                            timeout=10
                        )
                    else:
                        response = self.session.get(
                            method["url"], 
                            params=method["params"],
                            timeout=10
                        )
                    
                    if response.status_code == 200:
                        # Check for successful auth in response
                        auth_passed = re.search(r'<authPassed><!\[CDATA\[([^\]]+)\]\]></authPassed>', response.text)
                        
                        if auth_passed and auth_passed.group(1) == '1':
                            # Successfully authenticated - extract SID
                            sid_match = re.search(r'<authSid><!\[CDATA\[([^\]]+)\]\]></authSid>', response.text)
                            if sid_match:
                                self.sid = sid_match.group(1)
                                logger.info(f"QNAP authenticated successfully with SID")
                                return True
                        
                        # For some QTS versions, just having SID is enough
                        sid_match = re.search(r'<authSid><!\[CDATA\[([^\]]+)\]\]></authSid>', response.text)
                        if sid_match and sid_match.group(1):
                            self.sid = sid_match.group(1)
                            # Verify SID works by calling a simple endpoint
                            test_url = f"{self._get_base_url()}/cgi-bin/management/manaRequest.cgi"
                            test_resp = self.session.get(test_url, params={"subfunc": "sysinfo", "sid": self.sid}, timeout=5)
                            if test_resp.status_code == 200:
                                logger.info(f"QNAP authenticated with SID (method {auth_methods.index(method)+1})")
                                return True
                        
                except Exception as e:
                    logger.debug(f"QNAP auth method failed: {e}")
                    continue
            
            logger.error(f"QNAP authentication failed - all methods exhausted")
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
            
            # Extract disks and volumes from storage if available
            if result["storage"]:
                result["disks"] = result["storage"].get("disks", [])
                result["volumes"] = result["storage"].get("volumes", [])
            
            result["surveillance"] = self.get_surveillance_info()
            result["services"] = self.get_running_services()
            result["utilization"] = self.get_system_utilization()
            result["network"] = self.get_network_info()
            
            # Determine overall health
            if result["system_info"]:
                result["health"] = "healthy"
                # Check disk health from storage data
                for disk in result["disks"]:
                    disk_status = disk.get("status", "").lower()
                    if disk_status not in ["normal", "healthy", ""]:
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
