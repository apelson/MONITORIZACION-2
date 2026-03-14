# Siempria Platform - PRD

## Original Problem Statement
The user has two platforms:
1. **siempria-conteo**: Standalone counting application with BI suite and Mobotix Heatmap integration (COMPLETE)
2. **siempria-monitor**: Main production monitoring platform (WatchTower) - active bug fixing

## What's Been Implemented

### siempria-conteo (COMPLETE)
- Automated Heatmap Config
- Frontend Refactor (monolithic → modular)
- Presentation Mode UX
- Production Deployment v9.1

### siempria-monitor - Bug Fixes (2026-03-14)
- **[FIX v4] Role Permissions (P0)**: Fixed `roles.py` - changed `user.get("role_id", "admin")` to `user.get("role_id") or user.get("role", "admin")` in 4 places (get_user_role, my-permissions, user-permissions, delete_role). Technician role now correctly identified.
- **[FIX v5] AI Permissions + Image Endpoint**: Added `ai: ["view"]` and `predictions: ["view"]` to technician role in MongoDB. Verified device_photos file endpoint was already public.
- **[FIX v6] Nginx Images + Settings Tab**: 
  - Fixed nginx: changed `location /api/` to `location ^~ /api/` so API routes take priority over static file regex (`.jpg` etc were returning 404)
  - Fixed Settings tab: changed `{isAdmin && <TabsContent value="settings">}` to `{canAccessSection('settings') && ...}` and wrapped admin-only panels with `{isAdmin && ...}`, leaving AIInsightsPanel and MaintenancePanel visible for technician
  - Rebuilt frontend with `craco build`
- **[FIX v7] Floating Buttons**: Wrapped 4 floating buttons with permission checks:
  - CRAFloatingButton: requires `canAccessSection('cra')`
  - LiveViewerFloatingButton: requires `canAccessSection('live')`
  - NOCFloatingButton: requires `canAccessSection('statistics')`
  - NOCCompetitivoFloatingButton: requires `canAccessSection('statistics')`
  - Rebuilt frontend

## Architecture
- **siempria-monitor**: `/opt/siempria-monitor/` on production server
  - Backend: FastAPI on port 8001
  - Frontend: React CRA with craco, built to `/frontend/build/`
  - DB: MongoDB `siempria_monitor`
  - Nginx: `siempriapp.com` with SSL
- **siempria-conteo**: `/opt/siempria-conteo/` on production server
  - Backend: FastAPI on port 8002
  - Frontend: React, `conteo.siempriapp.com`

## Key Files Modified
- `/opt/siempria-monitor/backend/routes/roles.py` - Role resolution fix
- `/opt/siempria-monitor/frontend/src/App.js` - Settings tab + floating buttons
- `/etc/nginx/sites-enabled/siempriapp` - `^~` priority for /api/
- MongoDB `siempria_monitor.roles` - technician permissions updated

## Credentials
- Technician user: `aray` / `Spw@4902`

## Prioritized Backlog

### P1 - Pending
- Gallery images still show broken thumbnails (alt text "Instalación") - need to verify after nginx fix if this is resolved
- Configurable role permissions UI (user wants to manage tab visibility per role)

### P2 - Future
- Clean conteo code from siempria-monitor
- Automatic email reports (siempria-conteo)
- Telegram alerts (siempria-conteo)

### P3 - Backlog
- Refactor App.js monolith (3900+ lines) into modular components
