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
import json
import random
import re
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
    """
    try:
        cipher_text = base64.b64decode(info_data)
        
        cipher = Cipher(
            algorithms.AES(INFO_DECRYPT_KEY),
            modes.OFB(INFO_DECRYPT_IV),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(cipher_text) + decryptor.finalize()
        
        try:
            decrypted_str = decrypted.decode('utf-8', errors='ignore').rstrip('\x00')
            json_start = decrypted_str.find('{')
            json_end = decrypted_str.rfind('}')
            if json_start >= 0 and json_end > json_start:
                json_str = decrypted_str[json_start:json_end+1]
                return json.loads(json_str)
        except:
            pass
        
        # Look for hex pattern
        decrypted_str = decrypted.decode('utf-8', errors='ignore')
        hex_pattern = re.findall(r'[a-f0-9]{32}', decrypted_str)
        if hex_pattern:
            return {"randsalt": hex_pattern[0]}
        
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
        length &= 0xFFFF
        data = data[12:]
        
        return cls(realm, data[:length])


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
    
    @classmethod
    def parse(cls, data: bytes) -> "PTCP":
        if len(data) < 24:
            raise ValueError("Packet is too short")
        
        header, body = data[:24], data[24:]
        magic, rlid, llid, pid, lmid, rmid = unpack("!4sLLLLL", header)
        
        if magic != b"PTCP":
            raise ValueError("Invalid magic")
        
        return cls(rlid, llid, pid, lmid, rmid, body)


class UDPRemote:
    """UDP socket wrapper for P2P protocol"""
    
    def __init__(self, host: str, port: int, debug: bool = False):
        self.rhost = host
        self.rport = port
        self.debug = debug
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind(("0.0.0.0", 0))
        self.socket.settimeout(10)
        self.lport = self.socket.getsockname()[1]
        
        # PTCP state
        self.ptcp_sent = 0
        self.ptcp_recv = 0
        self.ptcp_count = 0
        self.ptcp_id = 0
        self.rmid = 0
        self.cseq = 0
    
    def send(self, data: bytes):
        """Send data to remote"""
        self.socket.sendto(data, (self.rhost, self.rport))
    
    def recv(self, timeout: float = 10) -> bytes:
        """Receive data from remote"""
        self.socket.settimeout(timeout)
        data, addr = self.socket.recvfrom(4096)
        return data
    
    def _build_request(self, path: str, body: str = "", auth: bool = True) -> bytes:
        """Build HTTP-like request for P2P protocol"""
        self.cseq += 1
        
        nonce = random.randrange(2**31)
        curdate = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
        hash_digest = hashlib.sha1()
        hash_digest.update(pwd.encode())
        digest = base64.b64encode(hash_digest.digest()).decode()
        
        req = f"{'DHPOST' if body else 'DHGET'} {path} HTTP/1.1\r\n"
        req += f"CSeq: {self.cseq}\r\n"
        
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
    
    def request(self, path: str, body: str = "", should_read: bool = True, return_error: bool = False) -> Dict[str, Any]:
        """Send request and get response"""
        req = self._build_request(path, body)
        self.send(req)
        
        if not should_read:
            return {}
        
        data = self.recv()
        return self._parse_response(data)
    
    def read(self, return_error: bool = False) -> Dict[str, Any]:
        """Read response"""
        data = self.recv()
        return self._parse_response(data)
    
    def request_ptcp(self, body: bytes = b""):
        """Send PTCP packet"""
        # Ensure SYN packet has correct format
        if body == b"\x03\x01":
            body = b"\x00\x03\x01\x00"  # Correct SYN format
        
        ptcp = PTCP(
            self.ptcp_sent,
            self.ptcp_recv,
            0x0002FFFF if body == b"\x00\x03\x01\x00" else 0x0000FFFF - self.ptcp_count,
            self.ptcp_id,
            self.rmid,
            body,
        )
        
        self.ptcp_sent += len(ptcp.body)
        self.ptcp_id += 1
        if len(ptcp.body) > 0 and body != b"\x00\x03\x01\x00":
            self.ptcp_count += 1
        
        self.send(bytes(ptcp))
    
    def read_ptcp(self, timeout: float = 10) -> PTCP:
        """Receive PTCP packet"""
        data = self.recv(timeout)
        res = PTCP.parse(data)
        self.ptcp_recv += len(res.body)
        self.rmid = res.lmid
        return res
    
    def reset_ptcp(self):
        """Reset PTCP state"""
        self.ptcp_sent = 0
        self.ptcp_recv = 0
        self.ptcp_count = 0
        self.ptcp_id = 0
        self.rmid = 0
    
    def close(self):
        """Close socket"""
        self.socket.close()
    
    def fileno(self):
        """Return socket file descriptor for select"""
        return self.socket.fileno()


class DahuaP2PConnection:
    """Manages a P2P connection to a Dahua device"""
    
    def __init__(self, serial_number: str, username: str, password: str):
        self.serial_number = serial_number
        self.username = username
        self.password = password
        self.main_remote: Optional[UDPRemote] = None
        self.device_remote: Optional[UDPRemote] = None
        self.active_remote: Optional[UDPRemote] = None  # Used for queries after connection
        self.connected: bool = False
        
        # Authentication
        self.randsalt = DEFAULT_RANDSALT
        self.key: Optional[bytes] = None
        self.nonce: int = 0
    
    def _get_device_randsalt(self, p2psrv_server: str, p2psrv_port: int) -> Optional[str]:
        """Try to get randsalt from device info endpoint"""
        info_remote = UDPRemote(p2psrv_server, p2psrv_port)
        try:
            res = info_remote.request(f"/info/device/{self.serial_number}")
            if res["code"] == 200 and res.get("data"):
                body = res["data"].get("body", {})
                
                if "RandSalt" in body and body["RandSalt"]:
                    logger.info(f"Found RandSalt directly")
                    return body["RandSalt"]
                
                if "Info" in body and body["Info"]:
                    logger.info(f"Decrypting Info field...")
                    decrypted = decrypt_device_info(body["Info"])
                    if decrypted:
                        logger.info(f"Decrypted: {decrypted}")
                        for key in ["randsalt", "RandSalt"]:
                            if key in decrypted:
                                return decrypted[key]
            return None
        except Exception as e:
            logger.warning(f"Could not get device randsalt: {e}")
            return None
        finally:
            info_remote.close()
    
    async def connect(self) -> bool:
        """Establish P2P connection to device"""
        try:
            logger.info(f"Starting P2P connection for {self.serial_number}")
            
            # Create main remote connection
            self.main_remote = UDPRemote(MAIN_SERVER, MAIN_PORT)
            
            # Step 1: Probe P2P server
            res = self.main_remote.request("/probe/p2psrv")
            
            # Step 2: Get P2P server for device
            res = self.main_remote.request(f"/online/p2psrv/{self.serial_number}")
            if res["code"] >= 400:
                logger.error(f"Device not found: {res['status']}")
                return False
            
            p2psrv_info = res["data"]["body"]["US"]
            p2psrv_server, p2psrv_port = p2psrv_info.split(":")
            p2psrv_port = int(p2psrv_port)
            logger.info(f"P2P server: {p2psrv_server}:{p2psrv_port}")
            
            # Step 3: Probe device
            p2psrv_remote = UDPRemote(p2psrv_server, p2psrv_port)
            res = p2psrv_remote.request(f"/probe/device/{self.serial_number}")
            
            # Try to get randsalt
            device_randsalt = self._get_device_randsalt(p2psrv_server, p2psrv_port)
            if device_randsalt:
                self.randsalt = device_randsalt
                logger.info(f"Using device randsalt: {self.randsalt[:8]}...")
            
            p2psrv_remote.close()
            
            # Step 4: Get relay server
            res = self.main_remote.request("/online/relay")
            relay_server, relay_port = res["data"]["body"]["Address"].split(":")
            relay_port = int(relay_port)
            logger.info(f"Relay server: {relay_server}:{relay_port}")
            
            # Create device remote connection
            self.device_remote = UDPRemote(MAIN_SERVER, MAIN_PORT)
            
            # Step 5: Prepare authentication
            self.key = get_auth_key(self.username, self.password, self.randsalt)
            self.nonce = get_nonce()
            
            laddr = f"127.0.0.1:{self.device_remote.lport}"
            encrypted_laddr = encrypt_data(self.key, self.nonce, laddr)
            ipaddr = f"<IpEncrptV2>true</IpEncrptV2><LocalAddr>{encrypted_laddr}</LocalAddr>"
            auth = get_device_auth(self.username, self.key, self.nonce, self.randsalt, encrypted_laddr)
            
            aid = random.randbytes(8)
            
            # Step 6: Request P2P channel
            res = self.device_remote.request(
                f"/device/{self.serial_number}/p2p-channel",
                f"<body>{auth}<Identify>{' '.join(f'{b:x}' for b in aid)}</Identify>{ipaddr}<version>5.0.0</version></body>",
                should_read=False
            )
            
            # Step 7: Get agent
            self.main_remote.rhost = relay_server
            self.main_remote.rport = relay_port
            res = self.main_remote.request("/relay/agent")
            token = res["data"]["body"]["Token"]
            agent_server, agent_port = res["data"]["body"]["Agent"].split(":")
            agent_port = int(agent_port)
            logger.info(f"Agent server: {agent_server}:{agent_port}")
            
            # Step 8: Start relay
            self.main_remote.rhost = agent_server
            self.main_remote.rport = agent_port
            res = self.main_remote.request(
                f"/relay/start/{token}",
                "<body><Client>:0</Client></body>"
            )
            
            # Step 9: Get device response
            res = self.device_remote.read(return_error=True)
            if res["code"] < 200:
                res = self.device_remote.read(return_error=True)
            
            if res["code"] >= 400:
                logger.error(f"P2P channel error: {res['status']}")
                return False
            
            # Decrypt device local address
            device_nonce = int(res["data"]["body"].get("Nonce", self.nonce))
            device_laddr = res["data"]["body"]["LocalAddr"]
            try:
                device_laddr = decrypt_data(self.key, device_nonce, device_laddr)
            except:
                pass
            
            device_pub = res["data"]["body"]["PubAddr"]
            device_server, device_port = device_pub.split(":")
            device_port = int(device_port)
            
            self.device_remote.rhost = device_server
            self.device_remote.rport = device_port
            
            logger.info(f"Device: {device_server}:{device_port}")
            
            # Step 10: Request relay channel
            relay_auth = get_device_auth(self.username, self.key, self.nonce, self.randsalt)
            
            # Send relay-channel request back to main server (no read)
            self.main_remote.rhost = MAIN_SERVER
            self.main_remote.rport = MAIN_PORT
            
            logger.debug(f"Sending relay-channel request to {MAIN_SERVER}:{MAIN_PORT}")
            res = self.main_remote.request(
                f"/device/{self.serial_number}/relay-channel",
                f"<body>{relay_auth}<agentAddr>{agent_server}:{agent_port}</agentAddr></body>",
                should_read=False
            )
            
            # Step 11: Agent PTCP handshake
            # Switch main_remote to agent for PTCP communication
            self.main_remote.rhost = agent_server
            self.main_remote.rport = agent_port
            logger.debug(f"Switched to agent: {agent_server}:{agent_port}")
            
            # Read initial response from agent (response to relay-channel)
            # This may timeout - that's acceptable
            try:
                self.main_remote.socket.settimeout(3)
                data = self.main_remote.recv(timeout=3)
                res = self.main_remote._parse_response(data)
                logger.info(f"Agent relay response received: {res.get('code', 'N/A')}")
            except (socket.timeout, TimeoutError):
                logger.debug("No initial relay response from agent (expected for some devices)")
            except Exception as e:
                logger.debug(f"Error reading from agent: {type(e).__name__}: {e}")
            
            # Reset PTCP state
            self.main_remote.reset_ptcp()
            self.main_remote.socket.settimeout(15)
            logger.debug(f"Sending PTCP SYN to agent from port {self.main_remote.lport}")
            
            # PTCP handshake with agent
            logger.debug(f"Sending PTCP SYN to {self.main_remote.rhost}:{self.main_remote.rport}")
            self.main_remote.request_ptcp(b"\x03\x01")
            logger.debug("PTCP SYN sent, waiting for response...")
            try:
                res = self.main_remote.read_ptcp(timeout=15)
                logger.debug(f"PTCP SYN-ACK received: {res.body.hex() if res.body else 'empty'}")
            except socket.timeout:
                logger.error(f"Timeout waiting for PTCP SYN-ACK from agent at {self.main_remote.rhost}:{self.main_remote.rport}")
                return False
            
            self.main_remote.request_ptcp(b"\x17" + b"\x00" * 11)
            
            # Wait for sign from agent - may need multiple reads
            sign = None
            for _ in range(10):
                try:
                    res = self.main_remote.read_ptcp(timeout=5)
                except socket.timeout:
                    break
                
                if len(res.body) > 0:
                    # Check for sign packet type (0x18)
                    if res.body[0] == 0x18 and len(res.body) > 12:
                        sign = res.body[12:]
                        logger.info(f"Got sign (type 0x18): {sign.hex()}")
                        break
                    elif res.body[0] != 0x00:  # Not a SYN packet
                        sign = res.body[12:] if len(res.body) > 12 else res.body
                        logger.info(f"Got sign: {sign.hex()}")
                        break
            
            if not sign:
                logger.error("No sign received from agent")
                return False
            
            # Send ACK
            self.main_remote.request_ptcp()
            
            # Step 12: Connect to device (hole punching)
            aid_inv = bytes(0xFF - b for b in aid)
            cookie = random.randbytes(4)
            trans_id = random.randbytes(12)
            eaddr = device_port.to_bytes(2, 'big') + socket.inet_aton(device_server)
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
            self.device_remote.send(data)
            
            use_relay = False
            try:
                resp = self.device_remote.recv(timeout=5)
                rtrans_id = resp[8:20]
                
                ip_parts = device_laddr.split(":")
                if len(ip_parts) == 2:
                    ip, port = ip_parts
                    port = int(port)
                else:
                    ip = device_server
                    port = device_port
                
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
                self.device_remote.send(data)
                
                # Additional packets for authenticated connections
                try:
                    resp = self.device_remote.recv(timeout=2)
                    
                    data = (
                        b"\xfe\xfe\xff\xf3"
                        + cookie
                        + rtrans_id
                        + b"\x7f\xd6\xff\xf7"
                        + aid_inv
                        + b"\xff\xfb\xff\xf7\xff\xfe"
                        + b"\xa8\x13\x3f\x57\xfe\x37"
                    )
                    
                    for _ in range(5):
                        self.device_remote.send(data)
                except:
                    pass
                
                # Read remaining packets
                for _ in range(5):
                    try:
                        self.device_remote.recv(timeout=1)
                    except:
                        break
                
                logger.info("Direct P2P connection established")
                use_relay = False
                
            except socket.timeout:
                logger.info("Direct connection timeout, using relay mode")
                use_relay = True
            
            # Step 13: PTCP handshake with device (through agent in relay mode)
            if use_relay:
                # In relay mode, all communication goes through the agent
                # The device_remote socket is already configured for the device address
                # But packets actually go through the agent's relay tunnel
                
                # We need to send to agent, not device directly
                # The agent will forward packets to the device
                target_remote = self.main_remote  # Use agent connection
                logger.info(f"Using relay mode via agent: {agent_server}:{agent_port}")
                
                # Flush old packets from agent socket
                for _ in range(5):
                    try:
                        self.main_remote.socket.settimeout(0.3)
                        self.main_remote.recv(timeout=0.3)
                    except:
                        break
                
                # In relay mode, we don't need another PTCP SYN - we're already connected to agent
                # We can proceed directly to authentication with the device through the tunnel
                
            else:
                target_remote = self.device_remote
                
                # Direct mode: PTCP handshake with device
                target_remote.reset_ptcp()
                
                target_remote.request_ptcp(b"\x03\x01")
                try:
                    res = target_remote.read_ptcp(timeout=10)
                except socket.timeout:
                    logger.error("PTCP SYN timeout with device")
                    return False
                
                if res.body != b"\x00\x03\x01\x00":
                    logger.error(f"PTCP SYN failed: {res.body.hex() if res.body else 'empty'}")
                    return False
            
            logger.debug("PTCP SYN-ACK received")
            
            # Send auth with sign
            target_remote.request_ptcp(b"\x19" + sign)
            
            # Read auth response - may need multiple reads
            for _ in range(5):
                try:
                    res = target_remote.read_ptcp(timeout=5)
                except socket.timeout:
                    break
                if len(res.body) > 0 and res.body[0] == 0x1A:
                    break
            
            if len(res.body) == 0 or res.body[0] != 0x1A:
                logger.error(f"PTCP auth failed: {res.body.hex() if res.body else 'empty'}")
                return False
            
            logger.debug("PTCP auth successful")
            
            # Final handshake
            target_remote.request_ptcp(b"\x1b")
            try:
                res = target_remote.read_ptcp(timeout=5)
            except socket.timeout:
                pass  # OK if no response
            
            # Store the active remote for HTTP queries
            self.active_remote = target_remote
            self.connected = True
            mode = "relay" if use_relay else "direct"
            logger.info(f"P2P connection established to {self.serial_number} ({mode} mode)")
            return True
            
        except Exception as e:
            logger.error(f"P2P connection failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def query_http(self, endpoint: str, timeout: float = 10) -> Optional[Dict[str, Any]]:
        """Query device via HTTP through P2P tunnel"""
        if not self.connected or not self.active_remote:
            return None
        
        try:
            realm_id = random.randint(0x00000000, 0xFFFFFFFF)
            
            # Request port binding (port 80)
            self.active_remote.request_ptcp(
                b"\x11" + realm_id.to_bytes(4, "big") + b"\x00\x50\x7f\x01"
            )
            
            res = self.active_remote.read_ptcp()
            if len(res.body) == 0:
                res = self.active_remote.read_ptcp()
            
            if len(res.body) == 0 or res.body[0] != 0x12:
                return None
            
            # Send HTTP request
            http_req = (
                f"GET {endpoint} HTTP/1.1\r\n"
                f"Host: 127.0.0.1\r\n"
                f"Connection: close\r\n\r\n"
            ).encode()
            
            self.active_remote.request_ptcp(bytes(PTCPPayload(realm_id, http_req)))
            
            # Read response
            response_data = b""
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    res = self.active_remote.read_ptcp(timeout=2)
                    
                    if len(res.body) == 0:
                        continue
                    
                    self.active_remote.request_ptcp()
                    
                    if res.body[0] == 0x10:
                        payload = PTCPPayload.parse(res.body)
                        response_data += payload.payload
                        
                        if b"\r\n\r\n" in response_data:
                            # Check if we have Content-Length
                            header_end = response_data.find(b"\r\n\r\n")
                            headers = response_data[:header_end].decode(errors='ignore')
                            
                            if "Content-Length:" in headers:
                                for line in headers.split("\r\n"):
                                    if "Content-Length:" in line:
                                        content_len = int(line.split(":")[1].strip())
                                        body_start = header_end + 4
                                        if len(response_data) >= body_start + content_len:
                                            break
                            else:
                                break
                    
                except socket.timeout:
                    if response_data:
                        break
            
            # Handle 401 - need digest auth
            if b"401" in response_data and b"WWW-Authenticate" in response_data:
                auth_header = ""
                for line in response_data.decode(errors='ignore').split("\r\n"):
                    if "WWW-Authenticate" in line:
                        auth_header = line
                        break
                
                realm = ""
                auth_nonce = ""
                if 'realm="' in auth_header:
                    realm = auth_header.split('realm="')[1].split('"')[0]
                if 'nonce="' in auth_header:
                    auth_nonce = auth_header.split('nonce="')[1].split('"')[0]
                
                if realm and auth_nonce:
                    ha1 = hashlib.md5(f"{self.username}:{realm}:{self.password}".encode()).hexdigest()
                    ha2 = hashlib.md5(f"GET:{endpoint}".encode()).hexdigest()
                    response = hashlib.md5(f"{ha1}:{auth_nonce}:{ha2}".encode()).hexdigest()
                    
                    auth_http_req = (
                        f"GET {endpoint} HTTP/1.1\r\n"
                        f"Host: 127.0.0.1\r\n"
                        f'Authorization: Digest username="{self.username}", realm="{realm}", '
                        f'nonce="{auth_nonce}", uri="{endpoint}", response="{response}"\r\n'
                        f"Connection: close\r\n\r\n"
                    ).encode()
                    
                    self.active_remote.request_ptcp(bytes(PTCPPayload(realm_id, auth_http_req)))
                    
                    response_data = b""
                    start_time = time.time()
                    
                    while time.time() - start_time < timeout:
                        try:
                            res = self.active_remote.read_ptcp(timeout=2)
                            
                            if len(res.body) == 0:
                                continue
                            
                            self.active_remote.request_ptcp()
                            
                            if res.body[0] == 0x10:
                                payload = PTCPPayload.parse(res.body)
                                response_data += payload.payload
                                
                                if b"\r\n\r\n" in response_data:
                                    break
                            
                        except socket.timeout:
                            if response_data:
                                break
            
            # Close connection
            self.active_remote.request_ptcp(
                b"\x12" + realm_id.to_bytes(4, "big") + b"DISC"
            )
            
            try:
                res = self.active_remote.read_ptcp(timeout=2)
            except:
                pass
            
            if response_data:
                return {"success": True, "data": response_data.decode(errors='ignore')}
            
            return {"success": False, "error": "No response"}
            
        except Exception as e:
            logger.error(f"HTTP query failed: {e}")
            return {"success": False, "error": str(e)}
    
    def close(self):
        """Close P2P connection"""
        if self.main_remote:
            self.main_remote.close()
        if self.device_remote:
            self.device_remote.close()
        self.connected = False
        logger.info(f"P2P connection closed for {self.serial_number}")


async def _get_device_cloud_info(serial_number: str) -> Dict[str, Any]:
    """
    Get device cloud registration info and firmware version.
    This is a lightweight check that works even when P2P tunnel fails.
    """
    import datetime as dt
    
    result = {
        "registered": False,
        "firmware_version": None,
        "p2p_server": None
    }
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(10)
    sock.bind(("0.0.0.0", 0))
    
    try:
        # Check cloud registration
        nonce = random.randrange(2**31)
        curdate = dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
        hash_digest = hashlib.sha1()
        hash_digest.update(pwd.encode())
        digest = base64.b64encode(hash_digest.digest()).decode()
        
        req = f"DHGET /online/p2psrv/{serial_number} HTTP/1.1\r\n"
        req += f"CSeq: 1\r\n"
        req += f'Authorization: WSSE profile="UsernameToken"\r\n'
        req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
        req += "\r\n"
        
        sock.sendto(req.encode(), (MAIN_SERVER, MAIN_PORT))
        data, addr = sock.recvfrom(4096)
        response = data.decode()
        
        if "200 OK" not in response:
            return result
        
        result["registered"] = True
        
        # Parse P2P server info
        if "<US>" in response:
            p2psrv_info = response.split("<US>")[1].split("</US>")[0]
            result["p2p_server"] = p2psrv_info
            p2psrv_server, p2psrv_port = p2psrv_info.split(":")
            p2psrv_port = int(p2psrv_port)
            
            # Get device info (firmware version)
            sock2 = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock2.settimeout(10)
            sock2.bind(("0.0.0.0", 0))
            
            nonce = random.randrange(2**31)
            curdate = dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
            hash_digest = hashlib.sha1()
            hash_digest.update(pwd.encode())
            digest = base64.b64encode(hash_digest.digest()).decode()
            
            req = f"DHGET /info/device/{serial_number} HTTP/1.1\r\n"
            req += f"CSeq: 2\r\n"
            req += f'Authorization: WSSE profile="UsernameToken"\r\n'
            req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
            req += "\r\n"
            
            sock2.sendto(req.encode(), (p2psrv_server, p2psrv_port))
            
            try:
                data, addr = sock2.recvfrom(4096)
                response = data.decode()
                
                if "<DevVersion>" in response:
                    fw_version = response.split("<DevVersion>")[1].split("</DevVersion>")[0]
                    result["firmware_version"] = fw_version
            except:
                pass
            finally:
                sock2.close()
    
    except Exception as e:
        logger.warning(f"Error getting cloud info for {serial_number}: {e}")
    finally:
        sock.close()
    
    return result


async def check_device_p2p(serial_number: str, username: str, password: str) -> Dict[str, Any]:
    """
    Check a Dahua device via P2P connection.
    Returns device status including online state, storage, and recording info.
    Also returns cloud registration status and firmware version even if P2P fails.
    """
    result = {
        "serial_number": serial_number,
        "online": False,
        "cloud_registered": False,
        "firmware_version": None,
        "device_type": None,
        "storage": None,
        "recording": None,
        "hdd_health": None,
        "error": None
    }
    
    # First, try to get cloud registration and device info (this always works)
    try:
        cloud_info = await _get_device_cloud_info(serial_number)
        result["cloud_registered"] = cloud_info.get("registered", False)
        result["firmware_version"] = cloud_info.get("firmware_version")
        
        if not result["cloud_registered"]:
            result["error"] = "Dispositivo no registrado en Easy4IP Cloud"
            return result
    except Exception as e:
        logger.warning(f"Could not get cloud info for {serial_number}: {e}")
    
    # Now try full P2P connection
    conn = DahuaP2PConnection(serial_number, username, password)
    
    try:
        connected = await conn.connect()
        
        if not connected:
            # Device is in cloud but P2P connection failed
            result["error"] = "Registrado en nube pero no se pudo establecer conexión P2P (posible restricción de red)"
            return result
        
        result["online"] = True
        result["error"] = None  # Clear any previous error
        
        # Get device type
        resp = await conn.query_http("/cgi-bin/magicBox.cgi?action=getDeviceType")
        if resp and resp.get("success"):
            data = resp.get("data", "")
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
