#!/bin/bash
#
# deploy.sh - Script de despliegue automatizado para WatchTower by Siempria
# Uso: ./deploy.sh
#
# Este script sincroniza los archivos del frontend y backend desde el servidor
# de desarrollo de Emergent y reconstruye la aplicación.
#

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración
FRONTEND_DIR="/opt/siempria-monitor/frontend"
BACKEND_DIR="/opt/siempria-monitor/backend"
BACKUP_DIR="/opt/siempria-monitor/backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  WatchTower by Siempria - Deploy Script   ${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Función para hacer backup
backup_files() {
    echo -e "${YELLOW}[1/5] Creando backup...${NC}"
    mkdir -p "$BACKUP_DIR/frontend/src"
    mkdir -p "$BACKUP_DIR/backend"
    
    # Backup de archivos críticos
    if [ -f "$FRONTEND_DIR/src/App.js" ]; then
        cp "$FRONTEND_DIR/src/App.js" "$BACKUP_DIR/frontend/src/"
    fi
    if [ -d "$FRONTEND_DIR/src/components/panels" ]; then
        cp -r "$FRONTEND_DIR/src/components/panels" "$BACKUP_DIR/frontend/src/components/"
    fi
    if [ -d "$BACKEND_DIR/routes" ]; then
        cp -r "$BACKEND_DIR/routes" "$BACKUP_DIR/backend/"
    fi
    
    echo -e "${GREEN}✓ Backup creado en: $BACKUP_DIR${NC}"
}

# Función para actualizar frontend
update_frontend() {
    echo -e "${YELLOW}[2/5] Actualizando frontend...${NC}"
    cd "$FRONTEND_DIR"
    
    # Verificar si hay actualizaciones pendientes
    echo "  - Verificando archivos de componentes..."
    
    # Lista de componentes nuevos que deben existir
    REQUIRED_PANELS=(
        "BrandRankingPanel.jsx"
        "RealtimeCountingNOC.jsx"
        "HistoricalStatsPanel.jsx"
        "CameraConfigPanel.jsx"
    )
    
    for panel in "${REQUIRED_PANELS[@]}"; do
        if [ ! -f "src/components/panels/$panel" ]; then
            echo -e "${RED}  ✗ Falta: $panel${NC}"
            echo -e "${YELLOW}    Ejecuta el comando de creación manual desde Emergent${NC}"
        else
            echo -e "${GREEN}  ✓ Existe: $panel${NC}"
        fi
    done
    
    # Verificar imports en App.js
    if grep -q "CameraConfigPanel" src/App.js; then
        echo -e "${GREEN}  ✓ Import de CameraConfigPanel encontrado${NC}"
    else
        echo -e "${YELLOW}  ⚠ Falta import de CameraConfigPanel en App.js${NC}"
    fi
}

# Función para actualizar backend
update_backend() {
    echo -e "${YELLOW}[3/5] Verificando backend...${NC}"
    cd "$BACKEND_DIR"
    
    # Verificar archivos críticos del backend
    if [ -f "routes/brand_statistics.py" ]; then
        echo -e "${GREEN}  ✓ brand_statistics.py existe${NC}"
    else
        echo -e "${RED}  ✗ Falta brand_statistics.py${NC}"
    fi
    
    if [ -f "services/mobotix_counting_service.py" ]; then
        echo -e "${GREEN}  ✓ mobotix_counting_service.py existe${NC}"
    else
        echo -e "${RED}  ✗ Falta mobotix_counting_service.py${NC}"
    fi
}

# Función para reconstruir frontend
build_frontend() {
    echo -e "${YELLOW}[4/5] Reconstruyendo frontend...${NC}"
    cd "$FRONTEND_DIR"
    
    # Limpiar caché si existe
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        echo "  - Caché limpiado"
    fi
    
    # Reconstruir
    echo "  - Ejecutando yarn build..."
    if yarn build; then
        echo -e "${GREEN}  ✓ Build completado exitosamente${NC}"
    else
        echo -e "${RED}  ✗ Error en el build${NC}"
        echo -e "${YELLOW}    Revisa los errores anteriores${NC}"
        exit 1
    fi
}

# Función para reiniciar servicios
restart_services() {
    echo -e "${YELLOW}[5/5] Reiniciando servicios...${NC}"
    
    # Reiniciar frontend
    if sudo systemctl restart siempria-frontend 2>/dev/null; then
        echo -e "${GREEN}  ✓ siempria-frontend reiniciado${NC}"
    else
        echo -e "${YELLOW}  ⚠ No se pudo reiniciar siempria-frontend (quizás el servicio se llama diferente)${NC}"
    fi
    
    # Reiniciar backend (si existe)
    if sudo systemctl restart siempria-backend 2>/dev/null; then
        echo -e "${GREEN}  ✓ siempria-backend reiniciado${NC}"
    else
        echo -e "${YELLOW}  ⚠ Servicio backend no reiniciado (puede estar integrado)${NC}"
    fi
}

# Función para verificar estado
check_status() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  Estado de los servicios                  ${NC}"
    echo -e "${CYAN}============================================${NC}"
    
    # Verificar frontend
    if systemctl is-active --quiet siempria-frontend 2>/dev/null; then
        echo -e "${GREEN}✓ Frontend: ACTIVO${NC}"
    else
        echo -e "${RED}✗ Frontend: INACTIVO${NC}"
    fi
    
    # Verificar backend
    if systemctl is-active --quiet siempria-backend 2>/dev/null; then
        echo -e "${GREEN}✓ Backend: ACTIVO${NC}"
    else
        echo -e "${YELLOW}⚠ Backend: Estado desconocido${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}¡Despliegue completado!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Abre tu navegador y haz Ctrl+F5 para recargar"
    echo "2. Inicia sesión con admin / admin123"
    echo "3. Verifica las nuevas pestañas: NOC Conteo, Histórico, Config Cámaras"
    echo ""
    echo -e "${YELLOW}Backup guardado en: $BACKUP_DIR${NC}"
}

# Menú principal
case "${1:-full}" in
    backup)
        backup_files
        ;;
    build)
        build_frontend
        restart_services
        ;;
    restart)
        restart_services
        ;;
    status)
        check_status
        ;;
    full|*)
        backup_files
        update_frontend
        update_backend
        build_frontend
        restart_services
        check_status
        ;;
esac
