# PRD - Siempria Monitor (WatchTower)

## Estado Actual (5 Ago 2026)

### Completado esta sesión:
- Refactorización App.js Fases 4-7: 3944 → 2425 líneas (39%)
- Email SMTP configurado (conteo@siempria.com) + 10 emails con PDF SLA enviados
- Logos en PDFs SLA (cabecera con logo/color org)
- Logos en interfaz (dropdowns con color dots, banner org)
- Feature flags por tenant (noc_conteo, brand_statistics, historical_stats)
- Logo Boluda Corporación Marítima subido y asignado a Terminal Tenerife/La Palma
- Fix imports faltantes en componentes extraídos (Cctv, Shield, Lock, MOBOTIX_LOGO_URL, getIcon, ICON_MAP, HardDriveIcon, WHATSAPP_ALERT_NUMBER, BACKEND_URL)

### BUGS CRÍTICOS PENDIENTES:
1. **Fuga de alertas entre tenants en NOC**: boluda ve alertas de otros clientes (LZ-NAS, LZ-MKT, etc.). Necesita filtrar alertas por tenant
2. **Botón amarillo flotante** visible para tenant_admin - ocultar

### Tareas Pendientes:
- (P0) Fix aislamiento alertas en NOC/dashboard para tenants
- (P0) Ocultar botón amarillo flotante para tenant_admin
- (P1) Activar grabadores (dahua) para boluda con aislamiento de datos
- (P1) Mostrar logo Boluda en listado dispositivos y NOC
- (P2) Continuar refactorización AppContent (~2000 líneas)
- (P2) Dashboard personalizado por tenant
- (P3) Fix SVG logos en PDFs (TIMELAPSE)

### Feature Flags Implementados:
- `noc_conteo` - Controla tab NOC Conteo
- `brand_statistics` - Controla tab Estadísticas (marcas)
- `historical_stats` - Controla tab Histórico
- `devices`, `alerts`, `cra`, `dahua`, `live_view`, `incidents`, `reports`, `ai_insights`, `gallery`

### Credenciales:
- Admin: admin / Spw@1644
- Tenant: boluda / Canarias@2020
- Email SMTP: conteo@siempria.com / NyXl9J&072=( (SMTPS 465)
