# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. Incluye NOC de conteo de visitas por marca de vehículos con cámaras Mobotix.

## Session 10 Mar 2026 - Blindaje de Aplicación

### ✅ Eliminación de Branding Externo (P0)
- Todas las referencias a `customer-assets.emergentagent.com` eliminadas del código fuente
- Logos descargados y guardados localmente en `/frontend/public/assets/`
  - `/assets/logos/siempria-logo.png`
  - `/assets/logos/siempria-symbol.png`
  - `/assets/logos/siempria-noc-logo.png`
  - `/assets/logos/siempria-autorizada.png`
  - `/assets/logos/siempria-horizontal.png`
  - `/assets/logos/dahua-logo.png`
  - `/assets/brands/audi.jpg`, `volkswagen.png`, `skoda.png`, `honda.png`, `ducati.png`, `daocasion.png`
- Archivos actualizados:
  - `RolesManager.jsx`, `LoginPage.jsx`, `NOCHeader.jsx`, `DahuaWidget.jsx`
  - `NOCDashboard.jsx`, `DahuaDevicesPanel.jsx`, `NOCDashboardRefactored.jsx`
  - `IncidentsPanel.jsx`, `InfrastructurePanel.jsx`, `StatisticsPanel.jsx`
  - `CRADashboard.jsx`, `RealtimeCountingNOC.jsx`, `AccessLogsPanel.jsx`
  - `SectionLoader.jsx`, `LoadingComponents.jsx`, `helpers.js`, `App.js`

### ✅ Gestión de Roles de Usuario (P1)
- Corregido bug en `RolesManager.jsx`: enviaba `role_id` en vez de `role`
- PUT `/api/users/{id}` ahora recibe correctamente `{ "role": "manager" }`

## Session 09 Mar 2026 - Funcionalidades Premium

### ✅ NOC Competitivo Premium (Pantalla 55" Fija)
- Diseño optimizado SIN SCROLL (1920x1080)
- Podio 3D con corona dorada + siluetas PNG de islas
- Efectos de confeti (canvas-confetti)
- Reloj en tiempo real, ranking de marcas/centros

### ✅ Permisos Granulares de Usuario
- Campos `allowed_brands` y `allowed_centers` en modelo de usuario
- Endpoints `GET/PUT /api/users/{id}/permissions`
- Panel de gestión en pestaña Users
- Filtrado activo en endpoints de ranking

### ✅ Exportación PDF con Comparativas
- Endpoint `GET /api/brand-statistics/export/pdf?period=day|week|month`
- PDF con ranking, variaciones %, top performers

## Pending Issues

### P0 (Críticos)
- ✅ Eliminación branding emergentagent - COMPLETADO
- ✅ NOCCompetitivo.jsx syntax error - COMPLETADO (ya estaba arreglado)
- ✅ User role management error 400 - COMPLETADO

### P2 (Menor Prioridad)
- Dashboard de seguridad: endpoints `/blacklist` y `/events` dan 404
  - Frontend busca `/api/security/blacklist` y `/api/security/events`
  - Backend tiene `/api/security/blocked-ips` y `/api/logs`
  - Requiere decisión: ¿conectar a existentes o crear nuevos?
- Mapa interactivo no muestra conteo de dispositivos por isla
- Cron job para `/store-snapshot` cada hora
- UI para permisos granulares (asignar marcas/centros)
- Centros sin `brand_id` en base de datos
- Verificar exportación PDF

## Archivos de Referencia
```
/app/frontend/public/assets/     # Logos locales
/app/frontend/src/
├── components/
│   ├── auth/LoginPage.jsx
│   ├── common/SectionLoader.jsx, LoadingComponents.jsx
│   ├── noc/NOCHeader.jsx, widgets/DahuaWidget.jsx
│   ├── panels/NOCCompetitivo.jsx, NOCDashboard.jsx...
│   └── settings/RolesManager.jsx
├── utils/helpers.js
└── App.js

/app/backend/
├── models/__init__.py (UserUpdate model)
└── routes/users.py (PUT /users/{id})
```

## API Endpoints Principales
```
POST /api/auth/login
GET  /api/users
PUT  /api/users/{id}          # { role, email, full_name, ... }
PUT  /api/users/{id}/permissions
GET  /api/brand-statistics/ranking
GET  /api/brand-statistics/export/pdf
```

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI + canvas-confetti
- Backend: FastAPI + MongoDB + ReportLab
- Assets: Locales en /public/assets/

## Credentials
- Admin: admin / admin123
