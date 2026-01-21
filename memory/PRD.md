# Siempria Network Monitor - Product Requirements Document

## Descripción del Producto
Aplicación de monitoreo de red para equipos con IPs públicas, desarrollada para Siempria (distribuidor autorizado de Mobotix).

## Stack Tecnológico
- **Backend:** FastAPI + Python + Motor (MongoDB async)
- **Frontend:** React + TailwindCSS + shadcn/ui
- **Base de Datos:** MongoDB
- **Servidor:** Nginx (proxy reverso)

---

## Características Implementadas ✅

### Sistema de Usuarios y Autenticación
- [x] Login/Logout con JWT
- [x] Roles: Admin, Manager, Viewer, Operator
- [x] Vista restringida para Operadores (solo cámaras en vivo)

### Estructura Organizacional
- [x] Organizaciones con logos, país y ciudad
- [x] Grupos dentro de organizaciones
- [x] Filtro de dispositivos por país

### Gestión de Dispositivos
- [x] Tipos: Camera, NAS, Switch, Router, Server, Other
- [x] Campos: IP, Puerto, Protocolo (HTTP/HTTPS), Credenciales
- [x] Campos personalizados: Marca, Modelo, Ubicación, Notas
- [x] Clonación de dispositivos
- [x] Auto-llenado de rutas para cámaras (Mobotix, Hikvision, etc.)

### Monitoreo TCP
- [x] Verificación de puertos TCP
- [x] Historial de estados
- [x] Intervalos configurables

### Preview de Cámaras
- [x] Proxy backend para autenticación HTTP básica
- [x] Soporte para contraseñas con caracteres especiales (@, #, etc.)
- [x] Botón para abrir interfaz web de la cámara
- [x] Información adicional de cámaras Mobotix

### Alertas por Email
- [x] Configuración SMTP Gmail
- [x] Alertas por cambio de estado (online/offline)

### UI/UX
- [x] Pantalla de carga animada (logos Siempria + Mobotix)
- [x] Iconos personalizados por tipo de dispositivo
- [x] Dashboard responsivo

### Exportación
- [x] Exportar a Excel
- [x] Exportar a PDF

### Despliegue
- [x] Guía de instalación para Ubuntu 24.04
- [x] Script automatizado de instalación

---

## En Progreso 🔄

### Reportes Programados por Email (P1)
- [x] Backend: Modelo y endpoints de configuración
- [x] Frontend: UI de configuración
- [ ] Backend: Implementar envío real con APScheduler
- [ ] Testing del contenido del reporte

### Dashboards Públicos (P2)
- [x] Backend: Modelo PublicDashboard
- [x] Backend: Endpoints básicos
- [ ] Frontend: UI de configuración
- [ ] Frontend: Vista pública compartible

---

## Backlog / Futuro 📋

### P0 - Crítico
- [ ] Refactorizar App.js (1500+ líneas) en componentes separados
- [ ] Refactorizar server.py en routers/modelos/servicios

### P1 - Importante
- [ ] Cambio de contraseña de usuario
- [ ] Recuperación de contraseña

### P2 - Mejoras
- [ ] Gráficos de uptime histórico
- [ ] Notificaciones push en navegador
- [ ] Modo oscuro

---

## Limitaciones Conocidas
- Badge "Made with Emergent" no puede eliminarse (restricción de plataforma)

---

## Credenciales de Prueba
- **Admin:** admin / admin
- **Operador:** operador / operador

---

## Última Actualización
Diciembre 2025 - Guía de instalación revisada y corregida
