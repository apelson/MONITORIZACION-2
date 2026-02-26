/**
 * Dahua P2P Devices Panel
 * Manage and monitor Dahua DVR/NVR devices via P2P connection
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  HardDrive, Wifi, WifiOff, Plus, Trash2, RefreshCw, Edit2,
  CheckCircle, XCircle, AlertTriangle, Play, Square, Database,
  Loader2, Eye, EyeOff, ChevronDown, ChevronUp, Search, Upload, FileUp,
  Wrench, ClipboardList
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
  
  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

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

  // SmartPSS Import handler
  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xml') && !file.name.endsWith('.XML')) {
      toast.error('Por favor selecciona un archivo XML exportado de SmartPSS');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      console.log('Uploading file:', file.name, file.size);
      
      const response = await authAxios.post('/dahua/import/smartpss', formDataUpload);

      console.log('Import response:', response.data);
      setImportResult(response.data);
      toast.success(response.data.message || `Importados: ${response.data.imported}, Actualizados: ${response.data.updated}`);
      fetchDevices();
      fetchStatusSummary();
    } catch (error) {
      console.error('Import error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Error al importar archivo';
      toast.error(errorMsg);
      setImportResult({
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [errorMsg]
      });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
                <div className="p-2 bg-white rounded-lg shadow-sm border flex items-center justify-center">
                  <img 
                    src={DAHUA_LOGO} 
                    alt="Dahua" 
                    className="h-8 w-auto object-contain"
                  />
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Grabador
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowImportModal(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar SmartPSS
                </Button>
              </div>
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

            {/* Devices grid */}
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
              <ScrollArea className="h-[calc(100vh-350px)] min-h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                  {devices.map((device) => (
                    <Card
                      key={device.id}
                      data-testid={`dahua-device-${device.id}`}
                      className={cn(
                        "transition-all hover:shadow-md",
                        device.online === true
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : device.online === false
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-slate-500/30 bg-slate-500/5"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(device)}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium truncate">{device.name}</h4>
                                {getRecordingIcon(device)}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                SN: {device.serial_number}
                              </p>
                              {device.device_type && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {device.device_type}
                                </p>
                              )}
                              {device.last_check && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(device.last_check).toLocaleString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Storage indicator */}
                        {device.storage_used_percent !== null && device.storage_used_percent !== undefined && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Almacenamiento</span>
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

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCheckSingle(device.id)}
                            disabled={checking[device.id]}
                            title="Verificar"
                          >
                            {checking[device.id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(device)}
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(device.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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

      {/* Import SmartPSS Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar desde SmartPSS
            </DialogTitle>
            <DialogDescription>
              Importa grabadores desde un archivo XML exportado de SmartPSS.
              Los dispositivos existentes serán actualizados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File upload area */}
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                importing ? "border-muted bg-muted/50" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,.XML"
                onChange={handleImportFile}
                className="hidden"
                disabled={importing}
              />
              {importing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Importando dispositivos...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileUp className="w-10 h-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Selecciona un archivo XML</p>
                    <p className="text-sm text-muted-foreground mb-3">Exportado desde SmartPSS</p>
                  </div>
                  <Button 
                    type="button"
                    variant="default"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar Archivo XML
                  </Button>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                ¿Cómo exportar desde SmartPSS?
              </h4>
              <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                <li>Abre SmartPSS y ve a <strong>Dispositivos</strong></li>
                <li>Clic derecho en la lista → <strong>Exportar</strong></li>
                <li>Guarda como archivo <strong>.xml</strong></li>
                <li>Sube el archivo aquí</li>
              </ol>
            </div>

            {/* Import results */}
            {importResult && (
              <div className={cn(
                "p-4 rounded-lg",
                importResult.errors?.length > 0 
                  ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" 
                  : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
              )}>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  {importResult.errors?.length > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  )}
                  Resultado de la importación
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center mb-3">
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                    <p className="text-xs text-muted-foreground">Nuevos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                    <p className="text-xs text-muted-foreground">Actualizados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-600">{importResult.skipped}</p>
                    <p className="text-xs text-muted-foreground">Omitidos</p>
                  </div>
                </div>
                
                {importResult.errors?.length > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    <p className="font-medium">Errores:</p>
                    <ul className="list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.devices?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-1">Dispositivos procesados:</p>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1">
                        {importResult.devices.slice(0, 20).map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="truncate">{d.name}</span>
                            <Badge variant="outline" className={cn(
                              "text-[10px] ml-2",
                              d.action === 'created' ? "border-emerald-500 text-emerald-500" : "border-blue-500 text-blue-500"
                            )}>
                              {d.action === 'created' ? 'nuevo' : 'actualizado'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportModal(false);
              setImportResult(null);
            }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DahuaDevicesPanel;
