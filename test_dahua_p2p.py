#!/usr/bin/env python3
"""
Test script for Dahua P2P connection
Tests connection to a real device using P2P protocol
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, '/app/backend')
os.chdir('/app/backend')

from services.dahua_p2p_protocol import (
    DahuaP2PConnection,
    check_device_p2p,
    MAIN_SERVER,
    MAIN_PORT,
    DEFAULT_RANDSALT
)

# Test device credentials from user
SERIAL_NUMBER = "AL07C99PAJ1A4BE"
USERNAME = "admin"
PASSWORD = "Spw@2018"

async def test_quick_check():
    """Test cloud registration check"""
    print("=" * 60)
    print("TEST 1: Quick Cloud Registration Check")
    print("=" * 60)
    
    import socket
    import random
    import datetime
    import hashlib
    import base64
    
    # Create UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(10)
    sock.bind(("0.0.0.0", 0))
    
    P2P_USERNAME = "cba1b29e32cb17aa46b8ff9e73c7f40b"
    P2P_USERKEY = "996103384cdf19179e19243e959bbf8b"
    
    nonce = random.randrange(2**31)
    curdate = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
    hash_digest = hashlib.sha1()
    hash_digest.update(pwd.encode())
    digest = base64.b64encode(hash_digest.digest()).decode()
    
    req = f"DHGET /online/p2psrv/{SERIAL_NUMBER} HTTP/1.1\r\n"
    req += f"CSeq: 1\r\n"
    req += f'Authorization: WSSE profile="UsernameToken"\r\n'
    req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
    req += "\r\n"
    
    print(f"Checking device: {SERIAL_NUMBER}")
    print(f"Sending to: {MAIN_SERVER}:{MAIN_PORT}")
    
    try:
        sock.sendto(req.encode(), (MAIN_SERVER, MAIN_PORT))
        data, addr = sock.recvfrom(4096)
        response = data.decode()
        
        print(f"\nResponse from {addr}:")
        print(response[:500])  # First 500 chars
        
        if "200 OK" in response:
            print("\n✅ Device is REGISTERED in Easy4IP Cloud")
            return True
        elif "404" in response:
            print("\n❌ Device NOT found in cloud")
            return False
        else:
            print("\n⚠️ Unexpected response")
            return False
            
    except socket.timeout:
        print("\n❌ Timeout connecting to cloud")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False
    finally:
        sock.close()


async def test_device_info():
    """Test getting device info from P2P server and decrypt Info field"""
    print("\n" + "=" * 60)
    print("TEST 2: Get Device Info and Decrypt RandSalt")
    print("=" * 60)
    
    import socket
    import random
    import datetime
    import hashlib
    import base64
    import xmltodict
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    
    # Device Info decryption keys
    INFO_DECRYPT_KEY = b"kRjmsUB&ezmdGLL67H#$ojw@XflcaIaf"
    INFO_DECRYPT_IV = b"MydvJw*Iw1w&i^kk"
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(10)
    sock.bind(("0.0.0.0", 0))
    
    P2P_USERNAME = "cba1b29e32cb17aa46b8ff9e73c7f40b"
    P2P_USERKEY = "996103384cdf19179e19243e959bbf8b"
    
    # First get P2P server
    nonce = random.randrange(2**31)
    curdate = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
    hash_digest = hashlib.sha1()
    hash_digest.update(pwd.encode())
    digest = base64.b64encode(hash_digest.digest()).decode()
    
    req = f"DHGET /online/p2psrv/{SERIAL_NUMBER} HTTP/1.1\r\n"
    req += f"CSeq: 1\r\n"
    req += f'Authorization: WSSE profile="UsernameToken"\r\n'
    req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
    req += "\r\n"
    
    try:
        sock.sendto(req.encode(), (MAIN_SERVER, MAIN_PORT))
        data, addr = sock.recvfrom(4096)
        response = data.decode()
        
        if "200 OK" not in response:
            print("❌ Could not get P2P server info")
            return None
        
        # Parse response
        headers, body = response.split("\r\n\r\n", 1)
        body_data = xmltodict.parse(body) if body.strip() else None
        p2psrv_info = body_data["body"]["US"]
        p2psrv_server, p2psrv_port = p2psrv_info.split(":")
        p2psrv_port = int(p2psrv_port)
        
        print(f"P2P Server: {p2psrv_server}:{p2psrv_port}")
        
        # Now probe device
        sock2 = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock2.settimeout(10)
        sock2.bind(("0.0.0.0", 0))
        
        nonce = random.randrange(2**31)
        curdate = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
        hash_digest = hashlib.sha1()
        hash_digest.update(pwd.encode())
        digest = base64.b64encode(hash_digest.digest()).decode()
        
        req = f"DHGET /probe/device/{SERIAL_NUMBER} HTTP/1.1\r\n"
        req += f"CSeq: 2\r\n"
        req += f'Authorization: WSSE profile="UsernameToken"\r\n'
        req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
        req += "\r\n"
        
        sock2.sendto(req.encode(), (p2psrv_server, p2psrv_port))
        data, addr = sock2.recvfrom(4096)
        print(f"\nProbe response: {data.decode()[:200]}")
        
        # Get device info
        nonce = random.randrange(2**31)
        curdate = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        pwd = f"{nonce}{curdate}DHP2P:{P2P_USERNAME}:{P2P_USERKEY}"
        hash_digest = hashlib.sha1()
        hash_digest.update(pwd.encode())
        digest = base64.b64encode(hash_digest.digest()).decode()
        
        req = f"DHGET /info/device/{SERIAL_NUMBER} HTTP/1.1\r\n"
        req += f"CSeq: 3\r\n"
        req += f'Authorization: WSSE profile="UsernameToken"\r\n'
        req += f'X-WSSE: UsernameToken Username="{P2P_USERNAME}", PasswordDigest="{digest}", Nonce="{nonce}", Created="{curdate}"\r\n'
        req += "\r\n"
        
        sock2.sendto(req.encode(), (p2psrv_server, p2psrv_port))
        data, addr = sock2.recvfrom(4096)
        response = data.decode()
        
        print(f"\nDevice Info response:")
        print(response[:500])
        
        # Parse and look for RandSalt
        if "\r\n\r\n" in response:
            headers, body = response.split("\r\n\r\n", 1)
            if body.strip():
                body_data = xmltodict.parse(body)
                print(f"\nParsed body keys: {list(body_data.get('body', {}).keys())}")
                
                if "body" in body_data:
                    body_content = body_data["body"]
                    
                    if "RandSalt" in body_content:
                        print(f"\n✅ Found RandSalt directly: {body_content['RandSalt']}")
                        return body_content['RandSalt']
                    
                    if "Info" in body_content and body_content["Info"]:
                        info_data = body_content["Info"]
                        print(f"\n🔐 Attempting to decrypt Info field...")
                        print(f"   Info (base64): {info_data[:60]}...")
                        
                        try:
                            cipher_text = base64.b64decode(info_data)
                            print(f"   Cipher length: {len(cipher_text)} bytes")
                            
                            # Try AES-OFB decryption
                            cipher = Cipher(
                                algorithms.AES(INFO_DECRYPT_KEY),
                                modes.OFB(INFO_DECRYPT_IV),
                                backend=default_backend()
                            )
                            decryptor = cipher.decryptor()
                            decrypted = decryptor.update(cipher_text) + decryptor.finalize()
                            
                            decrypted_str = decrypted.decode('utf-8', errors='ignore')
                            print(f"\n   Decrypted (raw): {decrypted_str[:200]}...")
                            
                            # Try to parse as JSON
                            import json
                            import re
                            
                            json_start = decrypted_str.find('{')
                            json_end = decrypted_str.rfind('}')
                            if json_start >= 0 and json_end > json_start:
                                json_str = decrypted_str[json_start:json_end+1]
                                try:
                                    parsed = json.loads(json_str)
                                    print(f"\n   ✅ Parsed JSON: {json.dumps(parsed, indent=2)}")
                                    
                                    # Look for randsalt
                                    for key in ["randsalt", "RandSalt", "salt"]:
                                        if key in parsed:
                                            print(f"\n   ✅✅ Found randsalt: {parsed[key]}")
                                            return parsed[key]
                                except json.JSONDecodeError as e:
                                    print(f"   JSON parse error: {e}")
                            
                            # Look for hex pattern
                            hex_matches = re.findall(r'[a-f0-9]{32}', decrypted_str)
                            if hex_matches:
                                print(f"\n   Found hex patterns: {hex_matches}")
                                return hex_matches[0]
                                
                        except Exception as e:
                            print(f"   ❌ Decryption error: {e}")
                            import traceback
                            traceback.print_exc()
        
        sock2.close()
        return None
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        sock.close()


async def test_full_connection():
    """Test full P2P connection to device"""
    print("\n" + "=" * 60)
    print("TEST 3: Full P2P Connection")
    print("=" * 60)
    
    print(f"Serial: {SERIAL_NUMBER}")
    print(f"Username: {USERNAME}")
    print(f"Password: {'*' * len(PASSWORD)}")
    print()
    
    result = await check_device_p2p(SERIAL_NUMBER, USERNAME, PASSWORD)
    
    print("\n📊 Result:")
    for key, value in result.items():
        print(f"  {key}: {value}")
    
    return result


async def main():
    print("🔧 Dahua P2P Connection Test")
    print("Testing with device:", SERIAL_NUMBER)
    print()
    
    # Test 1: Cloud check
    cloud_ok = await test_quick_check()
    
    if not cloud_ok:
        print("\n⛔ Cannot proceed - device not in cloud")
        return
    
    # Test 2: Get device info
    randsalt = await test_device_info()
    
    # Test 3: Full connection
    await test_full_connection()


if __name__ == "__main__":
    asyncio.run(main())
