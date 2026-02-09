# Siempria Network Monitor - Product Requirements Document

## Original Problem Statement
Build and deploy "Siempria Network Monitor," a full-stack network monitoring application pivoted into a multi-tenant SaaS platform named "Siempriapp." The application monitors Mobotix cameras, VMware ESXi servers, QNAP, Synology NAS devices, and OpenVPN servers.

## User Personas
- **Network Administrators**: Monitor cameras and infrastructure devices
- **IT Managers**: View statistics, alerts, incidents, and reports
- **End Users**: Access public dashboards (planned)
- **SuperAdmin**: Manage multiple company tenants (multi-tenant SaaS)

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
- Role-Based Access Control (RBAC)

## Architecture
```
/app/
├── backend/              # FastAPI
│   ├── server.py         # Main server
│   ├── routes/           # API endpoints
│   │   ├── devices.py    # Device CRUD + alerts + CRA
│   │   ├── camera_stream.py  # FTP status, hemispheric views, FTP history
│   │   ├── infrastructure.py  # ESXi/QNAP/Synology/OpenVPN
│   │   ├── roles.py      # RBAC system
│   │   ├── superadmin_integrated.py  # Multi-tenant SuperAdmin
│   │   └── ...
│   └── services/         
│       └── infrastructure_service.py
└── frontend/             # React + Craco
    ├── src/
    │   ├── App.js        # Main component (~6200 lines)
    │   ├── components/
    │   │   ├── common/   # SectionLoader, CRAFloatingButton, LiveViewerFloatingButton
    │   │   ├── panels/   # CRADashboard, LiveViewer, InfrastructurePanel
    │   │   └── settings/ # RolesManager, SuperAdminTab, NotificationSettings
    │   └── ...
    └── public/
        └── sounds/       # cra-alert.wav
```

## What's Been Implemented

### Session: 2026-02-09

#### Role-Based Access Control (RBAC) ✅
- Backend API `/api/roles` with full CRUD operations
- 4 default system roles: Administrador, Técnico, Cliente, Operador CRA
- Granular permissions per section
- Frontend `RolesManager.jsx` component for managing roles
- API `/api/roles/my-permissions` for fetching current user permissions

#### CRA Dashboard Filters ✅
- ARMADO/DESARMADO filter buttons functional
- Filter shows devices by FTP status
- Device count updates based on filter selection

#### Floating Buttons Color Differentiation ✅
- **CRA Button**: Dynamic colors (green=OK, yellow=warning, red=alert)
- **En Directo Button**: Purple/violet gradient

#### Global Section Loader ✅ (NEW)
- `SectionLoader.jsx` component created
- Shows loading overlay with company logo after 2 seconds of loading
- Integrated into Dashboard with `useDelayedLoading` hook
- Includes animated spinner, progress dots, and loading message

#### Sound Alert Fix ✅ (NEW)
- Fixed audio file format (was RIFF/WAV named as .mp3)
- Created proper `/sounds/cra-alert.wav` file
- Updated CRADashboard.jsx to use correct file extension

#### Bug Fixes ✅
- Fixed duplicate `if (loading)` in CRADashboard.jsx (line 164-165)

### Previous Sessions
- FTP Status Badge in CRA Dashboard
- Hemispheric Camera View (360°, Fisheye, Panorama modes)
- Live View Button on Device Cards
- FTP History for Auditing
- CRADashboard Performance Optimization
- All infrastructure features (ESXi, QNAP, Synology, alerts, i18n, etc.)

## Prioritized Backlog

### P0 - Critical
- [x] RBAC system functional
- [x] CRA filters (ARMADO/DESARMADO) working
- [x] Floating button colors differentiated
- [x] Global loading screen implemented
- [x] Sound alert file fixed

### P1 - High Priority
- [ ] Continue App.js Refactoring - Target <1000 lines each
  - [ ] Extract AlertsPanel component
  - [ ] Extract StatisticsPanel component
  - [ ] Extract DeviceFormDialog component

### P2 - Medium Priority
- [ ] Full Multi-Tenant (SaaS) Implementation
- [ ] Hemispheric camera improvements (user requested)
- [ ] Backend stability improvements

### P3 - Future/Backlog
- [ ] Stripe payment integration checkout flow
- [ ] Per-client subdomains
- [ ] Public dashboards UI
- [ ] Lazy loading for camera images
- [ ] Public domain access fix (siempriapp.com)

## Key API Endpoints

### Roles & Permissions
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create new role
- `GET /api/roles/my-permissions` - Get current user permissions
- `GET /api/roles/available-permissions` - Get all available permissions
- `PUT /api/roles/{role_id}` - Update role
- `DELETE /api/roles/{role_id}` - Delete role

### CRA & Camera Stream
- `GET /api/cra/status` - CRA status summary
- `GET /api/cra/devices` - All CRA devices
- `GET /api/cra/alerts` - CRA alerts
- `GET /api/camera-stream/ftp-status/{device_id}` - FTP configuration status
- `GET /api/camera-stream/ftp-status-batch` - Batch FTP status

## Database Collections
- `devices` - Device information
- `roles` - Role definitions and permissions
- `ftp_history` - FTP status change history
- `users` - User accounts (includes role_id)
- `organizations` - Multi-tenant organizations
- `groups` - Device groups

## Production Environment
- **Development Source**: `/home/monitorizacion/Documentos/MONITORIZACION-main/`
- **Production Running**: `/opt/siempria-monitor/`
- **Domain**: siempriapp.com
- **CRITICAL**: Frontend needs `.env` with `REACT_APP_BACKEND_URL=https://siempriapp.com`

## Test Credentials
- Admin: `admin` / `Spw@16071977`
- Operador: `operador` / `operador`
- Tecnico: `tecnico` / `tecnico123`

## Key Files Modified This Session
- `/app/frontend/src/App.js` - Added SectionLoader import and integration
- `/app/frontend/src/components/common/SectionLoader.jsx` - NEW: Global loading component
- `/app/frontend/src/components/panels/CRADashboard.jsx` - Fixed duplicate if, updated audio path
- `/app/frontend/src/components/common/LiveViewerFloatingButton.jsx` - Changed to purple/violet
- `/app/frontend/public/sounds/cra-alert.wav` - NEW: Proper WAV format audio

## Production Update Commands
```bash
# Connect to production server
ssh usuario@siempriapp.com
cd /opt/siempria-monitor

# Download updated files
curl -o frontend/src/components/panels/CRADashboard.jsx "https://cra-perf-test.preview.emergentagent.com/api/download-file?path=CRADashboard.jsx"
curl -o frontend/src/components/common/LiveViewerFloatingButton.jsx "https://cra-perf-test.preview.emergentagent.com/api/download-file?path=LiveViewerFloatingButton.jsx"

# Copy SectionLoader (new file)
# You'll need to create this file manually or use the download endpoint

# Rebuild frontend
cd frontend
yarn build

# Restart services
sudo systemctl restart siempria-backend
sudo systemctl reload nginx
```
