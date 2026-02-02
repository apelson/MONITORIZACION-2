# Siempria Network Monitor - Product Requirements Document

## Original Problem Statement
Build and deploy "Siempria Network Monitor," a full-stack network monitoring application pivoted into a multi-tenant SaaS platform named "Siempriapp." The application monitors Mobotix cameras, VMware ESXi servers, QNAP and Synology NAS devices.

## User Personas
- **Network Administrators**: Monitor cameras and infrastructure
- **IT Managers**: View statistics, alerts, and incidents
- **End Users**: Access public dashboards (future)

## Core Requirements
- Multi-language support (ES, EN, DE, FR, IT, RU, ZH)
- Real-time device monitoring with alerts
- Infrastructure monitoring (ESXi, QNAP, Synology)
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
│   └── services/         # Business logic
└── frontend/             # React
    ├── src/
    │   ├── App.js        # Main component (5800 lines - refactor in progress)
    │   ├── contexts/     # NEW: AuthContext
    │   ├── hooks/        # NEW: useNotifications
    │   ├── services/     # NEW: NotificationService
    │   └── components/   # UI components
    │       ├── auth/     # NEW: LoginPage
    │       └── settings/ # NEW: NotificationSettings
```

## What's Been Implemented

### Session: 2026-02-02 (Latest Update - Part 2)
- ✅ **Code Refactoring Started**
  - Created `/contexts/AuthContext.jsx` - Auth state management
  - Created `/components/auth/LoginPage.jsx` - Standalone login component
  - Created `/services/NotificationService.js` - Push notification service
  - Created `/hooks/useNotifications.js` - Notification hook
  - Created `/components/settings/NotificationSettings.jsx` - Notification config UI
- ✅ **Stripe Integration Verified**
  - `/routes/billing.py` - Already functional with plans: Basic (29€), Pro (79€), Enterprise (299€)
  - Checkout flow, webhooks, and status polling implemented
  - Uses emergentintegrations library
- ✅ **i18n Translations** - Already complete (648 lines in ES, similar for EN, DE, FR, IT, RU, ZH)
- ✅ **Alerts Historical View** - Already implemented in AlertsPanel
  - Pie chart for alerts by type
  - Bar chart for alert trends over time
  - Time range filter (week/month/year)

### Session: 2026-02-02 (Part 1 - Bug Fixes)
- ✅ **Login Error Feedback Fix (P1)** - Visual error message in login form
- ✅ **Infrastructure Panel Safe Rendering Fix (P0)** - Prevents React Error #31
- ✅ **ESXi SSH Fallback** - paramiko-based fallback for VM detection
- ✅ **Loading Indicator for Infrastructure Tab** - Confirmed working

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
