# Siempria Network Monitor - Product Requirements Document

## Original Problem Statement
Build and deploy "Siempria Network Monitor," a full-stack network monitoring application pivoted into a multi-tenant SaaS platform named "Siempriapp." The application monitors Mobotix cameras, VMware ESXi servers, QNAP, Synology NAS devices, and OpenVPN servers.

## Latest Session: 2026-02-12 - NOC Dashboard Professional

### NOC Dashboard (Centro de Operaciones de Red 24/7) ✅
- **Archivo**: `/app/frontend/src/components/panels/NOCDashboard.jsx`
- **Botón flotante**: `/app/frontend/src/components/common/NOCFloatingButton.jsx`

#### Características implementadas:
1. **Estadísticas en tiempo real**:
   - Total dispositivos, Online, Offline, Uptime %, Alertas Críticas, Organizaciones
   - Tarjetas con colores distintivos y animaciones

2. **Gráfico histórico de Uptime (24h)**:
   - AreaChart con gradiente cyan
   - Tooltip interactivo
   - Badge "Tiempo Real"

3. **Estado por Organización**:
   - Lista de todas las organizaciones con su estado
   - Barra de progreso de uptime por organización
   - Indicadores visuales (verde=sano, rojo=problemas)
   - Badges de online/offline por organización

4. **Distribución de Estado (Pie Chart)**:
   - Gráfico circular Online/Offline/Desconocido
   - Leyenda interactiva

5. **Lista de Dispositivos Offline**:
   - Muestra dispositivos offline ordenados por tiempo
   - Botones de acción: Ver dispositivo, Crear incidencia, Ver historial
   - Indicador de tiempo desde que está offline

6. **Alertas Recientes**:
   - Últimas 10 alertas
   - Indicador de tipo (caída/recuperación)
   - Clic para navegar al dispositivo

7. **Estado CRA**:
   - Panel dedicado para dispositivos de Central Receptora de Alarmas
   - Grid visual con estado por dispositivo

8. **Header profesional**:
   - Reloj en tiempo real
   - Indicador "Sistema Activo"
   - Botón refrescar
   - Logo Siempria

9. **Navegación interactiva**:
   - Clic en dispositivo offline → navega al dispositivo
   - Clic en crear incidencia → abre panel de incidencias
   - Clic en ver historial → abre modal de historial

10. **Botón flotante NOC**:
    - Muestra contador de dispositivos offline
    - Animación de pulso cuando hay problemas
    - Expande al hover mostrando "NOC 24/7"

## User Personas
- **Network Administrators**: Monitor cameras and infrastructure devices
- **IT Managers**: View statistics, alerts, incidents, and reports
- **End Users**: Access public dashboards (planned)
- **SuperAdmin**: Manage multiple company tenants (multi-tenant SaaS)

## Core Requirements
- Multi-language support (ES, EN, DE, FR, IT, RU, ZH)
- Real-time device monitoring with alerts
- Infrastructure monitoring (ESXi, QNAP, Synology, OpenVPN)
- NAS connection alerts for cameras
- Audible alerts for critical events
- Email notifications via SMTP
- Push/Web notifications for real-time alerts
- FTP status monitoring for CRA devices
- Hemispheric camera view support (all models)
- Role-Based Access Control (RBAC)

## Architecture
```
/app/
├── backend/              # FastAPI
│   ├── server.py         # Main server (~820 lines)
│   ├── routes/           # API endpoints
│   └── services/         
└── frontend/             # React + Craco
    ├── src/
    │   ├── App.js        # Main component (~4518 lines, refactored from 6463)
    │   ├── contexts/     # AuthContext
    │   ├── components/
    │   │   ├── common/   # SectionLoader, CRAFloatingButton, LiveViewerFloatingButton
    │   │   ├── panels/   # AlertsPanel, StatisticsPanel, IncidentsPanel, AccessLogsPanel, CRADashboard, LiveViewer, InfrastructurePanel
    │   │   └── settings/ # RolesManager, SuperAdminTab, NotificationSettings
    │   └── ...
    └── public/
        └── sounds/       # cra-alert.wav
```

## What's Been Implemented

### Session: 2026-02-10 (Fase 3 - Final)

#### Refactorización App.js - Fase 3 Completada ✅
- **ScheduledReportsPanel extraído** - ~214 líneas movidas a `/components/panels/ScheduledReportsPanel.jsx`
- App.js reducido de 4036 líneas a **3822 líneas**
- **TOTAL REDUCCIÓN: 6463 → 3822 líneas (-40.9%, -2641 líneas)**
- Testing agent verificó funcionamiento: 100% tests pasados

#### Componentes extraídos (7 total):
| Componente | Archivo | Líneas aprox |
|------------|---------|--------------|
| AlertsPanel | `/components/panels/AlertsPanel.jsx` | ~630 |
| StatisticsPanel | `/components/panels/StatisticsPanel.jsx` | ~200 |
| IncidentsPanel | `/components/panels/IncidentsPanel.jsx` | ~200 |
| AccessLogsPanel | `/components/panels/AccessLogsPanel.jsx` | ~439 |
| BackupPanel | `/components/panels/BackupPanel.jsx` | ~222 |
| DailyReportPanel | `/components/panels/DailyReportPanel.jsx` | ~183 |
| ScheduledReportsPanel | `/components/panels/ScheduledReportsPanel.jsx` | ~214 |

### Session: 2026-02-10 (Fase 2)

#### Refactorización App.js - Fase 2 ✅
- **BackupPanel extraído** - ~222 líneas movidas a `/components/panels/BackupPanel.jsx`
- **DailyReportPanel extraído** - ~183 líneas movidas a `/components/panels/DailyReportPanel.jsx`
- **AccessLogsPanel extraído** - ~406 líneas movidas a `/components/panels/AccessLogsPanel.jsx`
- App.js reducido de 4924 líneas a 4036 líneas
- Testing agent verificó funcionamiento: 100% tests pasados

### Session: 2026-02-09

#### Refactorización App.js - Fase 1 ✅
- **AlertsPanel extraído** - ~630 líneas movidas a `/components/panels/AlertsPanel.jsx`
- **StatisticsPanel extraído** - componente de estadísticas
- **IncidentsPanel extraído** - componente de incidentes
- App.js reducido de 6463 líneas a 4924 líneas
- Componente independiente con props: `alerts, organizations, devices, groups, authAxios`

#### Soporte Cámaras Hemisféricas Ampliado ✅
- Ahora incluye todos los modelos: **C25, C26, Q24, Q25, Q26, S14, S15, S16, M25, M26**
- Actualizado en:
  - `App.js` - DeviceCard component
  - `LiveViewer.jsx` - Live view panel

#### Global Section Loader ✅
- `SectionLoader.jsx` component created
- Shows loading overlay with company logo after 2 seconds
- `useDelayedLoading` hook for integration

#### Sound Alert Fix ✅
- Fixed audio file format (.wav)
- CRADashboard.jsx updated

#### Bug Fixes ✅
- Fixed duplicate `if (loading)` in CRADashboard.jsx
- Fixed AlertsPanel AuthContext issue

### Session: 2026-02-12 - Nueva UI de Alertas ✅

#### Sistema de Alertas Mejorado
- **AlertBell Component** (`/components/alerts/AlertBell.jsx`):
  - Campana de notificaciones con contador de alertas no leídas
  - Panel lateral deslizable que se abre desde la derecha
  - Lista de alertas con colores por tipo (rojo=caída, verde=recuperado)
  - Indicador de tiempo relativo (9m, 1d, 2d)
  - Botón "Marcar leídas" y "Ver todas las alertas"
  - Persistencia de alertas leídas en localStorage

- **DeviceStatusGrid Component** (`/components/alerts/DeviceStatusGrid.jsx`):
  - Mosaico visual de dispositivos con colores por estado
  - Verde=Online, Rojo=Offline (pulsante), Gris=Desconocido
  - Filtros: búsqueda por nombre/IP, estado, grupo
  - Tamaños de grid configurables (S, M, L)
  - Tooltips con información del dispositivo
  - Badges de estadísticas (X Online, Y Offline, Z Total)

- **DeviceHistoryModal Component** (`/components/alerts/DeviceHistoryModal.jsx`):
  - Modal con historial de un dispositivo específico
  - Stats: Último Check, Uptime 24h (%), Alertas
  - Tabs: Alertas y Historial
  - Timeline visual de estados
  - Botón "Verificar Ahora" para check manual

- **WebSocket para Alertas en Tiempo Real**:
  - Backend: `services/websocket_service.py` - WebSocketManager class
  - Backend: `routes/websocket.py` - Endpoint `/api/ws/alerts`
  - Frontend: `hooks/useWebSocketAlerts.js` - Hook con auto-reconnect
  - Alertas se envían instantáneamente a todos los clientes
  - Toast notifications + sonido automático

- **Logging Mejorado en device_service.py**:
  - [SCHEDULER] logs para ciclos de verificación
  - [CHECK] logs para cada dispositivo
  - [STATUS CHANGE] logs para cambios detectados
  - [ALERT] logs para alertas creadas
  - [WEBSOCKET] logs para notificaciones enviadas

- **Lazy Loading Component** (`/components/common/LazyImage.jsx`):
  - IntersectionObserver para carga diferida
  - Solo carga imágenes visibles en viewport
  - Placeholder mientras carga

### Previous Sessions
- Role-Based Access Control (RBAC)
- CRA Dashboard filters (ARMADO/DESARMADO)
- Floating buttons color differentiation
- FTP Status Badge in CRA Dashboard
- All infrastructure features (ESXi, QNAP, Synology, alerts, i18n, etc.)

## Prioritized Backlog

### P0 - Critical
- [x] RBAC system functional
- [x] CRA filters (ARMADO/DESARMADO) working
- [x] Floating button colors differentiated
- [x] Global loading screen implemented
- [x] Sound alert file fixed
- [x] AlertsPanel refactored
- [x] All hemispheric camera models supported
- [x] AccessLogsPanel refactored (Session 2026-02-10)
- [x] Nueva UI de Alertas con campana, sidebar y mosaico (Session 2026-02-12)

### P1 - High Priority
- [x] Continue App.js Refactoring
  - [x] Extract StatisticsPanel - DONE
  - [x] Extract IncidentsPanel - DONE
  - [x] Extract AccessLogsPanel - DONE (2026-02-10)
  - [x] Extract BackupPanel - DONE (2026-02-10)
  - [x] Extract DailyReportPanel - DONE (2026-02-10)
  - [x] Extract ScheduledReportsPanel - DONE (2026-02-10 Fase 3)
  - [x] LoginPage - Ya existe en /components/auth/
  - [x] DeviceFormDialog - Ya existe en /components/dialogs/
- [ ] List virtualization with react-window for 5k+ devices

### P2 - Medium Priority
- [ ] Full Multi-Tenant (SaaS) Implementation
- [ ] Backend stability improvements

### P3 - Future/Backlog
- [ ] Stripe payment integration checkout flow
- [ ] Per-client subdomains
- [ ] Public dashboards UI
- [ ] Lazy loading for camera images
- [ ] Public domain access fix (siempriapp.com)

## Key API Endpoints

### Roles & Permissions
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create new role
- `GET /api/roles/my-permissions` - Get current user permissions
- `GET /api/roles/available-permissions` - Get all available permissions

### Camera & Hemispheric
- `GET /api/camera-stream/hemispheric/{device_id}?view=full|panorama` - Hemispheric view
- `GET /api/camera-stream/ftp-status/{device_id}` - FTP configuration status

## Database Collections
- `devices` - Device information
- `roles` - Role definitions and permissions
- `ftp_history` - FTP status change history
- `users` - User accounts (includes role_id)
- `organizations` - Multi-tenant organizations
- `groups` - Device groups

## Production Environment
- **Development Source**: `/home/monitorizacion/Documentos/MONITORIZACION-main/`
- **Production Running**: `/opt/siempria-monitor/`
- **Domain**: siempriapp.com
- **CRITICAL**: Frontend needs `.env` with `REACT_APP_BACKEND_URL=https://siempriapp.com`

## Test Credentials
- Admin: `admin` / `Spw@16071977`
- Operador: `operador` / `operador`
- Tecnico: `tecnico` / `tecnico123`

## Key Files Modified This Session
- `/app/frontend/src/App.js` - Refactored, added AlertsPanel import, hemispheric models
- `/app/frontend/src/components/panels/AlertsPanel.jsx` - NEW: Extracted component (~630 lines)
- `/app/frontend/src/components/panels/LiveViewer.jsx` - Added hemispheric models
- `/app/frontend/src/components/panels/CRADashboard.jsx` - Fixed duplicate if, audio path
- `/app/frontend/src/components/common/SectionLoader.jsx` - NEW: Global loading component
- `/app/frontend/src/components/common/LiveViewerFloatingButton.jsx` - Purple/violet color

## Production Update Commands
```bash
# Connect to production server
ssh usuario@siempriapp.com
cd /opt/siempria-monitor/frontend

# Download updated files
curl -o src/components/panels/CRADashboard.jsx "https://noc-debug.preview.emergentagent.com/api/download-file?path=CRADashboard.jsx"
curl -o src/components/common/LiveViewerFloatingButton.jsx "https://noc-debug.preview.emergentagent.com/api/download-file?path=LiveViewerFloatingButton.jsx"
curl -o src/components/common/SectionLoader.jsx "https://noc-debug.preview.emergentagent.com/api/download-file?path=SectionLoader.jsx"
curl -o src/components/panels/AlertsPanel.jsx "https://noc-debug.preview.emergentagent.com/api/download-file?path=AlertsPanel.jsx"
curl -o src/components/panels/LiveViewer.jsx "https://noc-debug.preview.emergentagent.com/api/download-file?path=LiveViewer.jsx"
curl -o src/App.js "https://noc-debug.preview.emergentagent.com/api/download-file?path=App.js"

# Rebuild frontend
yarn build

# Restart services
sudo systemctl restart siempria-backend
sudo systemctl reload nginx
```

## Hemispheric Camera Models Supported
All Mobotix hemispheric models are now detected:
- **C Series**: C25, C26
- **Q Series**: Q24, Q25, Q26
- **S Series**: S14, S15, S16
- **M Series**: M25, M26
