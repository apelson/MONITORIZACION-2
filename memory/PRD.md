# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- React (CRA) + FastAPI + MongoDB (`siempria_conteo`)
- Backend: `/app/siempria-conteo/backend/` (routes, services, config)
- Frontend: `App.js` + `ConteoApp.css`

## What's Been Implemented

### v7 - 11 Mar 2026 (Cambio esquema color + Logo grande)
- **Logo DAG nuevo** (version negra proporcionada por usuario): 160px login, 52px header, 56px NOC
- **Esquema azul tenue**: Todo el verde reemplazado por azul pastel corporativo (#5B8DB8)
- Login: fondo azul tenue, boton azul, badge azul
- Header, KPIs, nav active, badges, pills — todo en azul
- NOC fullscreen: acentos azules en lugar de verdes

### v6 - 11 Mar 2026 (Permisos + 55")
- Permisos por usuario: `allowed_brands`, `allowed_islands` con chip selectors
- Filtrado backend: `filter_by_permissions` en ranking.py
- NOC 3 columnas optimizado para 55"
- Edit button visible para todos los usuarios
- Testing: 100% (iteration_28)

### v5 - 11 Mar 2026 (Rediseno Premium)
- Tema corporativo "Eco-Tech Precision"
- Tipografia: Chivo + Inter + JetBrains Mono
- Solo "entradas/visitas", sin "salidas"
- Footer: DAG + Siempria | Mobotix

## API Endpoints
- POST /api/auth/login
- GET /api/ranking/[realtime, by-brand, by-center, by-island]
- GET|POST /api/cameras | PUT|DELETE /api/cameras/{id}
- GET|POST /api/users | PUT|DELETE /api/users/{id}

## DB Schema
- `users`: {id, username, password_hash, role, full_name, is_active, allowed_brands[], allowed_islands[]}
- `brand_cameras_config`: {camera_id, camera_name, brand_id, island, ip, port, username, password, enabled}

## Credentials
- admin / Conteo2024!

## Next Tasks
1. (P0) Aprobacion usuario + despliegue produccion
2. (P1) Verificar datos con camaras reales
3. (P1) Limpiar codigo conteo del siempria-monitor

## Backlog
- Dashboard de tendencias
- Reportes automaticos email
- Alertas Telegram
