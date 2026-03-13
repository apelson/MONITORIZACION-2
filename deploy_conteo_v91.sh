#!/bin/bash
# ============================================================
# SIEMPRIA CONTEO v9.1 - Script de Despliegue
# ============================================================
# Novedades v9.1:
#   - Heatmap automatico: nuevas camaras se configuran solas
#     para generar mapas de calor (heatmap_profile=default)
#   - Al actualizar una camara sin heatmap, se activa automaticamente
#   - Frontend refactorizado: App.jsx modular con componentes
#     separados en src/conteo/ (mejor mantenibilidad)
#   - Boton de salir + tecla ESC en Modo Presentacion
# ============================================================

set -e

CONTEO_DIR="/opt/siempria-conteo"
BACKUP_DIR="/opt/siempria-conteo/backups/$(date +%Y%m%d_%H%M%S)"
SERVICE_NAME="siempria-conteo"

echo "============================================"
echo "  SIEMPRIA CONTEO v9.1 - Heatmap Auto"
echo "============================================"
echo ""

# 1. Crear backup
echo "[1/6] Creando backup..."
mkdir -p "$BACKUP_DIR"
if [ -d "$CONTEO_DIR/backend/routes" ]; then
    cp "$CONTEO_DIR/backend/routes/cameras.py" "$BACKUP_DIR/cameras.py.bak" 2>/dev/null || true
fi
if [ -f "$CONTEO_DIR/frontend/src/App.jsx" ]; then
    cp "$CONTEO_DIR/frontend/src/App.jsx" "$BACKUP_DIR/App.jsx.bak" 2>/dev/null || true
fi
if [ -d "$CONTEO_DIR/frontend/src/conteo" ]; then
    cp -r "$CONTEO_DIR/frontend/src/conteo" "$BACKUP_DIR/conteo_bak" 2>/dev/null || true
fi
if [ -d "$CONTEO_DIR/frontend/build" ]; then
    cp -r "$CONTEO_DIR/frontend/build" "$BACKUP_DIR/frontend_build" 2>/dev/null || true
fi
echo "   Backup en: $BACKUP_DIR"

# 2. Actualizar Backend (solo cameras.py)
echo "[2/6] Actualizando backend..."
cp backend/routes/cameras.py "$CONTEO_DIR/backend/routes/cameras.py"
echo "   cameras.py actualizado (heatmap_profile automatico)"

# 3. Actualizar Frontend
echo "[3/6] Actualizando frontend..."
# Nuevo App.jsx (wrapper fino)
cp frontend/src/App.jsx "$CONTEO_DIR/frontend/src/App.jsx"

# Crear directorio conteo y copiar modulos
mkdir -p "$CONTEO_DIR/frontend/src/conteo/views"
cp frontend/src/conteo/constants.js "$CONTEO_DIR/frontend/src/conteo/"
cp frontend/src/conteo/shared.js "$CONTEO_DIR/frontend/src/conteo/"
cp frontend/src/conteo/LoginPage.js "$CONTEO_DIR/frontend/src/conteo/"
cp frontend/src/conteo/Dashboard.js "$CONTEO_DIR/frontend/src/conteo/"

# Copiar vistas
for view in RealtimeView BrandView CenterView TrendsView CamerasView UsersView NOCView ExecutiveView PresentationMode HeatmapView; do
    cp "frontend/src/conteo/views/${view}.js" "$CONTEO_DIR/frontend/src/conteo/views/"
done
echo "   Frontend modular actualizado (14 archivos)"

# 4. Dependencias (no hay nuevas en v9.1)
echo "[4/6] Dependencias sin cambios"

# 5. Build frontend
echo "[5/6] Compilando frontend..."
cd "$CONTEO_DIR/frontend"
npm run build 2>&1 | tail -5
echo "   Frontend compilado"

# 6. Reiniciar servicio
echo "[6/6] Reiniciando servicio..."
sudo systemctl restart "$SERVICE_NAME" 2>/dev/null || sudo systemctl restart siempria-conteo.service 2>/dev/null || true
sleep 3

# Verificar
if sudo systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo ""
    echo "============================================"
    echo "  DESPLIEGUE v9.1 COMPLETADO"
    echo "============================================"
    echo "  Cambios:"
    echo "  - Heatmap automatico en camaras nuevas/actualizadas"
    echo "  - Frontend modular (mejor mantenibilidad)"
    echo "  - Boton salir + ESC en Modo Presentacion"
    echo "  - Backup en: $BACKUP_DIR"
    echo "============================================"
else
    echo ""
    echo "[!] El servicio puede no haberse reiniciado correctamente."
    echo "    Ejecuta: sudo systemctl status $SERVICE_NAME"
    echo "    Logs: sudo journalctl -u $SERVICE_NAME -n 50"
fi
