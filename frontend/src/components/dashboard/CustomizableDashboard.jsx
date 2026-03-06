/**
 * CustomizableDashboard - Dashboard con widgets personalizables
 * Obtiene datos en tiempo real del sistema, grabadores, VPN y alertas
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  LayoutDashboard, Settings2, GripVertical,
  Camera, Bell, Shield, HardDrive, Activity,
  Network, AlertTriangle, Clock,
  Save, RotateCcw, Plus, CheckCircle
} from 'lucide-react';

// Available widgets
const AVAILABLE_WIDGETS = [
  { id: 'device-stats', name: 'Estadísticas de Dispositivos', icon: Camera },
  { id: 'alerts-summary', name: 'Resumen de Alertas', icon: Bell },
  { id: 'cra-status', name: 'Estado CRA', icon: Shield },
  { id: 'dahua-status', name: 'Estado Grabadores', icon: HardDrive },
  { id: 'vpn-status', name: 'Estado VPN', icon: Network },
  { id: 'system-resources', name: 'Recursos del Sistema', icon: Activity },
  { id: 'recent-alerts', name: 'Alertas Recientes', icon: AlertTriangle },
  { id: 'clock', name: 'Reloj y Fecha', icon: Clock },
];

const DEFAULT_LAYOUT = ['device-stats', 'alerts-summary', 'cra-status', 'dahua-status', 'system-resources', 'recent-alerts', 'vpn-status', 'clock'];

// Widget renderer
const WidgetContent = ({ widget, data }) => {
  const Icon = widget.icon;
  
  switch(widget.id) {
    case 'device-stats':
      return (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-2xl font-bold text-blue-600">{data?.total || 0}</p><p className="text-xs text-muted-foreground">Total</p></div>
          <div><p className="text-2xl font-bold text-green-600">{data?.online || 0}</p><p className="text-xs text-muted-foreground">Online</p></div>
          <div><p className="text-2xl font-bold text-red-600">{data?.offline || 0}</p><p className="text-xs text-muted-foreground">Offline</p></div>
        </div>
      );
      
    case 'alerts-summary':
      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Críticas (down)</span>
            <Badge variant="destructive">{data?.critical || 0}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Recuperados (up)</span>
            <Badge className="bg-green-100 text-green-800">{data?.recovered || 0}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Total período</span>
            <Badge variant="outline">{data?.total || 0}</Badge>
          </div>
        </div>
      );
      
    case 'cra-status':
      return (
        <div className="text-center">
          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${data?.connected ? 'bg-green-100' : 'bg-red-100'}`}>
            <Shield className={`w-6 h-6 ${data?.connected ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <p className="mt-2 font-medium">{data?.connected ? 'Conectada' : 'Desconectada'}</p>
          <p className="text-xs text-muted-foreground">{data?.events || 0} eventos hoy</p>
          {data?.devices > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{data?.devices} dispositivos CRA</p>
          )}
        </div>
      );
      
    case 'dahua-status':
      return (
        <div className="text-center">
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-2xl font-bold text-blue-600">{data?.total || 0}</p><p className="text-xs">Total</p></div>
            <div><p className="text-2xl font-bold text-green-600">{data?.online || 0}</p><p className="text-xs">Online</p></div>
            <div><p className="text-2xl font-bold text-red-600">{data?.offline || 0}</p><p className="text-xs">Offline</p></div>
          </div>
          {data?.total > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((data?.online / data?.total) * 100) || 0}% disponibilidad
            </p>
          )}
        </div>
      );
      
    case 'vpn-status':
      return (
        <div className="text-center">
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-2xl font-bold text-blue-600">{data?.total || 0}</p><p className="text-xs">Total</p></div>
            <div><p className="text-2xl font-bold text-green-600">{data?.online || 0}</p><p className="text-xs">Online</p></div>
            <div><p className="text-2xl font-bold text-red-600">{data?.offline || 0}</p><p className="text-xs">Offline</p></div>
          </div>
          {data?.total > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((data?.online / data?.total) * 100) || 0}% conectados
            </p>
          )}
        </div>
      );
      
    case 'system-resources':
      return (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>CPU</span><span>{Math.round(data?.cpu || 0)}%</span></div>
            <div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-cyan-500 rounded-full transition-all" style={{width: `${data?.cpu || 0}%`}}></div></div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>RAM</span><span>{Math.round(data?.ram || 0)}%</span></div>
            <div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-purple-500 rounded-full transition-all" style={{width: `${data?.ram || 0}%`}}></div></div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Disco</span><span>{Math.round(data?.disk || 0)}%</span></div>
            <div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-amber-500 rounded-full transition-all" style={{width: `${data?.disk || 0}%`}}></div></div>
          </div>
        </div>
      );
      
    case 'recent-alerts':
      if (!data?.alerts || data.alerts.length === 0) {
        return (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Sin alertas recientes</p>
          </div>
        );
      }
      return (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {data.alerts.slice(0, 8).map((alert, idx) => {
            const isDown = alert.alert_type === 'device_down' || alert.type === 'device_down';
            return (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isDown ? 'text-red-500' : 'text-green-500'}`} />
                  <span className="truncate">{alert.device_name || alert.message || 'Alerta'}</span>
                </div>
                <Badge variant={isDown ? 'destructive' : 'secondary'} className="text-xs ml-2 flex-shrink-0">
                  {isDown ? 'Down' : 'Up'}
                </Badge>
              </div>
            );
          })}
        </div>
      );
      
    case 'clock':
      return (
        <div className="text-center">
          <p className="text-3xl font-bold">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      );
      
    default:
      return (
        <div className="text-center text-muted-foreground py-4">
          <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Widget disponible</p>
        </div>
      );
  }
};

const CustomizableDashboard = ({ 
  deviceStats, 
  alertStats, 
  systemStats, 
  craStatus, 
  authAxios, 
  dahuaDevices = [], 
  alerts = [],
  vpnStats = { total: 0, online: 0 },
  craDevices = []
}) => {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [showConfig, setShowConfig] = useState(false);
  const [realTimeSystemStats, setRealTimeSystemStats] = useState(null);
  const [realTimeVpnStats, setRealTimeVpnStats] = useState(null);
  const [realTimeCraStats, setRealTimeCraStats] = useState(null);
  const intervalRef = useRef(null);

  // Fetch real-time stats
  const fetchStats = useCallback(async () => {
    if (!authAxios) return;
    try {
      // Fetch system stats
      const sysRes = await authAxios.get('/system/stats').catch(() => null);
      if (sysRes?.data) {
        setRealTimeSystemStats({
          cpu: sysRes.data.cpu?.percent || 0,
          ram: sysRes.data.ram?.percent || 0,
          disk: sysRes.data.disk?.percent || 0
        });
      }
      
      // Fetch VPN stats
      const vpnRes = await authAxios.get('/vpn/status').catch(() => null);
      if (vpnRes?.data?.summary) {
        setRealTimeVpnStats({
          total: vpnRes.data.summary.total || 0,
          online: vpnRes.data.summary.online || 0,
          offline: (vpnRes.data.summary.total || 0) - (vpnRes.data.summary.online || 0)
        });
      }
      
      // Fetch CRA events stats
      const craRes = await authAxios.get('/cra-events/stats').catch(() => null);
      if (craRes?.data) {
        setRealTimeCraStats({
          events: craRes.data.today || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [authAxios]);

  // Calculate Dahua stats from devices
  const dahuaStats = {
    total: dahuaDevices.length,
    online: dahuaDevices.filter(d => d.status === 'online' || d.is_online).length,
    offline: dahuaDevices.filter(d => d.status !== 'online' && !d.is_online).length
  };

  // Calculate alert stats from alerts array
  const computedAlertStats = {
    critical: alerts.filter(a => a.alert_type === 'device_down' || a.type === 'device_down').length,
    recovered: alerts.filter(a => a.alert_type === 'device_up' || a.type === 'device_up').length,
    total: alerts.length
  };

  // Calculate CRA status
  const computedCraStatus = {
    connected: craDevices.length > 0 ? craDevices.some(d => d.status === 'online') : (craStatus?.connected || false),
    events: realTimeCraStats?.events || craStatus?.events || 0,
    devices: craDevices.length
  };

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem('watchtower_dashboard_layout');
    if (saved) {
      try {
        setLayout(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading layout:', e);
      }
    }
  }, []);

  // Fetch stats on mount and interval
  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStats]);

  // Save layout
  const saveLayout = useCallback(() => {
    localStorage.setItem('watchtower_dashboard_layout', JSON.stringify(layout));
    toast.success('Dashboard guardado');
    setShowConfig(false);
  }, [layout]);

  // Reset layout
  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem('watchtower_dashboard_layout');
    toast.success('Dashboard restaurado');
  }, []);

  // Toggle widget
  const toggleWidget = (widgetId) => {
    setLayout(prev => prev.includes(widgetId) ? prev.filter(id => id !== widgetId) : [...prev, widgetId]);
  };

  // Move widget
  const moveWidget = (index, direction) => {
    setLayout(prev => {
      const newLayout = [...prev];
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < newLayout.length) {
        [newLayout[index], newLayout[newIndex]] = [newLayout[newIndex], newLayout[index]];
      }
      return newLayout;
    });
  };

  // Get widget data
  const getWidgetData = (widgetId) => {
    switch(widgetId) {
      case 'device-stats':
        return deviceStats;
      case 'alerts-summary':
        return computedAlertStats;
      case 'system-resources':
        return realTimeSystemStats || systemStats;
      case 'cra-status':
        return computedCraStatus;
      case 'dahua-status':
        return dahuaStats;
      case 'vpn-status':
        return realTimeVpnStats || vpnStats;
      case 'recent-alerts':
        return { alerts };
      default:
        return {};
    }
  };

  const activeWidgets = layout.map(id => AVAILABLE_WIDGETS.find(w => w.id === id)).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Mi Dashboard</h2>
          <Badge variant="outline">{activeWidgets.length} widgets</Badge>
        </div>
        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-2" />
              Personalizar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Personalizar Dashboard</DialogTitle>
              <DialogDescription>Selecciona y ordena los widgets</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Widgets Disponibles</h4>
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-2">
                    {AVAILABLE_WIDGETS.map(widget => {
                      const Icon = widget.icon;
                      const isActive = layout.includes(widget.id);
                      return (
                        <div key={widget.id} className={`flex items-center justify-between p-3 rounded-lg border ${isActive ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{widget.name}</span>
                          </div>
                          <Switch checked={isActive} onCheckedChange={() => toggleWidget(widget.id)} />
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              <div>
                <h4 className="font-medium mb-2">Orden ({layout.length})</h4>
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-2">
                    {layout.map((widgetId, index) => {
                      const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
                      if (!widget) return null;
                      const Icon = widget.icon;
                      return (
                        <div key={widgetId} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{widget.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveWidget(index, -1)} disabled={index === 0}>↑</Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveWidget(index, 1)} disabled={index === layout.length - 1}>↓</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetLayout}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar
              </Button>
              <Button onClick={saveLayout}>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeWidgets.map(widget => (
          <Card key={widget.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <widget.icon className="w-4 h-4" />
                {widget.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetContent widget={widget} data={getWidgetData(widget.id)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {activeWidgets.length === 0 && (
        <Card className="p-8 text-center">
          <LayoutDashboard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Dashboard vacío</h3>
          <p className="text-sm text-muted-foreground mb-4">Personaliza tu dashboard añadiendo widgets</p>
          <Button onClick={() => setShowConfig(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir Widgets
          </Button>
        </Card>
      )}
    </div>
  );
};

export default CustomizableDashboard;
