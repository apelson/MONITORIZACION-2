#!/bin/bash
set -e

MONITOR_DIR="/opt/siempria-monitor"
BACKUP_DIR="$MONITOR_DIR/backups/$(date +%Y%m%d_%H%M%S)"
SERVICE_NAME="siempria-backend"

echo "============================================"
echo "  FIX v5: Imagenes + Permisos AI Tecnico"
echo "============================================"

# ---- STEP 1: BACKUP ----
echo ""
echo "[1/4] Creando backup..."
mkdir -p "$BACKUP_DIR"
cp "$MONITOR_DIR/backend/routes/device_photos.py" "$BACKUP_DIR/" 2>/dev/null || true
cp "$MONITOR_DIR/backend/routes/device_images.py" "$BACKUP_DIR/" 2>/dev/null || true
echo "   Backup en: $BACKUP_DIR"

# ---- STEP 2: FIX IMAGE ENDPOINTS (remove auth from file serving) ----
echo ""
echo "[2/4] Corrigiendo endpoints de imagenes..."
python3 << 'PYEOF'
import re

# Fix device_photos.py - make file serving public
filepath = "/opt/siempria-monitor/backend/routes/device_photos.py"
with open(filepath, 'r') as f:
    content = f.read()

changed = False

# Find the file serving endpoint and remove auth requirement
# Pattern: async def serve_device_photo(filename: str, current_user: dict = Depends(get_current_user)):
# Replace with: async def serve_device_photo(filename: str):
patterns_to_fix = [
    # Pattern 1: serve_device_photo with auth
    (r'async def serve_device_photo\(filename:\s*str,\s*current_user:\s*dict\s*=\s*Depends\(get_current_user\)\)',
     'async def serve_device_photo(filename: str)'),
    # Pattern 2: get_device_photo_file with auth
    (r'async def get_device_photo_file\(filename:\s*str,\s*current_user:\s*dict\s*=\s*Depends\(get_current_user\)\)',
     'async def get_device_photo_file(filename: str)'),
    # Pattern 3: any /file/ endpoint with auth
    (r'(async def \w+photo\w*\(filename:\s*str),\s*current_user:\s*dict\s*=\s*Depends\(get_current_user\)\)',
     r'\1)'),
]

for old_pattern, new_pattern in patterns_to_fix:
    new_content = re.sub(old_pattern, new_pattern, content)
    if new_content != content:
        content = new_content
        changed = True
        print(f"   [OK] device_photos.py: Auth removida de endpoint /file/")
        break

if not changed:
    # Try direct string replacement as fallback
    if 'filename: str, current_user: dict = Depends(get_current_user))' in content:
        # Only replace in the file-serving function, not upload/delete functions
        # Find the /file/ route section
        lines = content.split('\n')
        new_lines = []
        in_file_route = False
        for i, line in enumerate(lines):
            if '/file/' in line and '@router.get' in line:
                in_file_route = True
            if in_file_route and 'filename: str, current_user: dict = Depends(get_current_user))' in line:
                line = line.replace('filename: str, current_user: dict = Depends(get_current_user))', 'filename: str)')
                in_file_route = False
                changed = True
                print(f"   [OK] device_photos.py: Auth removida (linea {i+1})")
            new_lines.append(line)
        content = '\n'.join(new_lines)

if not changed:
    print("   [!!] device_photos.py: No se encontro patron para modificar")
    print("        Intentando agregar endpoint publico...")
    # Check if there's already a /file/ endpoint
    if '/file/' in content:
        print("        Endpoint /file/ existe pero no se pudo modificar")
        # Show the relevant lines for debugging
        for i, line in enumerate(content.split('\n'), 1):
            if '/file/' in line or ('serve' in line.lower() and 'photo' in line.lower()):
                print(f"        L{i}: {line.strip()}")
    else:
        # Add a public file endpoint
        endpoint = '''

@router.get("/file/{filename}")
async def serve_device_photo_public(filename: str):
    """Serve a device photo file - public endpoint for img tags"""
    import os
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    ext = os.path.splitext(filename)[1].lower()
    content_types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    media_type = content_types.get(ext, 'application/octet-stream')
    return FileResponse(str(file_path), media_type=media_type)
'''
        content += endpoint
        changed = True
        print("   [OK] device_photos.py: Endpoint publico /file/ agregado")

if changed:
    with open(filepath, 'w') as f:
        f.write(content)
    print("   device_photos.py guardado")

# Also fix device_images.py if it has file serving endpoints
filepath2 = "/opt/siempria-monitor/backend/routes/device_images.py"
try:
    with open(filepath2, 'r') as f:
        content2 = f.read()
    
    changed2 = False
    # Check for /file/ or image serving endpoints with auth
    if '/file/' in content2 or 'image_file' in content2.lower():
        lines = content2.split('\n')
        new_lines = []
        in_file_route = False
        for i, line in enumerate(lines):
            if ('/file/' in line or '/image/' in line) and '@router.get' in line:
                in_file_route = True
            if in_file_route and 'current_user: dict = Depends(get_current_user))' in line:
                line = line.replace(', current_user: dict = Depends(get_current_user))', ')')
                in_file_route = False
                changed2 = True
                print(f"   [OK] device_images.py: Auth removida de endpoint de archivo")
            new_lines.append(line)
        if changed2:
            content2 = '\n'.join(new_lines)
            with open(filepath2, 'w') as f:
                f.write(content2)
            print("   device_images.py guardado")
        else:
            print("   [--] device_images.py: Sin cambios necesarios")
    else:
        print("   [--] device_images.py: No tiene endpoint de archivos")
except Exception as e:
    print(f"   [--] device_images.py: {e}")

PYEOF

# ---- STEP 3: ADD AI PERMISSIONS TO TECHNICIAN ROLE ----
echo ""
echo "[3/4] Agregando permisos AI al rol Tecnico..."
python3 << 'PYEOF'
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client.siempria_monitor

# Update technician role to include AI permissions
result = db.roles.update_one(
    {"id": "technician"},
    {"$set": {
        "permissions.ai": ["view"],
        "permissions.predictions": ["view"],
    }}
)

if result.modified_count > 0:
    print("   [OK] Rol 'technician' actualizado: ai=['view'], predictions=['view']")
else:
    # Check if already set
    role = db.roles.find_one({"id": "technician"}, {"permissions.ai": 1, "permissions.predictions": 1})
    if role and role.get("permissions", {}).get("ai"):
        print("   [--] Permisos AI ya existian en rol technician")
    else:
        print("   [!!] No se pudo actualizar el rol technician")

# Verify
role = db.roles.find_one({"id": "technician"}, {"_id": 0, "permissions": 1})
if role:
    perms = role.get("permissions", {})
    ai = perms.get("ai", [])
    pred = perms.get("predictions", [])
    print(f"   Verificacion: ai={ai}, predictions={pred}")

client.close()
PYEOF

# ---- STEP 4: RESTART ----
echo ""
echo "[4/4] Reiniciando servicio..."
sudo systemctl restart "$SERVICE_NAME"
sleep 3

if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo ""
    echo "============================================"
    echo "  FIX v5 APLICADO CORRECTAMENTE"
    echo "============================================"
    echo ""
    echo "  Cambios realizados:"
    echo "  1. device_photos.py: Endpoint /file/ ahora"
    echo "     es publico (las imagenes cargan sin auth)"
    echo "  2. Rol Tecnico: agregados permisos de IA"
    echo "     y predicciones"
    echo ""
    echo "  Backup: $BACKUP_DIR"
    echo ""
    echo "  VERIFICAR:"
    echo "  1. Login como admin -> Galeria: imagenes visibles"
    echo "  2. Login como aray -> Configuracion: ver IA"
    echo "  3. Galeria: imagenes se muestran correctamente"
    echo "============================================"
else
    echo ""
    echo "[!] SERVICIO NO ARRANCO"
    echo "  Restaurar: cp $BACKUP_DIR/* $MONITOR_DIR/backend/routes/"
    echo "  sudo systemctl restart $SERVICE_NAME"
    echo "  Ver logs: sudo journalctl -u $SERVICE_NAME -n 30"
fi
