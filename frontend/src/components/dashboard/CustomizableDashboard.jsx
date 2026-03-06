/**
 * CustomizableDashboard - Dashboard con widgets personalizables
 * Permite al usuario configurar qué widgets ver y en qué orden
 * Obtiene datos en tiempo real del sistema y grabadores
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  LayoutDashboard, Settings2, GripVertical, Eye, EyeOff,
  Camera, Bell, Shield, HardDrive, BarChart3, Activity,
  Server, Network, Users, AlertTriangle, Clock, Thermometer,
  RefreshCw, Save, RotateCcw, Plus, CheckCircle, XCircle
} from 'lucide-react';

// Available widgets configuration
const AVAILABLE_WIDGETS = [
  { id: 'device-stats', name: 'Estadísticas de Dispositivos', icon: Camera, size: 'small', category: 'monitoring' },
  { id: 'alerts-summary', name: 'Resumen de Alertas', icon: Bell, size: 'small', category: 'alerts' },
  { id: 'cra-status', name: 'Estado CRA', icon: Shield, size: 'small', category: 'security' },
  { id: 'dahua-status', name: 'Estado Grabadores', icon: HardDrive, size: 'small', category: 'monitoring' },
  { id: 'vpn-status', name: 'Estado VPN', icon: Network, size: 'small', category: 'network' },
  { id: 'system-resources', name: 'Recursos del Sistema', icon: Activity, size: 'medium', category: 'system' },
  { id: 'recent-alerts', name: 'Alertas Recientes', icon: AlertTriangle, size: 'large', category: 'alerts' },
  { id: 'uptime-chart', name: 'Gráfico de Uptime', icon: BarChart3, size: 'large', category: 'monitoring' },
  { id: 'users-online', name: 'Usuarios Conectados', icon: Users, size: 'small', category: 'users' },
  { id: 'server-health', name: 'Salud del Servidor', icon: Server, size: 'medium', category: 'system' },
  { id: 'quick-actions', name: 'Acciones Rápidas', icon: Plus, size: 'small', category: 'tools' },
  { id: 'clock', name: 'Reloj y Fecha', icon: Clock, size: 'small', category: 'tools' },
];

// Default widget layout
const DEFAULT_LAYOUT = [
  'device-stats',
  'alerts-summary', 
  'cra-status',
  'dahua-status',
  'system-resources',
  'recent-alerts'
];

// Widget component placeholder - in real implementation, each would render actual data
const WidgetContent = ({ widget, data }) => {
  const Icon = widget.icon;
  
  // Simulated widget content based on type
  const renderContent = () => {
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
            <div className="flex justify-between"><span className="text-sm">Críticas</span><Badge variant="destructive">{data?.critical || 0}</Badge></div>
            <div className="flex justify-between"><span className="text-sm">Warnings</span><Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{data?.warnings || 0}</Badge></div>
            <div className="flex justify-between"><span className="text-sm">Info</span><Badge variant="outline">{data?.info || 0}</Badge></div>
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
          </div>
        );
      case 'clock':
        return (
          <div className="text-center">
            <p className="text-3xl font-bold">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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
      case 'dahua-status':
        return (
          <div className="text-center">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-2xl font-bold text-blue-600">{data?.total || 0}</p><p className="text-xs text-muted-foreground">Total</p></div>
              <div><p className="text-2xl font-bold text-green-600">{data?.online || 0}</p><p className="text-xs text-muted-foreground">Online</p></div>
              <div><p className="text-2xl font-bold text-red-600">{data?.offline || 0}</p><p className="text-xs text-muted-foreground">Offline</p></div>
            </div>
            {data?.total > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((data?.online / data?.total) * 100) || 0}% disponibilidad
              </p>
            )}
          </div>
        );
      case 'recent-alerts':
        return (
          <div className="space-y-2">
            {data?.alerts && data.alerts.length > 0 ? (
              data.alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <span className="truncate max-w-[200px]">{alert.message || alert.title}</span>
                  </div>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                    {alert.severity}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Sin alertas recientes</p>
              </div>
            )}
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {widget.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

const CustomizableDashboard = ({ deviceStats, alertStats, systemStats, craStatus, authAxios, dahuaDevices = [], alerts = [] }) => {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [showConfig, setShowConfig] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [realTimeSystemStats, setRealTimeSystemStats] = useState(null);
  const intervalRef = useRef(null);

  // Fetch real-time system stats
  const fetchSystemStats = useCallback(async () => {
    if (!authAxios) return;
    try {
      const res = await authAxios.get('/system/stats');
      setRealTimeSystemStats({
        cpu: res.data.cpu?.percent || 0,
        ram: res.data.ram?.percent || 0,
        disk: res.data.disk?.percent || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  }, [authAxios]);

  // Calculate Dahua stats
  const dahuaStats = {
    total: dahuaDevices.length,
    online: dahuaDevices.filter(d => d.status === 'online' || d.is_online).length,
    offline: dahuaDevices.filter(d => d.status !== 'online' && !d.is_online).length
  };

  // Load saved layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('watchtower_dashboard_layout');
    if (saved) {
      try {
        setLayout(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading dashboard layout:', e);
      }
    }
  }, []);

  // Fetch system stats on mount and set interval
  useEffect(() => {
    fetchSystemStats();
    intervalRef.current = setInterval(fetchSystemStats, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSystemStats]);

  // Save layout to localStorage
  const saveLayout = useCallback(() => {
    localStorage.setItem('watchtower_dashboard_layout', JSON.stringify(layout));
    toast.success('Dashboard guardado');
    setShowConfig(false);
  }, [layout]);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem('watchtower_dashboard_layout');
    toast.success('Dashboard restaurado');
  }, []);

  // Toggle widget visibility
  const toggleWidget = (widgetId) => {
    setLayout(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      } else {
        return [...prev, widgetId];
      }
    });
  };

  // Move widget up/down
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

  // Get widget data based on type
  const getWidgetData = (widgetId) => {
    switch(widgetId) {
      case 'device-stats':
        return deviceStats;
      case 'alerts-summary':
        return alertStats;
      case 'system-resources':
        // Use real-time stats if available, otherwise fall back to props
        return realTimeSystemStats || systemStats;
      case 'cra-status':
        return craStatus;
      case 'dahua-status':
        return dahuaStats;
      case 'recent-alerts':
        return { alerts: alerts.slice(0, 5) };
      default:
        return {};
    }
  };

  // Get active widgets
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
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Personalizar Dashboard
              </DialogTitle>
              <DialogDescription>
                Selecciona y ordena los widgets que quieres ver en tu dashboard
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Available widgets */}
              <div>
                <h4 className="font-medium mb-2">Widgets Disponibles</h4>
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-2">
                    {AVAILABLE_WIDGETS.map(widget => {
                      const Icon = widget.icon;
                      const isActive = layout.includes(widget.id);
                      
                      return (
                        <div 
                          key={widget.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${isActive ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{widget.name}</span>
                          </div>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => toggleWidget(widget.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Active widgets order */}
              <div>
                <h4 className="font-medium mb-2">Orden de Widgets ({layout.length})</h4>
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-2">
                    {layout.map((widgetId, index) => {
                      const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
                      if (!widget) return null;
                      const Icon = widget.icon;
                      
                      return (
                        <div 
                          key={widgetId}
                          className="flex items-center justify-between p-3 rounded-lg border bg-white"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{widget.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => moveWidget(index, -1)}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => moveWidget(index, 1)}
                              disabled={index === layout.length - 1}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
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
          <div 
            key={widget.id}
            className={`${widget.size === 'large' ? 'md:col-span-2' : ''} ${widget.size === 'medium' ? 'lg:col-span-1' : ''}`}
          >
            <WidgetContent 
              widget={widget} 
              data={getWidgetData(widget.id)}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {activeWidgets.length === 0 && (
        <Card className="p-8 text-center">
          <LayoutDashboard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Dashboard vacío</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Personaliza tu dashboard añadiendo widgets
          </p>
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
