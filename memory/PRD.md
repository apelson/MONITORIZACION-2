# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- React (Vite) + FastAPI + MongoDB (`siempria_conteo`)
- Backend: `/app/siempria-conteo/backend/` (routes, services, config)
- Frontend: `App.jsx` + `App.css` (Vite build)
- Preview: React CRA wrapper at `/app/frontend/src/App.js` + `/app/frontend/src/ConteoApp.css`

## What's Been Implemented

### v8.1 - 11 Mar 2026 (Data Collector + NOC Enhancements)
- **Data Collector Service**: Background task storing camera readings every 5 min
  - `camera_readings` collection: per-camera snapshots
  - `hourly_snapshots` collection: aggregated brand totals per hour
  - Auto-cleanup of readings older than 90 days
  - DB indexes for efficient querying
- **Historical API Endpoints**:
  - GET /api/ranking/historical?days=7: daily series, today vs yesterday, brand breakdown
  - GET /api/ranking/collector-status: active status, reading counts
- **NOC Layout Redesign**: Podium + Ranking/Dealers left, Islands right (no scroll for 55")
- **NOC Tab Toggle**: Ranking (live) / Historico (stored data) tabs
- **Podium Cards**: Professional leaderboard-style cards (gold/silver/bronze accents)
- **System Health Widget**: Circular gauge + ECG animated canvas + camera status
- **NOC Historico View**: KPIs with stored data, Hoy vs Ayer chart overlay, daily bar chart, brand comparison
- **Visual Enhancements**: Trend badges (up/down %), sparkline component, staggered entry animations

### v8 - 11 Mar 2026 (Tendencias + Responsive + DealershipRows)
- Dashboard de Tendencias con graficos Recharts
- DealershipRows ranking de concesionarios
- Mobile Responsive completo con menu hamburguesa
- Endpoint /api/ranking/trends
- Logos alta resolucion PNG transparente

### v7 - 11 Mar 2026 (Esquema color + Logo)
- Tema azul corporativo #5B8DB8
- Logo DAG version negra

### v6 - 11 Mar 2026 (Permisos + 55")
- Permisos por usuario: allowed_brands, allowed_islands
- NOC optimizado para 55"

### v5 - 11 Mar 2026 (Rediseno Premium)
- Tema corporativo "Eco-Tech Precision"
- Solo entradas/visitas, sin salidas

## API Endpoints
- POST /api/auth/login
- GET /api/ranking/[realtime, by-brand, by-center, by-island, trends]
- GET /api/ranking/historical?days=N (NEW)
- GET /api/ranking/collector-status (NEW)
- GET|POST /api/cameras | PUT|DELETE /api/cameras/{id}
- GET|POST /api/users | PUT|DELETE /api/users/{id}
- GET /api/deploy/[backend, frontend, script, backup-script]

## DB Schema
- `users`: {id, username, password_hash, role, full_name, is_active, allowed_brands[], allowed_islands[]}
- `brand_cameras_config`: {camera_id, camera_name, brand_id, island, ip, port, ...}
- `camera_readings` (NEW): {camera_id, brand_id, island, entries, exits, status, timestamp, date, hour}
- `hourly_snapshots` (NEW): {date, hour, total_entries, cameras_online, cameras_total, brands:{}, last_updated}

## Credentials
- admin / Conteo2024!

## Next Tasks
1. (P2) Mapas de calor de camaras Mobotix - mostrar en pantalla principal
2. (P2) Reportes automaticos email
3. (P2) Alertas Telegram
4. (P1) Limpiar codigo conteo del siempria-monitor principal
5. Refactoring: separar App.jsx en componentes menores
