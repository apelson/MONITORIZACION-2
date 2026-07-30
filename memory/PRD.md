# Siempria Monitor & Conteo - PRD

## Original Problem Statement
Platform with two main projects deployed on a live Ubuntu VM:
- **siempria-conteo** (`/opt/siempria-conteo/`): Visit counting system with NOC Competitivo view
- **siempria-monitor** (`/opt/siempria-monitor/`): WatchTower NOC - Network Operations Center for device monitoring

User communicates in **Spanish**. All changes are applied via inline Python/Bash scripts on the user's production VM.

## Architecture
- **siempria-conteo**: React (Vite) frontend + FastAPI backend (port 8002) + MongoDB
- **siempria-monitor**: React (CRA/CRACO) frontend + FastAPI backend + MongoDB (`siempria_monitor` DB)
- Both run on the same Ubuntu VM at `/opt/`

## What's Been Implemented

### 2026-07-30 - NOC Overflow Fix (COMPLETED)
**siempria-conteo NOCView.jsx** - CSS overflow fix:
- Added `grid-template-rows: 1fr` to `.noc-body-55` and `.noc-left-cols`
- Added `min-height: 0` to `.noc-left-cols .noc-panel`
- Added text-overflow: ellipsis to `.noc-rk-name`
- Mobile reset: `grid-template-rows: auto` for responsive

**siempria-monitor NOCDashboard.jsx** - Dashboard overflow fix:
- Main grid: Changed `flex-1` to `flex-[3]` + added `grid-rows-1` + `overflow-hidden`
- Bottom section: Changed from `shrink-0 + height:35%` to `flex-[2]` + `grid-rows-1` + `min-h-0` + `overflow-hidden`
- Result: All panels properly contained within viewport on 55" TV at 1920x1080
- User confirmed: "simplemente, perfecto"

### Previous Work (from earlier sessions)
- Production deployment of modular views (AccessLogsView, EmailSettingsView, ReportsConfigView)
- Dashboard.jsx routing/menus patched
- App.jsx cleanup
- Change Password functionality

## Prioritized Backlog

### P0 - Multi-Tenant Data Isolation (CRITICAL - Next Priority)
**Problem**: New tenant users (e.g., "boluda" with `tenant_id: 'tenant_boluda'`) can see data from other tenants:
- CRA devices (55 devices visible that belong to Siempria)
- Brand statistics (AUDI, VW, DUCATI, etc. from conteo)
- Gallery photos (17 images from other tenant)
- Historical data (155 records from other tenant)
- NOC Conteo brands visible

**User "boluda" DB record**:
```json
{
  "role": "tenant_admin",
  "tenant_id": "tenant_boluda",
  "feature_flags": {"devices": true, "alerts": true, "cra": true, ...},
  "organization_ids": [],
  "group_ids": null
}
```

**Required fixes**:
1. Apply `tenant_id` filtering to ALL backend routes (CRA, statistics, photos, alerts, dahua, incidents, etc.)
2. `tenant_admin` should be able to create users within their own tenant
3. `tenant_admin` should be able to create incidents
4. Super admin panel to enable/disable menu sections per tenant
5. Settings/Configuration panel broken (for both super admin and tenant_admin)

### P1 - Super Admin Permissions Control
- Panel in super admin to activate/deactivate sections per tenant
- Frontend: hide tabs based on tenant permissions
- Feature flags should control menu visibility

### P2 - Refactor siempria-monitor App.js (>3900 lines)
- Break into modular components

## Credentials
- siempria-conteo Admin: `admin` / `Spw@1644` (Port 8002)
- siempria-monitor: User "boluda" (`tenant_admin`, `tenant_id: tenant_boluda`)

## Key Files
- `/opt/siempria-conteo/frontend/src/App.css` (NOC styles)
- `/opt/siempria-conteo/frontend/src/conteo/views/NOCView.jsx`
- `/opt/siempria-monitor/frontend/src/components/panels/NOCDashboard.jsx`
- `/opt/siempria-monitor/frontend/src/App.js` (3900+ lines monolith)
- `/opt/siempria-monitor/backend/routes/` (all API routes)
- `/opt/siempria-monitor/backend/services/auth_service.py`
- `/opt/siempria-monitor/backend/routes/tenant_auth.py`
- `/opt/siempria-monitor/backend/routes/devices.py` (has partial tenant filtering)

## Critical Notes for Next Agent
- **ENVIRONMENT**: User's live Ubuntu VM at `/opt/`. DO NOT edit files in local `/app/` container.
- **WORKFLOW**: Ask user to `cat` files → analyze → provide Python/bash patch scripts → user executes → rebuild
- **LANGUAGE**: Respond in Spanish
- **Build commands**: 
  - siempria-conteo: `cd /opt/siempria-conteo/frontend && npm run build`
  - siempria-monitor: `cd /opt/siempria-monitor/frontend && npm run build`
- **Multi-tenancy infrastructure**: Partially exists (`should_filter_by_tenant`, `tenant_devices.py`, `tenant_auth.py`) but NOT applied consistently
