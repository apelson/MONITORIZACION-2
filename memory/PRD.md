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
11. ✅ Maintenance Panel Improvements (DONE - 26 Feb 2026)
12. ✅ System Status Data Loading Fix (DONE - 26 Feb 2026)
13. ✅ Device Type Counter Filtering (DONE - 26 Feb 2026)

## What's Been Implemented (26 Feb 2026)

### Latest Changes (Session 2)

#### 1. Real-Time System Metrics via WebSocket
- Created new WebSocket endpoint `/api/ws/system-metrics`
- CPU and RAM metrics update every 2 seconds in real-time
- Automatic fallback to HTTP polling (3s) if WebSocket fails
- WebSocket reconnection on disconnect (5s delay)
- Visual ECG animation shows live system load

#### 2. Maintenance Panel Improvements (`MaintenancePanel.jsx`)
- Added search bar with placeholder "Buscar por nombre, IP, ubicación..."
- Implemented sorting: offline devices first, then by high latency, then alphabetically
- Excluded DVR/Dahua/NVR/grabador devices from the maintenance list
- Added device count display ("X dispositivos disponibles")
- Added visual indicators for offline (red) and high latency (orange) devices
- Improved ScrollArea with fixed height (450px) for proper scrolling

#### 2. System Status Data Loading Fix
- Fixed frontend API call: Changed from `/settings/system-status/quick` to `/system-status`
- Now correctly parses response: `res.data.system.cpu_percent` and `res.data.system.memory.percent`
- Header status bar displays real-time CPU% and RAM% values
- Data refreshes every 10 seconds

#### 3. Device Type Counter Filtering
- Confirmed working: Device type counters have `onClick={() => setFilterTypeId(data.typeId)}`
- Clicking on type counters (CAMERAS, NAS, etc.) filters the device list

### Backend
- **VPN Monitoring Routes** (`/app/backend/routes/vpn.py`)
- **System Stats Routes** (`/app/backend/routes/system_stats.py`)
- **Settings Routes** (`/app/backend/routes/settings.py`) - `/system-status` endpoint with psutil

### Frontend Components
- **VPNWidget** (`/app/frontend/src/components/noc/widgets/VPNWidget.jsx`)
- **SystemResourceMonitor** (`/app/frontend/src/components/common/SystemResourceMonitor.jsx`)
- **MaintenancePanel** (`/app/frontend/src/components/panels/MaintenancePanel.jsx`)
- **ServerCard** (`/app/frontend/src/components/devices/ServerCard.jsx`)

## Verified Features (Test Report: iteration_20.json)
- ✅ System status API returns CPU% and RAM%
- ✅ Header status bar displays real resource data
- ✅ MaintenancePanel has working search bar
- ✅ MaintenancePanel sorting logic works
- ✅ Device type counters filter device list
- ✅ Settings page loads correctly
- ✅ Login works with admin/admin123

## Architecture
- **Frontend:** React (`/app/frontend/`)
- **Backend:** FastAPI (`/app/backend/`)
- **Database:** MongoDB

## Key Files Modified This Session
- `/app/frontend/src/components/panels/MaintenancePanel.jsx` - Search, sort, DVR exclusion
- `/app/frontend/src/App.js` - Real-time WebSocket metrics (lines 2053-2132)
- `/app/backend/routes/settings.py` - System status endpoint
- `/app/backend/routes/websocket.py` - New `/ws/system-metrics` endpoint for real-time data

## Pending Issues
1. **Camera Preview Images** - Not loading in ServerCard. Backend endpoint works (curl verified), but frontend may have issues with authAxios prop passing or network calls. Needs browser Network tab debugging on user's production server.
2. **Device Type Counter Filter Verification** - User reported "no veo cambios" in previous session. Code is correct, but may need verification on production.

## Backlog / Future Tasks
- Infrastructure devices widget in NOC dashboard (ESXi, NAS monitoring)
- Improve PWA experience
- Create user documentation
- Refactoring of App.js (monolith - over 3500 lines)

## Credentials
- Admin user: admin / admin123
- Production user: admin / Spw@16071977

## Test Reports
- `/app/test_reports/iteration_20.json` - All tests passed (100% backend, 100% frontend)
