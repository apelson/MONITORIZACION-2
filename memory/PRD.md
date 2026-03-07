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
27. ✅ **Real Interactive Map with Leaflet/OpenStreetMap** (DONE - 07 Mar 2026)
28. ✅ **Brand Visit Ranking System** (DONE - 07 Mar 2026)
29. ✅ **Statistics Viewer Role** (DONE - 07 Mar 2026)

## What's Been Implemented (07 Mar 2026)

### Latest Session - 07 Mar 2026

#### 1. Mapa Interactivo Real con Leaflet
- **Componente:** `/app/frontend/src/components/maps/LeafletCanaryMap.jsx`
- **Reemplaza:** El anterior mapa SVG (CanaryIslandsMap.jsx)
- **Tecnologías:** react-leaflet, leaflet, OpenStreetMap
- **Funcionalidades:**
  - Mapa real de las Islas Canarias usando OpenStreetMap
  - 3 estilos de mapa: Calles (OpenStreetMap), Satélite (ArcGIS), Terreno (OpenTopoMap)
  - Marcadores interactivos para cada isla con conteo de dispositivos
  - Chips de selección rápida de islas (TF, GC, LZ, FV, LP, LG, EH)
  - Panel de detalles al seleccionar una isla
  - Controles de zoom y navegación
  - Leyenda de estados (Todo OK, Con alertas, Sin dispositivos)
  - Coordenadas reales de las 7 islas canarias

#### 2. Sistema de Ranking de Visitas por Marca
- **Componente Frontend:** `/app/frontend/src/components/panels/BrandRankingPanel.jsx`
- **Backend Routes:** `/app/backend/routes/brand_statistics.py`
- **Marcas Soportadas:** AUDI, VOLKSWAGEN, SKODA, HONDA, DUCATI, DAOCASION
- **Funcionalidades:**
  - Ranking de marcas por número de visitas
  - Filtros por isla (7 islas canarias) y período (día, semana, mes, año)
  - 3 sub-tabs: Ranking, Gráficos, Por Isla
  - Gráfico de barras horizontal por marca
  - Gráfico de pie para distribución de visitas
  - Tabla comparativa de visitas por isla
  - Estadísticas en header: Marca Líder, Visitas Hoy, Esta Semana, Este Mes
  - API endpoints:
    - GET /api/brand-statistics/brands
    - GET /api/brand-statistics/ranking
    - GET /api/brand-statistics/summary
    - GET /api/brand-statistics/ranking-by-island
    - POST /api/brand-statistics/record
    - GET /api/brand-statistics/daily-trend/{brand_id}

#### 3. Rol Statistics Viewer
- **Definición:** `/app/backend/routes/roles.py` - Nuevo rol "statistics_viewer"
- **Permisos:** Solo acceso a la sección de Estadísticas
- **Frontend:** Lógica en `canAccessSection()` para restringir navegación

### Previous Sessions

#### Session 06 Mar 2026 - Features Implementadas
- Fail2ban Integration
- Gestión de Features por Organización
- Welcome Tour (7 pasos)
- Centro de Ayuda Integrado
- Interactive Canary Islands Map (SVG - ahora reemplazado)
- Customizable Dashboard
- Video Tutorials

## Architecture
- **Frontend:** React (`/app/frontend/`)
- **Backend:** FastAPI (`/app/backend/`)
- **Database:** MongoDB

## Key Files Modified This Session
- `/app/frontend/src/App.js` - Integración de LeafletCanaryMap y BrandRankingPanel
- `/app/frontend/src/components/maps/LeafletCanaryMap.jsx` - NUEVO
- `/app/frontend/src/components/panels/BrandRankingPanel.jsx` - NUEVO
- `/app/backend/routes/brand_statistics.py` - NUEVO
- `/app/backend/routes/roles.py` - Añadido rol statistics_viewer
- `/app/backend/server.py` - Registro de brand_statistics_router

## Pending Issues
1. **Contador de Infraestructura (0/0)** - Posiblemente los dispositivos de infraestructura no están clasificados correctamente en la DB.

## Backlog / Future Tasks
- (P1) Almacenamiento histórico de datos de visitas por marca
- (P1) Scheduler automático para recolección diaria de estadísticas
- (P2) Añadir videos reales a la sección de Tutoriales
- (P2) Refactoring de App.js (monolito - más de 4000 líneas)
- Drag-and-drop reordering for customizable dashboard widgets
- Documentación exportable (PDF/HTML)

## Test Users
- **admin** - Role: admin - Password: admin123 (superadmin, ve todo)
- **dagroup** - Role: tenant_admin - Password: Test123! - Org: deaeccae-ec00-4129-9fb7-152d80a1a115 (ve solo su organización)

## Credentials
- Admin user: admin / admin123
- Production user: admin / Spw@16071977
- Mobotix Camera with Counting:
  - URL: https://212.64.162.40:40002/
  - User: admin
  - Pass: Spw6009

## Test Reports
- `/app/test_reports/iteration_21.json` - All tests passed (100% backend, 100% frontend)
