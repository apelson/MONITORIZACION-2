# NOC Dashboard - PRD

## Original Problem Statement
The user requested fixes for a broken NOC dashboard and subsequently approved a roadmap for major feature enhancements including Email/Telegram notifications, Maintenance Mode, PDF reports, and 2FA. The current focus is integrating Dahua DVR recorders via their P2P (peer-to-peer) protocol.

## What's Been Implemented

### Completed Features
1. **Email/Telegram Notifications** - Fully functional
2. **Maintenance Mode System** - Fully functional
3. **Dahua P2P Integration (Partial)**
   - Device registration in Easy4IP Cloud verification ✅
   - Firmware version detection ✅
   - RandSalt decryption for firmware v6.7+ ✅
   - UI panel with Dahua logo ✅
   - Device status display ✅

### Current Status (2026-02-19)
- **Dahua P2P Protocol**: The implementation can verify devices in the cloud and decrypt the authentication token (randsalt), but full P2P tunnel establishment fails due to network restrictions in the hosting environment.
- The device `AL07C99PAJ1A4BE` is correctly registered and firmware `6.7.21` is detected.

## Technical Details

### Dahua P2P Implementation
Located at: `/app/backend/services/dahua_p2p_protocol.py`

Key achievements:
- Implemented cloud registration verification via `www.easy4ipcloud.com`
- Implemented AES-256-OFB decryption of device Info field for extracting randsalt
- Implemented PTCP (PhonyTCP) protocol packet structures
- Authentication key generation with MD5 and HMAC-SHA256

Blocking issue:
- The PTCP handshake with the relay agent times out, likely due to firewall/NAT restrictions in the container environment
- This affects P2P tunnel establishment, preventing direct device queries

### Workaround
The system now shows:
- Cloud registration status
- Firmware version
- Clear error message explaining the limitation

## Prioritized Backlog

### P0 - Critical
1. ~~Dahua P2P Connection~~ - BLOCKED by network environment
   - Alternative: Consider adding support for direct HTTP connections when devices are accessible via DDNS/VPN

### P1 - High
1. **AI Insights Panel Fix** - "Predicción de Fallos" not showing data (user verification pending)
2. **PDF Reports** - Monthly SLA/uptime reports generation

### P2 - Medium
1. **2FA Implementation** - Two-factor authentication for login
2. **ESLint Warnings** - Fix React hooks dependency warnings

### Future
1. CRA armed/disarmed status (blocked on user API documentation)
2. Slack/Microsoft Teams integration
3. Public API documentation
4. Webhook system for key events

## User Credentials
- **App Login**: admin / Spw@16071977
- **Dahua Test Device**: 
  - Serial: AL07C99PAJ1A4BE
  - User: admin
  - Password: Spw@2018

## Architecture

### Backend (FastAPI)
- `/app/backend/server.py` - Main entry point
- `/app/backend/routes/dahua.py` - Dahua device endpoints
- `/app/backend/services/dahua_service.py` - Dahua business logic
- `/app/backend/services/dahua_p2p_protocol.py` - P2P protocol implementation

### Frontend (React)
- `/app/frontend/src/components/panels/DahuaDevicesPanel.jsx` - Dahua management panel
- `/app/frontend/src/components/noc/widgets/DahuaWidget.jsx` - Dashboard widget

### Database (MongoDB)
- Collection: `dahua_devices` - Stores device configurations
