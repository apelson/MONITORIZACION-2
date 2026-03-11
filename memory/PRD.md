# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios de vehiculos (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- **Conteo Platform** (`conteo.siempriapp.com`): React (Vite) + FastAPI + MongoDB (`siempria_conteo`)
- Port: 8002, Service: `siempria-conteo.service`

## What's Been Implemented

### v3 - 11 Mar 2026 (Complete Redesign)
- Fixed ALL reported bugs: NaN values, admin "Inactivo" status, broken brand logos
- **Brand logos**: Inline SVG components (no CDN dependency) - Audi rings, VW circle, Skoda, Honda H, Ducati shield, DAO
- **Typography**: Google Fonts (Space Grotesk + Inter + JetBrains Mono)
- **"DOMINGO ALONSO GROUP"**: Clean text-based rendering (no clipped SVGs)
- **Footer**: "Desarrollado por Siempria | Tecnologia Mobotix" on all views
- **Island silhouettes**: SVG paths for Tenerife, Gran Canaria, Lanzarote, Fuerteventura, La Palma
- **AnimNum fix**: Proper NaN handling, performance.now() based animation
- **is_active**: Backend defaults to True when field missing
- **total_visits**: int() cast to prevent NaN

### Previous
- Login, dashboard with 6 views, JWT auth, camera management, user CRUD
- Camera data parsing (Mobotix data[HOUR][DAY] format)
- Deployment workflow via curl/tar

## API Endpoints
POST /api/auth/login | GET /api/ranking/realtime | GET /api/ranking/by-brand
GET /api/ranking/by-center | GET /api/ranking/by-island | GET /api/ranking/summary
GET|POST /api/cameras | PUT|DELETE /api/cameras/{id} | POST /api/cameras/migrate-from-main
GET|POST /api/users | PUT|DELETE /api/users/{id} | GET /api/health

## Credentials
- Conteo: admin / Conteo2024!

## Deployment (v3)
```bash
API="https://conteo-preview.preview.emergentagent.com"
curl -o /tmp/conteo-backend-v3.tar.gz "$API/api/deploy/backend"
curl -o /tmp/conteo-frontend-v3.tar.gz "$API/api/deploy/frontend"
cd /opt/siempria-conteo
tar xzf /tmp/conteo-backend-v3.tar.gz
tar xzf /tmp/conteo-frontend-v3.tar.gz
sudo systemctl restart siempria-conteo
```

## Next Tasks
1. **(P0)** Deploy v3 to production
2. **(P1)** Verify cameras work after deployment
3. **(P1)** Clean NOC code from main siempria-monitor

## Future/Backlog
- Dashboard de tendencias (graficos historicos por hora/dia/semana)
- Reportes automaticos por email
- Alertas inteligentes a Telegram
