/**
 * DahuaWidget - Widget para NOC Dashboard mostrando estado de grabadores Dahua
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  HardDrive, Wifi, WifiOff, AlertTriangle, RefreshCw,
  CheckCircle, XCircle, Database, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Dahua brand styling
const DahuaBrand = ({ size = "sm" }) => (
  <span className={`font-bold text-[#E31837] ${size === "sm" ? "text-sm" : "text-base"}`}>DAHUA</span>
);

const DahuaWidget = ({ authAxios, onDeviceClick, className }) => {
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [devicesRes, statusRes] = await Promise.all([
        authAxios.get('/dahua/devices'),
        authAxios.get('/dahua/status')
      ]);
      setDevices(devicesRes.data.devices || []);
      setSummary(statusRes.data.summary || null);
    } catch (error) {
      console.error('Error fetching Dahua data:', error);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCheckAll = async () => {
    setChecking(true);
    try {
      await authAxios.post('/dahua/check-all');
      await fetchData();
    } catch (error) {
      console.error('Error checking devices:', error);
    } finally {
      setChecking(false);
    }
  };

  // Separate online and offline devices
  const onlineDevices = devices.filter(d => d.online === true);
  const offlineDevices = devices.filter(d => d.online === false);
  const unknownDevices = devices.filter(d => d.online === null || d.online === undefined);

  // Get devices with issues
  const issueDevices = devices.filter(d => 
    d.online === false || 
    d.recording_active === false || 
    (d.storage_used_percent || 0) > 90 ||
    d.hdd_healthy === false
  );

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DahuaBrand size="sm" />
            <span className="text-sm">Grabadores P2P</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (devices.length === 0) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DahuaBrand size="sm" />
            <span className="text-sm">Grabadores P2P</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <HardDrive className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">Sin grabadores configurados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DahuaBrand size="sm" />
            <span className="text-sm font-medium">Grabadores P2P</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Summary badges */}
            <Badge variant="outline" className="border-emerald-500 text-emerald-500 text-xs">
              {summary?.online || 0} online
            </Badge>
            {(summary?.offline || 0) > 0 && (
              <Badge variant="outline" className="border-red-500 text-red-500 text-xs">
                {summary.offline} offline
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCheckAll}
              disabled={checking}
              className="h-6 w-6 p-0"
            >
              {checking ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-0">
        <ScrollArea className="h-full">
          <div className="space-y-2 pr-2">
            {/* Show devices with issues first */}
            {issueDevices.length > 0 && (
              <div className="space-y-1">
                {issueDevices.map((device) => (
                  <div
                    key={device.id}
                    onClick={() => onDeviceClick?.(device)}
                    className={cn(
                      "p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]",
                      device.online === false
                        ? "bg-red-500/10 border border-red-500/30"
                        : "bg-amber-500/10 border border-amber-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {device.online === false ? (
                          <WifiOff className="w-4 h-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="font-medium text-sm truncate max-w-[120px]">
                          {device.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Recording status */}
                        {device.recording_active === false && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-red-500 text-red-500">
                            NO REC
                          </Badge>
                        )}
                        {/* Storage */}
                        {device.storage_used_percent > 90 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-500">
                            {device.storage_used_percent}%
                          </Badge>
                        )}
                        {/* HDD */}
                        {device.hdd_healthy === false && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-red-500 text-red-500">
                            HDD
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Healthy devices (collapsed view) */}
            {onlineDevices.filter(d => !issueDevices.includes(d)).length > 0 && (
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600">
                    {onlineDevices.filter(d => !issueDevices.includes(d)).length} grabadores funcionando correctamente
                  </span>
                </div>
              </div>
            )}

            {/* Unknown status devices */}
            {unknownDevices.length > 0 && (
              <div className="p-2 rounded-lg bg-slate-500/5 border border-slate-500/20">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-muted-foreground">
                    {unknownDevices.length} sin verificar
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DahuaWidget;
