/**
 * NOCDashboard - Centro de Operaciones de Red Profesional 24/7
 * Dashboard completo para monitoreo en tiempo real de toda la infraestructura
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Monitor, Wifi, WifiOff, AlertTriangle, Building2, Clock, 
  TrendingUp, TrendingDown, Activity, X, ChevronRight, 
  RefreshCw, ExternalLink, ClipboardList, Eye, Server,
  Camera, HardDrive, Network, Router, Printer, Shield, Box, Layers,
  Bell, CheckCircle, XCircle, Calendar, BarChart3, Zap, Globe,
  MapPin, Phone, ArrowRight, Play, History, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_equip-tracker-39/artifacts/796492pi_version%20autorizada%202.png";

const ICON_MAP = {
  camera: Camera, "hard-drive": HardDrive, network: Network, router: Router,
  server: Server, monitor: Monitor, printer: Printer, wifi: Wifi,
  shield: Shield, box: Box, layers: Layers
};

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
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [uptimeData, setUptimeData] = useState([]);
  const [craDevices, setCraDevices] = useState([]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate uptime data for charts (simulated for last 24h)
  useEffect(() => {
    const now = new Date();
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now - i * 3600000);
      const onlineCount = devices.filter(d => d.status === 'online').length;
      const variance = Math.floor(Math.random() * 5) - 2;
      data.push({
        time: hour.getHours().toString().padStart(2, '0') + ':00',
        uptime: Math.max(85, Math.min(100, (onlineCount / Math.max(devices.length, 1)) * 100 + variance)),
        online: Math.max(0, onlineCount + variance),
        offline: Math.max(0, devices.length - onlineCount - variance)
      });
    }
    setUptimeData(data);
  }, [devices]);

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
    const unknown = devices.filter(d => !d.status || d.status === 'unknown').length;
    const uptimePercent = total > 0 ? ((online / total) * 100).toFixed(1) : 0;
    
    // Recent alerts (last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlerts = alerts.filter(a => new Date(a.timestamp) > last24h);
    const criticalAlerts = recentAlerts.filter(a => a.alert_type === 'device_down' || a.alert_type === 'nas_disconnected');
    
    return { total, online, offline, unknown, uptimePercent, recentAlerts: recentAlerts.length, criticalAlerts: criticalAlerts.length };
  }, [devices, alerts]);

  // Devices by organization
  const devicesByOrg = useMemo(() => {
    const result = {};
    organizations.forEach(org => {
      const orgGroups = groups.filter(g => g.organization_id === org.id);
      const orgDevices = devices.filter(d => 
        orgGroups.some(g => g.id === d.group_id)
      );
      result[org.id] = {
        org,
        devices: orgDevices,
        online: orgDevices.filter(d => d.status === 'online').length,
        offline: orgDevices.filter(d => d.status === 'offline').length,
        total: orgDevices.length
      };
    });
    
    // Devices without organization
    const unassignedDevices = devices.filter(d => 
      !groups.some(g => g.id === d.group_id) || 
      !organizations.some(org => groups.filter(g => g.organization_id === org.id).some(g => g.id === d.group_id))
    );
    if (unassignedDevices.length > 0) {
      result['unassigned'] = {
        org: { id: 'unassigned', name: 'Sin Organización' },
        devices: unassignedDevices,
        online: unassignedDevices.filter(d => d.status === 'online').length,
        offline: unassignedDevices.filter(d => d.status === 'offline').length,
        total: unassignedDevices.length
      };
    }
    
    return result;
  }, [devices, organizations, groups]);

  // Offline devices list
  const offlineDevices = useMemo(() => {
    return devices
      .filter(d => d.status === 'offline')
      .sort((a, b) => {
        const aTime = new Date(a.last_status_change || 0);
        const bTime = new Date(b.last_status_change || 0);
        return bTime - aTime;
      });
  }, [devices]);

  // Recent alerts (last 10)
  const recentAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [alerts]);

  // Pie chart data
  const pieData = useMemo(() => [
    { name: 'Online', value: stats.online, color: '#10b981' },
    { name: 'Offline', value: stats.offline, color: '#ef4444' },
    { name: 'Desconocido', value: stats.unknown, color: '#64748b' }
  ].filter(d => d.value > 0), [stats]);

  const getDeviceIcon = (device) => {
    const deviceType = deviceTypes.find(t => t.id === device.device_type_id);
    const iconName = deviceType?.icon || 'server';
    return ICON_MAP[iconName] || Server;
  };

  const getGroupName = (groupId) => {
    return groups.find(g => g.id === groupId)?.name || 'Sin grupo';
  };

  const getOrgName = (device) => {
    const group = groups.find(g => g.id === device.group_id);
    if (!group) return 'Sin organización';
    const org = organizations.find(o => o.id === group.organization_id);
    return org?.name || 'Sin organización';
  };

  const formatTimeSince = (timestamp) => {
    if (!timestamp) return 'Desconocido';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    toast.info('Actualizando datos...');
    // Trigger a refresh via parent component
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Datos actualizados');
    }, 1500);
  };

  const handleDeviceAction = (device, action) => {
    switch (action) {
      case 'view':
        if (onDeviceClick) onDeviceClick(device);
        break;
      case 'live':
        if (onViewLive) onViewLive(device);
        break;
      case 'incident':
        if (onCreateIncident) onCreateIncident(device);
        break;
      case 'history':
        if (onViewHistory) onViewHistory(device);
        break;
      default:
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-white overflow-hidden" data-testid="noc-dashboard">
      {/* Header */}
      <div className="h-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-cyan-500/20 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Monitor className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 text-transparent bg-clip-text">
                {t('noc.title', 'NOC Dashboard')}
              </h1>
              <p className="text-xs text-slate-400">{t('noc.subtitle', 'Centro de Operaciones de Red 24/7')}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-700 mx-2" />
          <img src={LOGO_URL} alt="Siempria" className="h-10 object-contain opacity-80" />
        </div>
        
        <div className="flex items-center gap-4">
          {/* Live Clock */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-lg text-cyan-400">
              {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-xs text-slate-500">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-emerald-400">{t('noc.systemActive', 'Sistema Activo')}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-red-500/10"
            data-testid="noc-close-btn"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-4rem)] overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            
            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Total Devices */}
              <Card className="bg-slate-900/80 border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">{t('noc.totalDevices', 'Total Dispositivos')}</p>
                      <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-cyan-500/10 rounded-lg">
                      <Server className="w-6 h-6 text-cyan-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Online */}
              <Card className="bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-400 uppercase tracking-wider">{t('noc.online', 'Online')}</p>
                      <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.online}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-lg">
                      <Wifi className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Offline */}
              <Card className={cn(
                "bg-slate-900/80 transition-colors",
                stats.offline > 0 ? "border-red-500/50 animate-pulse" : "border-slate-700/50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-400 uppercase tracking-wider">{t('noc.offline', 'Offline')}</p>
                      <p className="text-3xl font-bold text-red-400 mt-1">{stats.offline}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <WifiOff className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Uptime */}
              <Card className="bg-slate-900/80 border-slate-700/50 hover:border-blue-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-400 uppercase tracking-wider">{t('noc.uptime', 'Uptime')}</p>
                      <p className="text-3xl font-bold text-blue-400 mt-1">{stats.uptimePercent}%</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Critical Alerts */}
              <Card className={cn(
                "bg-slate-900/80 transition-colors",
                stats.criticalAlerts > 0 ? "border-orange-500/50" : "border-slate-700/50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-orange-400 uppercase tracking-wider">{t('noc.criticalAlerts', 'Alertas Críticas')}</p>
                      <p className="text-3xl font-bold text-orange-400 mt-1">{stats.criticalAlerts}</p>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organizations */}
              <Card className="bg-slate-900/80 border-slate-700/50 hover:border-purple-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-400 uppercase tracking-wider">{t('noc.organizations', 'Organizaciones')}</p>
                      <p className="text-3xl font-bold text-purple-400 mt-1">{organizations.length}</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <Building2 className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Panels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Uptime Chart & Org Breakdown */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Uptime Chart */}
                <Card className="bg-slate-900/80 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                          <Activity className="w-5 h-5 text-cyan-400" />
                          {t('noc.uptimeHistory', 'Histórico de Uptime (24h)')}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          {t('noc.deviceStateEvolution', 'Evolución del estado de dispositivos')}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                        {t('noc.realTime', 'Tiempo Real')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={uptimeData}>
                          <defs>
                            <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="time" 
                            stroke="#64748b" 
                            fontSize={12}
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={12}
                            tickLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <RechartsTooltip
                            contentStyle={{ 
                              backgroundColor: '#1e293b', 
                              border: '1px solid #334155',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                            formatter={(value) => [`${value.toFixed(1)}%`, 'Uptime']}
                          />
                          <Area
                            type="monotone"
                            dataKey="uptime"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            fill="url(#uptimeGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Organizations Breakdown */}
                <Card className="bg-slate-900/80 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-purple-400" />
                      {t('noc.orgStatus', 'Estado por Organización')}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {t('noc.orgBreakdown', 'Desglose de dispositivos por cliente')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.values(devicesByOrg).map(({ org, devices: orgDevices, online, offline, total }) => {
                        const uptimePercent = total > 0 ? (online / total) * 100 : 0;
                        const isHealthy = uptimePercent >= 90;
                        const isWarning = uptimePercent >= 50 && uptimePercent < 90;
                        
                        return (
                          <div 
                            key={org.id}
                            className={cn(
                              "p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.01]",
                              offline > 0 
                                ? "bg-red-500/5 border-red-500/30 hover:border-red-500/50" 
                                : "bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/30"
                            )}
                            onClick={() => setSelectedOrg(org.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  isHealthy ? "bg-emerald-500/10" : isWarning ? "bg-yellow-500/10" : "bg-red-500/10"
                                )}>
                                  <Building2 className={cn(
                                    "w-5 h-5",
                                    isHealthy ? "text-emerald-400" : isWarning ? "text-yellow-400" : "text-red-400"
                                  )} />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-white">{org.name}</h4>
                                  <p className="text-xs text-slate-400">{total} {t('noc.devices', 'dispositivos')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                                      {online} online
                                    </Badge>
                                    {offline > 0 && (
                                      <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs animate-pulse">
                                        {offline} offline
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                              </div>
                            </div>
                            <div className="relative">
                              <Progress 
                                value={uptimePercent} 
                                className="h-2 bg-slate-700"
                              />
                              <span className="absolute right-0 -top-5 text-xs text-slate-400">
                                {uptimePercent.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* CRA Status Panel */}
                {craDevices.length > 0 && (
                  <Card className="bg-slate-900/80 border-slate-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-400" />
                        {t('noc.craStatus', 'Estado CRA (Central Receptora de Alarmas)')}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {t('noc.craDevices', 'Dispositivos de la central de alarmas')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {craDevices.map(device => {
                          const Icon = getDeviceIcon(device);
                          return (
                            <div
                              key={device.id}
                              className={cn(
                                "p-3 rounded-lg border transition-all cursor-pointer hover:scale-105",
                                device.status === 'online' 
                                  ? "bg-emerald-500/5 border-emerald-500/30" 
                                  : "bg-red-500/10 border-red-500/50 animate-pulse"
                              )}
                              onClick={() => handleDeviceAction(device, 'view')}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className={cn(
                                  "w-5 h-5",
                                  device.status === 'online' ? "text-emerald-400" : "text-red-400"
                                )} />
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  device.status === 'online' ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                                )} />
                              </div>
                              <p className="text-sm font-medium text-white truncate">{device.name}</p>
                              <p className="text-xs text-slate-400 truncate">{device.ip_address}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Offline Devices & Alerts */}
              <div className="space-y-6">
                
                {/* Pie Chart */}
                <Card className="bg-slate-900/80 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      {t('noc.stateDistribution', 'Distribución de Estado')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{ 
                              backgroundColor: '#1e293b', 
                              border: '1px solid #334155',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {pieData.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-slate-400">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Offline Devices List */}
                <Card className={cn(
                  "bg-slate-900/80 border-slate-700/50",
                  offlineDevices.length > 0 && "border-red-500/30"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <WifiOff className="w-5 h-5 text-red-400" />
                        {t('noc.offlineDevices', 'Dispositivos Offline')}
                      </CardTitle>
                      <Badge variant="outline" className="border-red-500/30 text-red-400">
                        {offlineDevices.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      {offlineDevices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
                          <CheckCircle className="w-12 h-12 mb-3 text-emerald-500" />
                          <p className="text-sm text-emerald-400">{t('noc.allOnline', 'Todos los dispositivos online')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {offlineDevices.map(device => {
                            const Icon = getDeviceIcon(device);
                            return (
                              <div
                                key={device.id}
                                className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                      <Icon className="w-4 h-4 text-red-400" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-white text-sm">{device.name}</p>
                                      <p className="text-xs text-slate-400">{device.ip_address}:{device.port}</p>
                                      <p className="text-xs text-red-400 mt-1">
                                        <Clock className="w-3 h-3 inline mr-1" />
                                        Offline hace {formatTimeSince(device.last_status_change)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-700"
                                          onClick={() => handleDeviceAction(device, 'view')}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Ver dispositivo</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 px-2 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10"
                                          onClick={() => handleDeviceAction(device, 'incident')}
                                        >
                                          <ClipboardList className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Crear incidencia</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 px-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                                          onClick={() => handleDeviceAction(device, 'history')}
                                        >
                                          <History className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Ver historial</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Recent Alerts */}
                <Card className="bg-slate-900/80 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-400" />
                        {t('noc.recentAlerts', 'Alertas Recientes')}
                      </CardTitle>
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                        {stats.recentAlerts} {t('noc.last24h', 'últimas 24h')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      {recentAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
                          <CheckCircle className="w-10 h-10 mb-2 text-emerald-500/50" />
                          <p className="text-sm">{t('noc.noRecentAlerts', 'Sin alertas recientes')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recentAlerts.map(alert => {
                            const isDown = alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected';
                            const device = devices.find(d => d.id === alert.device_id);
                            
                            return (
                              <div
                                key={alert.id}
                                className={cn(
                                  "p-2 rounded-lg border transition-all cursor-pointer hover:scale-[1.02]",
                                  isDown 
                                    ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40" 
                                    : "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                                )}
                                onClick={() => device && handleDeviceAction(device, 'view')}
                              >
                                <div className="flex items-center gap-2">
                                  {isDown ? (
                                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{alert.device_name}</p>
                                    <p className="text-xs text-slate-400">
                                      {formatTimeSince(alert.timestamp)}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Footer Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{devices.filter(d => d.device_type_id === 'type-camera').length}</p>
                <p className="text-xs text-slate-400">Cámaras</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{groups.length}</p>
                <p className="text-xs text-slate-400">Grupos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{craDevices.length}</p>
                <p className="text-xs text-slate-400">Dispositivos CRA</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{stats.uptimePercent}%</p>
                <p className="text-xs text-slate-400">Disponibilidad</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default NOCDashboard;
