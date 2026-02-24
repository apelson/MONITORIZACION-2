# Siempria Network Monitor - PRD

## Descripción
Sistema de monitorización NOC (Network Operations Center) para vigilancia de dispositivos de red, cámaras, grabadores Dahua y sistemas CRA. Con soporte multi-tenancy completo para gestión de múltiples empresas/clientes.

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
- ✅ Gestión de usuarios con roles
- ✅ 2FA con Google Authenticator

### Multi-Tenancy Completo (24-Feb-2026) ✅
- ✅ Servicio de filtrado por tenant (`multitenancy_service.py`)
- ✅ Rol `tenant_admin` con datos aislados por organización
- ✅ Rol `admin` (superadmin) ve TODO sin filtrar
- ✅ Filtrado en todos los endpoints:
  - Organizaciones, Grupos, Dispositivos, Stats, Alertas, Dahua

### UI Gestión Tenant Admins (24-Feb-2026) ✅
- ✅ Panel Super Admin > "Usuarios Tenant"
- ✅ Dashboard con estadísticas
- ✅ Crear usuario tenant_admin con organizaciones
- ✅ Ver detalles, editar, cambiar contraseña, eliminar
- ✅ Tests: 100% pasados

### Feature Flags por Cliente (24-Feb-2026) ✅
- ✅ Configuración de módulos por usuario tenant_admin
- ✅ UI con switches para habilitar/deshabilitar:
  - Dispositivos, Alertas, CRA, Grabadores Dahua
  - Vista en Directo, Incidencias, Reportes
  - AI Insights, Galería
- ✅ Botones "Habilitar todos" / "Deshabilitar todos"
- ✅ Feature flags devueltos en login
- ✅ Frontend oculta pestañas deshabilitadas

### Notificaciones
- ✅ Telegram, Email (SMTP), WhatsApp (manual)

### Backups Automatizados
- ✅ Diario (03:00), Semanal (Dom 04:00), Mensual (día 1 05:00)
- ✅ Destino: //192.168.1.4/SIEMPRIAPP

## Tareas Pendientes

### P1 - Alta Prioridad
- [ ] Logos personalizables por organización/tenant
- [ ] Estado CRA armed/disarmed (necesita documentación API)

### P2 - Media Prioridad
- [ ] Regresiones NOC Dashboard (widget DVR, alertas clickeables)
- [ ] Reportes SLA mensuales PDF
- [ ] Refactorizar App.js y NOCDashboard.jsx

### P3 - Futuro
- [ ] Integración Slack/Microsoft Teams
- [ ] Webhooks, API pública

## Credenciales
- **Super Admin:** admin / Spw@16071977
- **Tenant Admin:** dagroup / Dagroup2026!

## Archivos Clave

### Backend
- `/backend/services/multitenancy_service.py` - Filtrado multi-tenant
- `/backend/routes/superadmin_tenants.py` - API gestión tenants
- `/backend/routes/auth.py` - Login con feature_flags

### Frontend
- `/frontend/src/components/settings/TenantAdminsManager.jsx` - UI gestión
- `/frontend/src/components/settings/SuperAdminTab.jsx` - Panel Super Admin
- `/frontend/src/App.js` - canAccessSection con feature_flags

## Endpoints API - Gestión Tenant

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| /api/admin/tenants/stats | GET | Estadísticas |
| /api/admin/tenants/tenant-admins | GET/POST | Listar/Crear |
| /api/admin/tenants/tenant-admins/{id} | GET/PUT/DELETE | CRUD |
| /api/admin/tenants/tenant-admins/{id}/set-password | POST | Contraseña |
| /api/admin/tenants/tenant-admins/{id}/feature-flags | PUT | Módulos |
| /api/admin/tenants/organizations | GET | Para asignar |

## Feature Flags Disponibles
- `devices` - Dispositivos/Cámaras
- `alerts` - Sistema de alertas
- `cra` - Central Receptora Alarmas
- `dahua` - Grabadores DVR/NVR
- `live_view` - Vista en directo
- `incidents` - Gestión incidencias
- `reports` - Estadísticas y reportes
- `ai_insights` - Panel AI
- `gallery` - Galería de imágenes

## Servidor Producción
- Ruta: /opt/siempria-monitor/
