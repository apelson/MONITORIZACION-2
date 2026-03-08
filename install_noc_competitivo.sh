#!/bin/bash
# Instalador NOC Competitivo para WatchTower
# Ejecutar como: bash install_noc_competitivo.sh

set -e
BASE="/opt/siempria-monitor"

echo "========================================"
echo "  Instalando NOC Competitivo"
echo "========================================"

# Backup
BACKUP="$BASE/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"
cp -r "$BASE/frontend/src" "$BACKUP/" 2>/dev/null || true
cp -r "$BASE/backend" "$BACKUP/" 2>/dev/null || true
echo "✓ Backup creado en $BACKUP"

# Cambiar scheduler a 5 minutos
sed -i 's/IntervalTrigger(hours=1)/IntervalTrigger(minutes=5)/g' "$BASE/backend/server.py" 2>/dev/null || true
sed -i 's/storing every hour/storing every 5 minutes/g' "$BASE/backend/server.py" 2>/dev/null || true
echo "✓ Scheduler actualizado a 5 minutos"

echo ""
echo "========================================"
echo "  ARCHIVOS A CREAR MANUALMENTE"
echo "========================================"
echo ""
echo "1. Abre: nano $BASE/frontend/src/components/common/NOCCompetitivoFloatingButton.jsx"
echo "2. Abre: nano $BASE/frontend/src/components/panels/NOCCompetitivo.jsx"
echo ""
echo "Copia el contenido de los archivos desde el chat de Emergent"
echo ""
echo "3. Añade el import en App.js después de NOCFloatingButton:"
echo '   import NOCCompetitivoFloatingButton from "@/components/common/NOCCompetitivoFloatingButton";'
echo ""
echo "4. Añade el componente en el render de App.js después de <NOCFloatingButton>:"
echo '   <NOCCompetitivoFloatingButton authAxios={authAxios} />'
echo ""
echo "5. Compila y reinicia:"
echo "   cd $BASE/frontend && yarn build"
echo "   sudo systemctl restart siempria-backend"
echo ""
