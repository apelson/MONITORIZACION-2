# Siempria Monitor - PRD & Estado Final

## Arquitectura
- **Monitor Backend**: FastAPI @ `/opt/siempria-monitor/backend/` — systemd: `siempria-backend` (8001)
- **Monitor Frontend**: React @ `/opt/siempria-monitor/frontend/` — `npm run build`
- **Conteo Backend**: FastAPI @ `/opt/siempria-conteo/backend/` — systemd: `siempria-conteo` (8002)
- **DB**: MongoDB (`siempria_monitor`, `siempria_conteo`)
- **Cloudflare Tunnel**: `siempria-tunnel` (7d0bc7d9-e2bc-4e00-b88f-d30799fe7d45) — systemd: `cloudflared`
- **Mantenimiento**: cron 3:30 AM → `/opt/siempria-monitor/maintenance.sh`
- **Dominios**: monitor.siempriapp.com, conteo.siempriapp.com, siempriapp.com, www.siempriapp.com

## Multi-tenancy — Auditoría Completada (30 Jul 2026)
17 archivos con filtrado: devices.py, incidents.py, ai_analysis.py, settings.py, infrastructure.py, camera_stream.py, cra_events.py, device_images.py, export_routes.py, statistics.py, sla_reports.py, organizations.py, users.py, dahua.py, brand_statistics.py, device_photos.py, vpn.py

## Tenant: boluda (Canarias@2020)
- Orgs: Terminal Tenerife, Terminal La Palma
- Grupos: General - Terminal Tenerife, General - Terminal La Palma

## Infraestructura
- Cloudflare Tunnel (systemd), SSL Universal, cron 3:30 AM restart
- Conteo como servicio systemd: `siempria-conteo`
- SLA Reports PDF corregido (append→_add helper)

## Backlog
- (P3) Refactorizar App.js monolito (+3900 líneas)
