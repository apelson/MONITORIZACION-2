import { useState, useEffect, useCallback, createContext, useContext, memo, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Server, Plus, RefreshCw, Settings, History, Bell, Trash2, Edit, 
  Activity, Clock, AlertCircle, Wifi, WifiOff, Mail, Send, Users,
  FolderOpen, LogOut, User, Shield, Eye, Lock, ChevronDown, Building2,
  Camera, HardDrive, Network, Router, Monitor, Printer, Box, ChevronRight,
  MapPin, FileText, Image, Tag, Layers, Download, FileSpreadsheet, FileIcon,
  Info, Globe, Calendar, Copy, Cctv, ExternalLink, GripVertical, Phone,
  BarChart3, TrendingUp, Flame, ArrowUpDown, Wrench, Trophy, PieChart, Upload,
  Archive, RotateCcw, CloudDownload, FolderArchive, FileSearch, AlertTriangle, Cpu, Thermometer, HardDrive as HardDriveIcon, X, Search, ClipboardList, CheckCircle, MessageSquare, Smartphone,
  Volume2, VolumeX, Database, VideoOff, Video, Menu
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LanguageSelector } from "@/components/LanguageSelector";
import InfrastructurePanel from "@/components/panels/InfrastructurePanel";
import DeviceGallery from "@/components/panels/DeviceGallery";
import CRADashboard from "@/components/panels/CRADashboard";
import LiveViewer from "@/components/panels/LiveViewer";
import AlertsPanel from "@/components/panels/AlertsPanel";
import StatisticsPanel from "@/components/panels/StatisticsPanel";
import IncidentsPanel from "@/components/panels/IncidentsPanel";
import AccessLogsPanel from "@/components/panels/AccessLogsPanel";
import BackupPanel from "@/components/panels/BackupPanel";
import DailyReportPanel from "@/components/panels/DailyReportPanel";
import ScheduledReportsPanel from "@/components/panels/ScheduledReportsPanel";
import OrganizationsPanel from "@/components/panels/OrganizationsPanel";
import DeviceTypesPanel from "@/components/panels/DeviceTypesPanel";
import UsersPanel from "@/components/panels/UsersPanel";
import SettingsPanel from "@/components/panels/SettingsPanel";
import IntegrationsPanel from "@/components/panels/IntegrationsPanel";
import MaintenancePanel from "@/components/panels/MaintenancePanel";
import DahuaDevicesPanel from "@/components/panels/DahuaDevicesPanel";
import CRAFloatingButton from "@/components/common/CRAFloatingButton";
import LiveViewerFloatingButton from "@/components/common/LiveViewerFloatingButton";
import NOCFloatingButton from "@/components/common/NOCFloatingButton";
import NOCDashboard from "@/components/panels/NOCDashboard";
import NotificationSettings from "@/components/settings/NotificationSettings";
import TelegramSettings from "@/components/settings/TelegramSettings";
import ReportSettings from "@/components/settings/ReportSettings";
import AIInsightsPanel from "@/components/settings/AIInsightsPanel";
import SLAReportsPanel from "@/components/settings/SLAReportsPanel";
import SystemStatusDashboard from "@/components/settings/SystemStatusDashboard";
import RolesManager from "@/components/settings/RolesManager";
import SuperAdminTab from "@/components/settings/SuperAdminTab";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import TenantAdminsManager from "@/components/settings/TenantAdminsManager";
import SectionLoader, { useDelayedLoading } from "@/components/common/SectionLoader";
import { AlertBell, DeviceStatusGrid, DeviceHistoryModal } from "@/components/alerts";
import useWebSocketAlerts from "@/hooks/useWebSocketAlerts";
import LoginPage from "@/components/auth/LoginPage";
import ServerCard from "@/components/devices/ServerCard";

import { API_URL as BACKEND_URL, API } from './config';
// Logo principal de Siempria (hexágono azul)
const LOGO_URL = "/logo512.png";
const LOGO_HORIZONTAL_URL = "/logo512.png";
const MOBOTIX_LOGO_URL = "https://www.mobotix.com/sites/default/files/2019-10/MOBOTIX-Logo.svg";

// ============ PWA INSTALL PROMPT ============
const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsIOS(isIOSDevice);
    
    // Don't show if already installed
    if (isStandalone) return;
    
    // Check if dismissed recently (24h)
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) return;

    // For Android/Desktop - listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // For iOS - show after 5 seconds if not installed
    if (isIOSDevice && !isStandalone) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4 rounded-xl shadow-2xl z-[10000] animate-in slide-in-from-bottom-5">
      <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">Instalar Siempria Monitor</h4>
          <p className="text-xs text-white/80 mt-1">
            {isIOS 
              ? "Pulsa el botón compartir y 'Añadir a pantalla de inicio'"
              : "Instala la app para acceso rápido y notificaciones"
            }
          </p>
          {!isIOS && (
            <Button 
              size="sm" 
              variant="secondary" 
              className="mt-2 bg-white text-blue-600 hover:bg-white/90"
              onClick={handleInstall}
            >
              Instalar App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============ LOADING SCREEN ============
const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Iniciando sistema...");
  
  useEffect(() => {
    const messages = [
      "Iniciando sistema de seguridad...",
      "Conectando con servidores...",
      "Verificando credenciales...",
      "Cargando dispositivos de vigilancia...",
      "Sistema listo"
    ];
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(Math.min(currentProgress, 100));
      
      const msgIndex = Math.min(Math.floor(currentProgress / 25), messages.length - 1);
      setStatusText(messages[msgIndex]);
    }, 300);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated security grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0,163,217,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,217,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>
      
      {/* Scanning line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30" 
          style={{ animation: 'scanLine 3s ease-in-out infinite' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Camera icon with pulse */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-cyan-500 rounded-full blur-xl opacity-20 animate-pulse" style={{ transform: 'scale(1.5)' }} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-full border border-cyan-500/30 shadow-2xl">
            <Cctv className="w-16 h-16 text-cyan-400" style={{ animation: 'cameraMove 4s ease-in-out infinite' }} />
          </div>
          {/* Recording indicator */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-red-400 font-mono">REC</span>
          </div>
        </div>
        
        {/* Logo container */}
        <div className="flex items-center justify-center mb-6 gap-4">
          <img 
            src={LOGO_URL} 
            alt="Siempria" 
            className="h-16 md:h-20 object-contain drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 0 15px rgba(0,163,217,0.4))' }}
          />
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent" />
          <div className="bg-white rounded-lg px-3 py-2 shadow-xl">
            <img 
              src={MOBOTIX_LOGO_URL} 
              alt="Mobotix" 
              className="h-8 md:h-10 object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-lg font-bold text-slate-800">MOBOTIX</span>'; }}
            />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-white text-2xl md:text-3xl font-light mb-1 tracking-wide">
          Network Monitor
        </h1>
        <p className="text-cyan-400/80 text-sm mb-6 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Sistema de Vigilancia Profesional
        </p>
        
        {/* Progress bar */}
        <div className="w-72 md:w-96 mb-4">
          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" 
                style={{ animation: 'shimmer 1.5s infinite' }} />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{Math.round(progress)}%</span>
            <span>{statusText}</span>
          </div>
        </div>
        
        {/* Security badges */}
        <div className="flex items-center gap-4 mt-4 text-slate-500 text-xs">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Conexión segura</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Encriptación AES-256</span>
          </div>
        </div>
      </div>
      
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-500/30" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-cyan-500/30" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-cyan-500/30" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-cyan-500/30" />
      
      {/* Footer */}
      <div className="absolute bottom-4 text-center text-slate-600 text-xs">
        © {new Date().getFullYear()} Siempria - Distribuidor Autorizado Mobotix
      </div>
    </div>
  );
};

// ============ LOGIN PAGE ============
const OFFLINE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23374151' width='400' height='200'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='14'%3ECÁMARA OFFLINE%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='%236B7280' font-family='Arial' font-size='11'%3ESiempria Network Monitor%3C/text%3E%3C/svg%3E";

// Icon mapping
const ICON_MAP = {
  camera: Cctv, "hard-drive": HardDrive, network: Network, router: Router,
  server: Server, monitor: Monitor, printer: Printer, wifi: Wifi,
  shield: Shield, box: Box, layers: Layers
};

const getIcon = (iconName) => ICON_MAP[iconName] || Server;

// ============ AUTH CONTEXT ============
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState(null);

  // Create axios instance that always reads fresh token from localStorage
  const authAxios = useMemo(() => {
    const instance = axios.create({ baseURL: API });
    instance.interceptors.request.use((config) => { 
      const currentToken = localStorage.getItem("token");
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`; 
      }
      return config; 
    });
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.config?.responseType === 'blob') {
          error.response = { data: null, status: error.response?.status || 0 };
        }
        // Auto logout on 401
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
        }
        return Promise.reject(error);
      }
    );
    return instance;
  }, []);

  // Fetch user permissions
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await authAxios.get('/roles/my-permissions');
      setUserPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Default to admin permissions for backwards compatibility
      setUserPermissions({
        permissions: {
          devices: ['view', 'edit', 'delete', 'create'],
          gallery: ['view', 'upload', 'delete'],
          cra: ['view', 'manage'],
          live: ['view'],
          statistics: ['view', 'export'],
          alerts: ['view', 'acknowledge', 'delete'],
          users: ['view', 'edit', 'delete', 'create'],
          settings: ['view', 'edit'],
          export: ['pdf', 'excel', 'csv'],
          organizations: ['view', 'edit', 'delete', 'create'],
          groups: ['view', 'edit', 'delete', 'create'],
          reports: ['view', 'create', 'schedule'],
          incidents: ['view', 'create', 'edit', 'delete'],
          roles: ['view', 'edit', 'delete', 'create']
        },
        group_access: 'all',
        organization_access: 'all'
      });
    }
  }, [authAxios]);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          setUser(response.data.user);
        } catch (error) {
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  // Fetch permissions when user is set
  useEffect(() => {
    if (user && token) {
      fetchPermissions();
    }
  }, [user, token, fetchPermissions]);

  const login = async (username, password) => {
    const response = await axios.post(`${API}/auth/login`, { username, password });
    const { token: accessToken, user: userData } = response.data;
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const logout = () => { 
    localStorage.removeItem("token"); 
    setToken(null); 
    setUser(null); 
    setUserPermissions(null);
  };

  // Helper function to check if user has permission
  const hasPermission = (section, action) => {
    if (!userPermissions?.permissions) return true; // Default allow for backwards compatibility
    const sectionPerms = userPermissions.permissions[section] || [];
    return sectionPerms.includes(action);
  };

  // Map section names to feature flag keys
  const SECTION_TO_FLAG_MAP = {
    'devices': 'devices',
    'alerts': 'alerts',
    'cra': 'cra',
    'dahua': 'dahua',
    'live': 'live_view',
    'incidents': 'incidents',
    'statistics': 'reports',
    'reports': 'reports',
    'ai': 'ai_insights',
    'gallery': 'gallery',
  };

  // Helper function to check if user can access a section
  const canAccessSection = (section) => {
    // First check role-based permissions
    if (userPermissions?.permissions) {
      const sectionPerms = userPermissions.permissions[section] || [];
      if (sectionPerms.length === 0) return false;
    }
    
    // Then check feature flags for tenant_admin users
    if (user?.feature_flags && user?.role === 'tenant_admin') {
      const flagKey = SECTION_TO_FLAG_MAP[section];
      if (flagKey && user.feature_flags[flagKey] === false) {
        return false;
      }
    }
    
    return true;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      loading, 
      authAxios, 
      userPermissions,
      hasPermission,
      canAccessSection
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============ COMPONENTS ============
const StatusDot = ({ status }) => {
  const cls = { online: "status-dot-online animate-pulse-online", offline: "status-dot-offline", checking: "status-dot-checking animate-pulse", unknown: "status-dot-unknown" }[status] || "status-dot-unknown";
  return <div className={`status-dot ${cls}`} />;
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const cfg = { 
    online: { label: t('devices.online'), cls: "badge-online" }, 
    offline: { label: t('devices.offline'), cls: "badge-offline" }, 
    checking: { label: t('devices.checking'), cls: "badge-checking" }, 
    unknown: { label: t('devices.unknown'), cls: "bg-muted text-muted-foreground" } 
  }[status] || { label: "?", cls: "bg-muted" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs font-medium px-2 py-0.5`}>{cfg.label}</Badge>;
};

const RoleBadge = ({ role }) => {
  const { t } = useTranslation();
  const cfg = { 
    admin: { label: t('users.roleAdmin'), cls: "bg-red-100 text-red-700 border-red-200" }, 
    manager: { label: t('users.roleManager', 'Gestor'), cls: "bg-blue-100 text-blue-700 border-blue-200" }, 
    viewer: { label: t('users.roleViewer'), cls: "bg-gray-100 text-gray-700 border-gray-200" },
    operator: { label: t('users.roleOperator', 'Operador'), cls: "bg-purple-100 text-purple-700 border-purple-200" },
    technician: { label: t('users.roleTechnician'), cls: "bg-amber-100 text-amber-700 border-amber-200" }
  }[role] || { label: role, cls: "bg-gray-100" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs`}>{cfg.label}</Badge>;
};

// ============ SORTABLE CARD WRAPPER ============
const SortableCard = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-2 z-10 p-1.5 bg-white/80 rounded-md cursor-grab active:cursor-grabbing hover:bg-white shadow-sm opacity-0 hover:opacity-100 transition-opacity"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      {children}
    </div>
  );
};

// ============ FIRMWARE BADGE WITH POPOVER ============
const FirmwareBadge = ({ device }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Check if device is a Mobotix camera
  const isMobotix = device.brand?.toLowerCase().includes('mobotix');
  
  // Get cached firmware - show full version
  const firmwareVersion = device.firmware_version;
  // Clean up the version for display - remove MX- prefix but keep full version
  const displayVersion = firmwareVersion ? firmwareVersion.replace('MX-', '') : null;
  
  const fetchInfo = async () => {
    if (info || loading) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/devices/${device.id}/mobotix-info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInfo(data);
      }
    } catch (e) {
      console.error("Error fetching camera info:", e);
    }
    setLoading(false);
  };
  
  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (isOpen && !info) {
      fetchInfo();
    }
  };
  
  if (!isMobotix) return null;
  
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button 
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors cursor-pointer border border-blue-200 whitespace-nowrap max-w-full"
          title="Ver información del firmware"
        >
          <Cpu className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{displayVersion || 'Info'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            <div>
              <p className="font-semibold text-sm">{device.name}</p>
              <p className="text-xs opacity-90">Información del dispositivo</p>
            </div>
          </div>
        </div>
        
        <div className="p-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : info ? (
            <div className="space-y-3 text-sm">
              {/* System */}
              {info.system && Object.keys(info.system).length > 0 && (
                <div>
                  <p className="font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Sistema
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {info.system.software && <><span className="text-muted-foreground">Firmware:</span><span className="font-mono font-medium">{info.system.software.split(' ')[0]}</span></>}
                    {info.system.model && <><span className="text-muted-foreground">Modelo:</span><span className="font-medium">{info.system.model.toUpperCase()}</span></>}
                    {info.system.hardware && <><span className="text-muted-foreground">Hardware:</span><span>{info.system.hardware}</span></>}
                    {info.system.image_sensor && <><span className="text-muted-foreground">Sensor:</span><span>{info.system.image_sensor.split(',')[0]}</span></>}
                    {info.system.uptime && <><span className="text-muted-foreground">Uptime:</span><span className="font-mono">{info.system.uptime}</span></>}
                  </div>
                </div>
              )}
              
              {/* Sensors */}
              {info.sensors && Object.keys(info.sensors).length > 0 && (
                <div>
                  <p className="font-semibold text-orange-600 mb-1 flex items-center gap-1">
                    <Thermometer className="w-3 h-3" /> Sensores
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {info.sensors.temperature && <><span className="text-muted-foreground">Temperatura:</span><span className="font-medium">{info.sensors.temperature.replace('&deg;', '°')}</span></>}
                    {info.sensors.illumination && <><span className="text-muted-foreground">Iluminación:</span><span>{info.sensors.illumination}</span></>}
                  </div>
                </div>
              )}
              
              {/* Storage */}
              {info.storage && Object.keys(info.storage).length > 0 && (
                <div>
                  <p className="font-semibold text-green-600 mb-1 flex items-center gap-1">
                    <HardDriveIcon className="w-3 h-3" /> Almacenamiento
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {info.storage.current_usage && <><span className="text-muted-foreground">Uso:</span><span>{info.storage.current_usage}</span></>}
                    {info.storage.maximum_size && <><span className="text-muted-foreground">Capacidad:</span><span>{info.storage.maximum_size}</span></>}
                    {info.storage.flash_wear && <><span className="text-muted-foreground">Desgaste SD:</span><span className={parseInt(info.storage.flash_wear) > 100 ? 'text-red-600 font-medium' : ''}>{info.storage.flash_wear}</span></>}
                    {info.storage.sequences && <><span className="text-muted-foreground">Secuencias:</span><span>{info.storage.sequences}</span></>}
                  </div>
                </div>
              )}
              
              {/* Networking */}
              {info.networking && Object.keys(info.networking).length > 0 && (
                <div>
                  <p className="font-semibold text-purple-600 mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Red
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {info.networking.camera_name && <><span className="text-muted-foreground">Nombre:</span><span>{info.networking.camera_name}</span></>}
                    {info.networking.ip_address && <><span className="text-muted-foreground">IP Local:</span><span className="font-mono">{info.networking.ip_address}</span></>}
                    {info.networking.link_speed && <><span className="text-muted-foreground">Velocidad:</span><span>{info.networking.link_speed}</span></>}
                  </div>
                </div>
              )}
              
              {/* Image */}
              {info.image && Object.keys(info.image).length > 0 && (
                <div>
                  <p className="font-semibold text-cyan-600 mb-1 flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Imagen
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {info.image.image_properties && <><span className="text-muted-foreground">Resolución:</span><span>{info.image.image_properties.split(',')[0]}</span></>}
                    {info.image.frame_rate && <><span className="text-muted-foreground">FPS:</span><span>{info.image.frame_rate}</span></>}
                    {info.image.video_codec && <><span className="text-muted-foreground">Codec:</span><span>{info.image.video_codec.split(' ')[0]}</span></>}
                  </div>
                </div>
              )}
              
              {info.errors && info.errors.length > 0 && (
                <div className="text-xs text-red-500 mt-2">
                  <p className="font-medium">Errores:</p>
                  {info.errors.map((err, i) => <p key={i}>{err}</p>)}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No se pudo obtener información</p>
          )}
        </div>
        
        <div className="border-t px-3 py-2 bg-gray-50 rounded-b-lg">
          <p className="text-[10px] text-muted-foreground text-center">
            Haz clic fuera para cerrar
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};


// ============ DIALOGS ============
const DeviceFormDialog = ({ open, onOpenChange, device, organizations, groups, deviceTypes, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "", camera_protocol: "http", camera_user: "", camera_password: "", camera_path: "", has_statistics: false, is_cra: false });
  const [saving, setSaving] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form only once when dialog opens
  useEffect(() => {
    if (open && !initialized) {
      if (device) {
        setFormData({ 
          name: device.name || "", ip_address: device.ip_address || "", port: device.port || 80, 
          description: device.description || "", group_id: device.group_id || "", 
          device_type_id: device.device_type_id || "", brand: device.brand || "", 
          model: device.model || "", location: device.location || "", notes: device.notes || "", 
          image_url: device.image_url || "",
          camera_protocol: device.camera_protocol || "http",
          camera_user: device.camera_user || "",
          camera_password: device.camera_password || "",
          camera_path: device.camera_path || "",
          has_statistics: device.has_statistics || false,
          is_cra: device.is_cra || false
        });
        const grp = groups.find(g => g.id === device.group_id);
        if (grp) setSelectedOrgId(grp.organization_id);
      } else {
        setFormData({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "", camera_protocol: "http", camera_user: "", camera_password: "", camera_path: "", has_statistics: false, is_cra: false });
        setSelectedOrgId("");
      }
      setInitialized(true);
    }
    if (!open) {
      setInitialized(false);
    }
  }, [open, device, groups, initialized]);

  const filteredGroups = selectedOrgId ? groups.filter(g => g.organization_id === selectedOrgId) : groups;
  const isCamera = formData.device_type_id === "type-camera" || deviceTypes.find(t => t.id === formData.device_type_id)?.icon === "camera";
  const isCloning = device && !device.id;

  // Build preview URL
  const previewUrl = formData.camera_user && formData.camera_password && formData.camera_path && formData.ip_address
    ? `${formData.camera_protocol}://${formData.camera_user}:****@${formData.ip_address}:${formData.port}${formData.camera_path}`
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ip_address || !formData.port) { toast.error("Completa los campos requeridos"); return; }
    setSaving(true);
    // When cloning, pass null as deviceId to create new device
    await onSave({ ...formData, group_id: formData.group_id || null, device_type_id: formData.device_type_id || null }, isCloning ? null : device?.id);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="device-form-dialog" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCloning && <Copy className="w-5 h-5 text-blue-600" />}
            {isCloning ? t('devices.cloneDevice') : device?.id ? t('devices.editDevice') : t('devices.addDevice')}
          </DialogTitle>
          {isCloning && (
            <p className="text-sm text-muted-foreground">{t('devices.cloneDescription', 'Modifica el puerto y nombre para crear el nuevo dispositivo')}</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2"><Label>{t('common.name')} *</Label><Input data-testid="device-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('devices.ipAddress')} *</Label><Input data-testid="device-ip-input" className="font-mono" value={formData.ip_address} onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('devices.port')} *</Label><Input data-testid="device-port-input" type="number" className="font-mono" value={formData.port} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 80 })} /></div>
            
            <div className="space-y-2">
              <Label>{t('devices.deviceType')}</Label>
              <Select value={formData.device_type_id || "none"} onValueChange={(v) => {
                const newTypeId = v === "none" ? "" : v;
                const selectedType = deviceTypes.find(t => t.id === newTypeId);
                const isNewCamera = selectedType?.icon === "camera" || newTypeId === "type-camera";
                
                // Auto-fill camera defaults when selecting camera type
                if (isNewCamera && !formData.camera_path) {
                  setFormData({ 
                    ...formData, 
                    device_type_id: newTypeId,
                    camera_path: "/record/current.jpg",
                    camera_protocol: formData.camera_protocol || "http"
                  });
                } else {
                  setFormData({ ...formData, device_type_id: newTypeId });
                }
              }}>
                <SelectTrigger><SelectValue placeholder={t('devices.selectType', 'Seleccionar tipo')} /></SelectTrigger>
                <SelectContent>
                <SelectItem value="none">{t('devices.noType', 'Sin tipo')}</SelectItem>
                  {deviceTypes.map((t) => { const Icon = getIcon(t.icon); return <SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color: t.color }} />{t.name}</div></SelectItem>; })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('organizations.title', 'Organización')}</Label>
              <Select value={selectedOrgId || "none"} onValueChange={(v) => { setSelectedOrgId(v === "none" ? "" : v); setFormData({ ...formData, group_id: "" }); }}>
                <SelectTrigger><SelectValue placeholder={t('common.select', 'Seleccionar')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.all', 'Todas')}</SelectItem>
                  {organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>{t('devices.group', 'Grupo')}</Label>
              <Select value={formData.group_id || "none"} onValueChange={(v) => setFormData({ ...formData, group_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="device-group-select"><SelectValue placeholder={t('devices.selectGroup', 'Sin grupo')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('devices.selectGroup', 'Sin grupo')}</SelectItem>
                  {filteredGroups.map((g) => <SelectItem key={g.id} value={g.id}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />{g.name}</div></SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Camera fields - only show when type is camera */}
            {isCamera && (
              <>
                <Separator className="col-span-2" />
                <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-purple-600">
                  <Camera className="w-4 h-4" />
                  Configuración de Cámara
                </div>
                <div className="space-y-2">
                  <Label>{t('devices.protocol', 'Protocolo')}</Label>
                  <Select value={formData.camera_protocol} onValueChange={(v) => setFormData({ ...formData, camera_protocol: v })}>
                    <SelectTrigger data-testid="camera-protocol-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('devices.cameraUser', 'Usuario cámara')}</Label>
                  <Input placeholder="admin" value={formData.camera_user} onChange={(e) => setFormData({ ...formData, camera_user: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('devices.cameraPassword', 'Contraseña cámara')}</Label>
                  <Input type="password" placeholder="••••••••" value={formData.camera_password} onChange={(e) => setFormData({ ...formData, camera_password: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t('devices.imagePath', 'Ruta de imagen')}</Label>
                  <div className="flex gap-2">
                    <Select value={formData.camera_path || "custom"} onValueChange={(v) => setFormData({ ...formData, camera_path: v === "custom" ? "" : v })}>
                      <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('devices.selectPath', 'Seleccionar ruta')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="/record/current.jpg">{t('devices.pathMobotixRecord', 'Mobotix (record)')}</SelectItem>
                        <SelectItem value="/cgi-bin/image.jpg">{t('devices.pathMobotixCgi', 'Mobotix (cgi-bin)')}</SelectItem>
                        <SelectItem value="/snap.jpg">{t('devices.pathGeneric', 'Genérico (/snap.jpg)')}</SelectItem>
                        <SelectItem value="/jpg/image.jpg">{t('devices.pathAxis', 'Axis (/jpg/image.jpg)')}</SelectItem>
                        <SelectItem value="/Streaming/channels/1/picture">{t('devices.pathHikvision', 'Hikvision')}</SelectItem>
                        <SelectItem value="custom">{t('devices.pathCustom', 'Personalizada...')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="/ruta/imagen.jpg" 
                      className="font-mono flex-1" 
                      value={formData.camera_path} 
                      onChange={(e) => setFormData({ ...formData, camera_path: e.target.value })} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t('devices.pathHint', 'Selecciona una ruta predefinida o escribe una personalizada')}</p>
                </div>
                {previewUrl && (
                  <div className="col-span-2 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">URL generada:</p>
                    <code className="text-xs font-mono break-all">{previewUrl}</code>
                  </div>
                )}
                {/* Mobotix Statistics checkbox */}
                <div className="col-span-2 flex items-center gap-3 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
                  <Switch 
                    id="has-statistics" 
                    checked={formData.has_statistics} 
                    onCheckedChange={(checked) => setFormData({ ...formData, has_statistics: checked })}
                  />
                  <div className="flex-1">
                    <Label htmlFor="has-statistics" className="cursor-pointer font-medium text-cyan-700">{t('devices.enableStatistics', 'Estadísticas MxAnalytics')}</Label>
                    <p className="text-xs text-cyan-600">{t('devices.statsHint', 'Habilita si la cámara tiene conteo de personas y mapa de calor (Mobotix C25/C26)')}</p>
                  </div>
                  <Activity className="w-5 h-5 text-cyan-500" />
                </div>
              </>
            )}

            <Separator className="col-span-2" />
            <p className="col-span-2 text-sm font-medium text-muted-foreground">{t('devices.additionalInfo', 'Información adicional')}</p>

            <div className="space-y-2"><Label>{t('devices.brand', 'Marca')}</Label><Input placeholder={t('devices.brandPlaceholder', 'Ej: Hikvision, Synology')} value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('devices.model', 'Modelo')}</Label><Input placeholder={t('devices.modelPlaceholder', 'Ej: DS-2CD2143G2')} value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>{t('devices.location', 'Ubicación')}</Label><Input placeholder={t('devices.locationPlaceholder', 'Ej: Oficina Madrid - Planta 2')} value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
            
            {/* Image URL field removed for non-cameras - they only show icons */}
            
            <div className="col-span-2 space-y-2"><Label>{t('common.description', 'Descripción')}</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>{t('common.notes', 'Notas')}</Label><Textarea placeholder={t('common.notesPlaceholder', 'Notas internas, configuración...')} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} /></div>
            
            {/* CRA Checkbox */}
            <div className="col-span-2 flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
              <Switch 
                id="is-cra" 
                checked={formData.is_cra} 
                onCheckedChange={(checked) => setFormData({ ...formData, is_cra: checked })}
              />
              <div className="flex-1">
                <Label htmlFor="is-cra" className="cursor-pointer font-medium text-red-700">🚨 Dispositivo CRA</Label>
                <p className="text-xs text-red-600">Marcar como dispositivo crítico (Central Receptora de Alarmas)</p>
              </div>
              <Shield className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button data-testid="save-device-btn" type="submit" disabled={saving}>{saving ? t('common.saving', 'Guardando...') : t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const OrganizationFormDialog = ({ open, onOpenChange, organization, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ 
    name: "", description: "", color: "#3b82f6", logo_url: "", country: "", city: "", 
    address: "", postal_code: "", phone: "", contact_email: "",
    responsible_name: "", responsible_phone: "", responsible_email: "", is_cra: false
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#14b8a6", "#6366f1", "#a855f7", "#e11d48", "#0ea5e9", "#65a30d", "#dc2626", "#7c3aed", "#db2777", "#059669", "#ca8a04"];
  
  const countries = [
    "España", "Portugal", "Francia", "Alemania", "Italia", "Reino Unido", "Países Bajos", "Bélgica",
    "Estados Unidos", "México", "Argentina", "Chile", "Colombia", "Perú", "Brasil",
    "Marruecos", "Emiratos Árabes", "Arabia Saudí", "China", "Japón", "Australia", "Otro"
  ];

  useEffect(() => {
    if (organization) setFormData({ 
      name: organization.name || "", 
      description: organization.description || "", 
      color: organization.color || "#3b82f6", 
      logo_url: organization.logo_url || "",
      country: organization.country || "",
      city: organization.city || "",
      address: organization.address || "",
      postal_code: organization.postal_code || "",
      phone: organization.phone || "",
      contact_email: organization.contact_email || "",
      responsible_name: organization.responsible_name || "",
      responsible_phone: organization.responsible_phone || "",
      responsible_email: organization.responsible_email || "",
      is_cra: organization.is_cra || false
    });
    else setFormData({ 
      name: "", description: "", color: "#3b82f6", logo_url: "", country: "", city: "", 
      address: "", postal_code: "", phone: "", contact_email: "",
      responsible_name: "", responsible_phone: "", responsible_email: "", is_cra: false
    });
  }, [organization, open]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file by extension (more reliable than MIME type)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.jfif', '.bmp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      toast.error("Tipo de archivo no permitido. Usa JPG, PNG, GIF, WEBP, SVG o JFIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Archivo demasiado grande. Máximo 5MB");
      return;
    }
    
    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    const token = localStorage.getItem("token");
    const uploadUrl = `${BACKEND_URL}/api/upload`;
    
    try {
      const res = await axios.post(uploadUrl, uploadFormData, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      const logoUrl = `${BACKEND_URL}${res.data.url}`;
      setFormData(prev => ({ ...prev, logo_url: logoUrl }));
      toast.success("Logo subido correctamente");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.detail || "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error("Nombre requerido"); return; }
    setSaving(true); await onSave(formData, organization?.id); setSaving(false); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0"><DialogTitle>{organization ? t('organizations.editOrganization', 'Editar Organización') : t('organizations.addOrganization', 'Nueva Organización')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2"><Label>{t('common.name', 'Nombre')} *</Label><Input data-testid="org-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('common.description', 'Descripción')}</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('common.country', 'País/Región')}</Label>
                <Select value={formData.country || "none"} onValueChange={(v) => setFormData({ ...formData, country: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder={t('common.selectCountry', 'Seleccionar país')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.unspecified', 'Sin especificar')}</SelectItem>
                    {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.city', 'Ciudad')}</Label>
                <Input placeholder="Ciudad" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Dirección completa</Label>
              <Input placeholder="Calle, número, piso..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código Postal</Label>
                <Input placeholder="Ej: 28001" value={formData.postal_code} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input placeholder="Ej: +34 912 345 678" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email de contacto</Label>
              <Input type="email" placeholder="contacto@empresa.com" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
            </div>
            
            {/* Responsable Section */}
            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-semibold text-muted-foreground mb-3 block">👤 Persona Responsable</Label>
              <div className="space-y-3">
                <div>
                  <Label>Nombre del Responsable</Label>
                  <Input placeholder="Juan García" value={formData.responsible_name} onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Teléfono Responsable</Label>
                    <Input placeholder="+34 600 123 456" value={formData.responsible_phone} onChange={(e) => setFormData({ ...formData, responsible_phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email Responsable</Label>
                    <Input type="email" placeholder="responsable@empresa.com" value={formData.responsible_email} onChange={(e) => setFormData({ ...formData, responsible_email: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* CRA Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">🚨 Centro CRA</Label>
                  <p className="text-xs text-muted-foreground">Central Receptora de Alarmas - Dispositivos críticos</p>
                </div>
                <Switch checked={formData.is_cra} onCheckedChange={(checked) => setFormData({ ...formData, is_cra: checked })} />
              </div>
              {formData.is_cra && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  ⚠️ Todos los dispositivos de esta organización serán marcados como críticos y tendrán prioridad en las alertas.
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>{t('common.logo', 'Logo')}</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="URL del logo o sube una imagen" 
                  value={formData.logo_url} 
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
              {formData.logo_url && (
                <div className="flex items-center gap-2 mt-2">
                  <img src={formData.logo_url} alt="Logo preview" className="h-16 object-contain rounded border" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({ ...formData, logo_url: "" })}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>{t('common.color', 'Color')}</Label>
              <div className="flex gap-2 flex-wrap">{colors.map((c) => <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('common.saving', 'Guardando...') : t('common.save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const GroupFormDialog = ({ open, onOpenChange, group, organizations, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: "", organization_id: "", description: "", color: "#22c55e" });
  const [saving, setSaving] = useState(false);
  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#14b8a6", "#6366f1", "#a855f7", "#e11d48", "#0ea5e9", "#65a30d", "#dc2626", "#7c3aed", "#db2777", "#059669", "#ca8a04"];

  useEffect(() => {
    if (group) setFormData({ name: group.name || "", organization_id: group.organization_id || "", description: group.description || "", color: group.color || "#22c55e" });
    else setFormData({ name: "", organization_id: organizations[0]?.id || "", description: "", color: "#22c55e" });
  }, [group, open, organizations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.organization_id) { toast.error("Nombre y organización requeridos"); return; }
    setSaving(true); await onSave(formData, group?.id); setSaving(false); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{group ? t('groups.editGroup', 'Editar Grupo') : t('groups.newGroup', 'Nuevo Grupo')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>{t('common.name', 'Nombre')} *</Label><Input data-testid="group-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('organizations.title', 'Organización')} *</Label>
              <Select value={formData.organization_id} onValueChange={(v) => setFormData({ ...formData, organization_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('common.select', 'Seleccionar')} /></SelectTrigger>
                <SelectContent>{organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t('common.description', 'Descripción')}</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('common.color', 'Color')}</Label>
              <div className="flex gap-2 flex-wrap">{colors.map((c) => <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button><Button data-testid="save-group-btn" type="submit" disabled={saving}>{saving ? t('common.saving', 'Guardando...') : t('common.save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UserFormDialog = ({ open, onOpenChange, user, organizations, groups, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ username: "", email: "", password: "", role: "viewer", full_name: "", group_ids: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setFormData({ username: user.username || "", email: user.email || "", password: "", role: user.role || "viewer", full_name: user.full_name || "", group_ids: user.group_ids || [] });
    else setFormData({ username: "", email: "", password: "", role: "viewer", full_name: "", group_ids: [] });
  }, [user, open]);

  const toggleGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      group_ids: prev.group_ids.includes(groupId) 
        ? prev.group_ids.filter(id => id !== groupId)
        : [...prev.group_ids, groupId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || (!user && !formData.password)) { toast.error("Completa los campos"); return; }
    setSaving(true); await onSave(formData, user?.id); setSaving(false); onOpenChange(false);
  };

  // Group groups by organization for better display
  const groupsByOrg = organizations.map(org => ({
    org,
    groups: groups.filter(g => g.organization_id === org.id)
  })).filter(item => item.groups.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{user ? t('users.editUser', 'Editar Usuario') : t('users.newUser', 'Nuevo Usuario')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('users.userName', 'Usuario')} *</Label><Input data-testid="user-username-input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={!!user} /></div>
              <div className="space-y-2"><Label>{t('users.userEmail', 'Email')} *</Label><Input data-testid="user-email-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>
            {!user && <div className="space-y-2"><Label>{t('auth.password', 'Contraseña')} *</Label><Input data-testid="user-password-input" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('users.fullName', 'Nombre completo')}</Label><Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('users.userRole', 'Rol')}</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="w-4 h-4" />{t('users.roleAdmin', 'Admin')}</div></SelectItem>
                    <SelectItem value="manager"><div className="flex items-center gap-2"><Edit className="w-4 h-4" />{t('users.roleManager', 'Gestor')}</div></SelectItem>
                    <SelectItem value="technician"><div className="flex items-center gap-2"><Wrench className="w-4 h-4" />{t('users.roleTechnician', 'Técnico')}</div></SelectItem>
                    <SelectItem value="operator"><div className="flex items-center gap-2"><Camera className="w-4 h-4" />{t('users.roleOperator', 'Operador')}</div></SelectItem>
                    <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="w-4 h-4" />{t('users.roleViewer', 'Visor')}</div></SelectItem>
                  </SelectContent>
                </Select>
                {formData.role === "technician" && (
                  <p className="text-xs text-amber-600 mt-1">{t('users.technicianNote', 'El técnico ve todos los dispositivos (IP, puerto, historial) pero no puede editarlos.')}</p>
                )}
              </div>
            </div>
            {formData.role !== "admin" && formData.role !== "technician" && (
              <div className="space-y-2">
                <Label>{t('groups.allowedGroups', 'Grupos permitidos')}</Label>
                <p className="text-xs text-muted-foreground mb-2">{t('users.groupsHint', 'Sin selección = acceso a todos. Selecciona para restringir.')}</p>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-3">
                  {groupsByOrg.map(({ org, groups: orgGroups }) => (
                    <div key={org.id}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{org.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {orgGroups.map(grp => (
                          <button
                            key={grp.id}
                            type="button"
                            onClick={() => toggleGroup(grp.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                              formData.group_ids.includes(grp.id)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: grp.color }} />
                            {grp.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {groupsByOrg.length === 0 && <span className="text-xs text-muted-foreground">{t('groups.noGroups', 'No hay grupos creados')}</span>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button><Button data-testid="save-user-btn" type="submit" disabled={saving}>{saving ? t('common.saving', 'Guardando...') : t('common.save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeviceTypeFormDialog = ({ open, onOpenChange, deviceType, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: "", icon: "server", color: "#6b7280", is_critical: false });
  const [saving, setSaving] = useState(false);
  const icons = ["camera", "hard-drive", "network", "router", "server", "monitor", "printer", "wifi", "shield", "box", "layers"];
  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#14b8a6", "#6366f1", "#a855f7", "#e11d48", "#0ea5e9", "#65a30d", "#dc2626", "#7c3aed", "#db2777", "#059669", "#ca8a04", "#6b7280"];

  useEffect(() => {
    if (deviceType) setFormData({ name: deviceType.name || "", icon: deviceType.icon || "server", color: deviceType.color || "#6b7280", is_critical: deviceType.is_critical || false });
    else setFormData({ name: "", icon: "server", color: "#6b7280", is_critical: false });
  }, [deviceType, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error("Nombre requerido"); return; }
    setSaving(true); await onSave(formData, deviceType?.id); setSaving(false); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{deviceType ? t('deviceTypes.editType', 'Editar Tipo') : t('deviceTypes.addType', 'Nuevo Tipo de Dispositivo')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>{t('common.name', 'Nombre')} *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('deviceTypes.icon', 'Icono')}</Label>
              <div className="flex gap-2 flex-wrap">{icons.map((i) => { const Icon = getIcon(i); return <button key={i} type="button" onClick={() => setFormData({ ...formData, icon: i })} className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${formData.icon === i ? 'border-foreground bg-muted' : 'border-transparent hover:bg-muted/50'}`}><Icon className="w-5 h-5" /></button>; })}</div>
            </div>
            <div className="space-y-2"><Label>{t('common.color', 'Color')}</Label>
              <div className="flex gap-2 flex-wrap">{colors.map((c) => <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
            </div>
            {/* Critical Device Type Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <input 
                type="checkbox" 
                id="is_critical"
                checked={formData.is_critical} 
                onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })}
                className="w-4 h-4 rounded border-red-500/50 text-red-500 focus:ring-red-500"
              />
              <label htmlFor="is_critical" className="flex-1 cursor-pointer">
                <span className="font-medium text-sm">{t('deviceTypes.critical', 'Tipo Crítico')}</span>
                <p className="text-xs text-muted-foreground">{t('deviceTypes.criticalDesc', 'Los dispositivos de este tipo aparecerán en el widget de Alertas Críticas cuando estén offline')}</p>
              </label>
            </div>
            <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${formData.color}20` }}>
                {(() => { const Icon = getIcon(formData.icon); return <Icon className="w-5 h-5" style={{ color: formData.color }} />; })()}
              </div>
              <div>
                <span className="font-medium">{formData.name || "Vista previa"}</span>
                {formData.is_critical && <span className="ml-2 text-xs text-red-500 font-semibold">CRÍTICO</span>}
              </div>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('common.saving', 'Guardando...') : t('common.save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const HistoryDialog = ({ open, onOpenChange, device, history, onClear }) => {
  const { t } = useTranslation();
  if (!device) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5" />{t('history.title', 'Historial')} - {device.name}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{device.ip_address}:{device.port}</DialogDescription>
        </DialogHeader>
        {device.notes && <div className="p-3 bg-muted rounded-lg text-sm"><FileText className="w-4 h-4 inline mr-2" /><strong>{t('common.notes', 'Notas')}:</strong> {device.notes}</div>}
        <ScrollArea className="h-[350px] pr-4">
          {history.length === 0 ? <div className="empty-state py-12"><Activity className="w-12 h-12 mb-4 opacity-20" /><p>{t('history.noHistory', 'No hay historial')}</p></div> : (
            <div className="space-y-2">{history.map((e, i) => (
              <div key={e.id || i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <StatusDot status={e.status} />
                <div className="flex-1"><div className="flex items-center gap-2"><StatusBadge status={e.status} />{e.response_time_ms && <span className="text-xs text-muted-foreground font-mono">{e.response_time_ms.toFixed(0)}ms</span>}</div><p className="text-xs text-muted-foreground mt-1">{new Date(e.timestamp).toLocaleString()}</p></div>
                <div className="flex gap-2 text-xs"><span className={e.ping_success ? "text-green-600" : "text-red-500"}>Ping {e.ping_success ? "✓" : "✗"}</span><span className={e.port_success ? "text-green-600" : "text-red-500"}>Puerto {e.port_success ? "✓" : "✗"}</span></div>
              </div>
            ))}</div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const DeleteConfirmDialog = ({ open, onOpenChange, title, message, onConfirm }) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => { setDeleting(true); await onConfirm(); setDeleting(false); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="w-5 h-5" />{title}</DialogTitle><DialogDescription>{message}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button><Button data-testid="confirm-delete-btn" variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? t('common.deleting', 'Eliminando...') : t('common.delete')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Failures summary dialog
// WhatsApp alert number
const WHATSAPP_ALERT_NUMBER = "+34610557829";

const FailuresDialog = ({ open, onOpenChange, failures, onClear }) => {
  const { t } = useTranslation();
  // Generate WhatsApp message with all failures
  const getWhatsAppLink = () => {
    if (failures.length === 0) return null;
    const message = `🚨 *ALERTA - WatchTower by Siempria*\n\n` +
      `${failures.length} dispositivo(s) offline:\n\n` +
      failures.map(f => `❌ *${f.name}*\n   IP: ${f.ip}:${f.port}\n   Hora: ${f.time}`).join('\n\n') +
      `\n\n_Enviado desde WatchTower_`;
    return `https://wa.me/${WHATSAPP_ALERT_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
  };

  // Generate WhatsApp link for single device
  const getSingleWhatsAppLink = (device) => {
    const message = `🚨 *ALERTA - Dispositivo Offline*\n\n` +
      `❌ *${device.name}*\n` +
      `IP: ${device.ip}:${device.port}\n` +
      `Hora: ${device.time}\n\n` +
      `_WatchTower by Siempria_`;
    return `https://wa.me/${WHATSAPP_ALERT_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Resumen de Fallos ({failures.length})
          </DialogTitle>
          <DialogDescription>{t('devices.recentlyOffline', 'Dispositivos que han perdido conexión recientemente')}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          {failures.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('alerts.noRecentFailures', 'No hay fallos recientes')}</p>
          ) : (
            failures.map((f, i) => (
              <div key={`${f.id}-${i}`} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{f.ip}:{f.port}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap mr-2">{f.time}</span>
                <a 
                  href={getSingleWhatsAppLink(f)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                  title="Enviar alerta por WhatsApp"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="flex-shrink-0 gap-2">
          {failures.length > 0 && (
            <a 
              href={getWhatsAppLink()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
            >
              <Phone className="w-4 h-4" />
              Enviar todo por WhatsApp
            </a>
          )}
          <Button variant="outline" onClick={onClear}>{t('history.clearHistory', 'Limpiar historial')}</Button>
          <Button onClick={() => onOpenChange(false)}>{t('common.close', 'Cerrar')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



// ============ STATISTICS PANEL - REDESIGNED ============
const PublicDashboardConfig = ({ organization }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    enabled: false,
    password: "",
    show_images: true,
    show_details: false
  });
  const [publicUrl, setPublicUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { authAxios } = useAuth();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await authAxios.get(`/organizations/${organization.id}/public-dashboard`);
        if (res.data.config) {
          setConfig({
            enabled: res.data.config.enabled || false,
            password: res.data.config.password || "",
            show_images: res.data.config.show_images !== false,
            show_details: res.data.config.show_details || false
          });
        }
        setPublicUrl(res.data.public_url || "");
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    if (organization?.id) fetchConfig();
  }, [organization?.id, authAxios]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAxios.post(`/organizations/${organization.id}/public-dashboard`, config);
      setPublicUrl(res.data.public_url);
      toast.success("Configuración guardada");
    } catch (e) {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const handleRegenerateToken = async () => {
    try {
      const res = await authAxios.post(`/organizations/${organization.id}/public-dashboard/regenerate-token`);
      setPublicUrl(res.data.public_url);
      toast.success("Token regenerado");
    } catch (e) {
      toast.error("Error al regenerar token");
    }
  };

  const copyUrl = () => {
    const fullUrl = `${window.location.origin}${publicUrl}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("URL copiada");
  };

  if (loading) return <Skeleton className="h-8 w-full" />;

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          <span className="font-medium">Dashboard Público</span>
        </div>
        <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
      </div>

      {config.enabled && (
        <>
          <div className="p-3 bg-white rounded border">
            <Label className="text-xs text-muted-foreground">URL Pública</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs font-mono bg-muted p-2 rounded truncate">
                {window.location.origin}{publicUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyUrl}><Copy className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" onClick={handleRegenerateToken} title="Regenerar token">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Contraseña (opcional)</Label>
              <Input 
                type="password" 
                placeholder="Dejar vacío para acceso libre" 
                value={config.password} 
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={config.show_images} onCheckedChange={(v) => setConfig({ ...config, show_images: v })} />
              <span className="text-sm">Mostrar imágenes de cámaras</span>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={config.show_details} onCheckedChange={(v) => setConfig({ ...config, show_details: v })} />
              <span className="text-sm">Mostrar detalles (IP/puerto)</span>
            </div>
          </div>
        </>
      )}

      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? t('common.saving', 'Guardando...') : t('common.save')}
      </Button>
    </div>
  );
};


// ============ SECURITY PANEL ============
const SecurityPanel = () => {
  const { t } = useTranslation();
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBlacklistIP, setNewBlacklistIP] = useState("");
  const [newBlacklistReason, setNewBlacklistReason] = useState("");
  const [adding, setAdding] = useState(false);
  const { authAxios } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      const [blockedRes, blacklistRes, eventsRes] = await Promise.all([
        authAxios.get("/security/blocked-ips"),
        authAxios.get("/security/blacklist"),
        authAxios.get("/security/events?limit=20")
      ]);
      setBlockedIPs(blockedRes.data.blocked_ips || []);
      setBlacklist(blacklistRes.data.blacklist || []);
      setEvents(eventsRes.data.events || []);
    } catch (e) {
      console.error("Error fetching security data:", e);
    }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUnblock = async (ip) => {
    try {
      await authAxios.post("/security/unblock-ip", null, { params: { ip } });
      toast.success(`IP ${ip} desbloqueada`);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al desbloquear");
    }
  };

  const handleAddToBlacklist = async () => {
    if (!newBlacklistIP) { toast.error("Introduce una IP"); return; }
    setAdding(true);
    try {
      await authAxios.post("/security/blacklist", { ip: newBlacklistIP, reason: newBlacklistReason || "Bloqueado manualmente" });
      toast.success(`IP ${newBlacklistIP} añadida a lista negra`);
      setNewBlacklistIP("");
      setNewBlacklistReason("");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al añadir");
    }
    setAdding(false);
  };

  const handleRemoveFromBlacklist = async (ip) => {
    try {
      await authAxios.delete(`/security/blacklist/${ip}`);
      toast.success(`IP ${ip} eliminada de lista negra`);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al eliminar");
    }
  };

  if (loading) return <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          Seguridad - Protección contra Ataques
        </CardTitle>
        <CardDescription>
          Gestiona IPs bloqueadas y eventos de seguridad. Las IPs se bloquean automáticamente después de 5 intentos fallidos de login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{blockedIPs.length}</div>
            <div className="text-sm text-yellow-700">IPs Bloqueadas (Temp)</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{blacklist.length}</div>
            <div className="text-sm text-red-700">Lista Negra (Perm)</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{events.length}</div>
            <div className="text-sm text-blue-700">Eventos Recientes</div>
          </div>
        </div>

        {/* Temporarily Blocked IPs */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            IPs Bloqueadas Temporalmente
          </h4>
          {blockedIPs.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">No hay IPs bloqueadas temporalmente</p>
          ) : (
            <div className="space-y-2">
              {blockedIPs.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <span className="font-mono font-semibold">{item.ip}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      (Desbloqueo en {item.remaining_minutes} min)
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleUnblock(item.ip)}>
                    Desbloquear
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Permanent Blacklist */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Lista Negra Permanente
          </h4>
          
          {/* Add to blacklist */}
          <div className="flex gap-2 p-3 bg-muted rounded-lg">
            <Input 
              placeholder="IP a bloquear (ej: 192.168.1.1)" 
              value={newBlacklistIP} 
              onChange={(e) => setNewBlacklistIP(e.target.value)}
              className="flex-1"
            />
            <Input 
              placeholder="Razón (opcional)" 
              value={newBlacklistReason} 
              onChange={(e) => setNewBlacklistReason(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddToBlacklist} disabled={adding}>
              {adding ? "Añadiendo..." : "Añadir"}
            </Button>
          </div>

          {blacklist.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">Lista negra vacía</p>
          ) : (
            <div className="space-y-2">
              {blacklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <span className="font-mono font-semibold">{item.ip}</span>
                    <span className="text-sm text-muted-foreground ml-2">- {item.reason}</span>
                    <div className="text-xs text-muted-foreground">
                      Añadida por {item.added_by} el {new Date(item.added_at).toLocaleString()}
                    </div>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => handleRemoveFromBlacklist(item.ip)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Security Events */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Eventos de Seguridad Recientes
          </h4>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">No hay eventos de seguridad</p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {events.map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg text-sm">
                    <Badge variant={event.event_type === "ip_blocked" ? "destructive" : "secondary"}>
                      {event.event_type === "ip_blocked" ? "IP Bloqueada" : event.event_type}
                    </Badge>
                    <span className="font-mono">{event.ip_address}</span>
                    <span className="text-muted-foreground">Usuario: {event.username}</span>
                    <span className="text-muted-foreground ml-auto">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ SCHEDULED REPORTS PANEL (extracted to /components/panels/ScheduledReportsPanel.jsx) ============
// ============ BACKUP PANEL (extracted to /components/panels/BackupPanel.jsx) ============
// ============ DAILY DOWNTIME REPORT PANEL (extracted to /components/panels/DailyReportPanel.jsx) ============
// ============ ACCESS LOGS PANEL (extracted to /components/panels/AccessLogsPanel.jsx) ============

// ============ LOADING COMPONENTS ============
const LoadingSkeleton = ({ message = "Cargando datos..." }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div className="flex flex-col items-center gap-8">
      {/* Logo animado */}
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <img 
          src="https://customer-assets.emergentagent.com/job_051d11b5-64eb-4eef-a44f-e7e0e5b16da5/artifacts/03lnmzfi_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png" 
          alt="Siempria" 
          className="w-32 h-32 object-contain animate-pulse relative z-10"
        />
      </div>
      
      {/* Texto */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">WatchTower</h2>
        <p className="text-sm text-cyan-400">by SIEMPRIA</p>
      </div>
      
      {/* Barra de progreso animada */}
      <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" 
             style={{animation: 'loadingBar 1.5s ease-in-out infinite'}} />
      </div>
      
      {/* Texto de carga */}
      <p className="text-sm text-slate-400">{message}</p>
    </div>
    
    <style>{`
      @keyframes loadingBar {
        0% { width: 0%; margin-left: 0%; }
        50% { width: 60%; margin-left: 20%; }
        100% { width: 0%; margin-left: 100%; }
      }
    `}</style>
  </div>
);

// Componente de carga inline para secciones específicas
const SectionLoading = ({ message = "Cargando..." }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4">
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
      <img 
        src="https://customer-assets.emergentagent.com/job_051d11b5-64eb-4eef-a44f-e7e0e5b16da5/artifacts/03lnmzfi_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png" 
        alt="Siempria" 
        className="absolute inset-0 m-auto w-8 h-8 object-contain"
      />
    </div>
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

// ============ DASHBOARD ============
const Dashboard = () => {
  const { t } = useTranslation();
  const { user, logout, authAxios, canAccessSection, hasPermission } = useAuth();
  const [devices, setDevices] = useState([]);
  const [deviceStats, setDeviceStats] = useState({ total: 0, online: 0, offline: 0, cra: 0 });
  const [organizations, setOrganizations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");
  const [filterCountry, setFilterCountry] = useState(null);
  const [filterOrgId, setFilterOrgId] = useState(null);
  const [filterGroupId, setFilterGroupId] = useState(null);
  const [filterTypeId, setFilterTypeId] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);  // New: filter by status (online/offline)
  const [filterStats, setFilterStats] = useState(false);  // New: filter by has_statistics
  const [searchQuery, setSearchQuery] = useState("");  // NEW: Search by name

  // Dialogs
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupDialogOrgId, setGroupDialogOrgId] = useState(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mobotixDialogOpen, setMobotixDialogOpen] = useState(false);
  const [mobotixInfo, setMobotixInfo] = useState(null);
  const [mobotixLoading, setMobotixLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState({ type: "", item: null });
  const [failuresDialogOpen, setFailuresDialogOpen] = useState(false);
  const [recentFailures, setRecentFailures] = useState([]);
  const [previousDeviceStates, setPreviousDeviceStates] = useState({});
  const [previousAlertIds, setPreviousAlertIds] = useState(new Set());
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('alertSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  // New: Device history modal state
  const [historyModalDevice, setHistoryModalDevice] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  
  // NOC Dashboard state
  const [nocDashboardOpen, setNocDashboardOpen] = useState(false);
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Onboarding wizard state
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check for nocFullscreen parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('nocFullscreen') === 'true') {
      setNocDashboardOpen(true);
    }
  }, []);
  
  const audioRef = useRef(null);
  const fetchingRef = useRef(false); // Prevent concurrent API calls
  
  // Alert sound function (defined early for WebSocket hook)
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      // Create audio context for alert sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Alert sound pattern: 3 beeps
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Beep pattern
      setTimeout(() => { gainNode.gain.value = 0; }, 150);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 250);
      setTimeout(() => { gainNode.gain.value = 0; }, 400);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 500);
      setTimeout(() => { gainNode.gain.value = 0; oscillator.stop(); }, 650);
    } catch (e) {
      console.warn('Could not play alert sound:', e);
    }
  }, [soundEnabled]);
  
  // WebSocket for real-time alerts
  const handleNewWebSocketAlert = useCallback((alertData) => {
    // Add new alert to the beginning of the list
    setAlerts(prev => {
      const exists = prev.some(a => a.id === alertData.id);
      if (exists) return prev;
      return [alertData, ...prev];
    });
    
    // Play sound for critical alerts
    if (alertData.alert_type === 'device_down' || alertData.alert_type === 'nas_disconnected') {
      playAlertSound();
    }
  }, [playAlertSound]);
  
  const { isConnected: wsConnected, connectionStatus: wsStatus } = useWebSocketAlerts(
    BACKEND_URL,
    localStorage.getItem('token'),
    handleNewWebSocketAlert
  );

  // Toggle sound and save preference
  const toggleAlertSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('alertSoundEnabled', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  // Incident from device
  const [incidentFromDeviceOpen, setIncidentFromDeviceOpen] = useState(false);
  const [incidentDeviceData, setIncidentDeviceData] = useState({ device: null, title: "", description: "", priority: "medium" });
  const [creatingIncident, setCreatingIncident] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const DEVICES_PER_PAGE = 12;
  
  // Custom device order (drag & drop)
  const [deviceOrder, setDeviceOrder] = useState(() => {
    const saved = localStorage.getItem('siempria-device-order');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = paginatedDevices.findIndex(d => d.id === active.id);
      const newIndex = paginatedDevices.findIndex(d => d.id === over.id);
      const newOrder = arrayMove(paginatedDevices.map(d => d.id), oldIndex, newIndex);
      setDeviceOrder(newOrder);
      localStorage.setItem('siempria-device-order', JSON.stringify(newOrder));
      toast.success('Orden guardado');
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const isOperator = user?.role === "operator";
  const isTechnician = user?.role === "technician";
  // Use cached stats for header (faster than counting all devices)
  const onlineCount = deviceStats.online || devices.filter(d => d.status === 'online').length;
  const offlineCount = deviceStats.offline || devices.filter(d => d.status === 'offline').length;
  const craCount = deviceStats.cra || devices.filter(d => d.is_cra === true).length;
  
  // DVR/NVR count state
  const [dvrStats, setDvrStats] = useState({ total: 0, online: 0 });

  const fetchAll = useCallback(async () => {
    // Prevent concurrent calls
    if (fetchingRef.current) {
      console.log('⏩ Skipping fetchAll - already in progress');
      return;
    }
    
    fetchingRef.current = true;
    try {
      // Load stats separately (fast, cached) and ALL devices
      const [statsRes, devRes, orgRes, grpRes, typeRes, alertRes, dahuaRes] = await Promise.all([
        authAxios.get("/devices/stats"),
        authAxios.get("/devices?limit=1000"), 
        authAxios.get("/organizations"), 
        authAxios.get("/groups"),
        authAxios.get("/device-types"), 
        authAxios.get("/alerts?period=month&limit=200"),
        authAxios.get("/dahua/status").catch(() => ({ data: { total: 0, online: 0 } }))
      ]);
      
      // Use stats for header counters (faster)
      if (statsRes.data) {
        setDeviceStats(statsRes.data);
      }
      
      // DVR/NVR stats
      if (dahuaRes.data && dahuaRes.data.summary) {
        setDvrStats({ 
          total: dahuaRes.data.summary.total || 0, 
          online: dahuaRes.data.summary.online || 0 
        });
      }
      
      const newDevices = devRes.data.devices || [];
      
      // Detect devices that went offline
      const newFailures = [];
      newDevices.forEach(newDev => {
        const prevState = previousDeviceStates[newDev.id];
        if (prevState === "online" && newDev.status === "offline") {
          newFailures.push({
            id: newDev.id,
            name: newDev.name,
            ip: newDev.ip_address,
            port: newDev.port,
            time: new Date().toLocaleString()
          });
          // Show toast notification
          toast.error(`🔴 ${newDev.name} está OFFLINE`, { duration: 8000 });
          // Browser notification if permitted
          if (Notification.permission === "granted") {
            new Notification("⚠️ Dispositivo Caído", {
              body: `${newDev.name} (${newDev.ip_address}) está OFFLINE`,
              icon: "/favicon.ico",
              requireInteraction: true
            });
          }
        }
      });
      
      // Update previous states for next comparison
      const newStates = {};
      newDevices.forEach(d => { newStates[d.id] = d.status; });
      setPreviousDeviceStates(newStates);
      
      // Add new failures to the list (keep last 50)
      if (newFailures.length > 0) {
        setRecentFailures(prev => [...newFailures, ...prev].slice(0, 50));
        // Auto-show popup if there are new failures
        setFailuresDialogOpen(true);
        // Play alert sound for device failures
        playAlertSound();
        
        // Auto-close popup after 1 minute (60000ms)
        setTimeout(() => {
          setFailuresDialogOpen(false);
        }, 60000);
      }
      
      // Check for new alerts and play sound
      const newAlerts = alertRes.data.alerts || [];
      const newAlertIds = new Set(newAlerts.map(a => a.id));
      const hasNewDeviceDownAlerts = newAlerts.some(a => 
        a.alert_type === 'device_down' && !previousAlertIds.has(a.id)
      );
      if (hasNewDeviceDownAlerts && previousAlertIds.size > 0) {
        playAlertSound();
      }
      setPreviousAlertIds(newAlertIds);
      
      setDevices(newDevices);
      setOrganizations(orgRes.data.organizations || []);
      setGroups(grpRes.data.groups || []);
      setDeviceTypes(typeRes.data.device_types || []);
      setAlerts(newAlerts);
      
      // Show onboarding for tenant_admin with no organizations
      const orgs = orgRes.data.organizations || [];
      if (user?.role === 'tenant_admin' && orgs.length === 0) {
        const onboardingDismissed = localStorage.getItem(`onboarding_dismissed_${user.id}`);
        if (!onboardingDismissed) {
          setShowOnboarding(true);
        }
      }
      
      // Only fetch admin data if user is admin
      if (user?.role === "admin") {
        const [usrRes, setRes] = await Promise.all([authAxios.get("/users"), authAxios.get("/settings")]);
        setUsers(usrRes.data.users || []);
        setSettings(setRes.data.settings);
      }
      setLoading(false);
    } catch (e) { 
      console.error(e); 
      setLoading(false);
    } finally {
      fetchingRef.current = false;
    }
  }, [authAxios, user?.role, previousDeviceStates, playAlertSound, previousAlertIds]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => { 
    fetchAll(); 
    const interval = setInterval(fetchAll, 120000); // Check every 120 seconds (2 minutes) - optimized for performance 
    return () => clearInterval(interval); 
  }, [fetchAll]);

  const handleRefreshAll = async () => { setRefreshing(true); try { await authAxios.post("/devices/check-all"); toast.success("Verificando..."); setTimeout(fetchAll, 3000); } catch (e) { toast.error("Error"); } setRefreshing(false); };
  const handleCheckDevice = async (deviceId) => { try { await authAxios.post(`/devices/${deviceId}/check`); toast.success("Verificado"); fetchAll(); } catch (e) { toast.error("Error"); } };

  const handleSaveDevice = async (data, deviceId) => { try { if (deviceId) { await authAxios.put(`/devices/${deviceId}`, data); toast.success("Actualizado"); } else { await authAxios.post("/devices", data); toast.success("Creado"); } fetchAll(); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } };
  const handleSaveOrg = async (data, orgId) => { try { if (orgId) { await authAxios.put(`/organizations/${orgId}`, data); toast.success("Actualizado"); } else { await authAxios.post("/organizations", data); toast.success("Creado"); } fetchAll(); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } };
  const handleSaveGroup = async (data, groupId) => { try { if (groupId) { await authAxios.put(`/groups/${groupId}`, data); toast.success("Actualizado"); } else { await authAxios.post("/groups", data); toast.success("Creado"); } fetchAll(); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } };
  const handleSaveUser = async (data, userId) => { try { if (userId) { await authAxios.put(`/users/${userId}`, data); toast.success("Actualizado"); } else { await authAxios.post("/users", data); toast.success("Creado"); } fetchAll(); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } };
  const handleSaveType = async (data, typeId) => { try { if (typeId) { await authAxios.put(`/device-types/${typeId}`, data); toast.success("Actualizado"); } else { await authAxios.post("/device-types", data); toast.success("Creado"); } fetchAll(); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } };
  const handleSaveSettings = async (data) => { try { await authAxios.post("/settings", data); toast.success("Guardado"); fetchAll(); } catch (e) { toast.error("Error"); } };

  const handleDelete = async () => { try { const { type, item } = deleteTarget; if (type === "device") await authAxios.delete(`/devices/${item.id}`); else if (type === "org") await authAxios.delete(`/organizations/${item.id}`); else if (type === "group") await authAxios.delete(`/groups/${item.id}`); else if (type === "user") await authAxios.delete(`/users/${item.id}`); else if (type === "type") await authAxios.delete(`/device-types/${item.id}`); toast.success("Eliminado"); fetchAll(); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } };
  const handleOpenPasswordDialog = (userId) => { setPasswordUserId(userId); setNewPassword(""); setPasswordDialogOpen(true); };
  const handleSetPassword = async () => { 
    if (!newPassword || newPassword.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    try { await authAxios.post(`/users/${passwordUserId}/set-password`, { new_password: newPassword }); toast.success("Contraseña actualizada"); setPasswordDialogOpen(false); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } 
  };
  const handleViewHistory = async (device) => { setSelectedDevice(device); try { const res = await authAxios.get(`/devices/${device.id}/history`); setDeviceHistory(res.data.history || []); setHistoryDialogOpen(true); } catch (e) { toast.error("Error"); } };
  
  const handleMobotixInfo = async (device) => {
    setSelectedDevice(device);
    setMobotixLoading(true);
    setMobotixInfo(null);
    setMobotixDialogOpen(true);
    try {
      const res = await authAxios.get(`/devices/${device.id}/mobotix-info`);
      setMobotixInfo(res.data);
    } catch (e) {
      toast.error("Error al obtener información de la cámara");
      setMobotixInfo({ error: e.response?.data?.detail || "Error de conexión" });
    }
    setMobotixLoading(false);
  };

  // Create incident from device card
  const handleCreateIncidentFromDevice = (device) => {
    const statusText = device.status === 'offline' ? '🔴 Offline' : device.status === 'online' ? '🟢 Online' : '⚪ Estado desconocido';
    setIncidentDeviceData({
      device,
      title: `${statusText}: ${device.name}`,
      description: `Incidencia reportada para dispositivo ${device.name}\n\nIP: ${device.ip_address}:${device.port}\nEstado actual: ${device.status}\nÚltima verificación: ${device.last_check ? new Date(device.last_check).toLocaleString('es-ES') : 'Nunca'}`,
      priority: device.status === 'offline' ? 'high' : 'medium'
    });
    setIncidentFromDeviceOpen(true);
  };

  const handleSubmitIncidentFromDevice = async () => {
    if (!incidentDeviceData.title || !incidentDeviceData.description) {
      toast.error("Completa título y descripción");
      return;
    }
    setCreatingIncident(true);
    try {
      await authAxios.post("/incidents", {
        title: incidentDeviceData.title,
        description: incidentDeviceData.description,
        device_id: incidentDeviceData.device?.id || null,
        priority: incidentDeviceData.priority,
        category: "hardware"
      });
      toast.success("Incidencia creada");
      setIncidentFromDeviceOpen(false);
      setIncidentDeviceData({ device: null, title: "", description: "", priority: "medium" });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al crear incidencia");
    }
    setCreatingIncident(false);
  };

  const handleCloneDevice = (device) => {
    // Create a clone of the device - keep IP, user, password, only increment port
    const clonedDevice = {
      ...device,
      id: null, // Clear ID so it creates a new device
      name: `${device.name} (copia)`,
      port: device.port + 1, // Increment port by 1
      status: "unknown",
      last_check: null,
      last_online: null
    };
    setSelectedDevice(clonedDevice);
    setDeviceDialogOpen(true);
    toast.info("Modifica el puerto y nombre para el nuevo dispositivo");
  };

  const handleExport = async (format, organizationId = null) => {
    try {
      const params = organizationId ? `?organization_id=${organizationId}` : '';
      const response = await authAxios.get(`/export/${format}${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `dispositivos_${new Date().toISOString().slice(0,10)}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Archivo ${format.toUpperCase()} descargado`);
    } catch (e) { toast.error("Error al exportar"); }
  };

  // Filter devices based on user's group permissions
  const userGroupIds = user?.group_ids || [];
  const hasGroupRestrictions = userGroupIds.length > 0 && user?.role !== "admin";
  
  // Filter groups based on user permissions
  const allowedGroups = hasGroupRestrictions
    ? groups.filter(g => userGroupIds.includes(g.id))
    : groups;
  
  // Filter organizations based on allowed groups
  const allowedOrgIds = [...new Set(allowedGroups.map(g => g.organization_id))];
  const allowedOrganizations = hasGroupRestrictions 
    ? organizations.filter(o => allowedOrgIds.includes(o.id))
    : organizations;
  
  // Filter devices
  let filteredDevices = devices;
  
  // First, filter by user's allowed groups
  if (hasGroupRestrictions) {
    filteredDevices = filteredDevices.filter(d => userGroupIds.includes(d.group_id));
  }
  
  // Get unique countries for filter (only from allowed organizations)
  const uniqueCountries = [...new Set(allowedOrganizations.map(o => o.country).filter(Boolean))].sort();
  
  // Operators only see cameras that are online
  if (isOperator) {
    filteredDevices = filteredDevices.filter(d => d.device_type_id === "type-camera" && d.status === "online");
  } else {
    // Filter by country first
    if (filterCountry) {
      const countryOrgIds = allowedOrganizations.filter(o => o.country === filterCountry).map(o => o.id);
      const countryGroupIds = allowedGroups.filter(g => countryOrgIds.includes(g.organization_id)).map(g => g.id);
      filteredDevices = filteredDevices.filter(d => countryGroupIds.includes(d.group_id));
    }
    if (filterGroupId) filteredDevices = filteredDevices.filter(d => d.group_id === filterGroupId);
    else if (filterOrgId) {
      const orgGroupIds = allowedGroups.filter(g => g.organization_id === filterOrgId).map(g => g.id);
      filteredDevices = filteredDevices.filter(d => orgGroupIds.includes(d.group_id));
    }
    if (filterTypeId) filteredDevices = filteredDevices.filter(d => d.device_type_id === filterTypeId);
    // NEW: Filter by status
    if (filterStatus) filteredDevices = filteredDevices.filter(d => d.status === filterStatus);
    // NEW: Filter by has_statistics
    if (filterStats) filteredDevices = filteredDevices.filter(d => d.has_statistics === true);
    // NEW: Filter by search query (name, IP, location, description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredDevices = filteredDevices.filter(d => 
        d.name?.toLowerCase().includes(query) ||
        d.ip_address?.toLowerCase().includes(query) ||
        d.location?.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        d.brand?.toLowerCase().includes(query) ||
        d.model?.toLowerCase().includes(query)
      );
    }
  }

  // Sort groups alphabetically
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [groups]);

  // Pagination with custom order
  const totalPages = Math.ceil(filteredDevices.length / DEVICES_PER_PAGE);
  const paginatedDevices = useMemo(() => {
    // Apply custom order if exists
    let orderedDevices = [...filteredDevices];
    if (deviceOrder.length > 0) {
      orderedDevices.sort((a, b) => {
        const indexA = deviceOrder.indexOf(a.id);
        const indexB = deviceOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    const start = (currentPage - 1) * DEVICES_PER_PAGE;
    return orderedDevices.slice(start, start + DEVICES_PER_PAGE);
  }, [filteredDevices, currentPage, DEVICES_PER_PAGE, deviceOrder]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterOrgId, filterGroupId, filterTypeId, filterCountry, filterStatus, filterStats, searchQuery]);

  // Delayed loading for global overlay
  const showGlobalLoader = useDelayedLoading(loading, 2000);
  
  return (
    <div className="app-container">
      <Toaster position="top-right" richColors />
      <PWAInstallPrompt />
      
      {/* Global Section Loader - shows after 2 seconds of loading */}
      <SectionLoader 
        isLoading={loading} 
        delay={2000} 
        message="Cargando Panel de Control"
      />

      {/* Header - Premium Professional Design */}
      <header className="app-header">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo Section - Left */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile hamburger menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800/50"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <img src={LOGO_URL} alt="WatchTower" className="hidden md:block h-9 object-contain header-logo" />
              <div className="hidden md:block">
                <h1 className="text-sm font-bold tracking-wider header-brand-title" style={{fontFamily: "'JetBrains Mono', monospace"}}>
                  WATCH TOWER
                </h1>
                <p className="header-brand-subtitle text-[8px]">Administración</p>
              </div>
              {/* Mobile logo */}
              <img src={LOGO_URL} alt="WatchTower" className="md:hidden h-8 object-contain header-logo" />
            </div>
            
            {/* Center: Status HUD - Compact Display */}
            <div className="status-hud py-2 px-4 gap-3">
              <div className="status-hud-item online">
                <div className="status-dot status-dot-online" />
                <div className="flex flex-col items-center">
                  <span className="status-count text-lg">{onlineCount}</span>
                  <span className="status-hud-label hidden sm:block text-[9px]">ONLINE</span>
                </div>
              </div>
              <div className="status-hud-divider" />
              <button 
                onClick={() => setFailuresDialogOpen(true)} 
                className="status-hud-item offline hover:bg-red-500/10 px-2 py-1 rounded-full transition-all"
                title="Ver resumen de fallos"
              >
                <div className="status-dot status-dot-offline" />
                <div className="flex flex-col items-center">
                  <span className="status-count text-lg">{offlineCount}</span>
                  <span className="status-hud-label hidden sm:block text-[9px]">OFFLINE</span>
                </div>
                {recentFailures.length > 0 && <Bell className="w-3 h-3 text-red-400 animate-pulse ml-1" />}
              </button>
              <div className="status-hud-divider" />
              <button 
                onClick={() => setActiveTab('dahua')} 
                className="status-hud-item dvr hover:bg-blue-500/10 px-2 py-1 rounded-full transition-all"
                title="Ver Grabadores DVR/NVR"
              >
                <HardDrive className="w-4 h-4 text-blue-400" />
                <div className="flex flex-col items-center">
                  <span className="status-count text-blue-400 text-lg">{dvrStats.online}/{dvrStats.total}</span>
                  <span className="status-hud-label hidden sm:block text-blue-400 text-[9px]">DVR</span>
                </div>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Action Toolbar - Desktop */}
              <div className="hidden md:flex action-toolbar">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button data-testid="export-btn" variant="ghost" size="sm" className="btn-ghost-toolbar gap-2">
                      <Download className="w-4 h-4" />
                      <span className="hidden lg:inline">{t('common.export', 'Exportar')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('excel')}><FileSpreadsheet className="w-4 h-4 mr-2" />Exportar a Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}><FileIcon className="w-4 h-4 mr-2" />Exportar a PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  data-testid="refresh-all-btn" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefreshAll} 
                  disabled={refreshing}
                  className="btn-ghost-toolbar gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden lg:inline">{t('devices.check', 'Verificar')}</span>
                </Button>
                {canEdit && (
                  <Button 
                    data-testid="add-device-btn" 
                    size="sm" 
                    onClick={() => { setSelectedDevice(null); setDeviceDialogOpen(true); }}
                    className="btn-primary-action gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden lg:inline">{t('common.add', 'Agregar')}</span>
                  </Button>
                )}
              </div>
              
              {/* Mobile Actions */}
              <div className="flex md:hidden items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleRefreshAll} disabled={refreshing} className="p-2 text-slate-400 hover:text-white">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={() => { setSelectedDevice(null); setDeviceDialogOpen(true); }} className="btn-primary-action p-2">
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {/* Utilities - Separator with glow */}
              <div className="flex items-center gap-2 border-l border-slate-700/50 pl-4 ml-2">
                <LanguageSelector />
                {/* Alert Bell with sidebar */}
                <AlertBell 
                  alerts={alerts}
                  onAlertClick={(alert) => {
                    const device = devices.find(d => d.id === alert.device_id);
                    if (device) {
                      setHistoryModalDevice(device);
                      setHistoryModalOpen(true);
                    }
                  }}
                  onViewAll={() => setActiveTab('alerts')}
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleAlertSound}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
                  title={soundEnabled ? t('alerts.soundOn', 'Sonido activado') : t('alerts.soundOff', 'Sonido desactivado')}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </div>
              
              {/* User Menu - Premium Style */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-cyan-500/20">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline text-sm font-medium">{user?.username}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.full_name || user?.username}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem><RoleBadge role={user?.role} /></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive gap-2">
                    <LogOut className="w-4 h-4" />{t('auth.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu - Slide-out */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileMenuOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Menu Panel */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-slate-700 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={LOGO_URL} alt="Siempria" className="h-8 object-contain" />
                <span className="font-bold text-white text-sm">MENÚ</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 text-slate-400 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* NOC Quick Access Button - Prominent at top */}
            <div className="px-3 pt-3 pb-2">
              <button
                onClick={() => { setNocDashboardOpen(true); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Monitor className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <span className="block text-sm font-bold">NOC Dashboard</span>
                  <span className="block text-xs text-cyan-200 opacity-80">{t('noc.subtitle', 'Centro de Operaciones 24/7')}</span>
                </div>
                <div className="flex items-center gap-1">
                  {deviceStats.offline > 0 && (
                    <Badge className="bg-red-500 text-white animate-pulse">{deviceStats.offline}</Badge>
                  )}
                  <ChevronRight className="w-5 h-5 opacity-60" />
                </div>
              </button>
            </div>
            
            {/* Navigation Items */}
            <nav className="p-3 space-y-1">
              {canAccessSection('devices') && (
                <button
                  onClick={() => { setActiveTab('devices'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'devices' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Server className="w-5 h-5" />
                  <span>{t('nav.devices', 'Dispositivos')}</span>
                </button>
              )}
              {canAccessSection('statistics') && (
                <button
                  onClick={() => { setActiveTab('statistics'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'statistics' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>{t('stats.title', 'Estadísticas')}</span>
                </button>
              )}
              {canAccessSection('organizations') && (
                <button
                  onClick={() => { setActiveTab('structure'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'structure' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Building2 className="w-5 h-5" />
                  <span>{t('nav.structure', 'Estructura')}</span>
                </button>
              )}
              {canAccessSection('devices') && (
                <button
                  onClick={() => { setActiveTab('types'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'types' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Tag className="w-5 h-5" />
                  <span>{t('nav.types', 'Tipos')}</span>
                </button>
              )}
              {canAccessSection('alerts') && (
                <button
                  onClick={() => { setActiveTab('alerts'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'alerts' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Bell className="w-5 h-5" />
                  <span>{t('nav.alerts', 'Alertas')}</span>
                  {alerts.length > 0 && <Badge className="ml-auto bg-red-500 text-white">{alerts.length}</Badge>}
                </button>
              )}
              {canAccessSection('gallery') && (
                <button
                  onClick={() => { setActiveTab('gallery'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'gallery' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Camera className="w-5 h-5" />
                  <span>Galería</span>
                </button>
              )}
              {canAccessSection('cra') && (
                <button
                  onClick={() => { setActiveTab('cra'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'cra' ? 'bg-red-500/20 text-red-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Shield className="w-5 h-5 text-red-500" />
                  <span>CRA</span>
                </button>
              )}
              {canAccessSection('live') && (
                <button
                  onClick={() => { setActiveTab('live'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'live' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Video className="w-5 h-5" />
                  <span>En Directo</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => { setActiveTab('infrastructure'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'infrastructure' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Server className="w-5 h-5" />
                  <span>{t('nav.infrastructure', 'Infraestructura')}</span>
                </button>
              )}
              {canAccessSection('users') && (
                <button
                  onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'users' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Users className="w-5 h-5" />
                  <span>{t('nav.users', 'Usuarios')}</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => { setActiveTab('logs'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'logs' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <FileSearch className="w-5 h-5" />
                  <span>Logs</span>
                </button>
              )}
              {canAccessSection('incidents') && (
                <button
                  onClick={() => { setActiveTab('incidents'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'incidents' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span>{t('nav.incidents', 'Incidencias')}</span>
                </button>
              )}
              {canAccessSection('settings') && (
                <button
                  onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'settings' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Settings className="w-5 h-5" />
                  <span>{t('nav.settings', 'Configuración')}</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => { setActiveTab('superadmin'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'superadmin' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Shield className="w-5 h-5 text-purple-500" />
                  <span>Super Admin</span>
                </button>
              )}
            </nav>
            
            {/* User Info at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900/95">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => { logout(); setMobileMenuOpen(false); }}
              >
                <LogOut className="w-4 h-4" />
                {t('auth.logout', 'Cerrar Sesión')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="container mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Desktop tabs - hidden on mobile (hamburger menu used instead) */}
          <div className="hidden md:block overflow-x-auto pb-2">
            <TabsList className="mb-4 sm:mb-6 flex-nowrap h-auto gap-1 w-max">
              {canAccessSection('devices') && (
                <TabsTrigger data-testid="tab-devices" value="devices" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  {isOperator ? <Camera className="w-3 h-3 sm:w-4 sm:h-4" /> : <Server className="w-3 h-3 sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline">{isOperator ? t('devices.cameras', 'Cámaras Online') : t('nav.devices')}</span>
                  <span className="sm:hidden">{isOperator ? 'Cámaras' : 'Disp.'}</span>
                </TabsTrigger>
              )}
              {canAccessSection('statistics') && <TabsTrigger data-testid="tab-statistics" value="statistics" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t('stats.title', 'Estadísticas')}</span><span className="sm:hidden">Stats</span></TabsTrigger>}
              {canAccessSection('organizations') && <TabsTrigger data-testid="tab-structure" value="structure" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Building2 className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t('nav.structure', 'Estructura')}</span><span className="sm:hidden">Org.</span></TabsTrigger>}
              {canAccessSection('devices') && <TabsTrigger data-testid="tab-types" value="types" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Tag className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t('nav.types', 'Tipos')}</span><span className="sm:hidden">Tipos</span></TabsTrigger>}
              {canAccessSection('alerts') && <TabsTrigger data-testid="tab-alerts" value="alerts" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Bell className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t('nav.alerts', 'Alertas')}</span><span className="sm:hidden">Alert.</span>{alerts.length > 0 && <Badge variant="secondary" className="ml-1 h-4 sm:h-5 px-1 text-[10px] sm:text-xs">{alerts.length}</Badge>}</TabsTrigger>}
              {canAccessSection('gallery') && <TabsTrigger data-testid="tab-gallery" value="gallery" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Camera className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">Galería</span><span className="sm:hidden">Gal.</span></TabsTrigger>}
              {canAccessSection('cra') && <TabsTrigger data-testid="tab-cra" value="cra" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Shield className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />CRA</TabsTrigger>}
              {canAccessSection('devices') && <TabsTrigger data-testid="tab-dahua" value="dahua" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><HardDrive className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" /><span className="hidden sm:inline">Grabadores</span><span className="sm:hidden">DVR</span></TabsTrigger>}
              {canAccessSection('live') && <TabsTrigger data-testid="tab-live" value="live" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Video className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">En Directo</span><span className="sm:hidden">Live</span></TabsTrigger>}
              {isAdmin && <TabsTrigger data-testid="tab-infrastructure" value="infrastructure" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Server className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t('nav.infrastructure', 'Infraestructura')}</span><span className="sm:hidden">Infra</span></TabsTrigger>}
              {canAccessSection('users') && <TabsTrigger data-testid="tab-users" value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Users className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t('nav.users')}</span><span className="sm:hidden">Users</span></TabsTrigger>}
              {isAdmin && <TabsTrigger data-testid="tab-logs" value="logs" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><FileSearch className="w-3 h-3 sm:w-4 sm:h-4" />Logs</TabsTrigger>}
              {canAccessSection('incidents') && <TabsTrigger data-testid="tab-incidents" value="incidents" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><ClipboardList className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t('nav.incidents')}</span><span className="sm:hidden">Incid.</span></TabsTrigger>}
              {canAccessSection('settings') && <TabsTrigger data-testid="tab-settings" value="settings" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Settings className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t('nav.settings')}</span><span className="sm:hidden">Config</span></TabsTrigger>}
              {isAdmin && <TabsTrigger data-testid="tab-superadmin" value="superadmin" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"><Shield className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">Super Admin</span><span className="sm:hidden">Admin</span></TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="devices">
            {/* Filters - not for operators, available for technicians */}
            {!isOperator && (
              <>
                {/* Row 1: Search + Filters + Stats button on right */}
                <div className="flex gap-2 mb-2 flex-wrap items-center">
                  {/* Search input with magnifying glass */}
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder={t('common.search', 'Buscar...')}
                      className="w-full sm:w-[200px] pl-8 h-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Filter dropdowns */}
                  <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                    {uniqueCountries.length > 0 && (
                      <Select value={filterCountry || "all"} onValueChange={(v) => { setFilterCountry(v === "all" ? null : v); setFilterOrgId(null); setFilterGroupId(null); }}>
                        <SelectTrigger className="w-[calc(50%-4px)] sm:w-[150px] h-9 text-xs sm:text-sm"><SelectValue placeholder={t('common.country', 'País')} /></SelectTrigger>
                        <SelectContent><SelectItem value="all">🌍 {t('common.all', 'Todos')}</SelectItem>{uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    <Select value={filterOrgId || "all"} onValueChange={(v) => { setFilterOrgId(v === "all" ? null : v); setFilterGroupId(null); }}>
                      <SelectTrigger className="w-[calc(50%-4px)] sm:w-[180px] h-9 text-xs sm:text-sm"><SelectValue placeholder="Org." /></SelectTrigger>
                      <SelectContent><SelectItem value="all">{t('filters.allOrgs', 'Todas')}</SelectItem>{(filterCountry ? organizations.filter(o => o.country === filterCountry) : organizations).sort((a,b) => a.name.localeCompare(b.name, 'es')).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={filterGroupId || "all"} onValueChange={(v) => setFilterGroupId(v === "all" ? null : v)}>
                      <SelectTrigger className="w-[calc(50%-4px)] sm:w-[180px] h-9 text-xs sm:text-sm"><SelectValue placeholder="Grupo" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">{t('filters.allGroups', 'Todos')}</SelectItem>{(filterOrgId ? sortedGroups.filter(g => g.organization_id === filterOrgId) : sortedGroups).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={filterTypeId || "all"} onValueChange={(v) => setFilterTypeId(v === "all" ? null : v)}>
                      <SelectTrigger className="w-[calc(50%-4px)] sm:w-[180px] h-9 text-xs sm:text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">{t('filters.allTypes', 'Todos')}</SelectItem>{deviceTypes.map(dtype => { const Icon = getIcon(dtype.icon); return <SelectItem key={dtype.id} value={dtype.id}><div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color: dtype.color }} />{dtype.name}</div></SelectItem>; })}</SelectContent>
                    </Select>
                    {/* Status filter */}
                    <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? null : v)}>
                      <SelectTrigger className="w-[calc(50%-4px)] sm:w-[140px] h-9 text-xs sm:text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('common.all', 'Todos')}</SelectItem>
                        <SelectItem value="online"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" />{t('devices.online', 'Online')}</div></SelectItem>
                        <SelectItem value="offline"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" />{t('devices.offline', 'Offline')}</div></SelectItem>
                        <SelectItem value="unknown"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400" />{t('devices.unknown', 'Desconocido')}</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Stats button on the right */}
                  <Button 
                    variant={filterStats ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setFilterStats(!filterStats)}
                    className={`h-9 text-xs sm:text-sm ml-auto ${filterStats ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                  >
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Stats
                  </Button>
                </div>
                {/* Row 2: Clear button + Total count + Device type summary - CENTERED */}
                <div className="flex justify-center items-center gap-4 mb-4 sm:mb-6 flex-wrap">
                  {(searchQuery || filterCountry || filterOrgId || filterGroupId || filterTypeId || filterStatus || filterStats) && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs sm:text-sm" onClick={() => { setSearchQuery(""); setFilterCountry(null); setFilterOrgId(null); setFilterGroupId(null); setFilterTypeId(null); setFilterStatus(null); setFilterStats(false); }}>
                      <X className="w-3 h-3 mr-1" />
                      {t('common.clear', 'Limpiar')}
                    </Button>
                  )}
                  <span className="text-sm font-medium text-muted-foreground">{filteredDevices.length} {t('devices.deviceCount', 'dispositivo(s)')}</span>
                  {/* Device type summary */}
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                    {(() => {
                      const typeCounts = {};
                      filteredDevices.forEach(d => {
                        const dtype = deviceTypes.find(t => t.id === d.device_type_id);
                        const typeName = dtype?.name || t('devices.noType', 'Sin tipo');
                        typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
                      });
                      return Object.entries(typeCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([name, count], idx) => {
                          const dtype = deviceTypes.find(t => t.name === name);
                          const Icon = dtype ? getIcon(dtype.icon) : Box;
                          const color = dtype?.color || '#888';
                          return (
                            <span key={name} className="flex items-center gap-1">
                              {idx > 0 && <span className="text-muted-foreground/50">•</span>}
                              <Icon className="w-3 h-3 sm:w-4 sm:h-4" style={{ color }} />
                              <span>{count} {name}</span>
                            </span>
                          );
                        });
                    })()}
                  </div>
                </div>
              </>
            )}
            
            {/* Technician header */}
            {isTechnician && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Vista de Técnico - Acceso completo a información técnica</span>
                </div>
                <p className="text-sm text-amber-600 mt-1">Puedes ver IP, puerto, historial y detalles de todos los dispositivos (solo lectura)</p>
              </div>
            )}
            
            {/* Operator header */}
            {isOperator && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 text-purple-700">
                  <Camera className="w-5 h-5" />
                  <span className="font-medium">Vista de Operador - {filteredDevices.length} cámara(s) online</span>
                </div>
                <p className="text-sm text-purple-600 mt-1">Solo se muestran cámaras con conexión activa</p>
              </div>
            )}

            {loading ? <LoadingSkeleton /> : filteredDevices.length === 0 ? (
              <div className="empty-state py-16"><Server className="w-16 h-16 mb-4 opacity-20" /><h3 className="text-lg font-medium mb-2">{t('devices.noDevices', 'No hay dispositivos')}</h3>{canEdit && <Button onClick={() => setDeviceDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />{t('common.add', 'Agregar')}</Button>}</div>
            ) : (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={paginatedDevices.map(d => d.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                      {paginatedDevices.map(d => (
                        <SortableCard key={d.id} id={d.id}>
                          <ServerCard device={d} group={groups.find(g => g.id === d.group_id)} deviceType={deviceTypes.find(t => t.id === d.device_type_id)} onCheck={handleCheckDevice} onEdit={(dev) => { setSelectedDevice(dev); setDeviceDialogOpen(true); }} onClone={handleCloneDevice} onDelete={(dev) => { setDeleteTarget({ type: "device", item: dev }); setDeleteDialogOpen(true); }} onViewHistory={handleViewHistory} onMobotixInfo={handleMobotixInfo} onCreateIncident={(isAdmin || isTechnician) ? handleCreateIncidentFromDevice : null} onOpenLiveView={(dev) => setActiveTab('live')} canEdit={canEdit} />
                        </SortableCard>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 pb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(1)} 
                      disabled={currentPage === 1}
                    >
                      «
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                    >
                      ‹
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                      <span className="text-muted-foreground ml-2">({filteredDevices.length} dispositivos)</span>
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                    >
                      ›
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(totalPages)} 
                      disabled={currentPage === totalPages}
                    >
                      »
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            <StatisticsPanel devices={devices} groups={groups} authAxios={authAxios} />
          </TabsContent>

          <TabsContent value="structure">
            <OrganizationsPanel organizations={organizations} groups={groups} devices={devices} canEdit={canEdit}
              onCreateOrg={() => { setSelectedOrg(null); setOrgDialogOpen(true); }}
              onEditOrg={(o) => { setSelectedOrg(o); setOrgDialogOpen(true); }}
              onDeleteOrg={(o) => { setDeleteTarget({ type: "org", item: o }); setDeleteDialogOpen(true); }}
              onCreateGroup={(orgId) => { setSelectedGroup(null); setGroupDialogOrgId(orgId); setGroupDialogOpen(true); }}
              onEditGroup={(g) => { setSelectedGroup(g); setGroupDialogOpen(true); }}
              onDeleteGroup={(g) => { setDeleteTarget({ type: "group", item: g }); setDeleteDialogOpen(true); }}
              onExport={handleExport}
              onViewGroupDevices={(groupId) => { setFilterGroupId(groupId); setActiveTab("devices"); }} />
          </TabsContent>

          <TabsContent value="types">
            <DeviceTypesPanel deviceTypes={deviceTypes} canEdit={canEdit} devices={devices}
              onCreateType={() => { setSelectedType(null); setTypeDialogOpen(true); }}
              onEditType={(t) => { setSelectedType(t); setTypeDialogOpen(true); }}
              onDeleteType={(t) => { setDeleteTarget({ type: "type", item: t }); setDeleteDialogOpen(true); }}
              onFilterByType={(typeId) => { setFilterTypeId(typeId); setActiveTab("devices"); }} />
          </TabsContent>

          <TabsContent value="alerts">
            <div className="space-y-6">
              {/* Device Status Grid - Visual mosaic */}
              <DeviceStatusGrid 
                devices={devices}
                groups={groups}
                organizations={organizations}
                deviceTypes={deviceTypes}
                onDeviceClick={(device) => {
                  setHistoryModalDevice(device);
                  setHistoryModalOpen(true);
                }}
              />
              {/* Existing Alerts Panel */}
              <AlertsPanel alerts={alerts} organizations={organizations} devices={devices} groups={groups} authAxios={authAxios} />
            </div>
          </TabsContent>
          {!isOperator && <TabsContent value="gallery"><DeviceGallery authAxios={authAxios} devices={devices} organizations={organizations} groups={groups} /></TabsContent>}
          {!isOperator && <TabsContent value="cra"><CRADashboard authAxios={authAxios} onOpenLiveView={(device) => { setActiveTab('live'); }} /></TabsContent>}
          
          {/* Dahua DVR/NVR Tab */}
          <TabsContent value="dahua">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                  <HardDrive className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Grabadores Dahua P2P</h2>
                  <p className="text-muted-foreground">Gestión y monitorización de DVR/NVR Dahua</p>
                </div>
              </div>
              <DahuaDevicesPanel authAxios={authAxios} groups={groups} organizations={organizations} />
            </div>
          </TabsContent>
          
          {!isOperator && <TabsContent value="live" className="h-[calc(100vh-200px)]"><LiveViewer authAxios={authAxios} devices={devices} organizations={organizations} groups={groups} /></TabsContent>}
          {isAdmin && <TabsContent value="infrastructure"><InfrastructurePanel authAxios={authAxios} /></TabsContent>}
          {isAdmin && <TabsContent value="users"><UsersPanel users={users} authAxios={authAxios} onCreateUser={() => { setSelectedUser(null); setUserDialogOpen(true); }} onEditUser={(u) => { setSelectedUser(u); setUserDialogOpen(true); }} onDeleteUser={(u) => { setDeleteTarget({ type: "user", item: u }); setDeleteDialogOpen(true); }} onResetPassword={handleOpenPasswordDialog} onUserUpdate={fetchAll} /></TabsContent>}
          {isAdmin && <TabsContent value="logs"><AccessLogsPanel authAxios={authAxios} /></TabsContent>}
          {(isAdmin || isTechnician) && <TabsContent value="incidents"><IncidentsPanel devices={devices} authAxios={authAxios} /></TabsContent>}
          {isAdmin && <TabsContent value="settings">
            <div className="space-y-6">
              <SystemStatusDashboard authAxios={authAxios} />
              <AIInsightsPanel authAxios={authAxios} />
              <SLAReportsPanel authAxios={authAxios} organizations={organizations} />
              <IntegrationsPanel settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />
              <TelegramSettings settings={settings} onSave={handleSaveSettings} authAxios={authAxios} />
              <MaintenancePanel authAxios={authAxios} devices={devices} onRefresh={fetchAll} />
              <DahuaDevicesPanel authAxios={authAxios} groups={groups} organizations={organizations} />
              <NotificationSettings />
              <ReportSettings authAxios={authAxios} />
              <SecurityPanel />
              <ScheduledReportsPanel organizations={organizations} authAxios={authAxios} />
              <DailyReportPanel authAxios={authAxios} />
              <BackupPanel authAxios={authAxios} />
            </div>
          </TabsContent>}
          {isAdmin && <TabsContent value="superadmin"><SuperAdminTab authAxios={authAxios} /></TabsContent>}
        </Tabs>
      </main>

      {/* CRA Floating Button */}
      {!isOperator && (
        <CRAFloatingButton 
          authAxios={authAxios} 
          onClick={() => setActiveTab('cra')} 
          isActive={activeTab === 'cra'}
        />
      )}

      {/* Live Viewer Floating Button - below CRA button */}
      <LiveViewerFloatingButton 
        authAxios={authAxios}
        devices={devices}
        onClick={() => setActiveTab('live')} 
        isActive={activeTab === 'live'}
      />

      {/* NOC Dashboard Floating Button */}
      <NOCFloatingButton 
        onClick={() => setNocDashboardOpen(true)}
        offlineCount={deviceStats.offline}
      />

      {/* NOC Dashboard Full Screen */}
      {nocDashboardOpen && (
        <NOCDashboard
          devices={devices}
          organizations={organizations}
          groups={groups}
          alerts={alerts}
          deviceTypes={deviceTypes}
          authAxios={authAxios}
          onClose={() => setNocDashboardOpen(false)}
          onDeviceClick={(device) => {
            setNocDashboardOpen(false);
            setSelectedDevice(device);
            setActiveTab('devices');
          }}
          onCreateIncident={(device) => {
            setNocDashboardOpen(false);
            setSelectedDevice(device);
            setActiveTab('incidents');
            // Optionally trigger incident creation dialog
          }}
          onViewLive={(device) => {
            setNocDashboardOpen(false);
            setSelectedDevice(device);
            setActiveTab('live');
          }}
          onViewHistory={(device) => {
            setHistoryModalDevice(device);
            setHistoryModalOpen(true);
          }}
        />
      )}

      {/* Logo fijo en la parte inferior para móvil - solo el logo, sin fondo */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-center py-2 bg-white/95 backdrop-blur-sm border-t border-gray-100" style={{ zIndex: 9999 }}>
        <img src={LOGO_HORIZONTAL_URL} alt="Siempria" className="h-8 object-contain" />
      </div>
      
      {/* Spacer para móvil para que el contenido no quede debajo del logo */}
      <div className="md:hidden h-12" />

      {/* Dialogs */}
      <DeviceFormDialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen} device={selectedDevice} organizations={organizations} groups={groups} deviceTypes={deviceTypes} onSave={handleSaveDevice} />
      <OrganizationFormDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} organization={selectedOrg} onSave={handleSaveOrg} />
      <GroupFormDialog open={groupDialogOpen} onOpenChange={(o) => { setGroupDialogOpen(o); if (!o) setGroupDialogOrgId(null); }} group={selectedGroup ? selectedGroup : groupDialogOrgId ? { organization_id: groupDialogOrgId } : null} organizations={organizations} onSave={handleSaveGroup} />
      <UserFormDialog open={userDialogOpen} onOpenChange={setUserDialogOpen} user={selectedUser} organizations={organizations} groups={groups} onSave={handleSaveUser} />
      <DeviceTypeFormDialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen} deviceType={selectedType} onSave={handleSaveType} />
      <HistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} device={selectedDevice} history={deviceHistory} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Confirmar Eliminación" message={`¿Eliminar "${deleteTarget.item?.name || deleteTarget.item?.username}"?`} onConfirm={handleDelete} />
      <FailuresDialog open={failuresDialogOpen} onOpenChange={setFailuresDialogOpen} failures={recentFailures} onClear={() => setRecentFailures([])} />
      
      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Usuario: {users.find(u => u.id === passwordUserId)?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input 
                id="new-password" 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSetPassword}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Mobotix Info Dialog */}
      <Dialog open={mobotixDialogOpen} onOpenChange={setMobotixDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cctv className="w-5 h-5 text-cyan-600" />
              Información de Cámara Mobotix
            </DialogTitle>
            <DialogDescription>
              {selectedDevice?.name} ({selectedDevice?.ip_address}:{selectedDevice?.port})
            </DialogDescription>
          </DialogHeader>
          
          {mobotixLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Consultando cámara...</span>
            </div>
          ) : mobotixInfo?.errors?.length > 0 && !mobotixInfo?.system?.model ? (
            <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              No se pudo conectar con la cámara. Verifica que la API HTTP esté habilitada y las credenciales sean correctas.
              <div className="mt-2 text-xs font-mono">{mobotixInfo.errors.join(", ")}</div>
            </div>
          ) : mobotixInfo ? (
            <div className="space-y-4">
              {/* Status Cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* Recording Status */}
                <div className={`p-3 rounded-lg border-2 ${mobotixInfo.is_recording === true ? 'bg-red-50 border-red-200' : mobotixInfo.is_recording === false ? 'bg-gray-50 border-gray-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {mobotixInfo.is_recording === true ? (
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    ) : (
                      <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    )}
                    <span className="text-sm font-semibold">Grabación</span>
                  </div>
                  <p className={`text-xs font-medium ${mobotixInfo.is_recording === true ? 'text-red-700' : 'text-gray-600'}`}>
                    {mobotixInfo.is_recording === true ? '🔴 GRABANDO' : mobotixInfo.is_recording === false ? '⚪ Inactiva' : '❓ Desconocido'}
                  </p>
                  {mobotixInfo.recording?.recording_mode && (
                    <p className="text-xs text-muted-foreground mt-1">Modo: {mobotixInfo.recording.recording_mode}</p>
                  )}
                </div>
                
                {/* NTP Status */}
                <div className={`p-3 rounded-lg border-2 ${mobotixInfo.ntp_configured ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-semibold">NTP</span>
                  </div>
                  <p className={`text-xs font-medium ${mobotixInfo.ntp_configured ? 'text-green-700' : 'text-orange-700'}`}>
                    {mobotixInfo.ntp_configured ? '✅ Configurado' : '⚠️ No configurado'}
                  </p>
                  {mobotixInfo.ntp_server && (
                    <p className="text-xs text-muted-foreground mt-1 break-all" title={mobotixInfo.ntp_server}>{mobotixInfo.ntp_server}</p>
                  )}
                  {!mobotixInfo.ntp_server && mobotixInfo.time?.ntp_servers_found?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 break-all">{mobotixInfo.time.ntp_servers_found.join(", ")}</p>
                  )}
                  {mobotixInfo.time?.time_servers_protocol && (
                    <p className="text-xs text-muted-foreground">Protocolo: {mobotixInfo.time.time_servers_protocol}</p>
                  )}
                </div>
                
                {/* Error Status */}
                <div className={`p-3 rounded-lg border-2 ${mobotixInfo.has_errors ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Estado</span>
                  </div>
                  <p className={`text-xs font-medium ${mobotixInfo.has_errors ? 'text-red-700' : 'text-green-700'}`}>
                    {mobotixInfo.has_errors ? '❌ Con errores' : '✅ Sin errores'}
                  </p>
                  {mobotixInfo.error_details?.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">{mobotixInfo.error_details[0]}</p>
                  )}
                </div>
              </div>
              
              {/* System Info */}
              {mobotixInfo.system && Object.keys(mobotixInfo.system).length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Server className="w-4 h-4" /> Sistema</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {mobotixInfo.system.model && <><span className="text-muted-foreground">Modelo:</span><span className="font-medium">{mobotixInfo.system.model}</span></>}
                    {mobotixInfo.system.serial_number && <><span className="text-muted-foreground">Serie:</span><span className="font-mono">{mobotixInfo.system.serial_number}</span></>}
                    {mobotixInfo.system.software && <><span className="text-muted-foreground">Software:</span><span>{mobotixInfo.system.software}</span></>}
                    {mobotixInfo.firmware_version && <><span className="text-muted-foreground">Firmware:</span><span>{mobotixInfo.firmware_version}</span></>}
                    {mobotixInfo.system.uptime && <><span className="text-muted-foreground">Uptime:</span><span>{mobotixInfo.system.uptime}</span></>}
                    {mobotixInfo.system.date_time && <><span className="text-muted-foreground">Fecha/Hora:</span><span>{mobotixInfo.system.date_time}</span></>}
                  </div>
                </div>
              )}
              
              {/* Network Info */}
              {mobotixInfo.networking && Object.keys(mobotixInfo.networking).length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Network className="w-4 h-4" /> Red</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {mobotixInfo.networking.camera_name && <><span className="text-muted-foreground">Nombre:</span><span className="font-medium">{mobotixInfo.networking.camera_name}</span></>}
                    {mobotixInfo.networking.ip_address && <><span className="text-muted-foreground">IP:</span><span className="font-mono">{mobotixInfo.networking.ip_address}</span></>}
                    {mobotixInfo.networking.network_mask && <><span className="text-muted-foreground">Máscara:</span><span>{mobotixInfo.networking.network_mask}</span></>}
                    {mobotixInfo.networking.link_speed && <><span className="text-muted-foreground">Velocidad:</span><span>{mobotixInfo.networking.link_speed}</span></>}
                  </div>
                </div>
              )}
              
              {/* Storage Info */}
              {mobotixInfo.storage && Object.keys(mobotixInfo.storage).length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Almacenamiento</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {mobotixInfo.storage.type && <><span className="text-muted-foreground">Tipo:</span><span>{mobotixInfo.storage.type}</span></>}
                    {mobotixInfo.storage.current_usage && <><span className="text-muted-foreground">Uso actual:</span><span className="font-medium">{mobotixInfo.storage.current_usage}</span></>}
                    {mobotixInfo.storage.maximum_size && <><span className="text-muted-foreground">Tamaño máx:</span><span>{mobotixInfo.storage.maximum_size}</span></>}
                    {mobotixInfo.storage.flash_wear && <><span className="text-muted-foreground">Desgaste Flash:</span><span>{mobotixInfo.storage.flash_wear}</span></>}
                    {mobotixInfo.storage.sequences && <><span className="text-muted-foreground">Secuencias:</span><span>{mobotixInfo.storage.sequences}</span></>}
                  </div>
                </div>
              )}
              
              {/* Image/Video Info */}
              {mobotixInfo.image && Object.keys(mobotixInfo.image).length > 0 && (
                <div className="p-3 bg-cyan-50 rounded-lg">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Camera className="w-4 h-4" /> Imagen/Video</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {mobotixInfo.image.video_codec && <><span className="text-muted-foreground">Codec:</span><span>{mobotixInfo.image.video_codec}</span></>}
                    {mobotixInfo.image.frame_rate && <><span className="text-muted-foreground">Frame Rate:</span><span className="font-medium">{mobotixInfo.image.frame_rate}</span></>}
                    {mobotixInfo.image.image_quality && <><span className="text-muted-foreground">Calidad:</span><span>{mobotixInfo.image.image_quality}</span></>}
                  </div>
                </div>
              )}
              
              {/* Sensors Info */}
              {mobotixInfo.sensors && Object.keys(mobotixInfo.sensors).length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Thermometer className="w-4 h-4" /> Sensores</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {mobotixInfo.sensors.temperature && <><span className="text-muted-foreground">Temperatura:</span><span className="font-medium">{mobotixInfo.sensors.temperature}</span></>}
                    {mobotixInfo.sensors.illumination && <><span className="text-muted-foreground">Iluminación:</span><span>{mobotixInfo.sensors.illumination}</span></>}
                  </div>
                </div>
              )}
              
              {/* API Errors */}
              {mobotixInfo.errors && mobotixInfo.errors.length > 0 && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium mb-2 text-orange-700">⚠️ Endpoints no disponibles</p>
                  <div className="text-xs text-orange-600 space-y-1">
                    {mobotixInfo.errors.map((err, i) => (
                      <p key={i} className="font-mono">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create Incident from Device Dialog */}
      <Dialog open={incidentFromDeviceOpen} onOpenChange={setIncidentFromDeviceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-600" />
              Crear Incidencia
            </DialogTitle>
            <DialogDescription>
              Crear incidencia para {incidentDeviceData.device?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input 
                value={incidentDeviceData.title}
                onChange={(e) => setIncidentDeviceData({ ...incidentDeviceData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea 
                value={incidentDeviceData.description}
                onChange={(e) => setIncidentDeviceData({ ...incidentDeviceData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select value={incidentDeviceData.priority} onValueChange={(v) => setIncidentDeviceData({ ...incidentDeviceData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {incidentDeviceData.device && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span><strong>Dispositivo:</strong> {incidentDeviceData.device.name} ({incidentDeviceData.device.ip_address})</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidentFromDeviceOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmitIncidentFromDevice} disabled={creatingIncident}>
              {creatingIncident ? t('common.creating', 'Creando...') : t('incidents.addIncident')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device History Modal */}
      <DeviceHistoryModal
        device={historyModalDevice}
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryModalDevice(null);
        }}
        alerts={alerts}
        authAxios={authAxios}
        onRefresh={async (deviceId) => {
          try {
            await authAxios.post(`/devices/${deviceId}/check`);
            toast.success('Verificación iniciada');
            fetchAll();
          } catch (e) {
            toast.error('Error al verificar dispositivo');
          }
        }}
      />

      {/* Onboarding Wizard for new tenant_admin */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          if (user?.id) {
            localStorage.setItem(`onboarding_dismissed_${user.id}`, 'true');
          }
        }}
        authAxios={authAxios}
        user={user}
        onComplete={() => {
          fetchAll();
          if (user?.id) {
            localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
          }
        }}
      />

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Siempria" className="h-8 object-contain opacity-70" />
              <span className="text-sm text-muted-foreground">WatchTower by Siempria</span>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Siempria - Todos los derechos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============ APP ============
function App() { return <AuthProvider><AppContent /></AuthProvider>; }
const AppContent = () => { 
  const { user, loading, login } = useAuth(); 
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    // Show loading screen for at least 2.5 seconds on initial load
    const timer = setTimeout(() => setShowLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);
  
  if (showLoading || loading) return <LoadingScreen />; 
  return user ? <Dashboard /> : <LoginPage login={login} />; 
};
export default App;
