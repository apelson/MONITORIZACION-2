# Siempria Network Monitor - Product Requirements Document

## Original Problem Statement
Build and deploy "Siempria Network Monitor," a full-stack network monitoring application pivoted into a multi-tenant SaaS platform named "Siempriapp." The application monitors Mobotix cameras, VMware ESXi servers, QNAP and Synology NAS devices.

## User Personas
- **Network Administrators**: Monitor cameras and infrastructure
- **IT Managers**: View statistics, alerts, and incidents
- **End Users**: Access public dashboards (future)

## Core Requirements
- Multi-language support (ES, EN, DE, FR, IT, RU, ZH)
- Real-time device monitoring with alerts
- Infrastructure monitoring (ESXi, QNAP, Synology)
- NAS connection alerts for cameras
- Audible alerts for critical events
- Email notifications via SMTP

## Architecture
```
/app/
├── backend/         # FastAPI
│   ├── server.py    # Main server
│   ├── routes/      # API endpoints
│   └── services/    # Business logic
└── frontend/        # React
    ├── src/App.js   # Main component (needs refactor)
    └── components/  # UI components
```

## What's Been Implemented

### Session: 2026-02-01
- ✅ NAS Services Detection (QNAP/Synology)
- ✅ NAS Connection Alerts for cameras
- ✅ Enhanced Infrastructure Panel with tooltips
- ✅ "Open Web" button for device interfaces
- ✅ Services preview in NAS cards
- ✅ Multi-type alert support (nas_disconnected, storage_full, etc.)
- ✅ Improved alert UI with type-specific icons/colors

### Previous Sessions
- ✅ Multi-language i18n (login page complete)
- ✅ Audible alerts system
- ✅ Infrastructure monitoring (ESXi VMs, datastores)
- ✅ Firmware badge improvements
- ✅ "Made with Emergent" badge removed

## Prioritized Backlog

### P0 - Critical
- [ ] Deploy latest changes to production server

### P1 - High Priority
- [ ] Complete i18n for all UI sections
- [ ] Test NAS services with real QNAP/Synology devices
- [ ] Implement actual NAS connection monitoring for cameras

### P2 - Medium Priority
- [ ] Refactor App.js into smaller components
- [ ] Fix favicon/PWA icons in production
- [ ] Add more NAS-specific metrics

### P3 - Future
- [ ] Stripe payment integration
- [ ] Per-client subdomains
- [ ] Public dashboards UI
- [ ] Dahua P2P project

## Technical Debt
- **App.js**: Monolithic file (~5000 lines) needs splitting
- **Production deployment**: Two-step process (source → build → deploy)

## Production Environment
- **Source code**: `/home/monitorizacion/Documentos/MONITORIZACION-main/`
- **Running services**: `/opt/siempria-monitor/`
- **Domain**: siempriapp.com

## Credentials
- Admin: `admin` / `Spw@16071977`

## Third-Party Integrations
- i18next/react-i18next (internationalization)
- pyvmomi (VMware ESXi)
- QNAP QTS API
- Synology DSM API
- Stripe (planned)
