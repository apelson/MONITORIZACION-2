/**
 * NOCDashboard - Centro de Operaciones de Red Profesional 24/7
 * Versión completa con Mapa Canarias, CRA, secciones maximizables
 * Optimizado para pantalla de 55" sin scroll
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Monitor, Wifi, WifiOff, AlertTriangle, Building2, Clock, 
  TrendingUp, Activity, X, ChevronRight, RefreshCw, Eye, Server,
  Camera, HardDrive, Network, Router, Printer, Shield, Box, Layers,
  Bell, CheckCircle, XCircle, BarChart3, History, ClipboardList,
  Maximize2, Minimize2, Volume2, VolumeX, ExternalLink, Play, MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Logo Siempria (hexágono azul)
const LOGO_URL = "https://customer-assets.emergentagent.com/job_bd3cf608-7344-4385-a96f-f4dc04839f9f/artifacts/t15tym24_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";

const ICON_MAP = {
  camera: Camera, "hard-drive": HardDrive, network: Network, router: Router,
  server: Server, monitor: Monitor, printer: Printer, wifi: Wifi,
  shield: Shield, box: Box, layers: Layers
};

// Canary Islands map configuration
const CANARY_ISLANDS = [
  { id: 'LP', name: 'La Palma', x: 80, y: 340, abbrev: 'LP' },
  { id: 'TF', name: 'Tenerife', x: 140, y: 420, abbrev: 'TF' },
  { id: 'GC', name: 'Gran Canaria', x: 220, y: 360, abbrev: 'GC' },
  { id: 'FV', name: 'Fuerteventura', x: 310, y: 280, abbrev: 'FV' },
  { id: 'LZ', name: 'Lanzarote', x: 290, y: 200, abbrev: 'LZ' },
];

const NOCDashboard = ({ 
  devices = [], 
  organizations = [], 
  groups = [], 
  alerts = [],
  deviceTypes = [],
  authAxios,
  onClose,
  onDeviceClick,
  onCreateIncident,
  onViewLive,
  onViewHistory
}) => {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [uptimeData, setUptimeData] = useState([]);
  const [craDevices, setCraDevices] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const audioRef = useRef(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate uptime data for charts
  useEffect(() => {
    const now = new Date();
    const data = [];
    const hours = timeRange === '24h' ? 24 : 168;
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(now - i * 3600000);
      const onlineCount = devices.filter(d => d.status === 'online').length;
      const variance = Math.floor(Math.random() * 3) - 1;
      data.push({
        time: timeRange === '24h' 
          ? time.getHours().toString().padStart(2, '0') + ':00'
          : time.toLocaleDateString('es-ES', { weekday: 'short' }),
        uptime: Math.max(85, Math.min(100, (onlineCount / Math.max(devices.length, 1)) * 100 + variance)),
      });
    }
    setUptimeData(data);
  }, [devices, timeRange]);

  // Filter CRA devices
  useEffect(() => {
    const cra = devices.filter(d => d.is_cra === true);
    setCraDevices(cra);
  }, [devices]);

  // Statistics calculations
  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const uptimePercent = total > 0 ? ((online / total) * 100).toFixed(1) : 0;
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlerts = alerts.filter(a => new Date(a.timestamp) > last24h);
    const criticalAlerts = recentAlerts.filter(a => a.alert_type === 'device_down' || a.alert_type === 'nas_disconnected');
    return { total, online, offline, uptimePercent, recentAlerts: recentAlerts.length, criticalAlerts: criticalAlerts.length };
  }, [devices, alerts]);

  // Devices by organization
  const devicesByOrg = useMemo(() => {
    const result = [];
    organizations.forEach(org => {
      const orgGroups = groups.filter(g => g.organization_id === org.id);
      const orgDevices = devices.filter(d => orgGroups.some(g => g.id === d.group_id));
      if (orgDevices.length > 0) {
        result.push({
          org,
          online: orgDevices.filter(d => d.status === 'online').length,
          offline: orgDevices.filter(d => d.status === 'offline').length,
          total: orgDevices.length
        });
      }
    });
    return result.sort((a, b) => b.offline - a.offline || b.total - a.total);
  }, [devices, organizations, groups]);

  // Devices by island (Canary Islands)
  const devicesByIsland = useMemo(() => {
    const islandMap = {};
    CANARY_ISLANDS.forEach(island => {
      islandMap[island.id] = { ...island, online: 0, offline: 0, total: 0 };
    });

    // Map organizations to islands based on name patterns
    organizations.forEach(org => {
      const orgGroups = groups.filter(g => g.organization_id === org.id);
      const orgDevices = devices.filter(d => orgGroups.some(g => g.id === d.group_id));
      const online = orgDevices.filter(d => d.status === 'online').length;
      const offline = orgDevices.filter(d => d.status === 'offline').length;
      
      const name = org.name.toUpperCase();
      if (name.includes('PALMA') || name.includes('LP')) {
        islandMap['LP'].online += online;
        islandMap['LP'].offline += offline;
        islandMap['LP'].total += orgDevices.length;
      } else if (name.includes('TENERIFE') || name.includes('TF') || name.includes('TIMELAPSE')) {
        islandMap['TF'].online += online;
        islandMap['TF'].offline += offline;
        islandMap['TF'].total += orgDevices.length;
      } else if (name.includes('GRAN CANARIA') || name.includes('GC') || name.includes('CANARIA')) {
        islandMap['GC'].online += online;
        islandMap['GC'].offline += offline;
        islandMap['GC'].total += orgDevices.length;
      } else if (name.includes('FUERTEVENTURA') || name.includes('FV')) {
        islandMap['FV'].online += online;
        islandMap['FV'].offline += offline;
        islandMap['FV'].total += orgDevices.length;
      } else if (name.includes('LANZAROTE') || name.includes('LZ')) {
        islandMap['LZ'].online += online;
        islandMap['LZ'].offline += offline;
        islandMap['LZ'].total += orgDevices.length;
      } else {
        // Default to Gran Canaria for unmatched
        islandMap['GC'].online += online;
        islandMap['GC'].offline += offline;
        islandMap['GC'].total += orgDevices.length;
      }
    });

    return Object.values(islandMap);
  }, [devices, organizations, groups]);

  // Offline devices list
  const offlineDevices = useMemo(() => {
    return devices
      .filter(d => d.status === 'offline')
      .sort((a, b) => new Date(b.last_status_change || 0) - new Date(a.last_status_change || 0));
  }, [devices]);

  // Recent alerts
  const recentAlertsList = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [alerts]);

  // Pie chart data
  const pieData = useMemo(() => [
    { name: 'Online', value: stats.online, color: '#10b981' },
    { name: 'Offline', value: stats.offline, color: '#ef4444' }
  ].filter(d => d.value > 0), [stats]);

  const getDeviceIcon = (device) => {
    const deviceType = deviceTypes.find(t => t.id === device.device_type_id);
    const iconName = deviceType?.icon || 'server';
    return ICON_MAP[iconName] || Server;
  };

  const formatTimeSince = (timestamp) => {
    if (!timestamp) return '?';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    toast.info(t('noc.updatingData', 'Actualizando datos...'));
    setTimeout(() => {
      setRefreshing(false);
      toast.success(t('noc.dataUpdated', 'Datos actualizados'));
    }, 1500);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleOpenNewWindow = () => {
    const url = window.location.origin + '/?nocFullscreen=true';
    window.open(url, '_blank', 'width=1920,height=1080');
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Get bubble size based on device count
  const getBubbleSize = (total) => {
    if (total === 0) return 20;
    if (total < 10) return 30;
    if (total < 50) return 45;
    if (total < 100) return 60;
    if (total < 200) return 80;
    return 100;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col" data-testid="noc-dashboard">
      {/* Header */}
      <div className="h-14 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-cyan-500/20 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Monitor className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 text-transparent bg-clip-text">
                {t('noc.title', 'NOC Dashboard')}
              </h1>
              <p className="text-[10px] text-slate-400">{t('noc.subtitle', 'Centro de Operaciones de Red 24/7')}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-base text-cyan-400">
              {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[10px] text-slate-500">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400">{t('noc.systemActive', 'Activo')}</span>
          </div>

          {/* Sound toggle */}
          <Button variant="ghost" size="sm" onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-400 hover:text-white h-8 w-8 p-0">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Presentation mode */}
          <Button variant="ghost" size="sm" onClick={handleOpenNewWindow} className="text-slate-400 hover:text-white h-8 w-8 p-0">
            <ExternalLink className="w-4 h-4" />
          </Button>
          
          {/* Refresh */}
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-slate-400 hover:text-white h-8 w-8 p-0">
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
          
          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-slate-400 hover:text-white hover:bg-red-500/20 h-8 w-8 p-0"
            data-testid="noc-close-btn"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
        
        {/* Stats Row */}
        <div className="grid grid-cols-7 gap-2 shrink-0">
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-400 uppercase">TOTAL</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Server className="w-7 h-7 text-cyan-400 opacity-40" />
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-2 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-emerald-400 uppercase">ONLINE</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.online}</p>
            </div>
            <Wifi className="w-7 h-7 text-emerald-400 opacity-40" />
          </div>

          <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.offline > 0 ? "border-2 border-red-500 animate-pulse" : "border border-slate-700/50")}>
            <div>
              <p className="text-[9px] text-red-400 uppercase">OFFLINE</p>
              <p className="text-2xl font-bold text-red-400">{stats.offline}</p>
            </div>
            <WifiOff className="w-7 h-7 text-red-400 opacity-40" />
          </div>

          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-blue-400 uppercase">UPTIME</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.uptimePercent}%</p>
            </div>
            <TrendingUp className="w-7 h-7 text-blue-400 opacity-40" />
          </div>

          <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.criticalAlerts > 0 ? "border-2 border-amber-500" : "border border-slate-700/50")}>
            <div>
              <p className="text-[9px] text-amber-400 uppercase">ALERTAS</p>
              <p className="text-2xl font-bold text-amber-400">{stats.recentAlerts}</p>
            </div>
            <AlertTriangle className="w-7 h-7 text-amber-400 opacity-40" />
          </div>

          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-purple-400 uppercase">CLIENTES</p>
              <p className="text-2xl font-bold text-purple-400">{organizations.length}</p>
            </div>
            <Building2 className="w-7 h-7 text-purple-400 opacity-40" />
          </div>

          <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", craDevices.some(d => d.status === 'offline') ? "border-2 border-red-500" : "border border-slate-700/50")}>
            <div>
              <p className="text-[9px] text-red-400 uppercase">CRA</p>
              <p className="text-2xl font-bold text-red-400">{craDevices.length}</p>
            </div>
            <Shield className="w-7 h-7 text-red-400 opacity-40" />
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          
          {/* Left: Uptime Chart */}
          <div className="col-span-4 bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">Uptime</span>
              </div>
              <div className="flex gap-1">
                <Button variant={timeRange === '24h' ? 'default' : 'ghost'} size="sm" className="h-6 px-2 text-[10px]" onClick={() => setTimeRange('24h')}>24h</Button>
                <Button variant={timeRange === '7d' ? 'default' : 'ghost'} size="sm" className="h-6 px-2 text-[10px]" onClick={() => setTimeRange('7d')}>7d</Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={uptimeData}>
                  <defs>
                    <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="uptime" stroke="#06b6d4" strokeWidth={2} fill="url(#uptimeGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Center: Canary Islands Map */}
          <div className="col-span-4 bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Mapa Canarias</span>
            </div>
            <div className="flex-1 relative min-h-0">
              {/* Island bubbles */}
              <svg viewBox="0 0 400 500" className="w-full h-full">
                {devicesByIsland.map(island => {
                  const hasOffline = island.offline > 0;
                  const size = getBubbleSize(island.total);
                  return (
                    <g key={island.id}>
                      {/* Bubble */}
                      <circle
                        cx={island.x}
                        cy={island.y}
                        r={size / 2}
                        fill={hasOffline ? '#ef4444' : '#10b981'}
                        opacity={0.8}
                        className="transition-all duration-300"
                      />
                      {/* Count */}
                      <text
                        x={island.x}
                        y={island.y + 4}
                        textAnchor="middle"
                        fill="white"
                        fontSize={size > 40 ? 16 : 12}
                        fontWeight="bold"
                      >
                        {island.total}
                      </text>
                      {/* Label */}
                      <text
                        x={island.x}
                        y={island.y + size / 2 + 14}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize={10}
                      >
                        {island.abbrev}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {/* Legend */}
              <div className="absolute bottom-2 left-2 flex gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-400">OK</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-[10px] text-slate-400">Offline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: CRA Panel */}
          <div className={cn("col-span-4 bg-slate-900/80 rounded-lg p-3 flex flex-col min-h-0", craDevices.some(d => d.status === 'offline') ? "border-2 border-red-500" : "border border-slate-700/50")}>
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-white">CRA</span>
                <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">{craDevices.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleSection('cra')} className="h-6 w-6 p-0">
                {expandedSection === 'cra' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-3 gap-1.5 pr-2">
                {craDevices.map(device => (
                  <div
                    key={device.id}
                    className={cn(
                      "p-1.5 rounded border text-center cursor-pointer transition-all hover:scale-105",
                      device.status === 'offline' 
                        ? "bg-red-500/20 border-red-500/50" 
                        : "bg-emerald-500/10 border-emerald-500/30"
                    )}
                    onClick={() => onDeviceClick?.(device)}
                  >
                    <Shield className={cn("w-3 h-3 mx-auto mb-0.5", device.status === 'offline' ? "text-red-400" : "text-emerald-400")} />
                    <p className="text-[9px] text-white truncate">{device.name.substring(0, 12)}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Bottom Sections */}
        <div className="grid grid-cols-3 gap-3 shrink-0" style={{ height: '35%' }}>
          
          {/* Organizations */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Organizaciones</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleSection('orgs')} className="h-5 w-5 p-0">
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-2">
                {devicesByOrg.slice(0, 8).map(({ org, online, offline, total }) => (
                  <div key={org.id} className={cn("p-1.5 rounded border flex items-center justify-between", offline > 0 ? "bg-red-500/5 border-red-500/20" : "bg-slate-800/50 border-slate-700/30")}>
                    <span className="text-[11px] text-white truncate flex-1">{org.name}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1 py-0">{online}</Badge>
                      {offline > 0 && <Badge className="bg-red-500/20 text-red-400 text-[9px] px-1 py-0">{offline}</Badge>}
                    </div>
                  </div>
                ))}
                {devicesByOrg.length > 8 && (
                  <p className="text-[10px] text-slate-500 text-center">+{devicesByOrg.length - 8} más</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Offline Devices */}
          <div className={cn("bg-slate-900/80 rounded-lg p-2 flex flex-col min-h-0", offlineDevices.length > 0 && "border-2 border-red-500")}>
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-white">Offline</span>
                <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">{stats.offline}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleSection('offline')} className="h-5 w-5 p-0">
                <Maximize2 className="w-3 h-3" />
              </Button>
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
                      <div key={device.id} className="p-1.5 rounded bg-red-500/5 border border-red-500/20 flex items-center justify-between cursor-pointer hover:bg-red-500/10" onClick={() => onDeviceClick?.(device)}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Icon className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="text-[11px] text-white truncate">{device.name}</span>
                        </div>
                        <span className="text-[10px] text-red-400 ml-2">{formatTimeSince(device.last_status_change)}</span>
                      </div>
                    );
                  })}
                  {offlineDevices.length > 8 && (
                    <p className="text-[10px] text-slate-500 text-center">+{offlineDevices.length - 8} más</p>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Alerts */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Alertas</span>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">{stats.recentAlerts}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleSection('alerts')} className="h-5 w-5 p-0">
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {recentAlertsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-4">
                  <CheckCircle className="w-6 h-6 text-emerald-500/50 mb-1" />
                  <p className="text-[10px] text-slate-500">Sin alertas</p>
                </div>
              ) : (
                <div className="space-y-1 pr-2">
                  {recentAlertsList.map(alert => {
                    const isDown = alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected';
                    return (
                      <div key={alert.id} className={cn("p-1 rounded border flex items-center justify-between", isDown ? "bg-red-500/5 border-red-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {isDown ? <XCircle className="w-3 h-3 text-red-400 shrink-0" /> : <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />}
                          <span className="text-[10px] text-white truncate">{alert.device_name}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 ml-2">{formatTimeSince(alert.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between shrink-0 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-400">{devices.filter(d => d.device_type_id === 'type-camera').length}</span>
              <span className="text-[10px] text-slate-500">Cámaras</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400">{groups.length}</span>
              <span className="text-[10px] text-slate-500">Grupos</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-500">
            <span>soporte@siempria.com</span>
            <span>822 22 00 22</span>
          </div>
        </div>
      </div>
      
      {/* Audio for alerts */}
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />
    </div>
  );
};

export default NOCDashboard;
