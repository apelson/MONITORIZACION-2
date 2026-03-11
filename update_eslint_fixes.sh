#!/bin/bash
# ===========================================
# ACTUALIZACIÓN: Correcciones ESLint
# Fecha: 21 Feb 2026
# ===========================================

set -e
FRONTEND_DIR="/opt/siempria-monitor/frontend/src"

echo "🔧 Aplicando correcciones ESLint..."
echo ""

# Backup antes de actualizar
BACKUP_DIR="/opt/siempria-monitor/backups/eslint_fix_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📁 Creando backup en: $BACKUP_DIR"

# Lista de archivos a actualizar
FILES=(
    "components/settings/AIInsightsPanel.jsx"
    "components/settings/SLAReportsPanel.jsx"
    "components/settings/ReportSettings.jsx"
    "components/panels/NOCDashboard.jsx"
    "components/panels/IncidentsPanel.jsx"
    "components/panels/LiveViewer.jsx"
    "components/common/SystemECG.jsx"
    "SaaSApp.jsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$FRONTEND_DIR/$file" ]; then
        cp "$FRONTEND_DIR/$file" "$BACKUP_DIR/"
        echo "  ✓ Backup: $file"
    fi
done

echo ""
echo "📥 Descargando archivos actualizados..."
API_URL="https://conteo-preview-1.preview.emergentagent.com/api"

# Descargar cada archivo
curl -s "$API_URL/download-frontend/components/settings/AIInsightsPanel.jsx" -o "$FRONTEND_DIR/components/settings/AIInsightsPanel.jsx"
echo "  ✓ AIInsightsPanel.jsx"

curl -s "$API_URL/download-frontend/components/settings/SLAReportsPanel.jsx" -o "$FRONTEND_DIR/components/settings/SLAReportsPanel.jsx"
echo "  ✓ SLAReportsPanel.jsx"

curl -s "$API_URL/download-frontend/components/settings/ReportSettings.jsx" -o "$FRONTEND_DIR/components/settings/ReportSettings.jsx"
echo "  ✓ ReportSettings.jsx"

curl -s "$API_URL/download-frontend/components/panels/NOCDashboard.jsx" -o "$FRONTEND_DIR/components/panels/NOCDashboard.jsx"
echo "  ✓ NOCDashboard.jsx"

curl -s "$API_URL/download-frontend/components/panels/IncidentsPanel.jsx" -o "$FRONTEND_DIR/components/panels/IncidentsPanel.jsx"
echo "  ✓ IncidentsPanel.jsx"

curl -s "$API_URL/download-frontend/components/panels/LiveViewer.jsx" -o "$FRONTEND_DIR/components/panels/LiveViewer.jsx"
echo "  ✓ LiveViewer.jsx"

curl -s "$API_URL/download-frontend/components/common/SystemECG.jsx" -o "$FRONTEND_DIR/components/common/SystemECG.jsx"
echo "  ✓ SystemECG.jsx"

curl -s "$API_URL/download-frontend/SaaSApp.jsx" -o "$FRONTEND_DIR/SaaSApp.jsx"
echo "  ✓ SaaSApp.jsx"

echo ""
echo "🔨 Reconstruyendo frontend..."
cd /opt/siempria-monitor/frontend
npm run build

echo ""
echo "✅ Actualización completada!"
echo "   Backup guardado en: $BACKUP_DIR"
echo ""
