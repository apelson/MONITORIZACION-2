# Siempria Monitor & Conteo - PRD

## Original Problem Statement
Platform with two main projects deployed on a live Ubuntu VM:
- **siempria-conteo** (`/opt/siempria-conteo/`): Visit counting system with NOC Competitivo view
- **siempria-monitor** (`/opt/siempria-monitor/`): WatchTower NOC - Network Operations Center for device monitoring

User communicates in **Spanish**. All changes are applied via inline Python/Bash scripts on the user's production VM.

## Architecture
- **siempria-conteo**: React (Vite) frontend + FastAPI backend (port 8002) + MongoDB
- **siempria-monitor**: React (CRA/CRACO) frontend + FastAPI backend (port 8001, uvicorn) + MongoDB (`siempria_monitor` DB)
- Both run on the same Ubuntu VM at `/opt/`
- Backend restart: `pkill -f "uvicorn.*server:app.*8001" && cd /opt/siempria-monitor/backend && source venv/bin/activate && nohup uvicorn server:app --host 0.0.0.0 --port 8001 > /tmp/monitor_backend.log 2>&1 &`

## What's Been Implemented

### 2026-07-30 - NOC Overflow Fix (COMPLETED ✅)
- **siempria-conteo** (`App.css`): 5 CSS fixes — `grid-template-rows: 1fr`, text-overflow, mobile reset
- **siempria-monitor** (`NOCDashboard.jsx`): Grid layout fix — `flex-[3]`/`flex-[2]` + `grid-rows-1`
- User confirmed: "simplemente, perfecto"

### 2026-07-30 - Multi-Tenant Data Isolation (IN PROGRESS)

**Backend patches applied:**
- `cra.py`: Tenant filtering via `build_device_filter` and `build_alert_filter` — CRA devices/status/alerts now filtered
- `brand_statistics.py`: `should_filter_by_tenant` check — tenant users see only their own brands (empty for new tenants)
- `device_photos.py`: Filter photos by accessible devices — tenant users only see their photos
- `users.py`: 
  - `tenant_admin` can create/update/delete/reset-password for users in their tenant
  - New users inherit `tenant_id` from creator
  - `get_users` filters by `tenant_id`

**Frontend patches applied (App.js):**
- `SECTION_TO_FLAG_MAP` expanded with all sections (statistics, counting-noc, historical, users, settings, infrastructure, organizations, map, noc, dahua)
- `Users TabsContent`: Now allows `tenant_admin` (was admin-only)
- `Incidents TabsContent`: Now allows `tenant_admin`
- `CRA TabsContent`: Added `canAccessSection('cra')` guard
- `NOC button`: Removed CRA dependency — NOC visible for all roles
- `Grabadores TabsTrigger`: Changed from `canAccessSection('devices')` to `canAccessSection('dahua')`

**Database updates:**
- User "boluda" (`tenant_admin`, `tenant_id: tenant_boluda`): feature_flags set correctly (statistics OFF, CRA OFF, live_view OFF, NOC ON, etc.)

**API verification (boluda token):**
- `/cra/devices` → 0 devices ✅
- `/brand-statistics/brands` → 0 brands ✅
- `/device-photos/all` → 0 photos ✅

## Prioritized Backlog

### P0 - Super Admin Feature Flags Panel (NEXT PRIORITY)
**Problem**: Currently feature_flags are managed via MongoDB manually. Need a UI in the Super Admin panel to:
- View all tenants and their users
- Toggle feature flags per tenant (ON/OFF for each menu/section)
- Apply changes immediately
- This replaces manual DB updates

**Sections to control:**
- devices, statistics, noc_conteo, historico, cra, dahua, live_view, alerts, gallery, users, incidents, map, noc, settings, reports, ai_insights, infrastructure

### P1 - NOC Dashboard Tenant Isolation
**Problem**: NOC Dashboard (`NOCDashboard.jsx`) still shows CRA data from Siempria when opened by tenant users. The NOC fetches CRA data via `/cra/devices` (now filtered) AND from the `devices` prop + internal filtering.
- Need to verify NOC shows empty panels for boluda after backend restart
- CriticalAlertsWidget fetches data independently - needs verification
- VPN, Dahua widgets fetch independently - need verification

### P1 - Settings/Configuration Page Fix
**Problem**: Configuration page not working for both super admin and tenant_admin. Need to investigate.

### P2 - Refactor siempria-monitor App.js (>3900 lines)
- Break into modular components

## Credentials
- siempria-conteo Admin: `admin` / `Spw@1644` (Port 8002)
- siempria-monitor Admin: `admin` / (password in DB)
- siempria-monitor Tenant: `boluda` / `Canarias@2020` (tenant_id: `tenant_boluda`)

## Key Files Modified
- `/opt/siempria-monitor/backend/routes/cra.py` (+ .bak2 backup)
- `/opt/siempria-monitor/backend/routes/brand_statistics.py` (+ .bak2)
- `/opt/siempria-monitor/backend/routes/device_photos.py` (+ .bak2)
- `/opt/siempria-monitor/backend/routes/users.py` (+ .bak2)
- `/opt/siempria-monitor/frontend/src/App.js` (+ .mt_bak)
- `/opt/siempria-monitor/frontend/src/components/panels/NOCDashboard.jsx` (+ .bak)
- `/opt/siempria-conteo/frontend/src/App.css` (+ .bak)

## Multi-Tenancy Service
Located at `/opt/siempria-monitor/backend/services/multitenancy_service.py`:
- `should_filter_by_tenant(user)` → True for non-admin users
- `build_device_filter(user, extra_filter)` → MongoDB filter with group_id constraint
- `build_alert_filter(user, extra_filter)` → Filter alerts by accessible devices
- `build_organization_filter(user)` → Filter by organization_ids
- `build_dahua_device_filter(user, extra_filter)` → Filter Dahua devices
- `get_user_group_ids(user)` → List of group IDs user can access
- `get_user_organization_ids(user)` → List of org IDs user can access

## Critical Notes for Next Agent
- **ENVIRONMENT**: User's live Ubuntu VM at `/opt/`. DO NOT edit local `/app/` container.
- **WORKFLOW**: cat file → analyze → Python/bash patch script → user executes → rebuild
- **LANGUAGE**: Respond in Spanish
- **Build**: siempria-monitor: `cd /opt/siempria-monitor/frontend && npm run build`
- **Backend restart**: Kill and restart uvicorn (HUP doesn't reload Python code!)
- **Feature flags**: Stored in `users` collection, `feature_flags` field. `SECTION_TO_FLAG_MAP` in App.js maps section names to flag keys.
- **canAccessSection()**: Checks role permissions first, then feature_flags for tenant_admin users
