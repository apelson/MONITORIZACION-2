"""
Configuration and database setup for WatchTower by Siempria
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
ftp_history_collection = db["ftp_history"]  # FTP status change history for auditing
roles_collection = db["roles"]  # Role-based permission system

# ============ DATABASE INDEXES FOR PERFORMANCE ============
async def create_indexes():
    """Create MongoDB indexes for faster queries"""
    try:
        # Devices indexes
        await devices_collection.create_index("status")
        await devices_collection.create_index("is_cra")
        await devices_collection.create_index("group_id")
        await devices_collection.create_index("device_type_id")
        await devices_collection.create_index([("status", 1), ("is_cra", 1)])
        
        # Alerts indexes
        await alerts_collection.create_index("timestamp")
        await alerts_collection.create_index("device_id")
        await alerts_collection.create_index([("timestamp", -1)])
        
        # History indexes  
        await history_collection.create_index("device_id")
        await history_collection.create_index([("timestamp", -1)])
        
        logger.info("MongoDB indexes created successfully")
    except Exception as e:
        logger.warning(f"Error creating indexes: {e}")

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
