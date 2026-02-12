/**
 * DeviceHistoryModal - Modal para ver el historial de un dispositivo
 * Muestra alertas y cambios de estado
 */
import { useState, useEffect } from 'react';
import { X, Wifi, WifiOff, Clock, Calendar, TrendingUp, AlertTriangle, Activity, Server, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const DeviceHistoryModal = ({ 
  device, 
  isOpen, 
  onClose, 
  alerts = [],
  authAxios,
  onRefresh
}) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');

  // Filter alerts for this device
  const deviceAlerts = alerts.filter(a => a.device_id === device?.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Fetch device history
  useEffect(() => {
    if (isOpen && device?.id && authAxios) {
      setLoading(true);
      authAxios.get(`/devices/${device.id}/history?limit=50`)
        .then(res => {
          setHistory(res.data.history || []);
        })
        .catch(err => {
          console.error('Error fetching history:', err);
          setHistory([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, device?.id, authAxios]);

  // Calculate uptime percentage (last 24h)
  const uptimePercentage = (() => {
    if (history.length < 2) return null;
    const onlineCount = history.filter(h => h.status === 'online').length;
    return Math.round((onlineCount / history.length) * 100);
  })();

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  };

  const getAlertTypeLabel = (type) => {
    const labels = {
      'device_down': 'Dispositivo Caído',
      'device_up': 'Dispositivo Recuperado',
      'nas_disconnected': 'NAS Desconectado',
      'nas_reconnected': 'NAS Reconectado',
      'storage_full': 'Almacenamiento Lleno',
      'recording_stopped': 'Grabación Detenida'
    };
    return labels[type] || type;
  };

  const getAlertIcon = (type) => {
    if (type === 'device_down' || type === 'nas_disconnected' || type === 'storage_full' || type === 'recording_stopped') {
      return <WifiOff className="w-4 h-4 text-red-400" />;
    }
    return <Wifi className="w-4 h-4 text-green-400" />;
  };

  if (!device) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              device.status === 'online' ? 'bg-emerald-500/10' : 'bg-red-500/10'
            )}>
              <Server className={cn(
                "w-5 h-5",
                device.status === 'online' ? 'text-emerald-400' : 'text-red-400'
              )} />
            </div>
            <div>
              <span className="text-white">{device.name}</span>
              <p className="text-sm font-normal text-slate-400">{device.ip_address}:{device.port}</p>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "ml-auto",
                device.status === 'online' 
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' 
                  : 'border-red-500/30 text-red-400 bg-red-500/10'
              )}
            >
              {device.status === 'online' ? 'Online' : 'Offline'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-400">Último Check</span>
              </div>
              <p className="text-sm font-medium text-white mt-1">
                {device.last_check ? formatTimeAgo(device.last_check) : 'N/A'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-400">Uptime 24h</span>
              </div>
              <p className={cn(
                "text-sm font-medium mt-1",
                uptimePercentage !== null 
                  ? uptimePercentage >= 90 ? 'text-emerald-400' 
                    : uptimePercentage >= 70 ? 'text-amber-400' 
                    : 'text-red-400'
                  : 'text-slate-400'
              )}>
                {uptimePercentage !== null ? `${uptimePercentage}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400">Alertas</span>
              </div>
              <p className="text-sm font-medium text-white mt-1">
                {deviceAlerts.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="bg-slate-800/50 border-slate-700">
            <TabsTrigger value="alerts" className="data-[state=active]:bg-slate-700">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alertas ({deviceAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
              <Clock className="w-4 h-4 mr-2" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {deviceAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No hay alertas para este dispositivo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deviceAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        alert.alert_type?.includes('down') || alert.alert_type?.includes('disconnected') || alert.alert_type?.includes('full') || alert.alert_type?.includes('stopped')
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-green-500/10 border-green-500/30'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.alert_type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white">
                              {getAlertTypeLabel(alert.alert_type)}
                            </p>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(alert.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Clock className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No hay historial disponible</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />
                  
                  <div className="space-y-3">
                    {history.map((entry, index) => (
                      <div key={entry.id || index} className="flex items-start gap-4 pl-2">
                        <div className={cn(
                          "relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          entry.status === 'online' 
                            ? 'bg-emerald-500 border-emerald-400' 
                            : 'bg-red-500 border-red-400'
                        )}>
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="outline"
                              className={cn(
                                "text-xs",
                                entry.status === 'online'
                                  ? 'border-emerald-500/30 text-emerald-400'
                                  : 'border-red-500/30 text-red-400'
                              )}
                            >
                              {entry.status === 'online' ? 'Online' : 'Offline'}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(entry.timestamp)}
                            </span>
                          </div>
                          {entry.response_time && (
                            <p className="text-xs text-slate-400 mt-1">
                              Tiempo de respuesta: {entry.response_time}ms
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-700">
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            Cerrar
          </Button>
          {onRefresh && (
            <Button 
              onClick={() => onRefresh(device.id)}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Verificar Ahora
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceHistoryModal;
