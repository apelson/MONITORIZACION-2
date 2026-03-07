# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. La plataforma permite monitorizar dispositivos de red, cámaras, grabadores DVR/NVR (Dahua), túneles VPN, y sistemas críticos (CRA).

## Latest Session - 07 Mar 2026

### ✅ COMPLETADO - Sistema de Conteo en Tiempo Real

#### 1. Mapa Interactivo Real con Leaflet (P0)
- **Componente:** `/app/frontend/src/components/maps/LeafletCanaryMap.jsx`
- **Tecnologías:** react-leaflet, leaflet, OpenStreetMap
- **Funcionalidades:**
  - Mapa real de las Islas Canarias usando OpenStreetMap
  - 3 estilos: Calles, Satélite, Terreno
  - Marcadores interactivos por isla con conteo
  - Chips de selección rápida (TF, GC, LZ, FV, LP, LG, EH)

#### 2. Sistema de Ranking de Marcas (P0)
- **Backend:** `/app/backend/routes/brand_statistics.py`
- **Frontend:** `/app/frontend/src/components/panels/BrandRankingPanel.jsx`
- **Marcas:** AUDI, VOLKSWAGEN, SKODA, HONDA, DUCATI, DAOCASION
- **Logos:** Todos configurados con URLs de assets
- **Endpoints:**
  - GET /api/brand-statistics/brands
  - GET /api/brand-statistics/ranking
  - GET /api/brand-statistics/summary
  - GET /api/brand-statistics/ranking-by-island
  - POST /api/brand-statistics/record
  - GET /api/brand-statistics/daily-trend/{brand_id}

#### 3. NOC de Conteo en Tiempo Real (NUEVO)
- **Componente:** `/app/frontend/src/components/panels/RealtimeCountingNOC.jsx`
- **Servicio:** `/app/backend/services/mobotix_counting_service.py`
- **Funcionalidades:**
  - Conexión directa con cámaras Mobotix MxAnalytics
  - Datos en tiempo real (auto-refresh cada 30 segundos)
  - Header NOC oscuro con estadísticas totales
  - Tarjetas de marca con logos
  - Estado de cámaras online/offline
- **Endpoints:**
  - GET /api/brand-statistics/realtime
  - POST /api/brand-statistics/realtime/refresh
  - GET /api/brand-statistics/cameras-config
  - POST /api/brand-statistics/cameras-config
  - DELETE /api/brand-statistics/cameras-config/{camera_id}

#### 4. Cámara Configurada
- **Cámara:** DAOCASION Lanzarote - Entrada
- **IP:** 212.64.162.40:40002
- **Status:** ONLINE ✅
- **Datos:** 240 entradas, 265 salidas, 505 total

#### 5. Rol statistics_viewer (P1)
- **Permisos:** Solo acceso a estadísticas
- Definido en `/app/backend/routes/roles.py`

## Logos de Marcas
```
AUDI: https://customer-assets.emergentagent.com/job_a598a541.../Logo_audi.jpg
VOLKSWAGEN: https://customer-assets.emergentagent.com/job_a598a541.../Volkswagen_logo_2019.svg.png
SKODA: https://customer-assets.emergentagent.com/job_a598a541.../Škoda_nieuw.png
HONDA: https://customer-assets.emergentagent.com/job_a598a541.../Honda_Logo.svg.png
DUCATI: https://customer-assets.emergentagent.com/job_a598a541.../Ducati_red_logo.PNG
DAOCASION: https://customer-assets.emergentagent.com/job_56a630f4.../dag_ocasion.png
```

## Previous Features (Already Completed)
1. ✅ JIRA Integration
2. ✅ Dahua DVR Scheduler
3. ✅ Backup Functionality
4. ✅ WatchTower Rebranding
5. ✅ Onboarding Wizard
6. ✅ DVR Uptime Counter
7. ✅ OpenVPN Monitoring
8. ✅ System Resource Monitor
9. ✅ VPN Widget
10. ✅ Maintenance Panel
11. ✅ Device Type Counter
12. ✅ Island Field in Groups
13. ✅ Mobile Dashboard
14. ✅ Fail2ban Integration
15. ✅ Feature Management
16. ✅ Welcome Tour
17. ✅ Help Center
18. ✅ Video Tutorials

## Architecture
```
/app
├── backend
│   ├── routes
│   │   ├── brand_statistics.py (NEW)
│   │   └── camera_stream.py
│   └── services
│       └── mobotix_counting_service.py (NEW)
└── frontend
    └── src
        ├── components
        │   ├── maps/
        │   │   └── LeafletCanaryMap.jsx (NEW)
        │   └── panels/
        │       ├── BrandRankingPanel.jsx (NEW)
        │       └── RealtimeCountingNOC.jsx (NEW)
        └── App.js
```

## Pending Tasks
- (P1) Scheduler automático para recolección diaria de estadísticas
- (P2) Añadir videos reales a la sección de Tutoriales
- (P2) Refactoring de App.js (>4000 líneas)

## Test Credentials
- Admin: admin / admin123
- Production: admin / Spw@16071977
- Mobotix Camera: admin / Spw6009 @ 212.64.162.40:40002

## Test Reports
- `/app/test_reports/iteration_21.json` - All tests passed
