# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- React (CRA) + FastAPI + MongoDB (`siempria_conteo`)
- Backend: `/app/siempria-conteo/backend/` (routes, services, config)
- Backend wrapper: `/app/backend/server.py` (dev env, imports from siempria-conteo)
- Frontend: Modular components under `/app/frontend/src/conteo/`
- CSS: `/app/frontend/src/ConteoApp.css`

### Frontend Module Structure (Refactored v9.1)
```
/app/frontend/src/
├── App.js              (thin wrapper, ~23 lines)
├── ConteoApp.css       (all styles)
└── conteo/
    ├── constants.js    (API, ALL_BRANDS, ALL_ISLANDS, BRAND_COLORS, ISLAND_PNGS)
    ├── shared.js       (EcgMonitor, SystemHealthWidget, TrendBadge, MiniSparkline,
    │                    BrandLogo, IslandSilhouette, AnimNum, LiveClock, ChipSelect,
    │                    EmptyState, LoadingState, Modal, FormField, FormSelect)
    ├── LoginPage.js
    ├── Dashboard.js    (main shell, routing, data fetching)
    └── views/
        ├── RealtimeView.js
        ├── BrandView.js
        ├── CenterView.js
        ├── TrendsView.js
        ├── CamerasView.js
        ├── UsersView.js
        ├── NOCView.js          (includes Podium, RankingRows, IslandCards,
        │                        DealershipRows, NOCHistorico)
        ├── ExecutiveView.js
        ├── PresentationMode.js
        └── HeatmapView.js
```

## What's Been Implemented

### v9.1 - 13 Mar 2026 (Heatmap Automation + Frontend Refactoring)
- **Automatic Heatmap Configuration**: POST /api/cameras auto-sets `heatmap_profile: "default"`. PUT /api/cameras auto-sets it for cameras that don't have it yet. Explicit values are preserved.
- **Frontend Modularization**: Refactored 2321-line monolithic App.js into 14 organized modules under `/app/frontend/src/conteo/`. All data-testid attributes, CSS classes, and functionality preserved.

### v9.0 - 12 Mar 2026 (Business Intelligence Suite Complete)
- **Executive Dashboard Enhanced**: KPI cards, comparativa semanal/mensual, gestion de objetivos CRUD, exportacion CSV
- **Goals & Targets CRUD**: Crear, editar, eliminar objetivos mensuales por marca
- **Data Export Enhanced**: Filtros por fecha, marca e isla. Descarga CSV directa
- **Temporal Comparison**: Comparativa semanal y mensual integrada
- **Presentation Mode**: Vista pantalla completa para reuniones, 4 slides con auto-rotacion

### v8.2 - 11 Mar 2026 (Heatmaps + Auto-rotacion + Historico sin limites)
- **Mapas de Calor Mobotix**: Generacion via API, almacenamiento permanente, historial
- **Auto-rotacion NOC**: Toggle Auto/Manual cada 30s
- **Historico sin limites**: Datos para siempre

### v8.1 - 11 Mar 2026 (Data Collector + NOC Enhancements)
- Data Collector Service, Historical API, NOC Layout, System Health Widget

### v8 - 11 Mar 2026 (Tendencias + Responsive)
- Dashboard de Tendencias, DealershipRows ranking, Mobile Responsive

## API Endpoints
- POST /api/auth/login
- GET /api/ranking/[realtime, by-brand, by-center, by-island, trends, historical]
- GET /api/ranking/collector-status
- GET /api/heatmap/[cameras, history]
- POST /api/heatmap/generate
- GET /api/heatmap/image/{id}
- DELETE /api/heatmap/{id}
- GET|POST /api/goals
- DELETE /api/goals/{id}
- GET /api/analytics/executive
- GET /api/analytics/comparison?period=week|month
- GET /api/analytics/export?from_date=X&to_date=Y&brand_id=Z&island=W
- GET|POST /api/cameras (POST now auto-sets heatmap_profile)
- PUT|DELETE /api/cameras/{id} (PUT now auto-sets heatmap_profile if missing)
- GET|POST /api/users | PUT|DELETE /api/users/{id}

## DB Schema
- `users`: {id, username, password_hash, role, full_name, is_active, allowed_brands[], allowed_islands[]}
- `brand_cameras_config`: {camera_id, camera_name, brand_id, island, ip, port, username, password, enabled, heatmap_profile}
- `camera_readings`: {camera_id, brand_id, island, entries, exits, status, timestamp, date, hour}
- `hourly_snapshots`: {date, hour, total_entries, cameras_online, cameras_total, brands:{}, last_updated}
- `heatmaps`: {heatmap_id, camera_id, camera_name, brand_id, island, range_type, image_b64, generated_at}
- `goals`: {goal_id, brand_id, month, target_visits, label, created_at, updated_at, created_by, updated_by}

## Credentials
- admin / Conteo2024!
- Mobotix test camera: 212.64.162.120:40062, admin:Spw@6009

## Next Tasks
1. (P1) Verificacion final del usuario en produccion
2. (P1) Limpiar codigo conteo del siempria-monitor principal
3. (P2) Reportes automaticos email
4. (P2) Alertas Telegram
