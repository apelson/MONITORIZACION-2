# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. La plataforma permite monitorizar dispositivos de red, cámaras, grabadores DVR/NVR (Dahua), túneles VPN, y sistemas críticos (CRA).

## Product Requirements
1. ✅ JIRA Integration (DONE)
2. ✅ Dahua DVR Scheduler (5-min interval) (DONE)
3. ✅ Backup Functionality Fix (DONE)
4. ✅ Application Rebranding to "WatchTower by Siempria" (DONE - 26 Feb 2026)
5. ✅ Onboarding Wizard (DONE)
6. ✅ DVR Uptime Counter (DONE)
7. ✅ OpenVPN Monitoring (DONE - 26 Feb 2026)
8. ✅ Blank Screen Error Fix (DONE)
9. ✅ System Resource Monitor in NOC Header (DONE - 26 Feb 2026)
10. ✅ VPN Widget in NOC Dashboard (DONE - 26 Feb 2026)

## What's Been Implemented (26 Feb 2026)

### Rebranding - WatchTower by SIEMPRIA
- Main header: "WatchTower" + "by SIEMPRIA"
- NOC Dashboard header: "WatchTower NOC by SIEMPRIA" + "Centro de Operaciones de Red 24/7"
- Footer: "WatchTower by Siempria"
- WhatsApp/Telegram alerts: Updated messaging
- Loading screen: Updated branding

### Backend
- **VPN Monitoring Routes** (`/app/backend/routes/vpn.py`)
  - GET `/api/vpn/devices` - Lista todos los dispositivos VPN
  - GET `/api/vpn/status` - Estado y resumen de VPNs
  - POST `/api/vpn/devices` - Crear dispositivo VPN
  - PUT `/api/vpn/devices/{id}` - Actualizar dispositivo VPN
  - DELETE `/api/vpn/devices/{id}` - Eliminar dispositivo VPN
  - POST `/api/vpn/devices/{id}/check` - Verificar un dispositivo específico
  - POST `/api/vpn/check-all` - Verificar todos los dispositivos VPN

- **System Stats Routes** (`/app/backend/routes/system_stats.py`)
  - GET `/api/system/stats` - CPU, RAM, HDD, Network stats en tiempo real

- **Schedulers en server.py**
  - Dahua devices check cada 5 minutos
  - VPN devices check cada 5 minutos (ping monitoring)

### Frontend
- **VPNWidget** (`/app/frontend/src/components/noc/widgets/VPNWidget.jsx`)
  - Muestra túneles VPN online/offline
  - Indicadores visuales con colores (verde/rojo)
  - Refresh manual y automático cada minuto
  - Notificaciones toast cuando cambia estado

- **SystemResourceMonitor** (`/app/frontend/src/components/common/SystemResourceMonitor.jsx`)
  - CPU % con barra de progreso horizontal y colores semáforo
  - RAM % con barra de progreso horizontal
  - HDD % con barra de progreso horizontal
  - Network upload/download en formato decimal

- **NOCDashboard Updates**
  - Header con "WatchTower NOC by SIEMPRIA" + subtítulo
  - SystemResourceMonitor integrado en header (estilo producción)
  - VPNWidget integrado en grid de widgets
  - Contador VPN añadido a la barra de estadísticas (10 columnas)
  - Estado VPN con notificaciones de cambios

## Verified Features
- ✅ JIRA Integration in Settings > Integraciones > JIRA
- ✅ Super Admin panel with tenant management
- ✅ Grabadores section with Dahua P2P
- ✅ All existing widgets functional

## Architecture
- **Frontend:** React (`/app/frontend/`)
- **Backend:** FastAPI (`/app/backend/`)
- **Database:** MongoDB

## Key Files Modified/Created
- `/app/backend/routes/vpn.py` (NEW)
- `/app/backend/routes/system_stats.py` (NEW)
- `/app/backend/server.py` (MODIFIED - routers + schedulers)
- `/app/frontend/src/components/noc/widgets/VPNWidget.jsx` (NEW)
- `/app/frontend/src/components/common/SystemResourceMonitor.jsx` (MODIFIED - production style)
- `/app/frontend/src/components/panels/NOCDashboard.jsx` (MODIFIED - header + VPN widget)
- `/app/frontend/src/App.js` (MODIFIED - rebranding)
- `/app/frontend/src/locales/es/translation.json` (MODIFIED - NOC title)
- `/app/frontend/src/locales/en/translation.json` (MODIFIED - NOC title)

## Backlog / Future Tasks
- Improve PWA experience
- Create user documentation
- Refactoring of App.js and NOCDashboard.jsx (POSTPONED)

## Credentials
- Admin user: admin / admin123
