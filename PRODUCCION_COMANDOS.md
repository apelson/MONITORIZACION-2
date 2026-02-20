# Comandos para Actualizar el Servidor de Producción

## Archivos Modificados en Esta Sesión

### 1. Backend - WebSocket Fix (JWT)
**Archivo:** `/app/backend/routes/websocket.py`
```bash
# En tu servidor de producción:
cd /ruta/a/tu/backend

# Descargar el archivo actualizado
curl -o routes/websocket.py "https://smartpss-import-tool.preview.emergentagent.com/api/download-file?path=websocket.py"

# O editar manualmente - cambiar las líneas del import:
# ANTES:
# import os
# from config import logger
# SECRET_KEY = os.environ.get("JWT_SECRET", "siempria-secret-key-2024")

# DESPUÉS:
# from config import logger, SECRET_KEY, ALGORITHM
```

### 2. Frontend - Fix GridLayout Import
**Archivos:**
- `/app/frontend/src/components/noc/DraggableGrid.jsx`
- `/app/frontend/src/components/panels/NOCDashboard.jsx`

```bash
# Cambiar el import de:
# import { GridLayout } from 'react-grid-layout';

# A:
# import GridLayout from 'react-grid-layout';
```

## Comandos de Descarga Directa

```bash
# === EN TU SERVIDOR DE PRODUCCIÓN ===

# 1. Ir al directorio del backend
cd /root/siempria-monitor/backend

# 2. Hacer backup
cp routes/websocket.py routes/websocket.py.backup

# 3. Descargar archivo actualizado
curl -o routes/websocket.py "https://smartpss-import-tool.preview.emergentagent.com/api/download-file?path=websocket.py"

# 4. Reiniciar el backend
# Si usas systemd:
sudo systemctl restart siempria-backend

# Si usas supervisor:
sudo supervisorctl restart siempria-backend

# Si usas uvicorn directamente:
# Primero mata el proceso existente
pkill -f "uvicorn server:app"
# Luego inicia de nuevo
cd /root/siempria-monitor/backend
source venv/bin/activate
nohup uvicorn server:app --host 0.0.0.0 --port 8001 --reload > /var/log/siempria-backend.log 2>&1 &
```

## Para el Frontend (si tienes build separado)

```bash
# === OPCIÓN 1: Reconstruir el frontend ===
cd /root/siempria-monitor/frontend

# Editar los archivos manualmente
nano src/components/noc/DraggableGrid.jsx
# Cambiar: import { GridLayout } from 'react-grid-layout';
# Por:     import GridLayout from 'react-grid-layout';

nano src/components/panels/NOCDashboard.jsx
# Mismo cambio

# Reconstruir
npm run build

# Copiar build al servidor web
cp -r build/* /var/www/siempria/

# === OPCIÓN 2: Descargar archivos actualizados ===
curl -o src/components/noc/DraggableGrid.jsx "https://smartpss-import-tool.preview.emergentagent.com/api/download-file?path=DraggableGrid.jsx"
curl -o src/components/panels/NOCDashboard.jsx "https://smartpss-import-tool.preview.emergentagent.com/api/download-file?path=NOCDashboard.jsx"

# Luego reconstruir
npm run build
```

## Verificación

```bash
# Verificar que el backend está corriendo
curl http://localhost:8001/api/

# Verificar WebSocket status
curl http://localhost:8001/api/ws/status

# Ver logs del backend
tail -f /var/log/siempria-backend.log

# Probar login y WebSocket
TOKEN=$(curl -s -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
echo "Token: $TOKEN"
```

## Resumen de Cambios

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `routes/websocket.py` | Importar SECRET_KEY desde config | El WebSocket usaba una key diferente, causando que los tokens no se validaran |
| `DraggableGrid.jsx` | `import GridLayout from 'react-grid-layout'` | react-grid-layout v2.x usa default export |
| `NOCDashboard.jsx` | `import GridLayout from 'react-grid-layout'` | Mismo cambio |

## Estado Actual del Sistema

✅ **WebSocket**: Funcionando con autenticación correcta
✅ **Drag & Drop**: Funcionando 
✅ **Filtros**: Funcionando
✅ **Persistencia de Layout**: Funcionando (guardado en MongoDB)
✅ **NOC Dashboard**: Completamente operativo
