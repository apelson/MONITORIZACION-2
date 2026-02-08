"""
Configuration and database setup for Siempria Network Monitor
"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from functools import lru_cache
from datetime import datetime, timezone
import os
import logging
import time

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
devices_collection = db["devices"]
history_collection = db["status_history"]
alerts_collection = db["alerts"]
settings_collection = db["settings"]
users_collection = db["users"]
organizations_collection = db["organizations"]
groups_collection = db["groups"]
device_types_collection = db["device_types"]
scheduled_reports_collection = db["scheduled_reports"]
public_dashboards_collection = db["public_dashboards"]
access_logs_collection = db["access_logs"]  # NEW: Access logs
incidents_collection = db["incidents"]  # NEW: Incidents/tickets
device_images_collection = db["device_images"]  # NEW: Device installation images

# JWT Settings
SECRET_KEY = os.environ.get("SECRET_KEY", "siempria-network-monitor-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# ============ CACHE SYSTEM ============
class SimpleCache:
    """Simple in-memory cache with TTL support"""
    def __init__(self):
        self._cache = {}
        self._timestamps = {}
    
    def get(self, key: str, ttl_seconds: int = 60):
        """Get cached value if not expired"""
        if key in self._cache:
            if time.time() - self._timestamps.get(key, 0) < ttl_seconds:
                return self._cache[key]
            else:
                # Expired, remove
                del self._cache[key]
                del self._timestamps[key]
        return None
    
    def set(self, key: str, value):
        """Set cache value"""
        self._cache[key] = value
        self._timestamps[key] = time.time()
    
    def invalidate(self, key: str = None):
        """Invalidate specific key or all cache"""
        if key:
            self._cache.pop(key, None)
            self._timestamps.pop(key, None)
        else:
            self._cache.clear()
            self._timestamps.clear()

# Global cache instance
cache = SimpleCache()
