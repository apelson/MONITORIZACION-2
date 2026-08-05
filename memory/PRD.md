# PRD - Siempria Monitor (WatchTower)

## Problema Original
Plataforma SaaS de monitorización de red (siempria-monitor) que requería:
- Aislamiento total de datos multi-tenant
- Acceso HTTPS externo via Cloudflare Tunnel
- Refactorización del monolito frontend (App.js +3900 líneas)
- Dashboards personalizados por tenant
- Envío de informes/reportes por email
- Logos de empresas en tenants (PDFs, emails, interfaz)

## Arquitectura
- **Frontend Monitor**: `/opt/siempria-monitor/frontend/` (React + CRA + craco)
- **Backend Monitor**: `/opt/siempria-monitor/backend/` (FastAPI, Python 3.12, puerto 8001)
- **Frontend Conteo**: `/opt/siempria-conteo/frontend/`
- **Backend Conteo**: `/opt/siempria-conteo/backend/` (FastAPI, puerto 8002)
- **Base de Datos**: MongoDB local (27017)
- **Acceso externo**: Cloudflare Tunnel (monitor.siempriapp.com, conteo.siempriapp.com)

## Completado

### Multi-Tenancy (DONE - Jul 2026)
- Aislamiento en 17 archivos backend (devices, incidents, ai_analysis, settings, infrastructure, camera_stream, cra_events, device_images, export_routes, statistics, sla_reports, etc.)
- `multitenancy_service.py` con `build_device_filter()` y `should_filter_by_tenant()`
- Usuario `boluda` (tenant_admin) ya no ve datos de otros tenants

### Cloudflare Tunnel (DONE - Jul 2026)
- Daemon `cloudflared` instalado y activo
- Dominios: `monitor.siempriapp.com`, `conteo.siempriapp.com`
- Tráfico HTTPS 443 → localhost (8001/8002)

### Backend Conteo (DONE - Jul 2026)
- Servicio systemd `siempria-conteo.service` (puerto 8002)
- Middleware de access logs con IP real
- Endpoint `/users/access-logs`

### Correcciones Backend (DONE - Jul 2026)
- Fix Error 500 PDF SLA Reports (ReportLab)
- Caché MongoDB limitada a 4GB en `/etc/mongod.conf`
- Cronjob reinicio nocturno 3:30 AM

### Email SMTP (DONE - Ago 2026)
- Credenciales actualizadas a `conteo@siempria.com`
- Servidor: `siempria-com.correoseguro.dinaserver.com` (SMTPS 465)
- Email de prueba enviado exitosamente a `network@siempria.com`
- Servicio email_service.py funcional con send_test_email, send_email_generic

### Logos de Tenant en PDFs (DONE - Ago 2026)
- `sla_report_service.py` actualizado: cabecera PDF incluye logo de la organización
- `sla_reports.py` (ruta): resuelve logo_url → archivo físico en /uploads/
- Color de organización aplicado al título y línea decorativa del PDF
- Fallback a texto "SIEMPRIA" cuando no hay logo

### Refactorización Frontend App.js (IN PROGRESS - Ago 2026)
**Progreso: 3944 → 2405 líneas (39% reducido, 1539 líneas extraídas)**

| Fase | Componentes Extraídos | Ubicación | Líneas |
|------|----------------------|-----------|--------|
| 1 | PWAInstallPrompt, LoadingScreen | components/common/ | ~220 |
| 2 | AuthContext | contexts/ | ~210 |
| 3 | SecurityPanel | components/panels/ | ~200 |
| 4 | DeviceFormDialog, OrganizationFormDialog | components/dialogs/ | ~445 |
| 5 | GroupFormDialog, UserFormDialog | components/dialogs/ | ~148 |
| 6 | DeviceTypeFormDialog, HistoryDialog, DeleteConfirmDialog, FailuresDialog | components/dialogs/ | ~176 |
| 7 | PublicDashboardConfig, LoadingSkeleton, SectionLoading | components/panels/, components/common/ | ~171 |

**Restante por extraer:**
- Bloque principal Dashboard/AppContent (~2000 líneas) - requiere análisis cuidadoso
- Funciones utilitarias inline (getSingleWhatsAppLink, handleExport, etc.)

## Backlog (Priorizado)

### P1 - Dashboard Personalizado por Tenant
- "Mi Dashboard" carga solo widgets/estadísticas del tenant autenticado
- Layout personalizable por organización

### P2 - Usuarios Tenant Admin Adicionales
- Crear múltiples usuarios tenant_admin para clientes nuevos

### P2 - Mejoras Email
- Envío automático de informes SLA por email
- Templates personalizados con logo del tenant en emails
- Alertas por email con branding del tenant

### P3 - Continuar Refactorización
- Descomponer el bloque principal AppContent (2000+ líneas)
- Code splitting para reducir bundle size (686KB gzip)

## Credenciales SMTP
- Servidor: siempria-com.correoseguro.dinaserver.com
- Puerto: 465 (SMTPS)
- Usuario: conteo@siempria.com
- Destinatario alertas: network@siempria.com

## Notas Técnicas
- Build frontend: `cd /opt/siempria-monitor/frontend && npm run build`
- Restart backend: `sudo systemctl restart siempria-backend`
- Los cambios se aplican en la VM del cliente vía scripts SSH (el agente no tiene acceso directo)
- Backups automáticos creados antes de cada fase de refactorización
