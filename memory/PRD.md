# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- React (Vite) + FastAPI + MongoDB (`siempria_conteo`)
- Backend: `/app/siempria-conteo/backend/` (routes, services, config)
- Frontend: `App.jsx` + `App.css` (Vite build)
- Preview: React CRA wrapper at `/app/frontend/src/App.js` + `/app/frontend/src/ConteoApp.css`

## What's Been Implemented

### v8.2 - 11 Mar 2026 (Heatmaps + Auto-rotacion + Historico sin limites)
- **Mapas de Calor Mobotix**: Nueva vista "Mapa de Calor" con:
  - Generacion de heatmaps via API Mobotix (stat_export_api)
  - Selector de camara + periodo (Hoy, Ayer, Semana, Mes, Fecha Especifica)
  - Almacenamiento permanente en MongoDB (coleccion `heatmaps`, base64 JPEG)
  - Historial completo con visor de imagen
  - Eliminacion individual de heatmaps
  - Backend: /api/heatmap/[cameras, generate, image/{id}, history, {id}]
- **Auto-rotacion NOC**: Toggle "Auto/Manual" que alterna Ranking <-> Historico cada 30s
- **Historico sin limites**: Eliminado el cleanup de 90 dias - datos para siempre
- **Campo heatmap_profile**: Añadido a configuracion de camaras (PUT /api/cameras)

### v8.1 - 11 Mar 2026 (Data Collector + NOC Enhancements)
- Data Collector Service (snapshots cada 5 min)
- Historical API Endpoints (daily series, hoy vs ayer)
- NOC Layout (Podio izq, Islas der)
- Podium Cards profesionales
- System Health Widget con ECG
- NOC Historico tab
- Trend badges, sparklines, animaciones

### v8 - 11 Mar 2026 (Tendencias + Responsive + DealershipRows)
- Dashboard de Tendencias con graficos Recharts
- DealershipRows ranking de concesionarios
- Mobile Responsive completo con menu hamburguesa

## API Endpoints
- POST /api/auth/login
- GET /api/ranking/[realtime, by-brand, by-center, by-island, trends]
- GET /api/ranking/historical?days=N
- GET /api/ranking/collector-status
- GET /api/heatmap/cameras (NEW)
- POST /api/heatmap/generate?camera_id=X&range_type=Y (NEW)
- GET /api/heatmap/image/{id}?token=T (NEW)
- GET /api/heatmap/history?camera_id=X&limit=N (NEW)
- DELETE /api/heatmap/{id} (NEW)
- GET|POST /api/cameras | PUT|DELETE /api/cameras/{id}
- GET|POST /api/users | PUT|DELETE /api/users/{id}
- GET /api/deploy/[backend, frontend, script, backup-script]

## DB Schema
- `users`: {id, username, password_hash, role, full_name, is_active, allowed_brands[], allowed_islands[]}
- `brand_cameras_config`: {camera_id, camera_name, brand_id, island, ip, port, username, password, enabled, heatmap_profile}
- `camera_readings`: {camera_id, brand_id, island, entries, exits, status, timestamp, date, hour}
- `hourly_snapshots`: {date, hour, total_entries, cameras_online, cameras_total, brands:{}, last_updated}
- `heatmaps` (NEW): {heatmap_id, camera_id, camera_name, brand_id, island, range_type, custom_range, image_b64, image_size, generated_at, generated_by}

## Credentials
- admin / Conteo2024!
- Mobotix test camera: 212.64.162.120:40062, admin:Spw@6009, heatmap_profile=hep_DLHUKFIF

## Next Tasks
1. (P2) Reportes automaticos email
2. (P2) Alertas Telegram
3. (P1) Limpiar codigo conteo del siempria-monitor principal
4. Refactoring: separar App.jsx en componentes menores
