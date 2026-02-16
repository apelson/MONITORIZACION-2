#!/bin/bash
echo "=========================================="
echo "  Optimización de Rendimiento - Siempria"
echo "=========================================="

cd /opt/siempria-monitor

# 1. Optimizar device_service.py (verificación en paralelo, timeout reducido)
echo "[1/4] Optimizando device_service.py..."
cat > backend/services/device_service.py << 'EOF'
"""
Device checking and monitoring service - OPTIMIZED
"""
import socket
import asyncio
from datetime import datetime, timezone
import uuid

from config import devices_collection, history_collection, logger
from services.email_service import create_alert

async def check_device_status(ip: str, port: int, timeout: float = 1.0) -> str:
    """Check if device is online with fast timeout"""
    try:
        loop = asyncio.get_event_loop()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = await loop.run_in_executor(None, lambda: sock.connect_ex((ip, port)))
        sock.close()
        return "online" if result == 0 else "offline"
    except Exception:
        return "offline"

async def check_single_device(device_id: str, background_alert: bool = True):
    device = await devices_collection.find_one({"id": device_id})
    if not device:
        return None
    
    new_status = await check_device_status(device["ip_address"], device["port"])
    old_status = device.get("status", "unknown")
    now = datetime.now(timezone.utc).isoformat()
    
    update = {"status": new_status, "last_check": now}
    if new_status == "online":
        update["last_online"] = now
    
    await devices_collection.update_one({"id": device_id}, {"$set": update})
    
    if old_status != new_status and old_status != "unknown":
        await history_collection.insert_one({
            "id": str(uuid.uuid4()),
            "device_id": device_id,
            "device_name": device.get("name", ""),
            "old_status": old_status,
            "new_status": new_status,
            "timestamp": now
        })
        if background_alert:
            alert_type = "device_down" if new_status == "offline" else "device_up"
            await create_alert(device, alert_type)
    
    return {"device_id": device_id, "status": new_status}

async def check_all_devices():
    """Check all devices in parallel batches - FAST"""
    logger.info("Starting device check...")
    devices = await devices_collection.find({}, {"_id": 0, "id": 1, "ip_address": 1, "port": 1}).to_list(length=None)
    
    # Process 30 devices at a time for speed
    batch_size = 30
    for i in range(0, len(devices), batch_size):
        batch = devices[i:i + batch_size]
        tasks = [check_single_device(d["id"], background_alert=True) for d in batch]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    logger.info(f"Completed check for {len(devices)} devices")

async def check_camera_nas_connection(device_id: str, storage_info: dict):
    pass
EOF
echo "   OK"

# 2. Actualizar config.py para reducir frecuencia de checks
echo "[2/4] Ajustando intervalos de verificación..."
# El intervalo se controla en server.py, no necesitamos cambiarlo aquí

# 3. Frontend optimizations ya aplicadas via App.js
echo "[3/4] Verificando App.js..."
if grep -q "DEVICES_PER_PAGE = 12" frontend/src/App.js 2>/dev/null; then
    echo "   App.js ya optimizado"
else
    echo "   Descargando App.js optimizado..."
    curl -s -o frontend/src/App.js "https://alert-central-deploy.preview.emergentagent.com/api/download-file?path=App.js"
fi

# 4. Rebuild y restart
echo "[4/4] Reconstruyendo..."
cd frontend
yarn build 2>&1 | tail -5

echo ""
echo "Reiniciando servicios..."
sudo systemctl restart siempria-backend
sleep 2
sudo systemctl reload nginx

echo ""
echo "=========================================="
echo "  OPTIMIZACION COMPLETADA"
echo "=========================================="
echo ""
echo "Cambios aplicados:"
echo "  - Timeout de verificación: 1 segundo (antes 3s)"
echo "  - Verificación en paralelo: 30 dispositivos a la vez"
echo "  - Paginación: 12 dispositivos por página"
echo "  - Alertas: máximo 500 del último mes"
echo ""
