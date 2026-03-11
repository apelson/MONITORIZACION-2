#!/bin/bash
# ================================================================
# FIX: Corregir configuracion Nginx y /etc/hosts del servidor
# Ejecutar en el servidor como root o con sudo
# ================================================================
set -e

echo "=========================================="
echo "  Correccion Nginx + Hosts"
echo "=========================================="

# 1. Limpiar /etc/hosts - eliminar entradas problematicas
echo "[1/4] Limpiando /etc/hosts..."
sudo sed -i '/conteo\.siempriapp\.com/d' /etc/hosts
sudo sed -i '/siempriapp\.com/d' /etc/hosts
echo "  /etc/hosts limpiado"

# 2. Corregir Nginx conteo - solo el dominio, sin IP
echo "[2/4] Corrigiendo Nginx conteo..."
if [ -f /etc/nginx/sites-available/conteo ]; then
    # Reemplazar server_name para que solo tenga el dominio
    sudo sed -i 's/server_name .*/server_name conteo.siempriapp.com;/' /etc/nginx/sites-available/conteo
    echo "  server_name corregido en conteo"
else
    echo "  AVISO: /etc/nginx/sites-available/conteo no encontrado"
fi

# 3. Verificar Nginx principal
echo "[3/4] Verificando Nginx principal..."
if [ -f /etc/nginx/sites-available/siempriapp ]; then
    grep "server_name" /etc/nginx/sites-available/siempriapp
else
    echo "  AVISO: /etc/nginx/sites-available/siempriapp no encontrado"
fi

# 4. Test y reload Nginx
echo "[4/4] Recargando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "  Nginx recargado correctamente"

echo ""
echo "=========================================="
echo "  Servidor corregido!"
echo ""
echo "  IMPORTANTE: Para acceso local, edita el"
echo "  archivo hosts en tu PC Windows:"
echo "  C:\\Windows\\System32\\drivers\\etc\\hosts"
echo ""
echo "  Agrega estas lineas:"
echo "  192.168.1.76    siempriapp.com"
echo "  192.168.1.76    conteo.siempriapp.com"
echo "=========================================="
