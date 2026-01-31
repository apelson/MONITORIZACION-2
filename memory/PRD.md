# Siempria Network Monitor - Product Requirements Document

## Información General
- **Nombre**: Siempria Network Monitor / SiempriaApp
- **Tipo**: Aplicación de monitorización de red y cámaras con modelo SaaS multi-tenant
- **Dominio**: https://siempriapp.com
- **Stack**: React + FastAPI + MongoDB
- **Fecha última actualización**: 31 Enero 2026

## Changelog Reciente

### 31 Enero 2026
- ✅ **CRÍTICO ARREGLADO**: Bug de pantalla blanca después del login
  - Causa: Componentes usando `t()` sin declarar `useTranslation()` hook
  - Componentes arreglados: OrganizationFormDialog, GroupFormDialog, UserFormDialog, DeviceTypeFormDialog, DeleteConfirmDialog, AlertsPanel, PublicDashboardConfig, SettingsPanel, IncidentsPanel
- ✅ **Internacionalización (i18n)**: Sistema COMPLETO
  - 7 idiomas soportados: ES, EN, DE, IT, FR, RU, ZH
  - 300+ claves de traducción por idioma
  - Cobertura: login, dashboard, tabs, botones, diálogos, formularios, estados, errores
  - Selector de idioma con banderas SVG

### Pendiente
- [ ] Arreglar favicon y iconos PWA (404 en producción)
- [ ] Refactorizar App.js (5000+ líneas) en componentes más pequeños

## URLs de Acceso
- **Landing SaaS**: https://siempriapp.com/saas
- **Panel Cliente**: https://siempriapp.com/saas (después de login)
- **Super Admin**: https://siempriapp.com/admin
- **App Original (Siempria interno)**: https://siempriapp.com/

## Arquitectura Multi-tenant

### Base de Datos
```
siempriapp_master         → Gestión de tenants, usuarios, suscripciones
├── tenants               → Empresas/clientes registrados
├── users                 → Usuarios (vinculados a tenant_id)
└── payment_transactions  → Historial de pagos

tenant_{slug}             → Base de datos por cliente
├── devices               → Dispositivos del cliente
├── groups                → Grupos de dispositivos
├── organizations         → Organizaciones
├── alerts                → Alertas
├── status_history        → Historial de estados
└── device_types          → Tipos de dispositivos
```

### Planes de Suscripción

| Plan | Dispositivos | Verificaciones/día | Historial | Precio | Características |
|------|--------------|-------------------|-----------|--------|-----------------|
| Free | 4 | 24 (1/hora) | 7 días | 0€ | Básico |
| Básico | 50 | 1440 (1/min) | 30 días | 29€/mes | + Alertas email, exportar |
| Pro | 200 | Ilimitado | 90 días | 79€/mes | + API, dashboard público, WhatsApp |
| Enterprise | ∞ | Ilimitado | 1 año | 299€/mes | Todo + Soporte prioritario |

## Endpoints API SaaS

### Autenticación
- `POST /api/saas/register` - Registrar nueva empresa
- `POST /api/saas/login` - Iniciar sesión
- `GET /api/saas/me` - Obtener info usuario/tenant actual
- `POST /api/saas/logout` - Cerrar sesión

### Dispositivos (por tenant)
- `GET /api/saas/devices` - Listar dispositivos
- `POST /api/saas/devices` - Crear dispositivo (con límite por plan)
- `GET /api/saas/devices/{id}` - Obtener dispositivo
- `PUT /api/saas/devices/{id}` - Actualizar dispositivo
- `DELETE /api/saas/devices/{id}` - Eliminar dispositivo
- `POST /api/saas/devices/{id}/check` - Verificar estado (con límite por plan)

### Billing (Stripe)
- `GET /api/saas/billing/plans` - Obtener planes disponibles
- `POST /api/saas/billing/checkout` - Crear sesión de checkout
- `GET /api/saas/billing/checkout/status/{session_id}` - Verificar estado de pago
- `GET /api/saas/billing/transactions` - Historial de transacciones
- `POST /api/webhook/stripe` - Webhook de Stripe

### Super Admin
- `GET /api/saas/admin/tenants` - Listar todos los clientes
- `GET /api/saas/admin/tenants/{id}` - Detalle de cliente
- `PATCH /api/saas/admin/tenants/{id}` - Actualizar cliente (plan, estado)
- `POST /api/saas/admin/tenants/{id}/suspend` - Suspender cuenta
- `POST /api/saas/admin/tenants/{id}/activate` - Activar cuenta
- `GET /api/saas/admin/stats` - Estadísticas de la plataforma
- `DELETE /api/saas/admin/tenants/{id}?confirm=true` - Eliminar tenant

## Credenciales de Prueba

### Super Admin
- Email: `superadmin@siempriapp.com`
- Password: `SuperAdmin2024!`

### Tenant Demo
- Email: `demo@empresa.com`
- Password: `demo123`

## Despliegue en Producción

### Archivos SaaS a descargar
```bash
cd /opt/siempria-monitor

# Backend
mkdir -p backend/models backend/routes backend/services
curl -o backend/models/tenant.py "https://siempriapp.com/saas_files/tenant_model.py.txt"
curl -o backend/services/tenant_service.py "https://siempriapp.com/saas_files/tenant_service.py.txt"
curl -o backend/routes/tenant_auth.py "https://siempriapp.com/saas_files/tenant_auth.py.txt"
curl -o backend/routes/tenant_devices.py "https://siempriapp.com/saas_files/tenant_devices.py.txt"
curl -o backend/routes/superadmin.py "https://siempriapp.com/saas_files/superadmin.py.txt"
curl -o backend/routes/billing.py "https://siempriapp.com/saas_files/billing.py.txt"
curl -o backend/server.py "https://siempriapp.com/saas_files/server.py.txt"

# Frontend
curl -o frontend/src/SaaSApp.jsx "https://siempriapp.com/saas_files/SaaSApp.jsx.txt"
curl -o frontend/src/SuperAdminPanel.jsx "https://siempriapp.com/saas_files/SuperAdminPanel.jsx.txt"
curl -o frontend/src/index.js "https://siempriapp.com/saas_files/index.js.txt"

# Instalar dependencias
cd backend && pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
cd ../frontend && yarn build

# Reiniciar servicios
sudo systemctl restart siempria-backend
sudo systemctl reload nginx
```

## Lo que está Implementado ✅

### Sistema Original (Single-tenant)
- [x] Autenticación JWT con roles (admin, manager, technician, operator)
- [x] CRUD de dispositivos, grupos, organizaciones
- [x] Monitorización automática con ping
- [x] Alertas por email configurables
- [x] Estadísticas y reportes
- [x] Preview de cámaras en tiempo real
- [x] Panel de seguridad (IP blocking)
- [x] PWA instalable
- [x] Dominio siempriapp.com con SSL

### Sistema SaaS Multi-tenant
- [x] Landing page profesional
- [x] Registro de empresas (auto-creación de DB)
- [x] Login con detección automática de tenant
- [x] Dashboard de cliente con límites de plan
- [x] Sistema de planes (Free, Básico, Pro, Enterprise)
- [x] Límites por plan (dispositivos, verificaciones)
- [x] Panel Super Admin
- [x] Integración Stripe (checkout sessions)
- [x] Modal de upgrade con pasarela de pago

## Pendiente / Backlog 📋

### P0 - Crítico
- [ ] Refactorizar App.js monolítico (5000+ líneas)
- [ ] Configurar claves Stripe de producción
- [ ] Crear usuario super_admin en producción

### P1 - Alto
- [ ] Subdominios por cliente (cliente.siempriapp.com)
- [ ] Suscripciones recurrentes con Stripe (webhooks completos)
- [ ] Alertas por WhatsApp
- [ ] Dashboard público por tenant

### P2 - Medio
- [ ] Portal de facturación para clientes
- [ ] Exportación de datos (CSV, PDF)
- [ ] API pública con tokens
- [ ] White-labeling (logo/colores personalizados)

### P3 - Bajo
- [ ] App móvil nativa
- [ ] Integración con Dahua P2P
- [ ] Análisis avanzado con Mobotix

## Arquitectura de Archivos

```
/opt/siempria-monitor/
├── backend/
│   ├── server.py           # Main FastAPI server
│   ├── config.py           # Database config + cache
│   ├── models/
│   │   └── tenant.py       # SaaS models (plans, limits)
│   ├── routes/
│   │   ├── auth.py         # Original auth
│   │   ├── tenant_auth.py  # SaaS auth
│   │   ├── tenant_devices.py
│   │   ├── superadmin.py
│   │   ├── billing.py      # Stripe integration
│   │   └── ...
│   └── services/
│       ├── tenant_service.py  # Multi-tenant logic
│       └── ...
├── frontend/
│   └── src/
│       ├── App.js          # Original app
│       ├── SaaSApp.jsx     # SaaS landing + dashboard
│       ├── SuperAdminPanel.jsx
│       └── index.js        # Router
└── .env files
```

## Notas Importantes

1. **HTTPS obligatorio** para PWA y Stripe
2. **Hairpin NAT** necesario para acceso interno con dominio
3. **emergentintegrations** para Stripe (pip install con URL especial)
4. **Cache de configuración** en backend (5 min TTL)
5. **Índices MongoDB** críticos para rendimiento con +300 dispositivos
