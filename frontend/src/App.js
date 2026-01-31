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
  Archive, RotateCcw, CloudDownload, FolderArchive, FileSearch, AlertTriangle, Cpu, Thermometer, HardDrive as HardDriveIcon, X, Search, ClipboardList, CheckCircle, MessageSquare, Smartphone
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


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_equip-tracker-39/artifacts/796492pi_version%20autorizada%202.png";
const LOGO_HORIZONTAL_URL = "https://customer-assets.emergentagent.com/job_monitorsys-2/artifacts/qs1jn738_logo%20principal.png";
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

  const login = async (username, password) => {
    const response = await axios.post(`${API}/auth/login`, { username, password });
    const { token: accessToken, user: userData } = response.data;
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const logout = () => { localStorage.removeItem("token"); setToken(null); setUser(null); };

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

  return <AuthContext.Provider value={{ user, token, login, logout, loading, authAxios }}>{children}</AuthContext.Provider>;
};

// ============ COMPONENTS ============
const StatusDot = ({ status }) => {
  const cls = { online: "status-dot-online animate-pulse-online", offline: "status-dot-offline", checking: "status-dot-checking animate-pulse", unknown: "status-dot-unknown" }[status] || "status-dot-unknown";
  return <div className={`status-dot ${cls}`} />;
};

const StatusBadge = ({ status }) => {
  const cfg = { online: { label: "Online", cls: "badge-online" }, offline: { label: "Offline", cls: "badge-offline" }, checking: { label: "Verificando...", cls: "badge-checking" }, unknown: { label: "Desconocido", cls: "bg-muted text-muted-foreground" } }[status] || { label: "?", cls: "bg-muted" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs font-medium px-2 py-0.5`}>{cfg.label}</Badge>;
};

const RoleBadge = ({ role }) => {
  const cfg = { 
    admin: { label: "Admin", cls: "bg-red-100 text-red-700 border-red-200" }, 
    manager: { label: "Gestor", cls: "bg-blue-100 text-blue-700 border-blue-200" }, 
    viewer: { label: "Visor", cls: "bg-gray-100 text-gray-700 border-gray-200" },
    operator: { label: "Operador", cls: "bg-purple-100 text-purple-700 border-purple-200" },
    technician: { label: "Técnico", cls: "bg-amber-100 text-amber-700 border-amber-200" }
  }[role] || { label: role, cls: "bg-gray-100" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs`}>{cfg.label}</Badge>;
};

// ============ LOGIN ============
const LoginPage = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast.error(t('validation.required')); return; }
    setLoading(true);
    try { await login(username, password); toast.success(t('auth.welcomeBack')); } catch (e) { toast.error(e.response?.data?.detail || t('errors.generic')); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Language selector in top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector variant="outline" />
      </div>
      
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0,163,217,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,217,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      {/* Left side - Info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative">
        <div className="max-w-md text-center">
          {/* Camera animation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-cyan-500 rounded-full blur-3xl opacity-20 animate-pulse" style={{ transform: 'scale(2)' }} />
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-8 rounded-full border border-cyan-500/30 shadow-2xl backdrop-blur-sm inline-block">
              <Cctv className="w-24 h-24 text-cyan-400" style={{ animation: 'cameraMove 4s ease-in-out infinite' }} />
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
          </div>
          
          <img src={LOGO_URL} alt="Siempria" className="h-20 mx-auto mb-6 object-contain" style={{ filter: 'drop-shadow(0 0 20px rgba(0,163,217,0.3))' }} />
          
          <h1 className="text-3xl font-light text-white mb-2">Network Monitor</h1>
          <p className="text-cyan-400 mb-8">Sistema de Vigilancia Profesional</p>
          
          <div className="space-y-4 text-slate-400 text-sm">
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-5 h-5 text-cyan-500" />
              <span>Monitoreo en tiempo real 24/7</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Bell className="w-5 h-5 text-cyan-500" />
              <span>Alertas instantáneas por email</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Lock className="w-5 h-5 text-cyan-500" />
              <span>Conexión segura y encriptada</span>
            </div>
          </div>
          
          {/* Partner logo */}
          <div className="mt-12 pt-8 border-t border-slate-700/50">
            <p className="text-slate-500 text-xs mb-3">Distribuidor Autorizado</p>
            <div className="bg-white rounded-lg px-4 py-2 inline-block">
              <img src={MOBOTIX_LOGO_URL} alt="Mobotix" className="h-8 object-contain" onError={(e) => { e.target.parentElement.innerHTML = '<span class="text-lg font-bold text-slate-800">MOBOTIX</span>'; }} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo and contact */}
          <div className="lg:hidden text-center mb-8">
            <img src={LOGO_URL} alt="Siempria" className="h-16 mx-auto mb-4 object-contain" />
            <h1 className="text-xl font-light text-white mb-4">Network Monitor</h1>
            <div className="flex items-center justify-center gap-4">
              <a href="mailto:soporte@siempria.com" className="p-3 bg-cyan-500/20 rounded-full hover:bg-cyan-500/30 transition-colors" title="Email">
                <Mail className="w-5 h-5 text-cyan-400" />
              </a>
              <a href="tel:+34822220022" className="p-3 bg-cyan-500/20 rounded-full hover:bg-cyan-500/30 transition-colors" title="Teléfono">
                <Phone className="w-5 h-5 text-cyan-400" />
              </a>
            </div>
          </div>
          
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-semibold text-slate-800">{t('auth.login')}</CardTitle>
              <CardDescription className="text-slate-500">{t('auth.loginDescription', 'Introduce tus credenciales para continuar')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-700">{t('auth.username')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input data-testid="login-username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" placeholder={t('auth.username')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" />
                  </div>
                </div>
                <Button data-testid="login-submit" type="submit" className="w-full h-12 text-base bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700" disabled={loading}>
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      {t('auth.login')}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* Contact info */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-slate-400 text-sm font-medium">{t('common.needHelp', '¿Necesitas ayuda?')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <a href="mailto:soporte@siempria.com" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <Mail className="w-4 h-4" />
                soporte@siempria.com
              </a>
              <a href="tel:+34822220022" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <Phone className="w-4 h-4" />
                822 22 00 22
              </a>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-700/30 text-center text-slate-500 text-xs space-y-1">
            <p>© {new Date().getFullYear()} Siempria - Todos los derechos reservados</p>
            <p>Distribuidor Autorizado Mobotix para España y Portugal</p>
          </div>
        </div>
      </div>
      
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-500/20" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-cyan-500/20" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-cyan-500/20" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-cyan-500/20" />
    </div>
  );
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
  
  // Get cached firmware or show placeholder
  const firmwareVersion = device.firmware_version;
  const shortVersion = firmwareVersion ? firmwareVersion.replace('MX-', '').split('-')[0] : null;
  
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
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors cursor-pointer border border-blue-200"
          title="Ver información del firmware"
        >
          <Cpu className="w-3 h-3" />
          {shortVersion || 'Info'}
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

// ============ SERVER CARD ============
const ServerCard = memo(({ device, group, deviceType, onCheck, onEdit, onDelete, onClone, onViewHistory, onMobotixInfo, onCreateIncident, canEdit }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageData, setImageData] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [captureTime, setCaptureTime] = useState(null);
  const { authAxios } = useAuth();
  const handleCheck = async () => { setIsChecking(true); await onCheck(device.id); setIsChecking(false); };
  const TypeIcon = deviceType ? getIcon(deviceType.icon) : Server;

  // Check if it's a camera type
  const isCamera = device.device_type_id === "type-camera" || deviceType?.icon === "camera";
  
  // Check if device has camera credentials configured
  const hasCameraConfig = !!(device.camera_user && device.camera_password && device.camera_path);

  // Reference for lazy loading
  const cardRef = useCallback(node => {
    if (!node) return;
    
    // Load image function defined inside callback to avoid hoisting issues
    const loadImage = async () => {
      if (imageData) return;
      setImageLoading(true);
      
      if (hasCameraConfig && device.status === "online") {
        try {
          const response = await authAxios.get(`/image-proxy/${device.id}`, { responseType: 'blob' });
          if (response.data) {
            const url = URL.createObjectURL(response.data);
            setImageData(url);
            setImageError(false);
            setCaptureTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }
        } catch (e) {
          console.error(`Error loading image for ${device.name}:`, e);
          setImageData(OFFLINE_PLACEHOLDER);
          setImageError(true);
          setCaptureTime(null);
        }
      }
      setImageLoading(false);
    };
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !imageData && isCamera && hasCameraConfig && device.status === "online") {
            loadImage();
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(node);
    return () => observer.disconnect();
  }, [imageData, isCamera, hasCameraConfig, device.status, device.id, device.name, authAxios]);

  // Set placeholder for offline cameras immediately
  useEffect(() => {
    if (device.status === "offline" && isCamera) {
      setImageData(OFFLINE_PLACEHOLDER);
      setCaptureTime(null);
      setImageLoading(false);
    } else if (device.image_url && !isCamera) {
      setImageData(device.image_url);
      setImageLoading(false);
    } else if (!isCamera) {
      setImageLoading(false);
    }
  }, [device.status, device.image_url, isCamera]);

  // Show image section ONLY for cameras
  const showImage = isCamera && !imageLoading && (imageData || device.status === "offline");
  const displayImage = imageData || OFFLINE_PLACEHOLDER;

  // Build device web URL for direct access (works for all devices)
  const deviceWebUrl = `http://${device.ip_address}:${device.port}`;
  const cameraWebUrl = hasCameraConfig ? 
    `${device.camera_protocol || 'http'}://${device.ip_address}:${device.port}` : deviceWebUrl;

  const openDeviceInBrowser = () => {
    window.open(cameraWebUrl, '_blank');
  };

  return (
    <Card ref={cardRef} data-testid={`device-card-${device.id}`} className="server-card fade-in hover:-translate-y-0.5 transition-transform duration-200 overflow-hidden">
      {showImage && (
        <div className="aspect-[4/3] bg-muted overflow-hidden relative group">
          {imageLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <img 
              src={displayImage} 
              alt={device.name} 
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => { setImageError(true); setImageData(OFFLINE_PLACEHOLDER); }}
            />
          )}
          {hasCameraConfig && device.status === "online" && !imageLoading && (
            <>
              <div className="absolute bottom-1 left-1">
                {captureTime && <Badge variant="secondary" className="text-xs opacity-75 font-mono">{captureTime}</Badge>}
              </div>
              <div className="absolute bottom-1 right-1">
                <Badge variant="secondary" className="text-xs opacity-75"><Cctv className="w-3 h-3 mr-1" />Live</Badge>
              </div>
              <button 
                onClick={openDeviceInBrowser}
                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                title="Abrir cámara en navegador"
              >
                <Globe className="w-4 h-4 text-white" />
              </button>
              {/* Botón descargar imagen - debajo del botón URL */}
              {imageData && !imageError && (
                <a 
                  href={imageData}
                  download={`${device.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.jpg`}
                  className="absolute top-12 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  title="Descargar imagen"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4 text-white" />
                </a>
              )}
            </>
          )}
          {device.status === "offline" && isCamera && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <WifiOff className="w-8 h-8 mx-auto mb-1 opacity-75" />
                <span className="text-xs">Sin conexión</span>
              </div>
            </div>
          )}
        </div>
      )}
      <CardContent className={`p-5 ${showImage ? 'pt-4' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: deviceType?.color ? `${deviceType.color}20` : '#f4f4f5' }}>
                <TypeIcon className="w-5 h-5" style={{ color: deviceType?.color || '#6b7280' }} />
              </div>
              <StatusDot status={device.status} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground leading-tight">{device.name}</h3>
                <StatusBadge status={device.status} />
              </div>
              <p className="ip-text mt-0.5">{device.ip_address}:{device.port}</p>
            </div>
          </div>
        </div>

        {(device.brand || device.model) && (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-muted-foreground font-medium">{[device.brand, device.model].filter(Boolean).join(" • ")}</p>
            <FirmwareBadge device={device} />
          </div>
        )}
        {device.location && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{device.location}</div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {group && (
            <Badge variant="outline" className="text-xs" style={{ borderColor: group.color, color: group.color }}><FolderOpen className="w-3 h-3 mr-1" />{group.name}</Badge>
          )}
          {device.has_statistics && (
            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-300"><BarChart3 className="w-3 h-3 mr-1" />Stats</Badge>
          )}
        </div>
        {device.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{device.description}</p>}
        
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{device.last_check ? new Date(device.last_check).toLocaleString() : "Sin verificar"}</span>
        </div>

        <Separator className="my-3" />

        <div className="flex flex-col gap-2">
          {/* WhatsApp alert button for offline devices */}
          {device.status === 'offline' && (
            <a 
              href={`https://wa.me/${WHATSAPP_ALERT_NUMBER.replace('+', '')}?text=${encodeURIComponent(`🚨 *ALERTA - Dispositivo Offline*\n\n❌ *${device.name}*\nIP: ${device.ip_address}:${device.port}\n\n_Siempria Network Monitor_`)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" />
              Avisar por WhatsApp
            </a>
          )}
          <Button data-testid={`check-device-${device.id}`} variant="outline" size="sm" onClick={handleCheck} disabled={isChecking} className="w-full">
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isChecking ? 'animate-spin-slow' : ''}`} />Verificar
          </Button>
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="sm" onClick={openDeviceInBrowser} title="Abrir en navegador"><Globe className="w-4 h-4" /></Button>
            {isCamera && (
              <Button variant="ghost" size="sm" onClick={() => onMobotixInfo(device)} title="Info Cámara"><Info className="w-4 h-4" /></Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onViewHistory(device)} title="Historial"><History className="w-4 h-4" /></Button>
            {onCreateIncident && (
              <Button variant="ghost" size="sm" onClick={() => onCreateIncident(device)} title="Crear Incidencia" className="text-orange-600 hover:text-orange-700"><ClipboardList className="w-4 h-4" /></Button>
            )}
            {canEdit && (
              <>
                <Button variant="ghost" size="sm" onClick={() => onClone(device)} title="Clonar dispositivo" className="text-blue-600 hover:text-blue-700"><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(device)} title="Editar"><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(device)} title="Eliminar" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Add display name for debugging
ServerCard.displayName = 'ServerCard';

// ============ DIALOGS ============
const DeviceFormDialog = ({ open, onOpenChange, device, organizations, groups, deviceTypes, onSave }) => {
  const [formData, setFormData] = useState({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "", camera_protocol: "http", camera_user: "", camera_password: "", camera_path: "", has_statistics: false });
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
          has_statistics: device.has_statistics || false
        });
        const grp = groups.find(g => g.id === device.group_id);
        if (grp) setSelectedOrgId(grp.organization_id);
      } else {
        setFormData({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "", camera_protocol: "http", camera_user: "", camera_password: "", camera_path: "", has_statistics: false });
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
            {isCloning ? "Clonar Dispositivo" : device?.id ? "Editar Dispositivo" : "Agregar Dispositivo"}
          </DialogTitle>
          {isCloning && (
            <p className="text-sm text-muted-foreground">Modifica el puerto y nombre para crear el nuevo dispositivo</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2"><Label>Nombre *</Label><Input data-testid="device-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>IP *</Label><Input data-testid="device-ip-input" className="font-mono" value={formData.ip_address} onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Puerto *</Label><Input data-testid="device-port-input" type="number" className="font-mono" value={formData.port} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 80 })} /></div>
            
            <div className="space-y-2">
              <Label>Tipo de Dispositivo</Label>
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
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin tipo</SelectItem>
                  {deviceTypes.map((t) => { const Icon = getIcon(t.icon); return <SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color: t.color }} />{t.name}</div></SelectItem>; })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Organización</Label>
              <Select value={selectedOrgId || "none"} onValueChange={(v) => { setSelectedOrgId(v === "none" ? "" : v); setFormData({ ...formData, group_id: "" }); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todas</SelectItem>
                  {organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Grupo</Label>
              <Select value={formData.group_id || "none"} onValueChange={(v) => setFormData({ ...formData, group_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="device-group-select"><SelectValue placeholder="Sin grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin grupo</SelectItem>
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
                  <Label>Protocolo</Label>
                  <Select value={formData.camera_protocol} onValueChange={(v) => setFormData({ ...formData, camera_protocol: v })}>
                    <SelectTrigger data-testid="camera-protocol-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Usuario cámara</Label>
                  <Input placeholder="admin" value={formData.camera_user} onChange={(e) => setFormData({ ...formData, camera_user: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña cámara</Label>
                  <Input type="password" placeholder="••••••••" value={formData.camera_password} onChange={(e) => setFormData({ ...formData, camera_password: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Ruta de imagen</Label>
                  <div className="flex gap-2">
                    <Select value={formData.camera_path || "custom"} onValueChange={(v) => setFormData({ ...formData, camera_path: v === "custom" ? "" : v })}>
                      <SelectTrigger className="w-[200px]"><SelectValue placeholder="Seleccionar ruta" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="/record/current.jpg">Mobotix (record)</SelectItem>
                        <SelectItem value="/cgi-bin/image.jpg">Mobotix (cgi-bin)</SelectItem>
                        <SelectItem value="/snap.jpg">Genérico (/snap.jpg)</SelectItem>
                        <SelectItem value="/jpg/image.jpg">Axis (/jpg/image.jpg)</SelectItem>
                        <SelectItem value="/Streaming/channels/1/picture">Hikvision</SelectItem>
                        <SelectItem value="custom">Personalizada...</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="/ruta/imagen.jpg" 
                      className="font-mono flex-1" 
                      value={formData.camera_path} 
                      onChange={(e) => setFormData({ ...formData, camera_path: e.target.value })} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Selecciona una ruta predefinida o escribe una personalizada</p>
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
                    <Label htmlFor="has-statistics" className="cursor-pointer font-medium text-cyan-700">Estadísticas MxAnalytics</Label>
                    <p className="text-xs text-cyan-600">Habilita si la cámara tiene conteo de personas y mapa de calor (Mobotix C25/C26)</p>
                  </div>
                  <Activity className="w-5 h-5 text-cyan-500" />
                </div>
              </>
            )}

            <Separator className="col-span-2" />
            <p className="col-span-2 text-sm font-medium text-muted-foreground">Información adicional</p>

            <div className="space-y-2"><Label>Marca</Label><Input placeholder="Ej: Hikvision, Synology" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} /></div>
            <div className="space-y-2"><Label>Modelo</Label><Input placeholder="Ej: DS-2CD2143G2" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Ubicación</Label><Input placeholder="Ej: Oficina Madrid - Planta 2" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
            
            {/* Image URL field removed for non-cameras - they only show icons */}
            
            <div className="col-span-2 space-y-2"><Label>Descripción</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Notas</Label><Textarea placeholder="Notas internas, configuración..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button data-testid="save-device-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const OrganizationFormDialog = ({ open, onOpenChange, organization, onSave }) => {
  const [formData, setFormData] = useState({ name: "", description: "", color: "#3b82f6", logo_url: "", country: "", city: "" });
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
      city: organization.city || ""
    });
    else setFormData({ name: "", description: "", color: "#3b82f6", logo_url: "", country: "", city: "" });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{organization ? "Editar Organización" : "Nueva Organización"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input data-testid="org-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>País/Región</Label>
                <Select value={formData.country || "none"} onValueChange={(v) => setFormData({ ...formData, country: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar país" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input placeholder="Ciudad" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Logo</Label>
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
            <div className="space-y-2"><Label>Color</Label>
              <div className="flex gap-2 flex-wrap">{colors.map((c) => <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const GroupFormDialog = ({ open, onOpenChange, group, organizations, onSave }) => {
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
        <DialogHeader><DialogTitle>{group ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input data-testid="group-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Organización *</Label>
              <Select value={formData.organization_id} onValueChange={(v) => setFormData({ ...formData, organization_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Color</Label>
              <div className="flex gap-2 flex-wrap">{colors.map((c) => <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button data-testid="save-group-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UserFormDialog = ({ open, onOpenChange, user, organizations, groups, onSave }) => {
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
        <DialogHeader><DialogTitle>{user ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Usuario *</Label><Input data-testid="user-username-input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={!!user} /></div>
              <div className="space-y-2"><Label>Email *</Label><Input data-testid="user-email-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>
            {!user && <div className="space-y-2"><Label>Contraseña *</Label><Input data-testid="user-password-input" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nombre completo</Label><Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Rol</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="w-4 h-4" />Admin</div></SelectItem>
                    <SelectItem value="manager"><div className="flex items-center gap-2"><Edit className="w-4 h-4" />Gestor</div></SelectItem>
                    <SelectItem value="technician"><div className="flex items-center gap-2"><Wrench className="w-4 h-4" />Técnico</div></SelectItem>
                    <SelectItem value="operator"><div className="flex items-center gap-2"><Camera className="w-4 h-4" />Operador</div></SelectItem>
                    <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="w-4 h-4" />Visor</div></SelectItem>
                  </SelectContent>
                </Select>
                {formData.role === "technician" && (
                  <p className="text-xs text-amber-600 mt-1">El técnico ve todos los dispositivos (IP, puerto, historial) pero no puede editarlos.</p>
                )}
              </div>
            </div>
            {formData.role !== "admin" && formData.role !== "technician" && (
              <div className="space-y-2">
                <Label>Grupos permitidos</Label>
                <p className="text-xs text-muted-foreground mb-2">Sin selección = acceso a todos. Selecciona para restringir.</p>
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
                  {groupsByOrg.length === 0 && <span className="text-xs text-muted-foreground">No hay grupos creados</span>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button data-testid="save-user-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeviceTypeFormDialog = ({ open, onOpenChange, deviceType, onSave }) => {
  const [formData, setFormData] = useState({ name: "", icon: "server", color: "#6b7280" });
  const [saving, setSaving] = useState(false);
  const icons = ["camera", "hard-drive", "network", "router", "server", "monitor", "printer", "wifi", "shield", "box", "layers"];
  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#14b8a6", "#6366f1", "#a855f7", "#e11d48", "#0ea5e9", "#65a30d", "#dc2626", "#7c3aed", "#db2777", "#059669", "#ca8a04", "#6b7280"];

  useEffect(() => {
    if (deviceType) setFormData({ name: deviceType.name || "", icon: deviceType.icon || "server", color: deviceType.color || "#6b7280" });
    else setFormData({ name: "", icon: "server", color: "#6b7280" });
  }, [deviceType, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error("Nombre requerido"); return; }
    setSaving(true); await onSave(formData, deviceType?.id); setSaving(false); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{deviceType ? "Editar Tipo" : "Nuevo Tipo de Dispositivo"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Icono</Label>
              <div className="flex gap-2 flex-wrap">{icons.map((i) => { const Icon = getIcon(i); return <button key={i} type="button" onClick={() => setFormData({ ...formData, icon: i })} className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${formData.icon === i ? 'border-foreground bg-muted' : 'border-transparent hover:bg-muted/50'}`}><Icon className="w-5 h-5" /></button>; })}</div>
            </div>
            <div className="space-y-2"><Label>Color</Label>
              <div className="flex gap-2 flex-wrap">{colors.map((c) => <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${formData.color}20` }}>
                {(() => { const Icon = getIcon(formData.icon); return <Icon className="w-5 h-5" style={{ color: formData.color }} />; })()}
              </div>
              <span className="font-medium">{formData.name || "Vista previa"}</span>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const HistoryDialog = ({ open, onOpenChange, device, history }) => {
  if (!device) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5" />Historial - {device.name}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{device.ip_address}:{device.port}</DialogDescription>
        </DialogHeader>
        {device.notes && <div className="p-3 bg-muted rounded-lg text-sm"><FileText className="w-4 h-4 inline mr-2" /><strong>Notas:</strong> {device.notes}</div>}
        <ScrollArea className="h-[350px] pr-4">
          {history.length === 0 ? <div className="empty-state py-12"><Activity className="w-12 h-12 mb-4 opacity-20" /><p>No hay historial</p></div> : (
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
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => { setDeleting(true); await onConfirm(); setDeleting(false); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="w-5 h-5" />{title}</DialogTitle><DialogDescription>{message}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button data-testid="confirm-delete-btn" variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Eliminando..." : "Eliminar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Failures summary dialog
// WhatsApp alert number
const WHATSAPP_ALERT_NUMBER = "+34610557829";

const FailuresDialog = ({ open, onOpenChange, failures, onClear }) => {
  // Generate WhatsApp message with all failures
  const getWhatsAppLink = () => {
    if (failures.length === 0) return null;
    const message = `🚨 *ALERTA - Siempria Network Monitor*\n\n` +
      `${failures.length} dispositivo(s) offline:\n\n` +
      failures.map(f => `❌ *${f.name}*\n   IP: ${f.ip}:${f.port}\n   Hora: ${f.time}`).join('\n\n') +
      `\n\n_Enviado desde Siempria Network Monitor_`;
    return `https://wa.me/${WHATSAPP_ALERT_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
  };

  // Generate WhatsApp link for single device
  const getSingleWhatsAppLink = (device) => {
    const message = `🚨 *ALERTA - Dispositivo Offline*\n\n` +
      `❌ *${device.name}*\n` +
      `IP: ${device.ip}:${device.port}\n` +
      `Hora: ${device.time}\n\n` +
      `_Siempria Network Monitor_`;
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
          <DialogDescription>Dispositivos que han perdido conexión recientemente</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          {failures.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay fallos recientes</p>
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
          <Button variant="outline" onClick={onClear}>Limpiar historial</Button>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ PANELS ============
const OrganizationsPanel = ({ organizations, groups, devices, onCreateOrg, onEditOrg, onDeleteOrg, onCreateGroup, onEditGroup, onDeleteGroup, canEdit, onExport, onViewGroupDevices }) => {
  const [openOrgs, setOpenOrgs] = useState({});
  const toggleOrg = (id) => setOpenOrgs(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-lg font-semibold">Organizaciones y Grupos</h2><p className="text-sm text-muted-foreground">Estructura jerárquica de tus dispositivos</p></div>
        <div className="flex items-center gap-2">
          {canEdit && <Button data-testid="add-org-btn" size="sm" onClick={() => onCreateOrg()}><Plus className="w-4 h-4 mr-2" />Nueva Organización</Button>}
        </div>
      </div>

      {organizations.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="text-muted-foreground">No hay organizaciones</p>{canEdit && <Button className="mt-4" onClick={() => onCreateOrg()}><Plus className="w-4 h-4 mr-2" />Crear Organización</Button>}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {organizations.map(org => {
            const orgGroups = groups.filter(g => g.organization_id === org.id);
            const orgDeviceCount = orgGroups.reduce((acc, g) => acc + (g.device_count || 0), 0);
            return (
              <Card key={org.id}>
                <Collapsible open={openOrgs[org.id]} onOpenChange={() => toggleOrg(org.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`w-5 h-5 transition-transform ${openOrgs[org.id] ? 'rotate-90' : ''}`} />
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="h-8 w-8 object-contain rounded" />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: org.color }}><Building2 className="w-4 h-4 text-white" /></div>
                          )}
                          <div>
                            <CardTitle className="text-base">{org.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              {org.description && <CardDescription className="text-xs">{org.description}</CardDescription>}
                              {(org.country || org.city) && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {[org.city, org.country].filter(Boolean).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{orgGroups.length} grupos • {orgDeviceCount} dispositivos</Badge>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => onExport('excel', org.id)}><FileSpreadsheet className="w-4 h-4 mr-2" />Exportar Excel</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onExport('pdf', org.id)}><FileIcon className="w-4 h-4 mr-2" />Exportar PDF</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => onCreateGroup(org.id)}><Plus className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => onEditOrg(org)}><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => onDeleteOrg(org)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      {orgGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No hay grupos en esta organización</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-8">
                          {orgGroups.map(g => (
                            <div key={g.id} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                                  <div><h4 className="font-medium text-sm">{g.name}</h4>{g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}</div>
                                </div>
                                <Badge variant="outline" className="text-xs">{g.device_count || 0}</Badge>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onViewGroupDevices(g.id)}>
                                  <Eye className="w-3 h-3 mr-1" />Ver dispositivos
                                </Button>
                                {canEdit && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => onEditGroup(g)}><Edit className="w-3 h-3" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => onDeleteGroup(g)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DeviceTypesPanel = ({ deviceTypes, onCreateType, onEditType, onDeleteType, canEdit, onFilterByType, devices }) => {
  // Count devices per type
  const getDeviceCount = (typeId) => devices?.filter(d => d.device_type_id === typeId).length || 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" />Tipos de Dispositivos</CardTitle><CardDescription>Haz clic en un tipo para filtrar dispositivos</CardDescription></div>
        {canEdit && <Button size="sm" onClick={() => onCreateType()}><Plus className="w-4 h-4 mr-2" />Nuevo Tipo</Button>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {deviceTypes.map(t => {
            const Icon = getIcon(t.icon);
            const count = getDeviceCount(t.id);
            return (
              <div 
                key={t.id} 
                className="p-4 rounded-lg border bg-card hover:shadow-md hover:border-cyan-300 transition-all cursor-pointer group"
                onClick={() => onFilterByType(t.id)}
              >
                <div className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${t.color}20` }}>
                  <Icon className="w-6 h-6" style={{ color: t.color }} />
                </div>
                <h4 className="font-medium text-sm text-center">{t.name}</h4>
                <p className="text-xs text-center text-muted-foreground mt-1">{count} dispositivo{count !== 1 ? 's' : ''}</p>
                {canEdit && !t.is_default && (
                  <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEditType(t); }}><Edit className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDeleteType(t); }} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                )}
                {t.is_default && <p className="text-xs text-muted-foreground mt-1 text-center">Predefinido</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const UsersPanel = ({ users, onCreateUser, onEditUser, onDeleteUser, onResetPassword }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <div><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Usuarios</CardTitle></div>
      <Button data-testid="add-user-btn" size="sm" onClick={() => onCreateUser()}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
    </CardHeader>
    <CardContent>
      {users.length === 0 ? <div className="empty-state py-8"><Users className="w-12 h-12 mb-4 opacity-20" /><p>No hay usuarios</p></div> : (
        <div className="space-y-3">{users.map(u => (
          <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="w-5 h-5 text-muted-foreground" /></div>
              <div><div className="flex items-center gap-2"><span className="font-medium">{u.username}</span><RoleBadge role={u.role} />{!u.is_active && <Badge variant="outline" className="text-xs bg-red-50 text-red-600">Inactivo</Badge>}</div><p className="text-sm text-muted-foreground">{u.email}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onResetPassword(u.id)}><Lock className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => onEditUser(u)}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => onDeleteUser(u)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}</div>
      )}
    </CardContent>
  </Card>
);

const AlertsPanel = ({ alerts, onCreateIncident }) => {
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [incidentData, setIncidentData] = useState({ title: "", description: "", priority: "high" });
  const [creating, setCreating] = useState(false);
  const { authAxios } = useAuth();

  const handleCreateFromAlert = (alert) => {
    setSelectedAlert(alert);
    setIncidentData({
      title: `${alert.alert_type === 'device_down' ? '🔴 Caída' : '🟢 Recuperación'}: ${alert.device_name}`,
      description: `${alert.message}\n\nFecha del evento: ${new Date(alert.timestamp).toLocaleString('es-ES')}\nIP: ${alert.device_ip || 'N/A'}`,
      priority: alert.alert_type === 'device_down' ? 'high' : 'low'
    });
    setShowIncidentDialog(true);
  };

  const handleSubmitIncident = async () => {
    if (!incidentData.title || !incidentData.description) {
      toast.error("Completa título y descripción");
      return;
    }
    setCreating(true);
    try {
      await authAxios.post("/incidents", {
        title: incidentData.title,
        description: incidentData.description,
        device_id: selectedAlert?.device_id || null,
        priority: incidentData.priority,
        category: "network"
      });
      toast.success("Incidencia creada desde alerta");
      setShowIncidentDialog(false);
      setSelectedAlert(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al crear incidencia");
    }
    setCreating(false);
  };

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Alertas</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? <div className="empty-state py-8"><Bell className="w-12 h-12 mb-4 opacity-20" /><p>No hay alertas</p></div> : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">{alerts.map(a => (
                <div key={a.id} className={`p-4 rounded-lg border ${a.alert_type === 'device_down' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">{a.alert_type === 'device_down' ? <WifiOff className="w-4 h-4 text-red-600" /> : <Wifi className="w-4 h-4 text-green-600" />}<span className={`font-medium ${a.alert_type === 'device_down' ? 'text-red-700' : 'text-green-700'}`}>{a.device_name}</span></div>
                    <div className="flex items-center gap-2">
                      {a.email_sent && <Badge variant="outline" className="text-xs"><Mail className="w-3 h-3 mr-1" />Enviado</Badge>}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => handleCreateFromAlert(a)}
                      >
                        <ClipboardList className="w-3 h-3 mr-1" />
                        Crear Incidencia
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(a.timestamp).toLocaleString('es-ES')}</p>
                </div>
              ))}</div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Incident from Alert Dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Crear Incidencia desde Alerta
            </DialogTitle>
            <DialogDescription>
              Se creará una incidencia vinculada al dispositivo {selectedAlert?.device_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input 
                value={incidentData.title}
                onChange={(e) => setIncidentData({ ...incidentData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea 
                value={incidentData.description}
                onChange={(e) => setIncidentData({ ...incidentData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select value={incidentData.priority} onValueChange={(v) => setIncidentData({ ...incidentData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedAlert?.device_id && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <span className="font-medium">Dispositivo vinculado:</span> {selectedAlert.device_name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncidentDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmitIncident} disabled={creating}>
              {creating ? "Creando..." : "Crear Incidencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ============ STATISTICS PANEL - REDESIGNED ============
const StatisticsPanel = ({ devices, groups }) => {
  const { authAxios } = useAuth();
  const [camerasWithStats, setCamerasWithStats] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [heatmapImage, setHeatmapImage] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState("conteo");
  const [reportPeriod, setReportPeriod] = useState("week-current");
  const [heatmapPeriod, setHeatmapPeriod] = useState("week-last");
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const chartRef = useRef(null);
  
  // Filter cameras that have statistics enabled
  useEffect(() => {
    const statsDevices = devices.filter(d => d.has_statistics === true && d.device_type_id === "type-camera");
    setCamerasWithStats(statsDevices);
  }, [devices]);
  
  // Prepare chart data from report
  const chartData = useMemo(() => {
    if (!reportData?.tables?.[0]?.data) return [];
    const data = reportData.tables[0].data;
    const colTitles = reportData.tables[0].columnTitles || [];
    const totalsRow = data[data.length - 1];
    
    if (!totalsRow) return [];
    
    return colTitles.map((day, idx) => {
      const cell = totalsRow[idx];
      if (Array.isArray(cell) && cell[0] >= 0) {
        return { name: day.substring(0, 3), entrada: cell[0], salida: cell[1], total: cell[0] + cell[1] };
      }
      return { name: day.substring(0, 3), entrada: 0, salida: 0, total: 0 };
    }).filter(d => d.total > 0);
  }, [reportData]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const entrada = chartData.reduce((sum, d) => sum + d.entrada, 0);
    const salida = chartData.reduce((sum, d) => sum + d.salida, 0);
    return { entrada, salida, total: entrada + salida };
  }, [chartData]);
  
  // Calculate record
  const recordInfo = useMemo(() => {
    if (!reportData?.tables?.[0]?.data) return null;
    const data = reportData.tables[0].data;
    const columnTitles = reportData.tables[0].columnTitles || [];
    let maxTotal = 0, recordDay = "";
    const totalsRow = data[data.length - 1];
    if (totalsRow) {
      totalsRow.forEach((cell, idx) => {
        if (Array.isArray(cell) && cell[0] >= 0) {
          const total = cell[0] + cell[1];
          if (total > maxTotal) { maxTotal = total; recordDay = columnTitles[idx] || `Día ${idx + 1}`; }
        }
      });
    }
    return maxTotal > 0 ? { day: recordDay, total: maxTotal } : null;
  }, [reportData]);
  
  const exportToExcel = () => {
    if (!reportData?.tables?.[0]) { toast.error("No hay datos para exportar"); return; }
    const table = reportData.tables[0];
    let csv = `Cámara: ${selectedCamera?.name || 'N/A'}\n\nHora,` + (table.columnTitles?.join(",") || "") + "\n";
    table.data?.forEach((row, idx) => {
      const rowTitle = table.rowTitles?.[idx] || `Fila ${idx}`;
      const cells = row.map(cell => Array.isArray(cell) ? (cell[0] >= 0 ? `${cell[0]}/${cell[1]}` : '-') : cell);
      csv += rowTitle + "," + cells.join(",") + "\n";
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `estadisticas_${selectedCamera?.name || 'camara'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); toast.success("Exportado a CSV/Excel");
  };
  
  const getGroupName = (groupId) => groups.find(g => g.id === groupId)?.name || "Sin grupo";
  
  // Fetch overview when camera is selected
  const fetchCameraStats = async (camera) => {
    setSelectedCamera(camera);
    setLoading(true);
    setStatsData(null); setHeatmapImage(null); setReportData(null);
    try {
      const res = await authAxios.get(`/cameras/${camera.id}/mobotix/overview`);
      setStatsData(res.data.data);
    } catch (e) { toast.error("Error al obtener datos: " + (e.response?.data?.detail || e.message)); }
    setLoading(false);
  };
  
  // Fetch counting report
  const fetchReport = async () => {
    if (!selectedCamera) return;
    setLoading(true);
    try {
      let url;
      if (useCustomDates && startDate && endDate) {
        url = `/cameras/${selectedCamera.id}/mobotix/report?start_date=${startDate}&end_date=${endDate}`;
      } else {
        const [type, range] = reportPeriod.split('-');
        url = `/cameras/${selectedCamera.id}/mobotix/report?report_type=${type}&export_range=${range}`;
      }
      const res = await authAxios.get(url);
      setReportData(res.data.report);
    } catch (e) { toast.error("Error al obtener reporte: " + (e.response?.data?.detail || e.message)); }
    setLoading(false);
  };
  
  // Fetch heatmap
  const fetchHeatmap = async () => {
    if (!selectedCamera) return;
    setLoading(true);
    try {
      const [type, range] = heatmapPeriod.split('-');
      const res = await authAxios.get(`/cameras/${selectedCamera.id}/mobotix/heatmap?heatmap_type=${type}&export_range=${range}`);
      setHeatmapImage(res.data.image);
    } catch (e) { toast.error("Error al obtener mapa de calor: " + (e.response?.data?.detail || e.message)); }
    setLoading(false);
  };
  
  return (
    <div className="space-y-6">
      {camerasWithStats.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium mb-2">No hay cámaras con estadísticas</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Para ver estadísticas, edita una cámara y activa "Estadísticas MxAnalytics".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Camera Selector - Left sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-600" />
                Cámaras ({camerasWithStats.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[600px]">
                <div className="space-y-1 p-1">
                  {camerasWithStats.map(camera => (
                    <button
                      key={camera.id}
                      onClick={() => fetchCameraStats(camera)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedCamera?.id === camera.id 
                          ? 'bg-cyan-100 border-2 border-cyan-400 shadow-sm' 
                          : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${camera.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{camera.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{getGroupName(camera.group_id)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Main Stats Area */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedCamera ? (
              <Card className="border-dashed">
                <CardContent className="py-20 text-center">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-lg font-medium text-muted-foreground">Selecciona una cámara</p>
                  <p className="text-sm text-muted-foreground">para ver sus estadísticas de conteo</p>
                </CardContent>
              </Card>
            ) : loading && !statsData ? (
              <Card>
                <CardContent className="py-20 text-center">
                  <RefreshCw className="w-10 h-10 mx-auto mb-4 animate-spin text-cyan-600" />
                  <p className="text-muted-foreground">Cargando estadísticas...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Camera Header */}
                <Card className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{selectedCamera.name}</h2>
                          <p className="text-cyan-100 text-sm">{getGroupName(selectedCamera.group_id)} • {selectedCamera.ip_address}</p>
                        </div>
                      </div>
                      <Badge className={`${selectedCamera.status === 'online' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                        {selectedCamera.status === 'online' ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Tabs */}
                <Tabs value={activeStatsTab} onValueChange={setActiveStatsTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="conteo" className="gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Conteo de Personas
                    </TabsTrigger>
                    <TabsTrigger value="heatmap" className="gap-2">
                      <Flame className="w-4 h-4" />
                      Mapa de Calor
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* CONTEO TAB */}
                  <TabsContent value="conteo" className="space-y-4 mt-4">
                    {/* Period Selector */}
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">Período:</span>
                          
                          {!useCustomDates ? (
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { value: 'week-current', label: 'Esta semana' },
                                { value: 'week-last', label: 'Semana anterior' },
                                { value: 'month-current', label: 'Este mes' },
                                { value: 'month-last', label: 'Mes anterior' },
                              ].map(opt => (
                                <Button
                                  key={opt.value}
                                  size="sm"
                                  variant={reportPeriod === opt.value ? "default" : "outline"}
                                  onClick={() => setReportPeriod(opt.value)}
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[150px]" />
                              <span className="text-muted-foreground">→</span>
                              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[150px]" />
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setUseCustomDates(!useCustomDates)}
                            className="ml-auto"
                          >
                            <Calendar className="w-4 h-4 mr-1" />
                            {useCustomDates ? 'Predefinido' : 'Personalizado'}
                          </Button>
                          
                          <Button onClick={fetchReport} disabled={loading || (useCustomDates && (!startDate || !endDate))}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Consultar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Results */}
                    {reportData && reportData.tables && reportData.tables[0] ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="py-4 text-center">
                              <ArrowUpDown className="w-6 h-6 mx-auto mb-2 text-green-600" />
                              <p className="text-3xl font-bold text-green-700">{totals.entrada.toLocaleString()}</p>
                              <p className="text-sm text-green-600">Entradas</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-red-50 border-red-200">
                            <CardContent className="py-4 text-center">
                              <ArrowUpDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
                              <p className="text-3xl font-bold text-red-700">{totals.salida.toLocaleString()}</p>
                              <p className="text-sm text-red-600">Salidas</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="py-4 text-center">
                              <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                              <p className="text-3xl font-bold text-blue-700">{totals.total.toLocaleString()}</p>
                              <p className="text-sm text-blue-600">Total Personas</p>
                            </CardContent>
                          </Card>
                          {recordInfo && (
                            <Card className="bg-amber-50 border-amber-200">
                              <CardContent className="py-4 text-center">
                                <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                                <p className="text-3xl font-bold text-amber-700">{recordInfo.total.toLocaleString()}</p>
                                <p className="text-sm text-amber-600">Récord ({recordInfo.day})</p>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                        
                        {/* Chart */}
                        <Card ref={chartRef}>
                          <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Gráfico de Conteo</CardTitle>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={exportToExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-1" />Excel
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {chartData.length > 0 ? (
                              <div style={{ width: '100%', height: 280 }}>
                                <ResponsiveContainer>
                                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="entrada" name="Entrada" fill="#22c55e" radius={[4,4,0,0]} />
                                    <Bar dataKey="salida" name="Salida" fill="#ef4444" radius={[4,4,0,0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <p className="text-center text-muted-foreground py-8">Sin datos para mostrar</p>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Data Table - Collapsible */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Detalle por Hora</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[300px]">
                              <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 bg-white">
                                  <tr className="bg-gray-100">
                                    <th className="border p-2 text-left font-medium">Hora</th>
                                    {reportData.tables[0].columnTitles?.map((col, i) => (
                                      <th key={i} className="border p-2 text-center text-xs font-medium">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportData.tables[0].data?.slice(0, -1).map((row, rowIdx) => (
                                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="border p-2 font-medium text-xs">{reportData.tables[0].rowTitles?.[rowIdx]}</td>
                                      {row.map((cell, colIdx) => (
                                        <td key={colIdx} className="border p-2 text-center text-xs">
                                          {Array.isArray(cell) ? (
                                            cell[0] < 0 ? <span className="text-gray-300">-</span> : (
                                              <span><span className="text-green-600 font-medium">{cell[0]}</span><span className="text-gray-400">/</span><span className="text-red-600 font-medium">{cell[1]}</span></span>
                                            )
                                          ) : cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                  <tr className="bg-blue-100 font-bold sticky bottom-0">
                                    <td className="border p-2">TOTAL</td>
                                    {reportData.tables[0].data?.[reportData.tables[0].data.length - 1]?.map((cell, colIdx) => (
                                      <td key={colIdx} className="border p-2 text-center">
                                        {Array.isArray(cell) ? (
                                          cell[0] < 0 ? '-' : (
                                            <span><span className="text-green-700">{cell[0]}</span>/<span className="text-red-700">{cell[1]}</span></span>
                                          )
                                        ) : cell}
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </ScrollArea>
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-4">
                              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span>Entrada</span>
                              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span>Salida</span>
                            </p>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                          <p className="text-muted-foreground">Selecciona un período y haz clic en <strong>Consultar</strong></p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                  
                  {/* HEATMAP TAB */}
                  <TabsContent value="heatmap" className="space-y-4 mt-4">
                    {/* Period Selector */}
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">Período:</span>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'day-current', label: 'Hoy' },
                              { value: 'day-last', label: 'Ayer' },
                              { value: 'week-current', label: 'Esta semana' },
                              { value: 'week-last', label: 'Semana anterior' },
                              { value: 'month-current', label: 'Este mes' },
                              { value: 'month-last', label: 'Mes anterior' },
                            ].map(opt => (
                              <Button
                                key={opt.value}
                                size="sm"
                                variant={heatmapPeriod === opt.value ? "default" : "outline"}
                                onClick={() => setHeatmapPeriod(opt.value)}
                              >
                                {opt.label}
                              </Button>
                            ))}
                          </div>
                          <Button onClick={fetchHeatmap} disabled={loading} className="ml-auto">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Consultar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Heatmap Image */}
                    {heatmapImage ? (
                      <Card>
                        <CardContent className="py-6">
                          <img 
                            src={heatmapImage} 
                            alt="Mapa de calor" 
                            className="max-w-full rounded-lg border shadow-sm mx-auto"
                          />
                          <p className="text-sm text-center text-muted-foreground mt-4">
                            Las zonas más rojas indican mayor concentración de movimiento
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                          <Flame className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                          <p className="text-muted-foreground">Selecciona un período y haz clic en <strong>Consultar</strong></p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PublicDashboardConfig = ({ organization }) => {
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
        {saving ? "Guardando..." : "Guardar"}
      </Button>
    </div>
  );
};

const SettingsPanel = ({ settings, onSave }) => {
  const [formData, setFormData] = useState({ 
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    smtp_user: "",
    smtp_password: "",
    smtp_use_ssl: true,
    alert_email: ""
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { authAxios } = useAuth();

  useEffect(() => { 
    if (settings) {
      setFormData({ 
        smtp_host: settings.smtp_host || "smtp.gmail.com",
        smtp_port: settings.smtp_port || 465,
        smtp_user: settings.smtp_user || settings.gmail_user || "",
        smtp_password: "",
        smtp_use_ssl: settings.smtp_use_ssl !== false,
        alert_email: settings.alert_email || ""
      });
      // Show advanced if non-Gmail server
      if (settings.smtp_host && settings.smtp_host !== "smtp.gmail.com") {
        setShowAdvanced(true);
      }
    }
  }, [settings]);

  const handleSave = async (e) => { 
    e.preventDefault(); 
    if (!formData.alert_email || !formData.smtp_user || !formData.smtp_password) { 
      toast.error("Completa todos los campos requeridos"); 
      return; 
    } 
    setSaving(true); 
    try {
      await authAxios.post("/settings/smtp", formData);
      toast.success("Configuración guardada");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al guardar");
    }
    setSaving(false); 
  };
  
  const handleTest = async () => { 
    setTesting(true); 
    try { 
      await authAxios.post("/settings/test-email"); 
      toast.success("Email de prueba enviado"); 
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Error al enviar"); 
    } 
    setTesting(false); 
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Configuración Email (SMTP)</CardTitle>
        <CardDescription>Configura el servidor de correo para alertas y notificaciones</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email para alertas</Label>
              <Input data-testid="settings-alert-email" type="email" placeholder="alertas@empresa.com" value={formData.alert_email} onChange={(e) => setFormData({ ...formData, alert_email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Usuario SMTP</Label>
              <Input data-testid="settings-smtp-user" type="email" placeholder="correo@empresa.com" value={formData.smtp_user} onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contraseña SMTP</Label>
            <Input data-testid="settings-smtp-password" type="password" placeholder={settings?.smtp_user ? "••••••••" : "Contraseña del correo"} value={formData.smtp_password} onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })} />
          </div>
          
          {/* Advanced SMTP Settings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Configuración avanzada
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Servidor SMTP</Label>
                  <Input data-testid="settings-smtp-host" placeholder="smtp.gmail.com" value={formData.smtp_host} onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Puerto</Label>
                  <Input data-testid="settings-smtp-port" type="number" placeholder="465" value={formData.smtp_port} onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 465 })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.smtp_use_ssl} onCheckedChange={(v) => setFormData({ ...formData, smtp_use_ssl: v })} />
                <Label>Usar SSL (puerto 465)</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          <div className="flex gap-2 pt-4">
            <Button data-testid="save-settings-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !settings?.smtp_user}><Send className="w-4 h-4 mr-2" />{testing ? "Enviando..." : "Probar Email"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// ============ SECURITY PANEL ============
const SecurityPanel = () => {
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

const ScheduledReportsPanel = ({ organizations }) => {
  const [config, setConfig] = useState({
    enabled: false,
    frequency: "weekly",
    day_of_week: 0,
    day_of_month: 1,
    hour: 8,
    recipient_emails: [],
    include_offline_list: true,
    include_uptime_stats: true,
    organization_ids: []
  });
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const { authAxios } = useAuth();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await authAxios.get("/scheduled-reports");
        if (res.data.config) setConfig(res.data.config);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchConfig();
  }, [authAxios]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAxios.post("/scheduled-reports", config);
      toast.success("Configuración de reportes guardada");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al guardar");
    }
    setSaving(false);
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      await authAxios.post("/scheduled-reports/send-now");
      toast.success("Reporte enviado correctamente");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al enviar reporte");
    }
    setSending(false);
  };

  const addEmail = () => {
    if (emailInput && emailInput.includes("@") && !config.recipient_emails.includes(emailInput)) {
      setConfig({ ...config, recipient_emails: [...config.recipient_emails, emailInput] });
      setEmailInput("");
    }
  };

  const removeEmail = (email) => {
    setConfig({ ...config, recipient_emails: config.recipient_emails.filter(e => e !== email) });
  };

  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  if (loading) return <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Reportes Programados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="font-medium">Reportes automáticos</p>
            <p className="text-sm text-muted-foreground">Enviar reportes de estado periódicamente</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
        </div>

        {config.enabled && (
          <>
            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={config.frequency} onValueChange={(v) => setConfig({ ...config, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day selection based on frequency */}
            {config.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Día de la semana</Label>
                <Select value={config.day_of_week.toString()} onValueChange={(v) => setConfig({ ...config, day_of_week: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dayNames.map((day, i) => <SelectItem key={i} value={i.toString()}>{day}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.frequency === "monthly" && (
              <div className="space-y-2">
                <Label>Día del mes</Label>
                <Select value={config.day_of_month.toString()} onValueChange={(v) => setConfig({ ...config, day_of_month: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...Array(28)].map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hour */}
            <div className="space-y-2">
              <Label>Hora de envío (UTC)</Label>
              <Select value={config.hour.toString()} onValueChange={(v) => setConfig({ ...config, hour: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...Array(24)].map((_, i) => <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient emails */}
            <div className="space-y-2">
              <Label>Destinatarios</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="email@ejemplo.com" 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                />
                <Button type="button" variant="outline" onClick={addEmail}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.recipient_emails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button onClick={() => removeEmail(email)} className="ml-1 hover:text-red-500">&times;</button>
                  </Badge>
                ))}
              </div>
              {config.recipient_emails.length === 0 && (
                <p className="text-xs text-muted-foreground">Se usará el email de alertas configurado</p>
              )}
            </div>

            {/* Content options */}
            <div className="space-y-3">
              <Label>Contenido del reporte</Label>
              <div className="flex items-center gap-2">
                <Switch checked={config.include_uptime_stats} onCheckedChange={(v) => setConfig({ ...config, include_uptime_stats: v })} />
                <span className="text-sm">Incluir estadísticas de uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.include_offline_list} onCheckedChange={(v) => setConfig({ ...config, include_offline_list: v })} />
                <span className="text-sm">Incluir lista de dispositivos offline</span>
              </div>
            </div>

            {/* Organization filter */}
            <div className="space-y-2">
              <Label>Organizaciones a incluir</Label>
              <div className="flex flex-wrap gap-2">
                {organizations.map((org) => (
                  <Badge 
                    key={org.id} 
                    variant={config.organization_ids.includes(org.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const ids = config.organization_ids.includes(org.id)
                        ? config.organization_ids.filter(id => id !== org.id)
                        : [...config.organization_ids, org.id];
                      setConfig({ ...config, organization_ids: ids });
                    }}
                  >
                    {org.name}
                  </Badge>
                ))}
              </div>
              {config.organization_ids.length === 0 && (
                <p className="text-xs text-muted-foreground">Todas las organizaciones serán incluidas</p>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
          <Button variant="outline" onClick={handleSendNow} disabled={sending || !config.enabled}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Enviando..." : "Enviar ahora"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ BACKUP PANEL ============
const BackupPanel = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const { authAxios } = useAuth();
  const fileInputRef = useRef(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await authAxios.get("/backup/list");
      setBackups(res.data.backups || []);
    } catch (e) { console.error("Error fetching backups:", e); }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleDownload = async (format = "json") => {
    setDownloading(true);
    try {
      const endpoint = format === "zip" ? "/backup/download-zip" : "/backup/download";
      const response = await authAxios.get(`${endpoint}?include_history=${includeHistory}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      link.setAttribute('download', `siempria_backup_${timestamp}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Backup descargado correctamente");
    } catch (e) {
      console.error("Download error:", e);
      toast.error("Error al descargar backup");
    }
    setDownloading(false);
  };

  const handleCreateAuto = async () => {
    setCreating(true);
    try {
      await authAxios.post(`/backup/create-auto?include_history=${includeHistory}`);
      toast.success("Backup creado en el servidor");
      fetchBackups();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al crear backup");
    }
    setCreating(false);
  };

  const handleRestore = async (file) => {
    if (!file) return;
    
    if (!window.confirm("⚠️ ADVERTENCIA: Restaurar un backup reemplazará todos los datos actuales. ¿Continuar?")) {
      return;
    }
    
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await authAxios.post(`/backup/restore?merge=${mergeMode}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success("Backup restaurado correctamente. Recargando...");
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      console.error("Restore error:", e);
      toast.error(e.response?.data?.detail || "Error al restaurar backup");
    }
    setRestoring(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadServerBackup = async (filename) => {
    try {
      const response = await authAxios.get(`/backup/auto/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Backup descargado");
    } catch (e) {
      toast.error("Error al descargar");
    }
  };

  const handleDeleteServerBackup = async (filename) => {
    if (!window.confirm(`¿Eliminar backup ${filename}?`)) return;
    try {
      await authAxios.delete(`/backup/auto/${filename}`);
      toast.success("Backup eliminado");
      fetchBackups();
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-blue-600" />
          Sistema de Backup
        </CardTitle>
        <CardDescription>
          Crea, descarga y restaura copias de seguridad de tus datos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Download section */}
        <div className="p-4 bg-blue-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Descargar Backup</p>
              <p className="text-sm text-blue-700">Descarga una copia completa de todos tus datos</p>
            </div>
            <HardDrive className="w-8 h-8 text-blue-600" />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch checked={includeHistory} onCheckedChange={setIncludeHistory} />
            <span className="text-sm text-blue-800">Incluir historial (archivo más grande)</span>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => handleDownload("json")} 
              disabled={downloading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Descargando..." : "Descargar JSON"}
            </Button>
            <Button 
              onClick={() => handleDownload("zip")} 
              disabled={downloading}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <FolderArchive className="w-4 h-4 mr-2" />
              Descargar ZIP
            </Button>
          </div>
        </div>

        {/* Restore section */}
        <div className="p-4 bg-amber-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-900">Restaurar Backup</p>
              <p className="text-sm text-amber-700">Restaura tus datos desde un archivo de backup</p>
            </div>
            <RotateCcw className="w-8 h-8 text-amber-600" />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch checked={mergeMode} onCheckedChange={setMergeMode} />
            <span className="text-sm text-amber-800">
              Modo fusión (no elimina datos existentes)
            </span>
          </div>
          
          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.zip"
              onChange={(e) => handleRestore(e.target.files?.[0])}
              className="hidden"
              id="backup-file-input"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              variant="outline"
              className="border-amber-600 text-amber-700 hover:bg-amber-100"
            >
              <Upload className="w-4 h-4 mr-2" />
              {restoring ? "Restaurando..." : "Seleccionar archivo"}
            </Button>
            <span className="text-xs text-amber-600">JSON o ZIP</span>
          </div>
        </div>

        {/* Server backups section */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Backups en Servidor</p>
              <p className="text-sm text-muted-foreground">Backups automáticos almacenados en el servidor</p>
            </div>
            <Button 
              onClick={handleCreateAuto} 
              disabled={creating}
              size="sm"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-1" />
              {creating ? "Creando..." : "Crear ahora"}
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay backups en el servidor
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {backups.map((backup) => (
                <div 
                  key={backup.filename}
                  className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-xs truncate">{backup.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(backup.size)} • {new Date(backup.created).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={() => handleDownloadServerBackup(backup.filename)}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteServerBackup(backup.filename)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <Info className="w-3 h-3 inline mr-1" />
            Los backups incluyen: organizaciones, grupos, dispositivos, usuarios, alertas y configuraciones.
            Se mantienen los últimos 10 backups automáticos en el servidor.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ DAILY DOWNTIME REPORT PANEL ============
const DailyReportPanel = () => {
  const [config, setConfig] = useState({
    enabled: false,
    time: "08:00",
    recipients: []
  });
  const [emailInput, setEmailInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { authAxios } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await authAxios.get("/reports/settings");
        setConfig({
          enabled: res.data.daily_report_enabled || false,
          time: res.data.daily_report_time || "08:00",
          recipients: res.data.daily_report_recipients || []
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchSettings();
  }, [authAxios]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAxios.put("/reports/settings", {
        daily_report_enabled: config.enabled,
        daily_report_time: config.time,
        daily_report_recipients: config.recipients
      });
      toast.success("Configuración guardada");
    } catch (e) {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const handleSendNow = async () => {
    if (config.recipients.length === 0) {
      toast.error("Añade al menos un destinatario");
      return;
    }
    setSending(true);
    try {
      await authAxios.post(`/reports/send?days=1`, config.recipients);
      toast.success("Informe enviado correctamente");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al enviar");
    }
    setSending(false);
  };

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await authAxios.get("/reports/preview?days=1");
      setPreview(res.data);
    } catch (e) {
      toast.error("Error al cargar preview");
    }
    setLoadingPreview(false);
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email && email.includes("@") && !config.recipients.includes(email)) {
      setConfig({ ...config, recipients: [...config.recipients, email] });
      setEmailInput("");
    }
  };

  const removeEmail = (email) => {
    setConfig({ ...config, recipients: config.recipients.filter(e => e !== email) });
  };

  if (loading) return <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-600" />
          Informe Diario de Caídas
        </CardTitle>
        <CardDescription>
          Recibe un resumen diario con todas las caídas de dispositivos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable */}
        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
          <div>
            <p className="font-medium text-orange-900">Informe automático diario</p>
            <p className="text-sm text-orange-700">Recibe cada día un resumen de las caídas del sistema</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hora de envío</label>
            <Input 
              type="time" 
              value={config.time}
              onChange={(e) => setConfig({ ...config, time: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Hora local del servidor</p>
          </div>
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Destinatarios</label>
          <div className="flex gap-2">
            <Input 
              placeholder="email@ejemplo.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
            />
            <Button onClick={addEmail} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {config.recipients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {config.recipients.map(email => (
                <Badge key={email} variant="secondary" className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {email}
                  <button onClick={() => removeEmail(email)} className="ml-1 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm">Vista previa del informe</p>
            <Button variant="outline" size="sm" onClick={loadPreview} disabled={loadingPreview}>
              <Eye className="w-4 h-4 mr-1" />
              {loadingPreview ? "Cargando..." : "Ver preview"}
            </Button>
          </div>
          {preview && (
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{preview.summary.online_now}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{preview.summary.offline_now}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{preview.summary.total_downtime_events}</p>
                <p className="text-xs text-muted-foreground">Caídas (24h)</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">{preview.summary.total_devices}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSendNow} 
            disabled={sending || config.recipients.length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Enviando..." : "Enviar ahora"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ ACCESS LOGS PANEL ============
const AccessLogsPanel = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    category: "",
    username: "",
    log_type: "",
    start_date: "",
    end_date: ""
  });
  const [showSecurity, setShowSecurity] = useState(false);
  const { authAxios } = useAuth();
  const pageSize = 50;

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const params = new URLSearchParams();
        params.append("skip", String(page * pageSize));
        params.append("limit", String(pageSize));
        if (filters.category) params.append("category", filters.category);
        if (filters.username) params.append("username", filters.username);
        
        const logsRes = await authAxios.get(`/logs?${params.toString()}`);
        setLogs(logsRes.data.logs || []);
        setTotal(logsRes.data.total || 0);
        
        const statsRes = await authAxios.get("/logs/stats?days=7");
        setStats(statsRes.data);
        
        const securityRes = await authAxios.get("/logs/security?hours=24");
        setSecurity(securityRes.data);
      } catch (e) {
        console.error("Error loading logs:", e);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (authAxios) {
      loadData();
    }
  }, [authAxios, page, filters]);

  const fetchLogs = async () => {
    // Manual refresh function
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("skip", String(page * pageSize));
      params.append("limit", String(pageSize));
      if (filters.category) params.append("category", filters.category);
      if (filters.username) params.append("username", filters.username);
      
      const [logsRes, statsRes] = await Promise.all([
        authAxios.get(`/logs?${params.toString()}`),
        authAxios.get("/logs/stats?days=7")
      ]);
      
      setLogs(logsRes.data.logs || []);
      setTotal(logsRes.data.total || 0);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Error refreshing logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      params.append("format", format);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);
      if (filters.category) params.append("category", filters.category);
      
      const response = await authAxios.get(`/logs/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `logs_${new Date().toISOString().slice(0,10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Logs exportados");
    } catch (e) {
      toast.error("Error al exportar");
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm("¿Eliminar logs de más de 90 días?")) return;
    try {
      const res = await authAxios.delete("/logs/cleanup?days=90");
      toast.success(res.data.message);
      fetchLogs();
      fetchStats();
    } catch (e) {
      toast.error("Error al limpiar logs");
    }
  };

  const getLogTypeLabel = (type) => {
    const labels = {
      auth_login: "Inicio sesión",
      auth_logout: "Cierre sesión",
      auth_failed: "Login fallido",
      device_create: "Crear dispositivo",
      device_update: "Editar dispositivo",
      device_delete: "Eliminar dispositivo",
      camera_view: "Ver cámara",
      camera_image: "Descargar imagen",
      camera_stats: "Ver estadísticas",
      org_create: "Crear organización",
      org_update: "Editar organización",
      org_delete: "Eliminar organización",
      group_create: "Crear grupo",
      group_update: "Editar grupo",
      group_delete: "Eliminar grupo",
      user_create: "Crear usuario",
      user_update: "Editar usuario",
      user_delete: "Eliminar usuario",
      user_password: "Cambiar contraseña",
      settings_update: "Actualizar config",
      backup_create: "Crear backup",
      backup_restore: "Restaurar backup",
      backup_download: "Descargar backup",
      export_data: "Exportar datos"
    };
    return labels[type] || type;
  };

  const getCategoryColor = (cat) => {
    const colors = {
      auth: "bg-blue-100 text-blue-800",
      devices: "bg-green-100 text-green-800",
      cameras: "bg-purple-100 text-purple-800",
      organizations: "bg-amber-100 text-amber-800",
      users: "bg-pink-100 text-pink-800",
      system: "bg-gray-100 text-gray-800"
    };
    return colors[cat] || "bg-gray-100 text-gray-800";
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasSecurityAlerts = security && (security.failed_logins?.length > 0 || security.high_activity_users?.length > 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 font-medium">Total (7 días)</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total_logs}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 font-medium">Usuarios Activos</p>
              <p className="text-2xl font-bold text-green-900">{stats.active_users}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4">
              <p className="text-xs text-red-600 font-medium">Login Fallidos</p>
              <p className="text-2xl font-bold text-red-900">{stats.failed_logins}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <p className="text-xs text-purple-600 font-medium">Autenticación</p>
              <p className="text-2xl font-bold text-purple-900">{stats.by_category?.auth || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <p className="text-xs text-amber-600 font-medium">Dispositivos</p>
              <p className="text-2xl font-bold text-amber-900">{stats.by_category?.devices || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Alert */}
      {hasSecurityAlerts && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-800 flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Seguridad (últimas 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSecurity(!showSecurity)}
              className="text-red-700"
            >
              {showSecurity ? "Ocultar detalles" : "Ver detalles"}
            </Button>
            {showSecurity && (
              <div className="mt-3 space-y-3">
                {security.failed_logins?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-800 mb-1">Intentos fallidos (3+):</p>
                    {security.failed_logins.map((item, i) => (
                      <div key={i} className="text-xs bg-white p-2 rounded mb-1">
                        <span className="font-mono">{item.ip_address}</span> → 
                        <span className="font-medium ml-1">{item.username}</span>
                        <Badge variant="destructive" className="ml-2">{item.attempts} intentos</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {security.high_activity_users?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-1">Alta actividad:</p>
                    {security.high_activity_users.map((item, i) => (
                      <div key={i} className="text-xs bg-white p-2 rounded mb-1">
                        <span className="font-medium">{item.username}</span>
                        <Badge variant="outline" className="ml-2">{item.action_count} acciones</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters & Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5" />
              Registro de Actividad
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                <Download className="w-4 h-4 mr-1" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleCleanup}>
                <Trash2 className="w-4 h-4 mr-1" />Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={filters.category} onValueChange={(v) => { setFilters({...filters, category: v === "all" ? "" : v}); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="auth">Autenticación</SelectItem>
                <SelectItem value="devices">Dispositivos</SelectItem>
                <SelectItem value="cameras">Cámaras</SelectItem>
                <SelectItem value="organizations">Organizaciones</SelectItem>
                <SelectItem value="users">Usuarios</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Usuario..." 
              className="w-[140px]"
              value={filters.username}
              onChange={(e) => setFilters({...filters, username: e.target.value})}
              onKeyDown={(e) => e.key === "Enter" && (setPage(0), fetchLogs())}
            />
            <Input 
              type="date" 
              className="w-[150px]"
              value={filters.start_date}
              onChange={(e) => { setFilters({...filters, start_date: e.target.value}); setPage(0); }}
            />
            <Input 
              type="date" 
              className="w-[150px]"
              value={filters.end_date}
              onChange={(e) => { setFilters({...filters, end_date: e.target.value}); setPage(0); }}
            />
            <Button variant="outline" size="sm" onClick={() => { setFilters({ category: "", username: "", log_type: "", start_date: "", end_date: "" }); setPage(0); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Logs Table */}
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay logs que mostrar</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Fecha/Hora</th>
                    <th className="text-left p-2 font-medium">Usuario</th>
                    <th className="text-left p-2 font-medium">Acción</th>
                    <th className="text-left p-2 font-medium">Objetivo</th>
                    <th className="text-left p-2 font-medium">IP</th>
                    <th className="text-center p-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 text-xs font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('es-ES')}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{log.username}</span>
                          <span className="text-xs text-muted-foreground">({log.user_role})</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge className={getCategoryColor(log.category)} variant="outline">
                          {getLogTypeLabel(log.log_type)}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs">
                        {log.target_name || log.target_id || "-"}
                      </td>
                      <td className="p-2 text-xs font-mono">
                        {log.ip_address}
                      </td>
                      <td className="p-2 text-center">
                        {log.success ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">OK</Badge>
                        ) : (
                          <Badge variant="destructive">Error</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} de {total}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============ INCIDENTS PANEL ============
const IncidentsPanel = ({ devices }) => {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", priority: "" });
  const [showForm, setShowForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", device_id: "", priority: "medium", category: "other" });
  const [resolution, setResolution] = useState({ text: "", notes: "" });
  const [noteText, setNoteText] = useState("");
  const { authAxios } = useAuth();

  const fetchIncidents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.priority) params.append("priority", filter.priority);
      
      const [incidentsRes, statsRes] = await Promise.all([
        authAxios.get(`/incidents?${params.toString()}`),
        authAxios.get("/incidents/stats")
      ]);
      setIncidents(incidentsRes.data.incidents || []);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Error fetching incidents:", e);
    }
    setLoading(false);
  }, [authAxios, filter]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const handleCreate = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Completa título y descripción");
      return;
    }
    try {
      await authAxios.post("/incidents", {
        title: formData.title,
        description: formData.description,
        device_id: formData.device_id || null,
        priority: formData.priority,
        category: formData.category
      });
      toast.success("Incidencia creada");
      setShowForm(false);
      setFormData({ title: "", description: "", device_id: "", priority: "medium", category: "other" });
      fetchIncidents();
    } catch (e) {
      toast.error("Error al crear incidencia");
    }
  };

  const handleResolve = async () => {
    if (!resolution.text) {
      toast.error("Describe la solución");
      return;
    }
    try {
      await authAxios.post(`/incidents/${selectedIncident.id}/resolve`, {
        resolution: resolution.text,
        resolution_notes: resolution.notes || null
      });
      toast.success("Incidencia resuelta");
      setShowResolveDialog(false);
      setSelectedIncident(null);
      setResolution({ text: "", notes: "" });
      fetchIncidents();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al resolver");
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await authAxios.post(`/incidents/${selectedIncident.id}/notes`, { note: noteText });
      toast.success("Nota añadida");
      setNoteText("");
      // Refresh selected incident
      const res = await authAxios.get(`/incidents/${selectedIncident.id}`);
      setSelectedIncident(res.data);
      fetchIncidents();
    } catch (e) {
      toast.error("Error al añadir nota");
    }
  };

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      await authAxios.put(`/incidents/${incidentId}`, { status: newStatus });
      toast.success("Estado actualizado");
      fetchIncidents();
      if (selectedIncident?.id === incidentId) {
        const res = await authAxios.get(`/incidents/${incidentId}`);
        setSelectedIncident(res.data);
      }
    } catch (e) {
      toast.error("Error al actualizar");
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: "bg-gray-100 text-gray-700",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700"
    };
    const labels = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };
    return <Badge className={styles[priority] || styles.medium}>{labels[priority] || priority}</Badge>;
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: "bg-red-100 text-red-700",
      in_progress: "bg-yellow-100 text-yellow-700",
      resolved: "bg-green-100 text-green-700"
    };
    const labels = { open: "Abierta", in_progress: "En Progreso", resolved: "Resuelta" };
    return <Badge className={styles[status] || styles.open}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-700">{stats.open}</p>
              <p className="text-sm text-red-600">Abiertas</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-700">{stats.in_progress}</p>
              <p className="text-sm text-yellow-600">En Progreso</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{stats.resolved}</p>
              <p className="text-sm text-green-600">Resueltas</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
              <p className="text-sm text-blue-600">Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Select value={filter.status || "all"} onValueChange={(v) => setFilter({ ...filter, status: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Abiertas</SelectItem>
              <SelectItem value="in_progress">En Progreso</SelectItem>
              <SelectItem value="resolved">Resueltas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter.priority || "all"} onValueChange={(v) => setFilter({ ...filter, priority: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />Nueva Incidencia
        </Button>
      </div>

      {/* Incidents List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Lista de Incidencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : incidents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay incidencias</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {incidents.map(inc => (
                  <div 
                    key={inc.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${selectedIncident?.id === inc.id ? 'bg-blue-50 border-blue-300' : ''}`}
                    onClick={() => setSelectedIncident(inc)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{inc.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(inc.created_at).toLocaleDateString('es-ES')} • {inc.created_by_name}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {getPriorityBadge(inc.priority)}
                        {getStatusBadge(inc.status)}
                      </div>
                    </div>
                    {inc.device && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📷 {inc.device.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalle de Incidencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedIncident ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{selectedIncident.title}</h3>
                    <div className="flex gap-1">
                      {getPriorityBadge(selectedIncident.priority)}
                      {getStatusBadge(selectedIncident.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedIncident.description}</p>
                </div>

                {selectedIncident.device && (
                  <div className="p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="font-medium">Dispositivo:</span> {selectedIncident.device.name} ({selectedIncident.device.ip_address})
                  </div>
                )}

                {selectedIncident.resolution && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Solución aplicada
                    </p>
                    <p className="text-sm text-green-700 mt-1">{selectedIncident.resolution}</p>
                    {selectedIncident.resolution_notes && (
                      <p className="text-xs text-green-600 mt-1">Notas: {selectedIncident.resolution_notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Resuelto por {selectedIncident.resolved_by_name} el {new Date(selectedIncident.resolved_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {selectedIncident.status !== "resolved" && (
                  <div className="flex gap-2">
                    {selectedIncident.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedIncident.id, "in_progress")}>
                        Marcar En Progreso
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setShowResolveDialog(true)} className="bg-green-600 hover:bg-green-700">
                      <Wrench className="w-4 h-4 mr-1" />Resolver
                    </Button>
                  </div>
                )}

                {/* History */}
                <div>
                  <p className="font-medium text-sm mb-2">Historial</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedIncident.history?.map((h, i) => (
                      <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{h.user_name}</span>
                          <span className="text-muted-foreground">{new Date(h.timestamp).toLocaleString('es-ES')}</span>
                        </div>
                        <p className="text-muted-foreground mt-1">{h.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Note */}
                {selectedIncident.status !== "resolved" && (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Añadir nota..." 
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    />
                    <Button variant="outline" onClick={handleAddNote}>
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                Selecciona una incidencia para ver los detalles
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Incident Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Incidencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input 
                placeholder="Ej: Cámara sin conexión"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción *</label>
              <Textarea 
                placeholder="Describe el problema..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridad</label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="network">Red</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dispositivo relacionado (opcional)</label>
              <Select value={formData.device_id || "none"} onValueChange={(v) => setFormData({ ...formData, device_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {devices.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Crear Incidencia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Incidencia</DialogTitle>
            <DialogDescription>
              Documenta la solución aplicada para futuras referencias
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Solución aplicada *</label>
              <Textarea 
                placeholder="Describe cómo se resolvió el problema..."
                value={resolution.text}
                onChange={(e) => setResolution({ ...resolution, text: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas adicionales</label>
              <Textarea 
                placeholder="Información adicional, repuestos usados, etc."
                value={resolution.notes}
                onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>Cancelar</Button>
            <Button onClick={handleResolve} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />Marcar como Resuelto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LoadingSkeleton = () => (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{[1,2,3,4].map(i => <Card key={i} className="server-card"><CardContent className="p-6"><div className="flex items-start gap-3"><Skeleton className="w-10 h-10 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24" /></div></div><Skeleton className="h-4 w-full mt-4" /><Separator className="my-4" /><div className="flex gap-2"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-8" /></div></CardContent></Card>)}</div>);

// ============ DASHBOARD ============
const Dashboard = () => {
  const { t } = useTranslation();
  const { user, logout, authAxios } = useAuth();
  const [devices, setDevices] = useState([]);
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
  // Incident from device
  const [incidentFromDeviceOpen, setIncidentFromDeviceOpen] = useState(false);
  const [incidentDeviceData, setIncidentDeviceData] = useState({ device: null, title: "", description: "", priority: "medium" });
  const [creatingIncident, setCreatingIncident] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const DEVICES_PER_PAGE = 24;
  
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
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;

  const fetchAll = useCallback(async () => {
    try {
      const [devRes, orgRes, grpRes, typeRes, alertRes] = await Promise.all([
        authAxios.get("/devices"), authAxios.get("/organizations"), authAxios.get("/groups"),
        authAxios.get("/device-types"), authAxios.get("/alerts")
      ]);
      
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
      }
      
      setDevices(newDevices);
      setOrganizations(orgRes.data.organizations || []);
      setGroups(grpRes.data.groups || []);
      setDeviceTypes(typeRes.data.device_types || []);
      setAlerts(alertRes.data.alerts || []);
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
    }
  }, [authAxios, user?.role, previousDeviceStates]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => { 
    fetchAll(); 
    const interval = setInterval(fetchAll, 60000); // Check every 60 seconds for better performance 
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

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors />
      <PWAInstallPrompt />

      {/* Header */}
      <header className="app-header">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo vertical para desktop */}
              <img src={LOGO_URL} alt="Siempria" className="hidden md:block h-12 object-contain" />
              <div className="hidden md:block">
                <h1 className="text-xl font-bold tracking-tight">Network Monitor</h1>
                <p className="text-xs text-muted-foreground">Sistema de monitorización</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Status counts - visible en móvil con iconos pequeños */}
              <div className="flex items-center gap-3 mr-2">
                <div className="flex items-center gap-1.5">
                  <div className="status-dot status-dot-online" />
                  <span className="text-sm font-medium">{onlineCount}</span>
                </div>
                <button onClick={() => setFailuresDialogOpen(true)} className="flex items-center gap-1.5 hover:bg-red-50/20 px-1.5 py-1 rounded transition-colors" title="Ver resumen de fallos">
                  <div className="status-dot status-dot-offline" />
                  <span className="text-sm font-medium">{offlineCount}</span>
                  {recentFailures.length > 0 && <Bell className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                </button>
              </div>
              {/* Botones desktop */}
              <div className="hidden md:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button data-testid="export-btn" variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('excel')}><FileSpreadsheet className="w-4 h-4 mr-2" />Exportar todo a Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}><FileIcon className="w-4 h-4 mr-2" />Exportar todo a PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button data-testid="refresh-all-btn" variant="outline" size="sm" onClick={handleRefreshAll} disabled={refreshing}><RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin-slow' : ''}`} />Verificar</Button>
                {canEdit && <Button data-testid="add-device-btn" size="sm" onClick={() => { setSelectedDevice(null); setDeviceDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Agregar</Button>}
              </div>
              {/* Botones móvil (solo iconos) */}
              <div className="flex md:hidden items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleRefreshAll} disabled={refreshing} className="p-2">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin-slow' : ''}`} />
                </Button>
                {canEdit && <Button size="sm" onClick={() => { setSelectedDevice(null); setDeviceDialogOpen(true); }} className="p-2">
                  <Plus className="w-4 h-4" />
                </Button>}
              </div>
              <LanguageSelector />
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="gap-2"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4" /></div><span className="hidden md:inline">{user?.username}</span><ChevronDown className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5"><p className="text-sm font-medium">{user?.full_name || user?.username}</p><p className="text-xs text-muted-foreground">{user?.email}</p></div>
                  <DropdownMenuSeparator /><DropdownMenuItem><RoleBadge role={user?.role} /></DropdownMenuItem>
                  <DropdownMenuSeparator /><DropdownMenuItem onClick={logout} className="text-destructive gap-2"><LogOut className="w-4 h-4" />{t('auth.logout')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto max-w-7xl px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger data-testid="tab-devices" value="devices" className="gap-2">
              {isOperator ? <Camera className="w-4 h-4" /> : <Server className="w-4 h-4" />}
              {isOperator ? "Cámaras Online" : "Dispositivos"}
            </TabsTrigger>
            {!isOperator && !isTechnician && <TabsTrigger data-testid="tab-statistics" value="statistics" className="gap-2"><BarChart3 className="w-4 h-4" />Estadísticas</TabsTrigger>}
            {!isOperator && <TabsTrigger data-testid="tab-structure" value="structure" className="gap-2"><Building2 className="w-4 h-4" />Estructura</TabsTrigger>}
            {!isOperator && <TabsTrigger data-testid="tab-types" value="types" className="gap-2"><Tag className="w-4 h-4" />Tipos</TabsTrigger>}
            {!isOperator && <TabsTrigger data-testid="tab-alerts" value="alerts" className="gap-2"><Bell className="w-4 h-4" />Alertas{alerts.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{alerts.length}</Badge>}</TabsTrigger>}
            {isAdmin && <TabsTrigger data-testid="tab-users" value="users" className="gap-2"><Users className="w-4 h-4" />Usuarios</TabsTrigger>}
            {isAdmin && <TabsTrigger data-testid="tab-logs" value="logs" className="gap-2"><FileSearch className="w-4 h-4" />Logs</TabsTrigger>}
            {(isAdmin || isTechnician) && <TabsTrigger data-testid="tab-incidents" value="incidents" className="gap-2"><ClipboardList className="w-4 h-4" />Incidencias</TabsTrigger>}
            {isAdmin && <TabsTrigger data-testid="tab-settings" value="settings" className="gap-2"><Settings className="w-4 h-4" />Config</TabsTrigger>}
          </TabsList>

          <TabsContent value="devices">
            {/* Filters - not for operators, available for technicians */}
            {!isOperator && (
              <div className="flex gap-2 mb-6 flex-wrap items-center">
                {/* Search input with magnifying glass */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nombre, IP..." 
                    className="w-[200px] pl-8"
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
                {uniqueCountries.length > 0 && (
                  <Select value={filterCountry || "all"} onValueChange={(v) => { setFilterCountry(v === "all" ? null : v); setFilterOrgId(null); setFilterGroupId(null); }}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="País" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">🌍 Todos</SelectItem>{uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Select value={filterOrgId || "all"} onValueChange={(v) => { setFilterOrgId(v === "all" ? null : v); setFilterGroupId(null); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Organización" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todas las org.</SelectItem>{(filterCountry ? organizations.filter(o => o.country === filterCountry) : organizations).sort((a,b) => a.name.localeCompare(b.name, 'es')).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterGroupId || "all"} onValueChange={(v) => setFilterGroupId(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Grupo" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos los grupos</SelectItem>{(filterOrgId ? sortedGroups.filter(g => g.organization_id === filterOrgId) : sortedGroups).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterTypeId || "all"} onValueChange={(v) => setFilterTypeId(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{deviceTypes.map(t => { const Icon = getIcon(t.icon); return <SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color: t.color }} />{t.name}</div></SelectItem>; })}</SelectContent>
                </Select>
                {/* NEW: Status filter */}
                <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="online"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" />Online</div></SelectItem>
                    <SelectItem value="offline"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" />Offline</div></SelectItem>
                    <SelectItem value="unknown"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400" />Desconocido</div></SelectItem>
                  </SelectContent>
                </Select>
                {/* NEW: Filter by statistics */}
                <Button 
                  variant={filterStats ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setFilterStats(!filterStats)}
                  className={filterStats ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Con Stats
                </Button>
                {(searchQuery || filterCountry || filterOrgId || filterGroupId || filterTypeId || filterStatus || filterStats) && <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setFilterCountry(null); setFilterOrgId(null); setFilterGroupId(null); setFilterTypeId(null); setFilterStatus(null); setFilterStats(false); }}>Limpiar filtros</Button>}
                <span className="text-sm text-muted-foreground ml-auto">{filteredDevices.length} dispositivo(s)</span>
              </div>
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
              <div className="empty-state py-16"><Server className="w-16 h-16 mb-4 opacity-20" /><h3 className="text-lg font-medium mb-2">No hay dispositivos</h3>{canEdit && <Button onClick={() => setDeviceDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Agregar</Button>}</div>
            ) : (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={paginatedDevices.map(d => d.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {paginatedDevices.map(d => (
                        <SortableCard key={d.id} id={d.id}>
                          <ServerCard device={d} group={groups.find(g => g.id === d.group_id)} deviceType={deviceTypes.find(t => t.id === d.device_type_id)} onCheck={handleCheckDevice} onEdit={(dev) => { setSelectedDevice(dev); setDeviceDialogOpen(true); }} onClone={handleCloneDevice} onDelete={(dev) => { setDeleteTarget({ type: "device", item: dev }); setDeleteDialogOpen(true); }} onViewHistory={handleViewHistory} onMobotixInfo={handleMobotixInfo} onCreateIncident={(isAdmin || isTechnician) ? handleCreateIncidentFromDevice : null} canEdit={canEdit} />
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
            <StatisticsPanel devices={devices} groups={groups} />
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

          <TabsContent value="alerts"><AlertsPanel alerts={alerts} /></TabsContent>
          {isAdmin && <TabsContent value="users"><UsersPanel users={users} onCreateUser={() => { setSelectedUser(null); setUserDialogOpen(true); }} onEditUser={(u) => { setSelectedUser(u); setUserDialogOpen(true); }} onDeleteUser={(u) => { setDeleteTarget({ type: "user", item: u }); setDeleteDialogOpen(true); }} onResetPassword={handleOpenPasswordDialog} /></TabsContent>}
          {isAdmin && <TabsContent value="logs"><AccessLogsPanel /></TabsContent>}
          {(isAdmin || isTechnician) && <TabsContent value="incidents"><IncidentsPanel devices={devices} /></TabsContent>}
          {isAdmin && <TabsContent value="settings">
            <div className="space-y-6">
              <SettingsPanel settings={settings} onSave={handleSaveSettings} />
              <SecurityPanel />
              <ScheduledReportsPanel organizations={organizations} />
              <DailyReportPanel />
              <BackupPanel />
            </div>
          </TabsContent>}
        </Tabs>
      </main>

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
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSetPassword}>Guardar</Button>
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
            <Button variant="outline" onClick={() => setIncidentFromDeviceOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitIncidentFromDevice} disabled={creatingIncident}>
              {creatingIncident ? "Creando..." : "Crear Incidencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Siempria" className="h-8 object-contain opacity-70" />
              <span className="text-sm text-muted-foreground">Siempria Network Monitor</span>
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
  const { user, loading } = useAuth(); 
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    // Show loading screen for at least 2.5 seconds on initial load
    const timer = setTimeout(() => setShowLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);
  
  if (showLoading || loading) return <LoadingScreen />; 
  return user ? <Dashboard /> : <LoginPage />; 
};
export default App;
