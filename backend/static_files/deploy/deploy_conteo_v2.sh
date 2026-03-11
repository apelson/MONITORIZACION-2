#!/bin/bash
# Siempria Conteo - Deployment Script v2
# Run on production server: bash deploy_conteo_v2.sh

CONTEO_DIR="/opt/siempria-conteo"
BACKUP_DIR="$CONTEO_DIR/backups/$(date +%Y%m%d_%H%M%S)"

echo "========================================="
echo "  Siempria Conteo - Deployment v2"
echo "========================================="

# Create backup
echo ""
echo "[1/5] Creating backup..."
mkdir -p "$BACKUP_DIR"
cp -r "$CONTEO_DIR/backend" "$BACKUP_DIR/backend" 2>/dev/null
cp -r "$CONTEO_DIR/frontend/src" "$BACKUP_DIR/frontend-src" 2>/dev/null
cp -r "$CONTEO_DIR/frontend/build" "$BACKUP_DIR/frontend-build" 2>/dev/null
echo "  Backup saved to: $BACKUP_DIR"

# Deploy backend
echo ""
echo "[2/5] Deploying backend..."
cd "$CONTEO_DIR"
tar xzf /tmp/conteo-backend-v2.tar.gz
echo "  Backend files updated"

# Deploy frontend  
echo ""
echo "[3/5] Deploying frontend..."
tar xzf /tmp/conteo-frontend-v2.tar.gz
echo "  Frontend files updated"

# Install Python dependencies
echo ""
echo "[4/5] Installing Python dependencies..."
cd "$CONTEO_DIR/backend"
if [ -d "venv" ]; then
    source venv/bin/activate
    pip install -r requirements.txt --quiet 2>/dev/null
    echo "  Dependencies updated"
else
    echo "  WARNING: venv not found, skipping pip install"
fi

# Restart service
echo ""
echo "[5/5] Restarting service..."
sudo systemctl restart siempria-conteo
sleep 2
sudo systemctl status siempria-conteo --no-pager -l | head -10

echo ""
echo "========================================="
echo "  Deployment complete!"
echo "  Test: curl -s http://localhost:8002/api/health"
echo "  Access: https://conteo.siempriapp.com"
echo "========================================="
