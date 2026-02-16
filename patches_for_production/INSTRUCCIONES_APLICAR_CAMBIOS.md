# Instrucciones para Aplicar Cambios en Producción

## Resumen de Cambios

### 1. CRAFloatingButton.jsx
- **Problema:** El botón "Ver panel" no respondía al click
- **Solución:** Se corrigió el evento `onClick` para que funcione siempre (antes solo funcionaba en móvil)

### 2. NOCDashboardRefactored.jsx
- **Problema:** El widget CRA no mostraba estados Armado/Desarmado
- **Solución:** Se añadió fetch paralelo a `/camera-stream/ftp-status-batch` y merge de datos

---

## Paso 1: Backup de archivos actuales

```bash
cd /opt/siempria-monitor/frontend/src/components
sudo cp common/CRAFloatingButton.jsx common/CRAFloatingButton.jsx.backup
sudo cp panels/NOCDashboardRefactored.jsx panels/NOCDashboardRefactored.jsx.backup
```

## Paso 2: Aplicar cambios

### Opción A: Copiar archivos completos (recomendado)
Copia los archivos `CRAFloatingButton.jsx` y `NOCDashboardRefactored.jsx` desde este directorio a tu servidor.

### Opción B: Editar manualmente

#### En CRAFloatingButton.jsx (líneas 44-66):
Reemplazar:
```jsx
  return (
    <div 
      className={`fixed right-0 top-1/3 z-50 transition-all duration-300 ${isExpanded ? 'translate-x-0' : 'translate-x-0'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => {
        if (window.innerWidth < 640) {
          onClick();
        }
      }}
    >
      <div 
        className={`...`}
        onClick={onClick}
      >
```

Por:
```jsx
  return (
    <div 
      className={`fixed right-0 top-1/3 z-50 transition-all duration-300 ${isExpanded ? 'translate-x-0' : 'translate-x-0'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div 
        className={`...`}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
```

#### En NOCDashboardRefactored.jsx (buscar "// Load CRA devices"):
Reemplazar el useEffect completo por el nuevo código que incluye:
1. `Promise.all` para cargar dispositivos CRA y estado FTP en paralelo
2. Merge de `armed` y `alarm_status` en cada dispositivo
3. Refresh automático cada 30 segundos

## Paso 3: Rebuild y Deploy

```bash
cd /opt/siempria-monitor/frontend
rm -rf build
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
echo "REBUILD COMPLETO"
```

## Paso 4: Verificar

1. Abre el navegador y haz **Ctrl+Shift+R** para limpiar cache
2. Verifica:
   - [ ] El botón flotante CRA "Ver panel" abre la sección CRA
   - [ ] El widget CRA en el NOC muestra contadores de Armado/Desarmado
   - [ ] Los colores de las tarjetas reflejan el estado (verde=armado, naranja=desarmado)

## Verificación del Backend

Asegúrate que los routers están registrados en `/opt/siempria-monitor/backend/server.py`:

```python
from routes.ai_analysis import router as ai_router
from routes.sla_reports import router as sla_reports_router

# ... más abajo en el archivo ...
api_router.include_router(ai_router)
api_router.include_router(sla_reports_router)
```

Si no están, añádelos y reinicia el backend:
```bash
sudo systemctl restart siempria-backend.service
```
