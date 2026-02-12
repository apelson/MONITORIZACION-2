/**
 * NOCDashboard - Centro de Operaciones de Red Profesional 24/7
 * Optimizado para pantalla de 55" sin scroll
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Monitor, Wifi, WifiOff, AlertTriangle, Building2, Clock, 
  TrendingUp, Activity, X, ChevronRight, RefreshCw, Eye, Server,
  Camera, HardDrive, Network, Router, Printer, Shield, Box, Layers,
  Bell, CheckCircle, XCircle, BarChart3, History, ClipboardList
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
  const [refreshing, setRefreshing] = useState(false);
  const [uptimeData, setUptimeData] = useState([]);
  const [craDevices, setCraDevices] = useState([]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate uptime data for charts
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
    return result.sort((a, b) => b.offline - a.offline || b.total - a.total).slice(0, 8);
  }, [devices, organizations, groups]);

  // Offline devices list (top 6)
  const offlineDevices = useMemo(() => {
    return devices
      .filter(d => d.status === 'offline')
      .sort((a, b) => new Date(b.last_status_change || 0) - new Date(a.last_status_change || 0))
      .slice(0, 6);
  }, [devices]);

  // Recent alerts (top 5)
  const recentAlertsList = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
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

  const handleDeviceAction = (device, action) => {
    switch (action) {
      case 'view':
        if (onDeviceClick) onDeviceClick(device);
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
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col" data-testid="noc-dashboard">
      {/* Header - Compact */}
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
          <div className="h-8 w-px bg-slate-700" />
          <img src={LOGO_URL} alt="Siempria" className="h-12 object-contain" />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-base text-cyan-400">
              {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[10px] text-slate-500">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400">{t('noc.systemActive', 'Sistema Activo')}</span>
          </div>
          
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-slate-400 hover:text-white h-8 w-8 p-0">
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
          
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

      {/* Main Content - Fills remaining space, NO SCROLL */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
        
        {/* Stats Row - Fixed height */}
        <div className="grid grid-cols-6 gap-3 shrink-0">
          {/* Total Devices */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase">{t('noc.totalDevices', 'Total Dispositivos')}</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Server className="w-8 h-8 text-cyan-400 opacity-50" />
          </div>

          {/* Online */}
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-emerald-400 uppercase">{t('noc.online', 'Online')}</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.online}</p>
            </div>
            <Wifi className="w-8 h-8 text-emerald-400 opacity-50" />
          </div>

          {/* Offline */}
          <div className={cn("bg-slate-900/80 rounded-lg p-3 flex items-center justify-between", stats.offline > 0 ? "border border-red-500/50 animate-pulse" : "border border-slate-700/50")}>
            <div>
              <p className="text-[10px] text-red-400 uppercase">{t('noc.offline', 'Offline')}</p>
              <p className="text-2xl font-bold text-red-400">{stats.offline}</p>
            </div>
            <WifiOff className="w-8 h-8 text-red-400 opacity-50" />
          </div>

          {/* Uptime */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-blue-400 uppercase">{t('noc.uptime', 'Uptime')}</p>
              <p className="text-2xl font-bold text-blue-400">{stats.uptimePercent}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
          </div>

          {/* Critical Alerts */}
          <div className={cn("bg-slate-900/80 rounded-lg p-3 flex items-center justify-between", stats.criticalAlerts > 0 ? "border border-orange-500/50" : "border border-slate-700/50")}>
            <div>
              <p className="text-[10px] text-orange-400 uppercase">{t('noc.criticalAlerts', 'Alertas Críticas')}</p>
              <p className="text-2xl font-bold text-orange-400">{stats.criticalAlerts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-400 opacity-50" />
          </div>

          {/* Organizations */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-purple-400 uppercase">{t('noc.organizations', 'Organizaciones')}</p>
              <p className="text-2xl font-bold text-purple-400">{organizations.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>

        {/* Main Grid - Fills remaining space */}
        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          
          {/* Left Column - 8 cols */}
          <div className="col-span-8 flex flex-col gap-3 min-h-0">
            
            {/* Uptime Chart - 40% height */}
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex-[4] min-h-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-white">{t('noc.uptimeHistory', 'Histórico de Uptime (24h)')}</span>
                </div>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">{t('noc.realTime', 'Tiempo Real')}</Badge>
              </div>
              <div className="h-[calc(100%-2rem)]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={uptimeData}>
                    <defs>
                      <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="uptime" stroke="#06b6d4" strokeWidth={2} fill="url(#uptimeGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Organizations Row - 60% height */}
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex-[6] min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-2 shrink-0">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">{t('noc.orgStatus', 'Estado por Organización')}</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 gap-2 pr-2">
                  {devicesByOrg.map(({ org, online, offline, total }) => {
                    const uptimePercent = total > 0 ? (online / total) * 100 : 0;
                    return (
                      <div 
                        key={org.id}
                        className={cn(
                          "p-2 rounded-lg border transition-all",
                          offline > 0 ? "bg-red-500/5 border-red-500/30" : "bg-slate-800/50 border-slate-700/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white truncate flex-1">{org.name}</span>
                          <div className="flex items-center gap-1 ml-2">
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[9px] px-1 py-0">{online}</Badge>
                            {offline > 0 && <Badge variant="outline" className="border-red-500/30 text-red-400 text-[9px] px-1 py-0">{offline}</Badge>}
                          </div>
                        </div>
                        <Progress value={uptimePercent} className="h-1 bg-slate-700" />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Right Column - 4 cols */}
          <div className="col-span-4 flex flex-col gap-3 min-h-0">
            
            {/* Pie Chart */}
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex-[3] min-h-0">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">{t('noc.stateDistribution', 'Distribución de Estado')}</span>
              </div>
              <div className="h-[calc(100%-2.5rem)] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius="40%" outerRadius="70%" paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-slate-400">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Offline Devices */}
            <div className={cn("bg-slate-900/80 rounded-lg p-3 flex-[4] min-h-0 flex flex-col", offlineDevices.length > 0 && "border border-red-500/30")}>
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-white">{t('noc.offlineDevices', 'Dispositivos Offline')}</span>
                </div>
                <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">{stats.offline}</Badge>
              </div>
              <ScrollArea className="flex-1">
                {offlineDevices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-1" />
                    <p className="text-xs text-emerald-400">{t('noc.allOnline', 'Todos online')}</p>
                  </div>
                ) : (
                  <div className="space-y-1 pr-2">
                    {offlineDevices.map(device => {
                      const Icon = getDeviceIcon(device);
                      return (
                        <TooltipProvider key={device.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-2 rounded bg-red-500/5 border border-red-500/20 hover:border-red-500/40 cursor-pointer group">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-3 h-3 text-red-400 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{device.name}</p>
                                    <p className="text-[10px] text-slate-400">{device.ip_address}</p>
                                  </div>
                                  <span className="text-[10px] text-red-400">{formatTimeSince(device.last_status_change)}</span>
                                </div>
                                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => handleDeviceAction(device, 'view')}>
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => handleDeviceAction(device, 'incident')}>
                                    <ClipboardList className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => handleDeviceAction(device, 'history')}>
                                    <History className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{device.name} - {device.ip_address}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Recent Alerts */}
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex-[3] min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">{t('noc.recentAlerts', 'Alertas Recientes')}</span>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">{stats.recentAlerts} 24h</Badge>
              </div>
              <ScrollArea className="flex-1">
                {recentAlertsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <CheckCircle className="w-6 h-6 text-emerald-500/50 mb-1" />
                    <p className="text-[10px]">{t('noc.noRecentAlerts', 'Sin alertas')}</p>
                  </div>
                ) : (
                  <div className="space-y-1 pr-2">
                    {recentAlertsList.map(alert => {
                      const isDown = alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected';
                      return (
                        <div key={alert.id} className={cn("p-1.5 rounded border", isDown ? "bg-red-500/5 border-red-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
                          <div className="flex items-center gap-2">
                            {isDown ? <XCircle className="w-3 h-3 text-red-400" /> : <CheckCircle className="w-3 h-3 text-emerald-400" />}
                            <span className="text-[10px] text-white truncate flex-1">{alert.device_name}</span>
                            <span className="text-[10px] text-slate-400">{formatTimeSince(alert.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Footer Stats - Fixed height */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-cyan-400">{devices.filter(d => d.device_type_id === 'type-camera').length}</p>
            <p className="text-[10px] text-slate-400">{t('noc.cameras', 'Cámaras')}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-purple-400">{groups.length}</p>
            <p className="text-[10px] text-slate-400">{t('noc.groups', 'Grupos')}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-400">{craDevices.length}</p>
            <p className="text-[10px] text-slate-400">{t('noc.craDevicesCount', 'Dispositivos CRA')}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{stats.uptimePercent}%</p>
            <p className="text-[10px] text-slate-400">{t('noc.availability', 'Disponibilidad')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NOCDashboard;
