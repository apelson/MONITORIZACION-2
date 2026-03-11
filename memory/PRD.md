# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios de vehiculos (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- **Conteo Platform** (`conteo.siempriapp.com`): React (CRA) + FastAPI + MongoDB (`siempria_conteo`)
- Port: 8002, Service: `siempria-conteo.service`
- Backend: `/app/siempria-conteo/backend/` (routes, services, config)
- Frontend: Single-file architecture (`App.js` + `ConteoApp.css`)

## What's Been Implemented

### v5 - 11 Mar 2026 (Premium Redesign - "Eco-Tech Precision")
- **Complete redesign** from dark to light corporate theme
- **Typography**: Google Fonts (Chivo + Inter + JetBrains Mono)
- **Light theme** for dashboard: clean white cards, emerald (#10B981) accents, subtle shadows
- **Dark theme** for NOC Fullscreen: deep obsidian (#0B1120) with emerald/gold accents
- **Login page**: Clean card layout, DAG logo prominent, subtle gradient background
- **KPI cards**: Border-left accent, icon badges, animated counters
- **Navigation**: Clean top-bar with underline active state
- **NOC Competitive**: Podium of Honor, Full ranking, Island map with silhouettes
- **"Salidas" removed**: Only shows "entradas/visitas" (entries/visits) everywhere
- **Footer**: "Domingo Alonso Group" | "Desarrollado por Siempria | Tecnologia Mobotix"
- **All assets**: Real brand logos (Audi, VW, Skoda, Honda, Ducati, DAOcasion), island PNGs, DAG logo, Siempria logo
- **Testing**: 100% pass rate on all backend and frontend tests (iteration_27)

### Previous (v1-v4)
- Login, dashboard with 6 views, JWT auth, camera management, user CRUD
- Camera data parsing (Mobotix data[HOUR][DAY] format)
- Backend bug fixes: NaN values, admin status, total_visits casting
- Multiple dark-theme redesigns (all rejected by user)

## API Endpoints
POST /api/auth/login | GET /api/ranking/realtime | GET /api/ranking/by-brand
GET /api/ranking/by-center | GET /api/ranking/by-island | GET /api/ranking/summary
GET|POST /api/cameras | PUT|DELETE /api/cameras/{id} | POST /api/cameras/migrate-from-main
GET|POST /api/users | PUT|DELETE /api/users/{id} | GET /api/health

## Credentials
- Conteo: admin / Conteo2024!

## DB Schema (siempria_conteo)
- `users`: {id, username, password_hash, role, full_name, is_active, created_at}
- `brand_cameras_config`: {camera_id, camera_name, brand_id, island, ip, port, username, password, enabled}
- `brands`: {id, name, color, active}
- `centers`: {id, name, island, active}
- `daily_baselines`: {date, camera_ip, baseline_entries, baseline_exits}

## Deployment
```bash
API="https://conteo-preview-1.preview.emergentagent.com"
curl -o /tmp/conteo-backend-v5.tar.gz "$API/api/deploy/backend"
curl -o /tmp/conteo-frontend-v5.tar.gz "$API/api/deploy/frontend"
cd /opt/siempria-conteo
tar xzf /tmp/conteo-backend-v5.tar.gz
tar xzf /tmp/conteo-frontend-v5.tar.gz
sudo systemctl restart siempria-conteo
```

## Next Tasks
1. **(P0)** User approval of v5 design + deployment to production
2. **(P1)** Verify cameras work after deployment on production server
3. **(P1)** Clean NOC code from main siempria-monitor
4. **(P1)** Update deployment packages (tar.gz)

## Future/Backlog
- Dashboard de tendencias (graficos historicos por hora/dia/semana)
- Reportes automaticos por email
- Alertas inteligentes a Telegram
