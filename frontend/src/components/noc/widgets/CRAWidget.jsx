/**
 * CRA Widget - Central Receptora de Alarmas
 * Shows alarm panel status with armed/disarmed states
 */
import { Shield, Maximize2, GripVertical, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const CRAWidget = ({ 
  craDevices = [], 
  onMaximize, 
  onDeviceClick,
  editMode = false 
}) => {
  const { t } = useTranslation();
  const hasOffline = craDevices.some(d => d.status === 'offline');
  const offlineCount = craDevices.filter(d => d.status === 'offline').length;
  
  // Count armed/disarmed devices
  const armedCount = craDevices.filter(d => d.armed === true || d.alarm_status === 'armed').length;
  const disarmedCount = craDevices.filter(d => d.armed === false || d.alarm_status === 'disarmed').length;
  const alertCount = craDevices.filter(d => d.alarm_status === 'alert' || d.has_alarm).length;

  return (
    <div className={cn(
      "h-full bg-slate-900/80 rounded-lg p-3 flex flex-col transition-all",
      editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : 
      hasOffline ? "border-2 border-red-500 animate-pulse" : "border border-slate-700/50"
    )}>
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-white">CRA</span>
          <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">{craDevices.length}</Badge>
          {hasOffline && (
            <Badge className="bg-red-500/20 text-red-400 text-[10px] animate-pulse">{offlineCount} OFFLINE</Badge>
          )}
        </div>
        {onMaximize && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-red-400" onClick={onMaximize}>
            <Maximize2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      {/* Armed/Disarmed Status Bar */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded text-[9px]">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{armedCount} {t('cra.armed', 'Armado')}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 rounded text-[9px]">
          <Unlock className="w-3 h-3 text-amber-400" />
          <span className="text-amber-400 font-medium">{disarmedCount} {t('cra.disarmed', 'Desarmado')}</span>
        </div>
        {alertCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/30 rounded text-[9px] animate-pulse">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-red-400 font-medium">{alertCount} {t('cra.alert', 'Alarma')}</span>
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className={cn("grid gap-1.5 pr-2", craDevices.length > 20 ? "grid-cols-4" : "grid-cols-3")}>
          {craDevices.map(device => {
            const isArmed = device.armed === true || device.alarm_status === 'armed';
            const isDisarmed = device.armed === false || device.alarm_status === 'disarmed';
            const hasAlarm = device.alarm_status === 'alert' || device.has_alarm;
            
            return (
              <div 
                key={device.id} 
                className={cn(
                  "p-1.5 rounded border text-center cursor-pointer transition-all hover:scale-105", 
                  device.status === 'offline' 
                    ? "bg-red-500/20 border-red-500/50 animate-pulse" 
                    : hasAlarm
                    ? "bg-red-500/30 border-red-500/60 animate-pulse"
                    : isArmed
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-amber-500/10 border-amber-500/30"
                )} 
                onClick={() => onDeviceClick?.(device)}
              >
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  {hasAlarm ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : isArmed ? (
                    <Lock className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Unlock className="w-3 h-3 text-amber-400" />
                  )}
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full", 
                    device.status === 'offline' ? "bg-red-500" : 
                    hasAlarm ? "bg-red-500 animate-ping" :
                    isArmed ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                </div>
                <p className="text-[9px] text-white truncate">{device.name}</p>
                <p className="text-[8px] text-slate-500 truncate">{device.ip_address}</p>
                {device.response_time_ms && (
                  <p className={cn("text-[8px] mt-0.5", device.response_time_ms > 500 ? "text-orange-400" : "text-cyan-400")}>
                    {device.response_time_ms}ms
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CRAWidget;
