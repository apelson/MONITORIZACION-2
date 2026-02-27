#!/bin/bash
# ============================================
# SIEMPRIA NOC DASHBOARD - DEPLOYMENT SCRIPT
# Version: 3.0 - Dashboard Refactorizado + Drag & Drop + Filtros
# ============================================

echo "🚀 Iniciando despliegue del NOC Dashboard v3.0..."

cd /opt/siempria-monitor

# ============================================
# 1. DESCARGAR ARCHIVOS ACTUALIZADOS
# ============================================
echo "📥 Descargando archivos..."

BASE_URL="https://group-form-repair.preview.emergentagent.com/api/download-file"

# === FRONTEND ===

# App.js principal
curl -o frontend/src/App.js "$BASE_URL?path=App.js"

# NOC Dashboard Refactorizado (nuevo componente principal)
curl -o frontend/src/components/panels/NOCDashboardRefactored.jsx "$BASE_URL?path=NOCDashboardRefactored.jsx"

# Componentes NOC refactorizados
mkdir -p frontend/src/components/noc
curl -o frontend/src/components/noc/DraggableGrid.jsx "$BASE_URL?path=DraggableGrid.jsx"
curl -o frontend/src/components/noc/DashboardFilters.jsx "$BASE_URL?path=DashboardFilters.jsx"
curl -o frontend/src/components/noc/NOCHeader.jsx "$BASE_URL?path=NOCHeader.jsx"

# NOC Widgets modulares
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

# Common components
mkdir -p frontend/src/components/common
curl -o frontend/src/components/common/SystemECG.jsx "$BASE_URL?path=SystemECG.jsx"

# Dashboard config
mkdir -p frontend/src/components/dashboard
curl -o frontend/src/components/dashboard/DashboardWidgets.jsx "$BASE_URL?path=DashboardWidgets.jsx"

# === BACKEND ===
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

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "📝 Cambios v3.0:"
echo "   ✓ Dashboard completamente refactorizado"
echo "   ✓ Drag & Drop de widgets (activa con icono candado)"
echo "   ✓ Filtros por organización y grupo"
echo "   ✓ Widgets modulares reutilizables"
echo "   ✓ Guardado de preferencias de usuario"
echo "   ✓ Modo edición con visibilidad de widgets"
echo ""
echo "🔑 USO:"
echo "   - Click en icono de candado → Activa modo edición"
echo "   - Arrastra widgets para reorganizar"
echo "   - Click en ojo para mostrar/ocultar widgets"
echo "   - Click en candado de nuevo → Guarda cambios"
echo "   - Usa filtros de organización/grupo en el header"
