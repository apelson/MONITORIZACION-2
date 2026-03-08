#!/bin/bash
# ============================================
# SIEMPRIA NOC DASHBOARD - DEPLOYMENT SCRIPT
# Version: 2.0 - Dashboard Personalizable
# ============================================

echo "🚀 Iniciando despliegue del NOC Dashboard..."

cd /opt/siempria-monitor

# ============================================
# 1. DESCARGAR ARCHIVOS ACTUALIZADOS
# ============================================
echo "📥 Descargando archivos..."

BASE_URL="https://noc-dashboard-fix-2.preview.emergentagent.com/api/download-file"

# NOCDashboard principal
curl -o frontend/src/components/panels/NOCDashboard.jsx "$BASE_URL?path=NOCDashboard.jsx"

# SystemECG
curl -o frontend/src/components/common/SystemECG.jsx "$BASE_URL?path=SystemECG.jsx"

# App.js
curl -o frontend/src/App.js "$BASE_URL?path=App.js"

# Dashboard Widgets config
mkdir -p frontend/src/components/dashboard
curl -o frontend/src/components/dashboard/DashboardWidgets.jsx "$BASE_URL?path=DashboardWidgets.jsx"

# NOC Widgets (drag & drop components)
mkdir -p frontend/src/components/noc/widgets
curl -o frontend/src/components/noc/widgets/index.js "$BASE_URL?path=widgets_index.js"
curl -o frontend/src/components/noc/widgets/StatsWidget.jsx "$BASE_URL?path=StatsWidget.jsx"
curl -o frontend/src/components/noc/widgets/UptimeWidget.jsx "$BASE_URL?path=UptimeWidget.jsx"
curl -o frontend/src/components/noc/widgets/SystemMonitorWidget.jsx "$BASE_URL?path=SystemMonitorWidget.jsx"
curl -o frontend/src/components/noc/widgets/CRAWidget.jsx "$BASE_URL?path=CRAWidget.jsx"
curl -o frontend/src/components/noc/widgets/OrganizationsWidget.jsx "$BASE_URL?path=OrganizationsWidget.jsx"
curl -o frontend/src/components/noc/widgets/OfflineWidget.jsx "$BASE_URL?path=OfflineWidget.jsx"
curl -o frontend/src/components/noc/widgets/HistoryWidget.jsx "$BASE_URL?path=HistoryWidget.jsx"
curl -o frontend/src/components/noc/widgets/AlertsWidget.jsx "$BASE_URL?path=AlertsWidget.jsx"

# Backend users.py (importante - contiene endpoint de preferencias)
curl -o backend/routes/users.py "$BASE_URL?path=users.py"

# ============================================
# 2. INSTALAR DEPENDENCIAS
# ============================================
echo "📦 Instalando dependencias..."

cd frontend
yarn add react-grid-layout

# ============================================
# 3. BUILD
# ============================================
echo "🔨 Compilando frontend..."
yarn build

# ============================================
# 4. REINICIAR BACKEND
# ============================================
echo "🔄 Reiniciando backend..."
cd /opt/siempria-monitor/backend
source venv/bin/activate

# Matar proceso anterior si existe
fuser -k 8001/tcp 2>/dev/null
sleep 2

# Iniciar backend en background
nohup uvicorn server:app --host 0.0.0.0 --port 8001 > /var/log/siempria-backend.log 2>&1 &

echo "✅ Despliegue completado!"
echo ""
echo "📝 Cambios incluidos:"
echo "   - Dashboard personalizable con modo edición"
echo "   - Widgets modulares para reorganizar"
echo "   - ECG del sistema con contador de tiempo"
echo "   - Guardado de preferencias de usuario"
echo ""
echo "🔑 Para activar modo edición: Click en icono de candado en el header del NOC"
