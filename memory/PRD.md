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
7. **Dahua P2P Integration** - Monitor DVR/NVR devices via P2P connection

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
│   │   ├── devices.py (includes maintenance mode endpoints)
│   │   ├── settings.py (includes SMTP, Telegram, scheduled reports)
│   │   ├── dahua.py (NEW - Dahua P2P device management)
│   │   └── ...
│   ├── services/
│   │   ├── email_service.py (professional HTML templates with logo)
│   │   ├── telegram_service.py (Telegram notifications)
│   │   ├── dahua_service.py (NEW - Dahua P2P service)
│   │   ├── dahua_p2p_protocol.py (NEW - Native Python P2P implementation)
│   │   └── ...
│   ├── models/__init__.py (DeviceType includes is_critical field)
│   └── tests/
└── frontend
    ├── src/
    │   ├── components/
    │   │   ├── auth/LoginPage.jsx
    │   │   ├── panels/
    │   │   │   ├── MaintenancePanel.jsx (Maintenance Mode UI)
    │   │   │   ├── DahuaDevicesPanel.jsx (NEW - Dahua device management)
    │   │   │   ├── NOCDashboard.jsx
    │   │   │   └── ...
    │   │   ├── noc/widgets/
    │   │   │   ├── DahuaWidget.jsx (NEW - NOC widget for Dahua status)
    │   │   │   └── ...
    │   │   ├── settings/
    │   │   │   ├── TelegramSettings.jsx (Telegram config UI)
    │   │   │   └── ...
    │   │   └── common/SystemECG.jsx
    │   └── locales/
    └── package.json
```

---

## What's Been Implemented (Feb 2026)

### Session 1 - NOC Dashboard Repair
- ✅ Fixed broken NOC dashboard widgets
- ✅ Made device alerts clickable
- ✅ Improved uptime record display with trophy style

### Session 2 - Notifications & Maintenance Mode
- ✅ **Email Templates with Logo**: Professional HTML templates for alerts and test emails
- ✅ **Telegram Notifications**: Backend service and frontend configuration
- ✅ **Maintenance Mode**: Full CRUD with alert suppression

### Session 3 - Dahua P2P Integration (Feb 19, 2026)
- ✅ **Native Python P2P Protocol**: Implemented Dahua PTCP protocol
  - `dahua_p2p_protocol.py`: Full P2P handshake and PTCP communication
  - Connects to Easy4IP Cloud (www.easy4ipcloud.com:8800 UDP)
  - Supports device status, storage, recording, and HDD health queries
  
- ✅ **Dahua API Endpoints**:
  - `GET /api/dahua/devices` - List all Dahua devices
  - `POST /api/dahua/devices` - Add new device
  - `GET /api/dahua/devices/{id}` - Get single device
  - `PUT /api/dahua/devices/{id}` - Update device
  - `DELETE /api/dahua/devices/{id}` - Delete device
  - `POST /api/dahua/devices/{id}/check` - Full P2P status check
  - `POST /api/dahua/check-all` - Check all devices
  - `GET /api/dahua/status` - Status summary
  - `POST /api/dahua/quick-check/{serial}` - Verify serial in P2P cloud

- ✅ **Frontend Components**:
  - `DahuaDevicesPanel.jsx`: Full CRUD UI with official Dahua logo
  - `DahuaWidget.jsx`: NOC dashboard widget showing device status
  - Serial number verification button before adding devices
  - Real-time status badges (online/offline, recording, storage, HDD)

---

## Prioritized Backlog

### P0 - Critical (Done ✅)
- [x] Logo in email templates
- [x] Maintenance Mode UI
- [x] Telegram notifications
- [x] Dahua P2P Integration with official logo

### P1 - High Priority
- [ ] **PDF/SLA Reports**: Generate monthly uptime reports
  - Library: `reportlab` or `weasyprint`
  - Endpoint: POST `/api/reports/generate-pdf`
  
- [ ] **2FA Authentication**: 
  - Library: `pyotp`
  - Backend: Add TOTP secret to user model
  - Frontend: QR code setup, verification step in login

### P2 - Medium Priority
- [ ] CRA armed/disarmed status polling (BLOCKED - needs user API docs)
- [ ] Mobile/PWA improvements
- [ ] Slack/Teams integration

### P3 - Low Priority
- [ ] Public API documentation
- [ ] Webhooks for events
- [ ] User activity audit log

---

## API Reference

### Dahua P2P Devices
```
GET /api/dahua/devices
  Response: {"devices": [...], "count": N}

POST /api/dahua/devices
  Body: {"name": "...", "serial_number": "...", "username": "admin", "password": "..."}
  Response: {"message": "Dispositivo Dahua creado", "device": {...}}

POST /api/dahua/devices/{device_id}/check
  Response: {"online": true, "device_type": "...", "storage": {...}, "recording": {...}, "hdd_health": {...}}

POST /api/dahua/quick-check/{serial_number}
  Response: {"serial_number": "...", "cloud_registered": true, "p2p_available": true}
```

### Maintenance Mode
```
POST /api/devices/{device_id}/maintenance
  Body: {"duration_minutes": 60, "reason": "Firmware update"}
  Response: {"message": "Modo mantenimiento activado...", "maintenance_until": "ISO date"}

DELETE /api/devices/{device_id}/maintenance
  Response: {"message": "Modo mantenimiento desactivado"}
```

---

## Database Schema Updates

### dahua_devices collection (NEW)
```javascript
{
  id: String (UUID),
  name: String,
  serial_number: String,
  username: String,
  password: String,
  group_id: String (optional),
  organization_id: String (optional),
  online: Boolean,
  device_type: String,
  last_check: String (ISO date),
  storage_used_percent: Number,
  recording_active: Boolean,
  hdd_healthy: Boolean,
  last_error: String
}
```

---

## Test Credentials
- **Admin**: admin / Spw@16071977
- **Telegram Bot**: 7955328367:AAHyR2A8hFVezQZKS14bJGKONG-IfYo5ruU

## External URLs
- **Preview**: https://p2p-recorder-hub.preview.emergentagent.com
- **Production**: https://siempriapp.com

## Brand Assets
- **Dahua Logo**: https://customer-assets.emergentagent.com/job_9daa6c94-1292-4e32-a6ac-374cc483718a/artifacts/er710utf_dahua-technology-logo.png
