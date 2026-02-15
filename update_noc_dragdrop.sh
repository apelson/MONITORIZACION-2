#!/bin/bash
# ============================================
# Script de Actualización NOC Dashboard
# Con Drag & Drop para Siempria Monitor
# ============================================

set -e

# Configuración
EMERGENT_URL="https://dashboard-qa.preview.emergentagent.com"
FRONTEND_DIR="/home/monitorizacion/Documentos/MONITORIZACION-main/frontend/src"
BACKEND_DIR="/home/monitorizacion/Documentos/MONITORIZACION-main/backend"

echo "============================================"
echo "  Actualizando NOC Dashboard con Drag&Drop"
echo "============================================"
echo ""

# Crear directorios necesarios
echo "[1/5] Creando estructura de directorios..."
mkdir -p "$FRONTEND_DIR/components/noc/widgets"
mkdir -p "$FRONTEND_DIR/css"

# Lista de archivos a descargar
declare -a NOC_FILES=(
    "components/noc/index.js"
    "components/noc/NOCHeader.jsx"
    "components/noc/DashboardFilters.jsx"
    "components/noc/DraggableGrid.jsx"
    "components/noc/widgets/index.js"
    "components/noc/widgets/StatsWidget.jsx"
    "components/noc/widgets/UptimeWidget.jsx"
    "components/noc/widgets/SystemMonitorWidget.jsx"
    "components/noc/widgets/CRAWidget.jsx"
    "components/noc/widgets/OrganizationsWidget.jsx"
    "components/noc/widgets/OfflineWidget.jsx"
    "components/noc/widgets/HistoryWidget.jsx"
    "components/noc/widgets/AlertsWidget.jsx"
    "components/panels/NOCDashboardRefactored.jsx"
)

# Descargar archivos del frontend
echo "[2/5] Descargando archivos del NOC Dashboard..."
for file in "${NOC_FILES[@]}"; do
    echo "  -> Descargando: $file"
    curl -s -o "$FRONTEND_DIR/$file" "$EMERGENT_URL/api/download-frontend/$file"
    if [ $? -eq 0 ]; then
        echo "     ✓ OK"
    else
        echo "     ✗ Error"
    fi
done

# Descargar CSS personalizado para el grid
echo "[3/5] Descargando estilos..."
cat > "$FRONTEND_DIR/css/custom-grid.css" << 'CSSEOF'
/* Custom Grid Styles for NOC Dashboard */
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

.react-resizable-handle {
  position: absolute;
  width: 20px;
  height: 20px;
}

.react-resizable-handle-se {
  bottom: 0;
  right: 0;
  cursor: se-resize;
}

.drag-handle {
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}
CSSEOF
echo "     ✓ custom-grid.css creado"

# Descargar websocket.py actualizado
echo "[4/5] Actualizando backend websocket..."
curl -s -o "$BACKEND_DIR/routes/websocket.py" "$EMERGENT_URL/api/download-frontend/routes/websocket.py"
echo "     ✓ websocket.py actualizado"

# Verificar que el import está en App.js
echo "[5/5] Verificando App.js..."
if grep -q "NOCDashboardRefactored" "$FRONTEND_DIR/App.js"; then
    echo "     ✓ App.js ya importa NOCDashboardRefactored"
else
    echo "     ⚠ Necesitas actualizar App.js manualmente:"
    echo ""
    echo "     Busca la línea:"
    echo '       import NOCDashboard from "./components/panels/NOCDashboard";'
    echo ""
    echo "     Y cámbiala por:"
    echo '       import NOCDashboard from "@/components/panels/NOCDashboardRefactored";'
fi

echo ""
echo "============================================"
echo "  ¡Descarga completada!"
echo "============================================"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Editar App.js para usar NOCDashboardRefactored:"
echo "   nano $FRONTEND_DIR/App.js"
echo ""
echo "2. Instalar react-grid-layout si no está:"
echo "   cd $FRONTEND_DIR/../ && npm install react-grid-layout"
echo ""
echo "3. Reconstruir el frontend:"
echo "   cd $FRONTEND_DIR/../ && npm run build"
echo ""
echo "4. Copiar build a producción:"
echo "   cp -r build/* /var/www/tu-sitio/"
echo ""
echo "5. Reiniciar backend:"
echo "   pkill -f uvicorn"
echo "   cd $BACKEND_DIR && source venv/bin/activate"
echo "   nohup uvicorn server:app --host 0.0.0.0 --port 8001 --reload > /var/log/siempria-backend.log 2>&1 &"
echo ""
