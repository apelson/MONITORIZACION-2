# Siempria Network Monitor - Product Requirements Document

## Original Problem Statement
Build and deploy "Siempria Network Monitor," a full-stack network monitoring application pivoted into a multi-tenant SaaS platform named "Siempriapp." The application monitors Mobotix cameras, VMware ESXi servers, QNAP, Synology NAS devices, and OpenVPN servers.

## User Personas
- **Network Administrators**: Monitor cameras and infrastructure devices
- **IT Managers**: View statistics, alerts, incidents, and reports
- **End Users**: Access public dashboards (planned)

## Core Requirements
- Multi-language support (ES, EN, DE, FR, IT, RU, ZH)
- Real-time device monitoring with alerts
- Infrastructure monitoring (ESXi, QNAP, Synology, OpenVPN)
- NAS connection alerts for cameras
- Audible alerts for critical events
- Email notifications via SMTP
- Push/Web notifications for real-time alerts
- FTP status monitoring for CRA devices
- Hemispheric camera view support

## Architecture
```
/app/
├── backend/              # FastAPI
│   ├── server.py         # Main server
│   ├── routes/           # API endpoints
│   │   ├── devices.py    # Device CRUD + alerts + CRA
│   │   ├── camera_stream.py  # FTP status, hemispheric views
│   │   ├── infrastructure.py  # ESXi/QNAP/Synology/OpenVPN
│   │   ├── billing.py    # Stripe payments
│   │   └── ...
│   └── services/         
│       └── infrastructure_service.py  # ESXi, QNAP, Synology, OpenVPN services
└── frontend/             # React + Craco
    ├── src/
    │   ├── App.js        # Main component (~6200 lines)
    │   ├── contexts/     # AuthContext
    │   ├── hooks/        # useNotifications
    │   ├── services/     # NotificationService
    │   └── components/   # UI components
    │       ├── auth/     # LoginPage
    │       ├── common/   # StatusBadges, CRAFloatingButton
    │       ├── panels/   # CRADashboard, LiveViewer, InfrastructurePanel
    │       └── settings/ # NotificationSettings
```

## What's Been Implemented

### Session: 2026-02-08 (Current - FTP Status, Hemispheric View, Live View Button)
- ✅ **FTP Status Badge in CRA Dashboard**: 
  - Shows "ARMADO" (green) when FTP is enabled or "DESARMADO" (orange) when disabled
  - Fetches status from `/api/camera-stream/ftp-status/{device_id}` endpoint
  - Tooltip shows additional info (server address if available)
  - Click to retry on error state
  
- ✅ **Hemispheric Camera View in LiveViewer**:
  - Detects hemispheric cameras (C25, C26, Q25, S15 models)
  - Shows "360°" badge for hemispheric cameras
  - Three view modes: Normal (corrected), Fisheye (full circular), Panorama (360°)
  - Uses `/api/camera-stream/hemispheric/{device_id}?view=full|panorama` endpoint
  
- ✅ **Live View Button on Device Cards**:
  - New Video icon on camera cards (visible for online cameras)
  - Clicking navigates to "En Directo" tab
  - Icon appears in device action buttons row

- ✅ **CRADashboard Optimization**:
  - Independent `isFetchingRef` to avoid conflicts with global state
  - Fixed loading state handling
  - Added video icon for quick live view access

### Session: 2026-02-08 (Earlier - Code Cleanup & CRADashboard Fix)
- ✅ **CRADashboard Fix**: Fixed infinite loading issue caused by useCallback/useEffect dependency cycles
- ✅ **Component Extraction Started**:
  - Created `/components/common/PWAInstallPrompt.jsx`
  - Created `/components/devices/ServerCard.jsx`
  - Created `/components/devices/SortableCard.jsx`
  - Created `/components/dialogs/CommonDialogs.jsx`

### Previous Sessions
- ✅ **Dynamic API Configuration**: Created `src/config.js` for automatic URL detection
- ✅ **Organization Filter in Alerts**: Added dropdown to filter alerts by center/organization
- ✅ **System Status Dashboard**: New diagnostic dashboard in Settings
- ✅ **OpenVPN Monitoring Added**
- ✅ **Loading Bars for Tabs**
- ✅ All other infrastructure features (ESXi, QNAP, Synology, alerts, i18n, etc.)

## Prioritized Backlog

### P0 - Critical (Blocking)
- [ ] **DEPLOY TO PRODUCTION** - User must run deployment commands
  - Copy files to `/opt/siempria-monitor/`
  - Restart backend service with `sudo systemctl restart siempria-backend`
  - Build frontend with `yarn build`

### P1 - High Priority
- [ ] Test FTP status with real cameras that have FTP configured
- [ ] Test hemispheric view with real C25/C26 cameras
- [ ] Continue App.js Refactoring - Currently ~6200 lines, target <1000 lines each
  - [ ] Extract AlertsPanel component
  - [ ] Extract StatisticsPanel component

### P2 - Medium Priority
- [ ] Use optimized CRA endpoint `/api/cra/dashboard-data` in frontend
- [ ] Add DialogDescription to DeviceFormDialog (accessibility)
- [ ] Fix missing sound file `/sounds/cra-alert.mp3`

### P3 - Future/Backlog
- [ ] Stripe payment integration checkout flow
- [ ] Per-client subdomains
- [ ] Public dashboards UI
- [ ] Lazy loading for camera images

## Key API Endpoints

### CRA & Camera Stream
- `GET /api/cra/status` - CRA status summary
- `GET /api/cra/devices` - All CRA devices
- `GET /api/cra/alerts` - CRA alerts
- `GET /api/camera-stream/ftp-status/{device_id}` - FTP configuration status
- `GET /api/camera-stream/hemispheric/{device_id}?view=full|panorama` - Hemispheric view
- `GET /api/camera-stream/camera-config/{device_id}` - Full camera config
- `GET /api/camera-stream/snapshot/{device_id}` - Camera snapshot

### Standard Endpoints
- `POST /api/auth/login`
- `GET /api/devices`
- `GET /api/alerts`

## Production Environment
- **Development Source**: `/home/monitorizacion/Documentos/MONITORIZACION-main/`
- **Production Running**: `/opt/siempria-monitor/`
- **Domain**: siempriapp.com
- **CRITICAL**: Frontend needs `.env` with `REACT_APP_BACKEND_URL=https://siempriapp.com`

## Test Credentials
- Admin: `admin` / `Spw@16071977`
- ESXi: `root` / `Spw@16071977` @ `192.168.1.97`
- QNAP: `administrador` / `Spw@16071977` @ `192.168.1.3`

## Key Files Modified This Session
- `/app/frontend/src/components/panels/CRADashboard.jsx` - Added FTP status badge, live view button, fixed loading
- `/app/frontend/src/components/panels/LiveViewer.jsx` - Added hemispheric view modes (Normal/Fisheye/Panorama)
- `/app/frontend/src/App.js` - Added onOpenLiveView prop to ServerCard, Video icon button
- `/app/backend/routes/camera_stream.py` - FTP status endpoint, hemispheric view endpoint (already existed)

## Known Issues
- Global `fetchingRef` in App.js can block concurrent API calls - CRADashboard now has independent ref
- Production deployment requires manual file copying and service restart
