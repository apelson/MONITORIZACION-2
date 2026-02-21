# Siempria Network Monitor - PRD

## Descripción
Sistema de monitorización NOC (Network Operations Center) para vigilancia de dispositivos de red, cámaras, grabadores Dahua y sistemas CRA.

## Stack Tecnológico
- **Frontend:** React + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Base de datos:** MongoDB
- **Integraciones:** Telegram Bot API, OpenAI GPT-4o, Dahua P2P Protocol

## Funcionalidades Implementadas

### Core
- ✅ Dashboard NOC con widgets configurables
- ✅ Monitorización de dispositivos (cámaras, NAS, grabadores)
- ✅ Widget "Monitorización Grabadores" con contadores de uptime
- ✅ Importación SmartPSS XML para dispositivos Dahua
- ✅ Sistema de alertas en tiempo real
- ✅ Panel de incidencias
- ✅ Gestión de usuarios con roles (admin, manager, viewer, operator, technician)
- ✅ 2FA con Google Authenticator

### Notificaciones
- ✅ Alertas por Telegram (Bot: @siempria_noc_bot, Chat ID: 1200129735)
- ✅ Alertas por Email (SMTP Dinaserver)
- ✅ Alertas por WhatsApp (manual)

### Reportes
- ✅ Reportes SLA en PDF
- ✅ Reportes diarios programados
- ✅ Panel de estadísticas

### Backups (Configurado 21-Feb-2026)
- ✅ Backup diario: 03:00 (retención 7 días)
- ✅ Backup semanal: domingos 04:00 (retención 4 semanas)
- ✅ Backup mensual: día 1 a las 05:00 (retención 12 meses)
- ✅ Destino: //192.168.1.4/SIEMPRIAPP
- ✅ Incluye: MongoDB + Config + Código fuente
- ✅ Notificación Telegram al completar

### AI
- ✅ Panel AI Insights con GPT-4o
- ✅ Predicciones y detección de anomalías

## Sesión 21-Feb-2026 - Completado
- [x] Corregir ESLint warnings (10 archivos) - 0 warnings
- [x] Verificar panel SLA PDF - Funciona
- [x] Configurar Telegram - Activo
- [x] Crear DahuaWidget.jsx
- [x] Corregir TwoFactorSettings.jsx
- [x] Corregir TelegramSettings.jsx
- [x] Configurar sistema de backups automáticos

## Tareas Pendientes

### P1 - Alta Prioridad
- [ ] Estado CRA armed/disarmed (bloqueado - necesita documentación API)

### P2 - Media Prioridad
- [ ] Refactorizar App.js (~4000 líneas → ~2500 líneas)
- [ ] Refactorizar NOCDashboard.jsx (~1850 líneas)

### P3 - Baja Prioridad / Futuro
- [ ] Integración Slack/Microsoft Teams
- [ ] Webhooks para eventos
- [ ] API pública documentada
- [ ] Nuevo sistema 2FA

## Credenciales de Prueba
- Usuario: admin
- Password: Spw@16071977

## Servidor de Producción
- Ruta: /opt/siempria-monitor/
- Frontend: /opt/siempria-monitor/frontend/
- Backend: /opt/siempria-monitor/backend/

## Servidor de Backup
- IP: 192.168.1.4
- Carpeta: SIEMPRIAPP
- Usuario: siempria
