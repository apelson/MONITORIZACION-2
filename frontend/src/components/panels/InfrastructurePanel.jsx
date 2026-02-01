/**
 * Infrastructure Panel Component - Enhanced Version
 * Monitors VMware ESXi, QNAP, and Synology devices
 * With quick actions, web links, and detailed VM/NAS info
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  Server, HardDrive, Database, Plus, RefreshCw, Trash2, Edit, 
  Wifi, WifiOff, Cpu, Monitor, Play, Square, Pause, Globe,
  AlertTriangle, CheckCircle, XCircle, Eye, Settings, Activity,
  ExternalLink, Thermometer, MemoryStick, Clock, Zap, Info, ClipboardList
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Cache for device status to speed up loading
const deviceCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

const InfrastructurePanel = ({ authAxios: externalAuthAxios, onCreateIncident }) => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceDetails, setDeviceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [summary, setSummary] = useState(null);
  const isMounted = useRef(true);
  
  // Create internal axios instance with auth
  const authAxios = useMemo(() => {
    if (externalAuthAxios) return externalAuthAxios;
    const instance = axios.create({ baseURL: API });
    instance.interceptors.request.use((config) => { 
      const token = localStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`; 
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

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Fetch devices on mount - optimized with cache
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Check cache first
        const cachedDevices = deviceCache.get('devices');
        const cachedSummary = deviceCache.get('summary');
        const cacheTime = deviceCache.get('timestamp');
        
        if (cachedDevices && cachedSummary && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
          setDevices(cachedDevices);
          setSummary(cachedSummary);
          setLoading(false);
          return;
        }
        
        const [devRes, sumRes] = await Promise.all([
          authAxios.get('/infrastructure/devices'),
          authAxios.get('/infrastructure/summary')
        ]);
        
        if (isMounted.current) {
          const devicesData = devRes.data.devices || [];
          const summaryData = sumRes.data;
          
          // Update cache
          deviceCache.set('devices', devicesData);
          deviceCache.set('summary', summaryData);
          deviceCache.set('timestamp', Date.now());
          
          setDevices(devicesData);
          setSummary(summaryData);
        }
      } catch (err) {
        console.error('InfrastructurePanel: Load error', err);
        if (isMounted.current) {
          toast.error(t('infra.fetchError', 'Error al cargar dispositivos'));
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };
    
    loadDevices();
  }, [authAxios, t]);
  
  // Manual refresh - clears cache
  const fetchDevices = useCallback(async () => {
    try {
      const [devRes, sumRes] = await Promise.all([
        authAxios.get('/infrastructure/devices'),
        authAxios.get('/infrastructure/summary')
      ]);
      const devicesData = devRes.data.devices || [];
      const summaryData = sumRes.data;
      
      // Update cache
      deviceCache.set('devices', devicesData);
      deviceCache.set('summary', summaryData);
      deviceCache.set('timestamp', Date.now());
      
      setDevices(devicesData);
      setSummary(summaryData);
    } catch (e) {
      toast.error(t('infra.fetchError', 'Error al cargar'));
    }
  }, [authAxios, t]);

  // Handle create incident for device
  const handleCreateIncident = (device) => {
    if (onCreateIncident) {
      onCreateIncident({
        title: `Incidencia: ${device.name}`,
        description: `Incidencia creada para dispositivo de infraestructura: ${device.name} (${device.device_type.toUpperCase()}) - ${device.host}:${device.port}`,
        device_name: device.name,
        device_type: device.device_type,
        device_host: device.host
      });
    } else {
      toast.info(t('infra.incidentCreated', 'Incidencia creada para') + ` ${device.name}`);
    }
  };

  // Refresh all devices
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await authAxios.post('/infrastructure/devices/check-all');
      toast.success(t('infra.checkingAll', 'Verificando todos los dispositivos...'));
      setTimeout(fetchDevices, 2000);
    } catch (e) {
      toast.error(t('common.error', 'Error'));
    }
    setRefreshing(false);
  };

  // Check single device - quick check
  const handleCheckDevice = async (deviceId) => {
    setCheckingDevice(deviceId);
    try {
      const res = await authAxios.post(`/infrastructure/devices/${deviceId}/check`);
      const status = res.data.status;
      toast.success(status === 'online' ? t('infra.deviceOnline', 'Dispositivo online') : t('infra.deviceOffline', 'Dispositivo offline'));
      
      // Update local state immediately
      setDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, status, last_check: new Date().toISOString(), last_status: res.data.details } : d
      ));
    } catch (e) {
      toast.error(t('common.error', 'Error al verificar'));
    }
    setCheckingDevice(null);
  };

  // Open web interface
  const handleOpenWebInterface = (device) => {
    const protocol = device.use_ssl ? 'https' : 'http';
    const url = `${protocol}://${device.host}:${device.port}`;
    window.open(url, '_blank');
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
    setDeviceDetails(device.last_status || null);
    setDetailsOpen(true);
    
    // If no cached details or offline, fetch fresh
    if (!device.last_status || device.status === 'unknown') {
      setDetailsLoading(true);
      try {
        const res = await authAxios.post(`/infrastructure/devices/${device.id}/check`);
        setDeviceDetails(res.data.details);
        // Update device in list
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { ...d, status: res.data.status, last_status: res.data.details } : d
        ));
      } catch (e) {
        toast.error(t('infra.detailsError', 'Error al obtener detalles'));
      }
      setDetailsLoading(false);
    }
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
        password: '',
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

  // Format bytes to human readable
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Cards - Compact */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('infra.totalDevices', 'Total Dispositivos')}</p>
                  <p className="text-xl font-bold">{summary.total_devices}</p>
                </div>
                <Server className="w-6 h-6 text-blue-500 opacity-50" />
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('devices.online', 'Online')}</p>
                  <p className="text-xl font-bold text-green-600">{summary.online}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500 opacity-50" />
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('infra.totalVMs', 'VMs Totales')}</p>
                  <p className="text-xl font-bold">{summary.by_type?.esxi?.total_vms || 0}</p>
                </div>
                <Monitor className="w-6 h-6 text-purple-500 opacity-50" />
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('infra.vmsRunning', 'VMs Encendidas')}</p>
                  <p className="text-xl font-bold text-green-600">{summary.by_type?.esxi?.vms_on || 0}</p>
                </div>
                <Play className="w-6 h-6 text-green-500 opacity-50" />
              </div>
            </Card>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Server className="w-5 h-5" />
              {t('infra.title', 'Infraestructura')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('infra.subtitle', 'VMware ESXi, QNAP y Synology')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh', 'Actualizar')}
            </Button>
            <Button size="sm" onClick={() => openDialog()}>
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
                      <Card key={device.id} className={`hover:shadow-md transition-shadow ${device.status === 'offline' ? 'border-red-300 bg-red-50/30' : device.status === 'online' ? 'border-green-200' : ''}`}>
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
                                <CardTitle className="text-sm font-medium">{device.name}</CardTitle>
                                <p className="text-xs text-muted-foreground">{getTypeLabel(device.device_type)}</p>
                              </div>
                            </div>
                            {getStatusBadge(device.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground text-xs">Host:</span>
                              <code className="text-xs bg-muted px-1 rounded">{device.host}:{device.port}</code>
                            </div>
                            {device.last_check && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">{t('devices.lastCheck', 'Última verificación')}:</span>
                                <span className="text-xs">{new Date(device.last_check).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                            
                            {/* ESXi VM Summary - Enhanced */}
                            {device.device_type === 'esxi' && device.last_status?.summary && (
                              <div className="mt-2 pt-2 border-t bg-blue-50/50 -mx-4 px-4 pb-2 rounded-b">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div>
                                    <p className="text-lg font-bold">{device.last_status.summary.total_vms}</p>
                                    <p className="text-[10px] text-muted-foreground">VMs</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-green-600">{device.last_status.summary.powered_on}</p>
                                    <p className="text-[10px] text-muted-foreground">On</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-red-600">{device.last_status.summary.powered_off}</p>
                                    <p className="text-[10px] text-muted-foreground">Off</p>
                                  </div>
                                </div>
                                {/* VMs List Preview */}
                                {device.last_status?.vms?.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {device.last_status.vms.slice(0, 3).map((vm, i) => (
                                      <div key={i} className="flex items-center justify-between text-xs bg-white/70 px-2 py-1 rounded">
                                        <div className="flex items-center gap-1">
                                          {vm.power_state === 'POWERED_ON' ? 
                                            <Play className="w-3 h-3 text-green-500" /> : 
                                            <Square className="w-3 h-3 text-gray-400" />
                                          }
                                          <span className="truncate max-w-[120px]">{vm.name}</span>
                                        </div>
                                        <Badge variant={vm.power_state === 'POWERED_ON' ? 'default' : 'secondary'} className="text-[9px] px-1 py-0">
                                          {vm.power_state === 'POWERED_ON' ? 'ON' : 'OFF'}
                                        </Badge>
                                      </div>
                                    ))}
                                    {device.last_status.vms.length > 3 && (
                                      <p className="text-[10px] text-center text-muted-foreground">+{device.last_status.vms.length - 3} más...</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* NAS Storage Info */}
                            {(device.device_type === 'qnap' || device.device_type === 'synology') && device.last_status?.connected && (
                              <div className="mt-2 pt-2 border-t bg-purple-50/50 -mx-4 px-4 pb-2 rounded-b">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div>
                                    <p className="text-lg font-bold">{device.last_status?.disks?.length || 0}</p>
                                    <p className="text-[10px] text-muted-foreground">Discos</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold">{device.last_status?.volumes?.length || 0}</p>
                                    <p className="text-[10px] text-muted-foreground">Volúmenes</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-green-600">{device.last_status?.services?.filter(s => s.status === 'running').length || 0}</p>
                                    <p className="text-[10px] text-muted-foreground">Servicios</p>
                                  </div>
                                </div>
                                {/* Services Preview */}
                                {device.last_status?.services?.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {device.last_status.services.slice(0, 2).map((svc, i) => (
                                      <div key={i} className="flex items-center justify-between text-xs bg-white/70 px-2 py-1 rounded">
                                        <span className="truncate max-w-[130px]">{svc.name}</span>
                                        <Badge variant="default" className="text-[9px] px-1 py-0 bg-green-500">{svc.status}</Badge>
                                      </div>
                                    ))}
                                    {device.last_status.services.length > 2 && (
                                      <p className="text-[10px] text-center text-muted-foreground">+{device.last_status.services.length - 2} servicios más...</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Actions - Enhanced with tooltips */}
                          <div className="flex justify-between items-center mt-3 pt-2 border-t">
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewDetails(device)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalles</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0" 
                                    onClick={() => handleCheckDevice(device.id)}
                                    disabled={checkingDevice === device.id}
                                  >
                                    <RefreshCw className={`w-4 h-4 ${checkingDevice === device.id ? 'animate-spin' : ''}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Verificar ahora</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenWebInterface(device)}>
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Abrir interfaz web</TooltipContent>
                              </Tooltip>
                            </div>
                            
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openDialog(device)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => { setSelectedDevice(device); setDeleteDialogOpen(true); }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            </div>
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

        {/* Details Dialog - Enhanced */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedDevice && getDeviceIcon(selectedDevice.device_type)}
                {selectedDevice?.name}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => handleOpenWebInterface(selectedDevice)}>
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Abrir Web
                </Button>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                {selectedDevice && getTypeLabel(selectedDevice.device_type)} - {selectedDevice?.host}:{selectedDevice?.port}
                {selectedDevice?.status === 'online' && <Badge className="bg-green-500">Online</Badge>}
                {selectedDevice?.status === 'offline' && <Badge variant="destructive">Offline</Badge>}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[55vh]">
              {detailsLoading ? (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : deviceDetails ? (
                <div className="space-y-4 p-2">
                  {/* Connection Status */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {deviceDetails.connected ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="font-medium">
                            {deviceDetails.connected ? t('infra.connected', 'Conectado') : t('infra.disconnected', 'Desconectado')}
                          </span>
                        </div>
                        {deviceDetails.timestamp && (
                          <span className="text-sm text-muted-foreground">
                            {new Date(deviceDetails.timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* ESXi VMs - Full List */}
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
                            <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${vm.power_state === 'POWERED_ON' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                              <div className="flex items-center gap-3">
                                {vm.power_state === 'POWERED_ON' ? (
                                  <Play className="w-5 h-5 text-green-500" />
                                ) : vm.power_state === 'SUSPENDED' ? (
                                  <Pause className="w-5 h-5 text-yellow-500" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400" />
                                )}
                                <div>
                                  <p className="font-medium">{vm.name}</p>
                                  {vm.guest_OS && <p className="text-xs text-muted-foreground">{vm.guest_OS}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {vm.cpu_count && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-xs">
                                        <Cpu className="w-3 h-3 mr-1" />{vm.cpu_count} vCPU
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>CPUs virtuales</TooltipContent>
                                  </Tooltip>
                                )}
                                {vm.memory_size_MiB && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-xs">
                                        <MemoryStick className="w-3 h-3 mr-1" />{Math.round(vm.memory_size_MiB / 1024)} GB
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Memoria RAM</TooltipContent>
                                  </Tooltip>
                                )}
                                <Badge variant={vm.power_state === 'POWERED_ON' ? 'default' : 'secondary'}>
                                  {vm.power_state?.replace('POWERED_', '')}
                                </Badge>
                              </div>
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
                          {t('infra.datastores', 'Datastores')} ({deviceDetails.datastores.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {deviceDetails.datastores.map((ds, i) => (
                            <div key={i} className="p-3 rounded-lg bg-muted/50">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{ds.name}</span>
                                <Badge variant="outline">{ds.type}</Badge>
                              </div>
                              {ds.capacity && ds.free_space && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Usado: {formatBytes(ds.capacity - ds.free_space)}</span>
                                    <span>Libre: {formatBytes(ds.free_space)}</span>
                                  </div>
                                  <Progress value={((ds.capacity - ds.free_space) / ds.capacity) * 100} className="h-2" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* NAS Storage Info */}
                  {(selectedDevice?.device_type === 'qnap' || selectedDevice?.device_type === 'synology') && (
                    <>
                      {/* System Info */}
                      {deviceDetails.system_info && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Info className="w-4 h-4" />
                              Información del Sistema
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {deviceDetails.system_info.model && (
                                <div>
                                  <p className="text-muted-foreground">Modelo</p>
                                  <p className="font-medium">{deviceDetails.system_info.model}</p>
                                </div>
                              )}
                              {deviceDetails.system_info.version && (
                                <div>
                                  <p className="text-muted-foreground">Versión</p>
                                  <p className="font-medium">{deviceDetails.system_info.version}</p>
                                </div>
                              )}
                              {deviceDetails.system_info.uptime && (
                                <div>
                                  <p className="text-muted-foreground">Tiempo encendido</p>
                                  <p className="font-medium">{deviceDetails.system_info.uptime}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Disks */}
                      {deviceDetails.disks && deviceDetails.disks.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <HardDrive className="w-4 h-4" />
                              {t('infra.disks', 'Discos')} ({deviceDetails.disks.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {deviceDetails.disks.map((disk, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                  <div className="flex items-center gap-3">
                                    <HardDrive className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">{disk.name || disk.id || `Disco ${i + 1}`}</p>
                                      {disk.model && <p className="text-xs text-muted-foreground">{disk.model}</p>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {disk.size && <Badge variant="outline">{formatBytes(disk.size)}</Badge>}
                                    {disk.temp && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant={disk.temp > 50 ? 'destructive' : 'outline'}>
                                            <Thermometer className="w-3 h-3 mr-1" />{disk.temp}°C
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>Temperatura</TooltipContent>
                                      </Tooltip>
                                    )}
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

                      {/* Volumes */}
                      {deviceDetails.volumes && deviceDetails.volumes.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Database className="w-4 h-4" />
                              {t('infra.volumes', 'Volúmenes')} ({deviceDetails.volumes.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {deviceDetails.volumes.map((vol, i) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/50">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">{vol.name || vol.id || `Volumen ${i + 1}`}</span>
                                    {vol.status && <Badge variant={vol.status === 'normal' ? 'default' : 'destructive'}>{vol.status}</Badge>}
                                  </div>
                                  {vol.size && vol.used && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Usado: {formatBytes(vol.used)}</span>
                                        <span>Total: {formatBytes(vol.size)}</span>
                                      </div>
                                      <Progress value={(vol.used / vol.size) * 100} className="h-2" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Surveillance */}
                      {deviceDetails.surveillance && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Activity className="w-4 h-4" />
                              {t('infra.surveillance', 'Vigilancia')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">
                              {deviceDetails.surveillance.cameras?.length || 0} {t('infra.camerasConfigured', 'cámaras configuradas')}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Services */}
                      {deviceDetails.services && deviceDetails.services.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Settings className="w-4 h-4" />
                              {t('infra.services', 'Servicios')} ({deviceDetails.services.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {deviceDetails.services.map((svc, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${svc.status === 'running' || svc.status === 'enabled' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    <div>
                                      <p className="text-sm font-medium">{svc.name}</p>
                                      {svc.version && <p className="text-xs text-muted-foreground">v{svc.version}</p>}
                                    </div>
                                  </div>
                                  <Badge variant={svc.status === 'running' ? 'default' : 'secondary'} className="text-xs">
                                    {svc.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Utilization */}
                      {deviceDetails.utilization && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              Utilización
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              {deviceDetails.utilization.cpu && (
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>CPU</span>
                                    <span>{deviceDetails.utilization.cpu}%</span>
                                  </div>
                                  <Progress value={deviceDetails.utilization.cpu} className="h-2" />
                                </div>
                              )}
                              {deviceDetails.utilization.memory && (
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>RAM</span>
                                    <span>{deviceDetails.utilization.memory}%</span>
                                  </div>
                                  <Progress value={deviceDetails.utilization.memory} className="h-2" />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
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
    </TooltipProvider>
  );
};

export default InfrastructurePanel;
