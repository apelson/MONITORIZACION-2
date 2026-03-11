#!/bin/bash
# ================================================================
# Script para actualizar SOLO el frontend de Siempria Conteo
# Ejecutar en el servidor
# ================================================================
set -e

CONTEO_DIR="/opt/siempria-conteo"
echo "Actualizando frontend de Siempria Conteo..."

# Copiar archivos fuente
echo "[1/3] Copiando archivos..."
cd "$CONTEO_DIR/frontend"

# Verificar que exista el package.json
if [ ! -f "package.json" ]; then
    echo "ERROR: No se encuentra package.json en $CONTEO_DIR/frontend/"
    exit 1
fi

# Instalar dependencias si hace falta
echo "[2/3] Instalando dependencias..."
npm install --quiet 2>/dev/null || yarn install --silent 2>/dev/null

# Build
echo "[3/3] Construyendo..."
npm run build 2>/dev/null || npx vite build

echo ""
echo "Frontend actualizado correctamente!"
echo "URL: https://conteo.siempriapp.com"
