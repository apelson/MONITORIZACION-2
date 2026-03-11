"""
Siempria Conteo - Backend Server
Sistema independiente de conteo de visitas
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

from config import CORS_ORIGINS, users_collection, logger
from services.auth_service import get_password_hash
from routes.auth import router as auth_router
from routes.ranking import router as ranking_router
from routes.cameras import router as cameras_router
from routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create admin user if not exists
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
    logger.info("Siempria Conteo backend started")
    yield
    logger.info("Siempria Conteo backend stopped")


app = FastAPI(
    title="Siempria Conteo API",
    description="Sistema de Conteo de Visitas",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
origins = CORS_ORIGINS.split(",") if CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")
app.include_router(cameras_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "siempria-conteo", "version": "8.0.0"}


# Serve static frontend files
frontend_build = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
if os.path.exists(frontend_build):
    app.mount("/", StaticFiles(directory=frontend_build, html=True), name="frontend")
