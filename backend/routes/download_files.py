"""
Temporary endpoint to download production files
"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
import os

router = APIRouter(tags=["download"])

FILES = {
    "CRAWidget.jsx": "/app/frontend/src/components/noc/widgets/CRAWidget.jsx",
    "SystemECG.jsx": "/app/frontend/src/components/common/SystemECG.jsx",
    "settings.py": "/app/backend/routes/settings.py",
    "devices.py": "/app/backend/routes/devices.py",
    "NOCDashboardRefactored.jsx": "/app/frontend/src/components/panels/NOCDashboardRefactored.jsx",
    "LoginPage.jsx": "/app/frontend/src/components/auth/LoginPage.jsx",
    "translation_es.json": "/app/frontend/src/locales/es/translation.json",
    "translation_en.json": "/app/frontend/src/locales/en/translation.json",
    "App.js": "/app/frontend/src/App.js",
}

@router.get("/download/{filename}")
async def download_file(filename: str):
    if filename not in FILES:
        return PlainTextResponse(f"File not found: {filename}", status_code=404)
    
    filepath = FILES[filename]
    if not os.path.exists(filepath):
        return PlainTextResponse(f"File does not exist: {filepath}", status_code=404)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    return PlainTextResponse(content)

@router.get("/download-list")
async def list_files():
    return {"files": list(FILES.keys())}
