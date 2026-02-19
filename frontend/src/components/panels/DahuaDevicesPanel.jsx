/**
 * Dahua P2P Devices Panel
 * Manage and monitor Dahua DVR/NVR devices via P2P connection
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  HardDrive, Wifi, WifiOff, Plus, Trash2, RefreshCw, Edit2,
  CheckCircle, XCircle, AlertTriangle, Play, Square, Database,
  Loader2, Eye, EyeOff, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// Dahua official logo - uploaded by user
const DAHUA_LOGO = "https://customer-assets.emergentagent.com/job_9daa6c94-1292-4e32-a6ac-374cc483718a/artifacts/er710utf_dahua-technology-logo.png";

const DahuaDevicesPanel = ({ authAxios, groups = [], organizations = [] }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState({});
  const [checkingAll, setCheckingAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [statusSummary, setStatusSummary] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    username: 'admin',
    password: '',
    group_id: '',
    organization_id: ''
  });
  
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

  const fetchStatusSummary = useCallback(async () => {
    try {
      const response = await authAxios.get('/dahua/status');
      setStatusSummary(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchDevices();
    fetchStatusSummary();
  }, [fetchDevices, fetchStatusSummary]);

  const handleAddDevice = async () => {
    if (!formData.name || !formData.serial_number || !formData.password) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    try {
      await authAxios.post('/dahua/devices', formData);
      toast.success('Dispositivo Dahua añadido');
      setShowAddModal(false);
      resetForm();
      fetchDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al añadir dispositivo');
    }
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    try {
      await authAxios.put(`/dahua/devices/${editingDevice.id}`, formData);
      toast.success('Dispositivo actualizado');
      setEditingDevice(null);
      resetForm();
      fetchDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar');
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
      toast.success(`Verificación completada: ${response.data.online ? 'Online' : 'Offline'}`);
      fetchDevices();
      fetchStatusSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al verificar dispositivo');
    } finally {
      setChecking(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      const response = await authAxios.post('/dahua/check-all');
      const summary = response.data.summary;
      toast.success(`Verificación completada: ${summary.online}/${summary.total} online`);
      fetchDevices();
      fetchStatusSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al verificar dispositivos');
    } finally {
      setCheckingAll(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      serial_number: '',
      username: 'admin',
      password: '',
      group_id: '',
      organization_id: ''
    });
    setSerialValid(null);
  };
  
  const handleQuickCheckSerial = async () => {
    if (!formData.serial_number || formData.serial_number.length < 10) {
      toast.error('Introduce un número de serie válido');
      return;
    }
    
    setSerialChecking(true);
    try {
      const response = await authAxios.post(`/dahua/quick-check/${formData.serial_number}`);
      if (response.data.cloud_registered) {
        setSerialValid(true);
        toast.success('Dispositivo encontrado en Easy4IP Cloud');
      } else {
        setSerialValid(false);
        toast.error(response.data.error || 'Dispositivo no encontrado');
      }
    } catch (error) {
      setSerialValid(false);
      toast.error(error.response?.data?.detail || 'Error al verificar');
    } finally {
      setSerialChecking(false);
    }
  };

  const openEditModal = (device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name || '',
      serial_number: device.serial_number || '',
      username: device.username || 'admin',
      password: '',
      group_id: device.group_id || '',
      organization_id: device.organization_id || ''
    });
  };

  const getStatusIcon = (device) => {
    if (device.online === null || device.online === undefined) {
      return <HardDrive className="w-5 h-5 text-slate-400" />;
    }
    return device.online ? (
      <Wifi className="w-5 h-5 text-emerald-500" />
    ) : (
      <WifiOff className="w-5 h-5 text-red-500" />
    );
  };

  const getRecordingIcon = (device) => {
    if (device.recording_active === null || device.recording_active === undefined) {
      return null;
    }
    return device.recording_active ? (
      <Badge variant="outline" className="border-red-500 text-red-500 text-xs">
        <div className="w-2 h-2 rounded-full bg-red-500 mr-1 animate-pulse" />
        REC
      </Badge>
    ) : (
      <Badge variant="outline" className="border-slate-500 text-slate-500 text-xs">
        <Square className="w-3 h-3 mr-1" />
        STOP
      </Badge>
    );
  };

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border flex items-center justify-center min-w-[40px]">
                  <span className="text-lg font-bold text-[#E31837]">DAHUA</span>
                </div>
                <div>
                  <CardTitle className="text-lg">Grabadores P2P</CardTitle>
                  <CardDescription>
                    Monitorización de DVR/NVR Dahua vía conexión P2P
                  </CardDescription>
                </div>
                {statusSummary && (
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                      {statusSummary.summary?.online || 0} online
                    </Badge>
                    {(statusSummary.summary?.offline || 0) > 0 && (
                      <Badge variant="outline" className="border-red-500 text-red-500">
                        {statusSummary.summary.offline} offline
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <Button onClick={() => setShowAddModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Añadir Grabador
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckAll}
                  disabled={checkingAll || devices.length === 0}
                >
                  {checkingAll ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Verificar Todos
                </Button>
              </div>
            </div>

            {/* Status summary */}
            {statusSummary?.issues?.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Problemas Detectados
                </h4>
                <div className="space-y-1">
                  {statusSummary.issues.slice(0, 5).map((issue, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <strong>{issue.name}</strong>: {issue.issues.join(', ')}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Devices list */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay grabadores Dahua configurados</p>
                <p className="text-sm">Haz clic en "Añadir Grabador" para comenzar</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      data-testid={`dahua-device-${device.id}`}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        device.online === true
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : device.online === false
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-slate-500/30 bg-slate-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getStatusIcon(device)}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{device.name}</h4>
                              {getRecordingIcon(device)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              SN: {device.serial_number}
                            </p>
                            {device.device_type && (
                              <p className="text-xs text-muted-foreground">
                                {device.device_type}
                              </p>
                            )}
                            {device.last_check && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Última verificación: {new Date(device.last_check).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Storage indicator */}
                          {device.storage_used_percent !== null && device.storage_used_percent !== undefined && (
                            <div className="w-24">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <Database className="w-3 h-3" />
                                <span>{device.storage_used_percent}%</span>
                              </div>
                              <Progress
                                value={device.storage_used_percent}
                                className={cn(
                                  "h-1.5",
                                  device.storage_used_percent > 90 ? "bg-red-200" : ""
                                )}
                              />
                            </div>
                          )}

                          {/* HDD Health */}
                          {device.hdd_healthy !== null && device.hdd_healthy !== undefined && (
                            <Badge
                              variant="outline"
                              className={
                                device.hdd_healthy
                                  ? "border-emerald-500 text-emerald-500"
                                  : "border-red-500 text-red-500"
                              }
                            >
                              {device.hdd_healthy ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              HDD
                            </Badge>
                          )}

                          {/* Actions */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCheckDevice(device.id)}
                            disabled={checking[device.id]}
                          >
                            {checking[device.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(device)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDevice(device.id, device.name)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Error message */}
                      {device.last_error && (
                        <p className="text-xs text-red-500 mt-2">
                          Error: {device.last_error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Add/Edit Modal */}
      <Dialog
        open={showAddModal || editingDevice !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingDevice(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDevice ? 'Editar Grabador Dahua' : 'Añadir Grabador Dahua'}
            </DialogTitle>
            <DialogDescription>
              Configura la conexión P2P al grabador DVR/NVR Dahua
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                data-testid="dahua-name-input"
                placeholder="Ej: Grabador Oficina Central"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    setFormData({ ...formData, serial_number: e.target.value });
                    setSerialValid(null);
                  }}
                  className={cn(
                    serialValid === true && "border-emerald-500",
                    serialValid === false && "border-red-500"
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleQuickCheckSerial}
                  disabled={serialChecking || !formData.serial_number}
                  title="Verificar en Easy4IP Cloud"
                >
                  {serialChecking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Lo encuentras en la app DMSS o en Configuración &gt; Red &gt; P2P
                </p>
                {serialValid === true && (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-500 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                )}
                {serialValid === false && (
                  <Badge variant="outline" className="border-red-500 text-red-500 text-xs">
                    <XCircle className="w-3 h-3 mr-1" />
                    No encontrado
                  </Badge>
                )}
              </div>
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
                    placeholder="Contraseña del grabador"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword({ ...showPassword, form: !showPassword.form })}
                  >
                    {showPassword.form ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {groups.length > 0 && (
              <div className="space-y-2">
                <Label>Grupo (opcional)</Label>
                <Select
                  value={formData.group_id}
                  onValueChange={(v) => setFormData({ ...formData, group_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingDevice(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              data-testid="dahua-save-btn"
              onClick={editingDevice ? handleUpdateDevice : handleAddDevice}
            >
              {editingDevice ? 'Guardar Cambios' : 'Añadir Grabador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DahuaDevicesPanel;
