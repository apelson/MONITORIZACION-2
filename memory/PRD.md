# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorizacion de red profesional para Siempria. Incluye NOC de conteo de visitas por marca de vehiculos con camaras Mobotix. El proyecto ha evolucionado a separar la funcionalidad de conteo en una aplicacion independiente (`conteo.siempriapp.com`).

## Architecture
Two separate applications:
1. **Main Platform** (`siempriapp.com`): Device management, monitoring, alerts
   - Path: `/opt/siempria-monitor` (production) / `/app` (development)
   - Stack: React (CRA) + FastAPI + MongoDB (`siempria_network_monitor`)
   - Port: 8001

2. **Conteo Platform** (`conteo.siempriapp.com`): Real-time visit counting
   - Path: `/opt/siempria-conteo` (production) / `/app/siempria-conteo` (development)
   - Stack: React (Vite) + FastAPI + MongoDB (`siempria_conteo`)
   - Port: 8002

## What's Been Implemented

### Session 11 Mar 2026 - Conteo v2 Complete (Latest)
- **All issues resolved and tested (100% pass rate)**:
  - Fixed "Por Marca" and "Por Centro" views - now correctly fetch realtime data
  - User Management CRUD UI - create, edit, toggle active, delete users
  - Brand logos from CDN (Audi, VW, Skoda, Honda, Ducati)
  - Domingo Alonso Group (DAG) logo as SVG in login, header, NOC, footer
  - NOC Competitivo professional redesign with podium, islands grid, footer
  - UI shows only "visitas" (entries), no "salidas" (exits) anywhere
  - Deployment packages ready (conteo-backend-v2.tar.gz, conteo-frontend-v2.tar.gz)

### Previous Sessions
- Backend completo: FastAPI con auth JWT, ranking endpoints, cameras config, baselines
- Frontend profesional: Login redesigned, dashboard with 6 views
- Scripts de despliegue: install.sh, deploy.sh, fix_nginx.sh
- Configuracion servidor: siempria-conteo.service, nginx-conteo.conf
- Fixed camera data parsing, bcrypt/passlib compatibility
- Local network access instructions

## API Endpoints - Conteo Platform
```
POST /api/auth/login              - Login
POST /api/auth/create-user        - Create user (initial setup)
GET  /api/ranking/realtime        - Real-time counting from cameras
GET  /api/ranking/by-brand        - Ranking by brand
GET  /api/ranking/by-center       - Ranking by center  
GET  /api/ranking/by-island       - Ranking by island
GET  /api/ranking/summary         - Statistics summary
GET  /api/ranking/brands          - List brands
GET  /api/ranking/centers         - List centers
GET  /api/cameras                 - Camera configurations
POST /api/cameras                 - Add camera
PUT  /api/cameras/{id}            - Update camera
DELETE /api/cameras/{id}          - Delete camera
POST /api/cameras/migrate-from-main - Import cameras from main DB
POST /api/cameras/reset-baselines - Reset daily baselines
GET  /api/users                   - List users (admin only)
POST /api/users                   - Create user (admin only)
PUT  /api/users/{id}              - Update user (admin only)
DELETE /api/users/{id}            - Delete user (admin only)
GET  /api/health                  - Health check
```

## Credentials
- Main Platform: admin / Spw@16071977
- Conteo Platform: admin / Conteo2024!

## Completed Tasks
- [x] Login page with DAG + Siempria logos
- [x] Dashboard with 6 views (Tiempo Real, NOC, Por Marca, Por Centro, Camaras, Usuarios)
- [x] Real-time camera data aggregation
- [x] NOC Competitivo with podium, ranking, islands grid
- [x] User CRUD management panel (admin only)
- [x] Camera CRUD with migration from main platform
- [x] Only "visitas" displayed (no "salidas")
- [x] Deployment packages prepared

## Pending/Next Tasks
1. **(P0) Deploy to production** - User needs to run deployment commands on their server
2. **(P1) Clean main platform** - Remove NOC/conteo code from siempria-monitor
3. **(P1) Verify cameras work** - Test with physical cameras after deployment

## Future/Backlog (P2-P3)
- Automatic email reports
- Intelligent alerts to Telegram
- Trends dashboard with historical charts
- `centers` collection cleanup in main DB

## Deployment Instructions
On the production server, run:
```bash
# Download files
curl -o /tmp/conteo-backend-v2.tar.gz https://[preview-url]/api/deploy/backend
curl -o /tmp/conteo-frontend-v2.tar.gz https://[preview-url]/api/deploy/frontend
curl -o /tmp/deploy_conteo_v2.sh https://[preview-url]/api/deploy/script

# Deploy
cd /opt/siempria-conteo
tar xzf /tmp/conteo-backend-v2.tar.gz
tar xzf /tmp/conteo-frontend-v2.tar.gz
sudo systemctl restart siempria-conteo
```
