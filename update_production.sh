#!/bin/bash
# ================================================================
#  SIEMPRIA NETWORK MONITOR - SCRIPT DE ACTUALIZACIÓN PRODUCCIÓN
#  Versión: 2.0 - Febrero 2026
# ================================================================
# IMPORTANTE: Ejecutar este script en el servidor de producción
# ANTES de ejecutar: Guarda los cambios en GitHub usando el botón 
#                    "Save to GitHub" en Emergent
# ================================================================

set -e  # Salir si hay error

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuración
BASE_DIR="/home/monitorizacion/Documentos/MONITORIZACION-main"
PRODUCTION_DIR="/opt/siempria-monitor"
DOMAIN="siempriapp.com"
API_URL="https://siempriapp.com"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗"
echo -e "║     SIEMPRIA NETWORK MONITOR - ACTUALIZACIÓN v2.0         ║"
echo -e "╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "$BASE_DIR" ]; then
    echo -e "${RED}ERROR: No se encuentra el directorio $BASE_DIR${NC}"
    echo "Verifica que la ruta sea correcta."
    exit 1
fi

# ============ PASO 1: BACKUP ============
echo -e "${YELLOW}[1/7] Creando backup de seguridad...${NC}"
BACKUP_DIR="${BASE_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
cp -r "$BASE_DIR" "$BACKUP_DIR" 2>/dev/null || {
    echo -e "${YELLOW}   Aviso: No se pudo crear backup completo${NC}"
}
echo -e "${GREEN}   ✓ Backup creado en: $BACKUP_DIR${NC}"

# ============ PASO 2: DESCARGAR CÓDIGO ============
echo -e "${YELLOW}[2/7] Descargando cambios de GitHub...${NC}"
cd "$BASE_DIR"

# Descartar cambios locales y obtener la última versión
git fetch origin main
git reset --hard origin/main

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: No se pudo descargar de GitHub.${NC}"
    echo "¿Guardaste los cambios con 'Save to GitHub' en Emergent?"
    exit 1
fi
echo -e "${GREEN}   ✓ Código actualizado desde GitHub${NC}"

# ============ PASO 3: BACKEND DEPENDENCIES ============
echo -e "${YELLOW}[3/7] Actualizando dependencias del Backend...${NC}"
cd "$BASE_DIR/backend"

# Crear virtualenv si no existe
if [ ! -d "venv" ]; then
    echo "   Creando entorno virtual Python..."
    python3 -m venv venv
fi

source venv/bin/activate

# Eliminar emergentintegrations (solo para desarrollo)
sed -i '/emergentintegrations/d' requirements.txt 2>/dev/null || true

# Instalar dependencias incluyendo paramiko para ESXi SSH
pip install --upgrade pip -q
pip install -r requirements.txt -q
pip install paramiko -q  # Necesario para SSH ESXi

echo -e "${GREEN}   ✓ Dependencias Python instaladas${NC}"
deactivate

# ============ PASO 4: CREAR .ENV FRONTEND ============
echo -e "${YELLOW}[4/7] Configurando variables de entorno del Frontend...${NC}"
cd "$BASE_DIR/frontend"

# ¡CRÍTICO! Crear el archivo .env con la URL correcta
cat > .env << EOF
REACT_APP_BACKEND_URL=${API_URL}
GENERATE_SOURCEMAP=false
EOF

echo -e "${GREEN}   ✓ Archivo .env creado con REACT_APP_BACKEND_URL=${API_URL}${NC}"

# ============ PASO 5: COMPILAR FRONTEND ============
echo -e "${YELLOW}[5/7] Compilando Frontend (puede tardar 2-3 minutos)...${NC}"

# Limpiar instalación anterior para evitar conflictos
rm -rf node_modules package-lock.json build 2>/dev/null || true

# Instalar dependencias con npm
npm install --legacy-peer-deps 2>&1 | grep -E "(added|removed|up to date|ERR)" || true

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}   Intentando con yarn...${NC}"
    yarn install 2>&1 | grep -E "(success|error)" || true
fi

# Compilar usando craco (definido en package.json)
npm run build 2>&1 | tail -5

if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
    echo -e "${RED}ERROR: La compilación falló. No se encontró build/index.html${NC}"
    exit 1
fi

echo -e "${GREEN}   ✓ Frontend compilado exitosamente${NC}"

# ============ PASO 6: COPIAR A PRODUCCIÓN ============
echo -e "${YELLOW}[6/7] Copiando archivos a producción...${NC}"

# Frontend
sudo mkdir -p "$PRODUCTION_DIR/frontend"
sudo rm -rf "$PRODUCTION_DIR/frontend"/*
sudo cp -r build/* "$PRODUCTION_DIR/frontend/"
echo -e "${GREEN}   ✓ Frontend copiado a $PRODUCTION_DIR/frontend/${NC}"

# Backend
sudo mkdir -p "$PRODUCTION_DIR/backend"
sudo cp -r "$BASE_DIR/backend"/* "$PRODUCTION_DIR/backend/"
echo -e "${GREEN}   ✓ Backend copiado a $PRODUCTION_DIR/backend/${NC}"

# ============ PASO 7: REINICIAR SERVICIOS ============
echo -e "${YELLOW}[7/7] Reiniciando servicios...${NC}"

# Reiniciar backend
if systemctl is-active --quiet siempria-backend; then
    sudo systemctl restart siempria-backend
    echo -e "${GREEN}   ✓ siempria-backend reiniciado${NC}"
elif systemctl is-active --quiet backend; then
    sudo systemctl restart backend
    echo -e "${GREEN}   ✓ backend reiniciado${NC}"
else
    echo -e "${YELLOW}   ! Servicio backend no encontrado en systemctl${NC}"
fi

# Reiniciar nginx
if systemctl is-active --quiet nginx; then
    sudo systemctl restart nginx
    echo -e "${GREEN}   ✓ nginx reiniciado${NC}"
else
    echo -e "${YELLOW}   ! nginx no encontrado${NC}"
fi

# ============ RESUMEN ============
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗"
echo -e "║              ACTUALIZACIÓN COMPLETADA                      ║"
echo -e "╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Mejoras incluidas en esta actualización:${NC}"
echo "  ✓ Login: Mensaje de error visible para credenciales incorrectas"
echo "  ✓ Alertas: Sin límite de 50, muestra todas las del mes actual"
echo "  ✓ Popup: Se cierra automáticamente después de 60 segundos"
echo "  ✓ ESXi: Fallback SSH para detectar VMs (con paramiko)"
echo "  ✓ Synology: Corregida pantalla en blanco"
echo "  ✓ OpenVPN: Nuevo soporte para monitoreo de servidores VPN"
echo "  ✓ Barras de carga: En pestañas Logs e Incidentes"
echo ""
echo -e "${YELLOW}VERIFICACIÓN:${NC}"
echo "  1. Abre https://$DOMAIN en un navegador (modo incógnito)"
echo "  2. Prueba login con credenciales INCORRECTAS → debe mostrar error rojo"
echo "  3. Login con credenciales correctas → verifica que carga"
echo "  4. Ve a Alerts → debe mostrar más de 50 si hay suficientes"
echo "  5. Ve a Infrastructure → añade un dispositivo OpenVPN"
echo ""
echo -e "${CYAN}Si tienes problemas, ejecuta estos comandos:${NC}"
echo "  sudo systemctl status siempria-backend"
echo "  sudo systemctl status nginx"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""
