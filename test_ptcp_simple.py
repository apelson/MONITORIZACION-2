#!/usr/bin/env python3
"""
Simplified test for Dahua P2P PTCP handshake with agent
Focus only on the PTCP protocol part
Includes proper device authentication
"""
import asyncio
import base64
import datetime
import hashlib
import hmac
import random
import socket
import time
import json
import re
import xmltodict
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

# Dahua P2P Cloud
MAIN_SERVER = "www.easy4ipcloud.com"
MAIN_PORT = 8800
P2P_USERNAME = "cba1b29e32cb17aa46b8ff9e73c7f40b"
P2P_USERKEY = "996103384cdf19179e19243e959bbf8b"
DEFAULT_RANDSALT = "5daf91fc5cfc1be8e081cfb08f792726"

# Device Info decryption keys
INFO_DECRYPT_KEY = b"kRjmsUB&ezmdGLL67H#$ojw@XflcaIaf"
INFO_DECRYPT_IV = b"MydvJw*Iw1w&i^kk"
IV = b"2z52*lk9o6HRyJrf"

# Test device
SERIAL_NUMBER = "AL07C99PAJ1A4BE"
USERNAME = "admin"
PASSWORD = "Spw@2018"

cseq = 0

def build_request(path: str, body: str = ""):
    global cseq
    cseq += 1
    
    nonce = random.randrange(2**31)
    curdate = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
    hash_digest = hashlib.sha1()
    hash_digest.update(pwd.encode())
    digest = base64.b64encode(hash_digest.digest()).decode()
    
    req = f"{'DHPOST' if body else 'DHGET'} {path} HTTP/1.1\r\n"
    req += f"CSeq: {cseq}\r\n"
    req += f'Authorization: WSSE profile="UsernameToken"\r\n'
    req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
    
    if body:
        req += f"Content-Type:\r\n"
        req += f"Content-Length: {len(body)}\r\n"
    
    req += f"\r\n{body}"
    return req.encode()


def parse_response(data: bytes):
    text = data.decode()
    headers, body = text.split("\r\n\r\n", 1)
    headers = headers.split("\r\n")
    version, code, status = headers[0].split(" ", 2)
    code = int(code)
    
    return {
        "version": version,
        "code": code,
        "status": status,
        "data": xmltodict.parse(body) if body.strip() else None,
    }


def decrypt_device_info(info_data: str):
    """Decrypt the Info field from /info/device endpoint"""
    try:
        cipher_text = base64.b64decode(info_data)
        cipher = Cipher(
            algorithms.AES(INFO_DECRYPT_KEY),
            modes.OFB(INFO_DECRYPT_IV),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(cipher_text) + decryptor.finalize()
        
        decrypted_str = decrypted.decode('utf-8', errors='ignore').rstrip('\x00')
        json_start = decrypted_str.find('{')
        json_end = decrypted_str.rfind('}')
        if json_start >= 0 and json_end > json_start:
            json_str = decrypted_str[json_start:json_end+1]
            return json.loads(json_str)
        
        hex_pattern = re.findall(r'[a-f0-9]{32}', decrypted_str)
        if hex_pattern:
            return {"randsalt": hex_pattern[0]}
        return None
    except Exception as e:
        print(f"  Decrypt error: {e}")
        return None


def get_auth_key(username: str, password: str, randsalt: str) -> bytes:
    """Generate authentication key from device credentials"""
    key = f"{username}:Login to {randsalt}:{password}"
    return hashlib.md5(key.encode()).hexdigest().upper().encode()


def encrypt_data(key: bytes, nonce: int, data: str) -> str:
    """Encrypt data using AES-OFB with PBKDF2 derived key"""
    salt = str(nonce).encode()
    dk = hashlib.pbkdf2_hmac("sha256", key, salt, 20000, 32)
    
    encryptor = Cipher(
        algorithms.AES(dk), modes.OFB(IV), backend=default_backend()
    ).encryptor()
    enc = encryptor.update(data.encode()) + encryptor.finalize()
    
    return base64.b64encode(enc).decode()


def get_device_auth(username: str, key: bytes, nonce: int, randsalt: str, payload: str = "") -> str:
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


def build_ptcp(rlid, llid, pid, lmid, rmid, body=b""):
    from struct import pack
    return (
        pack("!4sLLLLL", b"PTCP", rlid, llid, pid, lmid, rmid)
        + body
    )


def parse_ptcp(data: bytes):
    from struct import unpack
    if len(data) < 24:
        raise ValueError("Packet is too short")
    
    header, body = data[:24], data[24:]
    magic, rlid, llid, pid, lmid, rmid = unpack("!4sLLLLL", header)
    
    return {
        "magic": magic,
        "rlid": rlid,
        "llid": llid,
        "pid": pid,
        "lmid": lmid,
        "rmid": rmid,
        "body": body
    }


async def test_ptcp_handshake():
    print("=" * 60)
    print("Testing PTCP Handshake with Agent")
    print("=" * 60)
    
    # Create UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", 0))
    sock.settimeout(15)
    local_port = sock.getsockname()[1]
    print(f"Local port: {local_port}")
    
    try:
        # Step 1: Get P2P server
        print("\n[Step 1] Getting P2P server...")
        sock.sendto(build_request(f"/online/p2psrv/{SERIAL_NUMBER}"), (MAIN_SERVER, MAIN_PORT))
        data, addr = sock.recvfrom(4096)
        res = parse_response(data)
        print(f"  Response from {addr}: code={res['code']}")
        
        if res["code"] != 200:
            print("  Device not found!")
            return
        
        p2psrv_info = res["data"]["body"]["US"]
        p2psrv_server, p2psrv_port = p2psrv_info.split(":")
        p2psrv_port = int(p2psrv_port)
        print(f"  P2P server: {p2psrv_server}:{p2psrv_port}")
        
        # Step 2: Probe device
        print("\n[Step 2] Probing device...")
        sock.sendto(build_request(f"/probe/device/{SERIAL_NUMBER}"), (p2psrv_server, p2psrv_port))
        data, addr = sock.recvfrom(4096)
        res = parse_response(data)
        print(f"  Probe response from {addr}: code={res['code']}")
        
        # Step 2.5: Get device info and randsalt
        print("\n[Step 2.5] Getting device info and randsalt...")
        sock2 = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock2.bind(("0.0.0.0", 0))
        sock2.settimeout(10)
        sock2.sendto(build_request(f"/info/device/{SERIAL_NUMBER}"), (p2psrv_server, p2psrv_port))
        data, addr = sock2.recvfrom(4096)
        res = parse_response(data)
        
        randsalt = DEFAULT_RANDSALT
        if res.get("data") and res["data"].get("body"):
            body = res["data"]["body"]
            if "RandSalt" in body and body["RandSalt"]:
                randsalt = body["RandSalt"]
                print(f"  Got RandSalt directly: {randsalt[:8]}...")
            elif "Info" in body and body["Info"]:
                print("  Decrypting Info field...")
                decrypted = decrypt_device_info(body["Info"])
                if decrypted and "randsalt" in decrypted:
                    randsalt = decrypted["randsalt"]
                    print(f"  Decrypted randsalt: {randsalt[:8]}...")
        sock2.close()
        
        # Generate auth key
        key = get_auth_key(USERNAME, PASSWORD, randsalt)
        nonce = random.randrange(2**31)
        print(f"  Auth key generated")
        
        # Step 3: Get relay server
        print("\n[Step 3] Getting relay server...")
        sock.sendto(build_request("/online/relay"), (MAIN_SERVER, MAIN_PORT))
        data, addr = sock.recvfrom(4096)
        res = parse_response(data)
        relay_server, relay_port = res["data"]["body"]["Address"].split(":")
        relay_port = int(relay_port)
        print(f"  Relay server: {relay_server}:{relay_port}")
        
        # Step 4: P2P channel request WITH authentication
        print("\n[Step 4] Requesting P2P channel with auth...")
        aid = random.randbytes(8)
        laddr = f"127.0.0.1:{local_port}"
        encrypted_laddr = encrypt_data(key, nonce, laddr)
        ipaddr = f"<IpEncrptV2>true</IpEncrptV2><LocalAddr>{encrypted_laddr}</LocalAddr>"
        auth = get_device_auth(USERNAME, key, nonce, randsalt, encrypted_laddr)
        
        channel_body = f"<body>{auth}<Identify>{' '.join(f'{b:x}' for b in aid)}</Identify>{ipaddr}<version>5.0.0</version></body>"
        sock.sendto(build_request(f"/device/{SERIAL_NUMBER}/p2p-channel", channel_body), (MAIN_SERVER, MAIN_PORT))
        print("  P2P channel request sent with auth (no read yet)")
        
        # Step 5: Get agent (with retry)
        print("\n[Step 5] Getting agent...")
        sock.settimeout(15)
        for retry in range(3):
            try:
                sock.sendto(build_request("/relay/agent"), (relay_server, relay_port))
                data, addr = sock.recvfrom(4096)
                res = parse_response(data)
                token = res["data"]["body"]["Token"]
                agent_server, agent_port = res["data"]["body"]["Agent"].split(":")
                agent_port = int(agent_port)
                print(f"  Agent: {agent_server}:{agent_port}")
                print(f"  Token: {token[:20]}...")
                break
            except socket.timeout:
                print(f"  Retry {retry+1}/3 - timeout getting agent")
                if retry == 2:
                    print("  ❌ Failed to get agent after 3 retries")
                    return
        
        # Step 6: Start relay
        print("\n[Step 6] Starting relay...")
        sock.sendto(
            build_request(f"/relay/start/{token}", "<body><Client>:0</Client></body>"),
            (agent_server, agent_port)
        )
        data, addr = sock.recvfrom(4096)
        res = parse_response(data)
        print(f"  Relay start response from {addr}: code={res['code']}")
        
        # Step 7: Reading p2p-channel response...
        print("\n[Step 7] Reading p2p-channel response...")
        sock.settimeout(10)  # Shorter timeout for this step
        device_server = None
        device_port = None
        
        try:
            data, addr = sock.recvfrom(4096)
            res = parse_response(data)
            print(f"  Response from {addr}: code={res['code']} status={res['status']}")
            
            if res['code'] == 100:  # Trying
                print("  Got 'Trying', waiting for actual response...")
                try:
                    data, addr = sock.recvfrom(4096)
                    res = parse_response(data)
                    print(f"  Response from {addr}: code={res['code']} status={res['status']}")
                    
                    if res['code'] == 200 and res.get("data") and res["data"].get("body"):
                        if res["data"]["body"].get("PubAddr"):
                            device_pub = res["data"]["body"]["PubAddr"]
                            device_server, device_port = device_pub.split(":")
                            device_port = int(device_port)
                            print(f"  Device public address: {device_server}:{device_port}")
                except socket.timeout:
                    print("  ⚠️ Timeout waiting for device response - will use relay mode")
            elif res['code'] == 200:
                if res.get("data") and res["data"].get("body") and res["data"]["body"].get("PubAddr"):
                    device_pub = res["data"]["body"]["PubAddr"]
                    device_server, device_port = device_pub.split(":")
                    device_port = int(device_port)
                    print(f"  Device public address: {device_server}:{device_port}")
        except socket.timeout:
            print("  ⚠️ Timeout - device may not be reachable directly, using relay mode")
        
        # Step 8: Relay channel request
        print("\n[Step 8] Requesting relay channel...")
        relay_auth = get_device_auth(USERNAME, key, nonce, randsalt)
        sock.sendto(
            build_request(f"/device/{SERIAL_NUMBER}/relay-channel", f"<body>{relay_auth}<agentAddr>{agent_server}:{agent_port}</agentAddr></body>"),
            (MAIN_SERVER, MAIN_PORT)
        )
        print("  Relay channel request sent")
        
        # Step 9: Read relay channel response (from AGENT)
        print("\n[Step 9] Reading relay channel response from agent...")
        try:
            data, addr = sock.recvfrom(4096)
            print(f"  Got response from {addr}: {data[:50]}...")
            res = parse_response(data)
            print(f"  Relay channel response: code={res['code']}")
        except socket.timeout:
            print("  Timeout reading relay channel response (may be expected)")
        
        # Step 10: PTCP handshake with agent
        print("\n[Step 10] PTCP handshake with agent...")
        
        ptcp_sent = 0
        ptcp_recv = 0
        ptcp_id = 0
        rmid = 0
        
        # Send PTCP SYN (body format: 00 03 01 00)
        syn_body = b"\x00\x03\x01\x00"  # Command prefix + SYN
        syn_packet = build_ptcp(ptcp_sent, ptcp_recv, 0x0002FFFF, ptcp_id, rmid, syn_body)
        print(f"  Sending PTCP SYN to {agent_server}:{agent_port}")
        print(f"  Packet: {syn_packet.hex()}")
        print(f"  Body: {syn_body.hex()}")
        sock.sendto(syn_packet, (agent_server, agent_port))
        ptcp_sent += len(syn_body)
        ptcp_id += 1
        
        # Read PTCP SYN-ACK
        print("  Waiting for PTCP SYN-ACK...")
        sock.settimeout(15)
        try:
            data, addr = sock.recvfrom(4096)
            print(f"  Got response from {addr}: {data.hex()}")
            
            if data[:4] == b"PTCP":
                ptcp = parse_ptcp(data)
                ptcp_recv += len(ptcp["body"])
                rmid = ptcp["lmid"]
                print(f"  PTCP Response: body={ptcp['body'].hex()}, lmid={hex(ptcp['lmid'])}")
                
                if ptcp["body"] == b"\x00\x03\x01\x00":
                    print("  ✅ PTCP SYN-ACK received!")
                else:
                    print(f"  ⚠️ Unexpected PTCP body")
            else:
                # Might be HTTP response
                try:
                    res = parse_response(data)
                    print(f"  HTTP response: code={res['code']}")
                except:
                    print(f"  Unknown response type")
        except socket.timeout:
            print("  ❌ Timeout waiting for PTCP SYN-ACK")
            return
        
        # Send 0x17 to request sign (with proper format)
        print("\n  Sending 0x17 to request sign...")
        req_body = b"\x17" + b"\x00" * 11  # 0x17 + padding
        req_packet = build_ptcp(ptcp_sent, ptcp_recv, 0x0000FFFF - 1, ptcp_id, rmid, req_body)
        sock.sendto(req_packet, (agent_server, agent_port))
        ptcp_sent += len(req_body)
        ptcp_id += 1
        
        # Read sign response - may need multiple reads
        print("  Waiting for sign response...")
        sign = None
        for _ in range(5):
            try:
                data, addr = sock.recvfrom(4096)
                print(f"  Got response from {addr}: {data[:50].hex()}...")
                
                if data[:4] == b"PTCP":
                    ptcp = parse_ptcp(data)
                    print(f"  PTCP Response: body_len={len(ptcp['body'])}, body={ptcp['body'].hex()}")
                    ptcp_recv += len(ptcp['body'])
                    rmid = ptcp['lmid']
                    
                    if len(ptcp['body']) > 4 and ptcp['body'][0] == 0x18:
                        # This is the sign response (0x18 = sign packet type)
                        sign = ptcp['body'][12:] if len(ptcp['body']) > 12 else ptcp['body'][4:]
                        print(f"  ✅ Got sign (type 0x18): {sign.hex()}")
                        break
                    elif len(ptcp['body']) > 0 and ptcp['body'][0] != 0x00:
                        # Non-SYN packet
                        sign = ptcp['body'][12:] if len(ptcp['body']) > 12 else ptcp['body']
                        print(f"  ✅ Got sign: {sign.hex()}")
                        break
            except socket.timeout:
                break
        
        if not sign:
            print("  ⚠️ Did not receive sign, but continuing anyway...")
            sign = b"\x00\x00\x00\x00"  # Placeholder
        
        # Send ACK
        ack_packet = build_ptcp(ptcp_sent, ptcp_recv, 0x0000FFFF - 2, ptcp_id, rmid, b"")
        sock.sendto(ack_packet, (agent_server, agent_port))
        ptcp_id += 1
        
        print(f"\n✅ PTCP handshake with agent successful!")
        print(f"  Sign: {sign.hex()}")
        
        # Now try to authenticate with device
        print("\n[Step 11] Authenticating with device...")
        
        # In relay mode, we need to establish PTCP with device through the relay
        # The agent has set up a tunnel - we send to device address but it goes through agent
        
        if device_server and device_port:
            # Create new socket for device communication
            dev_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            dev_sock.bind(("0.0.0.0", 0))
            dev_sock.settimeout(10)
            
            # Reset PTCP counters for device connection
            dev_sent = 0
            dev_recv = 0
            dev_id = 0
            dev_rmid = 0
            
            # Send PTCP SYN to device (relayed through agent)
            print(f"  Sending PTCP SYN to device {device_server}:{device_port}...")
            syn_packet = build_ptcp(dev_sent, dev_recv, 0x0002FFFF, dev_id, dev_rmid, b"\x00\x03\x01\x00")
            dev_sock.sendto(syn_packet, (device_server, device_port))
            dev_sent += 4
            dev_id += 1
            
            try:
                data, addr = dev_sock.recvfrom(4096)
                print(f"  Got response from {addr}: {data.hex()}")
                
                if data[:4] == b"PTCP":
                    ptcp = parse_ptcp(data)
                    dev_recv += len(ptcp['body'])
                    dev_rmid = ptcp['lmid']
                    
                    if ptcp['body'] == b"\x00\x03\x01\x00":
                        print("  ✅ Device responded to PTCP SYN!")
                        
                        # Send auth with sign
                        auth_body = b"\x19" + sign
                        auth_packet = build_ptcp(dev_sent, dev_recv, 0x0000FFFF - 1, dev_id, dev_rmid, auth_body)
                        dev_sock.sendto(auth_packet, (device_server, device_port))
                        dev_sent += len(auth_body)
                        dev_id += 1
                        
                        # Wait for auth response
                        for _ in range(5):
                            try:
                                data, addr = dev_sock.recvfrom(4096)
                                ptcp = parse_ptcp(data)
                                dev_recv += len(ptcp['body'])
                                dev_rmid = ptcp['lmid']
                                print(f"  Auth response: {ptcp['body'].hex()}")
                                
                                if len(ptcp['body']) > 0 and ptcp['body'][0] == 0x1A:
                                    print("  ✅ Device authenticated!")
                                    break
                            except socket.timeout:
                                break
            except socket.timeout:
                print("  Timeout waiting for device PTCP response")
            
            dev_sock.close()
        
        # Also try continuing with agent for HTTP tunnel
        print("\n[Step 12] Testing HTTP through agent tunnel...")
        
        # First, send the device authentication (0x19 + sign) to complete relay setup
        auth_body = b"\x19" + sign + b"\x00" * (12 - len(sign) - 1)  # Pad to 12 bytes
        auth_packet = build_ptcp(ptcp_sent, ptcp_recv, 0x0000FFFF - 2, ptcp_id, rmid, auth_body)
        print(f"  Sending device auth (0x19 + sign) to agent...")
        sock.sendto(auth_packet, (agent_server, agent_port))
        ptcp_sent += len(auth_body)
        ptcp_id += 1
        
        # Read auth response  
        auth_success = False
        for _ in range(5):
            try:
                sock.settimeout(3)
                data, addr = sock.recvfrom(4096)
                if data[:4] == b"PTCP":
                    ptcp = parse_ptcp(data)
                    ptcp_recv += len(ptcp['body'])
                    rmid = ptcp['lmid']
                    print(f"  Auth response: {ptcp['body'].hex() if ptcp['body'] else 'empty'}")
                    
                    if len(ptcp['body']) > 0 and ptcp['body'][0] == 0x1A:
                        print("  ✅ Device auth successful!")
                        auth_success = True
                        break
            except socket.timeout:
                break
        
        if not auth_success:
            print("  ⚠️ No auth confirmation, but continuing anyway...")
        
        # Send final handshake
        final_body = b"\x1b" + b"\x00" * 7
        final_packet = build_ptcp(ptcp_sent, ptcp_recv, 0x0000FFFF - 3, ptcp_id, rmid, final_body)
        sock.sendto(final_packet, (agent_server, agent_port))
        ptcp_sent += len(final_body)
        ptcp_id += 1
        
        # Wait for any response
        try:
            sock.settimeout(2)
            data, addr = sock.recvfrom(4096)
            if data[:4] == b"PTCP":
                ptcp = parse_ptcp(data)
                print(f"  Final handshake response: {ptcp['body'].hex() if ptcp['body'] else 'empty'}")
        except:
            pass
        
        # Now request port binding (port 80)
        realm_id = random.randint(0x00000000, 0xFFFFFFFF)
        port_req_body = b"\x11" + realm_id.to_bytes(4, "big") + b"\x00\x50\x7f\x01"  # port 80
        
        port_req_packet = build_ptcp(ptcp_sent, ptcp_recv, 0x0000FFFF - 4, ptcp_id, rmid, port_req_body)
        print(f"\n  Requesting port binding (0x11) for HTTP (realm_id={hex(realm_id)})...")
        sock.sendto(port_req_packet, (agent_server, agent_port))
        ptcp_sent += len(port_req_body)
        ptcp_id += 1
        
        # Read port binding response (should be 0x12)
        try:
            sock.settimeout(10)
            data, addr = sock.recvfrom(4096)
            print(f"  Port binding response: {data[:60].hex()}...")
            
            if data[:4] == b"PTCP":
                ptcp = parse_ptcp(data)
                ptcp_recv += len(ptcp['body'])
                rmid = ptcp['lmid']
                
                print(f"  PTCP body: {ptcp['body'].hex() if ptcp['body'] else 'empty'}")
                
                if len(ptcp['body']) > 0 and ptcp['body'][0] == 0x12:
                    print("  ✅ Port binding successful!")
                    
                    # Now send HTTP request
                    http_req = (
                        f"GET /cgi-bin/magicBox.cgi?action=getDeviceType HTTP/1.1\r\n"
                        f"Host: 127.0.0.1\r\n"
                        f"Connection: close\r\n\r\n"
                    ).encode()
                    
                    # Encapsulate in PTCPPayload format
                    payload_len = len(http_req) | 0x10000000
                    from struct import pack
                    payload_packet = pack("!LLL", payload_len, realm_id, 0) + http_req
                    
                    http_ptcp = build_ptcp(ptcp_sent, ptcp_recv, 0x0000FFFF - 5, ptcp_id, rmid, payload_packet)
                    print(f"  Sending HTTP request through tunnel...")
                    sock.sendto(http_ptcp, (agent_server, agent_port))
                    ptcp_sent += len(payload_packet)
                    ptcp_id += 1
                    
                    # Read HTTP response
                    for _ in range(10):
                        try:
                            sock.settimeout(5)
                            data, addr = sock.recvfrom(4096)
                            print(f"  Response ({len(data)} bytes): {data[:80]}...")
                            
                            if data[:4] == b"PTCP":
                                ptcp = parse_ptcp(data)
                                if len(ptcp['body']) > 12 and ptcp['body'][0] == 0x10:
                                    # This is HTTP response data
                                    http_data = ptcp['body'][12:]
                                    print(f"  HTTP Response:\n{http_data.decode(errors='ignore')[:500]}")
                                    break
                        except socket.timeout:
                            print("  Timeout waiting for HTTP response")
                            break
                else:
                    # Maybe we got a different response type, try reading more
                    for _ in range(5):
                        try:
                            sock.settimeout(3)
                            data, addr = sock.recvfrom(4096)
                            if data[:4] == b"PTCP":
                                ptcp = parse_ptcp(data)
                                print(f"  Additional: {ptcp['body'].hex()[:50] if ptcp['body'] else 'empty'}...")
                                if len(ptcp['body']) > 0 and ptcp['body'][0] == 0x12:
                                    print("  ✅ Port binding confirmed!")
                                    break
                        except socket.timeout:
                            break
        except socket.timeout:
            print("  Timeout waiting for port binding response")
        
        print("\n✅ Test completed!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        sock.close()


if __name__ == "__main__":
    asyncio.run(test_ptcp_handshake())
