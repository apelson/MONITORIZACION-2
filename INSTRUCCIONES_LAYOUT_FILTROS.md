# Instrucciones para actualizar el layout de filtros en producción

## Cambios realizados

El nuevo layout de filtros tiene las siguientes mejoras:

1. **Botón "Stats"** ahora está a la derecha de los filtros
2. **Resumen de tipos de dispositivos** centrado debajo de los filtros (ej: "9 dispositivos • 4 Cámara • 1 NAS")
3. **Botón "Limpiar"** ahora está en la fila del resumen

## Archivos modificados

- `/opt/siempria-monitor/frontend/src/App.js` - Sección de filtros (líneas ~2715-2810)

## Instrucciones de actualización

### Opción 1: Copiar el archivo App.js completo

```bash
# En tu servidor de producción
cd /opt/siempria-monitor/frontend/src

# Hacer backup del archivo actual
cp App.js App.js.backup_$(date +%Y%m%d)

# Subir el nuevo archivo App.js desde el entorno de preview
# (Usar curl, scp, o copiar manualmente el contenido)

# Rebuild y deploy
cd /opt/siempria-monitor/frontend
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
```

### Opción 2: Aplicar solo el cambio del layout

Buscar en `/opt/siempria-monitor/frontend/src/App.js` la sección que comienza con:

```javascript
          <TabsContent value="devices">
            {/* Filters - not for operators, available for technicians */}
            {!isOperator && (
              <div className="flex gap-2 mb-4 sm:mb-6 flex-wrap items-center">
```

Y reemplazarla con la nueva estructura (ver archivo de referencia en el entorno de preview).

## Verificación

Después de desplegar, verificar que:

1. El botón "Stats" esté a la derecha de los filtros
2. El resumen de tipos de dispositivos aparezca centrado debajo de los filtros
3. El botón "Limpiar" aparezca solo cuando hay filtros activos
