# Siempria Network Monitor - Product Requirements Document

## Original Problem Statement
Build and deploy "Siempria Network Monitor," a full-stack network monitoring application pivoted into a multi-tenant SaaS platform named "Siempriapp." The application monitors Mobotix cameras, VMware ESXi servers, QNAP, Synology NAS devices, and OpenVPN servers.

## User Personas
- **Network Administrators**: Monitor cameras and infrastructure
- **IT Managers**: View statistics, alerts, and incidents
- **End Users**: Access public dashboards (future)

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
│   │   ├── billing.py    # Stripe payments
│   │   └── payments.py   # Payment routes
│   └── services/         
│       └── infrastructure_service.py  # ESXi, QNAP, Synology, OpenVPN
└── frontend/             # React
    ├── src/
    │   ├── App.js        # Main component (5800 lines - refactor in progress)
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

### Session: 2026-02-02 (Latest - Part 4)
- ✅ **OpenVPN Monitoring Added**
  - New `OpenVPNService` class in backend
  - Supports management interface and SSH fallback
  - Shows connected VPN clients with stats
  - Added to Infrastructure panel with green color theme
- ✅ **Loading Bars for Tabs**
  - Incidents tab: Amber loading animation with AlertTriangle icon
  - Logs tab: Blue loading animation with FileText icon
  - Shows descriptive text ("Cargando Incidencias", "Cargando Logs")

### Session: 2026-02-02 (Part 3)
- ✅ NotificationSettings integrated into Settings Panel
- ✅ Common components created (StatusBadges, LoadingComponents)

### Session: 2026-02-02 (Part 2)
- ✅ Code refactoring started (AuthContext, LoginPage, etc.)
- ✅ Stripe, i18n, Alerts Historical View verified

### Session: 2026-02-02 (Part 1)
- ✅ Login Error Feedback Fix
- ✅ Infrastructure Panel Safe Rendering Fix
- ✅ ESXi SSH Fallback with paramiko

### Session: 2026-02-01
- ✅ **NEW Professional Header Design** - Dark elegant theme inspired by siempria.com/mobotix.com
- ✅ **ESXi VM Detection Fix** - Added MOB (Managed Object Browser) support
- ✅ **Tab Hover Effects** - Premium hover animations for navigation tabs
- ✅ **"Abrir Incidencia" Button** - Added incident creation button
- ✅ **Action Button Hover Effects** - Color-coded hover states
- ✅ **Synology Fix** - Fixed white screen error when viewing Synology details
- ✅ **Performance Optimization** - Added caching for infrastructure devices

### Previous Sessions
- ✅ NAS Services Detection (QNAP/Synology)
- ✅ NAS Connection Alerts for cameras
- ✅ Enhanced Infrastructure Panel with tooltips
- ✅ "Open Web" button for device interfaces
- ✅ Multi-language i18n (login page complete)
- ✅ Audible alerts system

## Prioritized Backlog

### P0 - Critical (Completed)
- [x] Professional Header Design ✅
- [x] Tab Hover Effects ✅
- [x] Incident Button on Infrastructure ✅
- [x] Synology Details Fix ✅
- [x] Login Error Feedback Fix ✅
- [x] Infrastructure Panel Safe Rendering ✅

### P1 - High Priority
- [ ] Deploy latest changes to production server
- [ ] Test ESXi VM detection with user's real ESXi host (192.168.1.97) - SSH fallback ready
- [ ] Test QNAP disk detection with user's real QNAP (192.168.1.3)
- [ ] Complete i18n for all UI sections
- [ ] Implement actual NAS connection monitoring for cameras
- [ ] Implement "Forgot Password" feature (UI ready, backend endpoint exists)

### P2 - Medium Priority
- [ ] Refactor App.js into smaller components
- [ ] Fix favicon/PWA icons in production
- [ ] Add more NAS-specific metrics
- [ ] Historical view with charts for Alerts panel
- [ ] Optimize duplicate API calls

### P3 - Future
- [ ] Stripe payment integration
- [ ] Per-client subdomains
- [ ] Public dashboards UI
- [ ] Dahua P2P project

## Files Modified This Session (2026-02-02)
- `/app/frontend/src/App.js` - Added loginError state and visual error display in login form
- `/app/frontend/src/components/panels/InfrastructurePanel.jsx` - Added safeRender helper, fixed formatBytes for objects
- `/app/backend/services/infrastructure_service.py` - Added SSH fallback using paramiko for ESXi VM detection
- `/app/backend/requirements.txt` - Added paramiko library

## Production Environment
- **Source code**: `/home/monitorizacion/Documentos/MONITORIZACION-main/`
- **Running services**: `/opt/siempria-monitor/`
- **Domain**: siempriapp.com

## Credentials
- Admin: `admin` / `Spw@16071977`
- ESXi Debug: `root` / `Spw@16071977` @ `192.168.1.97`
- QNAP Debug: `administrador` / `Spw@16071977` @ `192.168.1.3`

## Third-Party Integrations
- i18next/react-i18next (internationalization)
- paramiko (SSH for ESXi fallback) - NEW
- QNAP QTS API
- Synology DSM API
- Stripe (planned)
