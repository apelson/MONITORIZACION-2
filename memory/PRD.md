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
- Stripe payment integration for subscriptions

## Architecture
```
/app/
├── backend/              # FastAPI
│   ├── server.py         # Main server
│   ├── routes/           # API endpoints
│   │   ├── devices.py    # Device CRUD + alerts
│   │   ├── infrastructure.py  # ESXi/QNAP/Synology/OpenVPN
│   │   ├── billing.py    # Stripe payments
│   │   └── ...
│   └── services/         
│       └── infrastructure_service.py  # ESXi, QNAP, Synology, OpenVPN services
└── frontend/             # React + Craco
    ├── src/
    │   ├── App.js        # Main component (~5800 lines)
    │   ├── contexts/     # AuthContext
    │   ├── hooks/        # useNotifications
    │   ├── services/     # NotificationService
    │   └── components/   # UI components
    │       ├── auth/     # LoginPage
    │       ├── common/   # StatusBadges, LoadingComponents
    │       ├── panels/   # InfrastructurePanel
    │       └── settings/ # NotificationSettings
```

## What's Been Implemented

### Session: 2026-02-08 (Latest - Code Cleanup & CRADashboard Fix)
- ✅ **CRADashboard Fix**: Fixed infinite loading issue caused by useCallback/useEffect dependency cycles
  - Changed from state-based counters to refs for alert/event tracking
  - Added concurrent fetch prevention with `isFetchingRef`
  - Dashboard now loads correctly showing 3 CRA devices, 100% uptime
- ✅ **Component Extraction Started**:
  - Created `/components/common/PWAInstallPrompt.jsx` - PWA install prompt component
  - Created `/components/devices/ServerCard.jsx` - Device card with camera preview
  - Created `/components/devices/SortableCard.jsx` - Drag-and-drop wrapper
  - Created `/components/dialogs/CommonDialogs.jsx` - Reusable dialog components
- ✅ **Testing Verified**: All 12 frontend tests passed (100% success rate)
  - Login, Dashboard, CRA Panel, Filters, Device Actions, Statistics, Alerts, Live Viewer

### Session: 2026-02-05
- ✅ **Dynamic API Configuration**: Created `src/config.js` for automatic URL detection:
  - IP local (`192.168.1.76`) → `http://192.168.1.76`
  - Domain (`siempriapp.com`) → `https://siempriapp.com`
  - Development → Uses `REACT_APP_BACKEND_URL` from .env
- ✅ **Organization Filter in Alerts**: Added dropdown to filter alerts by center/organization
  - Filter persists when switching between List and Histórico views
  - Shows filtered count when filter is active
  - Badge shows selected organization with clear button

### Session: 2026-02-03
- ✅ **System Status Dashboard**: New diagnostic dashboard in Settings showing:
  - Backend API status (port 8001)
  - Nginx status (port 443)
  - MongoDB connection status and stats
  - Device counts (online/offline)
  - System resources (CPU, RAM, Disk usage)
- ✅ **Deployment Script v2.0**: Improved `update_production.sh` with:
  - Automatic `.env` file creation for frontend
  - Clear step-by-step output with colors
  - Error handling and verification steps
- ✅ **Deployment Guide**: Created `GUIA_DESPLIEGUE_PRODUCCION.md`

### Session: 2026-02-02 (Part 4)
- ✅ **OpenVPN Monitoring Added**
  - New `OpenVPNService` class in backend
  - Supports management interface and SSH fallback
  - Shows connected VPN clients with stats
  - Added to Infrastructure panel with green color theme
- ✅ **Loading Bars for Tabs**
  - Incidents tab: Amber loading animation with AlertTriangle icon
  - Logs tab: Blue loading animation with FileText icon
  - Infrastructure tab: Loading indicator while connecting

### Session: 2026-02-02 (Part 3)
- ✅ NotificationSettings integrated into Settings Panel
- ✅ Common components created (StatusBadges, LoadingComponents)

### Session: 2026-02-02 (Part 2)
- ✅ Code refactoring started (AuthContext, LoginPage, etc.)
- ✅ Stripe, i18n, Alerts Historical View verified

### Session: 2026-02-02 (Part 1)
- ✅ Login Error Feedback Fix - Shows "Credenciales inválidas" in red
- ✅ Infrastructure Panel Safe Rendering Fix (safeRender helper)
- ✅ ESXi SSH Fallback with paramiko for VM detection

### Previous Sessions
- ✅ Professional Header Design - Dark elegant theme
- ✅ Tab Hover Effects - Premium animations
- ✅ "Abrir Incidencia" Button on Infrastructure
- ✅ Synology Details Fix - No more white screen
- ✅ Alert system expansion - No 50 limit, shows monthly
- ✅ Alert popup auto-dismiss after 60 seconds
- ✅ Multi-language i18n (login page complete)
- ✅ Audible alerts system

## Prioritized Backlog

### P0 - Critical (Blocking)
- [ ] **DEPLOY TO PRODUCTION** - User must run `update_production.sh`
  - Script is ready at `/app/update_production.sh`
  - Guide at `/app/GUIA_DESPLIEGUE_PRODUCCION.md`

### P1 - High Priority
- [ ] Test ESXi VM detection with user's real ESXi host (192.168.1.97)
- [ ] Test QNAP disk detection with user's real QNAP (192.168.1.3)
- [ ] Complete i18n for all UI sections
- [ ] Implement "Forgot Password" feature

### P2 - Medium Priority
- [ ] Refactor App.js into smaller components (<1000 lines each)
- [ ] Fix favicon/PWA icons in production
- [ ] Add more NAS-specific metrics
- [ ] Historical view with charts for Alerts panel
- [ ] Optimize duplicate API calls

### P3 - Future/Backlog
- [ ] Stripe payment integration checkout flow
- [ ] Per-client subdomains
- [ ] Public dashboards UI
- [ ] Dahua P2P project

## Production Environment
- **Development Source**: `/home/monitorizacion/Documentos/MONITORIZACION-main/`
- **Production Running**: `/opt/siempria-monitor/`
- **Domain**: siempriapp.com
- **CRITICAL**: Frontend needs `.env` with `REACT_APP_BACKEND_URL=https://siempriapp.com`

## Test Credentials
- Admin: `admin` / `Spw@16071977`
- ESXi: `root` / `Spw@16071977` @ `192.168.1.97`
- QNAP: `administrador` / `Spw@16071977` @ `192.168.1.3`

## Third-Party Integrations
- i18next/react-i18next (internationalization)
- paramiko (SSH for ESXi fallback)
- QNAP QTS API
- Synology DSM API
- OpenVPN Management Interface
- Stripe (planned)

## Key Files Modified This Session
- `/app/update_production.sh` - Improved deployment script v2.0
- `/app/GUIA_DESPLIEGUE_PRODUCCION.md` - New deployment guide
- `/app/backend/routes/settings.py` - Added `/api/system-status` endpoint
- `/app/frontend/src/components/settings/SystemStatusDashboard.jsx` - New diagnostic dashboard
- `/app/frontend/src/App.js` - Integrated SystemStatusDashboard in Settings tab

## Known Issues Blocking Production
1. User's production server hasn't been updated with latest code
2. Previous deployment attempts failed due to:
   - Missing `REACT_APP_BACKEND_URL` in frontend `.env`
   - npm dependency conflicts (ajv)
   - Wrong Nginx paths
   
All these are addressed in the new `update_production.sh` script.
