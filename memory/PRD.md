# Siempria Monitor - PRD & Estado

## Arquitectura
- **Monitor Backend**: FastAPI @ `/opt/siempria-monitor/backend/` — systemd: `siempria-backend` (puerto 8001)
- **Monitor Frontend**: React @ `/opt/siempria-monitor/frontend/` — `npm run build`
- **Conteo Backend**: FastAPI @ `/opt/siempria-conteo/backend/` — systemd: `siempria-conteo` (puerto 8002)
- **Conteo Frontend**: `/opt/siempria-conteo/frontend/build/`
- **DB**: MongoDB (`siempria_monitor`, `siempria_conteo`)
- **Cloudflare Tunnel**: `siempria-tunnel` (ID: `7d0bc7d9-e2bc-4e00-b88f-d30799fe7d45`) — systemd: `cloudflared`
- **Dominios**: monitor.siempriapp.com, conteo.siempriapp.com, siempriapp.com, www.siempriapp.com

## Multi-tenancy — Auditoría Completada (30 Jul 2026)

### ✅ Filtrado completo (17 archivos):
- devices.py — CRA endpoints con `_tenant_filter_cra`, device listings
- incidents.py — list + stats con `build_device_filter`
- ai_analysis.py — predictions, anomalies, smart-alerts, daily-summary
- settings.py — /system-status device counts
- infrastructure.py — bug `await` corregido
- camera_stream.py — `_check_device_access` guard + camera listings
- cra_events.py — events filtrados por IPs accesibles del tenant
- device_images.py — images filtradas por device_id
- export_routes.py — auth rota corregida (lambda→get_current_user) + Depends
- statistics.py — device access check en camera endpoints
- sla_reports.py — tenant filter en device query
- organizations.py, users.py, dahua.py, brand_statistics.py, device_photos.py, vpn.py — ya tenían filtrado
- logs.py — admin-only (require_role), import añadido

### 🟢 No necesitan filtrado:
- auth.py, superadmin*.py, tenant_*.py, backup.py, fail2ban.py, system_stats.py, billing.py, payments.py, security.py, two_factor.py, roles.py, jira.py, push_notifications.py, reports.py, upload.py, download*.py

### ⚠️ Menor:
- websocket.py — broadcast system metrics (bajo riesgo, no data de dispositivos)
- sla_reports.py — genera 500 (posible issue preexistente con generación PDF)

## Tenant: boluda
- **Organizaciones**: Terminal Tenerife (`a1b4584f-...`), Terminal La Palma (`440a68ad-...`)
- **Grupos**: General - Terminal Tenerife, General - Terminal La Palma
- **Feature flags**: devices, structure, types, alerts, gallery, dahua, users, incidents, map, mydashboard, settings, noc = true

## Conteo
- ✅ Endpoint `/users/access-logs` creado
- ✅ Login logging en auth.py
- ✅ Servicio systemd: `siempria-conteo`

## Infraestructura
- ✅ Cloudflare Tunnel (systemd: `cloudflared`)
- ✅ SSL Universal Certificate (*.siempriapp.com)
- ✅ `/etc/hosts` con conteo.siempriapp.com

## Backlog
- (P2) SLA Reports 500 error — investigar generación PDF
- (P3) Refactorizar App.js monolito (+3900 líneas)
