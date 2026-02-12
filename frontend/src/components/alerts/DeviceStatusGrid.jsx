/**
 * DeviceStatusGrid - Mosaico visual de dispositivos con colores por estado
 * Click en cada dispositivo para ver su historial
 */
import { useState, useMemo } from 'react';
import { Camera, Server, HardDrive, Network, Router, Monitor, Printer, Wifi, Shield, Box, Layers, Search, Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  camera: Camera, "hard-drive": HardDrive, network: Network, router: Router,
  server: Server, monitor: Monitor, printer: Printer, wifi: Wifi,
  shield: Shield, box: Box, layers: Layers
};

const DeviceStatusGrid = ({ 
  devices = [], 
  groups = [], 
  organizations = [],
  deviceTypes = [],
  onDeviceClick,
  className 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [gridSize, setGridSize] = useState('medium'); // small, medium, large

  // Filter and search devices
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!device.name?.toLowerCase().includes(query) && 
            !device.ip_address?.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Status filter
      if (filterStatus !== 'all' && device.status !== filterStatus) {
        return false;
      }
      // Group filter
      if (filterGroup !== 'all' && device.group_id !== filterGroup) {
        return false;
      }
      return true;
    });
  }, [devices, searchQuery, filterStatus, filterGroup]);

  // Group devices by status for stats
  const stats = useMemo(() => {
    const online = filteredDevices.filter(d => d.status === 'online').length;
    const offline = filteredDevices.filter(d => d.status === 'offline').length;
    const unknown = filteredDevices.filter(d => !d.status || d.status === 'unknown').length;
    return { online, offline, unknown, total: filteredDevices.length };
  }, [filteredDevices]);

  const getDeviceIcon = (device) => {
    const deviceType = deviceTypes.find(t => t.id === device.device_type_id);
    const iconName = deviceType?.icon || 'server';
    return ICON_MAP[iconName] || Server;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusBorder = (status) => {
    switch (status) {
      case 'online': return 'border-emerald-500/30 hover:border-emerald-500/60';
      case 'offline': return 'border-red-500/30 hover:border-red-500/60';
      default: return 'border-slate-500/30 hover:border-slate-500/60';
    }
  };

  const getGridCellSize = () => {
    switch (gridSize) {
      case 'small': return 'w-12 h-12';
      case 'large': return 'w-24 h-24';
      default: return 'w-16 h-16';
    }
  };

  const getGroupName = (groupId) => {
    return groups.find(g => g.id === groupId)?.name || 'Sin grupo';
  };

  return (
    <Card className={cn("bg-slate-900/50 border-slate-700/50", className)} data-testid="device-status-grid">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Monitor className="w-5 h-5 text-cyan-400" />
              </div>
              Mosaico de Estado
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              Vista rápida del estado de todos los dispositivos
            </p>
          </div>
          
          {/* Stats badges */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              {stats.online} Online
            </Badge>
            <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10">
              {stats.offline} Offline
            </Badge>
            <Badge variant="outline" className="border-slate-500/30 text-slate-400 bg-slate-500/10">
              {stats.total} Total
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por nombre o IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white"
              data-testid="grid-search-input"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-white"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-full sm:w-44 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border border-slate-700 rounded-lg p-1">
            <Button
              variant={gridSize === 'small' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setGridSize('small')}
            >
              S
            </Button>
            <Button
              variant={gridSize === 'medium' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setGridSize('medium')}
            >
              M
            </Button>
            <Button
              variant={gridSize === 'large' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setGridSize('large')}
            >
              L
            </Button>
          </div>
        </div>

        {/* Device Grid */}
        <ScrollArea className="h-[400px] pr-4">
          {filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Filter className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No se encontraron dispositivos</p>
              <p className="text-xs mt-1">Intenta ajustar los filtros</p>
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="flex flex-wrap gap-2">
                {filteredDevices.map((device) => {
                  const Icon = getDeviceIcon(device);
                  const statusColor = getStatusColor(device.status);
                  const statusBorder = getStatusBorder(device.status);

                  return (
                    <Tooltip key={device.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onDeviceClick?.(device)}
                          className={cn(
                            "relative rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all",
                            "bg-slate-800/50 hover:bg-slate-800",
                            "hover:scale-105 active:scale-95",
                            statusBorder,
                            getGridCellSize()
                          )}
                          data-testid={`grid-device-${device.id}`}
                        >
                          {/* Status indicator */}
                          <div className={cn(
                            "absolute top-1 right-1 w-2.5 h-2.5 rounded-full",
                            statusColor,
                            device.status === 'offline' && "animate-pulse"
                          )} />
                          
                          <Icon className={cn(
                            "w-5 h-5",
                            device.status === 'online' ? 'text-emerald-400' : 
                            device.status === 'offline' ? 'text-red-400' : 'text-slate-400'
                          )} />
                          
                          {gridSize !== 'small' && (
                            <span className="text-[10px] text-slate-400 truncate max-w-full px-1">
                              {device.name?.substring(0, 8)}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-slate-800 border-slate-700">
                        <div className="text-sm">
                          <p className="font-medium text-white">{device.name}</p>
                          <p className="text-slate-400">{device.ip_address}:{device.port}</p>
                          <p className="text-xs text-slate-500 mt-1">{getGroupName(device.group_id)}</p>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "mt-2",
                              device.status === 'online' 
                                ? 'border-emerald-500/30 text-emerald-400' 
                                : 'border-red-500/30 text-red-400'
                            )}
                          >
                            {device.status === 'online' ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span>Offline</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            <span>Desconocido</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceStatusGrid;
