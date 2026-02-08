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
  CheckCircle, XCircle, Upload, Video, Circle
} from 'lucide-react';

const CRADashboard = ({ authAxios }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('status');
  const audioRef = useRef(null);
  const lastAlertCountRef = useRef(0);
  const intervalRef = useRef(null);

  // Single fetch function - simple and direct
  const fetchData = async (showRefresh = false) => {
    if (!authAxios) return;
    
    if (showRefresh) setRefreshing(true);
    
    try {
      // Fetch status and devices only (fast endpoints)
      const [statusRes, devicesRes, alertsRes] = await Promise.all([
        authAxios.get('/cra/status'),
        authAxios.get('/cra/devices'),
        authAxios.get('/cra/alerts?limit=50')
      ]);
      
      setData({
        status: statusRes.data,
        devices: devicesRes.data.devices || [],
        alerts: alertsRes.data.alerts || []
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
    }
  };

  // Initial load and interval
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(), 30000);
    return () => clearInterval(intervalRef.current);
  }, [authAxios]);

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status">
            <Server className="w-4 h-4 mr-2" />Estado Dispositivos
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="w-4 h-4 mr-2" />Alertas
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
                      <div key={device.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium">{device.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{device.ip_address}</p>
                          </div>
                        </div>
                        <Badge variant="destructive">Offline</Badge>
                      </div>
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
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {onlineDevices.map(device => (
                    <div key={device.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{device.ip_address}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Online</Badge>
                    </div>
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

export default CRADashboard;
