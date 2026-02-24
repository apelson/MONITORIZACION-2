# Siempria Network Monitor - PRD

## Descripción
Sistema de monitorización NOC (Network Operations Center) para vigilancia de dispositivos de red, cámaras, grabadores Dahua y sistemas CRA. Con soporte multi-tenancy para gestión de múltiples empresas/clientes.

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
- ✅ Gestión de usuarios con roles (admin, manager, viewer, operator, technician, tenant_admin)
- ✅ 2FA con Google Authenticator

### Multi-Tenancy (Completado 24-Feb-2026)
- ✅ Servicio de filtrado por tenant (`multitenancy_service.py`)
- ✅ Rol `tenant_admin` que solo ve datos de sus organizaciones asignadas
- ✅ Rol `admin` (superadmin) que ve TODOS los datos sin filtrar
- ✅ Filtrado aplicado a todos los endpoints principales:
  - `/api/organizations` y `/api/groups`
  - `/api/devices` y `/api/devices/stats`
  - `/api/alerts`
  - `/api/dahua/devices` y `/api/dahua/status`
- ✅ Permisos: tenant_admin puede CRUD dentro de su tenant
- ✅ Validación de seguridad: 403 Forbidden al intentar acceder fuera del tenant

### UI Super Admin - Gestión Tenant Admins (Completado 24-Feb-2026)
- ✅ Panel Super Admin con pestañas: "Usuarios Tenant" y "Portal SaaS"
- ✅ Dashboard con stats (Tenant Admins, Organizaciones, Asignadas, Sin asignar)
- ✅ Lista de usuarios tenant_admin con búsqueda y stats
- ✅ Crear nuevo usuario tenant_admin con asignación de organizaciones
- ✅ Ver detalles completos del usuario (organizaciones, grupos, dispositivos)
- ✅ Editar información y organizaciones asignadas
- ✅ Cambiar contraseña de usuario
- ✅ Eliminar usuario con confirmación
- ✅ Tests: 100% pasados (10/10 features)

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

## Tareas Pendientes

### P1 - Alta Prioridad
- [ ] Flags de características por tenant (habilitar/deshabilitar módulos CRA, Dahua, etc.)
- [ ] Logos personalizables por organización/tenant
- [ ] Estado CRA armed/disarmed (bloqueado - necesita documentación API)

### P2 - Media Prioridad
- [ ] Regresiones NOC Dashboard (widget DVR, alertas clickeables)
- [ ] Reportes SLA mensuales en PDF
- [ ] Refactorizar App.js (~4000 líneas)
- [ ] Refactorizar NOCDashboard.jsx (~1850 líneas)

### P3 - Baja Prioridad / Futuro
- [ ] Integración Slack/Microsoft Teams
- [ ] Webhooks para eventos
- [ ] API pública documentada

## Credenciales de Prueba
- **Super Admin:** admin / Spw@16071977
- **Tenant Admin:** dagroup / Dagroup2026! (acceso a DOMINGO ALONSO GROUP)

## Arquitectura Multi-Tenancy

### Modelo de Datos
```
users: {
  id, username, role, organization_ids[], tenant_id
}
organizations: {
  id, name, tenant_id
}
groups: {
  id, name, organization_id
}
devices: {
  id, name, group_id
}
```

### Roles
- `admin`: Ve TODO sin filtros (superadmin)
- `tenant_admin`: Ve solo datos de sus organization_ids
- `manager`, `operator`, etc: Filtrado por group_ids

### Archivos Clave - Multi-Tenancy
- `/app/backend/services/multitenancy_service.py` - Lógica de filtrado
- `/app/backend/routes/superadmin_tenants.py` - API gestión tenant admins
- `/app/frontend/src/components/settings/TenantAdminsManager.jsx` - UI gestión
- `/app/frontend/src/components/settings/SuperAdminTab.jsx` - Panel Super Admin

### Endpoints API - Gestión Tenant Admins
- `GET /api/admin/tenants/stats` - Estadísticas de la plataforma
- `GET /api/admin/tenants/tenant-admins` - Lista de tenant admins
- `POST /api/admin/tenants/tenant-admins` - Crear tenant admin
- `GET /api/admin/tenants/tenant-admins/{id}` - Detalles de un tenant admin
- `PUT /api/admin/tenants/tenant-admins/{id}` - Actualizar tenant admin
- `DELETE /api/admin/tenants/tenant-admins/{id}` - Eliminar tenant admin
- `POST /api/admin/tenants/tenant-admins/{id}/set-password` - Cambiar contraseña
- `GET /api/admin/tenants/organizations` - Organizaciones para asignación

## Servidor de Producción
- Ruta: /opt/siempria-monitor/
- Frontend: /opt/siempria-monitor/frontend/
- Backend: /opt/siempria-monitor/backend/

## Servidor de Backup
- IP: 192.168.1.4
- Carpeta: SIEMPRIAPP
- Usuario: siempria
