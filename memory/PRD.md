# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- React (Vite) + FastAPI + MongoDB (`siempria_conteo`)
- Backend: `/app/siempria-conteo/backend/` (routes, services, config)
- Frontend: `App.jsx` + `App.css` (Vite build)
- Preview: React CRA wrapper at `/app/frontend/src/App.js` + `/app/frontend/src/ConteoApp.css`

## What's Been Implemented

### v9.0 - 12 Mar 2026 (Business Intelligence Suite Complete)
- **Executive Dashboard Enhanced**: KPI cards (hoy/ayer/mes/camaras), comparativa semanal/mensual, gestion de objetivos con CRUD completo (crear/editar/eliminar), exportacion CSV con filtros por marca e isla
- **Goals & Targets CRUD**: Crear, editar (inline form), eliminar objetivos mensuales por marca. Barras de progreso con proyecciones
- **Data Export Enhanced**: Filtros por fecha, marca e isla. Descarga CSV directa
- **Temporal Comparison**: Comparativa semanal y mensual integrada en vista Ejecutiva y Presentacion
- **Presentation Mode (NEW)**: Vista a pantalla completa para reuniones con:
  - Tema oscuro profesional con orbes flotantes animados
  - 4 diapositivas: Resumen del Dia, Comparativa Temporal, Objetivos del Mes, Tendencias por Marca
  - Auto-rotacion de 12s por slide con play/pause
  - Controles de navegacion (anterior/siguiente/indicadores)
  - Graficos interactivos (AreaChart, LineChart)
  - Footer con marca "Confidencial - Solo uso interno"
  - Optimizado para pantallas grandes y TV

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
- GET /api/analytics/executive (KPIs, goals progress)
- GET /api/analytics/comparison?period=week|month (temporal comparison)
- GET /api/analytics/export?from_date=X&to_date=Y&brand_id=Z&island=W (CSV export)
- GET|POST /api/cameras | PUT|DELETE /api/cameras/{id}
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
1. (P1) Verificacion de usuario y paquete de despliegue v9
2. (P1) Limpiar codigo conteo del siempria-monitor principal
3. (P2) Reportes automaticos email
4. (P2) Alertas Telegram
5. Refactoring: separar App.jsx en componentes modulares
