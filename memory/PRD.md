# Siempria Conteo - PRD

## Problem Statement
Sistema de conteo de visitas en tiempo real para Domingo Alonso Group. Aplicacion independiente en `conteo.siempriapp.com` que monitoriza camaras Mobotix en concesionarios (Audi, VW, Skoda, Honda, Ducati, DAOcasion) en Islas Canarias.

## Architecture
- React (CRA) + FastAPI + MongoDB (`siempria_conteo`)
- Backend: `/app/siempria-conteo/backend/` (routes, services, config)
- Frontend: `App.js` + `ConteoApp.css`

## What's Been Implemented

### v6 - 11 Mar 2026 (Mejoras solicitadas por el usuario)
- **Logo DAG mas grande** en login (110px) y visible en header
- **Header rediseñado**: titulo "Conteo de Visitas" centrado, DAG logo a la izquierda
- **Editar todos los usuarios**: boton editar visible para TODOS incluyendo admin
- **Permisos por usuario**: campos `allowed_brands` y `allowed_islands` con chip selectors
- **Filtrado de datos**: funcion `filter_by_permissions` en ranking.py filtra datos segun permisos del usuario
- **NOC 55" optimizado**: layout 3 columnas (Podio | Ranking | Islas), media queries para 1920px y 2560px
- **Logos de marcas**: visibles en chips y rankings con fondo blanco
- **Testing**: 100% (iteration_28: 14 backend + 18 frontend)

### v5 - 11 Mar 2026 (Rediseno Premium)
- Tema corporativo claro "Eco-Tech Precision"
- Tipografia: Chivo + Inter + JetBrains Mono
- NOC Fullscreen con tema oscuro
- "Salidas" eliminadas - solo muestra visitas/entradas
- Footer: "Domingo Alonso Group" + "Siempria | Tecnologia Mobotix"

### Anteriores (v1-v4)
- Login, dashboard con 6 vistas, JWT auth, CRUD camaras/usuarios
- Parsing datos Mobotix, bug fixes backend

## API Endpoints
- POST /api/auth/login (retorna allowed_brands, allowed_islands)
- GET /api/ranking/[realtime, by-brand, by-center, by-island, summary]
- GET|POST /api/cameras | PUT|DELETE /api/cameras/{id}
- GET|POST /api/users | PUT|DELETE /api/users/{id}
- GET /api/health

## DB Schema
- `users`: {id, username, password_hash, role, full_name, is_active, allowed_brands[], allowed_islands[], created_at}
- `brand_cameras_config`: {camera_id, camera_name, brand_id, island, ip, port, username, password, enabled}

## Credentials
- admin / Conteo2024!

## Next Tasks
1. (P0) Aprobacion visual del usuario + despliegue produccion
2. (P1) Verificar datos con camaras reales
3. (P1) Limpiar codigo conteo del siempria-monitor principal

## Backlog
- Dashboard de tendencias (graficos historicos)
- Reportes automaticos por email
- Alertas inteligentes a Telegram
