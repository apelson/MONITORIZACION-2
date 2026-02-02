# 🚀 Instrucciones de Actualización - Siempria Monitor

## Cambios Implementados:

### 1. **QNAP Authentication Mejorada** ✅
- Múltiples métodos de autenticación (3 métodos diferentes)
- Verificación de `authPassed=1` en respuesta XML
- Validación de SID con llamada de prueba
- Logs detallados para debugging

### 2. **ESXi VM Detection Mejorada** ✅
- Logs detallados en cada paso
- Mejor manejo de standalone ESXi vs vCenter
- MOB API mejorado con más información de debugging
- Detecta si ESXi realmente no tiene VMs

### 3. **Synology Data Mapping Corregido** ✅
- Extrae `disks` y `volumes` de `storage` correctamente
- Corrige error de sintaxis (coma extra)
- Mejor manejo de health status

### 4. **Optimizaciones de Rendimiento** ✅
- Polling reducido a 120s
- Prevención de llamadas concurrentes
- Login con feedback mejorado

---

## 📥 Comandos para Actualizar Tu Servidor:

```bash
# 1. Ve al repositorio clonado
cd /tmp/MONITORIZACION

# 2. Actualiza el repositorio (pull) para obtener los cambios más recientes
git pull origin main

# Si te pide credenciales, usa tu token de GitHub

# 3. Crear backup del backend actual
cp /opt/siempria-monitor/backend/services/infrastructure_service.py \
   /opt/siempria-monitor/backend/services/infrastructure_service.py.backup-$(date +%Y%m%d-%H%M)

# 4. Copiar archivos actualizados
cp /tmp/MONITORIZACION/backend/services/infrastructure_service.py \
   /opt/siempria-monitor/backend/services/

# 5. Copiar frontend optimizado
cp /tmp/MONITORIZACION/frontend/src/App.js \
   /opt/siempria-monitor/frontend/src/

cp /tmp/MONITORIZACION/frontend/src/components/panels/InfrastructurePanel.jsx \
   /opt/siempria-monitor/frontend/src/components/panels/

# 6. Rebuild frontend
cd /opt/siempria-monitor/frontend
npm run build

# 7. Reiniciar backend para cargar nuevos cambios
systemctl restart siempria-backend

# 8. Verificar que está funcionando
systemctl status siempria-backend

# 9. Ver logs en tiempo real
journalctl -u siempria-backend -f
```

---

## 🧪 Pruebas Recomendadas:

### 1. Probar QNAP Authentication:
```bash
# En otra terminal, ejecuta esto mientras ves los logs
# Desde la UI: Click en "ojo" de un dispositivo QNAP

# Deberías ver en los logs:
# "QNAP authenticated successfully with SID"
# o
# "QNAP authenticated with SID (method X)"
```

### 2. Probar ESXi VMs:
```bash
# Click en "ojo" de ESXi device

# Deberías ver en logs:
# "ESXi VM endpoint /api/vcenter/vm: status 200"
# "ESXi found X VMs via /api/vcenter/vm"
# o si es standalone:
# "ESXi: Attempting MOB approach for standalone ESXi"
# "ESXi MOB found X VM IDs"
```

### 3. Probar Synology:
```bash
# Click en "ojo" de Synology device

# Deberías ver los volúmenes y discos correctamente
```

---

## 🔧 Si QNAP sigue sin funcionar:

**El problema más común es credenciales incorrectas o usuario sin permisos.**

Verifica:
1. Usuario tiene permisos de administrador en QNAP
2. Contraseña es correcta (¡cuidado con caracteres especiales!)
3. QTS está actualizado (v4.x o v5.x)

**Para testing manual:**
```bash
# Test directo a QNAP
curl -k "https://192.168.1.3/cgi-bin/authLogin.cgi?user=administrador&pwd=TU_PASSWORD"

# Busca en la respuesta:
# <authPassed><![CDATA[1]]></authPassed>  ← BUENO
# <authPassed><![CDATA[0]]></authPassed>  ← MALO (credenciales incorrectas)
```

---

## 📊 Logs para Compartir si Hay Problemas:

```bash
# Captura los logs completos del backend
journalctl -u siempria-backend -n 200 --no-pager > /tmp/backend-logs.txt

# Envía el archivo /tmp/backend-logs.txt
```

---

## ✅ Checklist Final:

- [ ] Git pull completado
- [ ] Archivos copiados (backend + frontend)
- [ ] Frontend rebuilt (`npm run build`)
- [ ] Backend reiniciado (`systemctl restart`)
- [ ] Logs verificados (sin errores de Python)
- [ ] QNAP test (click en ojo)
- [ ] ESXi test (click en ojo)
- [ ] Synology test (click en ojo)

---

## 🎯 Resultado Esperado:

- **QNAP:** Debería autenticar y mostrar volúmenes + servicios
- **ESXi:** Debería mostrar VMs (si tiene alguna configurada)
- **Synology:** Debería mostrar discos (2) + volúmenes (1) + servicios

---

**Tiempo estimado:** 5-10 minutos
**Riesgo:** BAJO (tenemos backups automáticos)
