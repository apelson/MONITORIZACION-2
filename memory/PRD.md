# Siempria Network Monitor - PRD

## Problema Original
Aplicación para monitorear equipos usando IP pública y puerto. Evolucionó a sistema completo de monitoreo de red con énfasis en cámaras Mobotix.

## Usuario Target
- Instaladores y técnicos de CCTV
- Empresas con múltiples ubicaciones internacionales
- Distribuidores Mobotix

## Requisitos Core

### Monitoreo
- ✅ Verificación de puertos TCP cada 5 minutos
- ✅ Historial de estado por dispositivo
- ✅ Alertas por email (Gmail SMTP)

### Estructura Jerárquica
- ✅ Organizaciones (con logo, país, ciudad)
- ✅ Grupos dentro de organizaciones
- ✅ Dispositivos con tipos personalizados

### Gestión de Usuarios
- ✅ Roles: Admin, Manager, Viewer, Operator
- ✅ Vista Operador: solo cámaras online

### Cámaras
- ✅ Preview en vivo via proxy backend
- ✅ Soporte HTTP/HTTPS
- ✅ Campos separados: IP, puerto, usuario, contraseña, ruta
- ✅ Rutas predefinidas: Mobotix, Axis, Hikvision
- ✅ Consulta API Mobotix
- ✅ Placeholder para cámaras offline

### Funcionalidades Adicionales
- ✅ Clonar dispositivo (mantiene config, incrementa puerto)
- ✅ Filtro por país/ubicación
- ✅ Exportación Excel/PDF
- ✅ Pantalla de carga animada (Siempria + Mobotix)
- ✅ Reportes programados por email

## Arquitectura Técnica

### Backend (FastAPI)
- `/app/backend/server.py` - Monolito con todos los endpoints
- MongoDB para persistencia
- APScheduler para tareas programadas
- Proxy de imágenes con auth básica

### Frontend (React)
- `/app/frontend/src/App.js` - Componentes principales
- Shadcn/UI + TailwindCSS
- Hot reload habilitado

### Endpoints Principales
- `/api/auth/login` - Autenticación
- `/api/devices` - CRUD dispositivos
- `/api/organizations` - CRUD organizaciones
- `/api/image-proxy/{device_id}` - Proxy imágenes
- `/api/devices/{id}/mobotix-info` - Info API Mobotix
- `/api/scheduled-reports` - Configuración reportes
- `/api/public/{token}` - Dashboard público

## Credenciales Test
- Admin: admin / admin123
- Operador: operador / operador

## Backlog P1
- [ ] UI completa para dashboards públicos
- [ ] Página pública standalone

## Backlog P2
- [ ] Refactorizar App.js en componentes
- [ ] Tests automatizados
