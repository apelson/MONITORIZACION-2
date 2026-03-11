#!/bin/bash
# ================================================================
# SCRIPT DE DESPLIEGUE - Siempria Conteo
# Ejecutar desde el directorio siempria-conteo/
# ================================================================
set -e

echo "=========================================="
echo "  Despliegue Siempria Conteo"
echo "=========================================="

# Variables
CONTEO_DIR="/opt/siempria-conteo"
BACKUP_DIR="/opt/siempria-conteo-backup-$(date +%Y%m%d_%H%M%S)"

# 1. Backup actual
if [ -d "$CONTEO_DIR" ]; then
    echo "[1/6] Creando backup..."
    sudo cp -r "$CONTEO_DIR" "$BACKUP_DIR"
    echo "  Backup en: $BACKUP_DIR"
else
    echo "[1/6] No hay instalacion anterior. Creando directorio..."
    sudo mkdir -p "$CONTEO_DIR"
fi

# 2. Copiar backend
echo "[2/6] Desplegando backend..."
sudo mkdir -p "$CONTEO_DIR/backend/routes" "$CONTEO_DIR/backend/services"
sudo cp backend/config.py "$CONTEO_DIR/backend/"
sudo cp backend/server.py "$CONTEO_DIR/backend/"
sudo cp backend/requirements.txt "$CONTEO_DIR/backend/"
sudo cp backend/routes/*.py "$CONTEO_DIR/backend/routes/"
sudo cp backend/services/*.py "$CONTEO_DIR/backend/services/"

# 3. Instalar dependencias backend
echo "[3/6] Instalando dependencias backend..."
cd "$CONTEO_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

# 4. Copiar y construir frontend
echo "[4/6] Desplegando frontend..."
sudo cp -r /tmp/siempria-conteo-deploy/frontend/src "$CONTEO_DIR/frontend/"
sudo cp -r /tmp/siempria-conteo-deploy/frontend/public "$CONTEO_DIR/frontend/" 2>/dev/null || true
sudo cp /tmp/siempria-conteo-deploy/frontend/index.html "$CONTEO_DIR/frontend/"
sudo cp /tmp/siempria-conteo-deploy/frontend/vite.config.js "$CONTEO_DIR/frontend/"
sudo cp /tmp/siempria-conteo-deploy/frontend/package.json "$CONTEO_DIR/frontend/"

echo "[5/6] Construyendo frontend..."
cd "$CONTEO_DIR/frontend"
npm install --quiet
npm run build

# 5. Reiniciar servicio
echo "[6/6] Reiniciando servicio..."
sudo systemctl restart siempria-conteo.service
sleep 2
sudo systemctl status siempria-conteo.service --no-pager

echo ""
echo "=========================================="
echo "  Despliegue completado!"
echo "  URL: https://conteo.siempriapp.com"
echo "  Credenciales: admin / Conteo2024!"
echo "=========================================="
