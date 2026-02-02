#!/bin/bash
# Script de actualización para Siempria Network Monitor
# Ejecutar en el servidor de producción

echo "=========================================="
echo "  SIEMPRIA NETWORK MONITOR - ACTUALIZACIÓN"
echo "=========================================="

# Directorio base
BASE_DIR="/home/monitorizacion/Documentos/MONITORIZACION-main"
PRODUCTION_DIR="/opt/siempria-monitor"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Creando backup...${NC}"
BACKUP_DIR="${BASE_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
cp -r "$BASE_DIR" "$BACKUP_DIR"
echo -e "${GREEN}   Backup creado en: $BACKUP_DIR${NC}"

echo -e "${YELLOW}2. Descargando cambios de GitHub...${NC}"
cd "$BASE_DIR"
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}   Error al descargar de GitHub. ¿Guardaste en GitHub primero?${NC}"
    exit 1
fi
echo -e "${GREEN}   Código actualizado${NC}"

echo -e "${YELLOW}3. Actualizando Backend...${NC}"
cd "$BASE_DIR/backend"

# Crear virtualenv si no existe
if [ ! -d "venv" ]; then
    echo "   Creando entorno virtual..."
    python3 -m venv venv
fi

source venv/bin/activate

# Eliminar emergentintegrations del requirements
sed -i '/emergentintegrations/d' requirements.txt

# Instalar dependencias
pip install -r requirements.txt --quiet
echo -e "${GREEN}   Backend actualizado${NC}"
deactivate

echo -e "${YELLOW}4. Actualizando Frontend...${NC}"
cd "$BASE_DIR/frontend"

# Limpiar instalación anterior
rm -rf node_modules package-lock.json

# Instalar dependencias
npm install --legacy-peer-deps --silent
if [ $? -ne 0 ]; then
    echo -e "${RED}   Error al instalar dependencias npm${NC}"
    exit 1
fi

# Compilar
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}   Error al compilar frontend${NC}"
    exit 1
fi
echo -e "${GREEN}   Frontend compilado${NC}"

echo -e "${YELLOW}5. Copiando a producción...${NC}"
if [ -d "$PRODUCTION_DIR/frontend" ]; then
    sudo cp -r build/* "$PRODUCTION_DIR/frontend/"
    echo -e "${GREEN}   Archivos copiados a $PRODUCTION_DIR/frontend/${NC}"
else
    echo -e "${YELLOW}   Directorio $PRODUCTION_DIR/frontend/ no existe. Creándolo...${NC}"
    sudo mkdir -p "$PRODUCTION_DIR/frontend"
    sudo cp -r build/* "$PRODUCTION_DIR/frontend/"
fi

echo -e "${YELLOW}6. Reiniciando servicios...${NC}"
sudo systemctl restart siempria-backend 2>/dev/null || sudo systemctl restart backend 2>/dev/null || echo "   Servicio backend no encontrado con systemctl"
sudo systemctl restart nginx 2>/dev/null || echo "   Nginx no encontrado"

echo ""
echo -e "${GREEN}=========================================="
echo "  ACTUALIZACIÓN COMPLETADA"
echo "==========================================${NC}"
echo ""
echo "Archivos actualizados:"
echo "  - frontend/src/App.js (Login con error visual)"
echo "  - frontend/src/components/panels/InfrastructurePanel.jsx"
echo "  - backend/services/infrastructure_service.py (ESXi SSH, OpenVPN)"
echo "  - Nuevos componentes en frontend/src/components/"
echo ""
echo "Por favor verifica:"
echo "  1. Abrir https://siempriapp.com en el navegador"
echo "  2. Probar login con credenciales incorrectas"
echo "  3. Verificar que aparece mensaje de error rojo"
echo ""
