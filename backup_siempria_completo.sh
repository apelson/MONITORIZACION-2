#!/bin/bash
# ============================================================
# SIEMPRIA - Backup Completo de Ambas Plataformas
# ============================================================
# Plataforma 1: siempria-monitor (/opt/siempria-monitor)
# Plataforma 2: siempria-conteo  (/opt/siempria-conteo)
# Bases de datos: siempria_monitor, siempria_conteo,
#                 siempriapp_master, tenant_*
# ============================================================

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/opt/backups/siempria_${TIMESTAMP}"
MONITOR_DIR="/opt/siempria-monitor"
CONTEO_DIR="/opt/siempria-conteo"

echo "============================================"
echo "  SIEMPRIA - Backup Completo"
echo "  Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# Crear directorio de backup
mkdir -p "$BACKUP_ROOT"/{monitor,conteo,databases}

# ─────────────────────────────────────────────
# 1. BACKUP PLATAFORMA MONITOR (codigo)
# ─────────────────────────────────────────────
echo "[1/4] Backup de siempria-monitor (codigo)..."
if [ -d "$MONITOR_DIR" ]; then
    tar czf "$BACKUP_ROOT/monitor/siempria-monitor-code.tar.gz" \
        --exclude='node_modules' \
        --exclude='venv' \
        --exclude='__pycache__' \
        --exclude='.git' \
        --exclude='*.log' \
        -C /opt siempria-monitor
    SIZE=$(du -sh "$BACKUP_ROOT/monitor/siempria-monitor-code.tar.gz" | cut -f1)
    echo "   siempria-monitor: $SIZE"
else
    echo "   ADVERTENCIA: $MONITOR_DIR no encontrado"
fi

# ─────────────────────────────────────────────
# 2. BACKUP PLATAFORMA CONTEO (codigo)
# ─────────────────────────────────────────────
echo "[2/4] Backup de siempria-conteo (codigo)..."
if [ -d "$CONTEO_DIR" ]; then
    tar czf "$BACKUP_ROOT/conteo/siempria-conteo-code.tar.gz" \
        --exclude='node_modules' \
        --exclude='venv' \
        --exclude='__pycache__' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='backups' \
        -C /opt siempria-conteo
    SIZE=$(du -sh "$BACKUP_ROOT/conteo/siempria-conteo-code.tar.gz" | cut -f1)
    echo "   siempria-conteo: $SIZE"
else
    echo "   ADVERTENCIA: $CONTEO_DIR no encontrado"
fi

# ─────────────────────────────────────────────
# 3. BACKUP BASES DE DATOS MONGODB
# ─────────────────────────────────────────────
echo "[3/4] Backup de bases de datos MongoDB..."

DATABASES=(
    "siempria_monitor"
    "siempria_conteo"
    "siempriapp_master"
    "tenant_dagroup"
    "tenant_siempreweb"
    "tenant_siempria"
)

for DB in "${DATABASES[@]}"; do
    echo -n "   Exportando $DB... "
    mongodump --db="$DB" --out="$BACKUP_ROOT/databases/" --quiet 2>/dev/null
    if [ $? -eq 0 ]; then
        SIZE=$(du -sh "$BACKUP_ROOT/databases/$DB" 2>/dev/null | cut -f1)
        echo "$SIZE"
    else
        echo "ERROR"
    fi
done

# ─────────────────────────────────────────────
# 4. BACKUP CONFIGURACION SISTEMA
# ─────────────────────────────────────────────
echo "[4/4] Backup de configuracion del sistema..."
mkdir -p "$BACKUP_ROOT/config"

# Servicios systemd
cp /etc/systemd/system/siempria*.service "$BACKUP_ROOT/config/" 2>/dev/null

# Nginx config
cp /etc/nginx/sites-available/*siempria* "$BACKUP_ROOT/config/" 2>/dev/null
cp /etc/nginx/sites-available/*conteo* "$BACKUP_ROOT/config/" 2>/dev/null
cp /etc/nginx/sites-enabled/*siempria* "$BACKUP_ROOT/config/" 2>/dev/null
cp /etc/nginx/sites-enabled/*conteo* "$BACKUP_ROOT/config/" 2>/dev/null

# Variables de entorno (sin exponer passwords en logs)
if [ -f "$MONITOR_DIR/backend/.env" ]; then
    cp "$MONITOR_DIR/backend/.env" "$BACKUP_ROOT/config/monitor-backend.env"
fi
if [ -f "$CONTEO_DIR/backend/.env" ]; then
    cp "$CONTEO_DIR/backend/.env" "$BACKUP_ROOT/config/conteo-backend.env"
fi

echo "   Configuracion guardada"

# ─────────────────────────────────────────────
# RESUMEN
# ─────────────────────────────────────────────
TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" | cut -f1)

echo ""
echo "============================================"
echo "  BACKUP COMPLETADO"
echo "============================================"
echo ""
echo "  Ubicacion: $BACKUP_ROOT"
echo "  Tamano total: $TOTAL_SIZE"
echo ""
echo "  Contenido:"
echo "    monitor/  - Codigo siempria-monitor"
echo "    conteo/   - Codigo siempria-conteo"
echo "    databases/ - MongoDB dumps:"
for DB in "${DATABASES[@]}"; do
    if [ -d "$BACKUP_ROOT/databases/$DB" ]; then
        SIZE=$(du -sh "$BACKUP_ROOT/databases/$DB" | cut -f1)
        echo "      - $DB ($SIZE)"
    fi
done
echo "    config/   - Servicios, Nginx, .env"
echo ""
echo "  Para restaurar una BD:"
echo "    mongorestore --db=NOMBRE_DB $BACKUP_ROOT/databases/NOMBRE_DB/"
echo ""
echo "  Para comprimir todo en un solo archivo:"
echo "    tar czf /opt/backups/siempria_backup_${TIMESTAMP}.tar.gz -C $BACKUP_ROOT ."
echo "============================================"
