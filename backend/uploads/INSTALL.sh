#!/bin/bash
# ============================================
# SIEMPRIA - SCRIPT DE INSTALACIÓN
# ============================================

echo "🔄 Instalando actualización de producción..."

# Verificar que existe el ZIP
if [ ! -f "production_update.zip" ]; then
    echo "❌ Error: No se encontró production_update.zip"
    echo "Descárgalo primero desde la plataforma"
    exit 1
fi

# Crear backup
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creando backup en $BACKUP_DIR..."
cp -r frontend/src/App.js "$BACKUP_DIR/" 2>/dev/null
cp -r frontend/src/components "$BACKUP_DIR/" 2>/dev/null
cp -r frontend/src/locales "$BACKUP_DIR/" 2>/dev/null
cp -r backend/routes "$BACKUP_DIR/" 2>/dev/null

echo "📥 Extrayendo archivos..."
unzip -o production_update.zip

echo "📋 Copiando archivos..."
cp -r production_update/frontend/* frontend/
cp -r production_update/backend/* backend/

echo "🧹 Limpiando..."
rm -rf production_update/

echo ""
echo "✅ Actualización completada!"
echo ""
echo "⚠️  IMPORTANTE: Reinicia los servicios:"
echo "   - Frontend: npm run build && pm2 restart frontend"
echo "   - Backend: pm2 restart backend"
echo ""
