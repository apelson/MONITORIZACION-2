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
    "App.css": "/app/frontend/src/App.css",
    "ServerCard.jsx": "/app/frontend/src/components/devices/ServerCard.jsx",
    "DahuaDevicesPanel.jsx": "/app/frontend/src/components/panels/DahuaDevicesPanel.jsx",
    "IncidentsPanel.jsx": "/app/frontend/src/components/panels/IncidentsPanel.jsx",
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
    "InfrastructurePanel.jsx": "/app/frontend/src/components/panels/InfrastructurePanel.jsx",
    "CRADashboard.jsx": "/app/frontend/src/components/panels/CRADashboard.jsx",
    "DeviceGallery.jsx": "/app/frontend/src/components/panels/DeviceGallery.jsx",
    "LiveViewer.jsx": "/app/frontend/src/components/panels/LiveViewer.jsx",
    "SuperAdminTab.jsx": "/app/frontend/src/components/panels/SuperAdminTab.jsx",
    # New files added for latest update
    "MaintenancePanel.jsx": "/app/frontend/src/components/panels/MaintenancePanel.jsx",
    "InfrastructureWidget.jsx": "/app/frontend/src/components/noc/widgets/InfrastructureWidget.jsx",
    "websocket.py": "/app/backend/routes/websocket.py",
    "telegram_service.py": "/app/backend/services/telegram_service.py",
    "devices.py": "/app/backend/routes/devices.py",
    "SystemStatusDashboard.jsx": "/app/frontend/src/components/settings/SystemStatusDashboard.jsx",
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

@router.get("/backend-package")
async def download_backend_package():
    """
    Download complete backend package as tar.gz
    Use: wget -O backend_complete.tar.gz <URL>/api/backend-package
    Extract: tar -xzf backend_complete.tar.gz -C /opt/siempria-monitor/backend/
    """
    # Create fresh package
    backend_dir = "/app/backend"
    output_file = "/tmp/siempria_backend_complete.tar.gz"
    
    # Remove old package if exists
    if os.path.exists(output_file):
        os.remove(output_file)
    
    # Create new package with all required files
    cmd = f"""cd {backend_dir} && tar -czf {output_file} \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='uploads/*' \
        --exclude='backups/*' \
        --exclude='static/*' \
        --exclude='static_files/*' \
        --exclude='tests/*' \
        server.py config.py requirements.txt routes/ services/ models/"""
    
    subprocess.run(cmd, shell=True, check=True)
    
    return FileResponse(
        output_file,
        media_type="application/gzip",
        filename="siempria_backend_complete.tar.gz"
    )

@router.get("/frontend-package")
async def download_frontend_package():
    """
    Download frontend source package as tar.gz (for rebuild)
    """
    frontend_dir = "/app/frontend/src"
    output_file = "/tmp/siempria_frontend_src.tar.gz"
    
    if os.path.exists(output_file):
        os.remove(output_file)
    
    # Package key frontend files
    cmd = f"""cd {frontend_dir} && tar -czf {output_file} \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        components/ App.js App.css index.js index.css locales/ hooks/ contexts/"""
    
    subprocess.run(cmd, shell=True, check=True)
    
    return FileResponse(
        output_file,
        media_type="application/gzip",
        filename="siempria_frontend_src.tar.gz"
    )
