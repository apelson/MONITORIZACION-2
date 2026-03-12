#!/bin/bash
# ============================================================
# SIEMPRIA CONTEO v9 - Script de Despliegue
# ============================================================
# Novedades v9 (Business Intelligence Suite):
#   - Vista Ejecutiva mejorada: KPIs, comparativa, objetivos CRUD
#   - Gestion de Objetivos: crear, editar inline, eliminar
#   - Exportacion CSV: filtros por fecha, marca e isla
#   - Comparativa Temporal: semanal y mensual con % cambio
#   - Modo Presentacion: pantalla completa, 4 slides animados,
#     auto-rotacion, tema oscuro profesional, ideal para reuniones
# ============================================================

set -e

CONTEO_DIR="/opt/siempria-conteo"
BACKUP_DIR="/opt/siempria-conteo/backups/$(date +%Y%m%d_%H%M%S)"
SERVICE_NAME="siempria-conteo"

echo "============================================"
echo "  SIEMPRIA CONTEO v9 - Business Intelligence"
echo "============================================"
echo ""

# 1. Crear backup
echo "[1/6] Creando backup..."
mkdir -p "$BACKUP_DIR"
if [ -d "$CONTEO_DIR/backend" ]; then
    cp -r "$CONTEO_DIR/backend" "$BACKUP_DIR/backend" 2>/dev/null || true
fi
if [ -d "$CONTEO_DIR/frontend/src" ]; then
    cp -r "$CONTEO_DIR/frontend/src" "$BACKUP_DIR/frontend_src" 2>/dev/null || true
fi
if [ -d "$CONTEO_DIR/frontend/build" ]; then
    cp -r "$CONTEO_DIR/frontend/build" "$BACKUP_DIR/frontend_build" 2>/dev/null || true
fi
echo "   Backup en: $BACKUP_DIR"

# 2. Actualizar Backend
echo "[2/6] Actualizando backend..."
# Routes
cp backend/routes/analytics.py "$CONTEO_DIR/backend/routes/analytics.py"
cp backend/routes/goals.py "$CONTEO_DIR/backend/routes/goals.py"
cp backend/routes/ranking.py "$CONTEO_DIR/backend/routes/ranking.py"
cp backend/routes/heatmap.py "$CONTEO_DIR/backend/routes/heatmap.py"
cp backend/routes/auth.py "$CONTEO_DIR/backend/routes/auth.py"
cp backend/routes/cameras.py "$CONTEO_DIR/backend/routes/cameras.py"
cp backend/routes/users.py "$CONTEO_DIR/backend/routes/users.py"
# Services
cp backend/services/data_collector.py "$CONTEO_DIR/backend/services/data_collector.py"
cp backend/services/heatmap_service.py "$CONTEO_DIR/backend/services/heatmap_service.py"
cp backend/services/mobotix_service.py "$CONTEO_DIR/backend/services/mobotix_service.py"
cp backend/services/auth_service.py "$CONTEO_DIR/backend/services/auth_service.py"
# Config & Server
cp backend/config.py "$CONTEO_DIR/backend/config.py"
cp backend/server.py "$CONTEO_DIR/backend/server.py"
echo "   Backend actualizado"

# 3. Actualizar Frontend
echo "[3/6] Actualizando frontend..."
cp frontend/src/App.jsx "$CONTEO_DIR/frontend/src/App.jsx"
cp frontend/src/App.css "$CONTEO_DIR/frontend/src/App.css"
echo "   Frontend actualizado"

# 4. Instalar dependencias backend (si falta alguna)
echo "[4/6] Verificando dependencias backend..."
cd "$CONTEO_DIR/backend"
source /opt/siempria-conteo/venv/bin/activate 2>/dev/null || source venv/bin/activate 2>/dev/null || true
pip install -q motor pymongo pyjwt passlib httpx python-multipart 2>/dev/null || true
echo "   Dependencias OK"

# 5. Build frontend
echo "[5/6] Compilando frontend..."
cd "$CONTEO_DIR/frontend"
npm install --silent 2>/dev/null || yarn install --silent 2>/dev/null || true
npm run build 2>&1 | tail -3
echo "   Frontend compilado"

# 6. Reiniciar servicio
echo "[6/6] Reiniciando servicio..."
sudo systemctl restart "$SERVICE_NAME" 2>/dev/null || sudo systemctl restart siempria-conteo.service 2>/dev/null || true
sleep 3

# Verificar
if sudo systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo ""
    echo "============================================"
    echo "  DESPLIEGUE v9 COMPLETADO"
    echo "============================================"
    echo "  Nuevas funcionalidades:"
    echo "  - Vista Ejecutiva: KPIs + Comparativa + Objetivos CRUD"
    echo "  - Exportacion CSV con filtros marca/isla"
    echo "  - Modo Presentacion para reuniones"
    echo "  - Backup en: $BACKUP_DIR"
    echo "============================================"
else
    echo ""
    echo "[!] El servicio puede no haberse reiniciado correctamente."
    echo "    Ejecuta: sudo systemctl status $SERVICE_NAME"
    echo "    Logs: sudo journalctl -u $SERVICE_NAME -n 50"
fi
