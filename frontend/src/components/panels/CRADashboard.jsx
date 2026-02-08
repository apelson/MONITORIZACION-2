/**
 * CRADashboard - Dashboard para dispositivos CRA (Central Receptora de Alarmas)
 * Versión optimizada con estado FTP y vista hemisférica
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { toast } from 'sonner';
import { 
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Wifi, WifiOff, 
  Bell, RefreshCw, Volume2, VolumeX, Clock, Activity, Server,
  CheckCircle, XCircle, Upload, Video, Circle, History, FileText
} from 'lucide-react';

const CRADashboard = ({ authAxios, onOpenLiveView }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('status');
  const [ftpStatuses, setFtpStatuses] = useState({}); // Device ID -> FTP status
  const [loadingFtp, setLoadingFtp] = useState({});
  const [ftpHistory, setFtpHistory] = useState([]); // FTP change history
  const [loadingHistory, setLoadingHistory] = useState(false);
  const audioRef = useRef(null);
  const lastAlertCountRef = useRef(0);
  const intervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Fetch FTP history
  const fetchFtpHistory = useCallback(async () => {
    if (!authAxios) return;
    setLoadingHistory(true);
    try {
      const response = await authAxios.get('/camera-stream/ftp-history?limit=50');
      setFtpHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching FTP history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [authAxios]);

  // Fetch FTP status for a device
  const fetchFtpStatus = useCallback(async (deviceId) => {
    if (!authAxios || loadingFtp[deviceId]) return;
    
    setLoadingFtp(prev => ({ ...prev, [deviceId]: true }));
    try {
      const response = await authAxios.get(`/camera-stream/ftp-status/${deviceId}`);
      setFtpStatuses(prev => ({
        ...prev,
        [deviceId]: {
          enabled: response.data.ftp_enabled || response.data.event_enabled,
          server: response.data.ftp_server,
          error: response.data.error
        }
      }));
    } catch (error) {
      console.error(`Error fetching FTP status for ${deviceId}:`, error);
      setFtpStatuses(prev => ({
        ...prev,
        [deviceId]: { enabled: false, error: 'No disponible' }
      }));
    } finally {
      setLoadingFtp(prev => ({ ...prev, [deviceId]: false }));
    }
  }, [authAxios, loadingFtp]);

  // Single fetch function - simple and direct
  const fetchData = useCallback(async (showRefresh = false) => {
    if (!authAxios) return;
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    if (showRefresh) setRefreshing(true);
    
    try {
      // Fetch status and devices only (fast endpoints)
      const [statusRes, devicesRes, alertsRes] = await Promise.all([
        authAxios.get('/cra/status'),
        authAxios.get('/cra/devices'),
        authAxios.get('/cra/alerts?limit=50')
      ]);
      
      const devices = devicesRes.data.devices || [];
      
      setData({
        status: statusRes.data,
        devices: devices,
        alerts: alertsRes.data.alerts || []
      });
      
      // Fetch FTP status for all CRA devices (in background)
      devices.forEach(device => {
        if (!ftpStatuses[device.id]) {
          fetchFtpStatus(device.id);
        }
      });
      
      // Alert sound for new alerts
      const newCount = alertsRes.data.alerts?.length || 0;
      if (newCount > lastAlertCountRef.current && lastAlertCountRef.current > 0 && soundEnabled) {
        audioRef.current?.play().catch(() => {});
        toast.warning('¡Nueva alerta CRA!');
      }
      lastAlertCountRef.current = newCount;
      
    } catch (error) {
      console.error('CRA fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [authAxios, soundEnabled, ftpStatuses, fetchFtpStatus]);

  // Initial load and interval
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(), 30000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-cyan-500" />
          <div>
            <h2 className="text-2xl font-bold">Panel CRA</h2>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No hay datos CRA disponibles</p>
        <Button onClick={() => fetchData(true)} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />Reintentar
        </Button>
      </div>
    );
  }

  const { status, devices, alerts } = data;
  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status === 'offline');

  return (
    <div className="p-6 space-y-6">
      {/* Audio element */}
      <audio ref={audioRef} src="/sounds/cra-alert.mp3" preload="auto" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${status?.offline > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            {status?.offline > 0 ? <ShieldAlert className="w-8 h-8 text-red-600" /> : <ShieldCheck className="w-8 h-8 text-green-600" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Panel CRA</h2>
            <p className="text-muted-foreground">Central Receptora de Alarmas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="ml-2">{soundEnabled ? 'Sonido ON' : 'Sonido OFF'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Alert banner */}
      {status?.recent_alerts_24h > 0 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-800">{status.recent_alerts_24h} alertas en las últimas 24h</span>
          </div>
          <Badge variant={status.offline > 0 ? "destructive" : "default"} className="text-sm">
            {status.uptime_percentage?.toFixed(0) || 100}% Operativo
          </Badge>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total CRA</p>
                <p className="text-3xl font-bold">{status?.total_devices || 0}</p>
              </div>
              <Server className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Online</p>
                <p className="text-3xl font-bold text-green-700">{status?.online || 0}</p>
              </div>
              <Wifi className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={status?.offline > 0 ? "bg-red-50 border-red-200" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${status?.offline > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>Offline</p>
                <p className={`text-3xl font-bold ${status?.offline > 0 ? 'text-red-700' : ''}`}>{status?.offline || 0}</p>
              </div>
              <WifiOff className={`w-8 h-8 ${status?.offline > 0 ? 'text-red-500' : 'text-gray-300'}`} />
            </div>
          </CardContent>
        </Card>
        <Card className={status?.recent_alerts_24h > 0 ? "bg-orange-50 border-orange-200" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${status?.recent_alerts_24h > 0 ? 'text-orange-700' : 'text-muted-foreground'}`}>Alertas 24h</p>
                <p className={`text-3xl font-bold ${status?.recent_alerts_24h > 0 ? 'text-orange-700' : ''}`}>{status?.recent_alerts_24h || 0}</p>
              </div>
              <Bell className={`w-8 h-8 ${status?.recent_alerts_24h > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'ftp-history' && ftpHistory.length === 0) {
          fetchFtpHistory();
        }
      }}>
        <TabsList>
          <TabsTrigger value="status">
            <Server className="w-4 h-4 mr-2" />Estado Dispositivos
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="w-4 h-4 mr-2" />Alertas
          </TabsTrigger>
          <TabsTrigger value="ftp-history">
            <History className="w-4 h-4 mr-2" />Historial FTP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Offline Devices */}
            <Card className={offlineDevices.length > 0 ? "border-red-200" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <WifiOff className={`w-5 h-5 ${offlineDevices.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  Dispositivos Offline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {offlineDevices.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin dispositivos offline</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {offlineDevices.map(device => (
                      <CRADeviceCard 
                        key={device.id} 
                        device={device} 
                        ftpStatus={ftpStatuses[device.id]}
                        loadingFtp={loadingFtp[device.id]}
                        onRefreshFtp={() => fetchFtpStatus(device.id)}
                        onOpenLive={onOpenLiveView}
                        isOffline
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Online Devices */}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wifi className="w-5 h-5 text-green-500" />
                  Dispositivos Online
                  <Badge variant="secondary" className="ml-2">{onlineDevices.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {onlineDevices.map(device => (
                    <CRADeviceCard 
                      key={device.id} 
                      device={device} 
                      ftpStatus={ftpStatuses[device.id]}
                      loadingFtp={loadingFtp[device.id]}
                      onRefreshFtp={() => fetchFtpStatus(device.id)}
                      onOpenLive={onOpenLiveView}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500" />
                Historial de Alertas CRA
              </CardTitle>
              <CardDescription>Últimas 50 alertas de dispositivos críticos</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No hay alertas recientes</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                      <div key={alert.id || idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className={`p-2 rounded-full ${alert.alert_type === 'offline' ? 'bg-red-100' : 'bg-green-100'}`}>
                          {alert.alert_type === 'offline' ? 
                            <WifiOff className="w-4 h-4 text-red-600" /> : 
                            <Wifi className="w-4 h-4 text-green-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{alert.device_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString('es-ES')}
                          </p>
                        </div>
                        <Badge variant={alert.alert_type === 'offline' ? 'destructive' : 'default'}>
                          {alert.alert_type === 'offline' ? 'Desconectado' : 'Recuperado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// CRA Device Card Component with FTP status badge
const CRADeviceCard = ({ device, ftpStatus, loadingFtp, onRefreshFtp, onOpenLive, isOffline }) => {
  const ftpLoaded = ftpStatus !== undefined;
  const ftpEnabled = ftpStatus?.enabled;
  const ftpError = ftpStatus?.error;
  
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isOffline 
          ? 'bg-red-50 border-red-200' 
          : 'bg-green-50 border-green-200'
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isOffline ? (
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{device.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{device.ip_address}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* FTP Status Badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                {loadingFtp || !ftpLoaded ? (
                  <Badge variant="outline" className="text-xs animate-pulse">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    FTP
                  </Badge>
                ) : ftpError ? (
                  <Badge 
                    variant="outline" 
                    className="text-xs cursor-pointer"
                    style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                    onClick={onRefreshFtp}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    FTP ?
                  </Badge>
                ) : ftpEnabled ? (
                  <Badge 
                    className="text-xs"
                    style={{ backgroundColor: '#16a34a', color: 'white', border: 'none' }}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    ARMADO
                  </Badge>
                ) : (
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' }}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    DESARMADO
                  </Badge>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {loadingFtp || !ftpLoaded ? 'Verificando estado FTP...' : 
                 ftpError ? `Error: ${ftpError}. Haz clic para reintentar` :
                 ftpEnabled ? 'FTP activado - Subida de eventos activa' : 
                 'FTP desactivado - Sin subida de eventos'}
              </p>
              {ftpStatus?.server && <p className="text-xs">Servidor: {ftpStatus.server}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Live View Button */}
        {!isOffline && onOpenLive && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => onOpenLive(device)}
                >
                  <Video className="w-4 h-4 text-blue-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver en directo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Status Badge */}
        <Badge variant={isOffline ? "destructive" : "default"} className={!isOffline ? "bg-green-100 text-green-700" : ""}>
          {isOffline ? 'Offline' : 'Online'}
        </Badge>
      </div>
    </div>
  );
};

export default CRADashboard;
