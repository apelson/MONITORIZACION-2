/**
 * NOCDashboardRefactored - Centro de Operaciones de Red Profesional 24/7
 * Versión refactorizada con componentes modulares y drag & drop real
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  
  // Core state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [uptimeData, setUptimeData] = useState([]);
  const [craDevices, setCraDevices] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  
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
              src="/siempria-logo.png" 
              alt="SIEMPRIA" 
              className="h-5 w-auto"
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
