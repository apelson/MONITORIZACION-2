# Siempria Network Monitor - Product Requirements Document

## Descripción del Producto
Aplicación de monitoreo de red para equipos con IPs públicas, desarrollada para Siempria (distribuidor autorizado de Mobotix).

## Stack Tecnológico
- **Backend:** FastAPI + Python + Motor (MongoDB async) - **REFACTORIZADO**
- **Frontend:** React + TailwindCSS + shadcn/ui + @dnd-kit + Recharts
- **Base de Datos:** MongoDB
- **Servidor:** Nginx (proxy reverso)

---

## Arquitectura del Backend (REFACTORIZADO 23/01/2026)

```
/app/backend/
├── server.py          # Punto de entrada (396 líneas, antes 1851)
├── config.py          # Configuración y conexión DB
├── models/
│   └── __init__.py    # Modelos Pydantic
├── routes/
│   ├── auth.py        # Autenticación y login
│   ├── users.py       # Gestión de usuarios
│   ├── organizations.py # Organizaciones y grupos
│   ├── devices.py     # Dispositivos y tipos
│   ├── settings.py    # Configuración email/reportes
│   └── statistics.py  # Estadísticas Mobotix
└── services/
    ├── auth_service.py    # Funciones de autenticación
    ├── device_service.py  # Verificación de dispositivos
    └── email_service.py   # Envío de alertas por email
```

## Características Implementadas ✅

### Sistema de Usuarios y Autenticación
- [x] Login/Logout con JWT
- [x] Roles: Admin, Manager, Viewer, Operator, Técnico
- [x] Vista restringida para Operadores (solo cámaras online)
- [x] Vista Técnico: Acceso completo de lectura a todos los dispositivos (sin Estadísticas)
- [x] Cambio de contraseñas desde panel de admin

### Estructura Organizacional
- [x] Organizaciones con logos, país y ciudad
- [x] Grupos dentro de organizaciones
- [x] Filtro de dispositivos por país, organización, grupo, tipo, estado
- [x] Filtro por estadísticas habilitadas
- [x] Filtro por tipo desde panel Tipos

### Gestión de Dispositivos
- [x] Tipos: Camera, NAS, Switch, Router, Server, Other
- [x] Campos: IP, Puerto, Protocolo, Credenciales, Marca, Modelo, Ubicación
- [x] Clonación de dispositivos
- [x] Drag & Drop para reordenar tarjetas
- [x] Paginación de 24 dispositivos por página
- [x] Badge "Stats" en tarjetas con estadísticas
- [x] Contador de dispositivos por tipo

### Estadísticas de Cámaras Mobotix (MxAnalytics) - REDISEÑADO
- [x] Panel completamente rediseñado para mayor intuitividad
- [x] Cabecera con gradiente mostrando info de cámara
- [x] Pestañas: "Conteo de Personas" y "Mapa de Calor"
- [x] Selector de período con botones grandes y claros
- [x] Tarjetas de resumen con totales (Entradas, Salidas, Total, Récord)
- [x] Gráficos interactivos con Recharts
- [x] Tabla de detalle por hora
- [x] Exportación a Excel/CSV
- [x] Fechas personalizadas

### UI/UX Profesional
- [x] Pantalla de login corporativa (colores Siempria)
- [x] Pantalla de carga animada
- [x] Logo horizontal en header móvil
- [x] Dashboard responsivo para móvil y desktop
- [x] Links de contacto clickeables

### Monitoreo TCP
- [x] Verificación de puertos TCP
- [x] Historial de estados
- [x] Alertas por email

### Exportación
- [x] Exportar a Excel
- [x] Exportar a PDF

---

## Tareas Pendientes 📋

### 🟡 P1 - Reportes Programados por Email
- [x] Backend: Modelo y endpoints de configuración
- [x] Frontend: UI de configuración
- [ ] Backend: Implementar envío real con APScheduler

### 🟠 P2 - Dashboards Públicos
- [x] Backend: Modelo PublicDashboard
- [x] Backend: Endpoints básicos
- [ ] Frontend: UI de configuración
- [ ] Frontend: Vista pública compartible

### 🔴 P0 - Refactorización CRÍTICA
- [ ] Dividir App.js (2700+ líneas) en componentes separados
- [ ] Dividir server.py en routers, modelos y servicios

---

## Credenciales de Prueba
| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | Administrador |
| operador | operador123 | Operador |
| tecnico | tecnico123 | Técnico |

---

## Cámaras con Estadísticas
| Nombre | IP | Puerto | Credenciales |
|--------|-----|--------|--------------|
| PRUEBA ESTADISTICAS | 212.64.162.40 | 40002 | admin2:Canarias@2020 |

---

## API de Mobotix MxAnalytics
```
GET /control/stat_export?overview                    → Resumen JSON
GET /control/stat_export?report&export_type=week     → Reporte semanal
GET /control/stat_export?report&start=YYYY-MM-DD&end=YYYY-MM-DD  → Fechas personalizadas
GET /control/stat_export?heatmap&export_format=jpeg  → Mapa de calor
```

---

## Última actualización
Fecha: 2026-01-23
- ✅ Implementada búsqueda por fechas personalizadas
- ✅ Implementados gráficos de barras y circulares (Recharts)
- ✅ Implementada exportación Excel/PDF de vista actual
- ✅ Completado logo horizontal en header móvil
- ✅ Corregida terminología "Entrada/Salida"
