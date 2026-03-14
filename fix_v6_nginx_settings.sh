#!/bin/bash
set -e

echo "============================================"
echo "  FIX v6: Nginx Imagenes + Settings Tecnico"
echo "============================================"

MONITOR_DIR="/opt/siempria-monitor"
BACKUP_DIR="$MONITOR_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# ---- STEP 1: BACKUP ----
echo ""
echo "[1/5] Creando backup..."
mkdir -p "$BACKUP_DIR"
cp /etc/nginx/sites-enabled/siempriapp "$BACKUP_DIR/siempriapp.nginx.bak"
cp "$MONITOR_DIR/frontend/src/App.js" "$BACKUP_DIR/App.js.bak"
echo "   Backup en: $BACKUP_DIR"

# ---- STEP 2: FIX NGINX ----
echo ""
echo "[2/5] Corrigiendo nginx (imagen 404)..."
python3 << 'PYEOF'
filepath = "/etc/nginx/sites-enabled/siempriapp"
with open(filepath, 'r') as f:
    content = f.read()

# Fix: Change "location /api/" to "location ^~ /api/" 
# This gives /api/ priority over the static file regex that intercepts .jpg etc
old = '    location /api/ {\n        client_max_body_size 100M;'
new = '    location ^~ /api/ {\n        client_max_body_size 100M;'

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)
    print("   [OK] location /api/ -> location ^~ /api/")
    print("        Ahora /api/ tiene prioridad sobre regex de archivos estaticos")
elif '^~ /api/' in content:
    print("   [--] Ya estaba corregido")
else:
    print("   [!!] Patron no encontrado, intentando alternativa...")
    # Try without exact whitespace
    import re
    new_content = re.sub(r'location\s+/api/\s*\{(\s*\n\s*client_max_body_size)', r'location ^~ /api/ {\1', content)
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print("   [OK] Corregido con regex")
    else:
        print("   [!!] NO SE PUDO CORREGIR - revisar manualmente")
PYEOF

# Verify nginx config
echo "   Verificando configuracion nginx..."
sudo nginx -t 2>&1 && echo "   [OK] nginx config valida" || { echo "   [!!] nginx config INVALIDA - restaurando backup"; cp "$BACKUP_DIR/siempriapp.nginx.bak" /etc/nginx/sites-enabled/siempriapp; sudo nginx -t; exit 1; }

# ---- STEP 3: FIX APP.JS (Settings for technician) ----
echo ""
echo "[3/5] Corrigiendo App.js (Settings para tecnico)..."
python3 << 'PYEOF'
filepath = "/opt/siempria-monitor/frontend/src/App.js"
with open(filepath, 'r') as f:
    content = f.read()

fixes = 0

# Fix 1: Change settings TabsContent from isAdmin to canAccessSection
old_settings = '{isAdmin && <TabsContent value="settings">'
new_settings = '{canAccessSection(\'settings\') && <TabsContent value="settings">'

if old_settings in content:
    content = content.replace(old_settings, new_settings)
    fixes += 1
    print("   [OK] Settings TabsContent: isAdmin -> canAccessSection('settings')")
elif "canAccessSection('settings') && <TabsContent" in content:
    print("   [--] Settings TabsContent ya corregido")
else:
    print("   [!!] Patron Settings TabsContent no encontrado")

# Fix 2: Wrap admin-only panels inside Settings, keep AI and Maintenance visible for all
# Replace the inner div content to conditionally show admin-only panels
old_inner = '''            <div className="space-y-6">
              <SystemStatusDashboard authAxios={authAxios} />
              <AIInsightsPanel authAxios={authAxios} />
              <SLAReportsPanel authAxios={authAxios} organizations={organizations} />
              <IntegrationsPanel settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />
              <TelegramSettings settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />
              <MaintenancePanel authAxios={authAxios} devices={devices} onRefresh={fetchAll} />
              {/* DahuaDevicesPanel removed from Settings - grabadores now appear in MaintenancePanel list */}
              <NotificationSettings />
              <ReportSettings authAxios={authAxios} />
              <SecurityPanel />
              <Fail2banPanel authAxios={authAxios} />
              <ScheduledReportsPanel organizations={organizations} authAxios={authAxios} />
              <DailyReportPanel authAxios={authAxios} />
              <BackupPanel authAxios={authAxios} />
            </div>'''

new_inner = '''            <div className="space-y-6">
              {isAdmin && <SystemStatusDashboard authAxios={authAxios} />}
              <AIInsightsPanel authAxios={authAxios} />
              {isAdmin && <SLAReportsPanel authAxios={authAxios} organizations={organizations} />}
              {isAdmin && <IntegrationsPanel settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />}
              {isAdmin && <TelegramSettings settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />}
              <MaintenancePanel authAxios={authAxios} devices={devices} onRefresh={fetchAll} />
              {/* DahuaDevicesPanel removed from Settings - grabadores now appear in MaintenancePanel list */}
              {isAdmin && <NotificationSettings />}
              {isAdmin && <ReportSettings authAxios={authAxios} />}
              {isAdmin && <SecurityPanel />}
              {isAdmin && <Fail2banPanel authAxios={authAxios} />}
              {isAdmin && <ScheduledReportsPanel organizations={organizations} authAxios={authAxios} />}
              {isAdmin && <DailyReportPanel authAxios={authAxios} />}
              {isAdmin && <BackupPanel authAxios={authAxios} />}
            </div>'''

if old_inner in content:
    content = content.replace(old_inner, new_inner)
    fixes += 1
    print("   [OK] Paneles admin-only envueltos con {isAdmin && ...}")
    print("        Tecnico ve: AIInsightsPanel + MaintenancePanel")
elif '{isAdmin && <SystemStatusDashboard' in content:
    print("   [--] Paneles ya estaban envueltos")
else:
    print("   [!!] Patron de paneles no encontrado exacto")
    print("        Intentando busqueda flexible...")
    # Try a more flexible approach
    if '<SystemStatusDashboard' in content and '{isAdmin && <SystemStatusDashboard' not in content:
        content = content.replace(
            '              <SystemStatusDashboard authAxios={authAxios} />',
            '              {isAdmin && <SystemStatusDashboard authAxios={authAxios} />}'
        )
        content = content.replace(
            '              <SLAReportsPanel authAxios={authAxios} organizations={organizations} />',
            '              {isAdmin && <SLAReportsPanel authAxios={authAxios} organizations={organizations} />}'
        )
        content = content.replace(
            '              <IntegrationsPanel settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />',
            '              {isAdmin && <IntegrationsPanel settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />}'
        )
        content = content.replace(
            '              <TelegramSettings settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />',
            '              {isAdmin && <TelegramSettings settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />}'
        )
        content = content.replace(
            '              <NotificationSettings />',
            '              {isAdmin && <NotificationSettings />}'
        )
        content = content.replace(
            '              <ReportSettings authAxios={authAxios} />',
            '              {isAdmin && <ReportSettings authAxios={authAxios} />}'
        )
        content = content.replace(
            '              <SecurityPanel />',
            '              {isAdmin && <SecurityPanel />}'
        )
        content = content.replace(
            '              <Fail2banPanel authAxios={authAxios} />',
            '              {isAdmin && <Fail2banPanel authAxios={authAxios} />}'
        )
        content = content.replace(
            '              <ScheduledReportsPanel organizations={organizations} authAxios={authAxios} />',
            '              {isAdmin && <ScheduledReportsPanel organizations={organizations} authAxios={authAxios} />}'
        )
        content = content.replace(
            '              <DailyReportPanel authAxios={authAxios} />',
            '              {isAdmin && <DailyReportPanel authAxios={authAxios} />}'
        )
        content = content.replace(
            '              <BackupPanel authAxios={authAxios} />',
            '              {isAdmin && <BackupPanel authAxios={authAxios} />}'
        )
        fixes += 1
        print("   [OK] Paneles envueltos individualmente")

with open(filepath, 'w') as f:
    f.write(content)

print(f"   Total: {fixes} correcciones en App.js")
PYEOF

# ---- STEP 4: REBUILD FRONTEND ----
echo ""
echo "[4/5] Reconstruyendo frontend (esto tarda ~1-2 min)..."
cd "$MONITOR_DIR/frontend"
npx craco build 2>&1 | tail -5
BUILD_EXIT=$?
if [ $BUILD_EXIT -eq 0 ]; then
    echo "   [OK] Frontend reconstruido"
else
    echo "   [!!] Error en build. Restaurando App.js..."
    cp "$BACKUP_DIR/App.js.bak" "$MONITOR_DIR/frontend/src/App.js"
    echo "   Ejecuta manualmente: cd $MONITOR_DIR/frontend && npx craco build"
    exit 1
fi

# ---- STEP 5: RESTART SERVICES ----
echo ""
echo "[5/5] Reiniciando servicios..."
sudo nginx -s reload
echo "   [OK] nginx recargado"

echo ""
echo "============================================"
echo "  FIX v6 APLICADO CORRECTAMENTE"
echo "============================================"
echo ""
echo "  Cambios:"
echo "  1. Nginx: /api/ ahora tiene prioridad (^~)"
echo "     sobre regex de archivos estaticos"
echo "     -> Las imagenes .jpg de la API ya no dan 404"
echo "  2. App.js: Settings tab accesible para tecnico"
echo "     Tecnico ve: AIInsights + MaintenancePanel"
echo "     Admin ve: todos los paneles"
echo "  3. Frontend reconstruido con craco build"
echo ""
echo "  Backup: $BACKUP_DIR"
echo ""
echo "  VERIFICAR:"
echo "  1. Galeria: imagenes deben cargar (thumbnails)"
echo "  2. aray -> Config: debe ver IA y Mantenimiento"
echo "  3. admin -> Config: debe ver TODO como antes"
echo "============================================"
