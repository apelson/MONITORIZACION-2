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
- Hemispheric camera view support (all models)
- Role-Based Access Control (RBAC)

## Architecture
```
/app/
├── backend/              # FastAPI
│   ├── server.py         # Main server (~820 lines)
│   ├── routes/           # API endpoints
│   └── services/         
└── frontend/             # React + Craco
    ├── src/
    │   ├── App.js        # Main component (~4518 lines, refactored from 6463)
    │   ├── contexts/     # AuthContext
    │   ├── components/
    │   │   ├── common/   # SectionLoader, CRAFloatingButton, LiveViewerFloatingButton
    │   │   ├── panels/   # AlertsPanel, StatisticsPanel, IncidentsPanel, AccessLogsPanel, CRADashboard, LiveViewer, InfrastructurePanel
    │   │   └── settings/ # RolesManager, SuperAdminTab, NotificationSettings
    │   └── ...
    └── public/
        └── sounds/       # cra-alert.wav
```

## What's Been Implemented

### Session: 2026-02-10

#### Refactorización App.js - Fase 2 ✅
- **AccessLogsPanel extraído** - ~406 líneas movidas a `/components/panels/AccessLogsPanel.jsx`
- App.js reducido de 4924 líneas a 4518 líneas (-406 líneas)
- Componente recibe `authAxios` como prop
- Funcionalidades preservadas: stats cards, alertas de seguridad, tabla de logs, filtros, exportación CSV
- Testing agent verificó funcionamiento: 100% tests pasados

### Session: 2026-02-09

#### Refactorización App.js - Fase 1 ✅
- **AlertsPanel extraído** - ~630 líneas movidas a `/components/panels/AlertsPanel.jsx`
- **StatisticsPanel extraído** - componente de estadísticas
- **IncidentsPanel extraído** - componente de incidentes
- App.js reducido de 6463 líneas a 4924 líneas
- Componente independiente con props: `alerts, organizations, devices, groups, authAxios`

#### Soporte Cámaras Hemisféricas Ampliado ✅
- Ahora incluye todos los modelos: **C25, C26, Q24, Q25, Q26, S14, S15, S16, M25, M26**
- Actualizado en:
  - `App.js` - DeviceCard component
  - `LiveViewer.jsx` - Live view panel

#### Global Section Loader ✅
- `SectionLoader.jsx` component created
- Shows loading overlay with company logo after 2 seconds
- `useDelayedLoading` hook for integration

#### Sound Alert Fix ✅
- Fixed audio file format (.wav)
- CRADashboard.jsx updated

#### Bug Fixes ✅
- Fixed duplicate `if (loading)` in CRADashboard.jsx
- Fixed AlertsPanel AuthContext issue

### Previous Sessions
- Role-Based Access Control (RBAC)
- CRA Dashboard filters (ARMADO/DESARMADO)
- Floating buttons color differentiation
- FTP Status Badge in CRA Dashboard
- All infrastructure features (ESXi, QNAP, Synology, alerts, i18n, etc.)

## Prioritized Backlog

### P0 - Critical
- [x] RBAC system functional
- [x] CRA filters (ARMADO/DESARMADO) working
- [x] Floating button colors differentiated
- [x] Global loading screen implemented
- [x] Sound alert file fixed
- [x] AlertsPanel refactored
- [x] All hemispheric camera models supported

### P1 - High Priority
- [ ] Continue App.js Refactoring
  - [ ] Extract StatisticsPanel (~475 lines)
  - [ ] Extract IncidentsPanel (~500 lines)
  - [ ] Extract DeviceFormDialog component

### P2 - Medium Priority
- [ ] Full Multi-Tenant (SaaS) Implementation
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

### Camera & Hemispheric
- `GET /api/camera-stream/hemispheric/{device_id}?view=full|panorama` - Hemispheric view
- `GET /api/camera-stream/ftp-status/{device_id}` - FTP configuration status

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
- `/app/frontend/src/App.js` - Refactored, added AlertsPanel import, hemispheric models
- `/app/frontend/src/components/panels/AlertsPanel.jsx` - NEW: Extracted component (~630 lines)
- `/app/frontend/src/components/panels/LiveViewer.jsx` - Added hemispheric models
- `/app/frontend/src/components/panels/CRADashboard.jsx` - Fixed duplicate if, audio path
- `/app/frontend/src/components/common/SectionLoader.jsx` - NEW: Global loading component
- `/app/frontend/src/components/common/LiveViewerFloatingButton.jsx` - Purple/violet color

## Production Update Commands
```bash
# Connect to production server
ssh usuario@siempriapp.com
cd /opt/siempria-monitor/frontend

# Download updated files
curl -o src/components/panels/CRADashboard.jsx "https://siempria-stable.preview.emergentagent.com/api/download-file?path=CRADashboard.jsx"
curl -o src/components/common/LiveViewerFloatingButton.jsx "https://siempria-stable.preview.emergentagent.com/api/download-file?path=LiveViewerFloatingButton.jsx"
curl -o src/components/common/SectionLoader.jsx "https://siempria-stable.preview.emergentagent.com/api/download-file?path=SectionLoader.jsx"
curl -o src/components/panels/AlertsPanel.jsx "https://siempria-stable.preview.emergentagent.com/api/download-file?path=AlertsPanel.jsx"
curl -o src/components/panels/LiveViewer.jsx "https://siempria-stable.preview.emergentagent.com/api/download-file?path=LiveViewer.jsx"
curl -o src/App.js "https://siempria-stable.preview.emergentagent.com/api/download-file?path=App.js"

# Rebuild frontend
yarn build

# Restart services
sudo systemctl restart siempria-backend
sudo systemctl reload nginx
```

## Hemispheric Camera Models Supported
All Mobotix hemispheric models are now detected:
- **C Series**: C25, C26
- **Q Series**: Q24, Q25, Q26
- **S Series**: S14, S15, S16
- **M Series**: M25, M26
