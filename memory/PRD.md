# NOC Dashboard - Product Requirements Document

## Original Problem Statement
Build and maintain a professional NOC (Network Operations Center) dashboard for real-time monitoring of network devices (cameras, NAS, alarm panels). The application must be stable, responsive, and fully translated for Spanish and English users.

## User Personas
- **NOC Operators**: Monitor devices 24/7 on large screens (55")
- **Technicians**: Field access via mobile devices
- **Administrators**: Full system configuration and management

## Core Requirements
1. Real-time device monitoring with status indicators
2. Alert system with email notifications
3. CRA (Central Alarm Receiver) panel monitoring with armed/disarmed states
4. Multi-language support (Spanish/English)
5. Responsive design for desktop and mobile
6. **Critical Alerts feature** - Monitor critical device types when offline

## Technology Stack
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **i18n**: react-i18next

## Architecture
```
/app
├── backend
│   ├── routes/
│   │   ├── devices.py (includes critical-offline endpoint)
│   │   ├── settings.py (includes last-incident endpoint)
│   │   └── ...
│   ├── services/
│   ├── models/__init__.py (DeviceType includes is_critical field)
│   └── tests/
└── frontend
    ├── src/
    │   ├── components/
    │   │   ├── auth/LoginPage.jsx
    │   │   ├── noc/widgets/
    │   │   │   ├── CriticalAlertsWidget.jsx (NEW)
    │   │   │   └── ...
    │   │   ├── common/SystemECG.jsx (shows record date)
    │   │   ├── panels/NOCDashboardRefactored.jsx
    │   │   └── panels/DeviceTypesPanel.jsx (shows critical badge)
    │   └── locales/
    │       ├── en/translation.json
    │       └── es/translation.json
    └── package.json
```

---

# What's Been Implemented

## Session: February 17, 2026

### Critical Alerts Feature - COMPLETED
- ✅ Added `is_critical` boolean field to DeviceType model in backend
- ✅ Created new endpoint `GET /api/devices/critical-offline` - returns offline devices belonging to critical types
- ✅ Created new endpoint `GET /api/last-incident` - returns timestamp of most recent device_down alert
- ✅ Updated `GET /api/uptime-record` to return `updated_at` field for record date display
- ✅ Created `CriticalAlertsWidget.jsx` component for NOC dashboard
- ✅ Updated `DraggableGrid.jsx` with new layout including criticalAlerts widget
- ✅ Updated `NOCDashboardRefactored.jsx` to integrate the new widget and load lastIncidentTime
- ✅ Updated `DeviceTypeFormDialog` in App.js with checkbox to set type as critical
- ✅ Updated `DeviceTypesPanel.jsx` to visually show critical badge on device types
- ✅ Updated `SystemECG.jsx` to display record date
- ✅ Updated `SystemMonitorWidget.jsx` to pass recordDate to ECG component

### Widget Layout
- ✅ Uptime widget made smaller (3 columns instead of 4)
- ✅ Critical Alerts widget placed next to Uptime (3 columns)
- ✅ System Monitor widget (3 columns)
- ✅ CRA widget (3 columns)

### Bug Fixes
- ✅ Fixed bcrypt version compatibility (downgraded to 4.0.1 for passlib compatibility)
- ✅ Added missing `alerts_collection` import to settings.py

### Files Modified
- `/app/backend/models/__init__.py` - Added is_critical to DeviceTypeCreate/Update
- `/app/backend/routes/devices.py` - Added /critical-offline endpoint, updated device-types create
- `/app/backend/routes/settings.py` - Added /last-incident endpoint, updated uptime-record to return date
- `/app/frontend/src/components/noc/widgets/CriticalAlertsWidget.jsx` - NEW FILE
- `/app/frontend/src/components/noc/widgets/index.js` - Added CriticalAlertsWidget export
- `/app/frontend/src/components/noc/widgets/SystemMonitorWidget.jsx` - Added recordDate prop
- `/app/frontend/src/components/noc/DraggableGrid.jsx` - Added criticalAlerts to layout
- `/app/frontend/src/components/panels/NOCDashboardRefactored.jsx` - Integrated new widget
- `/app/frontend/src/components/panels/DeviceTypesPanel.jsx` - Show critical badge
- `/app/frontend/src/components/common/SystemECG.jsx` - Show record date
- `/app/frontend/src/App.js` - Updated DeviceTypeFormDialog with critical checkbox

---

# Prioritized Backlog

## P0 - Critical
- None currently

## P1 - High Priority
- Verify CRA armed/disarmed states work with production devices (blocked on camera API docs)
- Configure SMTP for email notifications (blocked on password)

## P2 - Medium Priority  
- Fix `passlib/bcrypt` deprecation warning in backend logs
- Fix eslint warnings in frontend build
- Implement frontend tests with Jest

## P3 - Future
- Slack/Microsoft Teams integration for alerts
- White-labeling features

---

# API Endpoints

## Settings
- `GET /api/uptime-record` - Get current uptime record with date
- `POST /api/uptime-record` - Save new uptime record (if better than current)
- `GET /api/last-incident` - Get timestamp of last device_down alert
- `GET /api/settings/test-email` - Test SMTP configuration
- `GET /api/settings/system-status` - System health check

## Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/critical-offline` - Get offline devices belonging to critical types
- `POST /api/devices` - Create new device
- `PUT /api/devices/{id}` - Update device
- `DELETE /api/devices/{id}` - Delete device
- `GET /api/device-types` - List all device types
- `POST /api/device-types` - Create new device type (includes is_critical)
- `PUT /api/device-types/{id}` - Update device type (includes is_critical)

## Auth
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

---

# Test Credentials
- **Username**: admin
- **Password**: Spw@16071977
