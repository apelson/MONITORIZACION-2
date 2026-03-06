#!/bin/bash
# =============================================
# Script de instalación de Fail2ban para Siempria
# Ejecutar como: bash deploy_fail2ban.sh
# =============================================

echo "🚀 Iniciando instalación de Fail2ban para Siempria..."

# PASO 1: Crear fail2ban_service.py
echo "📁 Creando fail2ban_service.py..."
cat > /opt/siempria-monitor/backend/services/fail2ban_service.py << 'ENDOFFILE'
"""
Fail2ban Integration Service
Provides monitoring, configuration and alerting for fail2ban intrusion detection
"""
import subprocess
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, List
import os

from config import db, logger

# Collections
fail2ban_logs_collection = db["fail2ban_logs"]
fail2ban_config_collection = db["fail2ban_config"]

# Default configuration
DEFAULT_CONFIG = {
    "enabled": True,
    "max_retry": 5,
    "ban_time": 1800,
    "find_time": 600,
    "jail_name": "siempria-auth",
    "log_path": "/var/log/siempria/auth.log",
    "notify_telegram": True,
    "notify_email": True,
}


async def get_fail2ban_config() -> dict:
    config = await fail2ban_config_collection.find_one({"_id": "config"})
    if not config:
        return DEFAULT_CONFIG
    config.pop("_id", None)
    return config


async def save_fail2ban_config(config: dict) -> dict:
    config["updated_at"] = datetime.now(timezone.utc).isoformat()
    await fail2ban_config_collection.update_one(
        {"_id": "config"},
        {"$set": config},
        upsert=True
    )
    return config


async def get_fail2ban_status() -> dict:
    try:
        result = subprocess.run(
            ["fail2ban-client", "status"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            output = result.stdout
            jails = []
            for line in output.split("\n"):
                if "Jail list:" in line:
                    jail_str = line.split(":")[-1].strip()
                    if jail_str:
                        jails = [j.strip() for j in jail_str.split(",")]
            return {
                "installed": True,
                "running": True,
                "jails": jails,
                "jail_count": len(jails)
            }
        else:
            return {
                "installed": True,
                "running": False,
                "error": result.stderr,
                "jails": [],
                "jail_count": 0
            }
    except FileNotFoundError:
        return {
            "installed": False,
            "running": False,
            "jails": [],
            "jail_count": 0,
            "message": "fail2ban no está instalado en el sistema"
        }
    except subprocess.TimeoutExpired:
        return {
            "installed": True,
            "running": False,
            "error": "Timeout al consultar fail2ban",
            "jails": [],
            "jail_count": 0
        }
    except Exception as e:
        logger.error(f"Error checking fail2ban status: {e}")
        return {
            "installed": False,
            "running": False,
            "error": str(e),
            "jails": [],
            "jail_count": 0
        }


async def get_jail_status(jail_name: str = "siempria-auth") -> dict:
    try:
        result = subprocess.run(
            ["fail2ban-client", "status", jail_name],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            output = result.stdout
            status = {
                "jail": jail_name,
                "active": True,
                "currently_banned": 0,
                "total_banned": 0,
                "banned_ips": [],
                "currently_failed": 0,
                "total_failed": 0
            }
            
            for line in output.split("\n"):
                line = line.strip()
                if "Currently banned:" in line:
                    status["currently_banned"] = int(line.split(":")[-1].strip())
                elif "Total banned:" in line:
                    status["total_banned"] = int(line.split(":")[-1].strip())
                elif "Banned IP list:" in line:
                    ips = line.split(":")[-1].strip()
                    if ips:
                        status["banned_ips"] = [ip.strip() for ip in ips.split()]
                elif "Currently failed:" in line:
                    status["currently_failed"] = int(line.split(":")[-1].strip())
                elif "Total failed:" in line:
                    status["total_failed"] = int(line.split(":")[-1].strip())
            return status
        else:
            return {"jail": jail_name, "active": False, "error": result.stderr or "Jail no encontrado"}
    except FileNotFoundError:
        return {"jail": jail_name, "active": False, "error": "fail2ban no está instalado"}
    except Exception as e:
        return {"jail": jail_name, "active": False, "error": str(e)}


async def ban_ip(ip: str, jail_name: str = "siempria-auth") -> dict:
    try:
        result = subprocess.run(
            ["fail2ban-client", "set", jail_name, "banip", ip],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            await fail2ban_logs_collection.insert_one({
                "action": "ban",
                "ip": ip,
                "jail": jail_name,
                "manual": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            return {"success": True, "message": f"IP {ip} bloqueada en {jail_name}"}
        else:
            return {"success": False, "error": result.stderr}
    except FileNotFoundError:
        from services.security_service import add_ip_to_blacklist
        result = await add_ip_to_blacklist(ip, f"Bloqueado via fail2ban (manual)", "system")
        return {"success": True, "message": result.get("message", "IP bloqueada internamente")}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def unban_ip(ip: str, jail_name: str = "siempria-auth") -> dict:
    try:
        result = subprocess.run(
            ["fail2ban-client", "set", jail_name, "unbanip", ip],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            await fail2ban_logs_collection.insert_one({
                "action": "unban",
                "ip": ip,
                "jail": jail_name,
                "manual": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            return {"success": True, "message": f"IP {ip} desbloqueada de {jail_name}"}
        else:
            return {"success": False, "error": result.stderr}
    except FileNotFoundError:
        from services.security_service import remove_ip_from_blacklist, unblock_ip
        await remove_ip_from_blacklist(ip)
        await unblock_ip(ip)
        return {"success": True, "message": "IP desbloqueada internamente"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_fail2ban_logs(limit: int = 50) -> list:
    cursor = fail2ban_logs_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def generate_jail_config() -> str:
    config = await get_fail2ban_config()
    jail_config = f"""# Siempria Network Monitor - fail2ban jail configuration
# Generated: {datetime.now(timezone.utc).isoformat()}

[{config.get('jail_name', 'siempria-auth')}]
enabled = true
port = http,https
filter = siempria-auth
logpath = {config.get('log_path', '/var/log/siempria/auth.log')}
maxretry = {config.get('max_retry', 5)}
findtime = {config.get('find_time', 600)}
bantime = {config.get('ban_time', 1800)}
action = %(action_mwl)s
"""
    return jail_config


async def generate_filter_config() -> str:
    filter_config = """# Siempria Network Monitor - fail2ban filter

[Definition]
failregex = ^.*auth_failed.*ip_address.*<HOST>.*$
            ^.*auth_blocked.*ip_address.*<HOST>.*$
            ^.*ip_blocked.*<HOST>.*$
            ^.*Failed login attempt from <HOST>.*$
            ^.*Invalid credentials from <HOST>.*$

ignoreregex =
datepattern = %%Y-%%m-%%dT%%H:%%M:%%S
"""
    return filter_config


async def get_installation_guide() -> dict:
    jail_config = await generate_jail_config()
    filter_config = await generate_filter_config()
    return {
        "installation_steps": [
            {"step": 1, "title": "Instalar fail2ban", "command": "sudo apt-get update && sudo apt-get install -y fail2ban"},
            {"step": 2, "title": "Crear directorio de logs", "command": "sudo mkdir -p /var/log/siempria && sudo touch /var/log/siempria/auth.log"},
            {"step": 3, "title": "Crear filtro de Siempria", "command": "sudo nano /etc/fail2ban/filter.d/siempria-auth.conf", "content": filter_config},
            {"step": 4, "title": "Crear jail de Siempria", "command": "sudo nano /etc/fail2ban/jail.d/siempria.conf", "content": jail_config},
            {"step": 5, "title": "Reiniciar fail2ban", "command": "sudo systemctl restart fail2ban"},
            {"step": 6, "title": "Verificar estado", "command": "sudo fail2ban-client status siempria-auth"}
        ],
        "jail_config": jail_config,
        "filter_config": filter_config,
        "notes": [
            "El servicio de Siempria debe estar configurado para escribir logs en /var/log/siempria/auth.log",
            "Los logs deben incluir la IP del cliente en formato: ip_address: X.X.X.X",
            "Ajusta maxretry, findtime y bantime según tus necesidades de seguridad"
        ]
    }


async def sync_with_internal_security() -> dict:
    try:
        from services.security_service import get_blacklisted_ips, get_blocked_ips
        blacklisted = await get_blacklisted_ips()
        blocked = await get_blocked_ips()
        f2b_status = await get_fail2ban_status()
        synced_count = 0
        if f2b_status.get("installed") and f2b_status.get("running"):
            for item in blacklisted:
                result = await ban_ip(item["ip"])
                if result.get("success"):
                    synced_count += 1
        return {
            "synced": synced_count,
            "internal_blacklist": len(blacklisted),
            "internal_blocked": len(blocked),
            "fail2ban_available": f2b_status.get("installed", False)
        }
    except Exception as e:
        logger.error(f"Error syncing with fail2ban: {e}")
        return {"error": str(e), "synced": 0}
ENDOFFILE

echo "✅ fail2ban_service.py creado"

# PASO 2: Crear fail2ban.py (routes)
echo "📁 Creando fail2ban.py (routes)..."
cat > /opt/siempria-monitor/backend/routes/fail2ban.py << 'ENDOFFILE'
"""
Fail2ban Integration Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from services.auth_service import require_role
from services.fail2ban_service import (
    get_fail2ban_status,
    get_jail_status,
    get_fail2ban_config,
    save_fail2ban_config,
    ban_ip,
    unban_ip,
    get_fail2ban_logs,
    generate_jail_config,
    generate_filter_config,
    get_installation_guide,
    sync_with_internal_security
)

router = APIRouter(prefix="/fail2ban", tags=["Fail2ban"])


class Fail2banConfig(BaseModel):
    enabled: bool = True
    max_retry: int = 5
    ban_time: int = 1800
    find_time: int = 600
    jail_name: str = "siempria-auth"
    log_path: str = "/var/log/siempria/auth.log"
    notify_telegram: bool = True
    notify_email: bool = True


class BanIPRequest(BaseModel):
    ip: str
    jail_name: Optional[str] = "siempria-auth"


@router.get("/status")
async def get_status(current_user: dict = Depends(require_role(["admin"]))):
    status = await get_fail2ban_status()
    return {"status": status}


@router.get("/jail/{jail_name}")
async def get_jail(jail_name: str = "siempria-auth", current_user: dict = Depends(require_role(["admin"]))):
    status = await get_jail_status(jail_name)
    return {"jail_status": status}


@router.get("/config")
async def get_config(current_user: dict = Depends(require_role(["admin"]))):
    config = await get_fail2ban_config()
    return {"config": config}


@router.post("/config")
async def update_config(config: Fail2banConfig, current_user: dict = Depends(require_role(["admin"]))):
    saved = await save_fail2ban_config(config.model_dump())
    return {"message": "Configuración guardada", "config": saved}


@router.post("/ban")
async def ban_ip_address(data: BanIPRequest, current_user: dict = Depends(require_role(["admin"]))):
    result = await ban_ip(data.ip, data.jail_name)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Error al bloquear IP"))
    return result


@router.post("/unban")
async def unban_ip_address(data: BanIPRequest, current_user: dict = Depends(require_role(["admin"]))):
    result = await unban_ip(data.ip, data.jail_name)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Error al desbloquear IP"))
    return result


@router.get("/logs")
async def get_logs(limit: int = 50, current_user: dict = Depends(require_role(["admin"]))):
    logs = await get_fail2ban_logs(limit)
    return {"logs": logs, "count": len(logs)}


@router.get("/installation-guide")
async def get_guide(current_user: dict = Depends(require_role(["admin"]))):
    guide = await get_installation_guide()
    return guide


@router.get("/config/jail")
async def get_jail_config(current_user: dict = Depends(require_role(["admin"]))):
    config = await generate_jail_config()
    return {"config": config, "filename": "siempria.conf", "path": "/etc/fail2ban/jail.d/"}


@router.get("/config/filter")
async def get_filter_config(current_user: dict = Depends(require_role(["admin"]))):
    config = await generate_filter_config()
    return {"config": config, "filename": "siempria-auth.conf", "path": "/etc/fail2ban/filter.d/"}


@router.post("/sync")
async def sync_security(current_user: dict = Depends(require_role(["admin"]))):
    result = await sync_with_internal_security()
    return {"result": result}
ENDOFFILE

echo "✅ fail2ban.py creado"

# PASO 3: Crear Fail2banPanel.jsx
echo "📁 Creando Fail2banPanel.jsx..."
cat > /opt/siempria-monitor/frontend/src/components/settings/Fail2banPanel.jsx << 'ENDOFFILE'
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ShieldAlert, ShieldCheck, ShieldX, RefreshCw, Ban, Check, AlertTriangle, Terminal, Copy, Server, FileText, Info } from 'lucide-react';

const Fail2banPanel = ({ authAxios }) => {
  const [status, setStatus] = useState(null);
  const [jailStatus, setJailStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [guide, setGuide] = useState(null);
  const [banIP, setBanIP] = useState('');
  const [banning, setBanning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, configRes, logsRes] = await Promise.all([
        authAxios.get('/fail2ban/status'),
        authAxios.get('/fail2ban/config'),
        authAxios.get('/fail2ban/logs?limit=20')
      ]);
      setStatus(statusRes.data.status);
      setConfig(configRes.data.config);
      setLogs(logsRes.data.logs || []);
      if (statusRes.data.status?.running) {
        try {
          const jailRes = await authAxios.get('/fail2ban/jail/siempria-auth');
          setJailStatus(jailRes.data.jail_status);
        } catch (e) { console.log('Jail not active'); }
      }
    } catch (e) {
      console.error('Error:', e);
      setStatus({ installed: false, running: false, jails: [], jail_count: 0 });
      setConfig({ enabled: true, max_retry: 5, ban_time: 1800, find_time: 600, jail_name: 'siempria-auth', log_path: '/var/log/siempria/auth.log', notify_telegram: true, notify_email: true });
    }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBanIP = async () => {
    if (!banIP) { toast.error('Introduce una IP'); return; }
    setBanning(true);
    try {
      await authAxios.post('/fail2ban/ban', { ip: banIP });
      toast.success(`IP ${banIP} bloqueada`);
      setBanIP('');
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    setBanning(false);
  };

  const handleUnbanIP = async (ip) => {
    try {
      await authAxios.post('/fail2ban/unban', { ip });
      toast.success(`IP ${ip} desbloqueada`);
      fetchData();
    } catch (e) { toast.error('Error'); }
  };

  const handleSync = async () => {
    try {
      const res = await authAxios.post('/fail2ban/sync');
      toast.success(`Sincronizado: ${res.data.result?.synced || 0} IPs`);
      fetchData();
    } catch (e) { toast.error('Error'); }
  };

  const handleSaveConfig = async () => {
    try {
      await authAxios.post('/fail2ban/config', config);
      toast.success('Configuración guardada');
    } catch (e) { toast.error('Error'); }
  };

  const loadGuide = async () => {
    try {
      const res = await authAxios.get('/fail2ban/installation-guide');
      setGuide(res.data);
      setShowGuideDialog(true);
    } catch (e) { toast.error('Error'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado');
  };

  if (loading) return <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-purple-600" />
          Fail2ban - Detección de Intrusiones
        </CardTitle>
        <CardDescription>Sistema de bloqueo automático a nivel de sistema operativo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${status?.installed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {status?.installed ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <ShieldX className="w-4 h-4 text-red-600" />}
              <span className="text-sm font-medium">Instalado</span>
            </div>
            <div className={`text-lg font-bold ${status?.installed ? 'text-green-700' : 'text-red-700'}`}>{status?.installed ? 'Sí' : 'No'}</div>
          </div>
          <div className={`p-4 rounded-lg border ${status?.running ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {status?.running ? <Check className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-yellow-600" />}
              <span className="text-sm font-medium">Estado</span>
            </div>
            <div className={`text-lg font-bold ${status?.running ? 'text-green-700' : 'text-yellow-700'}`}>{status?.running ? 'Activo' : 'Inactivo'}</div>
          </div>
          <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
            <div className="flex items-center gap-2 mb-1"><Server className="w-4 h-4 text-purple-600" /><span className="text-sm font-medium">Jails</span></div>
            <div className="text-lg font-bold text-purple-700">{status?.jail_count || 0}</div>
          </div>
          <div className="p-4 rounded-lg border bg-red-50 border-red-200">
            <div className="flex items-center gap-2 mb-1"><Ban className="w-4 h-4 text-red-600" /><span className="text-sm font-medium">Bloqueados</span></div>
            <div className="text-lg font-bold text-red-700">{jailStatus?.currently_banned || 0}</div>
          </div>
        </div>

        {!status?.installed && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800">Fail2ban no está instalado</h4>
                <p className="text-sm text-amber-700 mt-1">Para protección a nivel de sistema, instala fail2ban en tu servidor.</p>
                <Button variant="outline" size="sm" onClick={loadGuide} className="mt-2"><FileText className="w-4 h-4 mr-2" />Guía de Instalación</Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="actions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="actions">Acciones</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="logs">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Ban className="w-4 h-4" />Bloquear IP Manualmente</Label>
              <div className="flex gap-2">
                <Input placeholder="IP a bloquear" value={banIP} onChange={(e) => setBanIP(e.target.value)} className="flex-1" />
                <Button onClick={handleBanIP} disabled={banning} variant="destructive">{banning ? 'Bloqueando...' : 'Bloquear'}</Button>
              </div>
            </div>
            {jailStatus?.banned_ips?.length > 0 && (
              <div className="space-y-2">
                <Label>IPs Bloqueadas ({jailStatus.banned_ips.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {jailStatus.banned_ips.map((ip, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                      <span className="font-mono">{ip}</span>
                      <Button size="sm" variant="outline" onClick={() => handleUnbanIP(ip)}>Desbloquear</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleSync}><RefreshCw className="w-4 h-4 mr-2" />Sincronizar</Button>
              <Button variant="outline" onClick={loadGuide}><Info className="w-4 h-4 mr-2" />Guía</Button>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4 pt-4">
            {config && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Intentos máximos</Label>
                    <Input type="number" value={config.max_retry} onChange={(e) => setConfig({...config, max_retry: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tiempo de baneo (seg)</Label>
                    <Input type="number" value={config.ban_time} onChange={(e) => setConfig({...config, ban_time: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ventana detección (seg)</Label>
                    <Input type="number" value={config.find_time} onChange={(e) => setConfig({...config, find_time: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del Jail</Label>
                    <Input value={config.jail_name} onChange={(e) => setConfig({...config, jail_name: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div><Label>Notificar Telegram</Label></div>
                  <Switch checked={config.notify_telegram} onCheckedChange={(v) => setConfig({...config, notify_telegram: v})} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div><Label>Notificar Email</Label></div>
                  <Switch checked={config.notify_email} onCheckedChange={(v) => setConfig({...config, notify_email: v})} />
                </div>
                <Button onClick={handleSaveConfig} className="w-full">Guardar Configuración</Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="logs" className="pt-4">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay registros</p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm">
                      <Badge variant={log.action === 'ban' ? 'destructive' : 'default'}>{log.action === 'ban' ? 'Bloqueado' : 'Desbloqueado'}</Badge>
                      <span className="font-mono">{log.ip}</span>
                      {log.manual && <Badge variant="outline">Manual</Badge>}
                      <span className="text-muted-foreground ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-2" />Actualizar</Button>
        </div>
      </CardContent>

      <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Terminal className="w-5 h-5" />Guía de Instalación</DialogTitle>
            <DialogDescription>Sigue estos pasos para configurar fail2ban</DialogDescription>
          </DialogHeader>
          {guide && (
            <div className="space-y-4">
              {guide.installation_steps?.map((step, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Paso {step.step}: {step.title}</h4>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(step.command)}><Copy className="w-4 h-4" /></Button>
                  </div>
                  <pre className="bg-slate-900 text-green-400 p-3 rounded text-sm overflow-x-auto">{step.command}</pre>
                  {step.content && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">Ver contenido</summary>
                      <pre className="mt-2 bg-slate-100 p-3 rounded text-xs overflow-x-auto">{step.content}</pre>
                    </details>
                  )}
                </div>
              ))}
              {guide.notes && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Notas importantes</h4>
                  <ul className="text-sm text-blue-700 space-y-1">{guide.notes.map((note, idx) => (<li key={idx}>• {note}</li>))}</ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowGuideDialog(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Fail2banPanel;
ENDOFFILE

echo "✅ Fail2banPanel.jsx creado"

# PASO 4: Modificar server.py
echo "📝 Modificando server.py..."

# Verificar si ya existe el import
if ! grep -q "from routes.fail2ban import" /opt/siempria-monitor/backend/server.py; then
    sed -i '/from routes.push_notifications import router as push_router/a from routes.fail2ban import router as fail2ban_router' /opt/siempria-monitor/backend/server.py
    echo "✅ Import añadido a server.py"
else
    echo "⚠️ Import ya existe en server.py"
fi

# Verificar si ya existe el include_router
if ! grep -q "include_router(fail2ban_router)" /opt/siempria-monitor/backend/server.py; then
    sed -i '/api_router.include_router(download_router)/a api_router.include_router(fail2ban_router)' /opt/siempria-monitor/backend/server.py
    echo "✅ Router añadido a server.py"
else
    echo "⚠️ Router ya existe en server.py"
fi

# PASO 5: Modificar App.js
echo "📝 Modificando App.js..."

# Verificar si ya existe el import
if ! grep -q "import Fail2banPanel from" /opt/siempria-monitor/frontend/src/App.js; then
    sed -i '/import TenantAdminsManager from/a import Fail2banPanel from "@/components/settings/Fail2banPanel";' /opt/siempria-monitor/frontend/src/App.js
    echo "✅ Import añadido a App.js"
else
    echo "⚠️ Import ya existe en App.js"
fi

# Verificar si ya existe el componente
if ! grep -q "<Fail2banPanel" /opt/siempria-monitor/frontend/src/App.js; then
    sed -i '/<SecurityPanel \/>/a \              <Fail2banPanel authAxios={authAxios} />' /opt/siempria-monitor/frontend/src/App.js
    echo "✅ Componente añadido a App.js"
else
    echo "⚠️ Componente ya existe en App.js"
fi

# PASO 6: Reiniciar servicios
echo ""
echo "🔄 Reiniciando backend..."
sudo systemctl restart siempria-backend.service

echo ""
echo "🔨 Compilando frontend..."
cd /opt/siempria-monitor/frontend && npm run build

echo ""
echo "✅ ¡Instalación completada!"
echo ""
echo "Verificando estado del backend..."
sudo systemctl status siempria-backend.service --no-pager
