"""
Dahua P2P Protocol Implementation
Based on reverse-engineering of dh-p2p project by khoanguyen-3fc
https://github.com/khoanguyen-3fc/dh-p2p

This implements the PTCP (PhonyTCP) protocol used by Dahua for P2P connections.
Supports both static randsalt (older firmware) and dynamic randsalt (v6.7+).
"""
import asyncio
import base64
import datetime
import hashlib
import hmac
import random
import socket
import time
from struct import pack, unpack
from typing import Optional, Dict, Any, Tuple

import httpx
import xmltodict
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from config import logger

# Dahua P2P Cloud Server
MAIN_SERVER = "www.easy4ipcloud.com"
MAIN_PORT = 8800

# Public credentials for Easy4IP Cloud
P2P_USERNAME = "cba1b29e32cb17aa46b8ff9e73c7f40b"
P2P_USERKEY = "996103384cdf19179e19243e959bbf8b"
DEFAULT_RANDSALT = "5daf91fc5cfc1be8e081cfb08f792726"
IV = b"2z52*lk9o6HRyJrf"

# Device Info decryption keys (for firmware 6.7+)
# These are used to decrypt the Info field which contains the randsalt
INFO_DECRYPT_KEY = b"kRjmsUB&ezmdGLL67H#$ojw@XflcaIaf"  # 32 bytes
INFO_DECRYPT_IV = b"MydvJw*Iw1w&i^kk"  # 16 bytes

CSEQ_COUNTER = 0


def get_auth_key(username: str, password: str, randsalt: str = DEFAULT_RANDSALT) -> bytes:
    """Generate authentication key from device credentials"""
    key = f"{username}:Login to {randsalt}:{password}"
    return hashlib.md5(key.encode()).hexdigest().upper().encode()


def get_nonce() -> int:
    """Generate random nonce"""
    return random.randrange(2**31)


def encrypt_data(key: bytes, nonce: int, data: str) -> str:
    """Encrypt data using AES-OFB with PBKDF2 derived key"""
    salt = str(nonce).encode()
    dk = hashlib.pbkdf2_hmac("sha256", key, salt, 20000, 32)
    
    encryptor = Cipher(
        algorithms.AES(dk), modes.OFB(IV), backend=default_backend()
    ).encryptor()
    enc = encryptor.update(data.encode()) + encryptor.finalize()
    
    return base64.b64encode(enc).decode()


def decrypt_data(key: bytes, nonce: int, data: str) -> str:
    """Decrypt data using AES-OFB with PBKDF2 derived key"""
    salt = str(nonce).encode()
    dk = hashlib.pbkdf2_hmac("sha256", key, salt, 20000, 32)
    
    decryptor = Cipher(
        algorithms.AES(dk), modes.OFB(IV), backend=default_backend()
    ).decryptor()
    dec = decryptor.update(base64.b64decode(data)) + decryptor.finalize()
    
    return dec.decode()


def decrypt_device_info(info_data: str) -> Optional[Dict[str, Any]]:
    """
    Decrypt the Info field from /info/device endpoint.
    Firmware 6.7+ returns encrypted device info containing randsalt.
    
    Uses AES-256-OFB with hardcoded keys from Dahua P2P DLL.
    """
    try:
        # Decode base64
        cipher_text = base64.b64decode(info_data)
        
        # Decrypt using AES-OFB
        cipher = Cipher(
            algorithms.AES(INFO_DECRYPT_KEY),
            modes.OFB(INFO_DECRYPT_IV),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(cipher_text) + decryptor.finalize()
        
        # Try to parse as JSON
        try:
            # Remove padding bytes
            decrypted_str = decrypted.decode('utf-8', errors='ignore').rstrip('\x00')
            # Find JSON boundaries
            json_start = decrypted_str.find('{')
            json_end = decrypted_str.rfind('}')
            if json_start >= 0 and json_end > json_start:
                json_str = decrypted_str[json_start:json_end+1]
                import json
                return json.loads(json_str)
        except:
            pass
        
        # Try to extract randsalt directly from decrypted data
        # Look for 32-char hex string pattern
        decrypted_str = decrypted.decode('utf-8', errors='ignore')
        import re
        hex_pattern = re.findall(r'[a-f0-9]{32}', decrypted_str)
        if hex_pattern:
            return {"randsalt": hex_pattern[0]}
        
        logger.debug(f"Decrypted Info (raw): {decrypted_str[:100]}")
        return None
        
    except Exception as e:
        logger.warning(f"Failed to decrypt device Info: {e}")
        return None


def get_device_auth(username: str, key: bytes, nonce: int, randsalt: str = DEFAULT_RANDSALT, payload: str = "") -> str:
    """Generate authentication XML for device communication"""
    curdate = int(time.time())
    
    message = f"{nonce}{curdate}{payload}".encode()
    auth = base64.b64encode(hmac.new(key, message, hashlib.sha256).digest()).decode()
    
    return (
        f"<CreateDate>{curdate}</CreateDate>"
        f"<DevAuth>{auth}</DevAuth>"
        f"<Nonce>{nonce}</Nonce>"
        f"<RandSalt>{randsalt}</RandSalt>"
        f"<UserName>{username}</UserName>"
    )


class PTCPPayload:
    """PTCP payload container for TCP data encapsulation"""
    
    def __init__(self, realm: int, payload: bytes) -> None:
        self.realm = realm
        self.payload = payload
    
    def __bytes__(self) -> bytes:
        length = len(self.payload) | 0x10000000
        return pack("!LLL", length, self.realm, 0) + self.payload
    
    def __str__(self) -> str:
        return f"PTCPPayload(realm={self.realm:08X}, payload_len={len(self.payload)})"
    
    @classmethod
    def parse(cls, data: bytes) -> "PTCPPayload":
        if len(data) < 12:
            raise ValueError("Packet is too short")
        
        length, realm, pad = unpack("!LLL", data[:12])
        
        if pad != 0:
            raise ValueError("Invalid padding")
        
        length &= 0xFFFF
        data = data[12:]
        
        if len(data) != length:
            raise ValueError(f"Invalid length: expected {length}, got {len(data)}")
        
        return cls(realm, data)


class PTCP:
    """PTCP (PhonyTCP) packet structure"""
    
    def __init__(self, rlid: int, llid: int, pid: int, lmid: int, rmid: int, body: bytes = b"") -> None:
        self.rlid = rlid
        self.llid = llid
        self.pid = pid
        self.lmid = lmid
        self.rmid = rmid
        self.body = body
    
    def __bytes__(self) -> bytes:
        return (
            pack(
                "!4sLLLLL",
                b"PTCP",
                self.rlid,
                self.llid,
                self.pid,
                self.lmid,
                self.rmid,
            )
            + self.body
        )
    
    def __str__(self) -> str:
        return f"PTCP(rlid={self.rlid:08X}, llid={self.llid:08X}, pid={self.pid:08X}, lmid={self.lmid:08X}, rmid={self.rmid:08X}, body_len={len(self.body)})"
    
    @classmethod
    def parse(cls, data: bytes) -> "PTCP":
        if len(data) < 24:
            raise ValueError("Packet is too short")
        
        header, body = data[:24], data[24:]
        magic, rlid, llid, pid, lmid, rmid = unpack("!4sLLLLL", header)
        
        if magic != b"PTCP":
            raise ValueError("Invalid magic")
        
        return cls(rlid, llid, pid, lmid, rmid, body)


class DahuaP2PConnection:
    """Manages a P2P connection to a Dahua device"""
    
    def __init__(self, serial_number: str, username: str, password: str):
        self.serial_number = serial_number
        self.username = username
        self.password = password
        self.socket: Optional[socket.socket] = None
        self.local_port: int = 0
        self.device_ip: Optional[str] = None
        self.device_port: int = 0
        self.connected: bool = False
        
        # Authentication
        self.randsalt = DEFAULT_RANDSALT
        self.auth_type = 0  # 0 = no auth, 1 = auth required
        
        # PTCP state
        self.ptcp_sent = 0
        self.ptcp_recv = 0
        self.ptcp_count = 0
        self.ptcp_id = 0
        self.rmid = 0
        
        # Connection details
        self.tunnel_port: int = 0
    
    def _create_socket(self) -> socket.socket:
        """Create and bind UDP socket"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.bind(("0.0.0.0", 0))
        sock.settimeout(10)
        self.local_port = sock.getsockname()[1]
        return sock
    
    def _send_udp(self, host: str, port: int, data: bytes):
        """Send UDP packet"""
        self.socket.sendto(data, (host, port))
    
    def _recv_udp(self, timeout: float = 10) -> bytes:
        """Receive UDP packet"""
        self.socket.settimeout(timeout)
        try:
            data, addr = self.socket.recvfrom(4096)
            return data
        except socket.timeout:
            raise TimeoutError("UDP receive timeout")
    
    def _build_request(self, path: str, body: str = "", auth: bool = True) -> bytes:
        """Build HTTP-like request for P2P protocol"""
        global CSEQ_COUNTER
        CSEQ_COUNTER += 1
        
        nonce = random.randrange(2**31)
        curdate = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
        hash_digest = hashlib.sha1()
        hash_digest.update(pwd.encode())
        digest = base64.b64encode(hash_digest.digest()).decode()
        
        req = f"{'DHPOST' if body else 'DHGET'} {path} HTTP/1.1\r\n"
        req += f"CSeq: {CSEQ_COUNTER}\r\n"
        
        if auth:
            req += f'Authorization: WSSE profile="UsernameToken"\r\n'
            req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
        
        if body:
            req += f"Content-Type:\r\n"
            req += f"Content-Length: {len(body)}\r\n"
        
        req += f"\r\n{body}"
        
        return req.encode()
    
    def _parse_response(self, data: bytes) -> Dict[str, Any]:
        """Parse HTTP-like response"""
        text = data.decode()
        headers, body = text.split("\r\n\r\n", 1)
        headers = headers.split("\r\n")
        version, code, status = headers[0].split(" ", 2)
        code = int(code)
        
        return {
            "version": version,
            "code": code,
            "status": status,
            "headers": dict(h.split(": ", 1) for h in headers[1:] if ": " in h),
            "data": xmltodict.parse(body) if body.strip() else None,
        }
    
    def _send_request(self, host: str, port: int, path: str, body: str = "", auth: bool = True) -> Dict[str, Any]:
        """Send request and get response"""
        req = self._build_request(path, body, auth)
        self._send_udp(host, port, req)
        data = self._recv_udp()
        return self._parse_response(data)
    
    def _send_ptcp(self, host: str, port: int, body: bytes = b""):
        """Send PTCP packet"""
        ptcp = PTCP(
            self.ptcp_sent,
            self.ptcp_recv,
            0x0002FFFF if body == b"\x03\x01" else 0x0000FFFF - self.ptcp_count,
            self.ptcp_id,
            self.rmid,
            body,
        )
        
        self.ptcp_sent += len(ptcp.body)
        self.ptcp_id += 1
        if len(ptcp.body) > 0 and ptcp.body != b"\x03\x01":
            self.ptcp_count += 1
        
        self._send_udp(host, port, bytes(ptcp))
    
    def _recv_ptcp(self) -> PTCP:
        """Receive PTCP packet"""
        data = self._recv_udp()
        res = PTCP.parse(data)
        self.ptcp_recv += len(res.body)
        self.rmid = res.lmid
        return res
    
    def _get_device_randsalt(self, p2psrv_server: str, p2psrv_port: int) -> Optional[str]:
        """Try to get randsalt from device info endpoint"""
        # Create a dedicated socket for this request
        info_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        info_socket.bind(("0.0.0.0", 0))
        info_socket.settimeout(10)
        
        # Store original socket
        original_socket = self.socket
        self.socket = info_socket
        
        try:
            res = self._send_request(p2psrv_server, p2psrv_port, f"/info/device/{self.serial_number}")
            if res["code"] == 200 and res.get("data"):
                body = res["data"].get("body", {})
                
                # Check for RandSalt directly in response
                if "RandSalt" in body and body["RandSalt"]:
                    logger.info(f"Found RandSalt directly in response")
                    return body["RandSalt"]
                
                # Check for encrypted Info field (firmware 6.7+)
                if "Info" in body and body["Info"]:
                    info = body["Info"]
                    logger.info(f"Found encrypted Info field, attempting decryption...")
                    
                    # Try to decrypt the Info field
                    decrypted = decrypt_device_info(info)
                    if decrypted:
                        logger.info(f"Decrypted device info: {decrypted}")
                        
                        # Look for randsalt in various possible keys
                        for key in ["randsalt", "RandSalt", "salt", "Salt"]:
                            if key in decrypted:
                                logger.info(f"Found randsalt in decrypted Info: {decrypted[key][:8]}...")
                                return decrypted[key]
                        
                        # Also check nested structure
                        if isinstance(decrypted, dict):
                            for key, value in decrypted.items():
                                if isinstance(value, str) and len(value) == 32 and value.replace('-', '').isalnum():
                                    logger.info(f"Found potential randsalt in '{key}': {value[:8]}...")
                                    return value
                    else:
                        logger.warning("Could not decrypt Info field")
                
            return None
        except Exception as e:
            logger.warning(f"Could not get device randsalt: {e}")
            return None
        finally:
            # Restore original socket and close the info socket
            info_socket.close()
            self.socket = original_socket
    
    async def connect(self) -> bool:
        """Establish P2P connection to device"""
        try:
            self.socket = self._create_socket()
            logger.info(f"Starting P2P connection for {self.serial_number}")
            
            # Step 1: Probe P2P server
            res = self._send_request(MAIN_SERVER, MAIN_PORT, "/probe/p2psrv")
            logger.debug(f"Probe P2P server: {res['code']}")
            
            # Step 2: Get P2P server for device
            res = self._send_request(MAIN_SERVER, MAIN_PORT, f"/online/p2psrv/{self.serial_number}")
            if res["code"] >= 400:
                logger.error(f"Device not found in P2P cloud: {res['status']}")
                return False
            
            p2psrv_info = res["data"]["body"]["US"]
            p2psrv_server, p2psrv_port = p2psrv_info.split(":")
            p2psrv_port = int(p2psrv_port)
            logger.info(f"P2P server: {p2psrv_server}:{p2psrv_port}")
            
            # Step 3: Probe device and get device info
            p2p_socket = self._create_socket()
            self.socket = p2p_socket
            
            res = self._send_request(p2psrv_server, p2psrv_port, f"/probe/device/{self.serial_number}")
            
            # Try to get randsalt from device info
            device_randsalt = self._get_device_randsalt(p2psrv_server, p2psrv_port)
            if device_randsalt:
                self.randsalt = device_randsalt
                logger.info(f"Using device randsalt: {self.randsalt[:8]}...")
            else:
                logger.info(f"Using default randsalt")
            
            # Step 4: Get relay server
            res = self._send_request(MAIN_SERVER, MAIN_PORT, "/online/relay")
            relay_server, relay_port = res["data"]["body"]["Address"].split(":")
            relay_port = int(relay_port)
            logger.info(f"Relay server: {relay_server}:{relay_port}")
            
            # Step 5: Request P2P channel (with auth)
            # Always use auth type 1 for devices requiring authentication
            key = get_auth_key(self.username, self.password, self.randsalt)
            nonce = get_nonce()
            
            laddr = f"127.0.0.1:{self.local_port}"
            encrypted_laddr = encrypt_data(key, nonce, laddr)
            ipaddr = f"<IpEncrptV2>true</IpEncrptV2><LocalAddr>{encrypted_laddr}</LocalAddr>"
            auth = get_device_auth(self.username, key, nonce, self.randsalt, encrypted_laddr)
            
            aid = random.randbytes(8)
            
            # Send P2P channel request
            req = self._build_request(
                f"/device/{self.serial_number}/p2p-channel",
                f"<body>{auth}<Identify>{' '.join(f'{b:x}' for b in aid)}</Identify>{ipaddr}<version>5.0.0</version></body>"
            )
            self._send_udp(MAIN_SERVER, MAIN_PORT, req)
            
            # Step 6: Get agent server
            res = self._send_request(relay_server, relay_port, "/relay/agent")
            token = res["data"]["body"]["Token"]
            agent_server, agent_port = res["data"]["body"]["Agent"].split(":")
            agent_port = int(agent_port)
            logger.info(f"Agent server: {agent_server}:{agent_port}")
            
            # Step 7: Start relay
            res = self._send_request(
                agent_server, agent_port,
                f"/relay/start/{token}",
                "<body><Client>:0</Client></body>"
            )
            
            # Step 8: Get device response
            try:
                data = self._recv_udp(timeout=15)
                res = self._parse_response(data)
                
                if res["code"] < 200:
                    data = self._recv_udp(timeout=15)
                    res = self._parse_response(data)
                
                if res["code"] >= 400:
                    error_status = res.get('status', 'Unknown error')
                    logger.error(f"P2P channel error: {error_status}")
                    
                    # Check for specific error codes
                    if res["code"] == 403:
                        logger.error("Device requires authentication - check username/password")
                    
                    return False
                
                # Decrypt device local address
                device_nonce = int(res["data"]["body"].get("Nonce", nonce))
                device_laddr = res["data"]["body"]["LocalAddr"]
                try:
                    device_laddr = decrypt_data(key, device_nonce, device_laddr)
                except:
                    pass
                
                device_pub = res["data"]["body"]["PubAddr"]
                self.device_ip, self.device_port = device_pub.split(":")
                self.device_port = int(self.device_port)
                
                logger.info(f"Device: {self.device_ip}:{self.device_port}")
                
            except TimeoutError:
                logger.error("Timeout waiting for device response")
                return False
            
            # Step 9: Request relay channel
            relay_auth = get_device_auth(self.username, key, nonce, self.randsalt)
            req = self._build_request(
                f"/device/{self.serial_number}/relay-channel",
                f"<body>{relay_auth}<agentAddr>{agent_server}:{agent_port}</agentAddr></body>"
            )
            self._send_udp(MAIN_SERVER, MAIN_PORT, req)
            
            # Step 10: Read from agent
            try:
                data = self._recv_udp(timeout=10)
            except TimeoutError:
                pass
            
            # Step 11: PTCP handshake with agent
            self._send_ptcp(agent_server, agent_port, b"\x03\x01")
            res = self._recv_ptcp()
            
            self._send_ptcp(agent_server, agent_port, b"\x17")
            
            # Wait for sign
            res = self._recv_ptcp()
            while len(res.body) == 0:
                res = self._recv_ptcp()
            sign = res.body[12:] if len(res.body) > 12 else res.body
            
            self._send_ptcp(agent_server, agent_port)
            
            # Step 12: Connect to device directly
            aid_inv = bytes(0xFF - b for b in aid)
            cookie = random.randbytes(4)
            trans_id = random.randbytes(12)
            eaddr = self.device_port.to_bytes(2, 'big') + socket.inet_aton(self.device_ip)
            eaddr = bytes(0xFF - b for b in eaddr)
            
            data = (
                b"\xff\xfe\xff\xe7"
                + cookie
                + trans_id
                + b"\x7f\xd5\xff\xf7"
                + aid_inv
                + b"\xff\xfb\xff\xf7\xff\xfe"
                + eaddr
            )
            self._send_udp(self.device_ip, self.device_port, data)
            
            try:
                resp = self._recv_udp(timeout=5)
                rtrans_id = resp[8:20]
                
                # Parse device local address for response
                ip_parts = device_laddr.split(":")
                if len(ip_parts) == 2:
                    ip, port = ip_parts
                    port = int(port)
                else:
                    ip = self.device_ip
                    port = self.device_port
                
                eaddr = port.to_bytes(2, 'big') + socket.inet_aton(ip)
                
                data = (
                    b"\xfe\xfe\xff\xe7"
                    + cookie
                    + rtrans_id
                    + b"\x7f\xd6\xff\xf7"
                    + aid_inv
                    + b"\xff\xfb\xff\xf7\xff\xfe"
                    + eaddr
                )
                self._send_udp(self.device_ip, self.device_port, data)
                
                # Read responses
                for _ in range(5):
                    try:
                        self._recv_udp(timeout=2)
                    except TimeoutError:
                        break
                
            except TimeoutError:
                logger.warning("Direct connection timeout, using relay mode")
            
            # Step 13: Final PTCP handshake
            self.ptcp_sent = 0
            self.ptcp_recv = 0
            self.ptcp_count = 0
            self.ptcp_id = 0
            self.rmid = 0
            
            self._send_ptcp(self.device_ip, self.device_port, b"\x03\x01")
            res = self._recv_ptcp()
            
            if res.body != b"\x03\x01":
                logger.error("PTCP SYN failed")
                return False
            
            # Authentication
            self._send_ptcp(self.device_ip, self.device_port, b"\x19" + sign)
            res = self._recv_ptcp()
            if len(res.body) == 0:
                res = self._recv_ptcp()
            
            if len(res.body) == 0 or res.body[0] != 0x1A:
                logger.error("PTCP authentication failed")
                return False
            
            self._send_ptcp(self.device_ip, self.device_port, b"\x1b")
            res = self._recv_ptcp()
            
            self.connected = True
            logger.info(f"P2P connection established to {self.serial_number}")
            return True
            
        except Exception as e:
            logger.error(f"P2P connection failed: {e}")
            return False
    
    async def query_http(self, endpoint: str, timeout: float = 10) -> Optional[Dict[str, Any]]:
        """Query device via HTTP through P2P tunnel"""
        if not self.connected:
            return None
        
        try:
            realm_id = random.randint(0x00000000, 0xFFFFFFFF)
            
            # Request port binding
            self._send_ptcp(
                self.device_ip, self.device_port,
                b"\x11" + realm_id.to_bytes(4, "big") + b"\x00\x50\x7f\x01"  # Port 80
            )
            
            res = self._recv_ptcp()
            if len(res.body) == 0:
                res = self._recv_ptcp()
            
            if res.body[0] != 0x12:
                return None
            
            # Build Dahua Digest authentication
            # First request to get realm and nonce
            http_req = (
                f"GET {endpoint} HTTP/1.1\r\n"
                f"Host: 127.0.0.1\r\n"
                f"Connection: close\r\n\r\n"
            ).encode()
            
            self._send_ptcp(
                self.device_ip, self.device_port,
                bytes(PTCPPayload(realm_id, http_req))
            )
            
            # Read response
            response_data = b""
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    res = self._recv_ptcp()
                    
                    if len(res.body) == 0:
                        continue
                    
                    self._send_ptcp(self.device_ip, self.device_port)
                    
                    if res.body[0] == 0x10:
                        payload = PTCPPayload.parse(res.body)
                        response_data += payload.payload
                        
                        if b"\r\n\r\n" in response_data:
                            break
                    
                except TimeoutError:
                    break
            
            # Handle 401 - need digest auth
            if b"401" in response_data and b"WWW-Authenticate" in response_data:
                # Parse realm and nonce from response
                auth_header = ""
                for line in response_data.decode(errors='ignore').split("\r\n"):
                    if "WWW-Authenticate" in line:
                        auth_header = line
                        break
                
                # Extract realm and nonce
                realm = ""
                auth_nonce = ""
                if 'realm="' in auth_header:
                    realm = auth_header.split('realm="')[1].split('"')[0]
                if 'nonce="' in auth_header:
                    auth_nonce = auth_header.split('nonce="')[1].split('"')[0]
                
                if realm and auth_nonce:
                    # Calculate digest response
                    ha1 = hashlib.md5(f"{self.username}:{realm}:{self.password}".encode()).hexdigest()
                    ha2 = hashlib.md5(f"GET:{endpoint}".encode()).hexdigest()
                    response = hashlib.md5(f"{ha1}:{auth_nonce}:{ha2}".encode()).hexdigest()
                    
                    # Send authenticated request
                    auth_http_req = (
                        f"GET {endpoint} HTTP/1.1\r\n"
                        f"Host: 127.0.0.1\r\n"
                        f'Authorization: Digest username="{self.username}", realm="{realm}", '
                        f'nonce="{auth_nonce}", uri="{endpoint}", response="{response}"\r\n'
                        f"Connection: close\r\n\r\n"
                    ).encode()
                    
                    self._send_ptcp(
                        self.device_ip, self.device_port,
                        bytes(PTCPPayload(realm_id, auth_http_req))
                    )
                    
                    # Read authenticated response
                    response_data = b""
                    start_time = time.time()
                    
                    while time.time() - start_time < timeout:
                        try:
                            res = self._recv_ptcp()
                            
                            if len(res.body) == 0:
                                continue
                            
                            self._send_ptcp(self.device_ip, self.device_port)
                            
                            if res.body[0] == 0x10:
                                payload = PTCPPayload.parse(res.body)
                                response_data += payload.payload
                                
                                if b"\r\n\r\n" in response_data:
                                    break
                            
                        except TimeoutError:
                            break
            
            # Close connection
            self._send_ptcp(
                self.device_ip, self.device_port,
                b"\x12" + realm_id.to_bytes(4, "big") + b"DISC"
            )
            
            if response_data:
                return {"success": True, "data": response_data.decode(errors='ignore')}
            
            return {"success": False, "error": "No response"}
            
        except Exception as e:
            logger.error(f"HTTP query failed: {e}")
            return {"success": False, "error": str(e)}
    
    def close(self):
        """Close P2P connection"""
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
        self.connected = False
        logger.info(f"P2P connection closed for {self.serial_number}")


async def check_device_p2p(serial_number: str, username: str, password: str) -> Dict[str, Any]:
    """
    Check a Dahua device via P2P connection.
    Returns device status including online state, storage, and recording info.
    """
    result = {
        "serial_number": serial_number,
        "online": False,
        "device_type": None,
        "storage": None,
        "recording": None,
        "hdd_health": None,
        "error": None
    }
    
    conn = DahuaP2PConnection(serial_number, username, password)
    
    try:
        connected = await conn.connect()
        
        if not connected:
            result["error"] = "No se pudo establecer conexión P2P"
            return result
        
        result["online"] = True
        
        # Get device type
        resp = await conn.query_http("/cgi-bin/magicBox.cgi?action=getDeviceType")
        if resp and resp.get("success"):
            data = resp.get("data", "")
            # Parse response - look for devicetype=VALUE
            for line in data.split('\n'):
                if 'type=' in line.lower():
                    result["device_type"] = line.split('=', 1)[1].strip()
                    break
        
        # Get storage info
        resp = await conn.query_http("/cgi-bin/configManager.cgi?action=getConfig&name=StorageGlobal")
        if resp and resp.get("success"):
            data = resp.get("data", "")
            total_gb = 0
            free_gb = 0
            
            for line in data.split('\n'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    value = value.strip()
                    
                    if 'TotalSpace' in key or 'TotalBytes' in key:
                        try:
                            total_gb += int(value) / (1024**3)
                        except ValueError:
                            pass
                    elif 'FreeSpace' in key or 'FreeBytes' in key:
                        try:
                            free_gb += int(value) / (1024**3)
                        except ValueError:
                            pass
            
            if total_gb > 0:
                used_percent = round(((total_gb - free_gb) / total_gb) * 100, 1)
                result["storage"] = {
                    "total_size_gb": round(total_gb, 2),
                    "free_size_gb": round(free_gb, 2),
                    "used_percent": used_percent
                }
        
        # Get recording status
        resp = await conn.query_http("/cgi-bin/configManager.cgi?action=getConfig&name=RecordMode")
        if resp and resp.get("success"):
            data = resp.get("data", "")
            channels_recording = 0
            
            for line in data.split('\n'):
                if '=' in line and 'Mode' in line:
                    key, value = line.split('=', 1)
                    try:
                        mode = int(value.strip())
                        if mode > 0:
                            channels_recording += 1
                    except ValueError:
                        pass
            
            result["recording"] = {
                "recording_active": channels_recording > 0,
                "channels_recording": channels_recording
            }
        
        # Get HDD health
        resp = await conn.query_http("/cgi-bin/configManager.cgi?action=getConfig&name=StorageInfo")
        if resp and resp.get("success"):
            data = resp.get("data", "")
            all_healthy = True
            
            for line in data.split('\n'):
                if '=' in line and ('State' in line or 'Status' in line):
                    key, value = line.split('=', 1)
                    status = value.strip().lower()
                    if status not in ['normal', 'ok', '0', 'good']:
                        all_healthy = False
                        break
            
            result["hdd_health"] = {
                "all_healthy": all_healthy
            }
        
    except Exception as e:
        result["error"] = str(e)
        logger.error(f"Error checking device {serial_number}: {e}")
    
    finally:
        conn.close()
    
    return result
