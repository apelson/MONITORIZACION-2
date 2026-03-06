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
20. ✅ Fail2ban Integration (DONE - 06 Mar 2026)
21. ✅ Feature Management per Organization (DONE - 06 Mar 2026)
22. ✅ Welcome Tour (DONE - 06 Mar 2026)
23. ✅ Help Center (DONE - 06 Mar 2026)
24. ✅ Interactive Canary Islands Map (DONE - 06 Mar 2026)
25. ✅ Customizable Dashboard (DONE - 06 Mar 2026)
26. ✅ Video Tutorials Section (DONE - 06 Mar 2026)

## What's Been Implemented (06 Mar 2026)

### Latest Session - 06 Mar 2026

#### 1. Mapa Interactivo de las Islas Canarias
- **Componente:** `/app/frontend/src/components/maps/CanaryIslandsMap.jsx`
- **Tab:** "Mapa" con icono de MapPin verde
- **Funcionalidades:**
  - SVG de las 7 islas canarias (Tenerife, Gran Canaria, Lanzarote, Fuerteventura, La Palma, La Gomera, El Hierro)
  - Estadísticas por isla: total/online/offline dispositivos
  - Colores dinámicos según estado (verde OK, rojo con alertas)
  - Controles de zoom (acercar, alejar, restablecer)
  - Tooltips al pasar sobre las islas
  - Panel detallado al hacer clic en una isla
  - Brújula y leyenda integradas
  - Animación de pulso para islas con dispositivos offline

#### 2. Dashboard Personalizable
- **Componente:** `/app/frontend/src/components/dashboard/CustomizableDashboard.jsx`
- **Tab:** "Mi Dashboard" con icono de Layers índigo
- **Funcionalidades:**
  - 12 widgets disponibles para elegir
  - Configuración guardada en localStorage
  - Dialog de personalización con switches por widget
  - Ordenamiento de widgets con botones arriba/abajo
  - Botón restaurar a configuración por defecto
  - Widgets implementados:
    - Estadísticas de Dispositivos
    - Resumen de Alertas
    - Estado CRA
    - Estado Grabadores
    - Estado VPN
    - Recursos del Sistema (CPU/RAM/Disco)
    - Alertas Recientes
    - Gráfico de Uptime
    - Usuarios Conectados
    - Salud del Servidor
    - Acciones Rápidas
    - Reloj y Fecha

#### 3. Video Tutoriales
- **Componente:** `/app/frontend/src/components/help/VideoTutorials.jsx`
- **Tab:** "Tutoriales" con icono de PlayCircle rojo
- **Funcionalidades:**
  - 8 tutoriales predefinidos
  - Búsqueda por título y descripción
  - Filtros por categoría: Básicos, Dispositivos, Alertas, Seguridad, Usuarios, Reportes
  - Badges de dificultad: Principiante, Intermedio, Avanzado
  - Sección de "Tutoriales Destacados"
  - Thumbnails con duración
  - Contador de vistas
  - Modal de reproducción de video
  - Sección "Empezar Rápido" con links directos

#### 4. Integración en UI Principal
- **Nuevos tabs en App.js:**
  - `tab-map`: Mapa de Canarias
  - `tab-mydashboard`: Mi Dashboard
  - `tab-tutorials`: Tutoriales
- **Nuevos botones en menú móvil** para las tres secciones
- **Imports añadidos:**
  - `CanaryIslandsMap`
  - `CustomizableDashboard`
  - `VideoTutorials`
  - Icono `PlayCircle`

### Previous Sessions

#### Session 06 Mar 2026 - Features Implementadas

**Fail2ban Integration (COMPLETADO)**
- Backend Service: `/app/backend/services/fail2ban_service.py`
- Backend Routes: `/app/backend/routes/fail2ban.py`
- Frontend Component: `/app/frontend/src/components/settings/Fail2banPanel.jsx`

**Gestión de Features por Organización (COMPLETADO)**
- Backend endpoints en `/app/backend/routes/organizations.py`
- Frontend: `/app/frontend/src/components/settings/OrganizationFeaturesManager.jsx`

**Welcome Tour (COMPLETADO)**
- Component: `/app/frontend/src/components/onboarding/WelcomeTour.jsx`
- 7 pasos guiados

**Centro de Ayuda Integrado (COMPLETADO)**
- Component: `/app/frontend/src/components/settings/HelpCenter.jsx`

## Architecture
- **Frontend:** React (`/app/frontend/`)
- **Backend:** FastAPI (`/app/backend/`)
- **Database:** MongoDB

## Key Files Modified This Session
- `/app/frontend/src/App.js` - Añadidos imports y tabs para Map, MyDashboard, Tutorials
- `/app/frontend/src/components/maps/CanaryIslandsMap.jsx` - YA EXISTÍA, verificado funcionando
- `/app/frontend/src/components/dashboard/CustomizableDashboard.jsx` - YA EXISTÍA, verificado funcionando
- `/app/frontend/src/components/help/VideoTutorials.jsx` - NUEVO, creado en esta sesión

## Pending Issues
1. **Contador de Infraestructura (0/0)** - Posiblemente los dispositivos de infraestructura no están clasificados correctamente en la DB.
2. **Sistema de alertas sonoras** - Pendiente verificación del usuario.
3. **Dominio siempriapp.com** - Configuración NAT en MikroTik del usuario (fuera del scope de desarrollo)

## Backlog / Future Tasks
- Drag-and-drop reordering for customizable dashboard widgets
- Real video content for tutorials (currently placeholder)
- Real-time system stats integration for dashboard widgets
- Documentación exportable (PDF/HTML)
- Refactoring de App.js (monolito - más de 4000 líneas)
- Wizard de Configuración Inicial mejorado

## Test Users
- **admin** - Role: admin - Password: admin123 (superadmin, ve todo)
- **dagroup** - Role: tenant_admin - Password: Test123! - Org: deaeccae-ec00-4129-9fb7-152d80a1a115 (ve solo su organización)

## Credentials
- Admin user: admin / admin123
- Production user: admin / Spw@16071977

## Test Reports
- `/app/test_reports/iteration_20.json` - All tests passed (100% backend, 100% frontend)
