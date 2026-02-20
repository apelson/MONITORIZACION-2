"""
Dahua P2P Service - Manages Dahua DVR/NVR devices via P2P connection
Uses native Python implementation of Dahua P2P protocol.
"""
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from config import logger, db

# Import the P2P protocol implementation
from services.dahua_p2p_protocol import check_device_p2p, DahuaP2PConnection
from services.telegram_service import send_telegram_message

# Collection for Dahua devices
dahua_devices_collection = db["dahua_devices"]


async def send_dahua_status_alert(device: Dict[str, Any], new_online: bool, old_online: bool):
    """Send alert when Dahua device status changes"""
    try:
        if new_online == old_online:
            return
        
        device_name = device.get("name", device.get("serial_number", "Desconocido"))
        serial = device.get("serial_number", "N/A")
        
        if new_online:
            # Device came online
            message = f"""
✅ <b>GRABADOR CONECTADO</b>

📹 <b>Dispositivo:</b> {device_name}
🔢 <b>Serial:</b> {serial}
📊 <b>Estado:</b> ONLINE

<i>Siempria Network Monitor - Dahua P2P</i>
            """.strip()
        else:
            # Device went offline
            message = f"""
🚨 <b>ALERTA: GRABADOR DESCONECTADO</b>

📹 <b>Dispositivo:</b> {device_name}
🔢 <b>Serial:</b> {serial}
📊 <b>Estado:</b> OFFLINE
⚠️ <b>Severidad:</b> CRÍTICA

<i>Siempria Network Monitor - Dahua P2P</i>
            """.strip()
        
        await send_telegram_message(message)
        logger.info(f"Dahua alert sent: {device_name} is now {'online' if new_online else 'offline'}")
        
    except Exception as e:
        logger.error(f"Error sending Dahua status alert: {e}")

class DahuaP2PService:
    """Service to manage Dahua DVR/NVR devices via P2P protocol"""
    
    def __init__(self):
        self.connection_cache: Dict[str, datetime] = {}
        
    async def check_device_full(self, device: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check device status via P2P.
        Returns online status and firmware version.
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
            "firmware_version": None,
            "error": None
        }
        
        try:
            p2p_result = await check_device_p2p(serial_number, username, password)
            
            result["online"] = p2p_result.get("online", False)
            result["firmware_version"] = p2p_result.get("firmware_version")
            result["error"] = p2p_result.get("error")
            
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Error checking Dahua device {serial_number}: {e}")
        
        return result
    
    async def quick_check(self, serial_number: str) -> Dict[str, Any]:
        """
        Quick connectivity check via Easy4IP cloud.
        Returns whether the device is registered and online in the P2P cloud.
        """
        import socket
        
        result = {
            "serial_number": serial_number,
            "cloud_registered": False,
            "p2p_available": False,
            "error": None
        }
        
        try:
            # Create UDP socket for cloud query
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(10)
            sock.bind(("0.0.0.0", 0))
            
            # Build probe request
            import random
            import datetime as dt
            import hashlib
            import base64
            
            P2P_USERNAME = "cba1b29e32cb17aa46b8ff9e73c7f40b"
            P2P_USERKEY = "996103384cdf19179e19243e959bbf8b"
            
            nonce = random.randrange(2**31)
            curdate = dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
            hash_digest = hashlib.sha1()
            hash_digest.update(pwd.encode())
            digest = base64.b64encode(hash_digest.digest()).decode()
            
            req = f"DHGET /online/p2psrv/{serial_number} HTTP/1.1\r\n"
            req += "CSeq: 1\r\n"
            req += 'Authorization: WSSE profile="UsernameToken"\r\n'
            req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
            req += "\r\n"
            
            sock.sendto(req.encode(), ("www.easy4ipcloud.com", 8800))
            
            data, addr = sock.recvfrom(4096)
            response = data.decode()
            
            # Parse response
            if "200 OK" in response:
                result["cloud_registered"] = True
                result["p2p_available"] = True
            elif "404" in response:
                result["cloud_registered"] = False
                result["error"] = "Dispositivo no registrado en Easy4IP Cloud"
            else:
                result["error"] = "Respuesta inesperada del servidor P2P"
            
            sock.close()
            
        except socket.timeout:
            result["error"] = "Timeout conectando con Easy4IP Cloud"
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Quick check error for {serial_number}: {e}")
        
        return result
    
    async def check_all_devices(self) -> List[Dict[str, Any]]:
        """Check all registered Dahua devices"""
        devices = await dahua_devices_collection.find({}).to_list(length=None)
        results = []
        
        for device in devices:
            # Keep original id and old status for DB query and alert comparison
            original_id = device.get("id")
            old_online = device.get("online")
            device["id"] = str(device.get("_id", device.get("id")))
            result = await self.check_device_full(device)
            results.append(result)
            
            new_online = result["online"]
            
            # Update device in database using original id
            await dahua_devices_collection.update_one(
                {"id": original_id},
                {"$set": {
                    "last_check": result["checked_at"],
                    "online": result["online"],
                    "firmware_version": result.get("firmware_version"),
                    "last_error": result.get("error")
                }}
            )
            
            # Send alert if status changed
            if old_online is not None and old_online != new_online:
                await send_dahua_status_alert(device, new_online, old_online)
            
            # Small delay between devices
            await asyncio.sleep(0.5)
        
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


async def import_smartpss_xml(xml_content: str) -> Dict[str, Any]:
    """
    Import devices from SmartPSS XML export.
    If a device with the same serial_number exists, it will be updated.
    
    XML format expected:
    <DeviceManager version="2.0">
        <Device name="NAME" domain="SERIAL_OR_IP" port="37777" username="admin" password="ENCRYPTED" protocol="1" connect="19" p2ptype="0" />
    </DeviceManager>
    """
    import xml.etree.ElementTree as ET
    import uuid
    
    result = {
        "imported": 0,
        "updated": 0,
        "skipped": 0,
        "errors": [],
        "devices": []
    }
    
    try:
        root = ET.fromstring(xml_content)
        
        for device_elem in root.findall("Device"):
            try:
                name = device_elem.get("name", "").strip()
                domain = device_elem.get("domain", "").strip()
                port = device_elem.get("port", "37777")
                username = device_elem.get("username", "admin")
                # Password comes encrypted from SmartPSS - we'll need user to set it manually
                # or use a default
                connect = device_elem.get("connect", "0")
                
                if not name or not domain:
                    result["skipped"] += 1
                    continue
                
                # Determine if domain is P2P serial or IP address
                is_p2p = connect == "19" or ("." not in domain and len(domain) >= 10)
                
                # For serial_number:
                # - If P2P mode: domain is the serial number
                # - If IP mode: use domain as is (IP address)
                serial_number = domain.upper() if is_p2p else domain
                
                # Check if device already exists by serial_number
                existing = await dahua_devices_collection.find_one(
                    {"serial_number": {"$regex": f"^{serial_number}$", "$options": "i"}}
                )
                
                now = datetime.now(timezone.utc).isoformat()
                
                if existing:
                    # Update existing device
                    await dahua_devices_collection.update_one(
                        {"id": existing["id"]},
                        {"$set": {
                            "name": name,
                            "username": username,
                            "port": int(port),
                            "is_p2p": is_p2p,
                            "updated_at": now,
                            "import_source": "smartpss"
                        }}
                    )
                    result["updated"] += 1
                    result["devices"].append({
                        "name": name,
                        "serial_number": serial_number,
                        "action": "updated"
                    })
                else:
                    # Create new device
                    device = {
                        "id": str(uuid.uuid4()),
                        "name": name,
                        "serial_number": serial_number,
                        "username": username,
                        "password": "Spw@2018",  # Default password - user should update
                        "port": int(port),
                        "is_p2p": is_p2p,
                        "group_id": None,
                        "organization_id": None,
                        "created_at": now,
                        "online": False,
                        "device_type": None,
                        "last_check": None,
                        "storage_used_percent": None,
                        "recording_active": None,
                        "hdd_healthy": None,
                        "last_error": None,
                        "import_source": "smartpss"
                    }
                    await dahua_devices_collection.insert_one(device)
                    result["imported"] += 1
                    result["devices"].append({
                        "name": name,
                        "serial_number": serial_number,
                        "action": "created"
                    })
                    
            except Exception as e:
                result["errors"].append(f"Error processing device: {str(e)}")
                result["skipped"] += 1
                
    except ET.ParseError as e:
        result["errors"].append(f"XML parse error: {str(e)}")
    except Exception as e:
        result["errors"].append(f"Import error: {str(e)}")
        logger.error(f"SmartPSS import error: {e}")
    
    return result
