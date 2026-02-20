#!/bin/bash
# ============================================
# Siempria Monitor - Backend Export & Backup
# Version: 1.0
# ============================================

set -e

BACKEND_DIR="/opt/siempria-monitor/backend"

echo "=========================================="
echo "  Instalando Backend Export & Backup v1.0"
echo "=========================================="

# Create backup directory
echo "[1/5] Creando directorio de backups..."
mkdir -p /opt/siempria-monitor/backups
chmod 755 /opt/siempria-monitor/backups

# Create export_service.py
echo "[2/5] Creando export_service.py..."
cat > "$BACKEND_DIR/services/export_service.py" << 'EXPORT_SERVICE_EOF'
"""
Export Service - Advanced data export functionality
"""
import json
import csv
import io
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
import xml.etree.ElementTree as ET
from xml.dom import minidom

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


class ExportService:
    def __init__(self, db):
        self.db = db
    
    def _serialize_doc(self, doc: dict) -> dict:
        if doc is None:
            return None
        result = {}
        for key, value in doc.items():
            if key == '_id':
                result['id'] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, list):
                result[key] = [self._serialize_doc(item) if isinstance(item, dict) else item for item in value]
            elif isinstance(value, dict):
                result[key] = self._serialize_doc(value)
            else:
                result[key] = value
        return result

    async def get_devices(self, organization_id: Optional[str] = None) -> List[Dict]:
        query = {}
        if organization_id:
            query['organization_id'] = organization_id
        devices = []
        cursor = self.db.devices.find(query, {'_id': 0})
        async for doc in cursor:
            devices.append(self._serialize_doc(doc))
        return devices

    async def get_alerts(self, organization_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict]:
        query = {}
        if date_from:
            query['created_at'] = {'$gte': datetime.fromisoformat(date_from)}
        if date_to:
            if 'created_at' not in query:
                query['created_at'] = {}
            query['created_at']['$lte'] = datetime.fromisoformat(date_to)
        alerts = []
        cursor = self.db.alerts.find(query, {'_id': 0}).sort('created_at', -1).limit(10000)
        async for doc in cursor:
            alerts.append(self._serialize_doc(doc))
        return alerts

    async def get_incidents(self, organization_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict]:
        query = {}
        if date_from:
            query['created_at'] = {'$gte': datetime.fromisoformat(date_from)}
        if date_to:
            if 'created_at' not in query:
                query['created_at'] = {}
            query['created_at']['$lte'] = datetime.fromisoformat(date_to)
        incidents = []
        cursor = self.db.incidents.find(query, {'_id': 0}).sort('created_at', -1).limit(10000)
        async for doc in cursor:
            incidents.append(self._serialize_doc(doc))
        return incidents

    async def get_logs(self, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict]:
        query = {}
        if date_from:
            query['timestamp'] = {'$gte': datetime.fromisoformat(date_from)}
        if date_to:
            if 'timestamp' not in query:
                query['timestamp'] = {}
            query['timestamp']['$lte'] = datetime.fromisoformat(date_to)
        logs = []
        cursor = self.db.access_logs.find(query, {'_id': 0}).sort('timestamp', -1).limit(10000)
        async for doc in cursor:
            logs.append(self._serialize_doc(doc))
        return logs

    async def get_users(self) -> List[Dict]:
        users = []
        cursor = self.db.users.find({}, {'_id': 0, 'password': 0, 'hashed_password': 0})
        async for doc in cursor:
            users.append(self._serialize_doc(doc))
        return users

    async def get_organizations(self) -> Dict:
        orgs = []
        cursor = self.db.organizations.find({}, {'_id': 0})
        async for doc in cursor:
            orgs.append(self._serialize_doc(doc))
        groups = []
        cursor = self.db.groups.find({}, {'_id': 0})
        async for doc in cursor:
            groups.append(self._serialize_doc(doc))
        return {'organizations': orgs, 'groups': groups}

    def to_csv(self, data: List[Dict], filename_prefix: str = "export") -> io.BytesIO:
        output = io.StringIO()
        if not data:
            output.write("No data\n")
            return io.BytesIO(output.getvalue().encode('utf-8-sig'))
        flat_data = []
        for item in data:
            flat_item = {}
            for key, value in item.items():
                if isinstance(value, (dict, list)):
                    flat_item[key] = json.dumps(value, ensure_ascii=False)
                else:
                    flat_item[key] = value
            flat_data.append(flat_item)
        writer = csv.DictWriter(output, fieldnames=flat_data[0].keys())
        writer.writeheader()
        writer.writerows(flat_data)
        return io.BytesIO(output.getvalue().encode('utf-8-sig'))

    def to_json(self, data: Any) -> io.BytesIO:
        output = json.dumps(data, ensure_ascii=False, indent=2, default=str)
        return io.BytesIO(output.encode('utf-8'))

    def to_xml(self, data: Any, root_name: str = "data") -> io.BytesIO:
        def dict_to_xml(parent, d):
            if isinstance(d, dict):
                for key, value in d.items():
                    safe_key = ''.join(c if c.isalnum() or c == '_' else '_' for c in str(key))
                    if safe_key and safe_key[0].isdigit():
                        safe_key = '_' + safe_key
                    if not safe_key:
                        safe_key = 'item'
                    child = ET.SubElement(parent, safe_key)
                    dict_to_xml(child, value)
            elif isinstance(d, list):
                for item in d:
                    child = ET.SubElement(parent, 'item')
                    dict_to_xml(child, item)
            else:
                parent.text = str(d) if d is not None else ''
        root = ET.Element(root_name)
        if isinstance(data, list):
            for item in data:
                child = ET.SubElement(root, 'record')
                dict_to_xml(child, item)
        else:
            dict_to_xml(root, data)
        xml_str = ET.tostring(root, encoding='unicode')
        pretty_xml = minidom.parseString(xml_str).toprettyxml(indent="  ")
        return io.BytesIO(pretty_xml.encode('utf-8'))

    def to_excel(self, data: List[Dict], sheet_name: str = "Data") -> io.BytesIO:
        if not EXCEL_AVAILABLE:
            raise ImportError("openpyxl is required for Excel export. Install with: pip install openpyxl")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_name
        if not data:
            ws.append(["No data"])
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            return output
        header_fill = PatternFill(start_color="0066CC", end_color="0066CC", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        headers = list(data[0].keys())
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        for row_idx, item in enumerate(data, 2):
            for col_idx, key in enumerate(headers, 1):
                value = item.get(key, '')
                if isinstance(value, (dict, list)):
                    value = json.dumps(value, ensure_ascii=False)
                ws.cell(row=row_idx, column=col_idx, value=value)
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            ws.column_dimensions[column].width = min(max_length + 2, 50)
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    def to_pdf(self, data: List[Dict], title: str = "Export") -> io.BytesIO:
        if not PDF_AVAILABLE:
            raise ImportError("reportlab is required for PDF export. Install with: pip install reportlab")
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(A4), topMargin=1*cm, bottomMargin=1*cm)
        elements = []
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, spaceAfter=20)
        elements.append(Paragraph(title, title_style))
        elements.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
        elements.append(Spacer(1, 20))
        if not data:
            elements.append(Paragraph("No hay datos para mostrar", styles['Normal']))
        else:
            headers = list(data[0].keys())[:8]
            table_data = [headers]
            for item in data[:100]:
                row = []
                for key in headers:
                    value = item.get(key, '')
                    if isinstance(value, (dict, list)):
                        value = '...'
                    value = str(value)[:30]
                    row.append(value)
                table_data.append(row)
            table = Table(table_data, repeatRows=1)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066CC')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
            ]))
            elements.append(table)
            if len(data) > 100:
                elements.append(Spacer(1, 10))
                elements.append(Paragraph(f"Mostrando 100 de {len(data)} registros", styles['Normal']))
        doc.build(elements)
        output.seek(0)
        return output

    async def export_complete(self, format: str, organization_id: Optional[str] = None) -> io.BytesIO:
        data = {
            'devices': await self.get_devices(organization_id),
            'alerts': await self.get_alerts(organization_id),
            'incidents': await self.get_incidents(organization_id),
            'users': await self.get_users(),
            'organizations': await self.get_organizations(),
            'export_date': datetime.now().isoformat(),
            'export_type': 'complete'
        }
        if format == 'json':
            return self.to_json(data)
        elif format == 'xml':
            return self.to_xml(data, 'siempria_backup')
        elif format == 'excel':
            if not EXCEL_AVAILABLE:
                raise ImportError("openpyxl required")
            wb = openpyxl.Workbook()
            self._add_sheet(wb, 'Dispositivos', data['devices'])
            self._add_sheet(wb, 'Alertas', data['alerts'])
            self._add_sheet(wb, 'Incidencias', data['incidents'])
            self._add_sheet(wb, 'Usuarios', data['users'])
            if 'Sheet' in wb.sheetnames:
                del wb['Sheet']
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            return output
        else:
            raise ValueError(f"Unsupported format: {format}")

    def _add_sheet(self, wb, name: str, data: List[Dict]):
        ws = wb.create_sheet(title=name)
        if not data:
            ws.append(["No data"])
            return
        headers = list(data[0].keys())
        header_fill = PatternFill(start_color="0066CC", end_color="0066CC", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
        for row_idx, item in enumerate(data, 2):
            for col_idx, key in enumerate(headers, 1):
                value = item.get(key, '')
                if isinstance(value, (dict, list)):
                    value = json.dumps(value, ensure_ascii=False)
                ws.cell(row=row_idx, column=col_idx, value=value)
EXPORT_SERVICE_EOF

# Create backup_service.py
echo "[3/5] Creando backup_service.py..."
cat > "$BACKEND_DIR/services/backup_service.py" << 'BACKUP_SERVICE_EOF'
"""
Backup Service - Automated backup system
"""
import os
import json
import shutil
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path


class BackupService:
    def __init__(self, db, backup_dir: str = "/opt/siempria-monitor/backups"):
        self.db = db
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.config_collection = "backup_config"
    
    async def get_config(self) -> Dict[str, Any]:
        config = await self.db.settings.find_one({"type": self.config_collection})
        if config:
            return {
                "frequency": config.get("frequency", "daily"),
                "time": config.get("time", "03:00"),
                "retention": config.get("retention", 30),
                "location": config.get("location", "local"),
                "email_notify": config.get("email_notify", True),
                "include_images": config.get("include_images", False),
                "include_logs": config.get("include_logs", True),
                "enabled": config.get("enabled", False),
                "last_backup": config.get("last_backup")
            }
        return {
            "frequency": "daily",
            "time": "03:00",
            "retention": 30,
            "location": "local",
            "email_notify": True,
            "include_images": False,
            "include_logs": True,
            "enabled": False
        }
    
    async def save_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        config["type"] = self.config_collection
        config["updated_at"] = datetime.utcnow()
        await self.db.settings.update_one(
            {"type": self.config_collection},
            {"$set": config},
            upsert=True
        )
        return config
    
    async def run_backup(self, include_images: bool = False, include_logs: bool = True) -> Dict[str, Any]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}"
        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(parents=True, exist_ok=True)
        
        try:
            collections_to_backup = [
                "devices", "organizations", "groups", "users", 
                "alerts", "incidents", "device_types", "settings",
                "dahua_devices", "roles"
            ]
            if include_logs:
                collections_to_backup.append("access_logs")
            
            backup_data = {
                "backup_date": datetime.now().isoformat(),
                "version": "1.0",
                "collections": {}
            }
            
            for collection_name in collections_to_backup:
                collection = self.db[collection_name]
                docs = []
                async for doc in collection.find({}):
                    doc_dict = {}
                    for key, value in doc.items():
                        if key == '_id':
                            doc_dict['_id'] = str(value)
                        elif hasattr(value, 'isoformat'):
                            doc_dict[key] = value.isoformat()
                        else:
                            doc_dict[key] = value
                    docs.append(doc_dict)
                backup_data["collections"][collection_name] = docs
            
            json_file = backup_path / "data.json"
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)
            
            archive_path = self.backup_dir / f"{backup_name}.tar.gz"
            shutil.make_archive(str(backup_path), 'gztar', self.backup_dir, backup_name)
            shutil.rmtree(backup_path)
            
            file_size = os.path.getsize(archive_path)
            size_str = self._format_size(file_size)
            
            await self.db.settings.update_one(
                {"type": self.config_collection},
                {"$set": {
                    "last_backup": {
                        "filename": f"{backup_name}.tar.gz",
                        "created_at": datetime.utcnow(),
                        "size": size_str,
                        "collections": len(collections_to_backup)
                    }
                }},
                upsert=True
            )
            
            await self.cleanup_old_backups()
            
            return {
                "success": True,
                "filename": f"{backup_name}.tar.gz",
                "path": str(archive_path),
                "size": size_str,
                "created_at": datetime.now().isoformat(),
                "collections": len(collections_to_backup)
            }
        except Exception as e:
            if backup_path.exists():
                shutil.rmtree(backup_path)
            raise Exception(f"Backup failed: {str(e)}")
    
    async def cleanup_old_backups(self):
        config = await self.get_config()
        retention_days = config.get("retention", 30)
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        
        for backup_file in self.backup_dir.glob("backup_*.tar.gz"):
            try:
                date_str = backup_file.stem.replace("backup_", "").split("_")[0]
                file_date = datetime.strptime(date_str, "%Y%m%d")
                if file_date < cutoff_date:
                    backup_file.unlink()
            except (ValueError, IndexError):
                continue
    
    async def list_backups(self) -> list:
        backups = []
        for backup_file in sorted(self.backup_dir.glob("backup_*.tar.gz"), reverse=True):
            stat = backup_file.stat()
            backups.append({
                "filename": backup_file.name,
                "size": self._format_size(stat.st_size),
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        return backups
    
    async def download_backup(self, filename: str) -> Path:
        backup_path = self.backup_dir / filename
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup not found: {filename}")
        return backup_path
    
    async def delete_backup(self, filename: str) -> bool:
        backup_path = self.backup_dir / filename
        if backup_path.exists():
            backup_path.unlink()
            return True
        return False
    
    def _format_size(self, size_bytes: int) -> str:
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
BACKUP_SERVICE_EOF

# Create export_routes.py
echo "[4/5] Creando export_routes.py..."
cat > "$BACKEND_DIR/routes/export_routes.py" << 'EXPORT_ROUTES_EOF'
"""
Export & Backup Routes
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from services.export_service import ExportService
from services.backup_service import BackupService

router = APIRouter(prefix="/export", tags=["Export"])
backup_router = APIRouter(prefix="/backup", tags=["Backup"])


class BackupConfigRequest(BaseModel):
    frequency: str = "daily"
    time: str = "03:00"
    retention: int = 30
    location: str = "local"
    email_notify: bool = True
    include_images: bool = False
    include_logs: bool = True
    enabled: bool = False


def get_export_service(request: Request):
    return ExportService(request.app.state.db)


def get_backup_service(request: Request):
    return BackupService(request.app.state.db)


@router.get("/excel")
async def export_devices_excel(request: Request, organization_id: Optional[str] = None):
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_excel(devices, "Dispositivos")
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/pdf")
async def export_devices_pdf(request: Request, organization_id: Optional[str] = None):
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_pdf(devices, "Listado de Dispositivos")
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(output, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/csv")
async def export_devices_csv(request: Request, organization_id: Optional[str] = None):
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_csv(devices)
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(output, media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/json")
async def export_devices_json(request: Request, organization_id: Optional[str] = None):
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_json(devices)
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.json"
    return StreamingResponse(output, media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/xml")
async def export_devices_xml(request: Request, organization_id: Optional[str] = None):
    service = get_export_service(request)
    devices = await service.get_devices(organization_id)
    output = service.to_xml(devices, "devices")
    filename = f"dispositivos_{datetime.now().strftime('%Y%m%d')}.xml"
    return StreamingResponse(output, media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/alerts/{format}")
async def export_alerts(request: Request, format: str, organization_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None):
    service = get_export_service(request)
    alerts = await service.get_alerts(organization_id, date_from, date_to)
    filename = f"alertas_{datetime.now().strftime('%Y%m%d')}"
    if format == "csv":
        return StreamingResponse(service.to_csv(alerts), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        return StreamingResponse(service.to_excel(alerts, "Alertas"), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        return StreamingResponse(service.to_pdf(alerts, "Alertas"), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})
    elif format == "json":
        return StreamingResponse(service.to_json(alerts), media_type="application/json", headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        return StreamingResponse(service.to_xml(alerts, "alerts"), media_type="application/xml", headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


@router.get("/incidents/{format}")
async def export_incidents(request: Request, format: str, organization_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None):
    service = get_export_service(request)
    incidents = await service.get_incidents(organization_id, date_from, date_to)
    filename = f"incidencias_{datetime.now().strftime('%Y%m%d')}"
    if format == "csv":
        return StreamingResponse(service.to_csv(incidents), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        return StreamingResponse(service.to_excel(incidents, "Incidencias"), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        return StreamingResponse(service.to_pdf(incidents, "Incidencias"), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})
    elif format == "json":
        return StreamingResponse(service.to_json(incidents), media_type="application/json", headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        return StreamingResponse(service.to_xml(incidents, "incidents"), media_type="application/xml", headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


@router.get("/logs/{format}")
async def export_logs(request: Request, format: str, date_from: Optional[str] = None, date_to: Optional[str] = None):
    service = get_export_service(request)
    logs = await service.get_logs(date_from, date_to)
    filename = f"logs_{datetime.now().strftime('%Y%m%d')}"
    if format == "csv":
        return StreamingResponse(service.to_csv(logs), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        return StreamingResponse(service.to_excel(logs, "Logs"), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "json":
        return StreamingResponse(service.to_json(logs), media_type="application/json", headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        return StreamingResponse(service.to_xml(logs, "logs"), media_type="application/xml", headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


@router.get("/users/{format}")
async def export_users(request: Request, format: str):
    service = get_export_service(request)
    users = await service.get_users()
    filename = f"usuarios_{datetime.now().strftime('%Y%m%d')}"
    if format == "csv":
        return StreamingResponse(service.to_csv(users), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        return StreamingResponse(service.to_excel(users, "Usuarios"), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        return StreamingResponse(service.to_pdf(users, "Usuarios"), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})
    elif format == "json":
        return StreamingResponse(service.to_json(users), media_type="application/json", headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        return StreamingResponse(service.to_xml(users, "users"), media_type="application/xml", headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


@router.get("/organizations/{format}")
async def export_organizations(request: Request, format: str):
    service = get_export_service(request)
    data = await service.get_organizations()
    flat_data = data.get('organizations', [])
    filename = f"organizaciones_{datetime.now().strftime('%Y%m%d')}"
    if format == "csv":
        return StreamingResponse(service.to_csv(flat_data), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "excel":
        return StreamingResponse(service.to_excel(flat_data, "Organizaciones"), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        return StreamingResponse(service.to_pdf(flat_data, "Organizaciones"), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})
    elif format == "json":
        return StreamingResponse(service.to_json(data), media_type="application/json", headers={"Content-Disposition": f"attachment; filename={filename}.json"})
    elif format == "xml":
        return StreamingResponse(service.to_xml(data, "organizations"), media_type="application/xml", headers={"Content-Disposition": f"attachment; filename={filename}.xml"})
    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


@router.get("/complete/{format}")
async def export_complete(request: Request, format: str, organization_id: Optional[str] = None):
    service = get_export_service(request)
    filename = f"backup_completo_{datetime.now().strftime('%Y%m%d')}"
    try:
        output = await service.export_complete(format, organization_id)
        mime_types = {"json": "application/json", "xml": "application/xml", "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        extensions = {"json": "json", "xml": "xml", "excel": "xlsx"}
        return StreamingResponse(output, media_type=mime_types.get(format, "application/octet-stream"),
            headers={"Content-Disposition": f"attachment; filename={filename}.{extensions.get(format, format)}"})
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@backup_router.get("/config")
async def get_backup_config(request: Request):
    service = get_backup_service(request)
    return await service.get_config()


@backup_router.post("/config")
async def save_backup_config(request: Request, config: BackupConfigRequest):
    service = get_backup_service(request)
    return await service.save_config(config.dict())


@backup_router.post("/run")
async def run_backup(request: Request):
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
async def list_backups(request: Request):
    service = get_backup_service(request)
    return await service.list_backups()


@backup_router.get("/download/{filename}")
async def download_backup(request: Request, filename: str):
    service = get_backup_service(request)
    try:
        file_path = await service.download_backup(filename)
        def iterfile():
            with open(file_path, 'rb') as f:
                while chunk := f.read(8192):
                    yield chunk
        return StreamingResponse(iterfile(), media_type="application/gzip",
            headers={"Content-Disposition": f"attachment; filename={filename}"})
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Backup not found")


@backup_router.delete("/{filename}")
async def delete_backup(request: Request, filename: str):
    service = get_backup_service(request)
    if await service.delete_backup(filename):
        return {"success": True, "message": "Backup deleted"}
    raise HTTPException(status_code=404, detail="Backup not found")
EXPORT_ROUTES_EOF

# Update server.py to include new routes
echo "[5/5] Actualizando server.py..."

# Check if export_routes is already imported
if ! grep -q "from routes.export_routes import" "$BACKEND_DIR/server.py"; then
    # Add import after the last route import
    sed -i '/^from routes\./a from routes.export_routes import router as export_router, backup_router' "$BACKEND_DIR/server.py"
    
    # Add router includes
    sed -i '/app.include_router.*dahua_router/a app.include_router(export_router, prefix="/api")\napp.include_router(backup_router, prefix="/api")' "$BACKEND_DIR/server.py"
fi

echo ""
echo "=========================================="
echo "  ¡Backend instalado correctamente!"
echo "=========================================="
echo ""
echo "Reinicia el backend:"
echo "  sudo systemctl restart siempria-backend"
echo ""
echo "O si usas supervisor:"
echo "  sudo supervisorctl restart backend"
echo ""
