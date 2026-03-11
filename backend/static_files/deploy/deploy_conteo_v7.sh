#!/bin/bash
# =============================================================
# Siempria Conteo v7 - Script de Despliegue
# Domingo Alonso Group - Sistema de Conteo de Visitas
# =============================================================

set -e

INSTALL_DIR="/opt/siempria-conteo"
SERVICE_NAME="siempria-conteo"
CONTEO_PORT=8002

echo ""
echo "============================================="
echo "  Siempria Conteo v7 - Despliegue"
echo "  Domingo Alonso Group"
echo "============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Ejecutar como root (sudo)"
    exit 1
fi

# Stop service first to avoid file locks
echo "[0/7] Parando servicio actual..."
systemctl stop $SERVICE_NAME 2>/dev/null || true
sleep 1

# Create directory structure
echo "[1/7] Creando estructura de directorios..."
mkdir -p $INSTALL_DIR/backend/routes
mkdir -p $INSTALL_DIR/backend/services
mkdir -p $INSTALL_DIR/frontend/build
mkdir -p $INSTALL_DIR/logs

# Extract backend
echo "[2/7] Instalando backend..."
if [ -f /tmp/conteo-backend-v7.tar.gz ]; then
    tar xzf /tmp/conteo-backend-v7.tar.gz -C $INSTALL_DIR/
    echo "  Backend extraido correctamente"
else
    echo "  ERROR: No se encontro conteo-backend-v7.tar.gz en /tmp/"
    exit 1
fi

# Extract frontend
echo "[3/7] Instalando frontend..."
if [ -f /tmp/conteo-frontend-v7.tar.gz ]; then
    tar xzf /tmp/conteo-frontend-v7.tar.gz -C $INSTALL_DIR/
    echo "  Frontend extraido correctamente"
else
    echo "  ERROR: No se encontro conteo-frontend-v7.tar.gz en /tmp/"
    exit 1
fi

# Install Python dependencies
echo "[4/7] Instalando dependencias Python..."
cd $INSTALL_DIR/backend
pip3 install --break-system-packages -r requirements.txt -q 2>/dev/null || \
pip3 install -r requirements.txt -q 2>/dev/null || \
pip install --break-system-packages -r requirements.txt -q 2>/dev/null || \
pip install -r requirements.txt -q 2>/dev/null || \
echo "  AVISO: pip install fallo. Instalar manualmente: pip3 install --break-system-packages -r $INSTALL_DIR/backend/requirements.txt"

# Create .env if not exists
echo "[5/7] Configurando entorno..."
if [ ! -f $INSTALL_DIR/backend/.env ]; then
    cat > $INSTALL_DIR/backend/.env << 'ENVEOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=siempria_conteo
JWT_SECRET=siempria-conteo-jwt-secret-2024-change-me
MAIN_PLATFORM_MONGO_URL=mongodb://localhost:27017
MAIN_PLATFORM_DB_NAME=siempria_monitor
CORS_ORIGINS=*
ENVEOF
    echo "  .env creado (IMPORTANTE: Cambiar JWT_SECRET en produccion)"
else
    echo "  .env existente conservado"
fi

# Create/update systemd service
echo "[6/7] Configurando servicio systemd..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << SERVICEEOF
[Unit]
Description=Siempria Conteo - Sistema de Conteo de Visitas v7
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
EnvironmentFile=$INSTALL_DIR/backend/.env
ExecStart=/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port $CONTEO_PORT
Restart=always
RestartSec=5
StandardOutput=append:$INSTALL_DIR/logs/conteo.log
StandardError=append:$INSTALL_DIR/logs/conteo-error.log

[Install]
WantedBy=multi-user.target
SERVICEEOF

echo "[7/7] Iniciando servicio..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME
sleep 2

# Verify
echo ""
echo "============================================="
HEALTH=$(curl -s http://localhost:$CONTEO_PORT/api/health 2>/dev/null || echo '{"error":"no responde"}')
echo "  Health: $HEALTH"
echo "============================================="
echo ""
echo "  Servicio: $SERVICE_NAME"
echo "  Puerto:   $CONTEO_PORT"
echo "  Dir:      $INSTALL_DIR"
echo ""
echo "  Comandos utiles:"
echo "    sudo systemctl status $SERVICE_NAME"
echo "    sudo systemctl restart $SERVICE_NAME"
echo "    tail -f $INSTALL_DIR/logs/conteo.log"
echo ""
