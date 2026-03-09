# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. Incluye NOC de conteo de visitas por marca de vehículos con cámaras Mobotix.

## Latest Session - 09 Mar 2026

### ✅ COMPLETADO - NOC Competitivo Premium (Pantalla 55" Fija)

- Diseño optimizado SIN SCROLL (1920x1080)
- Podio 3D compacto con corona dorada
- Siluetas PNG de 5 islas canarias
- Efectos de confeti con canvas-confetti
- Reloj en tiempo real, ranking de marcas/centros
- Auto-refresh 30s

### ✅ COMPLETADO - Permisos Granulares de Usuario

**Backend:**
- Modelo `UserPermissionsUpdate` en `/app/backend/models/__init__.py`
- Campos `allowed_brands` y `allowed_centers` en usuarios
- Endpoints:
  - `PUT /api/users/{id}/permissions` - Actualizar permisos
  - `GET /api/users/{id}/permissions` - Obtener permisos

**Frontend:**
- Componente `UserPermissionsManager.jsx`
- Integrado en pestaña "Users"
- Lista de usuarios a la izquierda
- Editor de permisos a la derecha con checkboxes
- Secciones colapsables: Marcas Permitidas / Centros Permitidos
- Botones: "Seleccionar todas", "Limpiar (acceso total)", "Guardar"

### ✅ COMPLETADO - Exportación PDF con Comparativas

**Backend:**
- Ruta `/app/backend/routes/pdf_export.py`
- Endpoints:
  - `GET /api/brand-statistics/export/pdf?period=day|week|month`
  - `GET /api/brand-statistics/export/json?period=day|week|month`
- Genera PDF con ReportLab:
  - Resumen general (actual vs anterior)
  - Ranking completo con variación %
  - Indicadores de crecimiento (↑↓)
  - Top performers

**Frontend:**
- Componente `ReportExportPanel.jsx`
- Integrado en pestaña "Statistics" (junto a BrandRankingPanel)
- Selector de período: Día, Semana, Mes
- Vista previa con datos del API
- Botón "Descargar Informe PDF"

## Archivos Creados/Modificados:
```
/app/backend/
├── models/__init__.py (UserPermissionsUpdate añadido)
├── routes/
│   ├── users.py (endpoints de permisos)
│   └── pdf_export.py (NUEVO - exportación PDF)
└── server.py (registro de pdf_export_router)

/app/frontend/src/components/panels/
├── NOCCompetitivo.jsx (optimizado para 55" sin scroll)
├── UserPermissionsManager.jsx (NUEVO)
└── ReportExportPanel.jsx (NUEVO)

/app/frontend/src/App.js (imports y integración)
```

## Dependencias Añadidas:
- `canvas-confetti: ^1.9.4` (frontend)
- `reportlab: 4.4.9` (backend - ya instalado)

## API Endpoints

### Permisos de Usuario
```
PUT  /api/users/{user_id}/permissions
     Body: { "allowed_brands": ["audi", "vw"], "allowed_centers": ["tenerife"] }
     
GET  /api/users/{user_id}/permissions
     Response: { "allowed_brands": [], "allowed_centers": [] }
```

### Exportación PDF
```
GET  /api/brand-statistics/export/pdf?period=day|week|month
     Response: application/pdf (descarga directa)

GET  /api/brand-statistics/export/json?period=day|week|month
     Response: { "period", "ranges", "summary", "ranking" }
```

## Pending Issues

### P2 - Cámara Fantasma (192.168.1.76)
- "AUDI Tenerife - Entrada" en servidor de producción
- Buscar en `db.devices`

### P2 - Datos del Mapa
- Verificar asignación de `island` en dispositivos de producción

## Future Tasks

### P3 - Filtrado por Permisos en Endpoints
- Actualmente los permisos se guardan pero no filtran datos
- Implementar middleware para filtrar ranking según `allowed_brands`

## Credentials
- Admin: admin / admin123
- Mobotix: admin / Spw6009 @ 212.64.162.40:40002

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI + canvas-confetti
- Backend: FastAPI + MongoDB + ReportLab
- Maps: Leaflet + OpenStreetMap
- Charts: Recharts
- Icons: Lucide React
