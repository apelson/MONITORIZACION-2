# Siempria Monitor - PRD & Estado

## Problema Original
Plataforma SaaS multi-tenant de monitorización de dispositivos (cámaras, servidores, infraestructura). Requiere aislamiento total entre tenants para que cada cliente vea solo sus propios datos.

## Arquitectura
- **Backend**: FastAPI (Python 3.12) en `/opt/siempria-monitor/backend/` — systemd: `siempria-backend`
- **Frontend**: React en `/opt/siempria-monitor/frontend/` — build con `npm run build`
- **DB**: MongoDB (`siempria_monitor`)
- **Conteo**: App separada en `/opt/siempria-conteo/` — puerto 8002 (nohup/uvicorn)
- **NGINX**: Proxy reverso en `/etc/nginx/sites-enabled/`
- **Cloudflare Tunnel**: `siempria-tunnel` (ID: `7d0bc7d9-e2bc-4e00-b88f-d30799fe7d45`)
- **Dominios**: `monitor.siempriapp.com`, `conteo.siempriapp.com`, `siempriapp.com`, `www.siempriapp.com`

## Multi-tenancy
- Servicio central: `services/multitenancy_service.py`
- Funciones: `should_filter_by_tenant()`, `build_device_filter()`, `build_organization_filter()`, `build_group_filter()`, `build_alert_filter()`
- Usuarios tenant: `role: "tenant_admin"`, `organization_ids: [...]`, `feature_flags: {...}`

## Credenciales Test
- Tenant: `boluda` / `Canarias@2020` (tenant_admin, organization_ids: [])

## Completado (30 Jul 2026)
- ✅ Overflow NOC 55" resuelto (CSS Grid)
- ✅ Feature flags en frontend (SECTION_TO_FLAG_MAP, canAccessSection)
- ✅ Toggle feature flags en SuperAdminTab
- ✅ CRA aislamiento total (devices.py _tenant_filter_cra)
- ✅ Incidencias aisladas (incidents.py stats + list)
- ✅ CRA floating button condicionado con canAccessSection('cra')
- ✅ Cloudflare Tunnel configurado para todos los subdominios
- ✅ conteo.siempriapp.com accesible externamente via tunnel
- ✅ monitor.siempriapp.com accesible externamente via tunnel
- ✅ ai_analysis.py parcheado (4 endpoints con filtrado tenant)
- ✅ infrastructure.py bug await corregido
- ✅ settings.py /system-status filtrado por tenant
- ✅ /etc/hosts actualizado con conteo.siempriapp.com
- ✅ Endpoint /users/access-logs añadido a conteo

## Auditoría Multi-Tenant - Archivos Pendientes (P1)
### 🔴 CRÍTICO (necesitan filtrado):
- camera_stream.py (20 endpoints, acceso a cámaras sin verificar tenant)
- export_routes.py (11 endpoints, exporta datos globales, auth rota)
- cra_events.py (7 endpoints, eventos CRA sin filtrar)
- device_images.py (6 endpoints, imágenes sin filtrar)
- statistics.py (4 endpoints, stats de cámaras ajenas)
- sla_reports.py (2 endpoints, SLA global)
- logs.py (9 endpoints, actividad global)
- websocket.py (broadcast sin filtrar por tenant)

### 🟢 NO necesitan filtrado:
- auth.py, superadmin*.py, tenant_*.py, backup.py, fail2ban.py, system_stats.py, billing.py, payments.py, security.py, two_factor.py, roles.py, jira.py, push_notifications.py, reports.py, upload.py, download*.py

## Backlog Futuro
- (P2) Revisión predicción de fallos/salud/anomalías por tenant  
- (P3) Refactorizar App.js monolito (+3900 líneas)
- Puerto 443 en router (alternativa a Cloudflare si se necesita acceso directo)
