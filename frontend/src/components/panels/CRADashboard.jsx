/**
 * CRADashboard - Dashboard dedicado para dispositivos CRA (Central Receptora de Alarmas)
 * Muestra el estado de dispositivos críticos con alertas prioritarias y eventos FTP
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { 
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Wifi, WifiOff, 
  Bell, RefreshCw, Volume2, VolumeX, Clock, Activity, Server,
  CheckCircle, XCircle, AlertCircle, Video, Upload, Play, Image as ImageIcon,
  FileVideo, Calendar, Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

// Sound for CRA alerts
const CRA_ALERT_SOUND = '/sounds/cra-alert.mp3';

const CRADashboard = ({ authAxios }) => {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  const audioRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const lastAlertCountRef = useRef(0);
  const lastEventCountRef = useRef(0);
  const isFetchingRef = useRef(false);

  const playAlertSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  }, [soundEnabled]);

  const fetchCRAData = useCallback(async () => {
    if (!authAxios) {
      console.error('CRADashboard: authAxios is not available');
      setLoading(false);
      return;
    }
    
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    
    try {
      // Use optimized combined endpoint + events in parallel
      const [dashboardRes, eventsRes, eventStatsRes] = await Promise.all([
        authAxios.get('/cra/dashboard'),
        authAxios.get('/cra-events?days=7&limit=50'),
        authAxios.get('/cra-events/stats?days=30')
      ]);
      
      const { status: statusData, devices: devicesData, alerts: alertsData } = dashboardRes.data;
      
      setDevices(devicesData || []);
      setAlerts(alertsData || []);
      setStatus(statusData);
      setEvents(eventsRes.data.events || []);
      setEventStats(eventStatsRes.data);
      
      // Check for new alerts using refs
      const newAlertCount = alertsData?.length || 0;
      if (newAlertCount > lastAlertCountRef.current && lastAlertCountRef.current > 0) {
        playAlertSound();
        toast.warning('¡Nueva alerta CRA!', {
          description: 'Se ha detectado una nueva alerta en dispositivos críticos',
          duration: 10000
        });
      }
      lastAlertCountRef.current = newAlertCount;
      
      // Check for new FTP events using refs
      const newEventCount = eventsRes.data.events?.length || 0;
      if (newEventCount > lastEventCountRef.current && lastEventCountRef.current > 0) {
        playAlertSound();
        toast.warning('¡Nuevo evento CRA!', {
          description: 'Se ha recibido un nuevo envío FTP de alarma',
          duration: 10000
        });
      }
      lastEventCountRef.current = newEventCount;
      
    } catch (error) {
      console.error('CRADashboard: Error fetching CRA data:', error);
      toast.error('Error al cargar datos CRA');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [authAxios, playAlertSound]);

  useEffect(() => {
    fetchCRAData();
    
    // Auto-refresh every 30 seconds for CRA
    refreshIntervalRef.current = setInterval(fetchCRAData, 30000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchCRAData]);

  const offlineDevices = devices.filter(d => d.status === 'offline');
  const onlineDevices = devices.filter(d => d.status === 'online');

  const getStatusColor = () => {
    if (!status) return 'bg-gray-500';
    if (status.offline > 0) return 'bg-red-500';
    if (status.recent_alerts_24h > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!status) return 'Cargando...';
    if (status.offline > 0) return `¡ALERTA! ${status.offline} dispositivo(s) offline`;
    if (status.recent_alerts_24h > 0) return `${status.recent_alerts_24h} alertas en las últimas 24h`;
    return 'Todos los sistemas operativos';
  };

  const openEventPreview = (event) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-1/2 mb-2" />
                <div className="h-12 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden audio element for alerts */}
      <audio ref={audioRef} src={CRA_ALERT_SOUND} preload="auto" />
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${getStatusColor()}`}>
            {status?.offline > 0 ? (
              <ShieldAlert className="w-8 h-8 text-white" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Panel CRA
            </h1>
            <p className="text-muted-foreground">Central Receptora de Alarmas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
            {soundEnabled ? 'Sonido ON' : 'Sonido OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchCRAData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <Card className={`${status?.offline > 0 ? 'bg-red-50 border-red-300' : status?.recent_alerts_24h > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.offline > 0 ? (
                <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
              ) : status?.recent_alerts_24h > 0 ? (
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
              <span className={`text-lg font-semibold ${status?.offline > 0 ? 'text-red-700' : status?.recent_alerts_24h > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                {getStatusText()}
              </span>
            </div>
            <Badge variant={status?.offline > 0 ? 'destructive' : 'secondary'}>
              {status?.uptime_percentage}% Operativo
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total CRA</p>
                <p className="text-3xl font-bold">{status?.total_devices || 0}</p>
              </div>
              <Server className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">Online</p>
                <p className="text-3xl font-bold text-green-700">{status?.online || 0}</p>
              </div>
              <Wifi className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={`${status?.offline > 0 ? 'bg-red-50 border-red-200' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${status?.offline > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>Offline</p>
                <p className={`text-3xl font-bold ${status?.offline > 0 ? 'text-red-700 animate-pulse' : ''}`}>{status?.offline || 0}</p>
              </div>
              <WifiOff className={`w-10 h-10 ${status?.offline > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'} opacity-50`} />
            </div>
          </CardContent>
        </Card>
        
        <Card className={`${status?.recent_alerts_24h > 0 ? 'bg-orange-50 border-orange-200' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${status?.recent_alerts_24h > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>Alertas 24h</p>
                <p className={`text-3xl font-bold ${status?.recent_alerts_24h > 0 ? 'text-orange-700' : ''}`}>{status?.recent_alerts_24h || 0}</p>
              </div>
              <Bell className={`w-10 h-10 ${status?.recent_alerts_24h > 0 ? 'text-orange-500' : 'text-gray-400'} opacity-50`} />
            </div>
          </CardContent>
        </Card>
        
        <Card className={`${eventStats?.events_today > 0 ? 'bg-purple-50 border-purple-200' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${eventStats?.events_today > 0 ? 'text-purple-600' : 'text-muted-foreground'}`}>Envíos FTP Hoy</p>
                <p className={`text-3xl font-bold ${eventStats?.events_today > 0 ? 'text-purple-700' : ''}`}>{eventStats?.events_today || 0}</p>
              </div>
              <Upload className={`w-10 h-10 ${eventStats?.events_today > 0 ? 'text-purple-500' : 'text-gray-400'} opacity-50`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status" className="gap-2">
            <Server className="w-4 h-4" />
            Estado Dispositivos
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <FileVideo className="w-4 h-4" />
            Eventos FTP
            {events.length > 0 && <Badge variant="secondary" className="ml-1">{events.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" />
            Alertas
          </TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Offline Devices */}
            <Card className={`${offlineDevices.length > 0 ? 'border-red-300 bg-red-50/50' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <WifiOff className={`w-5 h-5 ${offlineDevices.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
                  Dispositivos Offline
                  {offlineDevices.length > 0 && <Badge variant="destructive" className="animate-pulse">{offlineDevices.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {offlineDevices.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                    <p className="text-green-600 font-medium">Sin dispositivos offline</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {offlineDevices.map(device => (
                        <div key={device.id} className="p-3 bg-red-100 border border-red-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="font-medium text-red-800">{device.name}</p>
                              <p className="text-xs text-red-600">{device.ip_address}:{device.port}</p>
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-xs">OFFLINE</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Online Devices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wifi className="w-5 h-5 text-green-500" />
                  Dispositivos Online
                  <Badge variant="secondary" className="bg-green-100 text-green-700">{onlineDevices.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {onlineDevices.length === 0 ? (
                  <div className="text-center py-8">
                    <Server className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No hay dispositivos CRA configurados</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="grid grid-cols-2 gap-2">
                      {onlineDevices.map(device => (
                        <div key={device.id} className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                          <Wifi className="w-4 h-4 text-green-500 mx-auto mb-1" />
                          <p className="font-medium text-xs truncate">{device.name}</p>
                          <p className="text-xs text-muted-foreground">{device.ip_address}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Events Tab - FTP Uploads */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileVideo className="w-5 h-5" />
                Eventos FTP (Alarmas enviadas a CRA)
              </CardTitle>
              <CardDescription>
                Registro de videos/imágenes enviados por las cámaras a la Central Receptora
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sin eventos FTP registrados</h3>
                  <p className="text-muted-foreground">
                    Los eventos aparecerán aquí cuando las cámaras envíen alarmas a la CRA
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {events.map(event => (
                      <div 
                        key={event.id} 
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => openEventPreview(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Video className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">{event.device_name || event.camera_ip}</p>
                              <p className="text-sm text-muted-foreground">{event.original_filename}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(event.timestamp).toLocaleString('es-ES')}
                                </Badge>
                                {event.organization_name && (
                                  <Badge variant="secondary" className="text-xs">{event.organization_name}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alertas de Conexión CRA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Sin alertas recientes</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {alerts.map(alert => {
                      const isDown = alert.alert_type === 'device_down';
                      return (
                        <div key={alert.id} className={`p-3 rounded-lg border ${isDown ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isDown ? <WifiOff className="w-4 h-4 text-red-600" /> : <Wifi className="w-4 h-4 text-green-600" />}
                              <span className={`font-medium ${isDown ? 'text-red-700' : 'text-green-700'}`}>{alert.device_name}</span>
                            </div>
                            <Badge variant={isDown ? 'destructive' : 'default'} className="text-xs">CRA</Badge>
                          </div>
                          <p className={`text-sm mt-1 ${isDown ? 'text-red-600' : 'text-green-600'}`}>
                            {isDown ? 'Dispositivo desconectado' : 'Dispositivo recuperado'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(alert.timestamp).toLocaleString('es-ES')}</p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Preview Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-2xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Evento CRA - {selectedEvent.device_name || selectedEvent.camera_ip}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedEvent.saved_filename ? (
                  <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                    {selectedEvent.saved_filename.match(/\.(mp4|avi|mkv|mov|mxg)$/i) ? (
                      <video 
                        controls 
                        className="max-w-full max-h-full"
                        src={`/api/cra-events/file/${selectedEvent.saved_filename}`}
                      />
                    ) : (
                      <img 
                        src={`/api/cra-events/file/${selectedEvent.saved_filename}`}
                        alt="Evento CRA"
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <FileVideo className="w-16 h-16 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-muted-foreground">Archivo no disponible</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cámara</p>
                    <p className="font-medium">{selectedEvent.device_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">IP</p>
                    <p className="font-medium">{selectedEvent.camera_ip}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha/Hora</p>
                    <p className="font-medium">{new Date(selectedEvent.timestamp).toLocaleString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Archivo</p>
                    <p className="font-medium truncate">{selectedEvent.original_filename || '-'}</p>
                  </div>
                  {selectedEvent.organization_name && (
                    <div>
                      <p className="text-muted-foreground">Centro</p>
                      <p className="font-medium">{selectedEvent.organization_name}</p>
                    </div>
                  )}
                  {selectedEvent.group_name && (
                    <div>
                      <p className="text-muted-foreground">Grupo</p>
                      <p className="font-medium">{selectedEvent.group_name}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRADashboard;
