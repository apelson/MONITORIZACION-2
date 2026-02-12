/**
 * NOC CRA Section Component
 * Central Receptora de Alarmas monitoring section
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Shield, Maximize2, Minimize2, Camera, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const NOCCRASection = ({ 
  craDevices, 
  onDeviceClick,
  expanded = false,
  onToggleExpand,
  showExpandButton = true
}) => {
  const { t } = useTranslation();

  // Device card component
  const CRADeviceCard = ({ device, compact = false }) => {
    const isOffline = device.status === 'offline';
    const latency = device.response_time_ms || 0;
    const highLatency = latency > 200;

    if (compact) {
      return (
        <div
          onClick={() => onDeviceClick?.(device)}
          className={cn(
            "p-2 rounded-lg border text-center transition-all cursor-pointer hover:scale-105",
            isOffline 
              ? "bg-red-500/20 border-red-500 animate-pulse" 
              : highLatency
                ? "bg-amber-500/10 border-amber-500/50"
                : "bg-emerald-500/10 border-emerald-500/30"
          )}
        >
          <Camera className={cn("w-4 h-4 mx-auto mb-1", isOffline ? "text-red-400" : "text-emerald-400")} />
          <p className="text-[10px] font-medium text-white truncate">{device.name}</p>
          {!isOffline && latency > 0 && (
            <p className={cn("text-[8px]", highLatency ? "text-amber-400" : "text-slate-400")}>
              {latency}ms
            </p>
          )}
          {isOffline && (
            <Badge className="bg-red-500 text-white text-[8px] px-1 py-0 mt-1">OFF</Badge>
          )}
        </div>
      );
    }

    return (
      <div
        onClick={() => onDeviceClick?.(device)}
        className={cn(
          "p-4 rounded-lg border text-center transition-all cursor-pointer hover:scale-105",
          isOffline 
            ? "bg-red-500/20 border-red-500 animate-pulse" 
            : highLatency
              ? "bg-amber-500/10 border-amber-500/50"
              : "bg-emerald-500/10 border-emerald-500/30"
        )}
      >
        {isOffline ? (
          <WifiOff className="w-8 h-8 mx-auto mb-2 text-red-400" />
        ) : (
          <Camera className={cn("w-8 h-8 mx-auto mb-2", highLatency ? "text-amber-400" : "text-emerald-400")} />
        )}
        <p className="text-sm font-medium text-white truncate">{device.name}</p>
        <p className="text-xs text-slate-400">{device.ip_address}</p>
        {!isOffline && latency > 0 && (
          <Badge 
            variant="outline" 
            className={cn("mt-2", highLatency ? "border-amber-500 text-amber-400" : "border-emerald-500 text-emerald-400")}
          >
            {latency}ms
          </Badge>
        )}
        {isOffline && (
          <Badge className="bg-red-500 text-white mt-2">OFFLINE</Badge>
        )}
      </div>
    );
  };

  // Compact view for dashboard grid
  if (!expanded) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-white">CRA</span>
            <Badge variant="outline" className="text-xs border-red-500 text-red-400">
              {craDevices.length}
            </Badge>
            {craDevices.some(d => d.status === 'offline') && (
              <Badge className="bg-red-500 text-white text-xs animate-pulse">
                {craDevices.filter(d => d.status === 'offline').length} OFF
              </Badge>
            )}
          </div>
          {showExpandButton && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggleExpand}>
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-4 gap-1.5">
            {craDevices.slice(0, 16).map(device => (
              <CRADeviceCard key={device.id} device={device} compact />
            ))}
          </div>
          {craDevices.length > 16 && (
            <p className="text-xs text-center text-slate-400 mt-2">
              +{craDevices.length - 16} más
            </p>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-red-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t('noc.cra', 'Central Receptora de Alarmas (CRA)')}
            </h2>
            <p className="text-slate-400">
              {craDevices.length} {t('noc.devicesMonitored', 'dispositivos monitorizados')}
            </p>
          </div>
          {craDevices.some(d => d.status === 'offline') && (
            <Badge className="bg-red-500 text-white text-lg px-4 py-1 animate-pulse ml-4">
              {craDevices.filter(d => d.status === 'offline').length} OFFLINE
            </Badge>
          )}
        </div>
        {showExpandButton && (
          <Button variant="ghost" size="sm" onClick={onToggleExpand}>
            <Minimize2 className="w-5 h-5" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-2">
          {craDevices.map(device => (
            <CRADeviceCard key={device.id} device={device} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NOCCRASection;
