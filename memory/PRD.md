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

### Multi-Tenancy (Implementado 24-Feb-2026)
- ✅ Servicio de filtrado por tenant (`multitenancy_service.py`)
- ✅ Rol `tenant_admin` que solo ve datos de sus organizaciones asignadas
- ✅ Rol `admin` (superadmin) que ve TODOS los datos sin filtrar
- ✅ Filtrado aplicado a:
  - `/api/organizations` - Organizaciones
  - `/api/groups` - Grupos
  - `/api/devices` y `/api/devices/stats` - Dispositivos
  - `/api/alerts` - Alertas
  - `/api/dahua/devices` y `/api/dahua/status` - Dispositivos Dahua
- ✅ Permisos: tenant_admin puede crear/editar/eliminar dentro de su tenant
- ✅ Validación de seguridad: 403 Forbidden al intentar acceder fuera del tenant

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

## Sesión 24-Feb-2026 - Multi-Tenancy Completado
- [x] Crear servicio `multitenancy_service.py` con lógica de filtrado
- [x] Implementar filtrado en endpoints de organizaciones y grupos
- [x] Implementar filtrado en endpoints de dispositivos y stats
- [x] Implementar filtrado en endpoints de alertas
- [x] Implementar filtrado en endpoints de Dahua devices
- [x] Agregar rol `tenant_admin` a permisos de CRUD
- [x] Crear usuario de prueba `dagroup` (tenant_admin)
- [x] Tests automatizados: 16/16 pasaron

## Tareas Pendientes

### P0 - Multi-Tenancy UI
- [ ] UI en Super Admin para crear usuarios tenant_admin
- [ ] UI para asignar organizaciones a usuarios tenant_admin
- [ ] Flags de características por tenant (habilitar/deshabilitar módulos)
- [ ] Logos personalizables por organización/tenant

### P1 - Alta Prioridad
- [ ] Estado CRA armed/disarmed (bloqueado - necesita documentación API)
- [ ] Regresiones NOC Dashboard (widget DVR, alertas clickeables)

### P2 - Media Prioridad
- [ ] Refactorizar App.js (~4000 líneas → ~2500 líneas)
- [ ] Refactorizar NOCDashboard.jsx (~1850 líneas)
- [ ] Reportes SLA mensuales en PDF

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

### Archivos Clave
- `/app/backend/services/multitenancy_service.py` - Lógica de filtrado
- `/app/backend/routes/organizations.py` - Endpoints con filtrado
- `/app/backend/routes/devices.py` - Endpoints con filtrado
- `/app/backend/routes/dahua.py` - Endpoints con filtrado

## Servidor de Producción
- Ruta: /opt/siempria-monitor/
- Frontend: /opt/siempria-monitor/frontend/
- Backend: /opt/siempria-monitor/backend/

## Servidor de Backup
- IP: 192.168.1.4
- Carpeta: SIEMPRIAPP
- Usuario: siempria
