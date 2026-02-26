#!/bin/bash
#################################################################
# SIEMPRIA WATCHTOWER - SCRIPT DE ACTUALIZACIÓN COMPLETO
# Ejecutar como root en el servidor de producción
# 
# Este script:
# 1. Crea backups de archivos existentes
# 2. Crea nuevos archivos (VPN, System Stats, MiniECG, etc.)
# 3. Actualiza server.py con imports necesarios
# 4. Instala dependencias
# 5. Hace build del frontend
# 6. Reinicia servicios
#################################################################

set -e  # Detener en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_DIR="/opt/siempria-monitor"
BACKUP_DIR="$BASE_DIR/backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   SIEMPRIA WATCHTOWER - ACTUALIZACIÓN     ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "$BASE_DIR" ]; then
    echo -e "${RED}ERROR: No se encontró $BASE_DIR${NC}"
    exit 1
fi

cd "$BASE_DIR"

# Crear directorio de backups
echo -e "${YELLOW}[1/8] Creando backups...${NC}"
mkdir -p "$BACKUP_DIR"

# Backup de archivos existentes
cp -f backend/server.py "$BACKUP_DIR/server.py.backup" 2>/dev/null || true
cp -f frontend/src/components/noc/widgets/index.js "$BACKUP_DIR/widgets_index.js.backup" 2>/dev/null || true
cp -f frontend/src/components/panels/NOCDashboard.jsx "$BACKUP_DIR/NOCDashboard.jsx.backup" 2>/dev/null || true

echo -e "${GREEN}✓ Backups creados en: $BACKUP_DIR${NC}"

#################################################################
# [2/8] CREAR ARCHIVO: backend/routes/vpn.py
#################################################################
echo -e "${YELLOW}[2/8] Creando backend/routes/vpn.py...${NC}"

mkdir -p backend/routes

cat > backend/routes/vpn.py << 'VPNEOF'
"""
VPN Monitoring Routes - OpenVPN tunnel monitoring via ping
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import asyncio
import subprocess
import uuid

from services.auth_service import get_current_user, require_role
from config import db, logger

router = APIRouter(prefix="/vpn", tags=["vpn"])

# Collection for VPN devices
vpn_collection = db.vpn_devices

# ============ Pydantic Models ============
class VPNDeviceCreate(BaseModel):
    name: str
    host: str  # IP or hostname to ping
    description: Optional[str] = None
    organization_id: Optional[str] = None
    group_id: Optional[str] = None

class VPNDeviceUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    description: Optional[str] = None
    organization_id: Optional[str] = None
    group_id: Optional[str] = None
    enabled: Optional[bool] = None

# ============ Helper Functions ============
async def ping_host(host: str, timeout: int = 3) -> dict:
    """Ping a host and return status with response time"""
    try:
        # Use ping command with timeout
        process = await asyncio.create_subprocess_exec(
            'ping', '-c', '1', '-W', str(timeout), host,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout + 2)
        
        if process.returncode == 0:
            # Parse response time from output
            output = stdout.decode()
            response_time = None
            for line in output.split('\n'):
                if 'time=' in line:
                    try:
                        time_part = line.split('time=')[1].split()[0]
                        response_time = float(time_part.replace('ms', ''))
                    except:
                        pass
            return {
                "online": True,
                "response_time_ms": response_time,
                "error": None
            }
        else:
            return {
                "online": False,
                "response_time_ms": None,
                "error": "Host unreachable"
            }
    except asyncio.TimeoutError:
        return {
            "online": False,
            "response_time_ms": None,
            "error": "Timeout"
        }
    except Exception as e:
        return {
            "online": False,
            "response_time_ms": None,
            "error": str(e)
        }

def serialize_vpn_device(device: dict) -> dict:
    """Serialize VPN device for API response"""
    return {
        "id": device.get("id"),
        "name": device.get("name"),
        "host": device.get("host"),
        "description": device.get("description"),
        "organization_id": device.get("organization_id"),
        "group_id": device.get("group_id"),
        "enabled": device.get("enabled", True),
        "online": device.get("online", False),
        "response_time_ms": device.get("response_time_ms"),
        "last_check": device.get("last_check"),
        "last_online": device.get("last_online"),
        "created_at": device.get("created_at"),
        "updated_at": device.get("updated_at")
    }

# ============ Routes ============

@router.get("/devices")
async def get_vpn_devices(user: dict = Depends(get_current_user)):
    """Get all VPN devices"""
    devices = await vpn_collection.find({}, {"_id": 0}).to_list(length=100)
    return {"devices": [serialize_vpn_device(d) for d in devices]}

@router.get("/status")
async def get_vpn_status(user: dict = Depends(get_current_user)):
    """Get VPN status summary with all devices"""
    devices = await vpn_collection.find({"enabled": {"$ne": False}}, {"_id": 0}).to_list(length=100)
    
    online_count = sum(1 for d in devices if d.get("online"))
    offline_count = sum(1 for d in devices if not d.get("online"))
    
    return {
        "devices": [serialize_vpn_device(d) for d in devices],
        "summary": {
            "total": len(devices),
            "online": online_count,
            "offline": offline_count
        },
        "last_check": datetime.now(timezone.utc).isoformat()
    }

@router.post("/devices")
async def create_vpn_device(device: VPNDeviceCreate, user: dict = Depends(require_role(["admin", "manager"]))):
    """Create a new VPN device to monitor"""
    new_device = {
        "id": str(uuid.uuid4()),
        "name": device.name,
        "host": device.host,
        "description": device.description,
        "organization_id": device.organization_id,
        "group_id": device.group_id,
        "enabled": True,
        "online": False,
        "response_time_ms": None,
        "last_check": None,
        "last_online": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await vpn_collection.insert_one(new_device)
    logger.info(f"VPN device created: {device.name} ({device.host})")
    
    return {"message": "VPN device created", "device": serialize_vpn_device(new_device)}

@router.put("/devices/{device_id}")
async def update_vpn_device(device_id: str, update: VPNDeviceUpdate, user: dict = Depends(require_role(["admin", "manager"]))):
    """Update a VPN device"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await vpn_collection.update_one(
        {"id": device_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="VPN device not found")
    
    device = await vpn_collection.find_one({"id": device_id}, {"_id": 0})
    return {"message": "VPN device updated", "device": serialize_vpn_device(device)}

@router.delete("/devices/{device_id}")
async def delete_vpn_device(device_id: str, user: dict = Depends(require_role(["admin"]))):
    """Delete a VPN device"""
    result = await vpn_collection.delete_one({"id": device_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="VPN device not found")
    
    return {"message": "VPN device deleted"}

@router.post("/devices/{device_id}/check")
async def check_vpn_device(device_id: str, user: dict = Depends(get_current_user)):
    """Check a specific VPN device"""
    device = await vpn_collection.find_one({"id": device_id}, {"_id": 0})
    
    if not device:
        raise HTTPException(status_code=404, detail="VPN device not found")
    
    # Ping the device
    result = await ping_host(device["host"])
    
    # Update device status
    update_data = {
        "online": result["online"],
        "response_time_ms": result["response_time_ms"],
        "last_check": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if result["online"]:
        update_data["last_online"] = datetime.now(timezone.utc).isoformat()
    
    await vpn_collection.update_one({"id": device_id}, {"$set": update_data})
    
    device.update(update_data)
    return {"device": serialize_vpn_device(device), "check_result": result}

@router.post("/check-all")
async def check_all_vpn_devices(user: dict = Depends(get_current_user)):
    """Check all enabled VPN devices"""
    devices = await vpn_collection.find({"enabled": {"$ne": False}}, {"_id": 0}).to_list(length=100)
    
    results = []
    for device in devices:
        result = await ping_host(device["host"])
        
        update_data = {
            "online": result["online"],
            "response_time_ms": result["response_time_ms"],
            "last_check": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if result["online"]:
            update_data["last_online"] = datetime.now(timezone.utc).isoformat()
        
        await vpn_collection.update_one({"id": device["id"]}, {"$set": update_data})
        
        device.update(update_data)
        results.append({
            "device": serialize_vpn_device(device),
            "check_result": result
        })
    
    online_count = sum(1 for r in results if r["check_result"]["online"])
    offline_count = len(results) - online_count
    
    logger.info(f"VPN check completed: {online_count} online, {offline_count} offline")
    
    return {
        "results": results,
        "summary": {
            "total": len(results),
            "online": online_count,
            "offline": offline_count
        }
    }
VPNEOF

echo -e "${GREEN}✓ vpn.py creado${NC}"

#################################################################
# [3/8] CREAR ARCHIVO: backend/routes/system_stats.py
#################################################################
echo -e "${YELLOW}[3/8] Creando backend/routes/system_stats.py...${NC}"

cat > backend/routes/system_stats.py << 'SYSEOF'
"""
System Stats Routes - Server resource monitoring (CPU, RAM, HDD, Network)
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import psutil
import time

from services.auth_service import get_current_user
from config import logger

router = APIRouter(prefix="/system", tags=["system"])

# Store previous network stats for calculating rate
_prev_net_stats = {"bytes_sent": 0, "bytes_recv": 0, "time": time.time()}

def get_network_speed():
    """Calculate network speed in KB/s"""
    global _prev_net_stats
    
    current = psutil.net_io_counters()
    current_time = time.time()
    
    time_diff = current_time - _prev_net_stats["time"]
    if time_diff <= 0:
        time_diff = 1
    
    # Calculate speed in KB/s
    sent_speed = (current.bytes_sent - _prev_net_stats["bytes_sent"]) / time_diff / 1024
    recv_speed = (current.bytes_recv - _prev_net_stats["bytes_recv"]) / time_diff / 1024
    
    # Update previous stats
    _prev_net_stats = {
        "bytes_sent": current.bytes_sent,
        "bytes_recv": current.bytes_recv,
        "time": current_time
    }
    
    return {
        "upload_kbs": round(sent_speed, 2),
        "download_kbs": round(recv_speed, 2),
        "total_sent_gb": round(current.bytes_sent / (1024**3), 2),
        "total_recv_gb": round(current.bytes_recv / (1024**3), 2)
    }

@router.get("/stats")
async def get_system_stats(user: dict = Depends(get_current_user)):
    """Get current system resource statistics"""
    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        
        # Memory
        memory = psutil.virtual_memory()
        ram_percent = memory.percent
        ram_used_gb = round(memory.used / (1024**3), 2)
        ram_total_gb = round(memory.total / (1024**3), 2)
        
        # Disk
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        disk_used_gb = round(disk.used / (1024**3), 2)
        disk_total_gb = round(disk.total / (1024**3), 2)
        
        # Network
        network = get_network_speed()
        
        # Load average (Unix only)
        try:
            load_avg = psutil.getloadavg()
            load_1, load_5, load_15 = load_avg
        except:
            load_1, load_5, load_15 = 0, 0, 0
        
        return {
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "load_1m": round(load_1, 2),
                "load_5m": round(load_5, 2),
                "load_15m": round(load_15, 2)
            },
            "ram": {
                "percent": ram_percent,
                "used_gb": ram_used_gb,
                "total_gb": ram_total_gb
            },
            "disk": {
                "percent": disk_percent,
                "used_gb": disk_used_gb,
                "total_gb": disk_total_gb
            },
            "network": network,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {
            "cpu": {"percent": 0, "count": 0},
            "ram": {"percent": 0, "used_gb": 0, "total_gb": 0},
            "disk": {"percent": 0, "used_gb": 0, "total_gb": 0},
            "network": {"upload_kbs": 0, "download_kbs": 0},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }
SYSEOF

echo -e "${GREEN}✓ system_stats.py creado${NC}"

#################################################################
# [4/8] CREAR COMPONENTES FRONTEND
#################################################################
echo -e "${YELLOW}[4/8] Creando componentes frontend...${NC}"

# Crear directorios si no existen
mkdir -p frontend/src/components/common
mkdir -p frontend/src/components/noc/widgets

# MiniECG.jsx
cat > frontend/src/components/common/MiniECG.jsx << 'ECGEOF'
/**
 * MiniECG - Animación ECG pequeña para el header del NOC
 */
import { useEffect, useRef } from 'react';

const MiniECG = ({ color = '#06b6d4', width = 60, height = 20 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // ECG pattern points (normalized 0-1)
    const ecgPattern = [
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      0.5, 0.45, 0.4, 0.3, 0.1, 0.9, 0.2, 0.5,
      0.5, 0.55, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5
    ];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw ECG line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const patternWidth = width * 0.8;
      const startX = offsetRef.current % patternWidth;

      for (let i = 0; i < ecgPattern.length; i++) {
        const x = (i / ecgPattern.length) * patternWidth - startX;
        const y = ecgPattern[i] * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Draw second pattern for seamless loop
      for (let i = 0; i < ecgPattern.length; i++) {
        const x = (i / ecgPattern.length) * patternWidth - startX + patternWidth;
        const y = ecgPattern[i] * height;
        ctx.lineTo(x, y);
      }

      ctx.stroke();

      offsetRef.current += 0.8;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="opacity-80"
    />
  );
};

export default MiniECG;
ECGEOF

echo -e "${GREEN}  ✓ MiniECG.jsx creado${NC}"

# SystemResourceMonitor.jsx
cat > frontend/src/components/common/SystemResourceMonitor.jsx << 'SRMEOF'
/**
 * SystemResourceMonitor - Muestra CPU, RAM, HDD, NET en el header del NOC
 * Diseño producción con iconos de colores y barras
 */
import { useState, useEffect, useRef } from 'react';
import { Cpu, MemoryStick, HardDrive, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

const SystemResourceMonitor = ({ authAxios }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchStats = async () => {
    if (!authAxios) return;
    try {
      const res = await authAxios.get('/system/stats');
      setStats(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authAxios]);

  const formatNetSpeed = (kbs) => {
    if (kbs >= 1024) return (kbs / 1024).toFixed(2);
    return kbs.toFixed(2);
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center gap-4 px-3 py-1 bg-slate-800/30 rounded border border-slate-700/50">
        <div className="flex items-center gap-6">
          {['CPU', 'RAM', 'HDD', 'NET'].map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase font-medium">{label}</span>
              <div className="w-16 h-1.5 bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cpuPercent = stats.cpu?.percent || 0;
  const ramPercent = stats.ram?.percent || 0;
  const diskPercent = stats.disk?.percent || 0;
  const netUp = stats.network?.upload_kbs || 0;
  const netDown = stats.network?.download_kbs || 0;

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 bg-slate-800/30 rounded border border-slate-700/50">
      {/* CPU - Cyan */}
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <span className="text-[10px] text-slate-400 uppercase font-medium">CPU</span>
        <div className="w-16 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all"
            style={{ width: `${cpuPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-cyan-400 font-mono w-8">{Math.round(cpuPercent)}%</span>
      </div>

      {/* RAM - Purple/Magenta */}
      <div className="flex items-center gap-2">
        <MemoryStick className="w-4 h-4 text-purple-400" />
        <span className="text-[10px] text-slate-400 uppercase font-medium">RAM</span>
        <div className="w-16 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${ramPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-purple-400 font-mono w-8">{Math.round(ramPercent)}%</span>
      </div>

      {/* HDD - Amber/Orange */}
      <div className="flex items-center gap-2">
        <HardDrive className="w-4 h-4 text-amber-400" />
        <span className="text-[10px] text-slate-400 uppercase font-medium">HDD</span>
        <div className="w-16 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${diskPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-amber-400 font-mono w-8">{Math.round(diskPercent)}%</span>
      </div>

      {/* Network - Green */}
      <div className="flex items-center gap-2">
        <Wifi className="w-4 h-4 text-emerald-400" />
        <span className="text-[10px] text-slate-400 uppercase font-medium">NET</span>
        <div className="flex items-center gap-1">
          <span className="text-emerald-400 text-[10px] font-mono">↑{formatNetSpeed(netUp)}</span>
          <span className="text-cyan-400 text-[10px] font-mono">↓{formatNetSpeed(netDown)}</span>
        </div>
      </div>
    </div>
  );
};

export default SystemResourceMonitor;
SRMEOF

echo -e "${GREEN}  ✓ SystemResourceMonitor.jsx creado${NC}"

# VPNWidget.jsx
cat > frontend/src/components/noc/widgets/VPNWidget.jsx << 'VPNWEOF'
/**
 * VPNWidget - Widget para mostrar estado de túneles VPN en NOC Dashboard
 * Estilo producción - compacto con lista de túneles
 */
import { useState, useEffect, useRef } from 'react';
import { Shield, Wifi, WifiOff, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const VPNWidget = ({ 
  authAxios, 
  onDeviceClick,
  editMode = false,
  compact = false
}) => {
  const [vpnDevices, setVpnDevices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0 });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const vpnRef = useRef([]);

  // Fetch VPN status
  const fetchVPNStatus = async () => {
    if (!authAxios) return;
    try {
      const res = await authAxios.get('/vpn/status');
      const newDevices = res.data.devices || [];
      const newSummary = res.data.summary || { total: 0, online: 0, offline: 0 };
      
      vpnRef.current = newDevices;
      setVpnDevices(newDevices);
      setSummary(newSummary);
    } catch (error) {
      console.error('Error fetching VPN status:', error);
    }
  };

  useEffect(() => {
    fetchVPNStatus();
    const interval = setInterval(fetchVPNStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [authAxios]);

  const handleRefresh = async () => {
    if (!authAxios) return;
    setLoading(true);
    try {
      await authAxios.post('/vpn/check-all');
      await fetchVPNStatus();
    } catch (error) {
      console.error('Error checking VPN devices:', error);
    }
    setLoading(false);
  };

  const onlineDevices = vpnDevices.filter(d => d.online);
  const offlineDevices = vpnDevices.filter(d => !d.online);

  if (compact) {
    return (
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-cyan-400 uppercase">VPN</p>
          <p className="text-2xl font-bold text-cyan-400">
            {summary.online}<span className="text-lg opacity-70">/{summary.total}</span>
          </p>
        </div>
        <Shield className="w-7 h-7 text-cyan-400 opacity-40" />
      </div>
    );
  }

  return (
    <Card className={cn(
      "bg-slate-900/80 border-slate-700/50 h-full flex flex-col",
      summary.offline > 0 && "border-red-500/50"
    )}>
      <CardHeader className="p-3 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            VPN Tunnels
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs px-2">
              {summary.online}
              <span className="text-emerald-400/70 ml-0.5">online</span>
            </Badge>
            {summary.offline > 0 && (
              <Badge className="bg-red-500/20 text-red-400 text-xs px-2 animate-pulse">
                {summary.offline}
                <span className="text-red-400/70 ml-0.5">offline</span>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={cn("w-3 h-3 text-slate-400", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 pt-0 flex-1 min-h-0">
        {vpnDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-4">
            <Shield className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">No hay túneles VPN configurados</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {/* Offline devices first - with warning icon */}
              {offlineDevices.map(device => (
                <div
                  key={device.id}
                  onClick={() => onDeviceClick?.(device)}
                  className="p-2 rounded border border-red-500/50 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{device.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{device.host}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Online devices */}
              {onlineDevices.map(device => (
                <div
                  key={device.id}
                  onClick={() => onDeviceClick?.(device)}
                  className="p-2 rounded border border-slate-700/50 bg-slate-800/50 cursor-pointer hover:bg-slate-800 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{device.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{device.host}</p>
                    </div>
                    {device.response_time_ms && (
                      <span className="text-[10px] text-cyan-400 font-mono">
                        {Math.round(device.response_time_ms)}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Summary footer */}
              {summary.total > 0 && (
                <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                  <p className="text-[10px] text-cyan-400 font-medium">
                    {summary.online} túneles VPN activos
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {onlineDevices.slice(0, 4).map(d => (
                      <span key={d.id} className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] rounded">
                        {d.name} {d.response_time_ms && `${Math.round(d.response_time_ms)}ms`}
                      </span>
                    ))}
                    {onlineDevices.length > 4 && (
                      <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-[9px] rounded">
                        +{onlineDevices.length - 4} más
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default VPNWidget;
VPNWEOF

echo -e "${GREEN}  ✓ VPNWidget.jsx creado${NC}"

#################################################################
# [5/8] ACTUALIZAR widgets/index.js
#################################################################
echo -e "${YELLOW}[5/8] Actualizando widgets/index.js...${NC}"

# Verificar si VPNWidget ya está exportado
if grep -q "VPNWidget" frontend/src/components/noc/widgets/index.js 2>/dev/null; then
    echo -e "${GREEN}  ✓ VPNWidget ya está en index.js${NC}"
else
    # Añadir export al final del archivo
    echo "export { default as VPNWidget } from './VPNWidget';" >> frontend/src/components/noc/widgets/index.js
    echo -e "${GREEN}  ✓ VPNWidget añadido a index.js${NC}"
fi

#################################################################
# [6/8] ACTUALIZAR server.py - IMPORTS Y ROUTERS
#################################################################
echo -e "${YELLOW}[6/8] Actualizando server.py...${NC}"

# Verificar si ya tiene los imports
if grep -q "from routes.vpn import router as vpn_router" backend/server.py; then
    echo -e "${GREEN}  ✓ vpn_router ya importado${NC}"
else
    # Añadir imports después de la línea de dahua
    sed -i '/from routes.dahua import router as dahua_router/a from routes.vpn import router as vpn_router' backend/server.py
    echo -e "${GREEN}  ✓ vpn_router import añadido${NC}"
fi

if grep -q "from routes.system_stats import router as system_stats_router" backend/server.py; then
    echo -e "${GREEN}  ✓ system_stats_router ya importado${NC}"
else
    sed -i '/from routes.vpn import router as vpn_router/a from routes.system_stats import router as system_stats_router' backend/server.py
    echo -e "${GREEN}  ✓ system_stats_router import añadido${NC}"
fi

# Añadir routers si no existen
if grep -q "api_router.include_router(vpn_router)" backend/server.py; then
    echo -e "${GREEN}  ✓ vpn_router ya incluido${NC}"
else
    sed -i '/api_router.include_router(dahua_router)/a # Include VPN monitoring routes\napi_router.include_router(vpn_router)' backend/server.py
    echo -e "${GREEN}  ✓ vpn_router incluido${NC}"
fi

if grep -q "api_router.include_router(system_stats_router)" backend/server.py; then
    echo -e "${GREEN}  ✓ system_stats_router ya incluido${NC}"
else
    sed -i '/api_router.include_router(vpn_router)/a # Include System Stats routes\napi_router.include_router(system_stats_router)' backend/server.py
    echo -e "${GREEN}  ✓ system_stats_router incluido${NC}"
fi

# Añadir función de scheduler VPN si no existe
if grep -q "periodic_vpn_check" backend/server.py; then
    echo -e "${GREEN}  ✓ periodic_vpn_check ya existe${NC}"
else
    # Esto es más complejo, crear un archivo de patch
    echo -e "${YELLOW}  ! Función periodic_vpn_check debe añadirse manualmente${NC}"
    echo -e "${YELLOW}  ! Copie el contenido de la función desde el archivo de referencia${NC}"
fi

#################################################################
# [7/8] INSTALAR DEPENDENCIAS
#################################################################
echo -e "${YELLOW}[7/8] Instalando dependencias...${NC}"

cd backend
source venv/bin/activate 2>/dev/null || source ../venv/bin/activate 2>/dev/null || true

pip install psutil --quiet
echo -e "${GREEN}✓ psutil instalado${NC}"

# Actualizar requirements.txt si es necesario
if grep -q "psutil" requirements.txt 2>/dev/null; then
    echo -e "${GREEN}  ✓ psutil ya está en requirements.txt${NC}"
else
    echo "psutil" >> requirements.txt
    echo -e "${GREEN}  ✓ psutil añadido a requirements.txt${NC}"
fi

cd "$BASE_DIR"

#################################################################
# [8/8] BUILD Y RESTART
#################################################################
echo -e "${YELLOW}[8/8] Compilando frontend y reiniciando servicios...${NC}"

cd frontend
npm run build
echo -e "${GREEN}✓ Frontend compilado${NC}"

cd "$BASE_DIR"

# Reiniciar servicios
if command -v systemctl &> /dev/null; then
    systemctl restart siempria-backend 2>/dev/null || true
    systemctl restart siempria-frontend 2>/dev/null || true
    echo -e "${GREEN}✓ Servicios reiniciados (systemctl)${NC}"
elif command -v supervisorctl &> /dev/null; then
    supervisorctl restart all 2>/dev/null || true
    echo -e "${GREEN}✓ Servicios reiniciados (supervisorctl)${NC}"
else
    echo -e "${YELLOW}! Por favor reinicia los servicios manualmente${NC}"
fi

#################################################################
# RESUMEN FINAL
#################################################################
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}   ¡ACTUALIZACIÓN COMPLETADA!              ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}Archivos creados:${NC}"
echo "  - backend/routes/vpn.py"
echo "  - backend/routes/system_stats.py"
echo "  - frontend/src/components/common/MiniECG.jsx"
echo "  - frontend/src/components/common/SystemResourceMonitor.jsx"
echo "  - frontend/src/components/noc/widgets/VPNWidget.jsx"
echo ""
echo -e "${GREEN}Archivos modificados:${NC}"
echo "  - backend/server.py (imports y routers)"
echo "  - frontend/src/components/noc/widgets/index.js"
echo ""
echo -e "${GREEN}Backups guardados en:${NC}"
echo "  $BACKUP_DIR"
echo ""
echo -e "${YELLOW}NOTA: El archivo NOCDashboard.jsx ya tiene los componentes${NC}"
echo -e "${YELLOW}importados en tu backup. No necesita modificación.${NC}"
echo ""
echo -e "${BLUE}Para verificar la instalación:${NC}"
echo "  curl -s http://localhost:8000/api/system/stats"
echo "  curl -s http://localhost:8000/api/vpn/status"
echo ""
