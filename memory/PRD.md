# PRD - Siempria Monitor (WatchTower)

## Problema Original
Plataforma SaaS de monitorización de red que requería multi-tenancy, acceso HTTPS externo, refactorización frontend, emails automáticos, logos de tenants y dashboard personalizado.

## Arquitectura
- **Frontend Monitor**: `/opt/siempria-monitor/frontend/` (React + CRA + craco)
- **Backend Monitor**: `/opt/siempria-monitor/backend/` (FastAPI, Python 3.12, puerto 8001)
- **Frontend/Backend Conteo**: `/opt/siempria-conteo/` (FastAPI, puerto 8002)
- **Base de Datos**: MongoDB local (27017)
- **Acceso externo**: Cloudflare Tunnel (monitor.siempriapp.com, conteo.siempriapp.com)
- **Email SMTP**: siempria-com.correoseguro.dinaserver.com:465 (conteo@siempria.com)

## Completado

### Multi-Tenancy Backend (DONE - Jul 2026)
- Aislamiento en 17 archivos backend
- `multitenancy_service.py` con `build_device_filter()` y `should_filter_by_tenant()`

### Cloudflare Tunnel (DONE - Jul 2026)
- Dominios: monitor.siempriapp.com, conteo.siempriapp.com

### Conteo Backend Service (DONE - Jul 2026)
- systemd service, access logs con IP real

### Email SMTP (DONE - Ago 2026)
- Credenciales: conteo@siempria.com vía SMTPS 465
- `send_email_generic` con soporte de adjuntos PDF
- Test email enviado exitosamente

### Emails Automáticos con PDF SLA (DONE - Ago 2026)
- `generate_and_send_report()` mejorado con:
  - Template HTML profesional con logo/color de organización
  - PDF SLA adjunto automáticamente (via sla_report_generator)
  - Tabla de dispositivos offline incluida
  - Soporte por organización (genera 1 email por org)
- 10 emails enviados exitosamente con PDFs adjuntos
- Scheduler APScheduler configurado (8:00 AM diario)
- Endpoint `/api/scheduled-reports/send-now` para envío manual

### Logos de Tenant en PDFs (DONE - Ago 2026)
- Cabecera PDF SLA con logo y color de organización
- Resolución automática logo_url → archivo físico
- Fallback a texto cuando no hay logo

### Logos en Interfaz (DONE - Ago 2026)
- Color dots + logos en dropdown de organizaciones
- Color dots en dropdown de grupos (color de su org padre)
- Banner con logo/nombre/ciudad de la org cuando se filtra

### Refactorización Frontend App.js (IN PROGRESS - Ago 2026)
**Progreso: 3944 → 2425 líneas (39% reducido)**

| Fase | Componentes | Ubicación |
|------|------------|-----------|
| 1 | PWAInstallPrompt, LoadingScreen | common/ |
| 2 | AuthContext | contexts/ |
| 3 | SecurityPanel | panels/ |
| 4 | DeviceFormDialog, OrganizationFormDialog | dialogs/ |
| 5 | GroupFormDialog, UserFormDialog | dialogs/ |
| 6 | DeviceTypeFormDialog, HistoryDialog, DeleteConfirmDialog, FailuresDialog | dialogs/ |
| 7 | PublicDashboardConfig, LoadingSkeleton, SectionLoading | panels/, common/ |

## Backlog

### P1 - Dashboard Personalizado por Tenant
- Tenant isolation ya funciona (backend)
- Logos ya se muestran en filtros (frontend)
- Falta: personalización visual más profunda del dashboard por tenant

### P2 - Usuarios Tenant Admin Adicionales
- Crear múltiples tenant_admin para nuevos clientes

### P2 - Continuar Refactorización
- Descomponer AppContent (~2000 líneas restantes)
- Code splitting para reducir bundle (686KB gzip)

### P3 - Fix SVG logos en PDFs
- TIMELAPSE org tiene logo SVG que ReportLab no soporta
- Convertir SVG a PNG al subir, o usar svglib

## Notas Técnicas
- Build: `cd /opt/siempria-monitor/frontend && npm run build`
- Restart backend: `sudo systemctl restart siempria-backend`
- Admin password reseteada a `Spw@1644` vía passlib/bcrypt
- Cambios se aplican via scripts SSH (agente sin acceso directo a VM)
