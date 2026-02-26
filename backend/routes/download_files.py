"""
Temporary endpoint to download production files
"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse, FileResponse
import os
import subprocess

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
    # Additional panels
    "OrganizationsPanel.jsx": "/app/frontend/src/components/panels/OrganizationsPanel.jsx",
    "DeviceTypesPanel.jsx": "/app/frontend/src/components/panels/DeviceTypesPanel.jsx",
    "UsersPanel.jsx": "/app/frontend/src/components/panels/UsersPanel.jsx",
    "SettingsPanel.jsx": "/app/frontend/src/components/panels/SettingsPanel.jsx",
    "NOCDashboard.jsx": "/app/frontend/src/components/panels/NOCDashboard.jsx",
    "AlertsPanel.jsx": "/app/frontend/src/components/panels/AlertsPanel.jsx",
    "StatisticsPanel.jsx": "/app/frontend/src/components/panels/StatisticsPanel.jsx",
    "BackupPanel.jsx": "/app/frontend/src/components/panels/BackupPanel.jsx",
    "AccessLogsPanel.jsx": "/app/frontend/src/components/panels/AccessLogsPanel.jsx",
    "DailyReportPanel.jsx": "/app/frontend/src/components/panels/DailyReportPanel.jsx",
    "ScheduledReportsPanel.jsx": "/app/frontend/src/components/panels/ScheduledReportsPanel.jsx",
    "IncidentsPanel.jsx": "/app/frontend/src/components/panels/IncidentsPanel.jsx",
    "InfrastructurePanel.jsx": "/app/frontend/src/components/panels/InfrastructurePanel.jsx",
    "CRADashboard.jsx": "/app/frontend/src/components/panels/CRADashboard.jsx",
    "DeviceGallery.jsx": "/app/frontend/src/components/panels/DeviceGallery.jsx",
    "LiveViewer.jsx": "/app/frontend/src/components/panels/LiveViewer.jsx",
    "SuperAdminTab.jsx": "/app/frontend/src/components/panels/SuperAdminTab.jsx",
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
