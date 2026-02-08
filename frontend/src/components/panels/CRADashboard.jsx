/**
 * CRADashboard - Dashboard dedicado para dispositivos CRA (Central Receptora de Alarmas)
 * Muestra el estado de dispositivos críticos con alertas prioritarias
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { 
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Wifi, WifiOff, 
  Bell, RefreshCw, Volume2, VolumeX, Clock, Activity, Server,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

// Sound for CRA alerts
const CRA_ALERT_SOUND = '/sounds/cra-alert.mp3';

const CRADashboard = ({ authAxios }) => {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastAlertCount, setLastAlertCount] = useState(0);
  const audioRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  const playAlertSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  }, [soundEnabled]);

  const fetchCRAData = useCallback(async () => {
    try {
      const [devicesRes, alertsRes, statusRes] = await Promise.all([
        authAxios.get('/cra/devices'),
        authAxios.get('/cra/alerts'),
        authAxios.get('/cra/status')
      ]);
      
      setDevices(devicesRes.data.devices || []);
      setAlerts(alertsRes.data.alerts || []);
      setStatus(statusRes.data);
      
      // Check for new alerts
      const newAlertCount = alertsRes.data.alerts?.length || 0;
      if (newAlertCount > lastAlertCount && lastAlertCount > 0) {
        playAlertSound();
        toast.warning('¡Nueva alerta CRA!', {
          description: 'Se ha detectado una nueva alerta en dispositivos críticos',
          duration: 10000
        });
      }
      setLastAlertCount(newAlertCount);
      
    } catch (error) {
      console.error('Error fetching CRA data:', error);
    } finally {
      setLoading(false);
    }
  }, [authAxios, lastAlertCount, playAlertSound]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </div>

      {/* Two Column Layout: Offline Devices + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Offline Devices - Priority View */}
        <Card className={`${offlineDevices.length > 0 ? 'border-red-300 bg-red-50/50' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <WifiOff className={`w-5 h-5 ${offlineDevices.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
              Dispositivos Offline
              {offlineDevices.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">{offlineDevices.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {offlineDevices.length > 0 
                ? '¡Atención! Dispositivos críticos sin conexión' 
                : 'Todos los dispositivos CRA están conectados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {offlineDevices.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-green-600 font-medium">Sin dispositivos offline</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {offlineDevices.map(device => (
                    <div 
                      key={device.id} 
                      className="p-3 bg-red-100 border border-red-200 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">{device.name}</p>
                          <p className="text-xs text-red-600">{device.ip_address}:{device.port}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">OFFLINE</Badge>
                        {device.last_online && (
                          <p className="text-xs text-red-600 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(device.last_online).toLocaleString('es-ES')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5" />
              Alertas Recientes CRA
              {alerts.length > 0 && <Badge variant="secondary">{alerts.length}</Badge>}
            </CardTitle>
            <CardDescription>Últimas alertas de dispositivos críticos</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Sin alertas recientes</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {alerts.slice(0, 20).map(alert => {
                    const isDown = alert.alert_type === 'device_down';
                    return (
                      <div 
                        key={alert.id} 
                        className={`p-3 rounded-lg border ${isDown ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isDown ? (
                              <WifiOff className="w-4 h-4 text-red-600" />
                            ) : (
                              <Wifi className="w-4 h-4 text-green-600" />
                            )}
                            <span className={`font-medium ${isDown ? 'text-red-700' : 'text-green-700'}`}>
                              {alert.device_name}
                            </span>
                          </div>
                          <Badge variant={isDown ? 'destructive' : 'default'} className="text-xs">
                            CRA
                          </Badge>
                        </div>
                        <p className={`text-sm mt-1 ${isDown ? 'text-red-600' : 'text-green-600'}`}>
                          {isDown ? 'Dispositivo desconectado' : 'Dispositivo recuperado'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString('es-ES')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Online Devices Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wifi className="w-5 h-5 text-green-500" />
            Dispositivos CRA Online
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {onlineDevices.map(device => (
                <div 
                  key={device.id}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg text-center hover:shadow-md transition-shadow"
                >
                  <Wifi className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="font-medium text-sm truncate" title={device.name}>{device.name}</p>
                  <p className="text-xs text-muted-foreground">{device.ip_address}</p>
                  <Badge variant="outline" className="mt-2 text-xs bg-green-100 text-green-700 border-green-300">
                    Online
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CRADashboard;
