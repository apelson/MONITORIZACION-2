"""
Export & Backup Routes
Advanced data export and backup management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/export", tags=["Export"])
backup_router = APIRouter(prefix="/backup", tags=["Backup"])


class BackupConfigRequest(BaseModel):
    frequency: str = "daily"  # hourly, daily, weekly
    time: str = "03:00"
    retention: int = 30
    location: str = "local"  # local, s3, gcs, azure
    email_notify: bool = True
    include_images: bool = False
    include_logs: bool = True
    enabled: bool = False
    s3_bucket: Optional[str] = None
    s3_prefix: Optional[str] = None


def get_export_service(request):
    """Get export service from app state"""
    from services.export_service import ExportService
    return ExportService(request.app.state.db)


def get_backup_service(request):
    """Get backup service from app state"""
    from services.backup_service import BackupService
    return BackupService(request.app.state.db)


# ==================== Device Exports (existing) ====================
@router.get("/excel")
async def export_devices_excel(
    request,
    organization_id: Optional[str] = None,
    current_user: dict = Depends(lambda: None)  # Replace with actual auth
):
    """Export devices to Excel"""
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_excel(devices, "Dispositivos")
    
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/pdf")
async def export_devices_pdf(
    request,
    organization_id: Optional[str] = None
):
    """Export devices to PDF"""
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_pdf(devices, "Listado de Dispositivos")
    
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/csv")
async def export_devices_csv(
    request,
    organization_id: Optional[str] = None
):
    """Export devices to CSV"""
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_csv(devices)
    
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/json")
async def export_devices_json(
    request,
    organization_id: Optional[str] = None
):
    """Export devices to JSON"""
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_json(devices)
    
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.json"
    return StreamingResponse(
        output,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/xml")
async def export_devices_xml(
    request,
    organization_id: Optional[str] = None
):
    """Export devices to XML"""
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_xml(devices, "devices")
    
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.xml"
    return StreamingResponse(
        output,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== Alerts Export ====================
@router.get("/alerts/{format}")
async def export_alerts(
    request,
    format: str,
    organization_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Export alerts in specified format"""
    service = get_export_service(request)
    alerts = await service.get_alerts(organization_id, date_from, date_to)
    
    filename = f"alertas_{datetime.now().strftime('%Y%m%d')}"
    
    if format == "csv":
        output = service.to_csv(alerts)
        return StreamingResponse(output, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        output = service.to_excel(alerts, "Alertas")
        return StreamingResponse(output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        output = service.to_pdf(alerts, "Historial de Alertas")
        return StreamingResponse(output, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})
    elif format == "json":
        output = service.to_json(alerts)
        return StreamingResponse(output, media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        output = service.to_xml(alerts, "alerts")
        return StreamingResponse(output, media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ==================== Incidents Export ====================
@router.get("/incidents/{format}")
async def export_incidents(
    request,
    format: str,
    organization_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Export incidents in specified format"""
    service = get_export_service(request)
    incidents = await service.get_incidents(organization_id, date_from, date_to)
    
    filename = f"incidencias_{datetime.now().strftime('%Y%m%d')}"
    
    if format == "csv":
        output = service.to_csv(incidents)
        return StreamingResponse(output, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        output = service.to_excel(incidents, "Incidencias")
        return StreamingResponse(output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        output = service.to_pdf(incidents, "Registro de Incidencias")
        return StreamingResponse(output, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})
    elif format == "json":
        output = service.to_json(incidents)
        return StreamingResponse(output, media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        output = service.to_xml(incidents, "incidents")
        return StreamingResponse(output, media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ==================== Logs Export ====================
@router.get("/logs/{format}")
async def export_logs(
    request,
    format: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Export access logs in specified format"""
    service = get_export_service(request)
    logs = await service.get_logs(date_from, date_to)
    
    filename = f"logs_{datetime.now().strftime('%Y%m%d')}"
    
    if format == "csv":
        output = service.to_csv(logs)
        return StreamingResponse(output, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        output = service.to_excel(logs, "Logs de Acceso")
        return StreamingResponse(output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "json":
        output = service.to_json(logs)
        return StreamingResponse(output, media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        output = service.to_xml(logs, "logs")
        return StreamingResponse(output, media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ==================== Users Export ====================
@router.get("/users/{format}")
async def export_users(request, format: str):
    """Export users in specified format"""
    service = get_export_service(request)
    users = await service.get_users()
    
    filename = f"usuarios_{datetime.now().strftime('%Y%m%d')}"
    
    if format == "csv":
        output = service.to_csv(users)
        return StreamingResponse(output, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        output = service.to_excel(users, "Usuarios")
        return StreamingResponse(output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        output = service.to_pdf(users, "Lista de Usuarios")
        return StreamingResponse(output, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})
    elif format == "json":
        output = service.to_json(users)
        return StreamingResponse(output, media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        output = service.to_xml(users, "users")
        return StreamingResponse(output, media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ==================== Organizations Export ====================
@router.get("/organizations/{format}")
async def export_organizations(request, format: str):
    """Export organizations in specified format"""
    service = get_export_service(request)
    data = await service.get_organizations()
    
    filename = f"organizaciones_{datetime.now().strftime('%Y%m%d')}"
    
    # Flatten for CSV/Excel
    flat_data = data.get('organizations', [])
    
    if format == "csv":
        output = service.to_csv(flat_data)
        return StreamingResponse(output, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        output = service.to_excel(flat_data, "Organizaciones")
        return StreamingResponse(output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        output = service.to_pdf(flat_data, "Estructura Organizativa")
        return StreamingResponse(output, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})
    elif format == "json":
        output = service.to_json(data)
        return StreamingResponse(output, media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        output = service.to_xml(data, "organizations")
        return StreamingResponse(output, media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ==================== Complete Export ====================
@router.get("/complete/{format}")
async def export_complete(
    request,
    format: str,
    organization_id: Optional[str] = None
):
    """Export all data in specified format"""
    service = get_export_service(request)
    
    filename = f"backup_completo_{datetime.now().strftime('%Y%m%d')}"
    
    try:
        output = await service.export_complete(format, organization_id)
        
        mime_types = {
            "json": "application/json",
            "xml": "application/xml",
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        extensions = {"json": "json", "xml": "xml", "excel": "xlsx"}
        
        return StreamingResponse(
            output,
            media_type=mime_types.get(format, "application/octet-stream"),
            headers={"Content-Disposition": f"attachment; filename={filename}.{extensions.get(format, format)}"}
        )
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Backup Routes ====================
@backup_router.get("/config")
async def get_backup_config(request):
    """Get backup configuration"""
    service = get_backup_service(request)
    return await service.get_config()


@backup_router.post("/config")
async def save_backup_config(request, config: BackupConfigRequest):
    """Save backup configuration"""
    service = get_backup_service(request)
    return await service.save_config(config.dict())


@backup_router.post("/run")
async def run_backup(request):
    """Execute a manual backup"""
    service = get_backup_service(request)
    config = await service.get_config()
    
    try:
        result = await service.run_backup(
            include_images=config.get("include_images", False),
            include_logs=config.get("include_logs", True)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@backup_router.get("/list")
async def list_backups(request):
    """List all available backups"""
    service = get_backup_service(request)
    return await service.list_backups()


@backup_router.get("/download/{filename}")
async def download_backup(request, filename: str):
    """Download a backup file"""
    service = get_backup_service(request)
    
    try:
        file_path = await service.download_backup(filename)
        
        def iterfile():
            with open(file_path, 'rb') as f:
                while chunk := f.read(8192):
                    yield chunk
        
        return StreamingResponse(
            iterfile(),
            media_type="application/gzip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Backup not found")


@backup_router.delete("/{filename}")
async def delete_backup(request, filename: str):
    """Delete a backup file"""
    service = get_backup_service(request)
    
    if await service.delete_backup(filename):
        return {"success": True, "message": "Backup deleted"}
    else:
        raise HTTPException(status_code=404, detail="Backup not found")
