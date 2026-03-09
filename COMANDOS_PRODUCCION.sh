#!/bin/bash
# =====================================================
# COMANDOS PARA DESPLEGAR EN PRODUCCIÓN
# Servidor: 192.168.1.76
# Fecha: 09 Mar 2026
# =====================================================

# =====================================================
# PASO 1: BACKUP PREVIO (EJECUTAR PRIMERO)
# =====================================================
echo "=== PASO 1: Creando backups ==="
cd /opt/siempria-monitor
cp -r frontend/src/components/panels/NOCCompetitivo.jsx frontend/src/components/panels/NOCCompetitivo.jsx.backup.$(date +%Y%m%d)
cp -r frontend/src/components/panels/BrandCenterManager.jsx frontend/src/components/panels/BrandCenterManager.jsx.backup.$(date +%Y%m%d)
cp -r backend/routes/brand_statistics.py backend/routes/brand_statistics.py.backup.$(date +%Y%m%d)
cp -r backend/routes/users.py backend/routes/users.py.backup.$(date +%Y%m%d)
cp -r backend/models/__init__.py backend/models/__init__.py.backup.$(date +%Y%m%d)
echo "Backups creados"

# =====================================================
# PASO 2: INSTALAR DEPENDENCIAS
# =====================================================
echo "=== PASO 2: Instalando dependencias ==="

# Backend - ReportLab para PDFs (si no está instalado)
cd /opt/siempria-monitor/backend
source venv/bin/activate  # Si usas virtualenv
pip install reportlab

# Frontend - canvas-confetti para efectos de celebración
cd /opt/siempria-monitor/frontend
npm install canvas-confetti

# =====================================================
# PASO 3: DESCARGAR ARCHIVOS ACTUALIZADOS
# =====================================================
echo "=== PASO 3: Descargando archivos ==="

# Opción A: Descargar desde el servidor de preview
# (Necesitas acceso a los archivos, puedes usar curl/wget o copiar manualmente)

# Los archivos a actualizar son:
# 1. frontend/src/components/panels/NOCCompetitivo.jsx (REDISEÑO COMPLETO)
# 2. frontend/src/components/panels/UserPermissionsManager.jsx (NUEVO)
# 3. frontend/src/components/panels/ReportExportPanel.jsx (NUEVO)
# 4. frontend/src/App.js (imports actualizados)
# 5. backend/routes/brand_statistics.py (filtrado por permisos)
# 6. backend/routes/users.py (endpoints de permisos)
# 7. backend/routes/pdf_export.py (NUEVO - exportación PDF)
# 8. backend/models/__init__.py (UserPermissionsUpdate)
# 9. backend/server.py (registro de rutas)

# =====================================================
# PASO 4: REGISTRAR NUEVA RUTA PDF EN SERVER.PY
# =====================================================
echo "=== PASO 4: Registrar ruta PDF ==="

# Añadir después de "api_router.include_router(brand_statistics_router)":
# from routes.pdf_export import router as pdf_export_router
# api_router.include_router(pdf_export_router)

# =====================================================
# PASO 5: REINICIAR SERVICIOS
# =====================================================
echo "=== PASO 5: Reiniciando servicios ==="

# Backend
sudo systemctl restart siempria-backend
sleep 3
sudo systemctl status siempria-backend

# Frontend (rebuild y nginx)
cd /opt/siempria-monitor/frontend
npm run build
sudo systemctl restart nginx

# =====================================================
# PASO 6: VERIFICAR
# =====================================================
echo "=== PASO 6: Verificando ==="

# Verificar backend
curl -s http://localhost:8001/api/health

# Verificar nuevo endpoint PDF
TOKEN=$(curl -s -X POST "http://localhost:8001/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"TU_PASSWORD"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")
curl -s "http://localhost:8001/api/brand-statistics/export/json?period=day" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

echo "=== DESPLIEGUE COMPLETADO ==="

# =====================================================
# ARCHIVOS NUEVOS A CREAR
# =====================================================

# 1. backend/routes/pdf_export.py - Copia completa necesaria
# 2. frontend/src/components/panels/UserPermissionsManager.jsx - Copia completa necesaria
# 3. frontend/src/components/panels/ReportExportPanel.jsx - Copia completa necesaria

# =====================================================
# NOTAS IMPORTANTES
# =====================================================
# 
# - El NOC Competitivo ahora está optimizado para pantallas de 55" sin scroll
# - Los botones flotantes usan posiciones fijas: 200px, 280px, 360px
# - El filtrado por permisos está activo: usuarios no-admin solo ven marcas/centros asignados
# - La exportación PDF compara períodos (actual vs anterior)
# - El campo "filtered_by_permissions" en la respuesta indica si hay filtrado activo
