#!/usr/bin/env python3
"""
Fase 4 - Refactorización App.js
Extrae DeviceFormDialog y OrganizationFormDialog a /components/dialogs/
"""
import os
import re
import sys
import shutil
from datetime import datetime

APP_JS = "/opt/siempria-monitor/frontend/src/App.js"
DIALOGS_DIR = "/opt/siempria-monitor/frontend/src/components/dialogs"
BACKUP_PATH = f"/opt/siempria-monitor/frontend/src/App.js.backup_fase4_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

# ============================================
# 1. Backup y lectura
# ============================================
shutil.copy2(APP_JS, BACKUP_PATH)
print(f"[BACKUP] {BACKUP_PATH}")

with open(APP_JS, 'r', encoding='utf-8') as f:
    lines = f.readlines()

total_before = len(lines)
print(f"[INFO] App.js: {total_before} lineas")

# ============================================
# 2. Encontrar limites de componentes
# ============================================
def find_component(lines, name):
    """Encuentra inicio y fin de un componente const X = (...) => { ... };"""
    start = None
    for i, line in enumerate(lines):
        if f'const {name}' in line and '=>' in line:
            start = i
            break
    if start is None:
        print(f"[ERROR] No se encontro {name}")
        sys.exit(1)

    brace_count = 0
    started = False
    for i in range(start, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                brace_count += 1
                started = True
            elif ch == '}':
                brace_count -= 1
        if started and brace_count == 0:
            return start, i
    print(f"[ERROR] No se encontro cierre de {name}")
    sys.exit(1)

d_start, d_end = find_component(lines, 'DeviceFormDialog')
o_start, o_end = find_component(lines, 'OrganizationFormDialog')

print(f"[ENCONTRADO] DeviceFormDialog: lineas {d_start+1}-{d_end+1} ({d_end - d_start + 1} lineas)")
print(f"[ENCONTRADO] OrganizationFormDialog: lineas {o_start+1}-{o_end+1} ({o_end - o_start + 1} lineas)")

# Verificacion de seguridad
assert d_end < o_start, "ERROR: Los componentes se solapan"

# ============================================
# 3. Extraer codigo
# ============================================
d_code = ''.join(lines[d_start:d_end+1])
o_code = ''.join(lines[o_start:o_end+1])

# ============================================
# 4. Analizar dependencias automaticamente
# ============================================
ALL_ICONS = [
    'Server', 'Plus', 'RefreshCw', 'Settings', 'History', 'Bell', 'Trash2', 'Edit',
    'Activity', 'Clock', 'AlertCircle', 'Wifi', 'WifiOff', 'Mail', 'Send', 'Users',
    'FolderOpen', 'LogOut', 'User', 'Shield', 'Eye', 'Lock', 'ChevronDown', 'Building2',
    'Camera', 'HardDrive', 'Network', 'Router', 'Monitor', 'Printer', 'Box', 'ChevronRight',
    'MapPin', 'FileText', 'Image', 'Tag', 'Layers', 'Download', 'FileSpreadsheet', 'FileIcon',
    'Info', 'Globe', 'Calendar', 'Copy', 'Cctv', 'ExternalLink', 'GripVertical', 'Phone',
    'BarChart3', 'TrendingUp', 'Flame', 'ArrowUpDown', 'Wrench', 'Trophy', 'PieChart', 'Upload',
    'Archive', 'RotateCcw', 'CloudDownload', 'FolderArchive', 'FileSearch', 'AlertTriangle',
    'Cpu', 'Thermometer', 'X', 'Search', 'ClipboardList', 'CheckCircle',
    'MessageSquare', 'Smartphone', 'Volume2', 'VolumeX', 'Database', 'VideoOff', 'Video',
    'Menu', 'PlayCircle', 'Store'
]

UI_MAP = {
    '@/components/ui/button': ['Button'],
    '@/components/ui/input': ['Input'],
    '@/components/ui/card': ['Card', 'CardContent', 'CardHeader', 'CardTitle', 'CardDescription'],
    '@/components/ui/badge': ['Badge'],
    '@/components/ui/dialog': ['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter'],
    '@/components/ui/label': ['Label'],
    '@/components/ui/tabs': ['Tabs', 'TabsContent', 'TabsList', 'TabsTrigger'],
    '@/components/ui/skeleton': ['Skeleton'],
    '@/components/ui/scroll-area': ['ScrollArea'],
    '@/components/ui/separator': ['Separator'],
    '@/components/ui/select': ['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'],
    '@/components/ui/switch': ['Switch'],
    '@/components/ui/dropdown-menu': ['DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuSeparator', 'DropdownMenuTrigger'],
    '@/components/ui/textarea': ['Textarea'],
    '@/components/ui/collapsible': ['Collapsible', 'CollapsibleContent', 'CollapsibleTrigger'],
    '@/components/ui/popover': ['Popover', 'PopoverContent', 'PopoverTrigger'],
}

REACT_HOOKS = ['useState', 'useEffect', 'useCallback', 'useContext', 'useMemo', 'useRef', 'memo', 'createContext']

def used(code, symbol):
    return bool(re.search(r'\b' + re.escape(symbol) + r'\b', code))

def build_imports(code):
    parts = []

    # React
    rh = [h for h in REACT_HOOKS if used(code, h)]
    if rh:
        parts.append(f'import {{ {", ".join(rh)} }} from "react";')

    # i18n
    if used(code, 'useTranslation'):
        parts.append('import { useTranslation } from "react-i18next";')

    # axios
    if used(code, 'axios'):
        parts.append('import axios from "axios";')

    # sonner
    if used(code, 'toast'):
        parts.append('import { toast } from "sonner";')

    # Lucide icons
    icons = [ic for ic in ALL_ICONS if used(code, ic)]
    # HardDriveIcon alias
    if used(code, 'HardDriveIcon'):
        icons.append('HardDrive as HardDriveIcon')
    if icons:
        parts.append(f'import {{ {", ".join(icons)} }} from "lucide-react";')

    # UI components
    for path, components in UI_MAP.items():
        u = [c for c in components if used(code, c)]
        if u:
            parts.append(f'import {{ {", ".join(u)} }} from "{path}";')

    # AuthContext (extraido en Fase 2)
    if used(code, 'useAuth'):
        parts.append('import { useAuth } from "@/contexts/AuthContext";')

    return '\n'.join(parts)

# ============================================
# 5. Crear archivos
# ============================================
os.makedirs(DIALOGS_DIR, exist_ok=True)

# DeviceFormDialog.jsx
d_imports = build_imports(d_code)
d_content = f'{d_imports}\n\n{d_code}\n\nexport default DeviceFormDialog;\n'
d_path = os.path.join(DIALOGS_DIR, "DeviceFormDialog.jsx")
with open(d_path, 'w', encoding='utf-8') as f:
    f.write(d_content)
print(f"[CREADO] {d_path} ({len(d_content.splitlines())} lineas)")

# OrganizationFormDialog.jsx
o_imports = build_imports(o_code)
o_content = f'{o_imports}\n\n{o_code}\n\nexport default OrganizationFormDialog;\n'
o_path = os.path.join(DIALOGS_DIR, "OrganizationFormDialog.jsx")
with open(o_path, 'w', encoding='utf-8') as f:
    f.write(o_content)
print(f"[CREADO] {o_path} ({len(o_content.splitlines())} lineas)")

# ============================================
# 6. Actualizar App.js
# ============================================
# Encontrar el inicio de la seccion DIALOGS (comentario)
remove_start = d_start
for i in range(d_start - 1, max(d_start - 5, -1), -1):
    stripped = lines[i].strip()
    if 'DIALOG' in stripped.upper() and stripped.startswith('//'):
        remove_start = i
        break
    elif stripped == '':
        # Incluir linea en blanco antes del comentario
        remove_start = i
        continue
    else:
        break

# Verificar si hay linea en blanco despues de OrganizationFormDialog
remove_end = o_end + 1  # exclusivo para slicing

# Si la linea siguiente es blanca, incluirla en la eliminacion
if remove_end < len(lines) and lines[remove_end].strip() == '':
    remove_end += 1

print(f"[ELIMINANDO] Lineas {remove_start+1} a {remove_end} de App.js")

# Construir nuevo contenido
new_lines = lines[:remove_start] + lines[remove_end:]

# Insertar imports despues del ultimo import existente
last_import_idx = 0
for i, line in enumerate(new_lines):
    stripped = line.strip()
    if stripped.startswith('import ') and 'from' in stripped:
        last_import_idx = i

new_imports = [
    'import DeviceFormDialog from "@/components/dialogs/DeviceFormDialog";\n',
    'import OrganizationFormDialog from "@/components/dialogs/OrganizationFormDialog";\n',
]

for j, imp in enumerate(new_imports):
    new_lines.insert(last_import_idx + 1 + j, imp)

# Escribir App.js actualizado
with open(APP_JS, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

total_after = len(new_lines)
removed = total_before - total_after

print(f"\n{'='*50}")
print(f"  FASE 4 COMPLETADA")
print(f"{'='*50}")
print(f"  Antes:     {total_before} lineas")
print(f"  Despues:   {total_after} lineas")
print(f"  Reduccion: {removed} lineas")
print(f"  Backup:    {BACKUP_PATH}")
print(f"{'='*50}")

# Reporte de lo que queda por refactorizar
print(f"\n[INFO] Componentes restantes despues de linea {remove_start+1}:")
remaining_lines = new_lines[remove_start:]
for i, line in enumerate(remaining_lines[:60]):
    actual_line = remove_start + i + 1
    if line.strip().startswith('const ') and ('=>' in line or 'function' in line.lower()):
        print(f"  Linea ~{actual_line}: {line.strip()[:80]}")
    elif line.strip().startswith('// ===='):
        print(f"  Linea ~{actual_line}: {line.strip()[:80]}")

print(f"\n[SIGUIENTE] Ejecuta:")
print(f"  cd /opt/siempria-monitor/frontend && npm run build")
