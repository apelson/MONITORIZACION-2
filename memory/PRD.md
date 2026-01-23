# Siempria Network Monitor - Product Requirements Document

## Descripción del Producto
Aplicación de monitoreo de red para equipos con IPs públicas, desarrollada para Siempria (distribuidor autorizado de Mobotix).

## Stack Tecnológico
- **Backend:** FastAPI + Python + Motor (MongoDB async)
- **Frontend:** React + TailwindCSS + shadcn/ui + @dnd-kit
- **Base de Datos:** MongoDB
- **Servidor:** Nginx (proxy reverso)

---

## Características Implementadas ✅

### Sistema de Usuarios y Autenticación
- [x] Login/Logout con JWT
- [x] Roles: Admin, Manager, Viewer, Operator, **Técnico** (NUEVO)
- [x] Vista restringida para Operadores (solo cámaras online)
- [x] **Vista Técnico**: Acceso completo de lectura a todos los dispositivos (IP, puerto, historial)

### Estructura Organizacional
- [x] Organizaciones con logos, país y ciudad
- [x] Grupos dentro de organizaciones
- [x] Filtro de dispositivos por país, organización, grupo, tipo
- [x] **Filtro por estado** (Online/Offline/Desconocido) (NUEVO)

### Gestión de Dispositivos
- [x] Tipos: Camera, NAS, Switch, Router, Server, Other
- [x] Campos: IP, Puerto, Protocolo (HTTP/HTTPS), Credenciales
- [x] Campos personalizados: Marca, Modelo, Ubicación, Notas
- [x] Clonación de dispositivos
- [x] Auto-llenado de rutas para cámaras (Mobotix, Hikvision, etc.)
- [x] **Checkbox "Estadísticas MxAnalytics"** para cámaras Mobotix (NUEVO)
- [x] Drag & Drop para reordenar tarjetas de dispositivos

### Estadísticas de Cámaras Mobotix (NUEVO)
- [x] **Nueva pestaña "Estadísticas"** en el menú principal
- [x] Lista de cámaras con MxAnalytics habilitado
- [x] **Resumen de conteo**: Total de personas, corredores, reportes, mapas de calor
- [x] **Reporte de conteo**: Datos por hora/día/semana con direcciones (Norte/Sur)
- [x] **Mapa de calor**: Imagen generada por la cámara (diario/semanal/mensual)
- [x] API Backend: `/api/cameras/{id}/mobotix/overview`, `/report`, `/heatmap`

### Monitoreo TCP
- [x] Verificación de puertos TCP
- [x] Historial de estados
- [x] Intervalos configurables

### Preview de Cámaras
- [x] Proxy backend para autenticación HTTP básica
- [x] Soporte HTTPS con certificados autofirmados
- [x] Timestamp en las previews de cámaras
- [x] Botón para abrir interfaz web de la cámara
- [x] Enlace directo (🌐) para todos los dispositivos

### Alertas por Email
- [x] Configuración SMTP Gmail
- [x] Alertas por cambio de estado (online/offline)
- [x] Popup de notificación para dispositivos offline

### UI/UX Profesional
- [x] Pantalla de login corporativa (colores Siempria: #00A3D9, #63666A, #FF8C00)
- [x] Pantalla de carga animada con logo de cámara
- [x] Iconos personalizados por tipo de dispositivo
- [x] Dashboard responsivo
- [x] **Paginación de 24 dispositivos** por página (4 tarjetas por línea)
- [x] Links de contacto clickeables (mailto, tel)

### Exportación
- [x] Exportar a Excel
- [x] Exportar a PDF

### Despliegue
- [x] Guía de instalación para Ubuntu 24.04
- [x] Script automatizado de instalación

---

## En Progreso 🔄

### Logo Horizontal en Móvil (P0)
- [x] Constante `LOGO_HORIZONTAL_URL` añadida
- [ ] Implementar en header responsive

### Reportes Programados por Email (P1)
- [x] Backend: Modelo y endpoints de configuración
- [x] Frontend: UI de configuración
- [ ] Backend: Implementar envío real con APScheduler

### Dashboards Públicos (P2)
- [x] Backend: Modelo PublicDashboard
- [x] Backend: Endpoints básicos
- [ ] Frontend: UI de configuración
- [ ] Frontend: Vista pública compartible

---

## Backlog / Futuro 📋

### P0 - Crítico
- [ ] Refactorizar App.js (2500+ líneas) en componentes separados
- [ ] Refactorizar server.py en routers/modelos/servicios

### P1 - Importante
- [ ] Cambio de contraseña de usuario
- [ ] Recuperación de contraseña
- [ ] Estadísticas en tiempo real (WebSocket/polling rápido)

### P2 - Mejoras
- [ ] Gráficos de uptime histórico
- [ ] Notificaciones push en navegador
- [ ] Modo oscuro
- [ ] Históricos de conteo de personas (gráficos)

---

## Credenciales de Prueba
- **Admin:** admin / admin123
- **Operador:** operador / operador123  
- **Técnico:** tecnico / tecnico123

---

## Cámaras con Estadísticas
| Nombre | IP | Puerto | Credenciales |
|--------|-----|--------|--------------|
| PRUEBA ESTADISTICAS | 212.64.162.40 | 40002 | admin2:Canarias@2020 |

---

## API de Mobotix MxAnalytics
```
GET /control/stat_export?overview          → Resumen JSON
GET /control/stat_export?report&export_type=week&export_range=current&export_format=json → Reporte conteo
GET /control/stat_export?heatmap&export_type=week&export_range=last&export_format=jpeg → Mapa de calor
```

---

## Última actualización
Fecha: 2026-01-23
- ✅ Implementado filtro de estado (online/offline)
- ✅ Implementado rol "Técnico" (lectura completa)
- ✅ Implementada sección "Estadísticas MxAnalytics"
- ✅ Reducida paginación a 24 dispositivos
- ✅ Añadido checkbox has_statistics al formulario de cámaras
