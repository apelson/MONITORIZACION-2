# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. La plataforma permite monitorizar dispositivos de red, cámaras, grabadores DVR/NVR (Dahua), túneles VPN, y sistemas críticos (CRA).

## Product Requirements
1. ✅ JIRA Integration (DONE)
2. ✅ Dahua DVR Scheduler (5-min interval) (DONE)
3. ✅ Backup Functionality Fix (DONE)
4. ✅ Application Rebranding to "WatchTower by Siempria" (DONE - 26 Feb 2026)
5. ✅ Onboarding Wizard (DONE)
6. ✅ DVR Uptime Counter (DONE)
7. ✅ OpenVPN Monitoring (DONE - 26 Feb 2026)
8. ✅ Blank Screen Error Fix (DONE)
9. ✅ System Resource Monitor in NOC Header (DONE - 26 Feb 2026)
10. ✅ VPN Widget in NOC Dashboard (DONE - 26 Feb 2026)
11. ✅ Maintenance Panel Improvements (DONE - 26 Feb 2026)
12. ✅ System Status Data Loading Fix (DONE - 26 Feb 2026)
13. ✅ Device Type Counter Filtering (DONE - 26 Feb 2026)
14. ✅ Bug "Editar Grupo" campo input se borra (CONFIRMED FIXED by user)
15. ✅ Iconos de estado en dispositivos offline (Mantenimiento/Incidencia) (DONE - 26 Feb 2026)
16. ✅ Campo "Isla" en formulario de grupos (DONE - 26 Feb 2026)
17. ✅ Lista lateral de Islas con siluetas (DONE - 26 Feb 2026)
18. ✅ Mobile Dashboard - Vista Móvil Optimizada (DONE - 03 Mar 2026)
19. ✅ TenantAdminsManager UI Fix - Colores legibles (DONE - 03 Mar 2026)

## What's Been Implemented (03 Mar 2026)

### Latest Changes (Session 4) - 03 Mar 2026

#### 1. Mobile Dashboard - Vista Móvil Optimizada
- **Nuevo componente:** `/app/frontend/src/components/mobile/MobileDashboard.jsx`
- Dashboard optimizado para dispositivos móviles con diseño dark theme
- Header sticky con hora, botón de refresh y menú lateral (Sheet)
- Stats bar con contadores: Online, Offline, Total + indicador CRA
- Tabs: Resumen, Dispositivos, Alertas
- Vista de dispositivos offline con indicadores de estado (CRA, mantenimiento, incidencia)
- Lista de organizaciones con barras de progreso y conteo offline
- Bottom navigation fijo: Inicio, Dispositivos, Alertas, Orgs
- Búsqueda y filtrado por organización
- Auto-refresh cada 30 segundos

#### 2. Detección Automática de Móviles
- Hook `useIsMobile()` en App.js detecta dispositivos móviles por:
  - Screen width < 768px
  - Touch capability (`ontouchstart` o `maxTouchPoints`)
  - User agent móvil (Android, iPhone, iPad, etc.)
- Opción "Vista Móvil" en menú de usuario para cambiar manualmente
- Persistencia de preferencia en localStorage

#### 3. MobileDashboardWrapper
- Wrapper component que provee datos al MobileDashboard
- Fetches: devices, organizations, groups, alerts, deviceTypes
- Auto-refresh cada 30 segundos

#### 4. TenantAdminsManager UI Fix
- Corregido problema de texto no legible en fondo blanco
- Cambiado `text-white` a `text-foreground` para compatibilidad con temas claro/oscuro

### Previous Sessions (26 Feb 2026)

#### 1. Iconos de Estado en Dispositivos Offline (Mantenimiento + Incidencia)
- **Backend:** Modificado endpoint `/api/devices` para incluir campo `has_open_incident`
- Consulta incidencias abiertas (status: open, in_progress) por device_id
- Cada dispositivo ahora incluye flag `has_open_incident: true/false`
- **Frontend:** Cambiado icono de incidencia de FileText a ClipboardList (📋)
- Ambos iconos (🔧 mantenimiento y 📋 incidencia) pueden coexistir en la misma línea
- Ubicación: `/app/frontend/src/components/panels/NOCDashboard.jsx` líneas 1862-1868

#### 2. Campo "Isla" en Formulario de Grupos
- **Backend:** Añadido campo `island` a modelos GroupCreate y GroupUpdate
- Modificado endpoint POST `/api/groups` para guardar campo `island`
- PUT automáticamente soporta el campo via model_dump()
- **Frontend:** El campo ya estaba implementado en GroupFormDialog (App.js líneas 1204-1212)
- Lista de islas: Tenerife, Gran Canaria, Lanzarote, Fuerteventura, La Palma, La Gomera, El Hierro, La Graciosa

#### 3. Lista de Islas con Siluetas SVG
- **Nuevo componente:** `/app/frontend/src/components/common/CanaryIslandsSilhouettes.jsx`
- Siluetas SVG simplificadas de cada isla canaria
- Colores dinámicos según estado (verde: >95% online, amarillo: >80%, rojo: <80%)
- Animación pulsante cuando hay dispositivos offline
- **NOCDashboard:** Lista mejorada más ancha con siluetas, barras de progreso y contador de offline
- Ordenado por offline primero, luego por total de dispositivos

#### 1. Real-Time System Metrics via WebSocket
- Created new WebSocket endpoint `/api/ws/system-metrics`
- **CPU, RAM, HDD, y Red** se actualizan cada 2 segundos en tiempo real
- Automatic fallback to HTTP polling (3s) if WebSocket fails
- WebSocket reconnection on disconnect (5s delay)
- Visual ECG animation shows live system load
- Network shows upload/download speed in MB/s
- **Alertas visuales:** Colores cambian según umbrales (75% warning amarillo, 90% critical rojo parpadeante)
- **Sparklines:** Mini gráficas de tendencia mostrando los últimos 30 valores (~60 segundos de historial)
- **Notificaciones Telegram:** Alertas automáticas cuando CPU/RAM/HDD superan 90%, con cooldown de 5 minutos y notificación de recuperación

#### 3. Widget de Infraestructura en NOC Dashboard
- Nuevo componente `InfrastructureWidget.jsx` para mostrar ESXi, NAS, etc.
- Contador de infraestructura añadido al header (púrpura)
- Muestra dispositivos offline con alerta visual
- Mini métricas de CPU/RAM por dispositivo
- Link directo al panel completo de infraestructura

#### 4. Mejoras en ServerCard (Imágenes de Cámara)
- Refactorizada lógica de carga de imágenes con mejor manejo de errores
- Añadido botón de refresh manual para actualizar imagen
- Mejor logging para debugging en consola
- Limpieza de blob URLs para evitar memory leaks

#### 5. Maintenance Panel Improvements (`MaintenancePanel.jsx`)
- Added search bar with placeholder "Buscar por nombre, IP, ubicación..."
- Implemented sorting: offline devices first, then by high latency, then alphabetically
- Excluded DVR/Dahua/NVR/grabador devices from the maintenance list
- Added device count display ("X dispositivos disponibles")
- Added visual indicators for offline (red) and high latency (orange) devices
- Improved ScrollArea with fixed height (450px) for proper scrolling

#### 2. System Status Data Loading Fix
- Fixed frontend API call: Changed from `/settings/system-status/quick` to `/system-status`
- Now correctly parses response: `res.data.system.cpu_percent` and `res.data.system.memory.percent`
- Header status bar displays real-time CPU% and RAM% values
- Data refreshes every 10 seconds

#### 3. Device Type Counter Filtering
- Confirmed working: Device type counters have `onClick={() => setFilterTypeId(data.typeId)}`
- Clicking on type counters (CAMERAS, NAS, etc.) filters the device list

### Backend
- **VPN Monitoring Routes** (`/app/backend/routes/vpn.py`)
- **System Stats Routes** (`/app/backend/routes/system_stats.py`)
- **Settings Routes** (`/app/backend/routes/settings.py`) - `/system-status` endpoint with psutil

### Frontend Components
- **VPNWidget** (`/app/frontend/src/components/noc/widgets/VPNWidget.jsx`)
- **SystemResourceMonitor** (`/app/frontend/src/components/common/SystemResourceMonitor.jsx`)
- **MaintenancePanel** (`/app/frontend/src/components/panels/MaintenancePanel.jsx`)
- **ServerCard** (`/app/frontend/src/components/devices/ServerCard.jsx`)

## Verified Features (Test Report: iteration_20.json)
- ✅ System status API returns CPU% and RAM%
- ✅ Header status bar displays real resource data
- ✅ MaintenancePanel has working search bar
- ✅ MaintenancePanel sorting logic works
- ✅ Device type counters filter device list
- ✅ Settings page loads correctly
- ✅ Login works with admin/admin123

## Architecture
- **Frontend:** React (`/app/frontend/`)
- **Backend:** FastAPI (`/app/backend/`)
- **Database:** MongoDB

## Key Files Modified This Session
- `/app/frontend/src/components/mobile/MobileDashboard.jsx` - NUEVO: Dashboard móvil optimizado
- `/app/frontend/src/App.js` - Hook useIsMobile, MobileDashboardWrapper, opción Vista Móvil en menú
- `/app/frontend/src/components/settings/TenantAdminsManager.jsx` - Fix colores de texto

## Session 06 Mar 2026 - Estado Verificado

### Issues Resueltos del Handoff
1. ✅ **Login 500 Error** - FUNCIONAL. El handoff mencionaba un TypeError pero el código actual ya estaba correcto. Login probado exitosamente con curl y UI.
2. ✅ **Multi-tenancy Data Leak** - FUNCIONAL. Usuario `dagroup` (tenant_admin) ve correctamente 0 dispositivos, 0 CRA, 0 VPN porque su organización no tiene dispositivos asignados.
3. ✅ **Security Panel Integration** - YA INTEGRADO. El panel de seguridad está visible en Settings con funcionalidad completa:
   - IPs Bloqueadas Temporalmente
   - Lista Negra Permanente (añadir/eliminar)
   - Eventos de Seguridad Recientes

### Features Implementadas en Esta Sesión

#### Fail2ban Integration (COMPLETADO)
- **Backend Service**: `/app/backend/services/fail2ban_service.py`
  - Detección del estado de fail2ban en el sistema
  - Gestión de configuración (max_retry, ban_time, find_time)
  - Ban/unban manual de IPs
  - Generación de guía de instalación con configuración de jail y filtros
  - Sincronización con sistema de seguridad interno
  
- **Backend Routes**: `/app/backend/routes/fail2ban.py`
  - `GET /api/fail2ban/status` - Estado general de fail2ban
  - `GET /api/fail2ban/jail/{name}` - Estado de un jail específico
  - `GET/POST /api/fail2ban/config` - Configuración
  - `POST /api/fail2ban/ban` - Bloquear IP manualmente
  - `POST /api/fail2ban/unban` - Desbloquear IP
  - `GET /api/fail2ban/logs` - Historial de acciones
  - `GET /api/fail2ban/installation-guide` - Guía de instalación completa

- **Frontend Component**: `/app/frontend/src/components/settings/Fail2banPanel.jsx`
  - Panel completo con estadísticas visuales
  - Tabs: Acciones | Configuración | Historial
  - Guía de instalación con comandos copiables
  - Gestión de IPs bloqueadas
  - Integración con SecurityPanel existente

### Security Features Implementadas
- **Backend:** `/app/backend/services/security_service.py` - Brute force protection, IP blocking, security events
- **Backend Routes:** `/app/backend/routes/security.py` - APIs for blacklist management
- **Frontend:** SecurityPanel en App.js (líneas 1634-1841) - Gestión de IPs bloqueadas
- **NEW: Fail2ban Panel** - Detección de intrusiones a nivel de sistema operativo

## Pending Issues
1. **Contador de Infraestructura (0/0)** - Posiblemente los dispositivos de infraestructura no están clasificados correctamente en la DB.
2. **Welcome Tour** - El componente base está creado pero necesita targeting de elementos reales con data-testid.
3. **Sistema de alertas sonoras** - Pendiente verificación del usuario.
4. **Dominio siempriapp.com** - Configuración NAT en MikroTik del usuario (fuera del scope de desarrollo)

## Backlog / Future Tasks
- Integrar fail2ban para detección de intrusiones a nivel sistema
- Gestión de features por tenant desde superadmin
- Wizard de Configuración Inicial para admins nuevos
- Mapa interactivo de Canarias (clicable)
- Centro de Ayuda Integrado
- Dashboard personalizable por usuario
- Documentación exportable (PDF/HTML)
- Vídeos tutoriales
- Refactoring de App.js (monolito - más de 3800 líneas)

## Test Users
- **admin** - Role: admin - Password: admin123 (superadmin, ve todo)
- **dagroup** - Role: tenant_admin - Password: Test123! - Org: deaeccae-ec00-4129-9fb7-152d80a1a115 (ve solo su organización)

## Credentials
- Admin user: admin / admin123
- Production user: admin / Spw@16071977

## Test Reports
- `/app/test_reports/iteration_20.json` - All tests passed (100% backend, 100% frontend)
