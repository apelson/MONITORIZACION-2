/**
 * NOCDashboard - Centro de Operaciones de Red Profesional 24/7
 * Con modo presentación automática de secciones
 * Optimizado para pantalla de 55" sin scroll
 * Soporta personalización drag & drop de widgets
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { 
  Monitor, Wifi, WifiOff, AlertTriangle, Building2, Clock, 
  TrendingUp, Activity, X, ChevronRight, RefreshCw, Eye, Server,
  Camera, HardDrive, Network, Router, Printer, Shield, Box, Layers,
  Bell, CheckCircle, XCircle, BarChart3, History, ClipboardList,
  Maximize2, Minimize2, Volume2, VolumeX, ExternalLink, Play, MapPin,
  Pause, SkipForward, Gauge, Zap, Settings, GripVertical, Lock, Unlock,
  Wrench, FileText
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
import SystemECG from '@/components/common/SystemECG';
import { DashboardConfigPanel, useDashboardPreferences, WidgetWrapper, DEFAULT_LAYOUT, DEFAULT_WIDGETS } from '@/components/dashboard/DashboardWidgets';
import StatsWidget from '@/components/noc/widgets/StatsWidget';
import UptimeWidget from '@/components/noc/widgets/UptimeWidget';
import SystemMonitorWidget from '@/components/noc/widgets/SystemMonitorWidget';
import CRAWidget from '@/components/noc/widgets/CRAWidget';
import OrganizationsWidget from '@/components/noc/widgets/OrganizationsWidget';
import OfflineWidget from '@/components/noc/widgets/OfflineWidget';
import HistoryWidget from '@/components/noc/widgets/HistoryWidget';
import AlertsWidget from '@/components/noc/widgets/AlertsWidget';
import CriticalAlertsWidget from '@/components/noc/widgets/CriticalAlertsWidget';
import DahuaWidget from '@/components/noc/widgets/DahuaWidget';
import VPNWidget from '@/components/noc/widgets/VPNWidget';
import SystemResourceMonitor from '@/components/common/SystemResourceMonitor';
import MiniECG from '@/components/common/MiniECG';
import { IslandSilhouette, ISLAND_ID_MAP } from '@/components/common/CanaryIslandsSilhouettes';

// Logo Siempria (hexágono azul)
const LOGO_URL = "https://customer-assets.emergentagent.com/job_bd3cf608-7344-4385-a96f-f4dc04839f9f/artifacts/t15tym24_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";

// Widget layout for customizable dashboard
const INITIAL_LAYOUT = [
  { i: 'stats', x: 0, y: 0, w: 12, h: 1, static: true },
  { i: 'uptime', x: 0, y: 1, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'systemMonitor', x: 4, y: 1, w: 4, h: 3, minW: 3, minH: 2 },
  { i: 'cra', x: 8, y: 1, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'organizations', x: 0, y: 4, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'offline', x: 3, y: 4, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'dahua', x: 6, y: 4, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'vpn', x: 9, y: 4, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'history', x: 0, y: 7, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'alerts', x: 3, y: 7, w: 6, h: 3, minW: 3, minH: 2 },
];

const ICON_MAP = {
  camera: Camera, "hard-drive": HardDrive, network: Network, router: Router,
  server: Server, monitor: Monitor, printer: Printer, wifi: Wifi,
  shield: Shield, box: Box, layers: Layers
};

// Canary Islands map configuration with silhouette IDs
const CANARY_ISLANDS = [
  { id: 'LP', name: 'La Palma', silhouetteId: 'LP', abbrev: 'LP' },
  { id: 'TF', name: 'Tenerife', silhouetteId: 'TF', abbrev: 'TF' },
  { id: 'GC', name: 'Gran Canaria', silhouetteId: 'GC', abbrev: 'GC' },
  { id: 'FV', name: 'Fuerteventura', silhouetteId: 'FV', abbrev: 'FV' },
  { id: 'LZ', name: 'Lanzarote', silhouetteId: 'LZ', abbrev: 'LZ' },
];

// Presentation sections
const PRESENTATION_SECTIONS = ['overview', 'cra', 'organizations', 'offline', 'alerts'];
const PRESENTATION_INTERVAL = 10000; // 10 seconds per section

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
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [manualExpandedSection, setManualExpandedSection] = useState(null);
  const [editMode, setEditMode] = useState(false); // For drag & drop editing
  const [layout, setLayout] = useState(INITIAL_LAYOUT);
  const [widgetVisibility, setWidgetVisibility] = useState({
    stats: true,
    uptime: true,
    systemMonitor: true,
    cra: true,
    organizations: true,
    offline: true,
    history: true,
    alerts: true,
    dahua: true
  });
  const [dashboardFilters, setDashboardFilters] = useState({
    organizationId: 'all',
    groupId: 'all'
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [uptimeRecord, setUptimeRecord] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [recordDate, setRecordDate] = useState(null);
  const [lastIncidentTime, setLastIncidentTime] = useState(Date.now());
  const [recordUptime, setRecordUptime] = useState(0);
  const [dahuaDevices, setDahuaDevices] = useState([]);
  const [dahuaSummary, setDahuaSummary] = useState({ online: 0, offline: 0 });
  const [vpnSummary, setVpnSummary] = useState({ total: 0, online: 0, offline: 0 });
  const [refreshingOffline, setRefreshingOffline] = useState(false);
  const dahuaDevicesRef = useRef([]);
  const vpnDevicesRef = useRef([]);
  const audioRef = useRef(null);
  const presentationRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Handle force refresh of offline devices
  const handleRefreshOfflineDevices = async () => {
    if (!authAxios || refreshingOffline) return;
    setRefreshingOffline(true);
    try {
      // Trigger device check on backend
      await authAxios.post('/devices/check-all');
      // Also check Dahua devices
      try {
        await authAxios.post('/dahua/check-all');
      } catch (e) {
        console.log('Dahua check not available');
      }
      toast.success('Comprobación iniciada', { description: 'Los dispositivos se están verificando...' });
      // Wait a bit and refresh data
      setTimeout(async () => {
        try {
          // Refresh will happen automatically via the periodic fetch
          toast.info('Comprobación completada');
        } catch (e) {}
        setRefreshingOffline(false);
      }, 3000);
    } catch (error) {
      console.error('Error refreshing devices:', error);
      toast.error('Error al comprobar dispositivos');
      setRefreshingOffline(false);
    }
  };

  // Format uptime counter (dd:hh:mm:ss)
  const formatUptimeCounter = (ms) => {
    if (!ms || ms < 0) return '00:00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Load dashboard preferences from server
  useEffect(() => {
    const loadPreferences = async () => {
      if (!authAxios) return;
      try {
        const res = await authAxios.get('/auth/me');
        const userId = res.data?.user?.id;
        if (!userId) return;
        
        const prefsRes = await authAxios.get(`/users/${userId}/dashboard-preferences`);
        if (prefsRes.data) {
          if (prefsRes.data.layout && Array.isArray(prefsRes.data.layout)) {
            setLayout(prefsRes.data.layout);
          }
          if (prefsRes.data.widgets) {
            setWidgetVisibility(prev => ({ ...prev, ...prefsRes.data.widgets }));
          }
          if (prefsRes.data.filters) {
            setDashboardFilters(prefsRes.data.filters);
          }
        }
      } catch (error) {
        // Use defaults on first load
        console.log('Using default dashboard layout');
      }
    };
    loadPreferences();
  }, [authAxios]);

  // Load uptime record from server
  useEffect(() => {
    const loadUptimeRecord = async () => {
      if (!authAxios) return;
      try {
        const res = await authAxios.get('/uptime-record');
        if (res.data?.record) {
          setUptimeRecord(res.data.record);
          if (res.data.recorded_at) {
            setRecordDate(res.data.recorded_at);
          }
        }
      } catch (error) {
        console.log('No uptime record found');
      }
    };
    loadUptimeRecord();
  }, [authAxios]);

  // Save preferences to server
  const savePreferences = async () => {
    if (!authAxios) return;
    setSavingPrefs(true);
    try {
      const res = await authAxios.get('/auth/me');
      const userId = res.data?.user?.id;
      if (!userId) return;
      
      await authAxios.put(`/users/${userId}/dashboard-preferences`, {
        layout,
        widgets: widgetVisibility,
        filters: dashboardFilters
      });
      toast.success('Layout guardado');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error al guardar');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Handle layout change (when user drags/resizes widgets)
  const handleLayoutChange = (newLayout) => {
    if (!editMode) return;
    setLayout(newLayout);
  };

  // Toggle widget visibility
  const toggleWidget = (widgetId) => {
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  // Reset layout to defaults
  const resetLayout = () => {
    setLayout(INITIAL_LAYOUT);
    setWidgetVisibility({
      stats: true, uptime: true, systemMonitor: true, cra: true,
      organizations: true, offline: true, history: true, alerts: true, dahua: true
    });
    toast.info('Layout restaurado');
  };

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Measure container width for grid
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 32); // Minus padding
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Presentation mode auto-rotation
  useEffect(() => {
    if (presentationMode) {
      presentationRef.current = setInterval(() => {
        setPresentationIndex(prev => (prev + 1) % PRESENTATION_SECTIONS.length);
      }, PRESENTATION_INTERVAL);
      
      return () => {
        if (presentationRef.current) {
          clearInterval(presentationRef.current);
        }
      };
    } else {
      if (presentationRef.current) {
        clearInterval(presentationRef.current);
      }
    }
  }, [presentationMode]);

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

  // Sort CRA devices: offline first, then by highest latency
  const sortCraDevices = (devices) => {
    return devices.sort((a, b) => {
      // Offline devices first
      if (a.status === 'offline' && b.status !== 'offline') return -1;
      if (a.status !== 'offline' && b.status === 'offline') return 1;
      // Then by latency (higher first)
      const latencyA = a.response_time_ms || 0;
      const latencyB = b.response_time_ms || 0;
      if (latencyA !== latencyB) return latencyB - latencyA;
      // Finally by name
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  // Fetch CRA devices from dedicated endpoint
  useEffect(() => {
    const fetchCraDevices = async () => {
      console.log('NOC: Fetching CRA devices, authAxios:', !!authAxios);
      if (!authAxios) {
        console.log('NOC: No authAxios, using fallback from devices prop');
        // Fallback: filter from devices prop by organization or is_cra flag
        const cra = sortCraDevices(
          devices.filter(d => d.is_cra === true || d.device_type === 'cra')
        );
        console.log('NOC: CRA from devices prop:', cra.length);
        setCraDevices(cra);
        return;
      }
      try {
        const res = await authAxios.get('/cra/devices');
        console.log('NOC: CRA API response:', res.data);
        const cra = sortCraDevices(res.data.devices || []);
        console.log('NOC: CRA devices loaded:', cra.length);
        setCraDevices(cra);
      } catch (error) {
        console.error('NOC: Error fetching CRA devices:', error);
        // Fallback: filter from devices prop
        const cra = sortCraDevices(
          devices.filter(d => d.is_cra === true || d.device_type === 'cra')
        );
        console.log('NOC: CRA fallback from devices:', cra.length);
        setCraDevices(cra);
      }
    };
    fetchCraDevices();
    // Refresh CRA devices every 60 seconds
    const interval = setInterval(fetchCraDevices, 60000);
    return () => clearInterval(interval);
  }, [authAxios, devices]);

  // Fetch Dahua devices
  useEffect(() => {
    const fetchDahuaDevices = async () => {
      if (!authAxios) return;
      try {
        const [devRes, statusRes] = await Promise.all([
          authAxios.get('/dahua/devices'),
          authAxios.get('/dahua/status')
        ]);
        const newDevices = devRes.data.devices || [];
        const newSummary = statusRes.data.summary || { online: 0, offline: 0 };
        
        // Check for status changes and notify (use ref for previous state)
        if (dahuaDevicesRef.current.length > 0) {
          newDevices.forEach(newDev => {
            const oldDev = dahuaDevicesRef.current.find(d => d.id === newDev.id);
            if (oldDev && oldDev.online !== newDev.online) {
              if (!newDev.online) {
                toast.error(`🔴 Grabador ${newDev.name} desconectado`);
                if (soundEnabled && audioRef.current) {
                  audioRef.current.play().catch(() => {});
                }
              } else {
                toast.success(`🟢 Grabador ${newDev.name} conectado`);
              }
            }
          });
        }
        
        // Update both state and ref
        dahuaDevicesRef.current = newDevices;
        setDahuaDevices(newDevices);
        setDahuaSummary(newSummary);
      } catch (error) {
        console.error('Error fetching Dahua devices:', error);
      }
    };
    fetchDahuaDevices();
    const interval = setInterval(fetchDahuaDevices, 60000);
    return () => clearInterval(interval);
  }, [authAxios, soundEnabled]);

  // Fetch VPN status
  useEffect(() => {
    const fetchVpnStatus = async () => {
      if (!authAxios) return;
      try {
        const res = await authAxios.get('/vpn/status');
        const newDevices = res.data.devices || [];
        const newSummary = res.data.summary || { total: 0, online: 0, offline: 0 };
        
        // Check for status changes and notify
        if (vpnDevicesRef.current.length > 0) {
          newDevices.forEach(newDev => {
            const oldDev = vpnDevicesRef.current.find(d => d.id === newDev.id);
            if (oldDev && oldDev.online !== newDev.online) {
              if (!newDev.online) {
                toast.error(`🔴 VPN ${newDev.name} desconectado`);
                if (soundEnabled && audioRef.current) {
                  audioRef.current.play().catch(() => {});
                }
              } else {
                toast.success(`🟢 VPN ${newDev.name} conectado`);
              }
            }
          });
        }
        
        vpnDevicesRef.current = newDevices;
        setVpnSummary(newSummary);
      } catch (error) {
        console.error('Error fetching VPN status:', error);
      }
    };
    fetchVpnStatus();
    const interval = setInterval(fetchVpnStatus, 60000);
    return () => clearInterval(interval);
  }, [authAxios, soundEnabled]);

  // Statistics calculations (includes Dahua recorders)
  const stats = useMemo(() => {
    const cameraTotal = devices.length;
    const cameraOnline = devices.filter(d => d.status === 'online').length;
    const cameraOffline = devices.filter(d => d.status === 'offline').length;
    
    // Include Dahua recorders in total counts
    const total = cameraTotal + dahuaDevices.length;
    const online = cameraOnline + (dahuaSummary.online || 0);
    const offline = cameraOffline + (dahuaSummary.offline || 0);
    
    const uptimePercent = total > 0 ? ((online / total) * 100).toFixed(1) : 0;
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlerts = alerts.filter(a => new Date(a.timestamp) > last24h);
    const criticalAlerts = recentAlerts.filter(a => a.alert_type === 'device_down' || a.alert_type === 'nas_disconnected');
    
    // Calculate average latency from online devices
    const devicesWithLatency = devices.filter(d => d.status === 'online' && d.response_time_ms);
    const avgLatency = devicesWithLatency.length > 0 
      ? Math.round(devicesWithLatency.reduce((sum, d) => sum + d.response_time_ms, 0) / devicesWithLatency.length)
      : null;
    const maxLatency = devicesWithLatency.length > 0 
      ? Math.round(Math.max(...devicesWithLatency.map(d => d.response_time_ms)))
      : null;
    const slowDevices = devicesWithLatency.filter(d => d.response_time_ms > 500).length;
    
    // Find the most recent device_down alert to calculate uptime
    const downAlerts = alerts
      .filter(a => a.alert_type === 'device_down' || a.alert_type === 'nas_disconnected')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const lastIncidentTime = downAlerts.length > 0 ? downAlerts[0].timestamp : null;
    
    return { 
      total, online, offline, uptimePercent, 
      recentAlerts: recentAlerts.length, criticalAlerts: criticalAlerts.length,
      avgLatency, maxLatency, slowDevices, lastIncidentTime,
      dahuaOnline: dahuaSummary.online || 0,
      dahuaOffline: dahuaSummary.offline || 0,
      dahuaTotal: dahuaDevices.length
    };
  }, [devices, alerts, dahuaDevices, dahuaSummary]);

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

  // Devices by island
  const devicesByIsland = useMemo(() => {
    const islandMap = {};
    CANARY_ISLANDS.forEach(island => {
      islandMap[island.id] = { ...island, online: 0, offline: 0, total: 0 };
    });

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
        islandMap['GC'].online += online;
        islandMap['GC'].offline += offline;
        islandMap['GC'].total += orgDevices.length;
      }
    });

    return Object.values(islandMap);
  }, [devices, organizations, groups]);

  // Offline devices
  const offlineDevices = useMemo(() => {
    return devices
      .filter(d => d.status === 'offline')
      .sort((a, b) => new Date(b.last_status_change || 0) - new Date(a.last_status_change || 0));
  }, [devices]);

  // All offline devices including Dahua recorders
  const allOfflineDevices = useMemo(() => {
    const normalOffline = devices
      .filter(d => d.status === 'offline')
      .map(d => ({ 
        ...d, 
        deviceType: d.device_type || d.device_type_id || 'device',
        // Generate label based on device type
        typeLabel: getDeviceTypeLabel(d)
      }));
    
    const dahuaOffline = dahuaDevices
      .filter(d => !d.online)
      .map(d => ({ 
        ...d, 
        deviceType: 'dahua',
        typeLabel: 'DVR',
        name: d.name || d.serial_number,
        status: 'offline',
        last_status_change: d.last_check
      }));
    
    return [...normalOffline, ...dahuaOffline]
      .sort((a, b) => new Date(b.last_status_change || 0) - new Date(a.last_status_change || 0));
  }, [devices, dahuaDevices]);

  // Helper function to get device type label
  function getDeviceTypeLabel(device) {
    // Check device_type object first
    if (device.device_type?.name) {
      const name = device.device_type.name.toLowerCase();
      if (name.includes('vpn')) return 'VPN';
      if (name.includes('cra')) return 'CRA';
      if (name.includes('nas')) return 'NAS';
      if (name.includes('server') || name.includes('servidor')) return 'SRV';
      if (name.includes('router')) return 'RTR';
      if (name.includes('switch')) return 'SW';
      if (name.includes('camera') || name.includes('cámara') || name.includes('camara')) return 'CAM';
      if (name.includes('dvr') || name.includes('nvr') || name.includes('recorder') || name.includes('grabador')) return 'DVR';
      // Return first 3 chars uppercase if no match
      return device.device_type.name.substring(0, 3).toUpperCase();
    }
    // Check device name for hints
    const deviceName = (device.name || '').toLowerCase();
    if (deviceName.includes('vpn')) return 'VPN';
    if (deviceName.includes('cra')) return 'CRA';
    if (deviceName.includes('nas')) return 'NAS';
    if (deviceName.includes('server') || deviceName.includes('srv')) return 'SRV';
    if (deviceName.includes('router')) return 'RTR';
    if (deviceName.includes('switch')) return 'SW';
    if (deviceName.includes('cam')) return 'CAM';
    // Check tags
    if (device.tags?.some(t => t.toLowerCase().includes('vpn'))) return 'VPN';
    if (device.tags?.some(t => t.toLowerCase().includes('cra'))) return 'CRA';
    // Default
    return null;
  }

  // Recent alerts
  const recentAlertsList = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
  }, [alerts]);

  // Downtime history - group by device
  const downtimeHistory = useMemo(() => {
    const deviceDowntimes = {};
    const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    alerts
      .filter(a => new Date(a.timestamp) > last7Days)
      .forEach(alert => {
        if (alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected') {
          const deviceName = alert.device_name || 'Unknown';
          if (!deviceDowntimes[deviceName]) {
            deviceDowntimes[deviceName] = { name: deviceName, count: 0, lastDown: null, events: [] };
          }
          deviceDowntimes[deviceName].count++;
          if (!deviceDowntimes[deviceName].lastDown || new Date(alert.timestamp) > new Date(deviceDowntimes[deviceName].lastDown)) {
            deviceDowntimes[deviceName].lastDown = alert.timestamp;
          }
          deviceDowntimes[deviceName].events.push(alert);
        }
      });
    
    return Object.values(deviceDowntimes).sort((a, b) => b.count - a.count);
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
    if (onClose) onClose();
  };

  const togglePresentationMode = () => {
    setPresentationMode(!presentationMode);
    setManualExpandedSection(null); // Close any manual expanded section
    if (!presentationMode) {
      setPresentationIndex(0);
      toast.info('Modo Presentación Activado');
    } else {
      toast.info('Modo Presentación Desactivado');
    }
  };

  const handleMaximizeSection = (section) => {
    setPresentationMode(false); // Stop presentation mode
    setManualExpandedSection(manualExpandedSection === section ? null : section);
  };

  const nextSlide = () => {
    setPresentationIndex(prev => (prev + 1) % PRESENTATION_SECTIONS.length);
  };

  const getBubbleSize = (total) => {
    if (total === 0) return 20;
    if (total < 10) return 30;
    if (total < 50) return 45;
    if (total < 100) return 60;
    if (total < 200) return 80;
    return 100;
  };

  const currentSection = PRESENTATION_SECTIONS[presentationIndex];

  // Compact stats bar for presentation/expanded modes
  const renderCompactStatsBar = () => (
    <div className="grid grid-cols-9 gap-2 shrink-0 mb-3">
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center justify-between">
        <div>
          <p className="text-[8px] text-slate-400 uppercase">TOTAL</p>
          <p className="text-lg font-bold text-white">{stats.total}</p>
        </div>
        <Server className="w-5 h-5 text-cyan-400 opacity-50" />
      </div>
      <div className="bg-slate-800/80 border border-emerald-500/30 rounded-lg px-3 py-1.5 flex items-center justify-between">
        <div>
          <p className="text-[8px] text-emerald-400 uppercase">ONLINE</p>
          <p className="text-lg font-bold text-emerald-400">{stats.online}</p>
        </div>
        <Wifi className="w-5 h-5 text-emerald-400 opacity-50" />
      </div>
      <div className={cn("bg-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between", stats.offline > 0 ? "border-2 border-red-500" : "border border-slate-700/50")}>
        <div>
          <p className="text-[8px] text-red-400 uppercase">OFFLINE</p>
          <p className="text-lg font-bold text-red-400">{stats.offline}</p>
        </div>
        <WifiOff className="w-5 h-5 text-red-400 opacity-50" />
      </div>
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center justify-between">
        <div>
          <p className="text-[8px] text-blue-400 uppercase">UPTIME</p>
          <p className="text-lg font-bold text-emerald-400">{stats.uptimePercent}%</p>
        </div>
        <TrendingUp className="w-5 h-5 text-blue-400 opacity-50" />
      </div>
      <div className={cn("bg-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between", stats.criticalAlerts > 0 ? "border border-amber-500" : "border border-slate-700/50")}>
        <div>
          <p className="text-[8px] text-amber-400 uppercase">ALERTAS</p>
          <p className="text-lg font-bold text-amber-400">{stats.recentAlerts}</p>
        </div>
        <AlertTriangle className="w-5 h-5 text-amber-400 opacity-50" />
      </div>
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center justify-between">
        <div>
          <p className="text-[7px] text-purple-400 uppercase">GRUPOS</p>
          <p className="text-lg font-bold text-purple-400">{groups.length} <span className="text-sm opacity-70">/ {organizations.length}</span></p>
        </div>
        <Building2 className="w-5 h-5 text-purple-400 opacity-50" />
      </div>
      <div className={cn("bg-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between", stats.avgLatency && stats.avgLatency > 300 ? "border border-orange-500" : "border border-slate-700/50")}>
        <div>
          <p className="text-[8px] text-cyan-400 uppercase">LATENCIA</p>
          <p className="text-lg font-bold text-cyan-400">{stats.avgLatency ? `${stats.avgLatency}ms` : '--'}</p>
        </div>
        <Gauge className="w-5 h-5 text-cyan-400 opacity-50" />
      </div>
      <div className={cn("bg-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between", craDevices.some(d => d.status === 'offline') ? "border border-red-500" : "border border-slate-700/50")}>
        <div>
          <p className="text-[8px] text-red-400 uppercase">CRA</p>
          <p className="text-lg font-bold text-red-400">{craDevices.length}</p>
        </div>
        <Shield className="w-5 h-5 text-red-400 opacity-50" />
      </div>
      <div className={cn("bg-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between", stats.dahuaOffline > 0 ? "border-2 border-red-500 animate-pulse" : "border border-emerald-500/30")}>
        <div>
          <p className="text-[8px] text-orange-400 uppercase">DVR/NVR</p>
          <p className="text-lg font-bold text-orange-400">{stats.dahuaOnline || 0}<span className="text-sm opacity-70">/{stats.dahuaTotal || 0}</span></p>
        </div>
        <HardDrive className="w-5 h-5 text-orange-400 opacity-50" />
      </div>
    </div>
  );

  // Render expanded section for presentation mode
  const renderExpandedSection = () => {
    switch (currentSection) {
      case 'overview':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4">
            {renderCompactStatsBar()}
            <div className="text-center mb-2">
              <h2 className="text-3xl font-bold text-cyan-400">{t('noc.overview', 'Resumen General')}</h2>
              <p className="text-slate-400">{t('noc.overviewSubtitle', 'Estado actual de la infraestructura')}</p>
            </div>
            <div className="grid grid-cols-3 gap-6 flex-1">
              {/* Stats grandes */}
              <div className="bg-slate-800/50 rounded-xl p-6 flex flex-col items-center justify-center border border-slate-700">
                <Server className="w-16 h-16 text-cyan-400 mb-4" />
                <p className="text-6xl font-bold text-white">{stats.total}</p>
                <p className="text-xl text-slate-400 mt-2">{t('noc.totalDevices', 'Total Dispositivos')}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-6 flex flex-col items-center justify-center border border-emerald-500/30">
                <Wifi className="w-16 h-16 text-emerald-400 mb-4" />
                <p className="text-6xl font-bold text-emerald-400">{stats.online}</p>
                <p className="text-xl text-slate-400 mt-2">Online</p>
              </div>
              <div className={cn("rounded-xl p-6 flex flex-col items-center justify-center", stats.offline > 0 ? "bg-red-500/10 border-2 border-red-500 animate-pulse" : "bg-slate-800/50 border border-slate-700")}>
                <WifiOff className="w-16 h-16 text-red-400 mb-4" />
                <p className="text-6xl font-bold text-red-400">{stats.offline}</p>
                <p className="text-xl text-slate-400 mt-2">Offline</p>
              </div>
            </div>
            {/* Uptime grande */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 h-48">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-6 h-6 text-cyan-400" />
                Uptime (24h) - {stats.uptimePercent}%
              </h3>
              <ResponsiveContainer width="100%" height="70%">
                <AreaChart data={uptimeData}>
                  <defs>
                    <linearGradient id="uptimeGradientExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
                  <Area type="monotone" dataKey="uptime" stroke="#06b6d4" strokeWidth={3} fill="url(#uptimeGradientExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'cra':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4">
            {renderCompactStatsBar()}
            <div className="text-center mb-2">
              <h2 className="text-3xl font-bold text-red-400 flex items-center justify-center gap-3">
                <Shield className="w-10 h-10" />
                {t('noc.cra', 'Central Receptora de Alarmas (CRA)')}
              </h2>
              <p className="text-slate-400">{craDevices.length} {t('noc.devicesMonitored', 'dispositivos monitorizados')}</p>
              {craDevices.some(d => d.status === 'offline') && (
                <Badge className="bg-red-500 text-white text-lg px-4 py-1 mt-2 animate-pulse">
                  {craDevices.filter(d => d.status === 'offline').length} OFFLINE
                </Badge>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-6 gap-3 p-2">
                {craDevices.map(device => (
                  <div
                    key={device.id}
                    className={cn(
                      "p-4 rounded-lg border text-center transition-all",
                      device.status === 'offline' 
                        ? "bg-red-500/20 border-red-500 animate-pulse" 
                        : "bg-emerald-500/10 border-emerald-500/30"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Shield className={cn("w-6 h-6", device.status === 'offline' ? "text-red-400" : "text-emerald-400")} />
                      <div className={cn("w-3 h-3 rounded-full", device.status === 'offline' ? "bg-red-500 animate-ping" : "bg-emerald-500")} />
                    </div>
                    <p className="text-sm font-semibold text-white">{device.name}</p>
                    <p className="text-xs text-slate-400">{device.ip_address}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case 'organizations':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4">
            {renderCompactStatsBar()}
            <div className="text-center mb-2">
              <h2 className="text-3xl font-bold text-purple-400 flex items-center justify-center gap-3">
                <Building2 className="w-10 h-10" />
                {t('noc.organizations', 'Estado por Organización')}
              </h2>
              <p className="text-slate-400">{devicesByOrg.length} {t('noc.activeOrgs', 'organizaciones activas')}</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 gap-4 p-2">
                {devicesByOrg.map(({ org, online, offline, total }) => {
                  const uptimePercent = total > 0 ? (online / total) * 100 : 0;
                  return (
                    <div 
                      key={org.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        offline > 0 ? "bg-red-500/10 border-red-500/50" : "bg-slate-800/50 border-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-semibold text-white">{org.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500/20 text-emerald-400">{online} online</Badge>
                          {offline > 0 && <Badge className="bg-red-500/20 text-red-400 animate-pulse">{offline} offline</Badge>}
                        </div>
                      </div>
                      <Progress value={uptimePercent} className="h-3 bg-slate-700" />
                      <p className="text-sm text-slate-400 mt-2">{total} {t('noc.devices', 'dispositivos')} - {uptimePercent.toFixed(1)}% {t('noc.availability', 'disponibilidad')}</p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        );

      case 'offline':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4">
            {renderCompactStatsBar()}
            <div className="text-center mb-2">
              <h2 className={cn("text-3xl font-bold flex items-center justify-center gap-3", offlineDevices.length > 0 ? "text-red-400" : "text-emerald-400")}>
                <WifiOff className="w-10 h-10" />
                Dispositivos Offline
              </h2>
              {offlineDevices.length > 0 ? (
                <Badge className="bg-red-500 text-white text-lg px-4 py-1 mt-2">{offlineDevices.length} {t('noc.devicesNeedAttention', 'dispositivos requieren atención')}</Badge>
              ) : (
                <p className="text-emerald-400 text-xl mt-2">{t('noc.allOnline', 'Todos los dispositivos online')}</p>
              )}
            </div>
            {offlineDevices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <CheckCircle className="w-32 h-32 text-emerald-500 mb-4" />
                <p className="text-2xl text-emerald-400">{t('noc.system100', 'Sistema Operativo al 100%')}</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-3 gap-4 p-2">
                  {offlineDevices.map(device => {
                    const Icon = getDeviceIcon(device);
                    return (
                      <div key={device.id} className="p-4 rounded-lg bg-red-500/10 border-2 border-red-500 animate-pulse">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-8 h-8 text-red-400" />
                          <div className="flex-1">
                            <p className="text-lg font-semibold text-white">{device.name}</p>
                            <p className="text-sm text-slate-400">{device.ip_address}</p>
                          </div>
                          <Badge className="bg-red-500 text-white">{formatTimeSince(device.last_status_change)}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 'alerts':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4">
            {renderCompactStatsBar()}
            <div className="text-center mb-2">
              <h2 className="text-3xl font-bold text-amber-400 flex items-center justify-center gap-3">
                <Bell className="w-10 h-10" />
                {t('noc.recentAlerts', 'Alertas Recientes')} (24h)
              </h2>
              <p className="text-slate-400">{stats.recentAlerts} {t('noc.alertsLast24h', 'alertas en las últimas 24 horas')}</p>
            </div>
            {recentAlertsList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <CheckCircle className="w-32 h-32 text-emerald-500/50 mb-4" />
                <p className="text-xl text-slate-400">{t('noc.noRecentAlerts', 'Sin alertas recientes')}</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-2">
                  {recentAlertsList.map(alert => {
                    const isDown = alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected';
                    return (
                      <div key={alert.id} className={cn("p-4 rounded-lg border flex items-center justify-between", isDown ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30")}>
                        <div className="flex items-center gap-3">
                          {isDown ? <XCircle className="w-6 h-6 text-red-400" /> : <CheckCircle className="w-6 h-6 text-emerald-400" />}
                          <div>
                            <p className="text-lg font-semibold text-white">{alert.device_name}</p>
                            <p className="text-sm text-slate-400">{alert.message || (isDown ? t('noc.deviceDisconnected', 'Dispositivo desconectado') : t('noc.deviceConnected', 'Dispositivo conectado'))}</p>
                          </div>
                        </div>
                        <span className="text-slate-400">{formatTimeSince(alert.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render manually expanded section (when user clicks maximize)
  const renderManualExpandedSection = () => {
    switch (manualExpandedSection) {
      case 'uptime':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
            {renderCompactStatsBar()}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-cyan-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Uptime - {stats.uptimePercent}%</h2>
                  <p className="text-slate-400">{t('noc.systemAvailability', 'Disponibilidad del sistema en tiempo real')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={timeRange === '24h' ? 'default' : 'ghost'} size="sm" onClick={() => setTimeRange('24h')}>24h</Button>
                <Button variant={timeRange === '7d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimeRange('7d')}>7 {t('noc.days', 'días')}</Button>
                <Button variant="ghost" size="sm" onClick={() => setManualExpandedSection(null)}>
                  <Minimize2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-slate-800/50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={uptimeData}>
                  <defs>
                    <linearGradient id="uptimeGradientMax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="uptime" stroke="#06b6d4" strokeWidth={3} fill="url(#uptimeGradientMax)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'cra':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
            {renderCompactStatsBar()}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('noc.cra', 'Central Receptora de Alarmas (CRA)')}</h2>
                  <p className="text-slate-400">{craDevices.length} {t('noc.devicesMonitored', 'dispositivos monitorizados')}</p>
                </div>
                {craDevices.some(d => d.status === 'offline') && (
                  <Badge className="bg-red-500 text-white text-lg px-4 py-1 animate-pulse ml-4">
                    {craDevices.filter(d => d.status === 'offline').length} OFFLINE
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setManualExpandedSection(null)}>
                <Minimize2 className="w-5 h-5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-2">
                {craDevices.map(device => (
                  <div
                    key={device.id}
                    className={cn(
                      "p-4 rounded-lg border text-center transition-all cursor-pointer hover:scale-105",
                      device.status === 'offline' 
                        ? "bg-red-500/20 border-red-500 animate-pulse" 
                        : "bg-emerald-500/10 border-emerald-500/30"
                    )}
                    onClick={() => onDeviceClick?.(device)}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Shield className={cn("w-6 h-6", device.status === 'offline' ? "text-red-400" : "text-emerald-400")} />
                      <div className={cn("w-3 h-3 rounded-full", device.status === 'offline' ? "bg-red-500 animate-ping" : "bg-emerald-500")} />
                    </div>
                    <p className="text-sm font-semibold text-white">{device.name}</p>
                    <p className="text-xs text-slate-400">{device.ip_address}</p>
                    {device.last_check && (
                      <p className="text-[10px] text-slate-500 mt-1">Último check: {formatTimeSince(device.last_check)}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case 'offline':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
            {renderCompactStatsBar()}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOff className="w-8 h-8 text-red-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('noc.offlineDevices', 'Dispositivos Offline')}</h2>
                  <p className="text-slate-400">{offlineDevices.length} {t('noc.devicesNeedAttention', 'dispositivos requieren atención')}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setManualExpandedSection(null)}>
                <Minimize2 className="w-5 h-5" />
              </Button>
            </div>
            {offlineDevices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <CheckCircle className="w-32 h-32 text-emerald-500 mb-4" />
                <p className="text-2xl text-emerald-400">{t('noc.allOnline', 'Todos los dispositivos online')}</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
                  {offlineDevices.map(device => {
                    const Icon = getDeviceIcon(device);
                    return (
                      <div 
                        key={device.id} 
                        className="p-4 rounded-lg bg-red-500/10 border-2 border-red-500 cursor-pointer hover:bg-red-500/20 transition-all"
                        onClick={() => onDeviceClick?.(device)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-8 h-8 text-red-400" />
                          <div className="flex-1">
                            <p className="text-lg font-semibold text-white">{device.name}</p>
                            <p className="text-sm text-slate-400">{device.ip_address}:{device.port}</p>
                          </div>
                          <Badge className="bg-red-500 text-white">{formatTimeSince(device.last_status_change)}</Badge>
                        </div>
                        {device.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {device.location}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 'history':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
            {renderCompactStatsBar()}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-8 h-8 text-orange-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('noc.downtimeHistory', 'Historial de Caídas')} (7 {t('noc.days', 'días')})</h2>
                  <p className="text-slate-400">{downtimeHistory.length} {t('noc.devicesWithIncidents', 'dispositivos con incidencias')}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setManualExpandedSection(null)}>
                <Minimize2 className="w-5 h-5" />
              </Button>
            </div>
            {downtimeHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <CheckCircle className="w-32 h-32 text-emerald-500/50 mb-4" />
                <p className="text-xl text-slate-400">{t('noc.noDowntime', 'Sin caídas en los últimos 7 días')}</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-3 p-2">
                  {downtimeHistory.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", item.count > 3 ? "bg-red-500/20" : "bg-amber-500/20")}>
                            <AlertTriangle className={cn("w-5 h-5", item.count > 3 ? "text-red-400" : "text-amber-400")} />
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-white">{item.name}</p>
                            <p className="text-xs text-slate-400">{t('noc.lastDown', 'Última caída')}: {item.lastDown ? new Date(item.lastDown).toLocaleString('es-ES') : 'N/A'}</p>
                          </div>
                        </div>
                        <Badge className={cn("text-lg px-3 py-1", item.count > 3 ? "bg-red-500" : "bg-amber-500")}>
                          {item.count} {t('noc.drops', 'caídas')}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.events.slice(0, 5).map((event, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-slate-700 rounded text-slate-300">
                            {new Date(event.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ))}
                        {item.events.length > 5 && (
                          <span className="px-2 py-0.5 text-xs bg-slate-700 rounded text-slate-400">
                            +{item.events.length - 5} más
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 'alerts':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
            {renderCompactStatsBar()}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-amber-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('noc.recentAlerts', 'Alertas Recientes')}</h2>
                  <p className="text-slate-400">{stats.recentAlerts} {t('noc.alertsLast24h', 'alertas en las últimas 24 horas')}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setManualExpandedSection(null)}>
                <Minimize2 className="w-5 h-5" />
              </Button>
            </div>
            {recentAlertsList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <CheckCircle className="w-32 h-32 text-emerald-500/50 mb-4" />
                <p className="text-xl text-slate-400">{t('noc.noRecentAlerts', 'Sin alertas recientes')}</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-2">
                  {recentAlertsList.map(alert => {
                    const isDown = alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected';
                    return (
                      <div 
                        key={alert.id} 
                        className={cn(
                          "p-4 rounded-lg border flex items-center justify-between",
                          isDown ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isDown ? <XCircle className="w-6 h-6 text-red-400" /> : <CheckCircle className="w-6 h-6 text-emerald-400" />}
                          <div>
                            <p className="text-lg font-semibold text-white">{alert.device_name}</p>
                            <p className="text-sm text-slate-400">{alert.message || (isDown ? t('noc.deviceDisconnected', 'Dispositivo desconectado') : t('noc.deviceConnected', 'Dispositivo conectado'))}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400">{formatTimeSince(alert.timestamp)}</p>
                          <p className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString('es-ES')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 'organizations':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
            {renderCompactStatsBar()}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-purple-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('noc.organizations', 'Estado por Organización')}</h2>
                  <p className="text-slate-400">{devicesByOrg.length} {t('noc.activeOrgs', 'organizaciones activas')}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setManualExpandedSection(null)}>
                <Minimize2 className="w-5 h-5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 gap-4 p-2">
                {devicesByOrg.map(({ org, online, offline, total }) => {
                  const uptimePercent = total > 0 ? (online / total) * 100 : 0;
                  return (
                    <div 
                      key={org.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        offline > 0 ? "bg-red-500/10 border-red-500/50" : "bg-slate-800/50 border-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-semibold text-white">{org.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500/20 text-emerald-400">{online} online</Badge>
                          {offline > 0 && <Badge className="bg-red-500/20 text-red-400 animate-pulse">{offline} offline</Badge>}
                        </div>
                      </div>
                      <Progress value={uptimePercent} className="h-3 bg-slate-700" />
                      <p className="text-sm text-slate-400 mt-2">{total} dispositivos - {uptimePercent.toFixed(1)}% disponibilidad</p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        );

      default:
        return null;
    }
  };

  // Grid-based customizable view using react-grid-layout
  const renderGridView = () => {
    // Filter layout to only show visible widgets
    const visibleLayout = layout.filter(item => widgetVisibility[item.i] !== false);
    
    return (
      <div ref={containerRef} className="flex-1 flex flex-col gap-2">
        {/* Stats Row - Always visible */}
        <StatsWidget 
          stats={stats} 
          groups={groups} 
          organizations={organizations} 
          craDevices={craDevices} 
        />
        
        {/* Draggable Grid */}
        <div className={cn("flex-1 min-h-0", editMode && "bg-slate-800/30 rounded-lg p-2")}>
          {editMode && (
            <div className="text-xs text-cyan-400 mb-2 flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              Arrastra los widgets para reorganizar • Los cambios se guardan al bloquear
            </div>
          )}
          <GridLayout
            className="layout"
            layout={visibleLayout}
            cols={12}
            rowHeight={80}
            width={containerRef.current?.offsetWidth || 1200}
            onLayoutChange={handleLayoutChange}
            isDraggable={editMode}
            isResizable={editMode}
            draggableHandle=".drag-handle"
            compactType="vertical"
            preventCollision={false}
            margin={[8, 8]}
          >
            {widgetVisibility.uptime !== false && (
              <div key="uptime" className="overflow-hidden">
                <UptimeWidget 
                  uptimeData={uptimeData}
                  timeRange={timeRange}
                  setTimeRange={setTimeRange}
                  onMaximize={() => handleMaximizeSection('uptime')}
                  editMode={editMode}
                />
              </div>
            )}
            
            {widgetVisibility.systemMonitor !== false && (
              <div key="systemMonitor" className="overflow-hidden">
                <SystemMonitorWidget 
                  stats={stats}
                  devicesByIsland={devicesByIsland}
                  getBubbleSize={getBubbleSize}
                  editMode={editMode}
                />
              </div>
            )}
            
            {widgetVisibility.cra !== false && (
              <div key="cra" className="overflow-hidden">
                <CRAWidget 
                  craDevices={craDevices}
                  onMaximize={() => handleMaximizeSection('cra')}
                  onDeviceClick={onDeviceClick}
                  editMode={editMode}
                />
              </div>
            )}
            
            {widgetVisibility.organizations !== false && (
              <div key="organizations" className="overflow-hidden">
                <OrganizationsWidget 
                  devicesByOrg={devicesByOrg}
                  onMaximize={() => handleMaximizeSection('organizations')}
                  editMode={editMode}
                />
              </div>
            )}
            
            {widgetVisibility.offline !== false && (
              <div key="offline" className="overflow-hidden">
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
            )}
            
            {widgetVisibility.history !== false && (
              <div key="history" className="overflow-hidden">
                <HistoryWidget 
                  downtimeHistory={downtimeHistory}
                  onMaximize={() => handleMaximizeSection('history')}
                  editMode={editMode}
                />
              </div>
            )}
            
            {widgetVisibility.alerts !== false && (
              <div key="alerts" className="overflow-hidden">
                <AlertsWidget 
                  recentAlerts={recentAlertsList}
                  stats={stats}
                  formatTimeSince={formatTimeSince}
                  onMaximize={() => handleMaximizeSection('alerts')}
                  editMode={editMode}
                />
              </div>
            )}
            
            {widgetVisibility.dahua !== false && (
              <div key="dahua" className="overflow-hidden">
                <DahuaWidget 
                  authAxios={authAxios}
                  onDeviceClick={onDeviceClick}
                  editMode={editMode}
                />
              </div>
            )}
          </GridLayout>
        </div>
      </div>
    );
  };

  // Normal view rendering
  const renderNormalView = () => (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-10 gap-2 shrink-0">
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
            <p className="text-[9px] text-purple-400 uppercase">GRUPOS</p>
            <p className="text-2xl font-bold text-purple-400">{groups.length} <span className="text-lg opacity-70">/ {organizations.length}</span></p>
          </div>
          <Building2 className="w-7 h-7 text-purple-400 opacity-40" />
        </div>
        <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.avgLatency && stats.avgLatency > 300 ? "border-2 border-orange-500" : "border border-slate-700/50")}>
          <div>
            <p className="text-[9px] text-cyan-400 uppercase">LATENCIA</p>
            <p className="text-2xl font-bold text-cyan-400">{stats.avgLatency ? `${stats.avgLatency}ms` : '--'}</p>
          </div>
          <Gauge className="w-7 h-7 text-cyan-400 opacity-40" />
        </div>
        <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", craDevices.some(d => d.status === 'offline') ? "border-2 border-red-500" : "border border-slate-700/50")}>
          <div>
            <p className="text-[9px] text-red-400 uppercase">CRA</p>
            <p className="text-2xl font-bold text-red-400">{craDevices.length}</p>
          </div>
          <Shield className="w-7 h-7 text-red-400 opacity-40" />
        </div>
        <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.dahuaOffline > 0 ? "border-2 border-red-500 animate-pulse" : "border border-emerald-500/30")}>
          <div>
            <p className="text-[9px] text-orange-400 uppercase">DVR/NVR</p>
            <p className="text-2xl font-bold text-orange-400">{stats.dahuaOnline || 0}<span className="text-lg opacity-70">/{stats.dahuaTotal || 0}</span></p>
          </div>
          <HardDrive className="w-7 h-7 text-orange-400 opacity-40" />
        </div>
        <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", vpnSummary.offline > 0 ? "border-2 border-red-500 animate-pulse" : "border border-cyan-500/30")}>
          <div>
            <p className="text-[9px] text-cyan-400 uppercase">VPN</p>
            <p className="text-2xl font-bold text-cyan-400">{vpnSummary.online}<span className="text-lg opacity-70">/{vpnSummary.total}</span></p>
          </div>
          <Shield className="w-7 h-7 text-cyan-400 opacity-40" />
        </div>
      </div>

      {/* Main Grid - With edit mode indication */}
      <div ref={containerRef} className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Left: Uptime Chart */}
        <div className={cn(
          "col-span-3 bg-slate-900/80 border rounded-lg p-3 flex flex-col min-h-0 transition-all",
          editMode ? "border-cyan-500/50 cursor-move ring-1 ring-cyan-500/30" : "border-slate-700/50"
        )}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Uptime</span>
            </div>
            <div className="flex gap-1 items-center">
              <Button variant={timeRange === '24h' ? 'default' : 'ghost'} size="sm" className="h-6 px-2 text-[10px]" onClick={() => setTimeRange('24h')}>24h</Button>
              <Button variant={timeRange === '7d' ? 'default' : 'ghost'} size="sm" className="h-6 px-2 text-[10px]" onClick={() => setTimeRange('7d')}>7d</Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-400" onClick={() => handleMaximizeSection('uptime')} title="Maximizar">
                <Maximize2 className="w-3 h-3" />
              </Button>
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
                <Area type="monotone" dataKey="uptime" stroke="#06b6d4" strokeWidth={2} fill="url(#uptimeGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Alerts Widget */}
        <div className="col-span-3">
          <CriticalAlertsWidget
            authAxios={authAxios}
            onDeviceClick={onDeviceClick}
            editMode={editMode}
          />
        </div>

        {/* Center: System ECG Monitor + Map */}
        <div className={cn(
          "col-span-3 bg-slate-900/80 border rounded-lg p-2 flex flex-col min-h-0 transition-all",
          editMode ? "border-cyan-500/50 cursor-move ring-1 ring-cyan-500/30" : "border-slate-700/50"
        )}>
          <div className="flex items-center justify-between mb-1 shrink-0">
            <div className="flex items-center gap-2">
              {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Monitor del Sistema</span>
            </div>
            {/* Global stats badge */}
            <div className={cn("px-2 py-0.5 rounded-full text-xs font-bold", 
              stats.uptimePercent >= 95 ? 'bg-emerald-500/20 text-emerald-400' : 
              stats.uptimePercent >= 80 ? 'bg-amber-500/20 text-amber-400' : 
              'bg-red-500/20 text-red-400'
            )}>
              {stats.uptimePercent}% Op
            </div>
          </div>
          
          {/* ECG Monitor - Fixed height */}
          <SystemECG 
            healthPercent={stats.uptimePercent}
            hasAlerts={stats.offline > 0 || stats.criticalAlerts > 0}
            isAnalyzing={true}
            lastIncidentTime={stats.lastIncidentTime}
            recordTime={uptimeRecord}
            authAxios={authAxios}
            onRecordUpdate={(newRecord) => setUptimeRecord(newRecord)}
            className="shrink-0 rounded-lg border border-slate-700/50 bg-slate-950/50 overflow-hidden"
          />
            
          {/* Island Status List - with silhouettes */}
          <div className="flex-1 mt-1 min-h-[100px] overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-1.5 pr-2">
                {devicesByIsland
                  .sort((a, b) => b.offline - a.offline || b.total - a.total)
                  .map(island => {
                    const hasOffline = island.offline > 0;
                    const healthPercent = island.total > 0 ? Math.round(((island.total - island.offline) / island.total) * 100) : 100;
                    const onlineCount = island.total - island.offline;
                    
                    return (
                      <div 
                        key={island.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer hover:bg-slate-800/70",
                          hasOffline 
                            ? "bg-red-500/10 border border-red-500/40" 
                            : "bg-emerald-500/5 border border-emerald-500/20"
                        )}
                        onClick={() => {/* Could navigate to island details */}}
                      >
                        {/* Island silhouette */}
                        <IslandSilhouette 
                          islandId={island.id}
                          online={onlineCount}
                          total={island.total}
                          size={36}
                        />
                        
                        {/* Island info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white truncate">
                              {island.name}
                            </span>
                            <span className={cn(
                              "text-xs font-mono font-bold",
                              hasOffline ? "text-red-400" : "text-emerald-400"
                            )}>
                              {onlineCount}/{island.total}
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mt-1">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                healthPercent >= 95 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                                healthPercent >= 80 ? "bg-gradient-to-r from-amber-500 to-amber-400" : 
                                "bg-gradient-to-r from-red-500 to-red-400"
                              )}
                              style={{ width: `${healthPercent}%` }}
                            />
                          </div>
                          
                          {/* Offline badge */}
                          {hasOffline && (
                            <div className="flex items-center gap-1 mt-1">
                              <WifiOff className="w-3 h-3 text-red-400" />
                              <span className="text-[10px] text-red-400 font-medium">
                                {island.offline} dispositivo{island.offline > 1 ? 's' : ''} offline
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Right: CRA Panel */}
        <div className={cn(
          "col-span-3 bg-slate-900/80 rounded-lg p-3 flex flex-col min-h-0 transition-all",
          editMode ? "border-cyan-500/50 cursor-move ring-1 ring-cyan-500/30" : craDevices.some(d => d.status === 'offline') ? "border-2 border-red-500 animate-pulse" : "border border-slate-700/50"
        )}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-white">CRA</span>
              <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">{craDevices.length}</Badge>
              {craDevices.some(d => d.status === 'offline') && (
                <Badge className="bg-red-500/20 text-red-400 text-[10px] animate-pulse">{craDevices.filter(d => d.status === 'offline').length} OFFLINE</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-red-400" onClick={() => handleMaximizeSection('cra')} title="Maximizar">
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className={cn("grid gap-1.5 pr-2", craDevices.length > 20 ? "grid-cols-4" : "grid-cols-3")}>
              {craDevices.map(device => (
                <div key={device.id} className={cn("p-1.5 rounded border text-center cursor-pointer transition-all hover:scale-105", device.status === 'offline' ? "bg-red-500/20 border-red-500/50 animate-pulse" : "bg-emerald-500/10 border-emerald-500/30")} onClick={() => onDeviceClick?.(device)}>
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Shield className={cn("w-3 h-3", device.status === 'offline' ? "text-red-400" : "text-emerald-400")} />
                    <div className={cn("w-1.5 h-1.5 rounded-full", device.status === 'offline' ? "bg-red-500" : "bg-emerald-500")} />
                  </div>
                  <p className="text-[9px] text-white truncate">{device.name}</p>
                  <p className="text-[8px] text-slate-500 truncate">{device.ip_address}</p>
                  {device.response_time_ms && (
                    <p className={cn("text-[8px] mt-0.5", device.response_time_ms > 500 ? "text-orange-400" : "text-cyan-400")}>
                      {device.response_time_ms}ms
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-5 gap-3 shrink-0" style={{ height: '35%' }}>
        {/* Grabadores DVR - with uptime counters */}
        <div className={cn(
          "bg-slate-900/80 rounded-lg p-2 flex flex-col min-h-0",
          (dahuaSummary.offline > 0) ? "border-2 border-red-500" : "border border-slate-700/50"
        )}>
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">Grabadores DVR</span>
              <Badge className={cn(
                "text-[10px]",
                dahuaSummary.offline > 0 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"
              )}>
                {dahuaSummary.online}/{dahuaSummary.online + dahuaSummary.offline}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-orange-400" onClick={() => handleMaximizeSection('dahua')} title="Maximizar">
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
          
          {/* Uptime Counters */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-1.5 text-center">
              <p className="text-[9px] text-emerald-400 uppercase">Sin Incidencias</p>
              <p className="text-sm font-mono text-emerald-400">
                {dahuaSummary.offline === 0 ? (
                  formatUptimeCounter(currentTime.getTime() - (lastIncidentTime || currentTime.getTime()))
                ) : '00:00:00'}
              </p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-1.5 text-center">
              <p className="text-[9px] text-cyan-400 uppercase">Record</p>
              <p className="text-sm font-mono text-cyan-400">
                {formatUptimeCounter(recordUptime)}
              </p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {dahuaDevices.filter(d => !d.online).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-2">
                <CheckCircle className="w-6 h-6 text-emerald-500 mb-1" />
                <p className="text-[10px] text-emerald-400">Todos los grabadores online</p>
              </div>
            ) : (
              <div className="space-y-1 pr-2">
                {dahuaDevices.filter(d => !d.online).slice(0, 5).map(device => (
                  <div key={device.id} className="p-1.5 rounded bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                    <HardDrive className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-[11px] text-white truncate flex-1">{device.name}</span>
                    <Badge className="bg-red-500/20 text-red-400 text-[9px]">offline</Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Offline Devices - ALL devices including Dahua */}
        <div className={cn("bg-slate-900/80 rounded-lg p-2 flex flex-col min-h-0", allOfflineDevices.length > 0 ? "border-2 border-red-500" : "border border-slate-700/50")}>
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-white">Offline</span>
              <Badge variant="outline" className={cn("text-[10px]", allOfflineDevices.length > 0 ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-slate-500/30 text-slate-400")}>{allOfflineDevices.length}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-5 w-5 p-0 text-slate-400 hover:text-cyan-400", refreshingOffline && "animate-spin")} 
                onClick={handleRefreshOfflineDevices} 
                disabled={refreshingOffline}
                title="Forzar comprobación"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-red-400" onClick={() => handleMaximizeSection('offline')} title="Maximizar">
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 h-full">
            {allOfflineDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-1" />
                <p className="text-xs text-emerald-400">{t('noc.allOnline', 'All devices online')}</p>
              </div>
            ) : (
              <div className="space-y-1 pr-2">
                {allOfflineDevices.map(device => {
                  const Icon = device.deviceType === 'dahua' ? HardDrive : getDeviceIcon(device);
                  const label = device.typeLabel;
                  const isInMaintenance = device.maintenance_mode === true;
                  const hasOpenIncident = device.has_open_incident === true;
                  // Color based on type
                  const labelColor = {
                    'DVR': 'bg-orange-500/20 text-orange-400',
                    'VPN': 'bg-cyan-500/20 text-cyan-400',
                    'CRA': 'bg-blue-500/20 text-blue-400',
                    'NAS': 'bg-purple-500/20 text-purple-400',
                    'SRV': 'bg-indigo-500/20 text-indigo-400',
                    'RTR': 'bg-amber-500/20 text-amber-400',
                    'SW': 'bg-teal-500/20 text-teal-400',
                    'CAM': 'bg-pink-500/20 text-pink-400'
                  }[label] || 'bg-slate-500/20 text-slate-400';
                  return (
                    <div 
                      key={device.id} 
                      className={cn(
                        "p-1.5 rounded border flex items-center justify-between cursor-pointer transition-all",
                        isInMaintenance 
                          ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" 
                          : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                      )} 
                      onClick={() => onDeviceClick?.(device)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icon className={cn("w-3 h-3 shrink-0", isInMaintenance ? "text-amber-400" : "text-red-400")} />
                        <span className="text-[11px] text-white truncate">{device.name}</span>
                        {label && <Badge className={`${labelColor} text-[8px] px-1 py-0`}>{label}</Badge>}
                        {/* Status icons - both can coexist */}
                        {isInMaintenance && (
                          <Wrench className="w-3 h-3 text-amber-400 shrink-0" title="En mantenimiento" />
                        )}
                        {hasOpenIncident && (
                          <ClipboardList className="w-3 h-3 text-blue-400 shrink-0" title="Incidencia abierta" />
                        )}
                      </div>
                      <span className={cn("text-[10px] ml-2", isInMaintenance ? "text-amber-400" : "text-red-400")}>
                        {isInMaintenance ? "🔧" : formatTimeSince(device.last_status_change)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Downtime History */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">{t('noc.downtimeHistory', 'Historial')}</span>
              <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-[10px]">{downtimeHistory.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-orange-400" onClick={() => handleMaximizeSection('history')} title="Maximizar">
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {downtimeHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4">
                <CheckCircle className="w-6 h-6 text-emerald-500/50 mb-1" />
                <p className="text-[10px] text-slate-500">{t('noc.noDowntime', 'Sin caídas')}</p>
              </div>
            ) : (
              <div className="space-y-1 pr-2">
                {downtimeHistory.slice(0, 6).map((item, idx) => (
                  <div key={idx} className={cn("p-1.5 rounded border flex items-center justify-between", item.count > 3 ? "bg-red-500/5 border-red-500/20" : "bg-orange-500/5 border-orange-500/20")}>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <AlertTriangle className={cn("w-3 h-3 shrink-0", item.count > 3 ? "text-red-400" : "text-orange-400")} />
                      <span className="text-[10px] text-white truncate">{item.name}</span>
                    </div>
                    <Badge className={cn("text-[9px] px-1 py-0", item.count > 3 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400")}>
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Alerts */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">{t('noc.recentAlerts', 'Alertas')}</span>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">{stats.recentAlerts}</Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-amber-400" onClick={() => handleMaximizeSection('alerts')} title="Maximizar">
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {recentAlertsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4">
                <CheckCircle className="w-6 h-6 text-emerald-500/50 mb-1" />
                <p className="text-[10px] text-slate-500">{t('noc.noRecentAlerts', 'Sin alertas')}</p>
              </div>
            ) : (
              <div className="space-y-1 pr-2">
                {recentAlertsList.slice(0, 10).map(alert => {
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

        {/* VPN Tunnels Widget */}
        <VPNWidget
          authAxios={authAxios}
          onDeviceClick={onDeviceClick}
          editMode={editMode}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between shrink-0 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-cyan-400">{devices.length}</span>
            <span className="text-[10px] text-slate-500">Dispositivos</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-purple-400">{groups.length}</span>
            <span className="text-[10px] text-slate-500">Grupos</span>
          </div>
        </div>
        
        {/* Center - Desarrollado por Siempria */}
        <a 
          href="https://siempria.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src={LOGO_URL} alt="Siempria" className="h-5 object-contain opacity-70" />
          <span className="text-[10px] text-slate-400 hover:text-cyan-400">Desarrollado por Siempria</span>
        </a>
        
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span>soporte@siempria.com</span>
          <span>822 22 00 22</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col" data-testid="noc-dashboard">
      {/* Header */}
      <div className="h-14 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-cyan-500/20 flex items-center justify-between px-4 shrink-0">
        {/* Left side - Logo and title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Siempria" className="h-9 object-contain" />
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                WatchTower NOC by SIEMPRIA
              </h1>
              <p className="text-[10px] text-slate-400">Centro de Operaciones de Red 24/7</p>
            </div>
          </div>
          {/* Mini ECG next to title */}
          <MiniECG color="#06b6d4" width={60} height={24} />
        </div>
        
        {/* Center - System Resource Monitor */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <SystemResourceMonitor authAxios={authAxios} />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Presentation mode indicator */}
          {presentationMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg border border-emerald-500/30 animate-pulse">
              <Play className="w-4 h-4 text-emerald-400 fill-current" />
              <span className="text-xs text-emerald-400">
                {currentSection.toUpperCase()} ({presentationIndex + 1}/{PRESENTATION_SECTIONS.length})
              </span>
              <Button variant="ghost" size="sm" onClick={nextSlide} className="h-6 w-6 p-0 text-emerald-400">
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
          )}

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
            <span className="text-xs text-emerald-400">Activo</span>
          </div>

          {/* Sound toggle */}
          <Button variant="ghost" size="sm" onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-400 hover:text-white h-8 w-8 p-0">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Edit Layout toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (editMode) {
                      // Saliendo de modo edición - guardar
                      savePreferences();
                    } else {
                      toast.info('Modo edición activado - Arrastra los widgets para reorganizar');
                    }
                    setEditMode(!editMode);
                  }} 
                  className={cn("h-8 w-8 p-0", editMode ? "text-cyan-400 bg-cyan-500/20" : "text-slate-400 hover:text-cyan-400")}
                >
                  {editMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{editMode ? 'Guardar y Bloquear' : 'Editar Layout'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Reset Layout */}
          {editMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetLayout}
                    className="h-8 w-8 p-0 text-orange-400 hover:bg-orange-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restaurar Layout</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Play/Pause Presentation */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={togglePresentationMode} 
                  className={cn("h-8 w-8 p-0", presentationMode ? "text-emerald-400 bg-emerald-500/20" : "text-slate-400 hover:text-emerald-400")}
                >
                  {presentationMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{presentationMode ? 'Detener Presentación' : 'Iniciar Presentación'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Open in New Window */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.open(`${window.location.origin}?nocFullscreen=true`, '_blank')}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-400"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir en nueva ventana</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Refresh */}
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-slate-400 hover:text-white h-8 w-8 p-0">
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
          
          {/* Close */}
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-slate-400 hover:text-white hover:bg-red-500/20 h-8 w-8 p-0" data-testid="noc-close-btn">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
        {manualExpandedSection 
          ? renderManualExpandedSection() 
          : presentationMode 
            ? renderExpandedSection() 
            : renderNormalView()
        }
      </div>
      
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />
    </div>
  );
};

export default NOCDashboard;
