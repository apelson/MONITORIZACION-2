/**
 * InfrastructureWidget - Widget para mostrar estado de infraestructura en NOC Dashboard
 * Muestra ESXi, NAS (QNAP/Synology) y otros dispositivos críticos
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Server, HardDrive, Database, RefreshCw, ChevronRight, ChevronDown, Wifi, WifiOff, Cpu, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const TYPE_ICONS = {
  esxi: Cpu,
  qnap: HardDrive,
  synology: Database,
  openvpn_server: Server,
  default: Server
};

const TYPE_COLORS = {
  esxi: 'text-purple-400 bg-purple-500/20',
  qnap: 'text-blue-400 bg-blue-500/20',
  synology: 'text-cyan-400 bg-cyan-500/20',
  openvpn_server: 'text-green-400 bg-green-500/20',
  default: 'text-slate-400 bg-slate-500/20'
};

const InfrastructureWidget = ({ 
  authAxios, 
  onDeviceClick,
  onViewAll,
  editMode = false,
  compact = false
}) => {
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0, byType: {} });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const devicesRef = useRef([]);

  // Fetch infrastructure status
  const fetchInfraStatus = useCallback(async () => {
    if (!authAxios) return;
    try {
      const res = await authAxios.get('/infrastructure/devices');
      const newDevices = res.data || [];
      
      // Calculate summary
      const online = newDevices.filter(d => d.status === 'online').length;
      const offline = newDevices.filter(d => d.status !== 'online').length;
      const byType = {};
      
      newDevices.forEach(d => {
        const type = d.device_type || 'default';
        if (!byType[type]) byType[type] = { total: 0, online: 0 };
        byType[type].total++;
        if (d.status === 'online') byType[type].online++;
      });
      
      devicesRef.current = newDevices;
      setDevices(newDevices);
      setSummary({ total: newDevices.length, online, offline, byType });
    } catch (error) {
      console.error('Error fetching infrastructure status:', error);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchInfraStatus();
    const interval = setInterval(fetchInfraStatus, 120000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, [fetchInfraStatus]);

  const handleRefresh = async () => {
    if (!authAxios) return;
    setLoading(true);
    try {
      // Check all devices
      await Promise.all(devices.map(d => 
        authAxios.get(`/infrastructure/devices/${d.id}/check`).catch(() => null)
      ));
      await fetchInfraStatus();
    } catch (error) {
      console.error('Error checking infrastructure devices:', error);
    }
    setLoading(false);
  };

  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status !== 'online');

  // Compact mode for header
  if (compact) {
    return (
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-purple-400 uppercase">INFRA</p>
          <p className="text-2xl font-bold text-purple-400">
            {summary.online}<span className="text-lg opacity-70">/{summary.total}</span>
          </p>
        </div>
        <Server className="w-7 h-7 text-purple-400 opacity-40" />
      </div>
    );
  }

  return (
    <Card className={cn(
      "bg-slate-900/80 border-slate-700/50 h-full flex flex-col",
      summary.offline > 0 && "border-amber-500/50"
    )}>
      <CardHeader className="py-3 px-4 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-0.5 hover:bg-slate-700/50 rounded transition-colors"
            >
              {expanded ? 
                <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                <ChevronRight className="w-4 h-4 text-slate-400" />
              }
            </button>
            <Server className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-sm font-medium text-slate-200">
              Infraestructura
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] px-2 py-0.5",
                summary.offline > 0 ? "border-amber-500 text-amber-400" : "border-emerald-500 text-emerald-400"
              )}
            >
              {summary.online}/{summary.total}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="p-0 flex-grow overflow-hidden">
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-6 text-slate-500">
              <Server className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Sin dispositivos de infraestructura</p>
              {onViewAll && (
                <Button variant="link" size="sm" className="mt-2 text-xs" onClick={onViewAll}>
                  Agregar dispositivo
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="p-3 space-y-2">
                {/* Type summary badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(summary.byType).map(([type, data]) => {
                    const Icon = TYPE_ICONS[type] || TYPE_ICONS.default;
                    const colorClass = TYPE_COLORS[type] || TYPE_COLORS.default;
                    return (
                      <div 
                        key={type}
                        className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]", colorClass)}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="uppercase font-medium">{type.replace('_', ' ')}</span>
                        <span className="opacity-70">{data.online}/{data.total}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Critical alerts first */}
                {offlineDevices.length > 0 && (
                  <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{offlineDevices.length} dispositivo(s) offline</span>
                    </div>
                    <div className="space-y-1">
                      {offlineDevices.map(device => {
                        const Icon = TYPE_ICONS[device.device_type] || TYPE_ICONS.default;
                        return (
                          <div 
                            key={device.id}
                            className="flex items-center justify-between p-1.5 bg-red-500/10 rounded cursor-pointer hover:bg-red-500/20 transition-colors"
                            onClick={() => onDeviceClick?.(device)}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-xs text-red-300 truncate max-w-[120px]">{device.name}</span>
                            </div>
                            <WifiOff className="w-3 h-3 text-red-400" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Online devices */}
                <div className="space-y-1.5">
                  {onlineDevices.map(device => {
                    const Icon = TYPE_ICONS[device.device_type] || TYPE_ICONS.default;
                    const colorClass = TYPE_COLORS[device.device_type] || TYPE_COLORS.default;
                    const cpuUsage = device.metrics?.cpu_usage || 0;
                    const ramUsage = device.metrics?.memory_usage || 0;
                    
                    return (
                      <div 
                        key={device.id}
                        className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        onClick={() => onDeviceClick?.(device)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded", colorClass.split(' ')[1])}>
                            <Icon className={cn("w-4 h-4", colorClass.split(' ')[0])} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-200 truncate max-w-[100px]">{device.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{device.host}:{device.port}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Mini metrics */}
                          {(cpuUsage > 0 || ramUsage > 0) && (
                            <div className="hidden sm:flex items-center gap-2 text-[9px]">
                              {cpuUsage > 0 && (
                                <div className="flex items-center gap-1">
                                  <Cpu className="w-3 h-3 text-slate-500" />
                                  <span className={cn(
                                    cpuUsage > 80 ? "text-amber-400" : "text-slate-400"
                                  )}>{cpuUsage}%</span>
                                </div>
                              )}
                              {ramUsage > 0 && (
                                <div className="flex items-center gap-1">
                                  <Database className="w-3 h-3 text-slate-500" />
                                  <span className={cn(
                                    ramUsage > 80 ? "text-amber-400" : "text-slate-400"
                                  )}>{ramUsage}%</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-emerald-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          )}
          
          {/* Footer with View All link */}
          {onViewAll && devices.length > 0 && (
            <div className="border-t border-slate-700/50 p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-slate-400 hover:text-slate-200"
                onClick={onViewAll}
              >
                Ver panel completo
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default InfrastructureWidget;
