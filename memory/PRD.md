# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- React (CRA) + FastAPI + MongoDB (`siempria_conteo`)
- Backend: `/app/siempria-conteo/backend/` (routes, services, config)
- Frontend: `App.js` + `ConteoApp.css`

## What's Been Implemented

### v8 - 11 Mar 2026 (Tendencias + Responsive + DealershipRows)
- **Dashboard de Tendencias**: Nuevo tab "Tendencias" con graficos Recharts
  - Area chart: flujo de visitas por hora (hoy)
  - Bar chart: visitas por dia (esta semana)
  - Line chart: comparativa por marca
  - KPIs: total hoy, hora pico, media/hora
  - Filtro por marca
- **DealershipRows**: Componente de ranking de concesionarios creado (faltaba)
  - Visible en NOC embedded y fullscreen
  - Lista top 10 concesionarios con barra de progreso
- **Mobile Responsive**: Rediseno completo para moviles
  - Menu hamburguesa con nav desplegable lateral
  - KPIs en columna unica, cards compactas
  - NOC fullscreen adaptado a mobile
  - Login responsive
  - Tablas con scroll horizontal
- **Backend**: Endpoint /api/ranking/trends con datos hourly/daily/brand_hourly
- **Fix**: React Hooks violation en TrendsView (useState/useMemo antes de early return)

### v7 - 11 Mar 2026 (Cambio esquema color + Logo grande)
- Logo DAG (version negra): 160px login, 52px header, 56px NOC
- Esquema azul tenue: #5B8DB8 como color primario
- Login, Header, KPIs, nav, badges — todo en azul

### v6 - 11 Mar 2026 (Permisos + 55")
- Permisos por usuario: `allowed_brands`, `allowed_islands` con chip selectors
- Filtrado backend: `filter_by_permissions` en ranking.py
- NOC 3 columnas optimizado para 55"
- Testing: 100% (iteration_28)

### v5 - 11 Mar 2026 (Rediseno Premium)
- Tema corporativo "Eco-Tech Precision"
- Tipografia: Chivo + Inter + JetBrains Mono
- Solo "entradas/visitas", sin "salidas"
- Footer: DAG + Siempria | Mobotix

## API Endpoints
- POST /api/auth/login
- GET /api/ranking/[realtime, by-brand, by-center, by-island, trends]
- GET|POST /api/cameras | PUT|DELETE /api/cameras/{id}
- GET|POST /api/users | PUT|DELETE /api/users/{id}
- POST /api/cameras/migrate-from-main

## DB Schema
- `users`: {id, username, password_hash, role, full_name, is_active, allowed_brands[], allowed_islands[]}
- `brand_cameras_config`: {camera_id, camera_name, brand_id, island, ip, port, username, password, enabled}

## Credentials
- admin / Conteo2024!

## Completed (This Session)
1. Created DealershipRows component (was missing, caused React error)
2. Added DealershipRows to fullscreen NOC view
3. Built Trends/Tendencias dashboard with Recharts (hourly, daily, brand comparison)
4. Full mobile responsive redesign with hamburger menu
5. Backend /api/ranking/trends endpoint
6. Testing: 100% pass (iteration_29)

## Next Tasks
1. (P1) Limpiar codigo conteo del siempria-monitor principal
2. (P1) Crear paquete de despliegue v8 para produccion (incluir recharts)

## Backlog
- Reportes automaticos email
- Alertas Telegram
- Refactoring: separar App.js en componentes menores
