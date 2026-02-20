# NOC Dashboard - PRD

## Original Problem Statement
Dashboard de monitoreo NOC con integración Dahua DVR via P2P. El sistema debe permitir monitorear dispositivos de red y grabadores Dahua de forma centralizada, incluyendo alertas automáticas.

## Completed Features

### SmartPSS Import Feature ✅ (2026-02-20)
- **Importación masiva de grabadores** desde archivos XML exportados de SmartPSS
- **Detección automática de duplicados** - actualiza dispositivos existentes por número de serie
- **UI intuitiva** con modal de importación y resultados detallados
- **Endpoints API**:
  - `POST /api/dahua/import/smartpss` - Importar archivo XML
  - `POST /api/dahua/import/smartpss-text` - Importar XML como texto

### Header Layout Fix ✅ (2026-02-20)
- **Corregido el wrapping de pestañas** en el header principal
- Las pestañas (CRA, DVR, etc.) ahora se muestran en una sola línea con scroll horizontal

### Dahua NOC Dashboard Integration ✅ (2026-02-19)
- **DVR/NVR Counter**: Nueva columna en la barra de estadísticas del NOC (9 columnas) mostrando dispositivos online/total
- **DahuaWidget**: Widget dedicado en el grid del NOC Dashboard para visualizar estado de grabadores
- **Alertas Telegram**: Sistema de notificaciones automáticas cuando un grabador cambia de estado (conectado/desconectado)
- **Frontend integration**: Contadores de Dahua incluidos en totales globales del NOC

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

### SmartPSS Import
File: `/app/backend/services/dahua_service.py`

- `import_smartpss_xml()`: Parsea XML de SmartPSS y crea/actualiza dispositivos
- Soporta detección automática de modo P2P vs IP directo
- Manejo de duplicados por número de serie (case-insensitive)

### P2P Protocol
File: `/app/backend/services/dahua_p2p_protocol.py`

Key features:
- Cloud registration check via Easy4IP
- P2P probe to verify device online status  
- AES-256-OFB decryption for randsalt (firmware 6.7+)
- PTCP protocol implementation

### Dahua Alerts
File: `/app/backend/services/dahua_service.py`

- `send_dahua_status_alert()`: Envía alerta por Telegram cuando cambia el estado de un grabador
- Integrado en `check_all_devices()` y endpoint `/api/dahua/devices/{id}/check`

### API Endpoints
- `GET /api/dahua/devices` - List devices
- `POST /api/dahua/devices` - Add device
- `GET /api/dahua/status` - Get status summary
- `POST /api/dahua/check-all` - Verify all devices
- `POST /api/dahua/devices/{id}/check` - Verify single device (with alerts)
- `POST /api/dahua/quick-check/{serial}` - Validate serial in P2P cloud
- `POST /api/dahua/import/smartpss` - Import from SmartPSS XML file
- `POST /api/dahua/import/smartpss-text` - Import from SmartPSS XML text

### Frontend Components
- `DahuaWidget.jsx`: Widget para NOC Dashboard
- `DahuaDevicesPanel.jsx`: Panel de gestión de grabadores con importación SmartPSS
- `StatsWidget.jsx`: Barra de estadísticas con 9 columnas (incluye DVR/NVR)

## Backlog

### P1 - High Priority
1. **Cron job para backups automáticos** - Servicios backend listos, falta configurar cron
2. **Reportes SLA PDF** - Generación de reportes mensuales de uptime

### P2 - Medium Priority
1. 2FA implementation
2. ESLint warnings fix (AIInsightsPanel.jsx, TelegramSettings.jsx, TwoFactorSettings.jsx)

### Future
1. CRA armed/disarmed status (bloqueado - esperando documentación API)
2. Slack/Teams integration
3. Public API documentation
