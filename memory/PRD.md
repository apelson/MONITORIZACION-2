# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. Incluye NOC de conteo de visitas por marca de vehículos con cámaras Mobotix.

## Latest Session - 09 Mar 2026

### ✅ COMPLETADO - Rediseño Premium NOC Competitivo

#### Funcionalidades Implementadas:

1. **🏆 Podio 3D Premium**
   - Efectos de brillo dorado para el líder
   - Corona animada con partículas Sparkles
   - Bloques 3D con sombras y profundidad
   - Hover effects con scale transform

2. **🎨 Diseño Glassmorphism**
   - Fondos con backdrop-blur-md
   - Bordes translúcidos (border-white/10)
   - Cards de ranking con hover effects
   - Scrollbar personalizado

3. **🌈 Fondo Animado**
   - Orbes de gradiente animados (púrpura, cyan, ámbar)
   - Patrón de cuadrícula sutil
   - Color base #0a0a1a (casi negro)

4. **⏰ Reloj en Tiempo Real**
   - Formato HH:MM:SS con actualización cada segundo
   - Fecha completa (día de la semana, número, mes)
   - Font tabular-nums para números fijos

5. **🏝️ Panel de Islas Canarias**
   - 7 islas con badges de colores distintivos
   - TF (violeta), GC (verde), LZ (azul), FV (ámbar)
   - LP (cyan), LG (rosa), EH (naranja)
   - Corona para isla líder

6. **📊 Ranking con Tabs**
   - Tab Marcas: ranking completo de marcas
   - Tab Centros: ranking por centro/isla
   - Barras de progreso animadas
   - Badges con contadores

### ✅ COMPLETADO - Alineación de Botones Flotantes

#### Problema Resuelto:
Los 3 botones flotantes (CRA, LiveViewer, NOC Competitivo) tenían posiciones inconsistentes usando `calc()` que causaban desalineación visual.

#### Solución Aplicada:
- **CRAFloatingButton**: `top: 200px` (era `top-1/3`)
- **LiveViewerFloatingButton**: `top: 280px` (era `calc(33% + 100px)`)
- **NOCCompetitivoFloatingButton**: `top: 360px` (era `calc(33% + 200px)`)
- **Ancho expandido unificado**: `w-44` para todos (antes NOC tenía `w-52`)
- **Espaciado uniforme**: 80px entre cada botón

#### Testing:
- 23/23 tests pasados ✅
- Alineación verificada: todos en x=1864

## Archivos Principales Actualizados:
```
/app/frontend/src/components/
├── panels/
│   └── NOCCompetitivo.jsx (REDISEÑO COMPLETO)
└── common/
    ├── CRAFloatingButton.jsx (ALINEACIÓN)
    ├── LiveViewerFloatingButton.jsx (ALINEACIÓN)
    └── NOCCompetitivoFloatingButton.jsx (ALINEACIÓN)
```

## Session - 07-08 Mar 2026 (Previous)

### ✅ COMPLETADO - Sistema de Conteo de Visitas

#### Funcionalidades:
1. **🗺️ Mapa Interactivo Leaflet/OpenStreetMap**
2. **📊 NOC de Conteo en Tiempo Real** (solo ENTRADAS)
3. **📈 Sistema Histórico Completo**
4. **🏆 Ranking de Marcas** (AUDI, VOLKSWAGEN, SKODA, HONDA, DUCATI, DAOCASION)
5. **⚙️ Panel de Configuración de Cámaras**
6. **🏷️ CRUD de Marcas/Centros con Upload de Logos**

### API Endpoints:
```
# Tiempo Real
GET  /api/brand-statistics/realtime
POST /api/brand-statistics/realtime/refresh

# Histórico
GET  /api/brand-statistics/history/daily
GET  /api/brand-statistics/history/weekly
GET  /api/brand-statistics/history/by-island

# Configuración
GET    /api/brand-statistics/cameras-config
POST   /api/brand-statistics/cameras-config
DELETE /api/brand-statistics/cameras-config/{id}

# Marcas/Centros
GET  /api/brand-statistics/brands
POST /api/brand-statistics/brands
PUT  /api/brand-statistics/brands/{id}
DELETE /api/brand-statistics/brands/{id}
GET  /api/brand-statistics/centers
POST /api/brand-statistics/centers

# Exportación
GET  /api/brand-statistics/export/csv
```

## Pending Issues

### P1 - Logos en Brand/Center Manager
- **Problema**: Logos de marcas antiguas (AUDI, VW, etc.) no aparecen en el gestor
- **Causa probable**: Inconsistencia entre campos `logo` y `logo_url` en la DB
- **Acción**: Investigar API `/api/brand-statistics/brands` y sincronizar campos

### P2 - Cámara Fantasma
- **Problema**: "AUDI Tenerife - Entrada" aparece en listas pero fue eliminada
- **Acción**: Buscar en colección `devices` y eliminar entrada

### P2 - Datos del Mapa
- **Problema**: Conteos del mapa no coinciden con otros paneles NOC
- **Acción**: Revisar agregación en endpoint y `LeafletCanaryMap.jsx`

## Upcoming Tasks

### P1 - Implementar Subida de Archivos para Logos
- Actualmente solo permite URL
- Crear endpoint POST /api/upload
- Modificar BrandCenterManager.jsx

### P2 - Permisos Granulares de Usuario
- Filtrar datos según permisos del usuario
- Extender modelo de usuario

## Credentials
- Admin: admin / admin123
- Mobotix: admin / Spw6009 @ 212.64.162.40:40002

## Database Collections
- `brands` - Configuración de marcas
- `centers` - Centros por isla
- `brand_cameras_config` - Configuración de cámaras
- `brand_hourly_statistics` - Estadísticas por hora
- `brand_daily_statistics` - Estadísticas diarias
- `brand_weekly_statistics` - Estadísticas semanales

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI
- Backend: FastAPI + MongoDB
- Maps: Leaflet + OpenStreetMap
- Charts: Recharts
- Icons: Lucide React
