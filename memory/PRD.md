# Siempria Conteo - PRD

## Problema Original
Sistema de conteo de visitas para concesionarios del Domingo Alonso Group en Canarias. Cámaras Mobotix, rankings en tiempo real, dashboard ejecutivo.

## Arquitectura
- **Backend**: FastAPI (puerto 8002) con MongoDB (`siempria_conteo`)
- **Frontend**: React + Vite
- **Ubicación**: `/opt/siempria-conteo/`
- **Dominio**: `conteo.siempriapp.com`

## Funcionalidades Implementadas

### v1-v8 (Pre-existente)
- Login JWT, Dashboard tiempo real, NOC Competitivo, Tendencias, Heatmap Mobotix
- Vista ejecutiva con KPIs y CSV, Modo presentación, CRUD Cámaras/Usuarios/Objetivos

### v9
- Fix trailing spaces login, Email en usuarios, Forgot password, Cache ranking 60s, Ocultar Cámaras a no-admin

### v10-v11 (Sesión actual - 29/07/2026)
- **Cambiar Contraseña**: Botón llave en header + modal
- **Logs de Acceso**: Registro automático de cada login (IP, fecha, user-agent) + vista admin con filtro y paginación
- **Alertas Seguridad**: 3 fallos de login → email a luis.gonzalez@siempria.com
- **Servicio Email**: SMTP configurable desde panel admin (Config Email)
- **Reportes Automáticos**: CRUD de reportes configurables (nombre, frecuencia, email, filtros por isla/marca/centro) accesible por todos los usuarios
- Endpoints: `/api/auth/change-password`, `/api/users/access-logs`, `/api/email-settings`, `/api/reports`
- Colecciones nuevas: `access_logs`, `email_config`, `report_configs`, `failed_login_log`

## Backlog

### P1 - Próximo
- Ajustar pantalla NOC (desbordamientos de widgets)
- Implementar envío real de reportes automáticos (cron/scheduler)

### P2
- Alertas inteligentes a Telegram
- Refactorización App.js de `siempria-monitor` (>3900 líneas)

## Credenciales
- Admin producción: `admin` / `Spw@1644`
- Admin seed: `admin` / `Conteo2024!`

## Archivos Clave
- Backend: `routes/auth.py`, `routes/users.py`, `routes/email_settings.py`, `routes/reports.py`, `services/email_service.py`
- Frontend: `src/App.jsx` (monolito)
- Scripts: `/app/deploy_conteo_v11.sh`
