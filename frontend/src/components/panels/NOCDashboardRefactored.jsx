/**
 * NOCDashboardRefactored - Centro de Operaciones de Red Profesional 24/7
 * Versión refactorizada con componentes modulares y drag & drop real
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { X, Wifi, WifiOff, AlertTriangle, Activity, Building2, Shield, Clock, Monitor, ChevronRight, Bell, History, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import modular components
import NOCHeader from '../noc/NOCHeader';
import DraggableGrid, { DEFAULT_LAYOUTS, WIDGET_CONFIG } from '../noc/DraggableGrid';
import StatsWidget from '../noc/widgets/StatsWidget';
import UptimeWidget from '../noc/widgets/UptimeWidget';
import SystemMonitorWidget from '../noc/widgets/SystemMonitorWidget';
import CRAWidget from '../noc/widgets/CRAWidget';
import OrganizationsWidget from '../noc/widgets/OrganizationsWidget';
import OfflineWidget from '../noc/widgets/OfflineWidget';
import HistoryWidget from '../noc/widgets/HistoryWidget';
import AlertsWidget from '../noc/widgets/AlertsWidget';
import SystemECG from '../common/SystemECG';

// Canary Islands map configuration
const CANARY_ISLANDS = [
  { id: 'LP', name: 'La Palma', x: 80, y: 340, abbrev: 'LP' },
  { id: 'TF', name: 'Tenerife', x: 140, y: 420, abbrev: 'TF' },
  { id: 'GC', name: 'Gran Canaria', x: 220, y: 360, abbrev: 'GC' },
  { id: 'FV', name: 'Fuerteventura', x: 310, y: 280, abbrev: 'FV' },
  { id: 'LZ', name: 'Lanzarote', x: 290, y: 200, abbrev: 'LZ' },
];

const NOCDashboardRefactored = ({ 
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
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Core state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [uptimeData, setUptimeData] = useState([]);
  const [craDevices, setCraDevices] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [recordTime, setRecordTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Presentation mode
  const [presentationMode, setPresentationMode] = useState(false);
  
  // Edit mode and layout
  const [editMode, setEditMode] = useState(false);
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [widgetVisibility, setWidgetVisibility] = useState({
    uptime: true,
    systemMonitor: true,
    cra: true,
    organizations: true,
    offline: true,
    history: true,
    alerts: true
  });
  
  // Filters
  const [filters, setFilters] = useState({
    organizationId: 'all',
    groupId: 'all'
  });
  
  // Audio and preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const audioRef = useRef(null);

  // Load record time from backend
  useEffect(() => {
    const loadRecordTime = async () => {
      try {
        const response = await authAxios?.get('/settings/uptime-record');
        if (response?.data?.record) {
          setRecordTime(response.data.record);
        }
      } catch (err) {
        // If no record exists yet, use default
        console.log('No uptime record found, using default');
      }
    };
    loadRecordTime();
  }, [authAxios]);

  // ==================== COMPUTED VALUES ====================
  
  // Filter devices based on current filters
  const filteredDevices = useMemo(() => {
    let result = devices;
    
    if (filters.organizationId !== 'all') {
      const orgGroups = groups.filter(g => g.organization_id === filters.organizationId);
      const orgGroupIds = orgGroups.map(g => g.id);
      result = result.filter(d => orgGroupIds.includes(d.group_id));
    }
    
    if (filters.groupId !== 'all') {
      result = result.filter(d => d.group_id === filters.groupId);
    }
    
    return result;
  }, [devices, groups, filters]);

  // Calculate stats from filtered devices
  const stats = useMemo(() => {
    const online = filteredDevices.filter(d => d.status === 'online').length;
    const offline = filteredDevices.filter(d => d.status === 'offline').length;
    const total = filteredDevices.length;
    const uptimePercent = total > 0 ? ((online / total) * 100).toFixed(1) : 100;
    
    // Calculate average latency
    const devicesWithLatency = filteredDevices.filter(d => d.response_time_ms);
    const avgLatency = devicesWithLatency.length > 0 
      ? Math.round(devicesWithLatency.reduce((acc, d) => acc + d.response_time_ms, 0) / devicesWithLatency.length)
      : null;

    // Count recent alerts (last 24h)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlerts = alerts.filter(a => new Date(a.timestamp) > dayAgo).length;
    const criticalAlerts = alerts.filter(a => 
      a.severity === 'critical' && new Date(a.timestamp) > dayAgo
    ).length;

    return { 
      total, online, offline, uptimePercent, avgLatency, 
      recentAlerts, criticalAlerts,
      lastIncidentTime: null // TODO: Calculate from history
    };
  }, [filteredDevices, alerts]);

  // Get offline devices
  const offlineDevices = useMemo(() => 
    filteredDevices.filter(d => d.status === 'offline'),
  [filteredDevices]);

  // Get devices by organization
  const devicesByOrg = useMemo(() => {
    const orgDeviceCounts = [];
    organizations.forEach(org => {
      const orgGroups = groups.filter(g => g.organization_id === org.id);
      const orgGroupIds = orgGroups.map(g => g.id);
      const orgDevices = filteredDevices.filter(d => orgGroupIds.includes(d.group_id));
      if (orgDevices.length > 0) {
        orgDeviceCounts.push({
          org,
          total: orgDevices.length,
          online: orgDevices.filter(d => d.status === 'online').length,
          offline: orgDevices.filter(d => d.status === 'offline').length
        });
      }
    });
    return orgDeviceCounts.sort((a, b) => b.offline - a.offline || b.total - a.total);
  }, [organizations, groups, filteredDevices]);

  // Calculate downtime history (last 7 days)
  const downtimeHistory = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const offlineAlerts = alerts.filter(a => 
      (a.alert_type === 'device_down' || a.alert_type === 'nas_disconnected') && 
      new Date(a.timestamp) > weekAgo
    );
    
    const deviceCounts = {};
    offlineAlerts.forEach(alert => {
      const name = alert.device_name || 'Unknown';
      deviceCounts[name] = (deviceCounts[name] || 0) + 1;
    });
    
    return Object.entries(deviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [alerts]);

  // Get recent alerts list
  const recentAlertsList = useMemo(() => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return alerts
      .filter(a => new Date(a.timestamp) > dayAgo)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
  }, [alerts]);

  // Map devices by island
  const devicesByIsland = useMemo(() => {
    return CANARY_ISLANDS.map(island => {
      const islandDevices = filteredDevices.filter(d => {
        const group = groups.find(g => g.id === d.group_id);
        return group?.island_id === island.id || group?.location?.includes(island.name);
      });
      return {
        ...island,
        total: islandDevices.length,
        online: islandDevices.filter(d => d.status === 'online').length,
        offline: islandDevices.filter(d => d.status === 'offline').length
      };
    }).filter(island => island.total > 0);
  }, [filteredDevices, groups]);

  // ==================== EFFECTS ====================

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load CRA devices
  useEffect(() => {
    const loadCRADevices = async () => {
      if (!authAxios) return;
      try {
        const res = await authAxios.get('/cra/devices');
        if (res.data?.devices) {
          // Sort: offline first, then by latency
          const sorted = res.data.devices.sort((a, b) => {
            if (a.status === 'offline' && b.status !== 'offline') return -1;
            if (a.status !== 'offline' && b.status === 'offline') return 1;
            return (b.response_time_ms || 0) - (a.response_time_ms || 0);
          });
          setCraDevices(sorted);
        }
      } catch (error) {
        // Fallback to filtering devices with CRA type
        const craType = deviceTypes.find(t => t.name?.toLowerCase().includes('cra'));
        if (craType) {
          const cra = devices
            .filter(d => d.device_type_id === craType.id)
            .sort((a, b) => {
              if (a.status === 'offline' && b.status !== 'offline') return -1;
              if (a.status !== 'offline' && b.status === 'offline') return 1;
              return (b.response_time_ms || 0) - (a.response_time_ms || 0);
            });
          setCraDevices(cra);
        }
      }
    };
    loadCRADevices();
  }, [authAxios, devices, deviceTypes]);

  // Load preferences from server
  useEffect(() => {
    const loadPreferences = async () => {
      if (!authAxios) return;
      try {
        const res = await authAxios.get('/auth/me');
        const userId = res.data?.user?.id;
        if (!userId) return;
        
        const prefsRes = await authAxios.get(`/users/${userId}/dashboard-preferences`);
        if (prefsRes.data) {
          if (prefsRes.data.layouts) {
            setLayouts(prefsRes.data.layouts);
          }
          if (prefsRes.data.widgets) {
            setWidgetVisibility(prev => ({ ...prev, ...prefsRes.data.widgets }));
          }
          if (prefsRes.data.filters) {
            setFilters(prefsRes.data.filters);
          }
        }
      } catch (error) {
        console.log('Using default dashboard layout');
      }
    };
    loadPreferences();
  }, [authAxios]);

  // Generate uptime data for chart
  useEffect(() => {
    const generateUptimeData = () => {
      const data = [];
      const hours = timeRange === '7d' ? 168 : 24;
      const now = new Date();
      
      for (let i = hours; i >= 0; i--) {
        const time = new Date(now - i * 60 * 60 * 1000);
        const baseUptime = 85 + Math.random() * 15;
        data.push({
          time: time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          uptime: Math.min(100, Math.max(80, baseUptime))
        });
      }
      setUptimeData(data);
    };
    generateUptimeData();
  }, [timeRange]);

  // ==================== HANDLERS ====================

  // Save preferences to server
  const savePreferences = useCallback(async () => {
    if (!authAxios) return;
    setSavingPrefs(true);
    try {
      const res = await authAxios.get('/auth/me');
      const userId = res.data?.user?.id;
      if (!userId) return;
      
      await authAxios.put(`/users/${userId}/dashboard-preferences`, {
        layouts,
        widgets: widgetVisibility,
        filters
      });
      toast.success('Layout guardado correctamente');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error al guardar el layout');
    } finally {
      setSavingPrefs(false);
    }
  }, [authAxios, layouts, widgetVisibility, filters]);

  // Toggle edit mode
  const handleToggleEditMode = useCallback(() => {
    if (editMode) {
      // Exiting edit mode - save preferences
      savePreferences();
    } else {
      toast.info('Modo edición activado - Arrastra los widgets para reorganizar');
    }
    setEditMode(!editMode);
  }, [editMode, savePreferences]);

  // Reset layout to defaults
  const handleResetLayout = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS);
    setWidgetVisibility({
      uptime: true,
      systemMonitor: true,
      cra: true,
      organizations: true,
      offline: true,
      history: true,
      alerts: true
    });
    toast.info('Layout restaurado a valores por defecto');
  }, []);

  // Handle layout change from grid
  const handleLayoutChange = useCallback((newLayouts) => {
    setLayouts(newLayouts);
  }, []);

  // Toggle widget visibility
  const handleToggleWidget = useCallback((widgetId) => {
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  }, []);

  // Refresh data
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
    toast.success('Datos actualizados');
  }, []);

  // Open in new window
  const handleOpenNewWindow = useCallback(() => {
    window.open(window.location.href + '?noc=fullscreen', '_blank', 'width=1920,height=1080');
  }, []);

  // Format time since
  const formatTimeSince = useCallback((timestamp) => {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }, []);

  // Get bubble size for map
  const getBubbleSize = useCallback((total) => {
    if (total <= 5) return 16;
    if (total <= 20) return 22;
    if (total <= 50) return 28;
    return 34;
  }, []);

  // Handle maximize section
  const handleMaximizeSection = useCallback((section) => {
    // TODO: Implement maximize logic
    toast.info(`Maximizar: ${section}`);
  }, []);

  // ==================== RENDER ====================

  // Mobile View - Simplified NOC Dashboard
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        {/* Mobile Header */}
        <div className="bg-slate-900/95 border-b border-slate-700/50 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">NOC</h1>
              <p className="text-xs text-slate-400">{t('noc.subtitle', 'Centro de Operaciones 24/7')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Mobile Stats Cards */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Status Overview */}
            <div className="grid grid-cols-2 gap-3">
              {/* Online */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">{t('noc.online', 'Online')}</span>
                </div>
                <p className="text-3xl font-bold text-emerald-400">{stats.online}</p>
                <p className="text-xs text-slate-400 mt-1">{t('noc.devices', 'dispositivos')}</p>
              </div>
              
              {/* Offline */}
              <div className={cn(
                "rounded-xl p-4 border",
                stats.offline > 0 
                  ? "bg-red-500/10 border-red-500/30" 
                  : "bg-slate-800/50 border-slate-700/30"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <WifiOff className={cn("w-5 h-5", stats.offline > 0 ? "text-red-400" : "text-slate-500")} />
                  <span className={cn("text-xs font-medium", stats.offline > 0 ? "text-red-400" : "text-slate-500")}>
                    {t('noc.offline', 'Offline')}
                  </span>
                </div>
                <p className={cn("text-3xl font-bold", stats.offline > 0 ? "text-red-400" : "text-slate-500")}>
                  {stats.offline}
                </p>
                <p className="text-xs text-slate-400 mt-1">{t('noc.devices', 'dispositivos')}</p>
              </div>
              
              {/* Uptime */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-medium">{t('noc.uptime', 'Uptime')}</span>
                </div>
                <p className="text-3xl font-bold text-cyan-400">
                  {stats.total > 0 ? ((stats.online / stats.total) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-slate-400 mt-1">{t('noc.availability', 'disponibilidad')}</p>
              </div>
              
              {/* Alerts */}
              <div className={cn(
                "rounded-xl p-4 border",
                stats.recentAlerts > 0 
                  ? "bg-amber-500/10 border-amber-500/30" 
                  : "bg-slate-800/50 border-slate-700/30"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className={cn("w-5 h-5", stats.recentAlerts > 0 ? "text-amber-400" : "text-slate-500")} />
                  <span className={cn("text-xs font-medium", stats.recentAlerts > 0 ? "text-amber-400" : "text-slate-500")}>
                    {t('noc.recentAlerts', 'Alertas')}
                  </span>
                </div>
                <p className={cn("text-3xl font-bold", stats.recentAlerts > 0 ? "text-amber-400" : "text-slate-500")}>
                  {stats.recentAlerts}
                </p>
                <p className="text-xs text-slate-400 mt-1">{t('noc.last24h', 'últimas 24h')}</p>
              </div>
            </div>

            {/* Offline Devices List */}
            {stats.offline > 0 && (
              <div className="bg-slate-900/80 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <WifiOff className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-semibold text-white">{t('noc.offlineDevices', 'Dispositivos Offline')}</span>
                  <Badge className="bg-red-500 text-white">{stats.offline}</Badge>
                </div>
                <div className="space-y-2">
                  {offlineDevices.slice(0, 5).map(device => (
                    <div 
                      key={device.id}
                      className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/20"
                      onClick={() => onDeviceClick?.(device)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-white">{device.name}</p>
                          <p className="text-xs text-slate-400">{device.ip_address}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  ))}
                  {stats.offline > 5 && (
                    <p className="text-xs text-slate-400 text-center pt-2">
                      +{stats.offline - 5} {t('noc.devices', 'dispositivos')} más
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Organizations Summary */}
            <div className="bg-slate-900/80 border border-slate-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold text-white">{t('noc.organizations', 'Organizaciones')}</span>
              </div>
              <div className="space-y-2">
                {devicesByOrg.slice(0, 4).map(({ org, online, offline }) => (
                  <div 
                    key={org.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      offline > 0 ? "bg-red-500/5 border-red-500/20" : "bg-slate-800/50 border-slate-700/30"
                    )}
                  >
                    <span className="text-sm text-white truncate flex-1">{org.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/20 text-emerald-400">{online}</Badge>
                      {offline > 0 && <Badge className="bg-red-500/20 text-red-400">{offline}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CRA Status */}
            <div className="bg-slate-900/80 border border-slate-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-white">CRA</span>
                <Badge className="bg-slate-700 text-slate-300">{craDevices.length}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {craDevices.slice(0, 3).map(device => (
                  <div 
                    key={device.id}
                    className={cn(
                      "p-2 rounded-lg border text-center",
                      device.status === 'online' 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-red-500/10 border-red-500/30"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mx-auto mb-1",
                      device.status === 'online' ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                    )} />
                    <p className="text-[10px] text-white truncate">{device.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Alerts */}
            {recentAlertsList.length > 0 && (
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-semibold text-white">{t('noc.recentAlerts', 'Alertas Recientes')}</span>
                </div>
                <div className="space-y-2">
                  {recentAlertsList.slice(0, 4).map(alert => (
                    <div 
                      key={alert.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        alert.alert_type === 'device_down' 
                          ? "bg-red-500/5 border-red-500/20" 
                          : "bg-emerald-500/5 border-emerald-500/20"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        alert.alert_type === 'device_down' ? "bg-red-500" : "bg-emerald-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{alert.device_name}</p>
                        <p className="text-xs text-slate-400">{formatTimeSince(alert.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation for desktop */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center gap-3">
              <Monitor className="w-8 h-8 text-cyan-400 shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{t('noc.desktopRecommended', 'Vista completa en desktop')}</p>
                <p className="text-xs text-slate-400">{t('noc.desktopRecommendedDesc', 'Para ver todos los widgets y el mapa interactivo, usa una pantalla más grande')}</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Mobile Footer */}
        <div className="bg-slate-900/95 border-t border-slate-700/30 px-4 py-4 shrink-0">
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-cyan-400" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <span className="text-sm font-semibold text-cyan-400">SIEMPRIA</span>
            </div>
            <p className="text-[10px] text-slate-500">{t('noc.developedBy', 'Desarrollado por SIEMPRIA')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Desktop View
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <NOCHeader
        currentTime={currentTime}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        editMode={editMode}
        onToggleEditMode={handleToggleEditMode}
        onResetLayout={handleResetLayout}
        presentationMode={presentationMode}
        onTogglePresentation={() => setPresentationMode(!presentationMode)}
        onOpenNewWindow={handleOpenNewWindow}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onClose={onClose}
        organizations={organizations}
        groups={groups}
        filters={filters}
        onFiltersChange={setFilters}
        savingPrefs={savingPrefs}
        t={t}
      />

      {/* Stats Bar */}
      <div className="px-3 py-2 shrink-0">
        <StatsWidget
          stats={stats}
          groups={groups}
          organizations={organizations}
          craDevices={craDevices}
        />
      </div>

      {/* Main Content - Draggable Grid */}
      <div className="flex-1 px-3 pb-3 overflow-auto">
        <DraggableGrid
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          editMode={editMode}
          widgetVisibility={widgetVisibility}
          onToggleWidget={handleToggleWidget}
        >
          <div key="uptime">
            <UptimeWidget
              uptimeData={uptimeData}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              onMaximize={() => handleMaximizeSection('uptime')}
              editMode={editMode}
            />
          </div>
          
          <div key="systemMonitor">
            <SystemMonitorWidget
              stats={stats}
              devicesByIsland={devicesByIsland}
              getBubbleSize={getBubbleSize}
              editMode={editMode}
            />
          </div>
          
          <div key="cra">
            <CRAWidget
              craDevices={craDevices}
              onMaximize={() => handleMaximizeSection('cra')}
              onDeviceClick={onDeviceClick}
              editMode={editMode}
            />
          </div>
          
          <div key="organizations">
            <OrganizationsWidget
              devicesByOrg={devicesByOrg}
              onMaximize={() => handleMaximizeSection('organizations')}
              editMode={editMode}
            />
          </div>
          
          <div key="offline">
            <OfflineWidget
              offlineDevices={offlineDevices}
              deviceTypes={deviceTypes}
              stats={stats}
              onMaximize={() => handleMaximizeSection('offline')}
              onDeviceClick={onDeviceClick}
              formatTimeSince={formatTimeSince}
              editMode={editMode}
            />
          </div>
          
          <div key="history">
            <HistoryWidget
              downtimeHistory={downtimeHistory}
              onMaximize={() => handleMaximizeSection('history')}
              editMode={editMode}
            />
          </div>
          
          <div key="alerts">
            <AlertsWidget
              recentAlerts={recentAlertsList}
              stats={stats}
              formatTimeSince={formatTimeSince}
              onMaximize={() => handleMaximizeSection('alerts')}
              editMode={editMode}
            />
          </div>
        </DraggableGrid>
      </div>

      {/* Footer */}
      <div className="h-10 bg-slate-900/90 border-t border-slate-700/30 flex items-center justify-between px-4 text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>📹 {filteredDevices.filter(d => deviceTypes.find(t => t.id === d.device_type_id)?.name?.toLowerCase().includes('camera')).length} Cámaras</span>
          <span>📁 {groups.length} Grupos</span>
          {filters.organizationId !== 'all' && (
            <span className="text-cyan-400">Filtrado: {organizations.find(o => o.id === filters.organizationId)?.name}</span>
          )}
        </div>
        
        {/* Desarrollado por SIEMPRIA */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Desarrollado por</span>
          <div className="flex items-center gap-1.5">
            <img 
              src="https://customer-assets.emergentagent.com/job_85fd93bb-2f59-4657-a05b-6d77d63ce6f3/artifacts/hxvdkbmv_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png" 
              alt="SIEMPRIA" 
              className="h-6 w-auto"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-cyan-400 font-semibold text-[12px] tracking-wide">SIEMPRIA</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span>soporte@siempria.com</span>
          <span>822 22 00 22</span>
        </div>
      </div>

      <audio ref={audioRef} src="/alert.mp3" preload="auto" />
    </div>
  );
};

export default NOCDashboardRefactored;
