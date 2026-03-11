# Solucion para Acceso Local a las Plataformas

## El Problema
Desde fuera de tu red (internet), ambas plataformas funcionan correctamente:
- `siempriapp.com` 
- `conteo.siempriapp.com`

Desde tu red local, no puedes acceder porque tu router no soporta **NAT Hairpin** (tambien llamado NAT Loopback). Esto significa que cuando tu PC intenta resolver `conteo.siempriapp.com`, el DNS devuelve tu IP publica, pero tu router no puede redirigir esa peticion de vuelta a tu propio servidor.

## Solucion: Editar archivo hosts en tu PC Windows

### Pasos:

1. **Abrir Notepad como Administrador**:
   - Busca "Notepad" en el menu de inicio
   - Click derecho > **Ejecutar como administrador**

2. **Abrir el archivo hosts**:
   - Archivo > Abrir
   - Navega a: `C:\Windows\System32\drivers\etc\`
   - Cambia el filtro de "Documentos de texto" a **"Todos los archivos"**
   - Selecciona el archivo `hosts`

3. **Agregar estas lineas al final del archivo**:
   ```
   192.168.1.76    siempriapp.com
   192.168.1.76    conteo.siempriapp.com
   ```

4. **Guardar** el archivo (Ctrl+S)

5. **Limpiar cache DNS** (abrir CMD como admin):
   ```
   ipconfig /flushdns
   ```

6. **Probar acceso**:
   - Abre el navegador y ve a `https://siempriapp.com`
   - Abre otra pestana y ve a `https://conteo.siempriapp.com`

### Nota importante:
- La IP `192.168.1.76` debe ser la IP local de tu servidor. Si cambia, actualiza el archivo hosts.
- Esto solo afecta al PC donde lo configures. Repite en cada PC de la red local que necesite acceso.
- Si en el futuro tu router soporta NAT Hairpin, podras eliminar estas lineas.

## Verificacion en el Servidor

En el servidor, asegurate de que:

1. El archivo `/etc/hosts` NO tenga entradas de `conteo.siempriapp.com` ni `siempriapp.com` apuntando a 127.0.0.1 (excepto localhost).

2. La configuracion de Nginx para conteo (`/etc/nginx/sites-available/conteo`) tenga:
   ```
   server_name conteo.siempriapp.com;
   ```
   (SIN la IP del servidor en server_name)

3. La configuracion principal (`/etc/nginx/sites-available/siempriapp`) tenga:
   ```
   server_name siempriapp.com;
   ```

4. Verificar que Nginx no tenga conflictos:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Script de verificacion del servidor

```bash
#!/bin/bash
echo "=== Verificando /etc/hosts ==="
grep -n "siempriapp\|conteo" /etc/hosts || echo "OK: No hay entradas problematicas"

echo ""
echo "=== Verificando Nginx conteo ==="
grep "server_name" /etc/nginx/sites-available/conteo 2>/dev/null || echo "Archivo no encontrado"

echo ""
echo "=== Verificando Nginx principal ==="
grep "server_name" /etc/nginx/sites-available/siempriapp 2>/dev/null || echo "Archivo no encontrado"

echo ""
echo "=== Test Nginx ==="
sudo nginx -t

echo ""
echo "=== Servicios ==="
sudo systemctl status siempria-conteo.service --no-pager -l | head -5
sudo systemctl status siempria-backend.service --no-pager -l | head -5
```
