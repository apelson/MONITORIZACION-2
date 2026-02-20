#!/bin/bash
# ============================================
# Fix Header Tabs - Single Line with Scroll
# ============================================

set -e

FRONTEND_DIR="/opt/siempria-monitor/frontend"

echo "=========================================="
echo "  Arreglando tabs del header"
echo "=========================================="

# Fix the TabsList to use horizontal scroll instead of wrapping
python3 << 'PYTHON_SCRIPT'
import re

with open('/opt/siempria-monitor/frontend/src/App.js', 'r') as f:
    content = f.read()

# Find TabsList and modify its className to prevent wrapping and add horizontal scroll
# Pattern 1: TabsList with flex-wrap
content = re.sub(
    r'(<TabsList\s+className=")([^"]*flex-wrap[^"]*)"',
    r'\1flex overflow-x-auto scrollbar-hide whitespace-nowrap gap-1 pb-1"',
    content
)

# Pattern 2: TabsList without flex-wrap but with other classes
content = re.sub(
    r'(<TabsList\s+className=")(h-auto\s+flex\s+justify-center\s+gap-1\s+bg-transparent\s+p-1)"',
    r'\1h-auto flex justify-start overflow-x-auto scrollbar-hide whitespace-nowrap gap-1 bg-transparent p-1 max-w-full"',
    content
)

# Pattern 3: Alternative pattern
content = re.sub(
    r'(<TabsList\s+className=")(h-auto flex flex-wrap justify-center gap-1 bg-transparent p-1)"',
    r'\1h-auto flex justify-start overflow-x-auto scrollbar-hide whitespace-nowrap gap-1 bg-transparent p-1"',
    content
)

# Make TabsTrigger smaller
content = re.sub(
    r'(TabsTrigger[^>]*className="[^"]*)(text-sm\s+px-3\s+py-1\.5)',
    r'\1text-xs px-2 py-1',
    content
)

with open('/opt/siempria-monitor/frontend/src/App.js', 'w') as f:
    f.write(content)

print("TabsList updated for horizontal scroll")
PYTHON_SCRIPT

# Add scrollbar-hide CSS if not exists
if ! grep -q "scrollbar-hide" "$FRONTEND_DIR/src/index.css"; then
    echo "" >> "$FRONTEND_DIR/src/index.css"
    echo "/* Hide scrollbar for tabs */" >> "$FRONTEND_DIR/src/index.css"
    echo ".scrollbar-hide::-webkit-scrollbar { display: none; }" >> "$FRONTEND_DIR/src/index.css"
    echo ".scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }" >> "$FRONTEND_DIR/src/index.css"
    echo "CSS scrollbar-hide added"
fi

echo ""
echo "=========================================="
echo "  ¡Header tabs arreglado!"
echo "=========================================="
echo ""
echo "Ejecuta:"
echo "  cd /opt/siempria-monitor/frontend && yarn build"
echo ""
