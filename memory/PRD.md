# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. Incluye NOC de conteo de visitas por marca de vehículos con cámaras Mobotix.

## Session 09 Mar 2026 - COMPLETADO

### ✅ NOC Competitivo Premium (Pantalla 55" Fija)
- Diseño optimizado SIN SCROLL (1920x1080)
- Podio 3D con corona dorada + siluetas PNG de islas
- Efectos de confeti (canvas-confetti)
- Reloj en tiempo real, ranking de marcas/centros

### ✅ Permisos Granulares de Usuario
- Campos `allowed_brands` y `allowed_centers` en modelo de usuario
- Endpoints `GET/PUT /api/users/{id}/permissions`
- Panel de gestión en pestaña Users
- **Filtrado REAL activo en endpoints de ranking**

### ✅ Exportación PDF con Comparativas
- Endpoint `GET /api/brand-statistics/export/pdf?period=day|week|month`
- PDF con ranking, variaciones %, top performers
- Panel en pestaña Statistics

### ✅ Botones Flotantes Alineados
- CRA: top 200px
- LiveViewer: top 280px  
- NOC Competitivo: top 360px

## Archivos Creados/Modificados
```
/app/backend/
├── models/__init__.py (UserPermissionsUpdate)
├── routes/
│   ├── brand_statistics.py (filtrado por permisos)
│   ├── users.py (endpoints de permisos)
│   └── pdf_export.py (NUEVO)
└── server.py (registro pdf_export_router)

/app/frontend/src/
├── App.js (imports)
└── components/panels/
    ├── NOCCompetitivo.jsx (rediseño)
    ├── UserPermissionsManager.jsx (NUEVO)
    └── ReportExportPanel.jsx (NUEVO)
```

## API Endpoints

### Permisos
```
PUT  /api/users/{id}/permissions
GET  /api/users/{id}/permissions
```

### Ranking (con filtrado por permisos)
```
GET  /api/brand-statistics/ranking?period=day|week|month
     Response incluye: "filtered_by_permissions": true/false

GET  /api/brand-statistics/ranking-by-center?period=day
     Response incluye: "filtered_by_permissions": true/false
```

### Exportación PDF
```
GET  /api/brand-statistics/export/pdf?period=day|week|month
GET  /api/brand-statistics/export/json?period=day|week|month
```

## Dependencias
- canvas-confetti: ^1.9.4 (frontend)
- reportlab: 4.4.9 (backend)

## Pending Issues (Servidor 192.168.1.76)
- P2: Cámara fantasma "AUDI Tenerife - Entrada"
- P2: Datos del mapa con island asignada

## Credentials
- Admin: admin / admin123
- Mobotix: admin / Spw6009

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI + canvas-confetti
- Backend: FastAPI + MongoDB + ReportLab
