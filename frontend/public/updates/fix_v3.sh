#!/bin/bash
# ============================================
# Fix Header + Dahua Quick Add v3.0
# ============================================

set -e

FRONTEND_DIR="/opt/siempria-monitor/frontend"

echo "=========================================="
echo "  Aplicando correcciones v3.0"
echo "=========================================="

# ============================================
# PASO 1: Eliminar botón Exportar del header
# ============================================
echo "[1/2] Eliminando botón Exportar del header..."

python3 << 'PYTHON_SCRIPT'
import re

with open('/opt/siempria-monitor/frontend/src/App.js', 'r') as f:
    content = f.read()

# Find and remove the entire Export DropdownMenu block
# Pattern: <DropdownMenu> ... export-btn ... </DropdownMenu>
lines = content.split('\n')
new_lines = []
skip_mode = False
brace_count = 0
found_export = False

i = 0
while i < len(lines):
    line = lines[i]
    
    # Check if this line starts a DropdownMenu that might contain export-btn
    if '<DropdownMenu>' in line and not skip_mode:
        # Look ahead to see if this dropdown contains export-btn
        look_ahead = '\n'.join(lines[i:i+15])
        if 'export-btn' in look_ahead:
            skip_mode = True
            brace_count = 1
            found_export = True
            i += 1
            continue
    
    if skip_mode:
        # Count DropdownMenu tags
        if '<DropdownMenu>' in line or '<DropdownMenu ' in line:
            brace_count += 1
        if '</DropdownMenu>' in line:
            brace_count -= 1
            if brace_count == 0:
                skip_mode = False
                i += 1
                continue
        i += 1
        continue
    
    new_lines.append(line)
    i += 1

if found_export:
    content = '\n'.join(new_lines)
    with open('/opt/siempria-monitor/frontend/src/App.js', 'w') as f:
        f.write(content)
    print("Export button removed from header")
else:
    print("Export button not found (may already be removed)")
PYTHON_SCRIPT

# ============================================
# PASO 2: Actualizar DahuaDevicesPanel
# ============================================
echo "[2/2] Actualizando DahuaDevicesPanel con credenciales y botones..."

cat > "$FRONTEND_DIR/src/components/panels/DahuaDevicesPanel.jsx" << 'DAHUA_EOF'
/**
 * Dahua P2P Devices Panel v3.0
 * - Pre-loaded credentials
 * - Quick add buttons: Save & New, Save, Cancel
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  HardDrive, Wifi, WifiOff, Plus, Trash2, RefreshCw, Edit2,
  CheckCircle, XCircle, Database, Loader2, 
  Eye, EyeOff, ChevronDown, ChevronUp, Search, Video, Clock,
  Cpu, Save, PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const DAHUA_LOGO = "https://customer-assets.emergentagent.com/job_9daa6c94-1292-4e32-a6ac-374cc483718a/artifacts/er710utf_dahua-technology-logo.png";

// Default credentials for Dahua devices
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'Spw@2018';

const DahuaDevicesPanel = ({ authAxios, groups = [], organizations = [] }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState({});
  const [checkingAll, setCheckingAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);

  const getDefaultFormData = () => ({
    name: '',
    serial_number: '',
    username: DEFAULT_USERNAME,
    password: DEFAULT_PASSWORD,
    group_id: '',
    organization_id: ''
  });

  const [formData, setFormData] = useState(getDefaultFormData());
  const [serialChecking, setSerialChecking] = useState(false);
  const [serialValid, setSerialValid] = useState(null);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await authAxios.get('/dahua/devices');
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Error fetching Dahua devices:', error);
      toast.error('Error al cargar dispositivos Dahua');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleAddDevice = async (keepOpen = false) => {
    if (!formData.name || !formData.serial_number || !formData.password) {
      toast.error('Completa todos los campos requeridos');
      return false;
    }
    
    setSaving(true);
    try {
      await authAxios.post('/dahua/devices', formData);
      toast.success(`Grabador "${formData.name}" añadido`);
      fetchDevices();
      
      if (keepOpen) {
        // Reset form but keep modal open for next device
        setFormData(getDefaultFormData());
        setSerialValid(null);
      } else {
        setShowAddModal(false);
        resetForm();
      }
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al añadir dispositivo');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;
    
    setSaving(true);
    try {
      await authAxios.put(`/dahua/devices/${editingDevice.id}`, formData);
      toast.success('Dispositivo actualizado');
      setEditingDevice(null);
      resetForm();
      fetchDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDevice = async (deviceId, deviceName) => {
    if (!window.confirm(`¿Eliminar ${deviceName}?`)) return;
    try {
      await authAxios.delete(`/dahua/devices/${deviceId}`);
      toast.success('Dispositivo eliminado');
      fetchDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleCheckDevice = async (deviceId) => {
    setChecking(prev => ({ ...prev, [deviceId]: true }));
    try {
      const response = await authAxios.post(`/dahua/devices/${deviceId}/check`);
      toast.success(`Verificación: ${response.data.online ? 'Online' : 'Offline'}`);
      fetchDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al verificar');
    } finally {
      setChecking(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      const response = await authAxios.post('/dahua/check-all');
      const summary = response.data.summary;
      toast.success(`Verificación: ${summary.online}/${summary.total} online`);
      fetchDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al verificar');
    } finally {
      setCheckingAll(false);
    }
  };

  const resetForm = () => {
    setFormData(getDefaultFormData());
    setSerialValid(null);
  };

  const handleQuickCheckSerial = async () => {
    if (!formData.serial_number || formData.serial_number.length < 10) {
      toast.error('Número de serie inválido');
      return;
    }
    setSerialChecking(true);
    try {
      const response = await authAxios.post(`/dahua/quick-check/${formData.serial_number}`);
      if (response.data.cloud_registered) {
        setSerialValid(true);
        toast.success('Dispositivo encontrado en Easy4IP');
      } else {
        setSerialValid(false);
        toast.error(response.data.error || 'No encontrado');
      }
    } catch (error) {
      setSerialValid(false);
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setSerialChecking(false);
    }
  };

  const openEditModal = (device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name || '',
      serial_number: device.serial_number || '',
      username: device.username || DEFAULT_USERNAME,
      password: '', // Don't pre-fill password on edit
      group_id: device.group_id || '',
      organization_id: device.organization_id || ''
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Filter devices
  const filteredDevices = devices.filter(d => {
    const matchesSearch = !searchTerm || 
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'online' && d.online === true) ||
      (filterStatus === 'offline' && d.online === false) ||
      (filterStatus === 'unknown' && d.online === null);
    return matchesSearch && matchesStatus;
  });

  const onlineCount = devices.filter(d => d.online === true).length;
  const offlineCount = devices.filter(d => d.online === false).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-lg shadow-lg">
            <img src={DAHUA_LOGO} alt="Dahua" className="h-8 w-auto" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Grabadores P2P</h2>
            <p className="text-slate-400 text-sm">Monitorización DVR/NVR Dahua</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-semibold text-sm">{onlineCount}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 font-semibold text-sm">{offlineCount}</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-sm">{devices.length} total</span>
          </div>
          <Button onClick={openAddModal} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-1" /> Añadir
          </Button>
          <Button variant="outline" size="sm" onClick={handleCheckAll} disabled={checkingAll} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            {checkingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o serial..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="unknown">Sin verificar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Devices Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{devices.length === 0 ? 'No hay grabadores configurados' : 'No hay resultados'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
          {filteredDevices.map((device) => (
            <div
              key={device.id}
              data-testid={`dahua-device-${device.id}`}
              className={cn(
                "relative bg-card rounded-xl border-2 p-4 transition-all hover:shadow-lg",
                device.online === true ? "border-emerald-500/50 shadow-emerald-500/10" :
                device.online === false ? "border-red-500/50 shadow-red-500/10" :
                "border-slate-500/30"
              )}
            >
              <div className={cn(
                "absolute top-3 right-3 w-3 h-3 rounded-full",
                device.online === true ? "bg-emerald-500 animate-pulse" :
                device.online === false ? "bg-red-500" : "bg-slate-400"
              )} />

              <div className="flex items-start gap-3 mb-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  device.online === true ? "bg-emerald-500/10" :
                  device.online === false ? "bg-red-500/10" : "bg-slate-500/10"
                )}>
                  {device.online === true ? <Wifi className="w-5 h-5 text-emerald-500" /> :
                   device.online === false ? <WifiOff className="w-5 h-5 text-red-500" /> :
                   <HardDrive className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{device.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">{device.serial_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu className="w-3 h-3" />
                  <span className="truncate">{device.device_type || 'DVR/NVR'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Video className="w-3 h-3" />
                  <span>{device.channels || '-'} canales</span>
                </div>
                {device.storage_used_percent !== null && device.storage_used_percent !== undefined && (
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Database className="w-3 h-3" /> Almacenamiento
                      </span>
                      <span className={cn("font-medium",
                        device.storage_used_percent > 90 ? "text-red-500" :
                        device.storage_used_percent > 75 ? "text-amber-500" : "text-emerald-500"
                      )}>{device.storage_used_percent}%</span>
                    </div>
                    <Progress value={device.storage_used_percent} className="h-1.5" />
                  </div>
                )}
                <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Verificado: {formatDate(device.last_check)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {device.recording_active === true && (
                  <Badge variant="outline" className="text-[10px] border-red-500 text-red-500 gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                  </Badge>
                )}
                {device.hdd_healthy === true && (
                  <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-500 gap-1">
                    <CheckCircle className="w-2.5 h-2.5" /> HDD OK
                  </Badge>
                )}
                {device.hdd_healthy === false && (
                  <Badge variant="outline" className="text-[10px] border-red-500 text-red-500 gap-1">
                    <XCircle className="w-2.5 h-2.5" /> HDD ERROR
                  </Badge>
                )}
                {device.firmware_version && (
                  <Badge variant="outline" className="text-[10px] border-slate-500 text-slate-500">
                    v{device.firmware_version}
                  </Badge>
                )}
              </div>

              {device.last_error && (
                <div className="text-[10px] text-red-500 bg-red-500/10 p-2 rounded mb-3 truncate">
                  {device.last_error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <TooltipProvider>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => handleCheckDevice(device.id)} disabled={checking[device.id]} className="h-8 w-8 p-0">
                          {checking[device.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Verificar estado</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(device)} className="h-8 w-8 p-0">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDevice(device.id, device.name)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <Badge variant={device.online === true ? "default" : device.online === false ? "destructive" : "secondary"} className="text-[10px]">
                  {device.online === true ? 'ONLINE' : device.online === false ? 'OFFLINE' : 'SIN VERIFICAR'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal || editingDevice !== null} onOpenChange={(open) => { 
        if (!open) { 
          setShowAddModal(false); 
          setEditingDevice(null); 
          resetForm(); 
        } 
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDevice ? (
                <><Edit2 className="w-5 h-5" /> Editar Grabador</>
              ) : (
                <><Plus className="w-5 h-5" /> Añadir Grabador</>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingDevice ? 'Modifica los datos del grabador' : 'Conexión P2P al DVR/NVR Dahua'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input 
                data-testid="dahua-name-input" 
                placeholder="Ej: Oficina Central" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>Número de Serie (P2P) *</Label>
              <div className="flex gap-2">
                <Input 
                  data-testid="dahua-serial-input" 
                  placeholder="Ej: 4M0A1B2C3D4E5F6G" 
                  value={formData.serial_number} 
                  onChange={(e) => { 
                    setFormData({ ...formData, serial_number: e.target.value.toUpperCase() }); 
                    setSerialValid(null); 
                  }}
                  className={cn(serialValid === true && "border-emerald-500", serialValid === false && "border-red-500")} 
                />
                <Button type="button" variant="outline" size="icon" onClick={handleQuickCheckSerial} disabled={serialChecking || !formData.serial_number} title="Verificar en Easy4IP">
                  {serialChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">App DMSS o Configuración &gt; Red &gt; P2P</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Input 
                  data-testid="dahua-username-input" 
                  placeholder="admin" 
                  value={formData.username} 
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <div className="relative">
                  <Input 
                    data-testid="dahua-password-input" 
                    type={showPassword.form ? 'text' : 'password'} 
                    placeholder="Contraseña" 
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword({ ...showPassword, form: !showPassword.form })}>
                    {showPassword.form ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            {groups.length > 0 && (
              <div className="space-y-2">
                <Label>Grupo (opcional)</Label>
                <Select value={formData.group_id} onValueChange={(v) => setFormData({ ...formData, group_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {groups.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setShowAddModal(false); setEditingDevice(null); resetForm(); }}
              disabled={saving}
            >
              Cancelar
            </Button>
            
            {editingDevice ? (
              <Button 
                data-testid="dahua-save-btn" 
                onClick={handleUpdateDevice}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </Button>
            ) : (
              <>
                <Button 
                  variant="secondary"
                  onClick={() => handleAddDevice(false)}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </Button>
                <Button 
                  data-testid="dahua-save-new-btn" 
                  onClick={() => handleAddDevice(true)}
                  disabled={saving}
                  className="gap-2 bg-cyan-600 hover:bg-cyan-700"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  Guardar y Nuevo
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DahuaDevicesPanel;
DAHUA_EOF

echo ""
echo "=========================================="
echo "  ¡Correcciones aplicadas!"
echo "=========================================="
echo ""
echo "Ejecuta ahora:"
echo "  cd /opt/siempria-monitor/frontend && yarn build"
echo ""
