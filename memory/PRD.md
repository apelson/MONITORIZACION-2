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
│   │   ├── devices.py
│   │   ├── settings.py
│   │   └── ...
│   ├── services/
│   └── tests/
└── frontend
    ├── src/
    │   ├── components/
    │   │   ├── auth/LoginPage.jsx
    │   │   ├── noc/widgets/
    │   │   ├── common/SystemECG.jsx
    │   │   └── panels/NOCDashboardRefactored.jsx
    │   └── locales/
    │       ├── en/translation.json
    │       └── es/translation.json
    └── package.json
```

---

# What's Been Implemented

## Session: February 16, 2026

### NOC Dashboard Enhancements
- ✅ Added RECORD counter next to "Sin Incidencias" in SystemECG component
- ✅ Added armed/disarmed states to CRA Widget with Lock/Unlock icons
- ✅ Created `/api/settings/uptime-record` endpoint for saving/getting uptime records
- ✅ Added translations for CRA and NOC features (es/en)

### Code Refactoring
- ✅ Removed duplicate LoginPage definition from App.js (was causing build error)
- ✅ Removed duplicate ServerCard definition from App.js
- ✅ LoginPage now receives `login` prop instead of using useAuth directly
- ✅ App.js reduced by ~500 lines

### Bug Fixes
- ✅ Fixed build error caused by duplicate component declarations
- ✅ Fixed LoginPage context issue by passing login as prop

---

# Prioritized Backlog

## P0 - Critical
- None currently

## P1 - High Priority
- Add more backend tests for edge cases
- Verify CRA armed/disarmed states work with production devices

## P2 - Medium Priority
- Implement frontend tests with Jest
- Final verification of all i18n translations

## P3 - Future
- Slack/Microsoft Teams integration for alerts (user postponed)
- White-labeling features
- Billing integration

---

# API Endpoints

## Settings
- `GET /api/settings/uptime-record` - Get current uptime record
- `POST /api/settings/uptime-record` - Save new uptime record (if better)
- `GET /api/settings/test-email` - Test SMTP configuration
- `GET /api/settings/system-status` - System health check

## Devices
- `GET /api/devices` - List all devices
- `POST /api/devices` - Create new device
- `PUT /api/devices/{id}` - Update device
- `DELETE /api/devices/{id}` - Delete device

## Auth
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (returns 401 if not authenticated)

---

# Test Credentials
- **Username**: admin
- **Password**: admin123
