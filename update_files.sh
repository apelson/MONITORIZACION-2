#!/bin/bash
# Script para actualizar archivos en producción
# Ejecutar en /opt/siempria-monitor

# Archivos a actualizar
echo "=== Actualizando archivos de producción ==="

# 1. CRADashboard.jsx
cat > frontend/src/components/panels/CRADashboard.jsx.new << 'EOF'
