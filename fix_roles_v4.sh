#!/bin/bash
set -e

MONITOR_DIR="/opt/siempria-monitor"
BACKUP_DIR="$MONITOR_DIR/backups/$(date +%Y%m%d_%H%M%S)"
SERVICE_NAME="siempria-backend"

echo "============================================"
echo "  FIX v4: Permisos Tecnico + Galeria Fotos"
echo "============================================"

# ---- STEP 1: BACKUP ----
echo ""
echo "[1/5] Creando backup..."
mkdir -p "$BACKUP_DIR"
cp "$MONITOR_DIR/backend/routes/roles.py" "$BACKUP_DIR/" 2>/dev/null || true
cp "$MONITOR_DIR/backend/routes/device_photos.py" "$BACKUP_DIR/" 2>/dev/null || true
echo "   Backup en: $BACKUP_DIR"

# ---- STEP 2: FIX ROLES.PY ----
echo ""
echo "[2/5] Corrigiendo roles.py (permisos de usuario)..."
python3 << 'PYEOF'
filepath = "/opt/siempria-monitor/backend/routes/roles.py"
with open(filepath, 'r') as f:
    content = f.read()

fixes = 0

# Fix 1: get_user_role helper function
old1 = 'role_id = user.get("role_id", "admin")  # Default to admin for backwards compatibility'
new1 = 'role_id = user.get("role_id") or user.get("role", "admin")  # Check both role_id and role fields'
if old1 in content:
    content = content.replace(old1, new1)
    fixes += 1
    print("   [OK] get_user_role: fallback corregido")
else:
    # Try without comment
    old1b = 'role_id = user.get("role_id", "admin")'
    new1b = 'role_id = user.get("role_id") or user.get("role", "admin")'
    if old1b in content and new1 not in content:
        content = content.replace(old1b, new1b, 1)
        fixes += 1
        print("   [OK] get_user_role: fallback corregido (sin comentario)")
    elif new1 in content or new1b in content:
        print("   [--] get_user_role: ya estaba corregido")
    else:
        print("   [!!] get_user_role: patron no encontrado, revisar manualmente")

# Fix 2: my-permissions endpoint response
old2 = '"role_id": current_user.get("role_id", "admin"),'
new2 = '"role_id": current_user.get("role_id") or current_user.get("role", "admin"),'
if old2 in content:
    content = content.replace(old2, new2)
    fixes += 1
    print("   [OK] my-permissions: role_id corregido")
elif new2 in content:
    print("   [--] my-permissions: ya estaba corregido")
else:
    print("   [!!] my-permissions: patron no encontrado")

# Fix 3: user/{user_id}/permissions endpoint response
old3 = '"role_id": user.get("role_id", "admin"),'
new3 = '"role_id": user.get("role_id") or user.get("role", "admin"),'
if old3 in content:
    content = content.replace(old3, new3)
    fixes += 1
    print("   [OK] user-permissions: role_id corregido")
elif new3 in content:
    print("   [--] user-permissions: ya estaba corregido")
else:
    print("   [!!] user-permissions: patron no encontrado")

# Fix 4: delete_role - count users with role (check both fields)
old4 = 'users_with_role = await users_collection.count_documents({"role_id": role_id})'
new4 = 'users_with_role = await users_collection.count_documents({"$or": [{"role_id": role_id}, {"role": role_id}]})'
if old4 in content:
    content = content.replace(old4, new4)
    fixes += 1
    print("   [OK] delete_role: busqueda de usuarios corregida")
elif new4 in content:
    print("   [--] delete_role: ya estaba corregido")

with open(filepath, 'w') as f:
    f.write(content)

print(f"   Total: {fixes} correcciones aplicadas en roles.py")
PYEOF

# ---- STEP 3: FIX DEVICE_PHOTOS.PY ----
echo ""
echo "[3/5] Verificando endpoint de fotos..."
python3 << 'PYEOF'
filepath = "/opt/siempria-monitor/backend/routes/device_photos.py"
with open(filepath, 'r') as f:
    content = f.read()

needs_write = False

# Check if /file/{filename} endpoint exists
if '"/file/{filename}"' not in content and "'/file/{filename}'" not in content and '/file/' not in content:
    print("   [!!] Endpoint /file/{filename} NO existe. Agregando...")
    
    endpoint_code = '''

@router.get("/file/{filename}")
async def serve_device_photo(filename: str, current_user: dict = Depends(get_current_user)):
    """Serve a device photo file by filename"""
    import os
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    
    # Detect content type
    ext = os.path.splitext(filename)[1].lower()
    content_types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif',
        '.webp': 'image/webp', '.heic': 'image/heic',
        '.heif': 'image/heif', '.bmp': 'image/bmp'
    }
    media_type = content_types.get(ext, 'application/octet-stream')
    return FileResponse(str(file_path), media_type=media_type)
'''
    content += endpoint_code
    needs_write = True
    print("   [OK] Endpoint /file/{filename} agregado")
else:
    print("   [OK] Endpoint /file/{filename} ya existe")

# Ensure FileResponse is imported
if 'FileResponse' not in content:
    content = content.replace(
        'from fastapi import APIRouter',
        'from fastapi.responses import FileResponse\nfrom fastapi import APIRouter'
    )
    needs_write = True
    print("   [OK] FileResponse import agregado")

if needs_write:
    with open(filepath, 'w') as f:
        f.write(content)
    print("   device_photos.py actualizado")
else:
    print("   device_photos.py sin cambios necesarios")
PYEOF

# ---- STEP 4: DIAGNOSTIC ----
echo ""
echo "[4/5] Diagnostico rapido..."
python3 << 'PYEOF'
# Verify the fixes were applied
filepath = "/opt/siempria-monitor/backend/routes/roles.py"
with open(filepath, 'r') as f:
    content = f.read()

# Check the old bad pattern is gone
if 'user.get("role_id", "admin")' in content:
    print("   [WARN] Aun quedan patrones role_id con fallback admin!")
    # Find remaining instances
    for i, line in enumerate(content.split('\n'), 1):
        if 'user.get("role_id", "admin")' in line:
            print(f"          Linea {i}: {line.strip()}")
else:
    print("   [OK] Todos los fallbacks a admin eliminados de roles.py")

# Check new pattern exists
count = content.count('or user.get("role"') + content.count('or current_user.get("role"')
print(f"   [OK] {count} instancias con busqueda dual (role_id OR role)")
PYEOF

# ---- STEP 5: RESTART ----
echo ""
echo "[5/5] Reiniciando servicio..."
sudo systemctl restart "$SERVICE_NAME"
sleep 3

if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo ""
    echo "============================================"
    echo "  FIX v4 APLICADO CORRECTAMENTE"
    echo "============================================"
    echo ""
    echo "  Cambios realizados:"
    echo "  1. roles.py: get_user_role() ahora busca"
    echo "     campo 'role' si 'role_id' no existe"
    echo "  2. roles.py: my-permissions y user-permissions"
    echo "     devuelven el role_id correcto"
    echo "  3. device_photos.py: endpoint /file/ verificado"
    echo ""
    echo "  Backup: $BACKUP_DIR"
    echo ""
    echo "  VERIFICAR:"
    echo "  1. Login como aray / Spw@4902"
    echo "  2. Confirmar que tiene permisos de Tecnico"
    echo "     (no de admin)"
    echo "  3. Revisar la galeria de fotos"
    echo "============================================"
else
    echo ""
    echo "[!] SERVICIO NO ARRANCO"
    echo ""
    echo "  Restaurar backup:"
    echo "    cp $BACKUP_DIR/roles.py $MONITOR_DIR/backend/routes/roles.py"
    echo "    cp $BACKUP_DIR/device_photos.py $MONITOR_DIR/backend/routes/device_photos.py"
    echo "    sudo systemctl restart $SERVICE_NAME"
    echo ""
    echo "  Ver logs:"
    echo "    sudo journalctl -u $SERVICE_NAME -n 30"
fi
