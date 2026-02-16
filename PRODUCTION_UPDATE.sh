#!/bin/bash
# ============================================
# SIEMPRIA NETWORK MONITOR - PRODUCTION UPDATE
# Fecha: $(date +%Y-%m-%d)
# ============================================

echo "🔄 Iniciando actualización de producción..."
echo ""

# Crear backup
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creando backups en $BACKUP_DIR..."

# Lista de archivos a actualizar
FILES=(
    "frontend/src/App.js"
    "frontend/src/components/auth/LoginPage.jsx"
    "frontend/src/components/panels/NOCDashboardRefactored.jsx"
    "frontend/src/components/noc/widgets/CRAWidget.jsx"
    "frontend/src/components/common/SystemECG.jsx"
    "frontend/src/locales/es/translation.json"
    "frontend/src/locales/en/translation.json"
    "backend/routes/devices.py"
    "backend/routes/settings.py"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        mkdir -p "$BACKUP_DIR/$(dirname $file)"
        cp "$file" "$BACKUP_DIR/$file"
        echo "  ✓ Backup: $file"
    fi
done

echo ""
echo "📥 Los archivos actualizados están disponibles para descarga."
echo ""
echo "⚠️  IMPORTANTE: Ejecuta este script desde la raíz de tu proyecto"
echo ""

