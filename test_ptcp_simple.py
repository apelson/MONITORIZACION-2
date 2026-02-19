#!/usr/bin/env python3
"""
Simplified test for Dahua P2P PTCP handshake with agent
Focus only on the PTCP protocol part
"""
import asyncio
import base64
import datetime
import hashlib
import hmac
import random
import socket
import time
import xmltodict

# Dahua P2P Cloud
MAIN_SERVER = "www.easy4ipcloud.com"
MAIN_PORT = 8800
P2P_USERNAME = "cba1b29e32cb17aa46b8ff9e73c7f40b"
P2P_USERKEY = "996103384cdf19179e19243e959bbf8b"

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
        
        # Step 3: Get relay server
        print("\n[Step 3] Getting relay server...")
        sock.sendto(build_request("/online/relay"), (MAIN_SERVER, MAIN_PORT))
        data, addr = sock.recvfrom(4096)
        res = parse_response(data)
        relay_server, relay_port = res["data"]["body"]["Address"].split(":")
        relay_port = int(relay_port)
        print(f"  Relay server: {relay_server}:{relay_port}")
        
        # Step 4: P2P channel request (no read)
        print("\n[Step 4] Requesting P2P channel...")
        aid = random.randbytes(8)
        laddr = f"127.0.0.1:{local_port}"
        
        channel_body = f"<body><Identify>{' '.join(f'{b:x}' for b in aid)}</Identify><IpEncrpt>false</IpEncrpt><LocalAddr>{laddr}</LocalAddr><version>5.0.0</version></body>"
        sock.sendto(build_request(f"/device/{SERIAL_NUMBER}/p2p-channel", channel_body), (MAIN_SERVER, MAIN_PORT))
        print("  P2P channel request sent (no read)")
        
        # Step 5: Get agent
        print("\n[Step 5] Getting agent...")
        sock.sendto(build_request("/relay/agent"), (relay_server, relay_port))
        data, addr = sock.recvfrom(4096)
        res = parse_response(data)
        token = res["data"]["body"]["Token"]
        agent_server, agent_port = res["data"]["body"]["Agent"].split(":")
        agent_port = int(agent_port)
        print(f"  Agent: {agent_server}:{agent_port}")
        print(f"  Token: {token[:20]}...")
        
        # Step 6: Start relay
        print("\n[Step 6] Starting relay...")
        sock.sendto(
            build_request(f"/relay/start/{token}", "<body><Client>:0</Client></body>"),
            (agent_server, agent_port)
        )
        data, addr = sock.recvfrom(4096)
        res = parse_response(data)
        print(f"  Relay start response from {addr}: code={res['code']}")
        
        # Step 7: Read p2p-channel response (from MAIN_SERVER)
        print("\n[Step 7] Reading p2p-channel response...")
        sock.settimeout(15)
        data, addr = sock.recvfrom(4096)
        res = parse_response(data)
        print(f"  Response from {addr}: code={res['code']} status={res['status']}")
        
        if res['code'] == 100:  # Trying
            print("  Got 'Trying', waiting for actual response...")
            data, addr = sock.recvfrom(4096)
            res = parse_response(data)
            print(f"  Response from {addr}: code={res['code']} status={res['status']}")
        
        if res['code'] != 200:
            print(f"  P2P channel failed: {res['status']}")
            return
        
        device_pub = res["data"]["body"]["PubAddr"]
        device_server, device_port = device_pub.split(":")
        device_port = int(device_port)
        print(f"  Device public address: {device_server}:{device_port}")
        
        # Step 8: Relay channel request (no read)
        print("\n[Step 8] Requesting relay channel...")
        sock.sendto(
            build_request(f"/device/{SERIAL_NUMBER}/relay-channel", f"<body><agentAddr>{agent_server}:{agent_port}</agentAddr></body>"),
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
        
        # Send PTCP SYN
        syn_packet = build_ptcp(ptcp_sent, ptcp_recv, 0x0002FFFF, ptcp_id, rmid, b"\x03\x01")
        print(f"  Sending PTCP SYN to {agent_server}:{agent_port}")
        print(f"  Packet: {syn_packet.hex()}")
        sock.sendto(syn_packet, (agent_server, agent_port))
        ptcp_sent += 4
        ptcp_id += 1
        
        # Read PTCP SYN-ACK
        print("  Waiting for PTCP SYN-ACK...")
        try:
            data, addr = sock.recvfrom(4096)
            print(f"  Got response from {addr}: {data.hex()}")
            
            if data[:4] == b"PTCP":
                ptcp = parse_ptcp(data)
                ptcp_recv += len(ptcp["body"])
                rmid = ptcp["lmid"]
                print(f"  PTCP Response: body={ptcp['body'].hex()}, lmid={hex(ptcp['lmid'])}")
                
                if ptcp["body"] == b"\x03\x01":
                    print("  ✅ PTCP SYN-ACK received!")
                else:
                    print(f"  ⚠️ Unexpected PTCP body: {ptcp['body'].hex()}")
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
        
        # Send 0x17 to request sign
        print("\n  Sending 0x17 to request sign...")
        req_packet = build_ptcp(ptcp_sent, ptcp_recv, 0x0000FFFF - 1, ptcp_id, rmid, b"\x17" + b"\x00" * 11)
        sock.sendto(req_packet, (agent_server, agent_port))
        ptcp_sent += 12
        ptcp_id += 1
        
        # Read sign response
        print("  Waiting for sign response...")
        try:
            data, addr = sock.recvfrom(4096)
            print(f"  Got response from {addr}: {data[:40].hex()}...")
            
            if data[:4] == b"PTCP":
                ptcp = parse_ptcp(data)
                print(f"  PTCP Response: body_len={len(ptcp['body'])}")
                
                if len(ptcp['body']) > 0:
                    sign = ptcp['body'][12:] if len(ptcp['body']) > 12 else ptcp['body']
                    print(f"  ✅ Got sign: {sign.hex()}")
                else:
                    # May need to read again for body with sign
                    data, addr = sock.recvfrom(4096)
                    ptcp = parse_ptcp(data)
                    print(f"  Second response: body_len={len(ptcp['body'])}, body={ptcp['body'].hex()}")
                    if len(ptcp['body']) > 0:
                        sign = ptcp['body'][12:] if len(ptcp['body']) > 12 else ptcp['body']
                        print(f"  ✅ Got sign: {sign.hex()}")
        except socket.timeout:
            print("  ❌ Timeout waiting for sign")
            return
        
        print("\n✅ PTCP handshake successful!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        sock.close()


if __name__ == "__main__":
    asyncio.run(test_ptcp_handshake())
