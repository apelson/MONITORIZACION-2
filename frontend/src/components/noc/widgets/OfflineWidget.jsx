/**
 * Offline Devices Widget
 */
import { WifiOff, CheckCircle, Maximize2, GripVertical, Camera, HardDrive, Network, Router, Server, Monitor, Printer, Wifi, Shield, Box, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  camera: Camera, "hard-drive": HardDrive, network: Network, router: Router,
  server: Server, monitor: Monitor, printer: Printer, wifi: Wifi,
  shield: Shield, box: Box, layers: Layers
};

const OfflineWidget = ({ 
  offlineDevices = [],
  deviceTypes = [],
  stats,
  onMaximize,
  onDeviceClick,
  formatTimeSince,
  editMode = false 
}) => {
  const getDeviceIcon = (device) => {
    const deviceType = deviceTypes.find(t => t.id === device.device_type_id);
    const iconName = deviceType?.icon || 'server';
    return ICON_MAP[iconName] || Server;
  };

  return (
    <div className={cn(
      "h-full bg-slate-900/80 rounded-lg p-2 flex flex-col transition-all",
      editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : 
      offlineDevices.length > 0 ? "border-2 border-red-500" : "border border-slate-700/50"
    )}>
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-white">Offline</span>
          <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">{stats?.offline || 0}</Badge>
        </div>
        {onMaximize && (
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-red-400" onClick={onMaximize}>
            <Maximize2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        {offlineDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4">
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-1" />
            <p className="text-xs text-emerald-400">Todos online</p>
          </div>
        ) : (
          <div className="space-y-1 pr-2">
            {offlineDevices.slice(0, 8).map(device => {
              const Icon = getDeviceIcon(device);
              return (
                <div 
                  key={device.id} 
                  className="p-1.5 rounded bg-red-500/5 border border-red-500/20 flex items-center justify-between cursor-pointer hover:bg-red-500/10" 
                  onClick={() => onDeviceClick?.(device)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-[11px] text-white truncate">{device.name}</span>
                  </div>
                  <span className="text-[10px] text-red-400 ml-2">{formatTimeSince?.(device.last_status_change)}</span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default OfflineWidget;
