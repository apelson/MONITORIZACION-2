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
│   │   ├── devices.py (includes maintenance mode endpoints)
│   │   ├── settings.py (includes SMTP, Telegram, scheduled reports)
│   │   └── ...
│   ├── services/
│   │   ├── email_service.py (professional HTML templates with logo)
│   │   ├── telegram_service.py (NEW - Telegram notifications)
│   │   └── ...
│   ├── models/__init__.py (DeviceType includes is_critical field)
│   └── tests/
└── frontend
    ├── src/
    │   ├── components/
    │   │   ├── auth/LoginPage.jsx
    │   │   ├── panels/
    │   │   │   ├── MaintenancePanel.jsx (NEW - Maintenance Mode UI)
    │   │   │   ├── NOCDashboard.jsx
    │   │   │   └── ...
    │   │   ├── settings/
    │   │   │   ├── TelegramSettings.jsx (NEW - Telegram config UI)
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
  - Siempria logo embedded: `https://customer-assets.emergentagent.com/job_.../logo%20principal.png`
  - Alert emails with severity levels and gradient colors
  - Test emails with configuration details
  
- ✅ **Telegram Notifications**: 
  - Backend service: `telegram_service.py` with `httpx` async client
  - API endpoints: POST `/api/settings/telegram`, POST `/api/settings/test-telegram`
  - Frontend UI: `TelegramSettings.jsx` with token input, chat IDs badges, enable/disable switch
  
- ✅ **Maintenance Mode**:
  - Backend: Full CRUD in `devices.py`
    - `POST /api/devices/{id}/maintenance` - Enable with duration and reason
    - `DELETE /api/devices/{id}/maintenance` - Disable
    - `GET /api/maintenance/devices` - List devices in maintenance
  - Frontend: `MaintenancePanel.jsx`
    - Shows devices currently in maintenance with remaining time
    - Shows available devices to put in maintenance
    - Dialog with duration selector (15m to 24h) and optional reason
  - Alert suppression: Devices in maintenance don't generate alerts

---

## Prioritized Backlog

### P0 - Critical (Done ✅)
- [x] Logo in email templates
- [x] Maintenance Mode UI
- [x] Telegram notifications

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

### Maintenance Mode
```
POST /api/devices/{device_id}/maintenance
  Body: {"duration_minutes": 60, "reason": "Firmware update"}
  Response: {"message": "Modo mantenimiento activado...", "maintenance_until": "ISO date"}

DELETE /api/devices/{device_id}/maintenance
  Response: {"message": "Modo mantenimiento desactivado"}

GET /api/maintenance/devices
  Response: {"devices": [...], "count": N}
```

### Telegram Settings
```
POST /api/settings/telegram
  Body: {"telegram_bot_token": "...", "telegram_chat_ids": ["-100..."], "telegram_enabled": true}

POST /api/settings/test-telegram
  Response: {"message": "Mensaje enviado..."} or error
```

---

## Database Schema Updates

### devices collection (new fields)
```javascript
{
  maintenance_mode: Boolean,
  maintenance_until: String (ISO date),
  maintenance_reason: String,
  maintenance_started_by: String,
  maintenance_started_at: String (ISO date)
}
```

### settings collection (new fields)
```javascript
{
  telegram_bot_token: String,
  telegram_chat_ids: Array<String>,
  telegram_enabled: Boolean
}
```

---

## Test Credentials
- **Admin**: admin / Spw@16071977
- **Telegram Bot**: 7955328367:AAHyR2A8hFVezQZKS14bJGKONG-IfYo5ruU

## External URLs
- **Preview**: https://dahua-device-sync.preview.emergentagent.com
- **Production**: https://siempriapp.com
