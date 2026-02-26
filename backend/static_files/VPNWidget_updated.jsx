/**
 * VPNWidget - Widget para mostrar estado de túneles VPN en NOC Dashboard
 * Estilo producción - compacto con lista de túneles
 */
import { useState, useEffect, useRef } from 'react';
import { Shield, Wifi, WifiOff, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const VPNWidget = ({ 
  authAxios, 
  onDeviceClick,
  editMode = false,
  compact = false
}) => {
  const [vpnDevices, setVpnDevices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0 });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const vpnRef = useRef([]);

  // Fetch VPN status
  const fetchVPNStatus = async () => {
    if (!authAxios) return;
    try {
      const res = await authAxios.get('/vpn/status');
      const newDevices = res.data.devices || [];
      const newSummary = res.data.summary || { total: 0, online: 0, offline: 0 };
      
      vpnRef.current = newDevices;
      setVpnDevices(newDevices);
      setSummary(newSummary);
    } catch (error) {
      console.error('Error fetching VPN status:', error);
    }
  };

  useEffect(() => {
    fetchVPNStatus();
    const interval = setInterval(fetchVPNStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [authAxios]);

  const handleRefresh = async () => {
    if (!authAxios) return;
    setLoading(true);
    try {
      await authAxios.post('/vpn/check-all');
      await fetchVPNStatus();
    } catch (error) {
      console.error('Error checking VPN devices:', error);
    }
    setLoading(false);
  };

  const onlineDevices = vpnDevices.filter(d => d.online);
  const offlineDevices = vpnDevices.filter(d => !d.online);

  if (compact) {
    return (
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-cyan-400 uppercase">VPN</p>
          <p className="text-2xl font-bold text-cyan-400">
            {summary.online}<span className="text-lg opacity-70">/{summary.total}</span>
          </p>
        </div>
        <Shield className="w-7 h-7 text-cyan-400 opacity-40" />
      </div>
    );
  }

  return (
    <Card className={cn(
      "bg-slate-900/80 border-slate-700/50 h-full flex flex-col",
      summary.offline > 0 && "border-red-500/50"
    )}>
      <CardHeader className="p-3 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            VPN Tunnels
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs px-2">
              {summary.online}
              <span className="text-emerald-400/70 ml-0.5">online</span>
            </Badge>
            {summary.offline > 0 && (
              <Badge className="bg-red-500/20 text-red-400 text-xs px-2 animate-pulse">
                {summary.offline}
                <span className="text-red-400/70 ml-0.5">offline</span>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={cn("w-3 h-3 text-slate-400", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 pt-0 flex-1 min-h-0 overflow-hidden">
        {vpnDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-4">
            <Shield className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">No hay túneles VPN configurados</p>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[300px]">
            <div className="space-y-1 pr-2">
              {/* Offline devices first - with warning icon */}
              {offlineDevices.map(device => (
                <div
                  key={device.id}
                  onClick={() => onDeviceClick?.(device)}
                  className="p-2 rounded border border-red-500/50 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{device.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{device.host}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Online devices */}
              {onlineDevices.map(device => (
                <div
                  key={device.id}
                  onClick={() => onDeviceClick?.(device)}
                  className="p-2 rounded border border-slate-700/50 bg-slate-800/50 cursor-pointer hover:bg-slate-800 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{device.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{device.host}</p>
                    </div>
                    {device.response_time_ms && (
                      <span className="text-[10px] text-cyan-400 font-mono">
                        {Math.round(device.response_time_ms)}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Summary footer */}
              {summary.total > 0 && (
                <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                  <p className="text-[10px] text-cyan-400 font-medium">
                    {summary.online} túneles VPN activos
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {onlineDevices.slice(0, 4).map(d => (
                      <span key={d.id} className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] rounded">
                        {d.name} {d.response_time_ms && `${Math.round(d.response_time_ms)}ms`}
                      </span>
                    ))}
                    {onlineDevices.length > 4 && (
                      <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-[9px] rounded">
                        +{onlineDevices.length - 4} más
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default VPNWidget;
