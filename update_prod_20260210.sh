#!/bin/bash
# ================================================
# SIEMPRIA MONITOR - Actualización Producción
# Fecha: 2026-02-10
# ================================================

echo "🔧 Actualizando Siempria Monitor..."

# Ajustar esta ruta según tu instalación
FRONTEND_DIR="/var/www/siempria-monitor/frontend/src"

# 1. Backup
echo "📦 Backup..."
mkdir -p /var/www/siempria-monitor/backups/$(date +%Y%m%d)
cp "$FRONTEND_DIR/App.js" /var/www/siempria-monitor/backups/$(date +%Y%m%d)/

# 2. Crear directorios
mkdir -p "$FRONTEND_DIR/components/panels"

# 3. Descargar archivos desde el preview
BASE_URL="https://counting-hub.preview.emergentagent.com"

echo "⬇️ Descargando componentes..."

# Descargar cada componente
curl -sL "$BASE_URL/src/components/panels/AccessLogsPanel.jsx" -o "$FRONTEND_DIR/components/panels/AccessLogsPanel.jsx" 2>/dev/null
curl -sL "$BASE_URL/src/components/panels/BackupPanel.jsx" -o "$FRONTEND_DIR/components/panels/BackupPanel.jsx" 2>/dev/null
curl -sL "$BASE_URL/src/components/panels/DailyReportPanel.jsx" -o "$FRONTEND_DIR/components/panels/DailyReportPanel.jsx" 2>/dev/null
curl -sL "$BASE_URL/src/components/panels/ScheduledReportsPanel.jsx" -o "$FRONTEND_DIR/components/panels/ScheduledReportsPanel.jsx" 2>/dev/null

echo "✅ Componentes descargados"

# 4. Agregar imports a App.js (si no existen)
if ! grep -q "import AccessLogsPanel" "$FRONTEND_DIR/App.js"; then
  echo "📝 Agregando imports..."
  sed -i '/import IncidentsPanel/a import AccessLogsPanel from "@/components/panels/AccessLogsPanel";\nimport BackupPanel from "@/components/panels/BackupPanel";\nimport DailyReportPanel from "@/components/panels/DailyReportPanel";\nimport ScheduledReportsPanel from "@/components/panels/ScheduledReportsPanel";' "$FRONTEND_DIR/App.js"
fi

# 5. Rebuild
echo "🔨 Reconstruyendo..."
cd /var/www/siempria-monitor/frontend
yarn build || npm run build

# 6. Reiniciar
echo "🔄 Reiniciando..."
sudo systemctl restart siempria-frontend 2>/dev/null || sudo systemctl restart nginx

echo "✅ ¡Actualización completada!"
