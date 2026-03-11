"""
Siempria Conteo - Configuration
"""
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("siempria-conteo")

# Database
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "siempria_conteo")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_collection = db["users"]
cameras_config_collection = db["brand_cameras_config"]
daily_baselines_collection = db["daily_baselines"]
brand_daily_collection = db["brand_daily_statistics"]
brand_hourly_collection = db["brand_hourly_statistics"]
brands_collection = db["brands"]
centers_collection = db["centers"]

# Main platform DB (for migration)
MAIN_PLATFORM_MONGO_URL = os.environ.get("MAIN_PLATFORM_MONGO_URL", MONGO_URL)
MAIN_PLATFORM_DB_NAME = os.environ.get("MAIN_PLATFORM_DB_NAME", "siempria_monitor")
SECRET_KEY = os.environ.get("SECRET_KEY", "siempria-conteo-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# CORS
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
