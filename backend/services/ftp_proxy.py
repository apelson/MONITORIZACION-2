"""
FTP Proxy Service for CRA (Central Receptora de Alarmas)
Intercepts FTP uploads from Mobotix cameras, saves a copy, and forwards to real CRA
"""
import asyncio
import socket
import os
import re
import uuid
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple
import threading
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FTPProxy")

# Configuration
CRA_HOST = "superkeeper-mastersecurity.verifait.com"
CRA_PORT = 9121
PROXY_PORT = 9121  # Local port to listen on
STORAGE_DIR = Path(__file__).parent.parent / "uploads" / "cra_events"
THUMBNAIL_DIR = STORAGE_DIR / "thumbnails"

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)


class FTPProxyConnection:
    """Handles a single FTP proxy connection"""
    
    def __init__(self, client_socket: socket.socket, client_address: Tuple[str, int], db_callback=None):
        self.client_socket = client_socket
        self.client_address = client_address
        self.client_ip = client_address[0]
        self.server_socket: Optional[socket.socket] = None
        self.db_callback = db_callback
        self.current_filename = None
        self.current_file_data = bytearray()
        self.data_connection = None
        self.username = None
        self.is_storing = False
        self.pasv_mode = False
        self.data_port = None
        
    def connect_to_cra(self) -> bool:
        """Connect to real CRA server"""
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.settimeout(30)
            self.server_socket.connect((CRA_HOST, CRA_PORT))
            logger.info(f"Connected to CRA: {CRA_HOST}:{CRA_PORT}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to CRA: {e}")
            return False
    
    def handle(self):
        """Main handler for the connection"""
        try:
            if not self.connect_to_cra():
                self.client_socket.close()
                return
            
            # Start bidirectional proxy
            self._proxy_data()
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
        finally:
            self.cleanup()
    
    def _proxy_data(self):
        """Proxy data between client and server, intercepting uploads"""
        self.client_socket.setblocking(False)
        self.server_socket.setblocking(False)
        
        client_buffer = bytearray()
        server_buffer = bytearray()
        
        while True:
            # Read from client
            try:
                data = self.client_socket.recv(4096)
                if data:
                    # Parse FTP commands
                    self._parse_client_command(data)
                    server_buffer.extend(data)
                elif data == b'':
                    break
            except BlockingIOError:
                pass
            except Exception as e:
                logger.error(f"Client read error: {e}")
                break
            
            # Read from server
            try:
                data = self.server_socket.recv(4096)
                if data:
                    # Parse server responses
                    self._parse_server_response(data)
                    client_buffer.extend(data)
                elif data == b'':
                    break
            except BlockingIOError:
                pass
            except Exception as e:
                logger.error(f"Server read error: {e}")
                break
            
            # Write to server
            if server_buffer:
                try:
                    sent = self.server_socket.send(bytes(server_buffer))
                    server_buffer = server_buffer[sent:]
                except BlockingIOError:
                    pass
            
            # Write to client
            if client_buffer:
                try:
                    sent = self.client_socket.send(bytes(client_buffer))
                    client_buffer = client_buffer[sent:]
                except BlockingIOError:
                    pass
            
            # Small delay to prevent CPU spinning
            asyncio.get_event_loop().run_until_complete(asyncio.sleep(0.01))
    
    def _parse_client_command(self, data: bytes):
        """Parse FTP commands from client"""
        try:
            text = data.decode('utf-8', errors='ignore')
            lines = text.strip().split('\r\n')
            
            for line in lines:
                if line.upper().startswith('USER '):
                    self.username = line[5:].strip()
                    logger.info(f"FTP User: {self.username} from {self.client_ip}")
                
                elif line.upper().startswith('STOR '):
                    self.current_filename = line[5:].strip()
                    self.is_storing = True
                    self.current_file_data = bytearray()
                    logger.info(f"STOR: {self.current_filename} from {self.client_ip}")
                
                elif line.upper().startswith('PASV'):
                    self.pasv_mode = True
                    
        except Exception as e:
            logger.error(f"Error parsing client command: {e}")
    
    def _parse_server_response(self, data: bytes):
        """Parse FTP responses from server"""
        try:
            text = data.decode('utf-8', errors='ignore')
            
            # Check for PASV response to get data port
            if '227 ' in text and self.pasv_mode:
                # Parse PASV response: 227 Entering Passive Mode (h1,h2,h3,h4,p1,p2)
                match = re.search(r'\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)', text)
                if match:
                    p1, p2 = int(match.group(5)), int(match.group(6))
                    self.data_port = p1 * 256 + p2
                    logger.info(f"PASV data port: {self.data_port}")
                    
            # Check for transfer complete
            if '226 ' in text and self.is_storing and self.current_filename:
                # Transfer complete - save the file
                self._save_uploaded_file()
                self.is_storing = False
                
        except Exception as e:
            logger.error(f"Error parsing server response: {e}")
    
    def _save_uploaded_file(self):
        """Save uploaded file and register event"""
        if not self.current_filename:
            return
            
        try:
            # Generate unique filename
            ext = Path(self.current_filename).suffix.lower() or '.dat'
            unique_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
            file_path = STORAGE_DIR / unique_name
            
            # For now, we'll register the event even without the file data
            # The actual file interception requires a data connection proxy
            
            event_data = {
                "id": str(uuid.uuid4()),
                "camera_ip": self.client_ip,
                "username": self.username,
                "original_filename": self.current_filename,
                "saved_filename": unique_name,
                "file_path": str(file_path),
                "file_size": len(self.current_file_data),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cra_destination": f"{CRA_HOST}:{CRA_PORT}",
                "event_type": "ftp_upload",
                "has_thumbnail": False
            }
            
            # Call database callback to save event
            if self.db_callback:
                self.db_callback(event_data)
            
            logger.info(f"CRA Event registered: {self.current_filename} from {self.client_ip}")
            
        except Exception as e:
            logger.error(f"Error saving uploaded file: {e}")
    
    def cleanup(self):
        """Clean up connections"""
        try:
            if self.client_socket:
                self.client_socket.close()
            if self.server_socket:
                self.server_socket.close()
        except:
            pass


class FTPProxyServer:
    """FTP Proxy Server that intercepts and forwards FTP traffic"""
    
    def __init__(self, listen_port: int = PROXY_PORT, db_callback=None):
        self.listen_port = listen_port
        self.db_callback = db_callback
        self.server_socket = None
        self.running = False
        self.thread = None
        
    def start(self):
        """Start the FTP proxy server"""
        if self.running:
            logger.warning("FTP Proxy already running")
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._run_server, daemon=True)
        self.thread.start()
        logger.info(f"FTP Proxy started on port {self.listen_port}")
        
    def stop(self):
        """Stop the FTP proxy server"""
        self.running = False
        if self.server_socket:
            try:
                self.server_socket.close()
            except:
                pass
        logger.info("FTP Proxy stopped")
        
    def _run_server(self):
        """Main server loop"""
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind(('0.0.0.0', self.listen_port))
            self.server_socket.listen(10)
            self.server_socket.settimeout(1)
            
            logger.info(f"FTP Proxy listening on 0.0.0.0:{self.listen_port}")
            
            while self.running:
                try:
                    client_socket, client_address = self.server_socket.accept()
                    logger.info(f"New connection from {client_address}")
                    
                    # Handle connection in a new thread
                    handler = FTPProxyConnection(client_socket, client_address, self.db_callback)
                    thread = threading.Thread(target=handler.handle, daemon=True)
                    thread.start()
                    
                except socket.timeout:
                    continue
                except Exception as e:
                    if self.running:
                        logger.error(f"Accept error: {e}")
                        
        except Exception as e:
            logger.error(f"Server error: {e}")
        finally:
            if self.server_socket:
                self.server_socket.close()


def generate_thumbnail(video_path: str, output_path: str) -> bool:
    """Generate thumbnail from video using ffmpeg"""
    try:
        cmd = [
            'ffmpeg', '-i', video_path,
            '-ss', '00:00:01',  # 1 second into video
            '-vframes', '1',
            '-vf', 'scale=320:-1',
            '-y', output_path
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=30)
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Thumbnail generation failed: {e}")
        return False


# Global proxy instance
ftp_proxy: Optional[FTPProxyServer] = None


def start_ftp_proxy(db_callback=None):
    """Start the global FTP proxy"""
    global ftp_proxy
    if ftp_proxy is None:
        ftp_proxy = FTPProxyServer(db_callback=db_callback)
    ftp_proxy.start()
    return ftp_proxy


def stop_ftp_proxy():
    """Stop the global FTP proxy"""
    global ftp_proxy
    if ftp_proxy:
        ftp_proxy.stop()
        ftp_proxy = None
