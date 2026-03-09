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

2. **🎨 Diseño Glassmorphism**
   - Fondos con backdrop-blur-md
   - Bordes translúcidos
   - Cards con hover effects

3. **🌈 Fondo Animado**
   - Orbes de gradiente animados
   - Patrón de cuadrícula sutil

4. **⏰ Reloj en Tiempo Real**
   - Formato HH:MM:SS actualizado cada segundo
   - Fecha completa (día, número, mes)

5. **🏝️ Panel de Islas con Siluetas PNG**
   - 5 islas con siluetas reales (TF, GC, LZ, FV, LP)
   - 2 islas con badges (LG, EH - no tienen PNG)
   - Efecto glow según actividad
   - Corona para isla líder

6. **🎊 Efectos de Confeti**
   - Librería canvas-confetti instalada
   - Botón manual para lanzar confeti
   - Confeti automático cuando hay récord (+10%)
   - Partículas doradas, naranjas, rojas, púrpuras, cyan

### ✅ COMPLETADO - Alineación de Botones Flotantes

- **CRAFloatingButton**: `top: 200px`
- **LiveViewerFloatingButton**: `top: 280px`
- **NOCCompetitivoFloatingButton**: `top: 360px`
- **Ancho expandido unificado**: `w-44` para todos
- **Espaciado uniforme**: 80px entre botones
- **Testing**: 23/23 tests pasados ✅

### ✅ VERIFICADO - Logos en Brand/Center Manager

Los logos de todas las marcas (AUDI, VOLKSWAGEN, SKODA, HONDA, DUCATI, DAOCASION) se muestran correctamente:
- Base de datos tiene campo `logo` con URLs válidas
- Frontend usa `brand.logo` correctamente
- Backend API devuelve todos los campos

## Archivos Modificados:
```
/app/frontend/src/components/
├── panels/
│   └── NOCCompetitivo.jsx (REDISEÑO + SILUETAS + CONFETI)
└── common/
    ├── CRAFloatingButton.jsx (ALINEACIÓN)
    ├── LiveViewerFloatingButton.jsx (ALINEACIÓN)
    └── NOCCompetitivoFloatingButton.jsx (ALINEACIÓN)
```

## Dependencias Añadidas:
```
canvas-confetti: ^1.9.4
```

## Previous Sessions (07-08 Mar 2026)

### Sistema de Conteo de Visitas
- Mapa Interactivo Leaflet/OpenStreetMap
- NOC de Conteo en Tiempo Real (solo ENTRADAS)
- Sistema Histórico Completo
- Ranking de Marcas
- Panel de Configuración de Cámaras
- CRUD de Marcas/Centros con Upload de Logos

### API Endpoints
```
GET/POST /api/brand-statistics/brands
GET/POST /api/brand-statistics/centers
GET /api/brand-statistics/realtime
GET /api/brand-statistics/ranking
GET /api/brand-statistics/ranking-by-center
GET /api/brand-statistics/history/by-island
GET /api/brand-statistics/cameras-config
POST /api/upload
```

## Pending Issues (Específicos del servidor de producción 192.168.1.76)

### P2 - Cámara Fantasma
- **Issue**: "AUDI Tenerife - Entrada" aparece en listas pero fue eliminada
- **Estado**: No reproducible en preview (no existe en DB local)
- **Acción**: Usuario debe buscar en `db.devices` de su servidor

### P2 - Datos del Mapa
- **Issue**: Conteos del mapa no coinciden con otros paneles
- **Estado**: Mapa funciona correctamente en preview
- **Causa probable**: Dispositivos sin isla asignada en servidor de producción

## Future Tasks

### P2 - Permisos Granulares de Usuario
- Filtrar datos según permisos del usuario
- Extender modelo de usuario con `allowed_brands` y `allowed_centers`

## Credentials
- Admin: admin / admin123
- Mobotix: admin / Spw6009 @ 212.64.162.40:40002

## Database Collections
- `brands` - Configuración de marcas (con campo `logo`)
- `centers` - Centros por isla
- `brand_cameras_config` - Configuración de cámaras
- `brand_hourly_statistics` - Estadísticas por hora
- `brand_daily_statistics` - Estadísticas diarias
- `brand_weekly_statistics` - Estadísticas semanales

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI + canvas-confetti
- Backend: FastAPI + MongoDB
- Maps: Leaflet + OpenStreetMap
- Charts: Recharts
- Icons: Lucide React
