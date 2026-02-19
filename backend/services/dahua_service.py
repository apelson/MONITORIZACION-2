"""
Dahua P2P Service - Manages Dahua DVR/NVR devices via P2P connection
"""
import asyncio
import subprocess
import httpx
import os
import signal
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from config import logger, db

# Collection for Dahua devices
dahua_devices_collection = db["dahua_devices"]

class DahuaP2PService:
    """Service to manage Dahua DVR/NVR devices via P2P tunnel"""
    
    def __init__(self):
        self.active_tunnels: Dict[str, subprocess.Popen] = {}
        self.base_port = 18000  # Starting port for P2P tunnels
        
    def get_tunnel_port(self, device_id: str) -> int:
        """Get a unique port for each device tunnel"""
        # Use hash of device_id to get consistent port
        return self.base_port + (hash(device_id) % 1000)
    
    async def start_p2p_tunnel(self, serial_number: str, device_id: str) -> Optional[int]:
        """
        Start a P2P tunnel to a Dahua device
        Returns the local port if successful, None otherwise
        """
        port = self.get_tunnel_port(device_id)
        
        # Check if tunnel already running
        if device_id in self.active_tunnels:
            proc = self.active_tunnels[device_id]
            if proc.poll() is None:  # Still running
                return port
            else:
                del self.active_tunnels[device_id]
        
        try:
            # Try to start dh-p2p tunnel
            # Format: dh-p2p -p 127.0.0.1:LOCAL_PORT:80 SERIAL_NUMBER
            cmd = [
                "dh-p2p",
                "-p", f"127.0.0.1:{port}:80",
                serial_number
            ]
            
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid
            )
            
            # Wait a bit for connection to establish
            await asyncio.sleep(3)
            
            if proc.poll() is not None:
                # Process exited - tunnel failed
                stderr = proc.stderr.read().decode() if proc.stderr else ""
                logger.error(f"P2P tunnel failed for {serial_number}: {stderr}")
                return None
            
            self.active_tunnels[device_id] = proc
            logger.info(f"P2P tunnel started for {serial_number} on port {port}")
            return port
            
        except FileNotFoundError:
            logger.error("dh-p2p not found. Please install it first.")
            return None
        except Exception as e:
            logger.error(f"Error starting P2P tunnel: {e}")
            return None
    
    def stop_p2p_tunnel(self, device_id: str):
        """Stop a P2P tunnel"""
        if device_id in self.active_tunnels:
            proc = self.active_tunnels[device_id]
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except Exception:
                proc.terminate()
            del self.active_tunnels[device_id]
            logger.info(f"P2P tunnel stopped for device {device_id}")
    
    def stop_all_tunnels(self):
        """Stop all active tunnels"""
        for device_id in list(self.active_tunnels.keys()):
            self.stop_p2p_tunnel(device_id)
    
    async def query_device_via_http(
        self, 
        port: int, 
        username: str, 
        password: str,
        endpoint: str,
        timeout: float = 10.0
    ) -> Optional[Dict[str, Any]]:
        """Query device via local HTTP tunnel"""
        try:
            url = f"http://127.0.0.1:{port}{endpoint}"
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(
                    url,
                    auth=httpx.DigestAuth(username, password)
                )
                if response.status_code == 200:
                    return {"success": True, "data": response.text}
                else:
                    return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            logger.error(f"HTTP query error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_device_status(
        self,
        port: int,
        username: str,
        password: str
    ) -> Dict[str, Any]:
        """Get device online status and basic info"""
        result = await self.query_device_via_http(
            port, username, password,
            "/cgi-bin/magicBox.cgi?action=getDeviceType"
        )
        
        if result and result.get("success"):
            return {
                "online": True,
                "device_type": result.get("data", "").strip()
            }
        return {"online": False, "device_type": None}
    
    async def get_storage_info(
        self,
        port: int,
        username: str,
        password: str
    ) -> Dict[str, Any]:
        """Get storage/HDD information"""
        result = await self.query_device_via_http(
            port, username, password,
            "/cgi-bin/configManager.cgi?action=getConfig&name=StorageGlobal"
        )
        
        storage_info = {
            "disks": [],
            "total_size_gb": 0,
            "free_size_gb": 0,
            "used_percent": 0
        }
        
        if result and result.get("success"):
            try:
                # Parse the response (Dahua returns key=value format)
                data = result.get("data", "")
                # Try to extract disk info
                # Format varies by firmware, common patterns:
                # table.StorageGlobal[0].Name=sda1
                # table.StorageGlobal[0].TotalSpace=500107862016
                # table.StorageGlobal[0].FreeSpace=123456789
                
                lines = data.split('\n')
                current_disk = {}
                
                for line in lines:
                    if '=' in line:
                        key, value = line.split('=', 1)
                        value = value.strip()
                        
                        if 'TotalSpace' in key or 'TotalBytes' in key:
                            try:
                                total_bytes = int(value)
                                storage_info["total_size_gb"] += total_bytes / (1024**3)
                            except:
                                pass
                        elif 'FreeSpace' in key or 'FreeBytes' in key:
                            try:
                                free_bytes = int(value)
                                storage_info["free_size_gb"] += free_bytes / (1024**3)
                            except:
                                pass
                        elif 'Status' in key:
                            current_disk["status"] = value
                        elif 'Name' in key:
                            current_disk["name"] = value
                
                if storage_info["total_size_gb"] > 0:
                    used = storage_info["total_size_gb"] - storage_info["free_size_gb"]
                    storage_info["used_percent"] = round(
                        (used / storage_info["total_size_gb"]) * 100, 1
                    )
                
                storage_info["total_size_gb"] = round(storage_info["total_size_gb"], 2)
                storage_info["free_size_gb"] = round(storage_info["free_size_gb"], 2)
                
            except Exception as e:
                logger.error(f"Error parsing storage info: {e}")
        
        return storage_info
    
    async def get_recording_status(
        self,
        port: int,
        username: str,
        password: str
    ) -> Dict[str, Any]:
        """Get recording status for all channels"""
        result = await self.query_device_via_http(
            port, username, password,
            "/cgi-bin/configManager.cgi?action=getConfig&name=RecordMode"
        )
        
        recording_info = {
            "channels": [],
            "recording_active": False,
            "channels_recording": 0
        }
        
        if result and result.get("success"):
            try:
                data = result.get("data", "")
                # Parse recording status
                # Format: table.RecordMode[0].Mode=2 (0=off, 1=manual, 2=auto)
                
                lines = data.split('\n')
                channels_enabled = 0
                
                for line in lines:
                    if '=' in line and 'Mode' in line:
                        key, value = line.split('=', 1)
                        try:
                            mode = int(value.strip())
                            if mode > 0:
                                channels_enabled += 1
                        except:
                            pass
                
                recording_info["channels_recording"] = channels_enabled
                recording_info["recording_active"] = channels_enabled > 0
                
            except Exception as e:
                logger.error(f"Error parsing recording status: {e}")
        
        return recording_info
    
    async def get_hdd_health(
        self,
        port: int,
        username: str,
        password: str
    ) -> Dict[str, Any]:
        """Get HDD health status"""
        result = await self.query_device_via_http(
            port, username, password,
            "/cgi-bin/configManager.cgi?action=getConfig&name=StorageInfo"
        )
        
        hdd_info = {
            "disks": [],
            "all_healthy": True
        }
        
        if result and result.get("success"):
            try:
                data = result.get("data", "")
                lines = data.split('\n')
                
                current_disk = {}
                for line in lines:
                    if '=' in line:
                        key, value = line.split('=', 1)
                        value = value.strip()
                        
                        if 'State' in key or 'Status' in key:
                            status = value.lower()
                            is_healthy = status in ['normal', 'ok', '0', 'good']
                            current_disk["status"] = "healthy" if is_healthy else "error"
                            if not is_healthy:
                                hdd_info["all_healthy"] = False
                        elif 'Name' in key or 'Device' in key:
                            if current_disk:
                                hdd_info["disks"].append(current_disk)
                            current_disk = {"name": value}
                
                if current_disk:
                    hdd_info["disks"].append(current_disk)
                    
            except Exception as e:
                logger.error(f"Error parsing HDD health: {e}")
        
        return hdd_info
    
    async def check_device_full(self, device: Dict[str, Any]) -> Dict[str, Any]:
        """
        Full device check - connects via P2P, queries all info, disconnects
        """
        device_id = device.get("id")
        serial_number = device.get("serial_number")
        username = device.get("username", "admin")
        password = device.get("password", "")
        
        result = {
            "device_id": device_id,
            "serial_number": serial_number,
            "name": device.get("name"),
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "online": False,
            "device_type": None,
            "storage": None,
            "recording": None,
            "hdd_health": None,
            "error": None
        }
        
        try:
            # Start P2P tunnel
            port = await self.start_p2p_tunnel(serial_number, device_id)
            
            if not port:
                result["error"] = "No se pudo establecer conexión P2P"
                return result
            
            # Wait a bit more for tunnel to stabilize
            await asyncio.sleep(2)
            
            # Get device status
            status = await self.get_device_status(port, username, password)
            result["online"] = status.get("online", False)
            result["device_type"] = status.get("device_type")
            
            if result["online"]:
                # Get storage info
                result["storage"] = await self.get_storage_info(port, username, password)
                
                # Get recording status
                result["recording"] = await self.get_recording_status(port, username, password)
                
                # Get HDD health
                result["hdd_health"] = await self.get_hdd_health(port, username, password)
            
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Error checking Dahua device {serial_number}: {e}")
        
        finally:
            # Stop P2P tunnel
            self.stop_p2p_tunnel(device_id)
        
        return result
    
    async def check_all_devices(self) -> List[Dict[str, Any]]:
        """Check all registered Dahua devices"""
        devices = await dahua_devices_collection.find({}).to_list(length=None)
        results = []
        
        for device in devices:
            device["id"] = str(device.get("_id", device.get("id")))
            result = await self.check_device_full(device)
            results.append(result)
            
            # Update device in database
            await dahua_devices_collection.update_one(
                {"id": device["id"]},
                {"$set": {
                    "last_check": result["checked_at"],
                    "online": result["online"],
                    "device_type": result["device_type"],
                    "storage_used_percent": result.get("storage", {}).get("used_percent"),
                    "recording_active": result.get("recording", {}).get("recording_active"),
                    "hdd_healthy": result.get("hdd_health", {}).get("all_healthy"),
                    "last_error": result.get("error")
                }}
            )
            
            # Small delay between devices to avoid overwhelming
            await asyncio.sleep(1)
        
        return results


# Singleton instance
dahua_service = DahuaP2PService()


# CRUD Operations for Dahua devices
async def get_all_dahua_devices() -> List[Dict[str, Any]]:
    """Get all registered Dahua devices"""
    devices = await dahua_devices_collection.find({}, {"_id": 0}).to_list(length=None)
    return devices


async def get_dahua_device(device_id: str) -> Optional[Dict[str, Any]]:
    """Get a single Dahua device by ID"""
    device = await dahua_devices_collection.find_one({"id": device_id}, {"_id": 0})
    return device


async def create_dahua_device(device_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new Dahua device"""
    import uuid
    
    device = {
        "id": str(uuid.uuid4()),
        "name": device_data.get("name"),
        "serial_number": device_data.get("serial_number"),
        "username": device_data.get("username", "admin"),
        "password": device_data.get("password", ""),
        "group_id": device_data.get("group_id"),
        "organization_id": device_data.get("organization_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "online": False,
        "device_type": None,
        "last_check": None,
        "storage_used_percent": None,
        "recording_active": None,
        "hdd_healthy": None,
        "last_error": None
    }
    
    await dahua_devices_collection.insert_one(device)
    device.pop("_id", None)
    return device


async def update_dahua_device(device_id: str, device_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a Dahua device"""
    update_fields = {}
    
    for field in ["name", "serial_number", "username", "password", "group_id", "organization_id"]:
        if field in device_data:
            update_fields[field] = device_data[field]
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await dahua_devices_collection.update_one(
            {"id": device_id},
            {"$set": update_fields}
        )
    
    return await get_dahua_device(device_id)


async def delete_dahua_device(device_id: str) -> bool:
    """Delete a Dahua device"""
    result = await dahua_devices_collection.delete_one({"id": device_id})
    return result.deleted_count > 0
