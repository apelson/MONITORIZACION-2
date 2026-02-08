#!/bin/bash
# ==============================================================
# SIEMPRIA MONITOR - Script de Actualización a Producción v3.0
# Ejecutar desde: /home/monitorizacion/Documentos/MONITORIZACION-main/
# ==============================================================

set -e  # Exit on error

echo "========================================"
echo "🚀 SIEMPRIA MONITOR - Actualización v3.0"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorios
SOURCE_DIR="/home/monitorizacion/Documentos/MONITORIZACION-main"
PROD_DIR="/opt/siempria-monitor"
BACKUP_DIR="/opt/siempria-monitor-backups"

# Verificar que estamos en el directorio correcto
if [ ! -f "$SOURCE_DIR/backend/server.py" ]; then
    echo -e "${RED}❌ Error: No se encuentra el código fuente en $SOURCE_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 Directorio fuente: $SOURCE_DIR${NC}"
echo -e "${YELLOW}📁 Directorio producción: $PROD_DIR${NC}"
echo ""

# Paso 1: Crear backup
echo -e "${GREEN}[1/7] Creando backup...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
if [ -d "$PROD_DIR" ]; then
    cp -r "$PROD_DIR" "$BACKUP_DIR/backup_$TIMESTAMP"
    echo "    Backup creado: $BACKUP_DIR/backup_$TIMESTAMP"
fi

# Paso 2: Actualizar backend
echo -e "${GREEN}[2/7] Actualizando backend...${NC}"
sudo systemctl stop siempria-backend 2>/dev/null || true
sleep 2

# Copiar archivos backend
sudo mkdir -p "$PROD_DIR/backend"
sudo cp -r "$SOURCE_DIR/backend/"* "$PROD_DIR/backend/"
echo "    ✓ Backend copiado"

# Instalar dependencias Python
cd "$PROD_DIR/backend"
if [ -f "requirements.txt" ]; then
    sudo pip3 install -r requirements.txt --quiet
    echo "    ✓ Dependencias Python instaladas"
fi

# Paso 3: Actualizar frontend
echo -e "${GREEN}[3/7] Actualizando frontend...${NC}"
sudo mkdir -p "$PROD_DIR/frontend"
cd "$SOURCE_DIR/frontend"

# Crear .env para frontend si no existe
if [ ! -f ".env" ]; then
    echo "REACT_APP_BACKEND_URL=https://siempriapp.com" > .env
    echo "    ✓ Archivo .env creado"
fi

# Construir frontend
echo "    Construyendo frontend (puede tardar unos minutos)..."
yarn install --silent 2>/dev/null || npm install --legacy-peer-deps --silent
yarn build 2>/dev/null || npm run build

# Copiar build a producción
sudo rm -rf "$PROD_DIR/frontend/build"
sudo cp -r build "$PROD_DIR/frontend/"
echo "    ✓ Frontend construido y copiado"

# Paso 4: Copiar archivos de sonido
echo -e "${GREEN}[4/7] Copiando archivos de sonido...${NC}"
sudo mkdir -p "$PROD_DIR/frontend/build/sounds"
sudo cp -r public/sounds/* "$PROD_DIR/frontend/build/sounds/" 2>/dev/null || true
echo "    ✓ Archivos de sonido copiados"

# Paso 5: Configurar permisos
echo -e "${GREEN}[5/7] Configurando permisos...${NC}"
sudo chown -R monitorizacion:monitorizacion "$PROD_DIR"
sudo chmod -R 755 "$PROD_DIR"
echo "    ✓ Permisos configurados"

# Paso 6: Reiniciar servicios
echo -e "${GREEN}[6/7] Reiniciando servicios...${NC}"
sudo systemctl start siempria-backend
sleep 3

# Verificar que el backend está corriendo
if sudo systemctl is-active --quiet siempria-backend; then
    echo "    ✓ Backend iniciado correctamente"
else
    echo -e "${RED}    ⚠ Backend no inició correctamente. Verificar logs:${NC}"
    echo "    sudo journalctl -u siempria-backend -n 50"
fi

# Recargar nginx
sudo nginx -t && sudo systemctl reload nginx
echo "    ✓ Nginx recargado"

# Paso 7: Verificación final
echo -e "${GREEN}[7/7] Verificación final...${NC}"
echo ""

# Test backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/system-status 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ] || [ "$BACKEND_STATUS" = "401" ]; then
    echo -e "    ${GREEN}✓ Backend respondiendo (HTTP $BACKEND_STATUS)${NC}"
else
    echo -e "    ${RED}⚠ Backend no responde (HTTP $BACKEND_STATUS)${NC}"
fi

# Test frontend via nginx
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://siempriapp.com 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "    ${GREEN}✓ Frontend accesible (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "    ${YELLOW}⚠ Frontend status (HTTP $FRONTEND_STATUS) - verificar manualmente${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Actualización completada${NC}"
echo "========================================"
echo ""
echo "Cambios en esta versión:"
echo "  • Optimización de consultas CRA (cache de 60s)"
echo "  • Nuevo endpoint combinado /api/cra/dashboard"
echo "  • Componentes extraídos (DeviceFormDialog, GroupFormDialog)"
echo "  • Archivo de sonido para alertas CRA"
echo "  • Fix para DialogDescription (accesibilidad)"
echo ""
echo "🌐 Acceder a: https://siempriapp.com"
echo "📊 Panel CRA mejorado con carga más rápida"
echo ""
