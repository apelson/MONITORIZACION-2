"""
Siempria Conteo - Backend Server (Dev Environment Wrapper)
Imports the conteo app to run through the main infrastructure
"""
import sys
import os

# Add conteo backend to path
sys.path.insert(0, '/app/siempria-conteo/backend')

# Set environment for conteo DB
os.environ.setdefault("DB_NAME", "siempria_conteo")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

# Import conteo modules
from config import CORS_ORIGINS, users_collection, logger
from services.auth_service import get_password_hash
from routes.auth import router as auth_router
from routes.ranking import router as ranking_router
from routes.cameras import router as cameras_router
from routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    admin = await users_collection.find_one({"username": "admin"})
    if not admin:
        import uuid
        await users_collection.insert_one({
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": get_password_hash("Conteo2024!"),
            "role": "admin",
            "full_name": "Administrador",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        })
        logger.info("Admin user created")
    logger.info("Siempria Conteo backend started (dev env)")
    yield
    logger.info("Siempria Conteo backend stopped")


app = FastAPI(
    title="Siempria Conteo API",
    description="Sistema de Conteo de Visitas",
    version="1.0.0",
    lifespan=lifespan
)

origins = CORS_ORIGINS.split(",") if CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")
app.include_router(cameras_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "siempria-conteo", "version": "1.0.0"}
