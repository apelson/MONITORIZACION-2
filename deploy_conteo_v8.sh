#!/bin/bash
# ============================================================
# SIEMPRIA CONTEO v8 - Script de Despliegue
# ============================================================
# Novedades v8:
#   - Dashboard de Tendencias (graficos Recharts: flujo horario, diario, por marca)
#   - Diseno responsive completo (movil + tablet + escritorio)
#   - Menu hamburguesa para navegacion movil
#   - Componente DealershipRows (ranking de concesionarios)
#   - Logos de marcas en alta resolucion (PNG transparente)
#   - Permisos por marca/isla con chip selectors
#   - NOC 55" optimizado con 3 columnas
#   - Tema corporativo azul (Eco-Tech Precision)
# ============================================================

set -e

CONTEO_DIR="/opt/siempria-conteo"
BACKUP_DIR="/opt/siempria-conteo/backups/$(date +%Y%m%d_%H%M%S)"
SERVICE_NAME="siempria-conteo"

echo "============================================"
echo "  SIEMPRIA CONTEO v8 - Actualizacion"
echo "============================================"
echo ""

# 1. Crear backup
echo "[1/6] Creando backup..."
mkdir -p "$BACKUP_DIR"
if [ -d "$CONTEO_DIR/backend" ]; then
    cp -r "$CONTEO_DIR/backend" "$BACKUP_DIR/backend_backup"
fi
if [ -d "$CONTEO_DIR/frontend/build" ]; then
    cp -r "$CONTEO_DIR/frontend/build" "$BACKUP_DIR/frontend_build_backup"
fi
if [ -d "$CONTEO_DIR/frontend/src" ]; then
    cp -r "$CONTEO_DIR/frontend/src" "$BACKUP_DIR/frontend_src_backup"
fi
echo "   Backup en: $BACKUP_DIR"

# 2. Detener servicio
echo "[2/6] Deteniendo servicio..."
sudo systemctl stop $SERVICE_NAME 2>/dev/null || true
sleep 2

# 3. Actualizar backend
echo "[3/6] Actualizando backend..."
if [ -f backend_v8.zip ]; then
    cd "$CONTEO_DIR"
    unzip -o "$(dirname "$0")/backend_v8.zip" -d .
    echo "   Backend actualizado"
else
    echo "   ADVERTENCIA: backend_v8.zip no encontrado, saltando backend"
fi

# 4. Actualizar frontend
echo "[4/6] Actualizando frontend..."
if [ -f frontend_v8.zip ]; then
    cd "$CONTEO_DIR"
    unzip -o "$(dirname "$0")/frontend_v8.zip" -d .
    echo "   Frontend actualizado (build + source)"
else
    echo "   ADVERTENCIA: frontend_v8.zip no encontrado, saltando frontend"
fi

# 5. Instalar dependencias Python (si hay nuevas)
echo "[5/6] Verificando dependencias Python..."
cd "$CONTEO_DIR/backend"
pip3 install -r requirements.txt --quiet 2>/dev/null || pip install -r requirements.txt --quiet

# 6. Reiniciar servicio
echo "[6/6] Reiniciando servicio..."
sudo systemctl start $SERVICE_NAME
sleep 3

# Verificar
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo ""
    echo "============================================"
    echo "  ACTUALIZACION COMPLETADA CON EXITO"
    echo "============================================"
    echo ""
    echo "  Version: v8.0.0"
    echo "  Servicio: ACTIVO"
    echo "  URL: https://conteo.siempriapp.com"
    echo ""
    echo "  Novedades:"
    echo "    - Dashboard de Tendencias"
    echo "    - Diseno responsive (movil/tablet)"
    echo "    - Ranking de Concesionarios"
    echo "    - Logos alta resolucion"
    echo ""
    echo "  Backup: $BACKUP_DIR"
    echo "============================================"
else
    echo ""
    echo "  ADVERTENCIA: El servicio no arranco correctamente."
    echo "  Revisar logs: sudo journalctl -u $SERVICE_NAME -n 50"
    echo ""
    echo "  Para revertir:"
    echo "    sudo systemctl stop $SERVICE_NAME"
    echo "    cp -r $BACKUP_DIR/backend_backup $CONTEO_DIR/backend"
    echo "    cp -r $BACKUP_DIR/frontend_build_backup $CONTEO_DIR/frontend/build"
    echo "    sudo systemctl start $SERVICE_NAME"
fi
