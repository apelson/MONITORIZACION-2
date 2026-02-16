#!/bin/bash
# ============================================================
# SCRIPT COMPLETO DE ACTUALIZACIÓN NOC DASHBOARD CON DRAG&DROP
# Para Siempria Network Monitor
# ============================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración - AJUSTA ESTAS RUTAS SI ES NECESARIO
PROJECT_DIR="/home/monitorizacion/Documentos/MONITORIZACION-main"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
BACKUP_DIR="$PROJECT_DIR/backup_$(date +%Y%m%d_%H%M%S)"
BASE_URL="https://alert-central-deploy.preview.emergentagent.com/api/download-frontend"

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  ACTUALIZACIÓN NOC DASHBOARD CON DRAG & DROP${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""

# Verificar que existe el proyecto
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}ERROR: No se encuentra el directorio del proyecto${NC}"
    echo "Ruta esperada: $PROJECT_DIR"
    exit 1
fi

# ============================================================
# PASO 1: CREAR BACKUP
# ============================================================
echo -e "${YELLOW}[1/7] Creando backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp -r "$FRONTEND_DIR/src/App.js" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$FRONTEND_DIR/src/components/panels" "$BACKUP_DIR/panels_backup" 2>/dev/null || true
cp -r "$BACKEND_DIR/server.py" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$BACKEND_DIR/routes/websocket.py" "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}   ✓ Backup creado en: $BACKUP_DIR${NC}"

# ============================================================
# PASO 2: CREAR ESTRUCTURA DE DIRECTORIOS
# ============================================================
echo -e "${YELLOW}[2/7] Creando estructura de directorios...${NC}"
mkdir -p "$FRONTEND_DIR/src/components/noc/widgets"
mkdir -p "$FRONTEND_DIR/src/css"
echo -e "${GREEN}   ✓ Directorios creados${NC}"

# ============================================================
# PASO 3: DESCARGAR COMPONENTES NOC
# ============================================================
echo -e "${YELLOW}[3/7] Descargando componentes del NOC Dashboard...${NC}"

# Función para descargar con verificación
download_file() {
    local url="$1"
    local dest="$2"
    if curl -s -f -o "$dest" "$url"; then
        echo -e "   ${GREEN}✓${NC} $(basename $dest)"
    else
        echo -e "   ${RED}✗${NC} Error descargando $(basename $dest)"
    fi
}

# NOC Components principales
download_file "$BASE_URL/components/noc/index.js" "$FRONTEND_DIR/src/components/noc/index.js"
download_file "$BASE_URL/components/noc/NOCHeader.jsx" "$FRONTEND_DIR/src/components/noc/NOCHeader.jsx"
download_file "$BASE_URL/components/noc/DashboardFilters.jsx" "$FRONTEND_DIR/src/components/noc/DashboardFilters.jsx"
download_file "$BASE_URL/components/noc/DraggableGrid.jsx" "$FRONTEND_DIR/src/components/noc/DraggableGrid.jsx"

# Widgets
download_file "$BASE_URL/components/noc/widgets/index.js" "$FRONTEND_DIR/src/components/noc/widgets/index.js"
download_file "$BASE_URL/components/noc/widgets/StatsWidget.jsx" "$FRONTEND_DIR/src/components/noc/widgets/StatsWidget.jsx"
download_file "$BASE_URL/components/noc/widgets/UptimeWidget.jsx" "$FRONTEND_DIR/src/components/noc/widgets/UptimeWidget.jsx"
download_file "$BASE_URL/components/noc/widgets/SystemMonitorWidget.jsx" "$FRONTEND_DIR/src/components/noc/widgets/SystemMonitorWidget.jsx"
download_file "$BASE_URL/components/noc/widgets/CRAWidget.jsx" "$FRONTEND_DIR/src/components/noc/widgets/CRAWidget.jsx"
download_file "$BASE_URL/components/noc/widgets/OrganizationsWidget.jsx" "$FRONTEND_DIR/src/components/noc/widgets/OrganizationsWidget.jsx"
download_file "$BASE_URL/components/noc/widgets/OfflineWidget.jsx" "$FRONTEND_DIR/src/components/noc/widgets/OfflineWidget.jsx"
download_file "$BASE_URL/components/noc/widgets/HistoryWidget.jsx" "$FRONTEND_DIR/src/components/noc/widgets/HistoryWidget.jsx"
download_file "$BASE_URL/components/noc/widgets/AlertsWidget.jsx" "$FRONTEND_DIR/src/components/noc/widgets/AlertsWidget.jsx"

# Dashboard Refactorizado
download_file "$BASE_URL/components/panels/NOCDashboardRefactored.jsx" "$FRONTEND_DIR/src/components/panels/NOCDashboardRefactored.jsx"

# ============================================================
# PASO 4: CREAR CSS PARA GRID
# ============================================================
echo -e "${YELLOW}[4/7] Creando estilos del grid...${NC}"
cat > "$FRONTEND_DIR/src/css/custom-grid.css" << 'CSSEOF'
/* Custom Grid Styles for NOC Dashboard Drag & Drop */
.react-grid-layout {
  position: relative;
}
.react-grid-item {
  transition: all 200ms ease;
  transition-property: left, top;
}
.react-grid-item.cssTransforms {
  transition-property: transform;
}
.react-grid-item.resizing {
  z-index: 1;
  will-change: width, height;
}
.react-grid-item.react-draggable-dragging {
  transition: none;
  z-index: 3;
  will-change: transform;
}
.react-grid-item.dropping {
  visibility: hidden;
}
.react-grid-item.react-grid-placeholder {
  background: rgba(0, 255, 255, 0.2);
  border: 2px dashed #00ffff;
  border-radius: 8px;
  opacity: 0.5;
  transition-duration: 100ms;
  z-index: 2;
}
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}
CSSEOF
echo -e "${GREEN}   ✓ custom-grid.css creado${NC}"

# ============================================================
# PASO 5: ACTUALIZAR APP.JS
# ============================================================
echo -e "${YELLOW}[5/7] Actualizando App.js...${NC}"

# Verificar si ya tiene el import correcto
if grep -q "NOCDashboardRefactored" "$FRONTEND_DIR/src/App.js"; then
    echo -e "${GREEN}   ✓ App.js ya usa NOCDashboardRefactored${NC}"
else
    # Hacer el reemplazo
    # Buscar diferentes patrones de import
    sed -i 's|import NOCDashboard from "./components/panels/NOCDashboard"|import NOCDashboard from "./components/panels/NOCDashboardRefactored"|g' "$FRONTEND_DIR/src/App.js"
    sed -i 's|import NOCDashboard from "@/components/panels/NOCDashboard"|import NOCDashboard from "@/components/panels/NOCDashboardRefactored"|g' "$FRONTEND_DIR/src/App.js"
    sed -i "s|import NOCDashboard from '../components/panels/NOCDashboard'|import NOCDashboard from '../components/panels/NOCDashboardRefactored'|g" "$FRONTEND_DIR/src/App.js"
    
    # Verificar si se hizo el cambio
    if grep -q "NOCDashboardRefactored" "$FRONTEND_DIR/src/App.js"; then
        echo -e "${GREEN}   ✓ App.js actualizado correctamente${NC}"
    else
        echo -e "${YELLOW}   ⚠ No se encontró el import. Añadiendo manualmente...${NC}"
        # Si no existe ningún import de NOCDashboard, añadirlo
        if ! grep -q "NOCDashboard" "$FRONTEND_DIR/src/App.js"; then
            sed -i '1a import NOCDashboard from "./components/panels/NOCDashboardRefactored";' "$FRONTEND_DIR/src/App.js"
        fi
    fi
fi

# Añadir import del CSS si no existe
if ! grep -q "custom-grid.css" "$FRONTEND_DIR/src/App.js"; then
    sed -i '/import.*App.css/a import "./css/custom-grid.css";' "$FRONTEND_DIR/src/App.js" 2>/dev/null || true
fi

# ============================================================
# PASO 6: ACTUALIZAR BACKEND
# ============================================================
echo -e "${YELLOW}[6/7] Actualizando backend...${NC}"

# Crear websocket.py actualizado
cat > "$BACKEND_DIR/routes/websocket.py" << 'PYEOF'
"""
WebSocket routes for real-time notifications
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import jwt

from config import logger, SECRET_KEY, ALGORITHM
from services.websocket_service import websocket_manager

router = APIRouter(prefix="/ws", tags=["websocket"])

def get_user_from_token(token: str) -> Optional[str]:
    """Extract user ID from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub") or payload.get("user_id") or "authenticated"
    except Exception as e:
        logger.warning(f"[WS] Invalid token: {e}")
        return None

@router.websocket("/alerts")
async def websocket_alerts(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time alert notifications
    
    Connect with: ws://host/api/ws/alerts?token=<jwt_token>
    """
    user_id = "anonymous"
    if token:
        user_id = get_user_from_token(token) or "anonymous"
    
    await websocket_manager.connect(websocket, user_id)
    
    try:
        while True:
            try:
                data = await websocket.receive_json()
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif data.get("type") == "subscribe":
                    pass
            except Exception as e:
                if "disconnect" in str(e).lower():
                    break
                logger.debug(f"[WS] Receive error (may be normal): {e}")
                
    except WebSocketDisconnect:
        logger.info(f"[WS] Client {user_id} disconnected normally")
    except Exception as e:
        logger.error(f"[WS] Unexpected error: {e}")
    finally:
        await websocket_manager.disconnect(websocket, user_id)

@router.get("/status")
async def websocket_status():
    """Get WebSocket server status"""
    return {
        "active_connections": websocket_manager.get_connection_count(),
        "status": "running"
    }
PYEOF
echo -e "${GREEN}   ✓ websocket.py actualizado${NC}"

# Verificar si websocket_router está en server.py
if ! grep -q "websocket_router" "$BACKEND_DIR/server.py"; then
    echo "   Añadiendo websocket router a server.py..."
    
    # Encontrar la última línea de imports de routes y añadir después
    LAST_IMPORT_LINE=$(grep -n "from routes\." "$BACKEND_DIR/server.py" | tail -1 | cut -d: -f1)
    if [ ! -z "$LAST_IMPORT_LINE" ]; then
        sed -i "${LAST_IMPORT_LINE}a from routes.websocket import router as websocket_router" "$BACKEND_DIR/server.py"
    fi
    
    # Encontrar la última línea de include_router y añadir después
    LAST_INCLUDE_LINE=$(grep -n "api_router.include_router" "$BACKEND_DIR/server.py" | tail -1 | cut -d: -f1)
    if [ ! -z "$LAST_INCLUDE_LINE" ]; then
        sed -i "${LAST_INCLUDE_LINE}a api_router.include_router(websocket_router)" "$BACKEND_DIR/server.py"
    fi
    
    echo -e "${GREEN}   ✓ websocket router añadido a server.py${NC}"
else
    echo -e "${GREEN}   ✓ websocket router ya existe en server.py${NC}"
fi

# Verificar .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "   Creando archivo .env..."
    cat > "$BACKEND_DIR/.env" << 'ENVEOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=siempria_monitor
SECRET_KEY=siempria-network-monitor-secret-key-2024
ENVEOF
    echo -e "${GREEN}   ✓ .env creado${NC}"
fi

# ============================================================
# PASO 7: INSTALAR DEPENDENCIAS Y RECONSTRUIR
# ============================================================
echo -e "${YELLOW}[7/7] Instalando dependencias y reconstruyendo...${NC}"

cd "$FRONTEND_DIR"

# Instalar react-grid-layout si no está
if ! grep -q "react-grid-layout" package.json; then
    echo "   Instalando react-grid-layout..."
    npm install react-grid-layout --save
fi

# Reconstruir
echo "   Reconstruyendo frontend (esto puede tardar unos minutos)..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ Frontend reconstruido correctamente${NC}"
else
    echo -e "${RED}   ✗ Error al reconstruir. Revisa los errores arriba.${NC}"
    exit 1
fi

# ============================================================
# RESUMEN FINAL
# ============================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  ¡ACTUALIZACIÓN COMPLETADA!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "Backup guardado en: ${YELLOW}$BACKUP_DIR${NC}"
echo ""
echo -e "${YELLOW}PASOS FINALES (ejecuta manualmente):${NC}"
echo ""
echo "1. Copiar build a producción (si usas servidor web separado):"
echo "   cp -r $FRONTEND_DIR/build/* /var/www/siempria/"
echo ""
echo "2. Reiniciar backend:"
echo "   cd $BACKEND_DIR"
echo "   pkill -f 'uvicorn server:app'"
echo "   source venv/bin/activate"
echo "   nohup uvicorn server:app --host 0.0.0.0 --port 8001 --reload > /var/log/siempria-backend.log 2>&1 &"
echo ""
echo "3. Verificar que funciona:"
echo "   curl http://localhost:8001/api/ws/status"
echo ""
echo -e "${GREEN}¡Listo! Refresca la página del navegador para ver los cambios.${NC}"
