# Siempria Conteo - PRD

## Problema Original
Sistema de conteo de visitas para concesionarios del Domingo Alonso Group en Canarias. Utiliza cámaras Mobotix para contar personas y muestra rankings en tiempo real por marca, centro e isla.

## Arquitectura
- **Backend**: FastAPI (puerto 8002) con MongoDB (`siempria_conteo`)
- **Frontend**: React + Vite
- **Ubicación producción**: `/opt/siempria-conteo/`
- **Dominio**: `conteo.siempriapp.com`

## Funcionalidades Implementadas

### v1-v8 (Pre-existente)
- Login/autenticación JWT independiente
- Dashboard tiempo real con ranking por marca
- NOC Competitivo (pantalla 55")
- Tendencias horarias y diarias
- Mapa de calor (heatmap Mobotix)
- Vista ejecutiva con KPIs y exportación CSV
- Modo presentación
- Gestión de cámaras (CRUD)
- Gestión de usuarios (CRUD, roles admin/viewer/operator)
- Sistema de objetivos por marca

### v9 (Sesión anterior)
- Fix bug trailing spaces en login/creación de usuarios
- Campo email en gestión de usuarios
- Flujo "Olvidé mi contraseña" (backend + frontend)
- Cache 60s en endpoints `/ranking/*` (de 100s a <1s)
- Ocultar menú "Cámaras" a usuarios no-admin

### v10 (Sesión actual - 29/07/2026)
- **Botón "Cambiar Contraseña"** en header (icono llave) con modal
- **Sistema de Logs de Acceso**: registro automático de cada login con IP, fecha, user-agent
- **Vista "Logs de Acceso"** para admin con tabla, filtro por usuario y paginación
- Endpoint `POST /api/auth/change-password` (autoservicio)
- Endpoint `GET /api/users/access-logs` (admin only)
- Colección MongoDB: `access_logs`

## Backlog

### P2 - Próximas
- Reportes automáticos por email
- Alertas inteligentes a Telegram

### P3 - Futuro
- Refactorización App.js de `siempria-monitor` (>3900 líneas)

## Credenciales
- Admin: `admin` / `Spw@1644` (producción)
- Test: `admin` / `Conteo2024!` (seed por defecto)

## Colecciones MongoDB (`siempria_conteo`)
- `users`, `brand_cameras_config`, `daily_baselines`, `brand_daily_statistics`
- `brand_hourly_statistics`, `brands`, `centers`, `camera_readings`
- `hourly_snapshots`, `access_logs` (NUEVO v10)

## Archivos Clave
- `/opt/siempria-conteo/backend/routes/auth.py` - Login + change password + access log recording
- `/opt/siempria-conteo/backend/routes/users.py` - CRUD usuarios + access-logs endpoint
- `/opt/siempria-conteo/backend/config.py` - Collections y config DB
- `/opt/siempria-conteo/frontend/src/App.jsx` - Todo el frontend (monolito)
- `/app/deploy_conteo_v10.sh` - Script de despliegue v10
