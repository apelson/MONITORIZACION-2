# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorizacion de red profesional para Siempria. Incluye NOC de conteo de visitas por marca de vehiculos con camaras Mobotix. El proyecto ha evolucionado a separar la funcionalidad de conteo en una aplicacion independiente.

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

### Session 11 Mar 2026 - Conteo App Complete Build
- **Backend completo**: FastAPI con auth JWT, ranking endpoints (realtime, by-brand, by-center, summary), cameras config, baselines reset
- **Frontend profesional**: Login page rediseñado con estetica WatchTower, dashboard con 4 vistas (Tiempo Real, Por Marca, Por Centro, Camaras)
- **Scripts de despliegue**: install.sh, deploy.sh, fix_nginx.sh, update_frontend.sh
- **Configuracion servidor**: siempria-conteo.service (systemd), nginx-conteo.conf
- **Instrucciones acceso local**: Guia completa para editar hosts en Windows

### Session 10 Mar 2026 - Blindaje de Aplicacion
- Eliminacion de branding externo (emergentagent.com)
- Gestion de roles de usuario fix
- Dashboard de seguridad verificado
- Mapa interactivo fix IDs de islas
- Cron job para estadisticas

### Session 09 Mar 2026 - Funcionalidades Premium
- NOC Competitivo Premium (pantalla 55")
- Permisos granulares de usuario
- Exportacion PDF con comparativas

## API Endpoints - Conteo Platform
```
POST /api/auth/login              - Login
POST /api/auth/create-user        - Create user
GET  /api/ranking/realtime        - Real-time counting from cameras
GET  /api/ranking/by-brand        - Ranking by brand
GET  /api/ranking/by-center       - Ranking by center
GET  /api/ranking/summary         - Statistics summary
GET  /api/ranking/brands          - List brands
GET  /api/ranking/centers         - List centers
GET  /api/cameras                 - Camera configurations
POST /api/cameras                 - Add/update camera
DELETE /api/cameras/{id}          - Delete camera
POST /api/cameras/reset-baselines - Reset daily baselines
GET  /api/health                  - Health check
```

## Credentials
- Main Platform: admin / Spw@16071977
- Conteo Platform: admin / Conteo2024!

## Pending Issues
- **P0**: Local network access fix (user must edit Windows hosts file)
- **P1**: User verification of conteo app in production

## Upcoming Tasks
1. Deploy conteo app to production server using install.sh
2. Verify all counting cameras work with new backend
3. Clean main platform - remove redundant NOC/conteo code from siempria-monitor

## Future/Backlog (P2-P3)
- Automatic email reports
- Intelligent alerts to Telegram
- Trends dashboard with historical charts
- `centers` collection cleanup in main DB
