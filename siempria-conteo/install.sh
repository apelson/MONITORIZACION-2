#!/bin/bash
# ================================================================
# INSTALACION COMPLETA - Siempria Conteo
# Ejecutar en el servidor como root
# Prerequisito: Este directorio debe estar en /tmp/siempria-conteo/
# ================================================================
set -e

CONTEO_DIR="/opt/siempria-conteo"

echo "============================================"
echo "  Instalacion Siempria Conteo v1.0"
echo "============================================"

# 1. Crear estructura
echo "[1/8] Creando estructura de directorios..."
mkdir -p "$CONTEO_DIR"/{backend/{routes,services},frontend}

# 2. Copiar backend
echo "[2/8] Copiando backend..."
cp -r backend/* "$CONTEO_DIR/backend/"

# 3. Setup virtual environment e instalar deps
echo "[3/8] Configurando entorno Python..."
cd "$CONTEO_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
deactivate
echo "  Backend configurado"

# 4. Copiar frontend
echo "[4/8] Copiando frontend..."
cp -r frontend/* "$CONTEO_DIR/frontend/"

# 5. Build frontend
echo "[5/8] Construyendo frontend..."
cd "$CONTEO_DIR/frontend"
if command -v yarn &> /dev/null; then
    yarn install --silent 2>/dev/null
else
    npm install --quiet 2>/dev/null
fi
npx vite build
echo "  Frontend construido"

# 6. Configurar systemd
echo "[6/8] Configurando servicio systemd..."
cp /tmp/siempria-conteo/siempria-conteo.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable siempria-conteo.service
systemctl restart siempria-conteo.service
echo "  Servicio configurado"

# 7. Configurar Nginx
echo "[7/8] Configurando Nginx..."
cp /tmp/siempria-conteo/nginx-conteo.conf /etc/nginx/sites-available/conteo
ln -sf /etc/nginx/sites-available/conteo /etc/nginx/sites-enabled/conteo

# Limpiar /etc/hosts de entradas problematicas
sed -i '/conteo\.siempriapp\.com/d' /etc/hosts

# Verificar y recargar Nginx
nginx -t && systemctl reload nginx
echo "  Nginx configurado"

# 8. Verificar
echo "[8/8] Verificando..."
sleep 2
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/api/health)
if [ "$HEALTH" = "200" ]; then
    echo "  Backend: OK (puerto 8002)"
else
    echo "  Backend: ERROR (status $HEALTH)"
    echo "  Revisa: journalctl -u siempria-conteo -f"
fi

echo ""
echo "============================================"
echo "  Instalacion completada!"
echo ""
echo "  URL: https://conteo.siempriapp.com"
echo "  API: https://conteo.siempriapp.com/api/health"
echo ""
echo "  Credenciales:"
echo "    Usuario: admin"
echo "    Password: Conteo2024!"
echo ""
echo "  ACCESO LOCAL: Edita el archivo hosts"
echo "  de tu PC Windows (ver INSTRUCCIONES_ACCESO_LOCAL.md)"
echo "============================================"
