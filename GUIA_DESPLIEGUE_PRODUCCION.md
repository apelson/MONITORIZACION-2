# Guía de Despliegue a Producción - Siempria Network Monitor

## Resumen del Problema
El código en el entorno de desarrollo tiene todas las correcciones implementadas, pero el servidor de producción (`siempriapp.com`) ejecuta una versión antigua.

## Pasos para Desplegar

### Paso 1: Guardar en GitHub (CRÍTICO)
En Emergent, haz clic en el botón **"Save to GitHub"** para subir todos los cambios.

### Paso 2: Conectar al Servidor de Producción
```bash
ssh usuario@tu-servidor
# o si usas clave:
ssh -i tu-clave.pem usuario@tu-servidor
```

### Paso 3: Ejecutar el Script de Actualización
```bash
cd /home/monitorizacion/Documentos/MONITORIZACION-main
./update_production.sh
```

### Paso 4: Verificación
1. **Abrir** https://siempriapp.com en **modo incógnito** (Ctrl+Shift+N)
2. **Probar login incorrecto** → Debe mostrar "Credenciales inválidas" en rojo
3. **Login correcto** → Dashboard debe cargar
4. **Pestaña Alerts** → Debe mostrar más de 50 alertas si hay
5. **Pestaña Infrastructure** → Puedes añadir dispositivos OpenVPN

## ¿Qué hacer si falla?

### Error: "craco not found"
```bash
cd /home/monitorizacion/Documentos/MONITORIZACION-main/frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Error: npm dependency conflicts
```bash
npm install --legacy-peer-deps --force
```

### Frontend se ve en blanco o API no responde
El problema es que falta `REACT_APP_BACKEND_URL`. Crear archivo:
```bash
cat > /home/monitorizacion/Documentos/MONITORIZACION-main/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://siempriapp.com
GENERATE_SOURCEMAP=false
EOF
npm run build
sudo cp -r build/* /opt/siempria-monitor/frontend/
sudo systemctl restart nginx
```

### Verificar servicios
```bash
sudo systemctl status siempria-backend
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

## Correcciones Incluidas en Esta Versión

| Funcionalidad | Estado |
|---------------|--------|
| Login con error visible | ✅ Implementado |
| Sin límite de 50 alertas | ✅ Implementado |
| Auto-cierre popup 60s | ✅ Implementado |
| ESXi SSH fallback | ✅ Implementado |
| Synology pantalla blanca | ✅ Corregido |
| OpenVPN monitoring | ✅ Nuevo |
| Barras de carga | ✅ Implementado |

## Contacto
Si sigues teniendo problemas después de seguir estos pasos, necesitamos:
1. Salida de `sudo systemctl status siempria-backend`
2. Salida de `cat /var/log/nginx/error.log | tail -50`
3. Contenido de `/opt/siempria-monitor/frontend/.env` (si existe)
