# WatchTower by Siempria - PRD

## Original Problem Statement
Sistema de monitorización de red profesional para Siempria. Incluye NOC de conteo de visitas por marca de vehículos con cámaras Mobotix.

## Latest Session - 07 Mar 2026

### ✅ COMPLETADO - Sistema de Conteo de Visitas

#### Funcionalidades Implementadas:

1. **🗺️ Mapa Interactivo con Leaflet/OpenStreetMap**
   - 7 islas canarias con coordenadas reales
   - 3 estilos: Calles, Satélite, Terreno

2. **📊 NOC de Conteo en Tiempo Real**
   - **Solo ENTRADAS (visitas)** - no se muestran salidas
   - Auto-refresh cada 30 segundos
   - Conexión directa con cámaras Mobotix MxAnalytics
   - Logos de todas las marcas

3. **📈 Sistema Histórico Completo**
   - Almacenamiento automático cada hora (scheduler APScheduler)
   - Colecciones: `brand_hourly_statistics`, `brand_daily_statistics`, `brand_weekly_statistics`
   - Tendencias: Diario, Semanal, Anual
   - **Comparativas entre períodos**
   - **Exportación CSV**

4. **🏆 Ranking de Marcas**
   - AUDI, VOLKSWAGEN, SKODA, HONDA, DUCATI, DAOCASION, Ocasión Domingo Alonso
   - Logos configurados para todas las marcas

5. **⚙️ Panel de Configuración de Cámaras (NUEVO)**
   - UI completa para añadir, editar y eliminar cámaras
   - Asociación de cámaras con marcas e islas
   - Test de conexión desde la UI
   - Accesible solo para administradores

#### Cámara Configurada:
- **DAOCASION Lanzarote - Entrada**
- IP: 212.64.162.40:40002
- Status: ONLINE ✅

#### Tabs Principales:
- **Statistics** - Ranking de marcas
- **NOC Conteo** - Tiempo real
- **Histórico** - Tendencias y comparativas
- **Config Cámaras** - Gestión de cámaras (admin)

### API Endpoints Creados:
```
# Tiempo Real
GET  /api/brand-statistics/realtime
POST /api/brand-statistics/realtime/refresh

# Histórico
GET  /api/brand-statistics/history/daily
GET  /api/brand-statistics/history/weekly
GET  /api/brand-statistics/history/compare-months
GET  /api/brand-statistics/history/compare-weeks
GET  /api/brand-statistics/history/year-over-year
GET  /api/brand-statistics/history/by-island
POST /api/brand-statistics/store-snapshot

# Exportación
GET  /api/brand-statistics/export/csv
GET  /api/brand-statistics/export/summary

# Configuración de Cámaras
GET    /api/brand-statistics/cameras-config
POST   /api/brand-statistics/cameras-config
DELETE /api/brand-statistics/cameras-config/{id}

# Marcas
GET  /api/brand-statistics/brands
GET  /api/brand-statistics/ranking
GET  /api/brand-statistics/ranking-by-island
GET  /api/brand-statistics/summary
```

### Archivos Principales:
```
/app
├── backend
│   ├── routes/brand_statistics.py (endpoints)
│   ├── services/mobotix_counting_service.py (conexión cámaras)
│   └── server.py (scheduler cada hora)
└── frontend/src/components/panels/
    ├── RealtimeCountingNOC.jsx (NOC tiempo real)
    ├── BrandRankingPanel.jsx (ranking marcas)
    ├── HistoricalStatsPanel.jsx (histórico + comparativas)
    └── CameraConfigPanel.jsx (configuración de cámaras) ✨ NUEVO
```

### Scheduler Automático:
- Cada **1 hora** almacena snapshot de todas las cámaras
- Guarda en 3 colecciones: hourly, daily, weekly

## Pending Issues
- (P1) La comparación de meses no renderiza resultados correctamente

## Pending Tasks
- (P0) Desplegar cambios en servidor de producción del usuario
- (P1) Debug comparación histórica mes vs mes
- (P2) Añadir más cámaras de otras marcas
- (P2) Videos reales en Tutoriales
- (P2) Refactorizar App.js (4000+ líneas)

## Credentials
- Admin: admin / admin123
- Mobotix: admin / Spw6009 @ 212.64.162.40:40002

## Database Collections
- `brand_cameras_config` - Configuración de cámaras
- `brand_hourly_statistics` - Estadísticas por hora
- `brand_daily_statistics` - Estadísticas diarias
- `brand_weekly_statistics` - Estadísticas semanales
