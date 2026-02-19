# NOC Dashboard - PRD

## Original Problem Statement
Dashboard de monitoreo NOC con integración Dahua DVR via P2P.

## Completed Features

### Dahua P2P Integration ✅ (2026-02-19)
- Verificación de estado via P2P (online/offline)
- Detección de firmware
- Descifrado de randsalt para firmware v6.7+
- UI con logo oficial Dahua
- Panel de gestión de grabadores

### Other Features
- Email/Telegram notifications
- Maintenance Mode system
- Device monitoring dashboard

## Technical Implementation

### P2P Protocol
File: `/app/backend/services/dahua_p2p_protocol.py`

Key features:
- Cloud registration check via Easy4IP
- P2P probe to verify device online status  
- AES-256-OFB decryption for randsalt (firmware 6.7+)
- PTCP protocol implementation

### API Endpoints
- `GET /api/dahua/devices` - List devices
- `POST /api/dahua/devices` - Add device
- `POST /api/dahua/check-all` - Verify all devices
- `POST /api/dahua/devices/{id}/check` - Verify single device

## Backlog

### P1 - High Priority
1. AI Insights Panel fix (user verification pending)
2. PDF Reports for SLA/uptime

### P2 - Medium Priority
1. 2FA implementation
2. ESLint warnings fix

### Future
1. CRA armed/disarmed status
2. Slack/Teams integration
3. Public API documentation
