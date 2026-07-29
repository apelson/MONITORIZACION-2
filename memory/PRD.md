# Siempria Conteo — PRD

## Problema Original
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group (concesionarios de vehículos en Canarias). La aplicación monitoriza cámaras Mobotix y muestra rankings, tendencias, heatmaps, y dashboards ejecutivos.

## Arquitectura
- **Backend**: FastAPI (Python), puerto 8002, MongoDB (Motor)
- **Frontend**: React + Vite, modular (`src/conteo/Dashboard.jsx` + vistas en `src/conteo/views/`)
- **Servidor**: Ubuntu VM en `/opt/siempria-conteo/`
- **Dominio**: `conteo.siempriapp.com`

## Usuarios
- **Admin** (`admin` / `Spw@1644`): Acceso completo (cámaras, usuarios, logs, email, reportes)
- **Viewer/Operator** (ej: `Israel`): Dashboard, rankings, tendencias, heatmaps, ejecutivo, presentación + cambiar contraseña

## Funcionalidades Implementadas

### Backend (Confirmado funcionando)
- ✅ Login con JWT y tracking de intentos fallidos
- ✅ Endpoint `/api/users/access-logs` — Logs de acceso con filtro y paginación
- ✅ Endpoint `/api/email-settings` — CRUD configuración SMTP
- ✅ Endpoint `/api/email-settings/test` — Envío de email de prueba
- ✅ Endpoint `/api/reports` — CRUD reportes automáticos
- ✅ Alertas por email tras 3 intentos fallidos de login
- ✅ Endpoint `/api/auth/change-password` — Cambio de contraseña

### Frontend (Desplegado 2026-07-29)
- ✅ **Botón Cambiar Contraseña** en header (icono llave, visible para todos los usuarios)
- ✅ **Modal Cambiar Contraseña** integrado en Dashboard.jsx
- ✅ **AccessLogsView.jsx** — Vista de logs con filtro por usuario y paginación (solo admin)
- ✅ **EmailSettingsView.jsx** — Configuración SMTP con prueba de envío (solo admin)
- ✅ **ReportsConfigView.jsx** — CRUD de reportes automáticos con modal (solo admin)
- ✅ **Navegación sidebar** con 3 nuevos items para admin
- ✅ **App.jsx limpio** — Removido código muerto inyectado por agentes anteriores

### Vistas existentes (pre-existentes)
- Tiempo Real, NOC Competitivo, Tendencias, Mapa de Calor
- Ejecutivo, Presentación, Por Marca, Por Centro
- Cámaras (admin), Usuarios (admin)

## Backlog / Pendientes

### P2
- [ ] **Fix NOC View overflow** — Ajustar CSS para que no desborden elementos en `/opt/siempria-conteo/frontend/src/conteo/views/NOCView.jsx`

### P3
- [ ] **Refactorizar siempria-monitor** — `App.js` tiene >3900 líneas, dividir en componentes modulares

## Archivos Clave
- `/opt/siempria-conteo/frontend/src/App.jsx` — Entry point (limpio, ~25 líneas)
- `/opt/siempria-conteo/frontend/src/conteo/Dashboard.jsx` — Layout principal con sidebar y header
- `/opt/siempria-conteo/frontend/src/conteo/views/AccessLogsView.jsx` — Vista logs
- `/opt/siempria-conteo/frontend/src/conteo/views/EmailSettingsView.jsx` — Vista email
- `/opt/siempria-conteo/frontend/src/conteo/views/ReportsConfigView.jsx` — Vista reportes
- `/opt/siempria-conteo/frontend/src/conteo/views/NOCView.jsx` — Vista NOC (pendiente fix overflow)

## DB Schema (`siempria_conteo`)
- `users`: `{id, username, password_hash, email, role, full_name...}`
- `access_logs`: `{user_id, username, ip_address, success, login_time, full_name, role...}`
- `email_settings`: `{smtp_host, smtp_port, smtp_user, smtp_password, from_email, alert_email, enabled...}`
- `reports`: `{name, report_type, frequency, email, islands, brands, centers, enabled, created_by...}`
