#!/bin/bash
# ============================================
# Script de Actualización - Layout de Filtros y Record NOC
# Fecha: 16 de Febrero 2026
# ============================================

set -e

echo "================================================"
echo "  ACTUALIZACIÓN: Layout Filtros + Record NOC"
echo "================================================"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Rutas
FRONTEND_SRC="/opt/siempria-monitor/frontend/src"
BACKUP_DIR="/opt/siempria-monitor/backups/$(date +%Y%m%d_%H%M%S)"

# Crear directorio de backup
echo -e "${YELLOW}[1/5] Creando backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp "$FRONTEND_SRC/App.js" "$BACKUP_DIR/"
cp "$FRONTEND_SRC/components/panels/NOCDashboardRefactored.jsx" "$BACKUP_DIR/" 2>/dev/null || true
cp "$FRONTEND_SRC/components/panels/NOCDashboard.jsx" "$BACKUP_DIR/" 2>/dev/null || true
cp "$FRONTEND_SRC/components/common/SystemECG.jsx" "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup creado en: $BACKUP_DIR${NC}"

# ============================================
# CAMBIO 1: Corregir endpoint en NOCDashboardRefactored.jsx
# ============================================
echo -e "${YELLOW}[2/5] Actualizando NOCDashboardRefactored.jsx...${NC}"
if [ -f "$FRONTEND_SRC/components/panels/NOCDashboardRefactored.jsx" ]; then
    sed -i "s|/settings/uptime-record|/uptime-record|g" "$FRONTEND_SRC/components/panels/NOCDashboardRefactored.jsx"
    echo -e "${GREEN}✓ NOCDashboardRefactored.jsx actualizado${NC}"
else
    echo -e "${RED}⚠ NOCDashboardRefactored.jsx no encontrado${NC}"
fi

# ============================================
# CAMBIO 2: Corregir endpoint en NOCDashboard.jsx (si existe)
# ============================================
echo -e "${YELLOW}[3/5] Actualizando NOCDashboard.jsx...${NC}"
if [ -f "$FRONTEND_SRC/components/panels/NOCDashboard.jsx" ]; then
    sed -i "s|/settings/uptime-record|/uptime-record|g" "$FRONTEND_SRC/components/panels/NOCDashboard.jsx"
    echo -e "${GREEN}✓ NOCDashboard.jsx actualizado${NC}"
else
    echo -e "${YELLOW}⚠ NOCDashboard.jsx no encontrado (puede que no exista)${NC}"
fi

# ============================================
# CAMBIO 3: Corregir endpoint en SystemECG.jsx (si tiene la ruta incorrecta)
# ============================================
echo -e "${YELLOW}[4/5] Verificando SystemECG.jsx...${NC}"
if [ -f "$FRONTEND_SRC/components/common/SystemECG.jsx" ]; then
    sed -i "s|/settings/uptime-record|/uptime-record|g" "$FRONTEND_SRC/components/common/SystemECG.jsx"
    echo -e "${GREEN}✓ SystemECG.jsx verificado${NC}"
else
    echo -e "${YELLOW}⚠ SystemECG.jsx no encontrado${NC}"
fi

# ============================================
# BUILD Y DEPLOY
# ============================================
echo -e "${YELLOW}[5/5] Compilando y desplegando frontend...${NC}"
cd /opt/siempria-monitor/frontend

# Build
npm run build

# Deploy
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✓ ACTUALIZACIÓN COMPLETADA${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Cambios aplicados:"
echo "  • Endpoint de uptime-record corregido"
echo "  • El record ahora se cargará correctamente en el NOC"
echo ""
echo "Para verificar:"
echo "  1. Abre el NOC Dashboard"
echo "  2. El RECORD debería mostrar el valor guardado"
echo ""
echo "Si hay problemas, restaura el backup:"
echo "  cp $BACKUP_DIR/* $FRONTEND_SRC/"
echo ""
