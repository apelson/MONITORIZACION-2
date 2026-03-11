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

# Create directory structure
echo "[1/6] Creando estructura de directorios..."
mkdir -p $INSTALL_DIR/backend/routes
mkdir -p $INSTALL_DIR/backend/services
mkdir -p $INSTALL_DIR/frontend/build
mkdir -p $INSTALL_DIR/logs

# Extract backend
echo "[2/6] Instalando backend..."
if [ -f /tmp/conteo-backend-v7.tar.gz ]; then
    tar xzf /tmp/conteo-backend-v7.tar.gz -C $INSTALL_DIR/
    echo "  Backend extraido correctamente"
else
    echo "  AVISO: No se encontro conteo-backend-v7.tar.gz en /tmp/"
fi

# Extract frontend
echo "[3/6] Instalando frontend..."
if [ -f /tmp/conteo-frontend-v7.tar.gz ]; then
    tar xzf /tmp/conteo-frontend-v7.tar.gz -C $INSTALL_DIR/
    echo "  Frontend extraido correctamente"
else
    echo "  AVISO: No se encontro conteo-frontend-v7.tar.gz en /tmp/"
fi

# Install Python dependencies
echo "[4/6] Instalando dependencias Python..."
cd $INSTALL_DIR/backend
pip3 install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt -q

# Create .env if not exists
echo "[5/6] Configurando entorno..."
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
echo "[6/6] Configurando servicio systemd..."
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

systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

echo ""
echo "============================================="
echo "  Despliegue completado!"
echo "============================================="
echo ""
echo "  Servicio: $SERVICE_NAME"
echo "  Puerto:   $CONTEO_PORT"
echo "  Dir:      $INSTALL_DIR"
echo ""
echo "  Comandos utiles:"
echo "    sudo systemctl status $SERVICE_NAME"
echo "    sudo systemctl restart $SERVICE_NAME"
echo "    sudo journalctl -u $SERVICE_NAME -f"
echo "    tail -f $INSTALL_DIR/logs/conteo.log"
echo ""
echo "  Verificar: curl http://localhost:$CONTEO_PORT/api/health"
echo ""
