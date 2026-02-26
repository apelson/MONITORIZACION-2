# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. La plataforma permite monitorizar dispositivos de red, cámaras, grabadores DVR/NVR (Dahua), túneles VPN, y sistemas críticos (CRA).

## Product Requirements
1. ✅ JIRA Integration (DONE)
2. ✅ Dahua DVR Scheduler (5-min interval) (DONE)
3. ✅ Backup Functionality Fix (DONE)
4. ✅ Application Rebranding to "WatchTower by Siempria" (DONE)
5. ✅ Onboarding Wizard (DONE)
6. ✅ DVR Uptime Counter (DONE)
7. ✅ OpenVPN Monitoring (DONE - 26 Feb 2026)
8. ✅ Blank Screen Error Fix (DONE)
9. ✅ System Resource Monitor in NOC Header (DONE - 26 Feb 2026)
10. ✅ VPN Widget in NOC Dashboard (DONE - 26 Feb 2026)

## What's Been Implemented (26 Feb 2026)

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
  - CPU % con barra de progreso y colores semáforo
  - RAM % con barra de progreso
  - HDD % con barra de progreso
  - Network upload/download en KB/s o MB/s

- **NOCDashboard Updates**
  - Header con "WatchTower NOC by SIEMPRIA"
  - SystemResourceMonitor integrado en header
  - VPNWidget integrado en grid de widgets
  - Contador VPN añadido a la barra de estadísticas (10 columnas ahora)
  - Estado VPN con notificaciones de cambios

## Key Technical Details
- VPN monitoring via ping (no OpenVPN management interface needed)
- System stats usando psutil
- WebSocket broadcasts para actualizaciones en tiempo real
- Traducciones actualizadas en es/en

## Architecture
- **Frontend:** React (`/app/frontend/`)
- **Backend:** FastAPI (`/app/backend/`)
- **Database:** MongoDB

## Key Files Modified/Created
- `/app/backend/routes/vpn.py` (NEW)
- `/app/backend/routes/system_stats.py` (NEW)
- `/app/backend/server.py` (MODIFIED - routers + schedulers)
- `/app/frontend/src/components/noc/widgets/VPNWidget.jsx` (NEW)
- `/app/frontend/src/components/common/SystemResourceMonitor.jsx` (NEW)
- `/app/frontend/src/components/panels/NOCDashboard.jsx` (MODIFIED)
- `/app/frontend/src/locales/es/translation.json` (MODIFIED)
- `/app/frontend/src/locales/en/translation.json` (MODIFIED)

## Backlog / Future Tasks
- Improve PWA experience
- Create user documentation
- Refactoring of App.js and NOCDashboard.jsx (POSTPONED)

## Credentials
- Admin user: admin / admin123
