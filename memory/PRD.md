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
│       └── infrastructure_service.py  # ESXi, QNAP, Synology, OpenVPN services
└── frontend/             # React + Craco
    ├── src/
    │   ├── App.js        # Main component (~6200 lines)
    │   ├── contexts/     # AuthContext
    │   ├── hooks/        # useNotifications
    │   ├── services/     # NotificationService
    │   └── components/   # UI components
    │       ├── auth/     # LoginPage
    │       ├── common/   # StatusBadges, CRAFloatingButton, LiveViewerFloatingButton
    │       ├── panels/   # CRADashboard, LiveViewer, InfrastructurePanel
    │       └── settings/ # NotificationSettings, RolesManager, SuperAdminTab
```

## What's Been Implemented

### Session: 2026-02-09

#### Role-Based Access Control (RBAC) ✅
- Backend API `/api/roles` with full CRUD operations
- 4 default system roles: Administrador, Técnico, Cliente, Operador CRA
- Granular permissions per section (devices, gallery, cra, live, statistics, alerts, users, settings, export, organizations, groups, reports, incidents, roles)
- Frontend `RolesManager.jsx` component for managing roles
- API `/api/roles/my-permissions` for fetching current user permissions
- Group and organization access control (all vs assigned)

#### CRA Dashboard Filters ✅
- ARMADO/DESARMADO filter buttons functional
- Filter shows devices by FTP status
- Device count updates based on filter selection

#### Floating Buttons Color Differentiation ✅
- **CRA Button**: Dynamic colors (green=OK, yellow=warning, red=alert)
- **En Directo Button**: Purple/violet gradient (`from-purple-600 to-violet-500`)

#### SuperAdmin Tab Integration ✅
- New "Super Admin" tab visible for admin users
- Foundation for multi-tenant management

#### Bug Fixes ✅
- Fixed duplicate `if (loading)` in CRADashboard.jsx (line 164-165)

### Previous Sessions
- FTP Status Badge in CRA Dashboard
- Hemispheric Camera View (360°, Fisheye, Panorama modes)
- Live View Button on Device Cards
- FTP History for Auditing
- CRADashboard Performance Optimization
- Dynamic API Configuration
- Organization Filter in Alerts
- System Status Dashboard
- OpenVPN Monitoring
- All infrastructure features (ESXi, QNAP, Synology, alerts, i18n, etc.)

## Prioritized Backlog

### P0 - Critical
- [x] RBAC system functional
- [x] CRA filters (ARMADO/DESARMADO) working
- [x] Floating button colors differentiated

### P1 - High Priority
- [ ] Global loading screen for sections that take >2 seconds
- [ ] Add `/sounds/cra-alert.mp3` file for alert audio
- [ ] Continue App.js Refactoring - Target <1000 lines each
  - [ ] Extract AlertsPanel component
  - [ ] Extract StatisticsPanel component

### P2 - Medium Priority
- [ ] Full Multi-Tenant (SaaS) Implementation
- [ ] Hemispheric camera improvements (user requested)
- [ ] Use optimized CRA endpoint `/api/cra/dashboard-data`
- [ ] Add DialogDescription to DeviceFormDialog (accessibility)

### P3 - Future/Backlog
- [ ] Stripe payment integration checkout flow
- [ ] Per-client subdomains
- [ ] Public dashboards UI
- [ ] Lazy loading for camera images
- [ ] Backend stability improvements

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
- `GET /api/camera-stream/ftp-history` - FTP change history (audit log)
- `GET /api/camera-stream/hemispheric/{device_id}?view=full|panorama` - Hemispheric view

### Standard Endpoints
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/devices`
- `GET /api/users`
- `GET /api/alerts`

## Database Collections
- `devices` - Device information
- `roles` - Role definitions and permissions
- `ftp_history` - FTP status change history
- `status_history` - Device status history
- `alerts` - System alerts
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
- ESXi: `root` / `Spw@16071977` @ `192.168.1.97`
- QNAP: `administrador` / `Spw@16071977` @ `192.168.1.3`

## Key Files Modified This Session
- `/app/frontend/src/components/panels/CRADashboard.jsx` - Fixed duplicate if statement
- `/app/frontend/src/components/common/LiveViewerFloatingButton.jsx` - Changed to purple/violet gradient
- `/app/backend/routes/roles.py` - RBAC API (verified working)
- `/app/frontend/src/components/settings/RolesManager.jsx` - Roles UI (verified working)

## Known Issues
- Missing `/sounds/cra-alert.mp3` file (404 error in console, LOW priority)
- Production deployment requires manual file copying and service restart
- App.js is ~6200 lines and needs refactoring
