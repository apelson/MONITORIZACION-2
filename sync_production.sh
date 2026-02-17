#!/bin/bash
# =============================================================================
# SCRIPT DE SINCRONIZACIÓN PARA SIEMPRIA PRODUCTION
# Ejecutar en el servidor de producción como root
# =============================================================================

echo "=== INICIANDO SINCRONIZACIÓN DE ARCHIVOS ==="
echo "Timestamp: $(date)"
echo ""

# Crear backup de los archivos existentes
BACKUP_DIR="/opt/siempria-monitor/backup_$(date +%Y%m%d_%H%M%S)"
echo ">>> Creando backup en: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR/backend/routes"
mkdir -p "$BACKUP_DIR/frontend/src/components/common"
mkdir -p "$BACKUP_DIR/frontend/src/hooks"

# Backup de archivos backend
cp /opt/siempria-monitor/backend/routes/camera_stream.py "$BACKUP_DIR/backend/routes/" 2>/dev/null
cp /opt/siempria-monitor/backend/routes/websocket.py "$BACKUP_DIR/backend/routes/" 2>/dev/null
cp /opt/siempria-monitor/backend/routes/device_images.py "$BACKUP_DIR/backend/routes/" 2>/dev/null
cp /opt/siempria-monitor/backend/routes/ai_analysis.py "$BACKUP_DIR/backend/routes/" 2>/dev/null
cp /opt/siempria-monitor/backend/routes/sla_reports.py "$BACKUP_DIR/backend/routes/" 2>/dev/null
cp /opt/siempria-monitor/backend/routes/devices.py "$BACKUP_DIR/backend/routes/" 2>/dev/null
cp /opt/siempria-monitor/backend/routes/settings.py "$BACKUP_DIR/backend/routes/" 2>/dev/null
cp /opt/siempria-monitor/backend/routes/users.py "$BACKUP_DIR/backend/routes/" 2>/dev/null
cp /opt/siempria-monitor/backend/routes/organizations.py "$BACKUP_DIR/backend/routes/" 2>/dev/null

# Backup de archivos frontend
cp /opt/siempria-monitor/frontend/src/components/common/CRAFloatingButton.jsx "$BACKUP_DIR/frontend/src/components/common/" 2>/dev/null
cp /opt/siempria-monitor/frontend/src/components/common/NOCFloatingButton.jsx "$BACKUP_DIR/frontend/src/components/common/" 2>/dev/null
cp /opt/siempria-monitor/frontend/src/components/common/SystemECG.jsx "$BACKUP_DIR/frontend/src/components/common/" 2>/dev/null
cp /opt/siempria-monitor/frontend/src/hooks/useWebSocketAlerts.js "$BACKUP_DIR/frontend/src/hooks/" 2>/dev/null

echo ">>> Backup completado"
echo ""

echo "=== Para restaurar backup si es necesario ==="
echo "cp -r $BACKUP_DIR/* /opt/siempria-monitor/"
echo ""

echo "=== SINCRONIZACIÓN COMPLETA ==="
echo "Ahora ejecuta los siguientes archivos para aplicar los cambios:"
echo "1. sudo bash /tmp/sync_backend.sh"
echo "2. sudo bash /tmp/sync_frontend.sh"  
echo "3. sudo systemctl restart siempria-backend"
echo "4. cd /opt/siempria-monitor/frontend && npm run build"
echo "5. sudo cp -r /opt/siempria-monitor/frontend/build/* /var/www/html/"
