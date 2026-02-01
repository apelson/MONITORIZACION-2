/**
 * Infrastructure Panel Component
 * Monitors VMware ESXi, QNAP, and Synology devices
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  Server, HardDrive, Database, Plus, RefreshCw, Trash2, Edit, 
  Wifi, WifiOff, Cpu, MemoryStick, Monitor, Play, Square, Pause,
  AlertTriangle, CheckCircle, XCircle, Eye, Settings, Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const InfrastructurePanel = ({ authAxios: externalAuthAxios }) => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceDetails, setDeviceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [summary, setSummary] = useState(null);
  
  // Create internal axios instance with auth
  const authAxios = useMemo(() => {
    if (externalAuthAxios) return externalAuthAxios;
    
    const instance = axios.create({ baseURL: API });
    instance.interceptors.request.use((config) => { 
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`; 
      }
      return config; 
    });
    return instance;
  }, [externalAuthAxios]);
  
  const [formData, setFormData] = useState({
    name: '',
    device_type: 'esxi',
    host: '',
    port: '',
    username: '',
    password: '',
    use_ssl: true,
    notes: ''
  });

  // Fetch devices on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadDevices = async () => {
      console.log('InfrastructurePanel: Loading devices...');
      const token = localStorage.getItem("token");
      
      try {
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        
        const [devRes, sumRes] = await Promise.all([
          fetch(`${API}/infrastructure/devices`, { headers }).then(r => r.json()),
          fetch(`${API}/infrastructure/summary`, { headers }).then(r => r.json())
        ]);
        
        console.log('InfrastructurePanel: Data loaded', devRes, sumRes);
        
        if (isMounted) {
          setDevices(devRes.devices || []);
          setSummary(sumRes);
          setLoading(false);
        }
      } catch (err) {
        console.error('InfrastructurePanel: Load error', err);
        if (isMounted) {
          toast.error(t('infra.fetchError', 'Error al cargar dispositivos'));
          setLoading(false);
        }
      }
    };
    
    loadDevices();
    
    return () => { isMounted = false; };
  }, [t]);
  
  // Manual refresh
  const fetchDevices = useCallback(async () => {
    try {
      const [devRes, sumRes] = await Promise.all([
        authAxios.get('/infrastructure/devices'),
        authAxios.get('/infrastructure/summary')
      ]);
      setDevices(devRes.data.devices || []);
      setSummary(sumRes.data);
    } catch (e) {
      toast.error(t('infra.fetchError', 'Error al cargar'));
    }
  }, [authAxios, t]);

  // Refresh all devices
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await authAxios.post('/infrastructure/devices/check-all');
      toast.success(t('infra.checkingAll', 'Verificando todos los dispositivos...'));
      setTimeout(fetchDevices, 3000);
    } catch (e) {
      toast.error(t('common.error', 'Error'));
    }
    setRefreshing(false);
  };

  // Check single device
  const handleCheckDevice = async (deviceId) => {
    try {
      const res = await authAxios.post(`/infrastructure/devices/${deviceId}/check`);
      toast.success(res.data.status === 'online' ? t('infra.deviceOnline', 'Dispositivo online') : t('infra.deviceOffline', 'Dispositivo offline'));
      fetchDevices();
    } catch (e) {
      toast.error(t('common.error', 'Error'));
    }
  };

  // Test connection before saving
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await authAxios.post('/infrastructure/test-connection', {
        device_type: formData.device_type,
        host: formData.host,
        port: formData.port ? parseInt(formData.port) : null,
        username: formData.username,
        password: formData.password,
        use_ssl: formData.use_ssl
      });
      
      if (res.data.success) {
        toast.success(t('infra.connectionSuccess', 'Conexión exitosa'));
      } else {
        toast.error(res.data.message || t('infra.connectionFailed', 'No se pudo conectar'));
      }
    } catch (e) {
      toast.error(t('infra.connectionFailed', 'No se pudo conectar'));
    }
    setTestingConnection(false);
  };

  // Save device
  const handleSaveDevice = async () => {
    if (!formData.name || !formData.host || !formData.username || !formData.password) {
      toast.error(t('validation.completeFields', 'Completa los campos requeridos'));
      return;
    }
    
    try {
      const payload = {
        ...formData,
        port: formData.port ? parseInt(formData.port) : null
      };
      
      if (selectedDevice) {
        await authAxios.put(`/infrastructure/devices/${selectedDevice.id}`, payload);
        toast.success(t('common.updated', 'Actualizado'));
      } else {
        await authAxios.post('/infrastructure/devices', payload);
        toast.success(t('common.created', 'Creado'));
      }
      setDialogOpen(false);
      fetchDevices();
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error', 'Error'));
    }
  };

  // Delete device
  const handleDeleteDevice = async () => {
    try {
      await authAxios.delete(`/infrastructure/devices/${selectedDevice.id}`);
      toast.success(t('common.deleted', 'Eliminado'));
      setDeleteDialogOpen(false);
      fetchDevices();
    } catch (e) {
      toast.error(t('common.error', 'Error'));
    }
  };

  // View device details
  const handleViewDetails = async (device) => {
    setSelectedDevice(device);
    setDeviceDetails(null);
    setDetailsOpen(true);
    setDetailsLoading(true);
    
    try {
      const res = await authAxios.post(`/infrastructure/devices/${device.id}/check`);
      setDeviceDetails(res.data.details);
    } catch (e) {
      toast.error(t('infra.detailsError', 'Error al obtener detalles'));
    }
    setDetailsLoading(false);
  };

  // Open dialog for new/edit
  const openDialog = (device = null) => {
    setSelectedDevice(device);
    if (device) {
      setFormData({
        name: device.name || '',
        device_type: device.device_type || 'esxi',
        host: device.host || '',
        port: device.port?.toString() || '',
        username: device.username || '',
        password: '', // Don't show password
        use_ssl: device.use_ssl ?? true,
        notes: device.notes || ''
      });
    } else {
      setFormData({
        name: '',
        device_type: 'esxi',
        host: '',
        port: '',
        username: '',
        password: '',
        use_ssl: true,
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  // Get device icon
  const getDeviceIcon = (type) => {
    switch (type) {
      case 'esxi': return <Server className="w-5 h-5" />;
      case 'qnap': return <Database className="w-5 h-5" />;
      case 'synology': return <HardDrive className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  // Get device type label
  const getTypeLabel = (type) => {
    switch (type) {
      case 'esxi': return 'VMware ESXi';
      case 'qnap': return 'QNAP NAS';
      case 'synology': return 'Synology NAS';
      default: return type;
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    if (status === 'online') {
      return <Badge className="bg-green-500"><Wifi className="w-3 h-3 mr-1" />{t('devices.online', 'Online')}</Badge>;
    } else if (status === 'offline') {
      return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />{t('devices.offline', 'Offline')}</Badge>;
    }
    return <Badge variant="secondary">{t('devices.unknown', 'Desconocido')}</Badge>;
  };

  // Default ports by type
  const getDefaultPort = (type, ssl) => {
    if (type === 'esxi') return '443';
    if (type === 'qnap') return ssl ? '443' : '8080';
    if (type === 'synology') return ssl ? '5001' : '5000';
    return '443';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('infra.totalDevices', 'Total Dispositivos')}</p>
                  <p className="text-2xl font-bold">{summary.total_devices}</p>
                </div>
                <Server className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('devices.online', 'Online')}</p>
                  <p className="text-2xl font-bold text-green-600">{summary.online}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('infra.totalVMs', 'VMs Totales')}</p>
                  <p className="text-2xl font-bold">{summary.by_type?.esxi?.total_vms || 0}</p>
                </div>
                <Monitor className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('infra.vmsRunning', 'VMs Encendidas')}</p>
                  <p className="text-2xl font-bold text-green-600">{summary.by_type?.esxi?.vms_on || 0}</p>
                </div>
                <Play className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Server className="w-5 h-5" />
            {t('infra.title', 'Infraestructura')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('infra.subtitle', 'VMware ESXi, QNAP y Synology')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshAll} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Actualizar')}
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('infra.addDevice', 'Añadir Dispositivo')}
          </Button>
        </div>
      </div>

      {/* Devices by Type */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">{t('common.all', 'Todos')} ({devices.length})</TabsTrigger>
          <TabsTrigger value="esxi">ESXi ({devices.filter(d => d.device_type === 'esxi').length})</TabsTrigger>
          <TabsTrigger value="qnap">QNAP ({devices.filter(d => d.device_type === 'qnap').length})</TabsTrigger>
          <TabsTrigger value="synology">Synology ({devices.filter(d => d.device_type === 'synology').length})</TabsTrigger>
        </TabsList>

        {['all', 'esxi', 'qnap', 'synology'].map(tab => (
          <TabsContent key={tab} value={tab}>
            {devices.length === 0 ? (
              <div className="text-center py-12">
                <Server className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">{t('infra.noDevices', 'No hay dispositivos de infraestructura')}</p>
                <Button className="mt-4" onClick={() => openDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('infra.addFirst', 'Añadir primer dispositivo')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {devices
                  .filter(d => tab === 'all' || d.device_type === tab)
                  .map(device => (
                    <Card key={device.id} className={`hover:shadow-md transition-shadow ${device.status === 'offline' ? 'border-red-300 bg-red-50/50' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${
                              device.device_type === 'esxi' ? 'bg-blue-100 text-blue-600' :
                              device.device_type === 'qnap' ? 'bg-purple-100 text-purple-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {getDeviceIcon(device.device_type)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{device.name}</CardTitle>
                              <p className="text-xs text-muted-foreground">{getTypeLabel(device.device_type)}</p>
                            </div>
                          </div>
                          {getStatusBadge(device.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Host:</span>
                            <span className="font-mono">{device.host}:{device.port}</span>
                          </div>
                          {device.last_check && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('devices.lastCheck', 'Última verificación')}:</span>
                              <span className="text-xs">{new Date(device.last_check).toLocaleString()}</span>
                            </div>
                          )}
                          
                          {/* ESXi VM Summary */}
                          {device.device_type === 'esxi' && device.last_status?.summary && (
                            <div className="mt-2 pt-2 border-t">
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <p className="text-lg font-semibold">{device.last_status.summary.total_vms}</p>
                                  <p className="text-xs text-muted-foreground">VMs</p>
                                </div>
                                <div>
                                  <p className="text-lg font-semibold text-green-600">{device.last_status.summary.powered_on}</p>
                                  <p className="text-xs text-muted-foreground">On</p>
                                </div>
                                <div>
                                  <p className="text-lg font-semibold text-red-600">{device.last_status.summary.powered_off}</p>
                                  <p className="text-xs text-muted-foreground">Off</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 mt-4 pt-2 border-t">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(device)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCheckDevice(device.id)}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDialog(device)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setSelectedDevice(device); setDeleteDialogOpen(true); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDevice ? t('infra.editDevice', 'Editar Dispositivo') : t('infra.addDevice', 'Añadir Dispositivo')}
            </DialogTitle>
            <DialogDescription>
              {t('infra.deviceDescription', 'Configura los datos de conexión del dispositivo')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name', 'Nombre')} *</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Servidor ESXi Principal"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('common.type', 'Tipo')} *</Label>
              <Select 
                value={formData.device_type} 
                onValueChange={v => setFormData({...formData, device_type: v, port: getDefaultPort(v, formData.use_ssl)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="esxi">VMware ESXi / vCenter</SelectItem>
                  <SelectItem value="qnap">QNAP NAS</SelectItem>
                  <SelectItem value="synology">Synology NAS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label>Host *</Label>
                <Input 
                  value={formData.host} 
                  onChange={e => setFormData({...formData, host: e.target.value})}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('devices.port', 'Puerto')}</Label>
                <Input 
                  value={formData.port} 
                  onChange={e => setFormData({...formData, port: e.target.value})}
                  placeholder={getDefaultPort(formData.device_type, formData.use_ssl)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t('auth.username', 'Usuario')} *</Label>
              <Input 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})}
                placeholder="root"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('auth.password', 'Contraseña')} *</Label>
              <Input 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder={selectedDevice ? '(sin cambios)' : '••••••••'}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('infra.useSSL', 'Usar SSL/HTTPS')}</Label>
              <Switch 
                checked={formData.use_ssl} 
                onCheckedChange={v => setFormData({...formData, use_ssl: v, port: getDefaultPort(formData.device_type, v)})}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
              {testingConnection ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
              {t('infra.testConnection', 'Probar Conexión')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancelar')}</Button>
              <Button onClick={handleSaveDevice}>{t('common.save', 'Guardar')}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDevice && getDeviceIcon(selectedDevice.device_type)}
              {selectedDevice?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedDevice && getTypeLabel(selectedDevice.device_type)} - {selectedDevice?.host}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[50vh]">
            {detailsLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : deviceDetails ? (
              <div className="space-y-4 p-4">
                {/* Connection Status */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      {deviceDetails.connected ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {deviceDetails.connected ? t('infra.connected', 'Conectado') : t('infra.disconnected', 'Desconectado')}
                      </span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {new Date(deviceDetails.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* ESXi VMs */}
                {selectedDevice?.device_type === 'esxi' && deviceDetails.vms && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        {t('infra.virtualMachines', 'Máquinas Virtuales')} ({deviceDetails.vms.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {deviceDetails.vms.map((vm, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <div className="flex items-center gap-2">
                              {vm.power_state === 'POWERED_ON' ? (
                                <Play className="w-4 h-4 text-green-500" />
                              ) : vm.power_state === 'SUSPENDED' ? (
                                <Pause className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="font-medium">{vm.name}</span>
                            </div>
                            <Badge variant={vm.power_state === 'POWERED_ON' ? 'default' : 'secondary'}>
                              {vm.power_state?.replace('POWERED_', '').replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ESXi Datastores */}
                {selectedDevice?.device_type === 'esxi' && deviceDetails.datastores && deviceDetails.datastores.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        {t('infra.datastores', 'Datastores')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {deviceDetails.datastores.map((ds, i) => (
                          <div key={i} className="p-2 rounded bg-muted/50">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">{ds.name}</span>
                              <span className="text-sm text-muted-foreground">{ds.type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* NAS Storage Info */}
                {(selectedDevice?.device_type === 'qnap' || selectedDevice?.device_type === 'synology') && (
                  <>
                    {deviceDetails.disks && deviceDetails.disks.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <HardDrive className="w-4 h-4" />
                            {t('infra.disks', 'Discos')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {deviceDetails.disks.map((disk, i) => (
                              <div key={i} className="p-2 rounded bg-muted/50">
                                <div className="flex justify-between">
                                  <span className="font-medium">{disk.name || `Disco ${i + 1}`}</span>
                                  <Badge variant={disk.status === 'normal' || disk.status === 'healthy' ? 'default' : 'destructive'}>
                                    {disk.status || 'OK'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {deviceDetails.volumes && deviceDetails.volumes.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            {t('infra.volumes', 'Volúmenes')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {deviceDetails.volumes.map((vol, i) => (
                              <div key={i} className="p-2 rounded bg-muted/50">
                                <span className="font-medium">{vol.name || vol.id || `Volumen ${i + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {deviceDetails.surveillance && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            {t('infra.surveillance', 'Vigilancia')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {deviceDetails.surveillance.cameras?.length || 0} {t('infra.camerasConfigured', 'cámaras configuradas')}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* Raw data for debugging */}
                {deviceDetails.system_info && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        {t('infra.systemInfo', 'Información del Sistema')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(deviceDetails.system_info, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('infra.noDetails', 'No hay detalles disponibles')}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t('common.confirm', 'Confirmar')}
            </DialogTitle>
            <DialogDescription>
              {t('infra.deleteConfirm', '¿Estás seguro de eliminar')} &quot;{selectedDevice?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel', 'Cancelar')}</Button>
            <Button variant="destructive" onClick={handleDeleteDevice}>{t('common.delete', 'Eliminar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfrastructurePanel;
