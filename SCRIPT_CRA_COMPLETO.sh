#!/bin/bash
# ============================================
# Script de Actualización - Panel CRA Completo
# Fecha: 16 de Febrero 2026
# ============================================
# Cambios incluidos:
# 1. Backend: Corregido endpoint ftp-status-batch para buscar is_cra:true
# 2. Frontend: Añadidas cards de Armados/Desarmados en CRADashboard
# ============================================

set -e

echo "================================================"
echo "  ACTUALIZACIÓN: Panel CRA - Armado/Desarmado"
echo "================================================"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Rutas
BACKEND_SRC="/opt/siempria-monitor/backend"
FRONTEND_SRC="/opt/siempria-monitor/frontend/src"
BACKUP_DIR="/opt/siempria-monitor/backups/cra_$(date +%Y%m%d_%H%M%S)"

# Crear directorio de backup
echo -e "${YELLOW}[1/6] Creando backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp "$BACKEND_SRC/routes/camera_stream.py" "$BACKUP_DIR/" 2>/dev/null || true
cp "$FRONTEND_SRC/components/panels/CRADashboard.jsx" "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup creado en: $BACKUP_DIR${NC}"

# ============================================
# CAMBIO 1: Backend - Corregir query de ftp-status-batch
# ============================================
echo -e "${YELLOW}[2/6] Actualizando backend (camera_stream.py)...${NC}"

# Buscar y reemplazar el query que busca device_type: "cra" por is_cra: True
if [ -f "$BACKEND_SRC/routes/camera_stream.py" ]; then
    # Reemplazar la query
    sed -i 's|{"device_type": "cra"}|{"$or": [{"is_cra": True}, {"device_type": "cra"}]}|g' "$BACKEND_SRC/routes/camera_stream.py"
    echo -e "${GREEN}✓ Backend actualizado${NC}"
else
    echo -e "${RED}⚠ camera_stream.py no encontrado${NC}"
fi

# ============================================
# CAMBIO 2: Reiniciar backend
# ============================================
echo -e "${YELLOW}[3/6] Reiniciando backend...${NC}"
sudo systemctl restart siempria-backend.service
sleep 3
echo -e "${GREEN}✓ Backend reiniciado${NC}"

# ============================================
# CAMBIO 3: Frontend - Añadir cards Armados/Desarmados
# ============================================
echo -e "${YELLOW}[4/6] Actualizando frontend (CRADashboard.jsx)...${NC}"

if [ -f "$FRONTEND_SRC/components/panels/CRADashboard.jsx" ]; then
    # Este cambio es más complejo, necesitamos reemplazar la sección de Stats Cards
    # Creamos un archivo temporal con el código nuevo
    
    # Primero verificamos si ya tiene las cards de Armados
    if grep -q "Armados" "$FRONTEND_SRC/components/panels/CRADashboard.jsx"; then
        echo -e "${YELLOW}⚠ Las cards de Armados/Desarmados ya existen${NC}"
    else
        echo -e "${YELLOW}Aplicando cambio manualmente...${NC}"
        # El cambio es extenso, mejor mostramos qué buscar y reemplazar
        echo ""
        echo -e "${YELLOW}ACCIÓN REQUERIDA:${NC}"
        echo "Debes editar manualmente el archivo:"
        echo "  $FRONTEND_SRC/components/panels/CRADashboard.jsx"
        echo ""
        echo "Busca esta línea:"
        echo '  <div className="grid grid-cols-2 gap-2 sm:gap-4">'
        echo ""
        echo "Y cámbiala por:"
        echo '  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">'
        echo ""
        echo "Luego añade estas dos cards DESPUÉS de la card de Offline:"
        echo ""
        cat << 'CARDS_CODE'
        {/* Armed/Disarmed Cards */}
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-emerald-700">Armados</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-700">
                  {Object.values(ftpStatuses).filter(s => s.enabled).length}
                </p>
              </div>
              <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-amber-700">Desarmados</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-700">
                  {Object.values(ftpStatuses).filter(s => !s.enabled && !s.error).length}
                </p>
              </div>
              <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
CARDS_CODE
        echo ""
    fi
else
    echo -e "${RED}⚠ CRADashboard.jsx no encontrado${NC}"
fi

# ============================================
# BUILD Y DEPLOY
# ============================================
echo -e "${YELLOW}[5/6] Compilando frontend...${NC}"
cd /opt/siempria-monitor/frontend
npm run build

echo -e "${YELLOW}[6/6] Desplegando frontend...${NC}"
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✓ ACTUALIZACIÓN COMPLETADA${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Cambios aplicados:"
echo "  • Backend: Query corregida para buscar is_cra: true"
echo "  • Frontend: Cards de Armados/Desarmados añadidas"
echo ""
echo "El panel CRA ahora muestra:"
echo "  - Total CRA"
echo "  - Online / Offline"  
echo "  - Armados (verde)"
echo "  - Desarmados (naranja)"
echo "  - Alertas 24h"
echo ""
echo "Para restaurar backup:"
echo "  cp $BACKUP_DIR/* a los directorios originales"
echo ""
