#!/bin/bash
# Deploy Script for WatchTower by Siempria
# Ejecutar desde el directorio raíz del proyecto: /opt/siempria-monitor

set -e

echo "========================================"
echo "  WatchTower by Siempria - Deploy"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}Error: Este script debe ejecutarse desde /opt/siempria-monitor${NC}"
    exit 1
fi

# Backup before deploy
BACKUP_DIR="/opt/siempria-monitor/backups/$(date +%Y%m%d_%H%M%S)"
echo -e "${YELLOW}Creando backup en: $BACKUP_DIR${NC}"
mkdir -p "$BACKUP_DIR"
cp -r frontend/src "$BACKUP_DIR/"
cp -r backend "$BACKUP_DIR/"
echo -e "${GREEN}✓ Backup creado${NC}"
echo ""

# Build frontend
echo -e "${YELLOW}Compilando frontend...${NC}"
cd frontend
yarn build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend compilado${NC}"
else
    echo -e "${RED}✗ Error al compilar frontend${NC}"
    exit 1
fi
cd ..
echo ""

# Restart backend
echo -e "${YELLOW}Reiniciando backend...${NC}"
sudo systemctl restart siempria-backend
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend reiniciado${NC}"
else
    echo -e "${RED}✗ Error al reiniciar backend${NC}"
    exit 1
fi
echo ""

# Check services status
echo -e "${YELLOW}Verificando servicios...${NC}"
sleep 3
if systemctl is-active --quiet siempria-backend; then
    echo -e "${GREEN}✓ Backend activo${NC}"
else
    echo -e "${RED}✗ Backend no está activo${NC}"
    sudo journalctl -u siempria-backend --no-pager -n 20
fi
echo ""

echo "========================================"
echo -e "${GREEN}  ¡Deploy completado!${NC}"
echo "========================================"
echo ""
echo "Backup guardado en: $BACKUP_DIR"
echo ""
