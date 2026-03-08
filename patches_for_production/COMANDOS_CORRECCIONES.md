# Comandos de Correcciones - NOC Dashboard

## Instrucciones para el servidor de producción 192.168.1.76

Ejecuta estos comandos en orden para aplicar las correcciones.

---

## 🔴 CORRECCIÓN 1: Panel "Estadísticas" (P0)

Primero, verifiquemos qué tienes actualmente en la pestaña "statistics":

```bash
# Ver qué componente está en la pestaña statistics
grep -A 20 "TabsContent value=\"statistics\"" /opt/siempria-monitor/frontend/src/App.js
```

**Si ves `NOCCompetitivo` en lugar de `BrandRankingPanel` y `StatisticsPanel`**, ejecuta este comando para reemplazar:

```bash
# Hacer backup primero
cp /opt/siempria-monitor/frontend/src/App.js /opt/siempria-monitor/frontend/src/App.js.backup.$(date +%Y%m%d_%H%M%S)

# Buscar y reemplazar el contenido de la pestaña statistics
sed -i '/<TabsContent value="statistics">/,/<\/TabsContent>/c\
          <TabsContent value="statistics">\
            <div className="space-y-6">\
              {/* Brand Ranking Section */}\
              <BrandRankingPanel authAxios={authAxios} />\
              \
              {/* Camera Statistics Section */}\
              <div className="border-t pt-6">\
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">\
                  <BarChart3 className="w-5 h-5" />\
                  Estadísticas de Cámaras (MxAnalytics)\
                </h3>\
                <StatisticsPanel devices={devices} groups={groups} authAxios={authAxios} />\
              </div>\
            </div>\
          </TabsContent>' /opt/siempria-monitor/frontend/src/App.js
```

**IMPORTANTE**: Verifica que los imports estén presentes al principio del archivo:
```bash
grep -n "import StatisticsPanel\|import BrandRankingPanel" /opt/siempria-monitor/frontend/src/App.js
```

Si no aparecen, añádelos:
```bash
# Añadir imports si no existen
sed -i '/import LiveViewer/a import StatisticsPanel from "@/components/panels/StatisticsPanel";' /opt/siempria-monitor/frontend/src/App.js
sed -i '/import StatisticsPanel/a import BrandRankingPanel from "@/components/panels/BrandRankingPanel";' /opt/siempria-monitor/frontend/src/App.js
```

---

## 🟠 CORRECCIÓN 2: Alinear Botones Flotantes (P1)

Los botones flotantes deben tener espaciado uniforme de 80px:

```bash
# CRAFloatingButton - ya está en top-1/3, mantener
# No necesita cambios

# LiveViewerFloatingButton - cambiar de 100px a 80px
sed -i "s/top: 'calc(33% + 100px)'/top: 'calc(33% + 80px)'/g" /opt/siempria-monitor/frontend/src/components/common/LiveViewerFloatingButton.jsx

# NOCCompetitivoFloatingButton - cambiar de 200px/300px a 160px
sed -i "s/top: 'calc(33% + 200px)'/top: 'calc(33% + 160px)'/g" /opt/siempria-monitor/frontend/src/components/common/NOCCompetitivoFloatingButton.jsx
sed -i "s/top: 'calc(33% + 300px)'/top: 'calc(33% + 160px)'/g" /opt/siempria-monitor/frontend/src/components/common/NOCCompetitivoFloatingButton.jsx
```

Verificar los cambios:
```bash
grep -n "top:" /opt/siempria-monitor/frontend/src/components/common/LiveViewerFloatingButton.jsx
grep -n "top:" /opt/siempria-monitor/frontend/src/components/common/NOCCompetitivoFloatingButton.jsx
```

---

## 🟠 CORRECCIÓN 3: Footer de NOCCompetitivo (P1)

Si el `NOCCompetitivo.jsx` tiene un footer con "Desarrollado por Siempria", cámbialo:

```bash
# Primero verificar si existe
grep -n "Desarrollado\|footer" /opt/siempria-monitor/frontend/src/components/panels/NOCCompetitivo.jsx
```

Si encuentra algo, reemplázalo con:
```bash
sed -i 's/Desarrollado por Siempria/WatchTower by Siempria/g' /opt/siempria-monitor/frontend/src/components/panels/NOCCompetitivo.jsx
```

---

## 🔄 REINICIAR SERVICIOS

Después de aplicar todos los cambios:

```bash
# Reconstruir frontend
cd /opt/siempria-monitor/frontend && npm run build

# Reiniciar nginx
sudo systemctl restart nginx
```

---

## ✅ VERIFICACIÓN

1. Abre el navegador y recarga la página con Ctrl+Shift+R
2. Ve a la pestaña "Estadísticas" - debe mostrar:
   - Panel de Ranking de Marcas (BrandRankingPanel)
   - Panel de Estadísticas de Cámaras (StatisticsPanel)
3. Verifica que los botones flotantes estén alineados verticalmente
4. Abre el NOC Competitivo (botón flotante naranja) y verifica el footer
