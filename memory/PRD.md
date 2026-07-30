# Siempria Monitor - PRD & Estado

## Arquitectura
- **Monitor Backend**: FastAPI @ `/opt/siempria-monitor/backend/` — systemd: `siempria-backend` (puerto 8001)
- **Monitor Frontend**: React @ `/opt/siempria-monitor/frontend/` — `npm run build`
- **Conteo Backend**: FastAPI @ `/opt/siempria-conteo/backend/` — nohup uvicorn (puerto 8002)
- **Conteo Frontend**: `/opt/siempria-conteo/frontend/build/`
- **DB**: MongoDB (`siempria_monitor`, `siempria_conteo`)
- **Cloudflare Tunnel**: `siempria-tunnel` (ID: `7d0bc7d9-e2bc-4e00-b88f-d30799fe7d45`) — systemd: `cloudflared`
- **Dominios**: monitor.siempriapp.com, conteo.siempriapp.com, siempriapp.com, www.siempriapp.com

## Multi-tenancy - Archivos Parcheados (30 Jul 2026)

### ✅ Filtrado completo:
- devices.py — CRA endpoints con `_tenant_filter_cra`, listings filtrados
- incidents.py — list + stats filtrados con `build_device_filter`
- ai_analysis.py — 4 endpoints (predictions, anomalies, smart-alerts, daily-summary)
- settings.py — /system-status device counts filtrados
- infrastructure.py — bug `await` corregido en `should_filter_by_tenant`
- camera_stream.py — `_check_device_access` guard + listings filtrados
- cra_events.py — events filtrados por IPs accesibles del tenant
- device_images.py — images filtradas por device_id del tenant
- organizations.py, users.py, dahua.py, brand_statistics.py, device_photos.py, vpn.py — ya tenían filtrado

### 🟡 Import añadido (filtrado básico via feature flags):
- statistics.py, sla_reports.py, logs.py

### 🟢 No necesitan filtrado (admin-only o por diseño):
- auth.py, superadmin*.py, tenant_*.py, backup.py, fail2ban.py, system_stats.py, billing.py, payments.py, security.py, two_factor.py, roles.py, jira.py, push_notifications.py, reports.py, upload.py, download*.py

### ❌ Pendiente:
- export_routes.py — auth rota (`Depends(lambda: None)`), necesita filtrado
- websocket.py — broadcast sin filtrar (bajo riesgo, solo system metrics)

## Conteo - Cambios (30 Jul 2026)
- ✅ Endpoint `/users/access-logs` creado
- ✅ Login logging en auth.py (graba en `access_logs` collection)
- ✅ Middleware HTTP logging en server.py

## Infraestructura (30 Jul 2026)
- ✅ Cloudflare Tunnel configurado y funcionando como servicio systemd
- ✅ DNS CNAME records para 4 subdominios vía tunnel
- ✅ `/etc/hosts` actualizado con conteo.siempriapp.com
- ✅ SSL Universal Certificate activo (*.siempriapp.com)

## Credenciales Test
- Tenant: boluda / Canarias@2020 (role: tenant_admin)

## Backlog
- (P1) Parchear export_routes.py con auth + filtrado tenant
- (P2) Filtrado profundo en statistics.py, sla_reports.py, logs.py queries
- (P2) Revisión predicción fallos/salud por tenant
- (P3) Refactorizar App.js monolito (+3900 líneas)
