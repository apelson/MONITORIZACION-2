import { useState, useEffect, useCallback, createContext, useContext, memo, useMemo } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Server, Plus, RefreshCw, Settings, History, Bell, Trash2, Edit, 
  Activity, Clock, AlertCircle, Wifi, WifiOff, Mail, Send, Users,
  FolderOpen, LogOut, User, Shield, Eye, Lock, ChevronDown, Building2,
  Camera, HardDrive, Network, Router, Monitor, Printer, Box, ChevronRight,
  MapPin, FileText, Image, Tag, Layers, Download, FileSpreadsheet, FileIcon,
  Info, Globe, Calendar, Copy, Cctv, ExternalLink, GripVertical
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_equip-tracker-39/artifacts/796492pi_version%20autorizada%202.png";
const MOBOTIX_LOGO_URL = "https://www.mobotix.com/sites/default/files/2019-10/MOBOTIX-Logo.svg";

// ============ LOADING SCREEN ============
const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Iniciando sistema...");
  
  useEffect(() => {
    const messages = [
      "Iniciando sistema...",
      "Conectando con servidores...",
      "Cargando dispositivos...",
      "Verificando cámaras...",
      "Preparando dashboard..."
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Logo container with animation */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Siempria Logo */}
        <div className="relative z-10 animate-fade-in">
          <img 
            src={LOGO_URL} 
            alt="Siempria" 
            className="h-20 md:h-24 object-contain drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}
          />
        </div>
        
        {/* Connection line animation */}
        <div className="mx-4 md:mx-8 flex items-center">
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div 
                key={i}
                className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"
                style={{ 
                  animationDelay: `${i * 0.15}s`,
                  opacity: 0.4 + (i * 0.15)
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Mobotix Logo */}
        <div className="relative z-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="bg-white rounded-lg px-4 py-2 shadow-xl">
            <img 
              src={MOBOTIX_LOGO_URL} 
              alt="Mobotix" 
              className="h-10 md:h-12 object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xl font-bold text-slate-800">MOBOTIX</span>'; }}
            />
          </div>
        </div>
      </div>
      
      {/* Title */}
      <h1 className="text-white text-2xl md:text-3xl font-light mb-2 tracking-wide animate-fade-in" style={{ animationDelay: '0.5s' }}>
        Network Monitor
      </h1>
      <p className="text-slate-400 text-sm mb-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        Distribuidor Autorizado
      </p>
      
      {/* Progress bar */}
      <div className="w-64 md:w-80 mb-4">
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${progress}%`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite linear'
            }}
          />
        </div>
      </div>
      
      {/* Status text */}
      <p className="text-slate-500 text-sm animate-pulse">{statusText}</p>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};
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
          setUser(response.data);
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
    const { access_token, user: userData } = response.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => { localStorage.removeItem("token"); setToken(null); setUser(null); };

  const authAxios = axios.create({ baseURL: API });
  authAxios.interceptors.request.use((config) => { if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
  authAxios.interceptors.response.use(
    (response) => response,
    (error) => {
      // For blob requests, don't try to parse error response
      if (error.config?.responseType === 'blob') {
        error.response = { data: null, status: error.response?.status || 0 };
      }
      return Promise.reject(error);
    }
  );

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
    operator: { label: "Operador", cls: "bg-purple-100 text-purple-700 border-purple-200" }
  }[role] || { label: role, cls: "bg-gray-100" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs`}>{cfg.label}</Badge>;
};

// ============ LOGIN ============
const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast.error("Completa todos los campos"); return; }
    setLoading(true);
    try { await login(username, password); toast.success("Bienvenido"); } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <img src={LOGO_URL} alt="Siempria" className="h-28 mx-auto mb-6 object-contain" />
          <CardTitle className="text-2xl font-bold">Network Monitor</CardTitle>
          <CardDescription className="text-base">Inicia sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Usuario</Label><Input data-testid="login-username" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
            <div className="space-y-2"><Label>Contraseña</Label><Input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button data-testid="login-submit" type="submit" className="w-full" disabled={loading}>{loading ? "Iniciando..." : "Iniciar Sesión"}</Button>
          </form>
        </CardContent>
      </Card>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Siempria - Todos los derechos reservados
      </div>
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

// ============ SERVER CARD ============
const ServerCard = memo(({ device, group, deviceType, onCheck, onEdit, onDelete, onClone, onViewHistory, onMobotixInfo, canEdit }) => {
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
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !imageData && isCamera && hasCameraConfig && device.status === "online") {
            loadImageNow();
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(node);
    return () => observer.disconnect();
  }, [imageData, isCamera, hasCameraConfig, device.status]);

  // Load image function
  const loadImageNow = async () => {
    if (imageData) return; // Already loaded
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
          <p className="text-xs text-muted-foreground mt-2 font-medium">{[device.brand, device.model].filter(Boolean).join(" • ")}</p>
        )}
        {device.location && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{device.location}</div>
        )}
        {group && (
          <Badge variant="outline" className="mt-2 text-xs" style={{ borderColor: group.color, color: group.color }}><FolderOpen className="w-3 h-3 mr-1" />{group.name}</Badge>
        )}
        {device.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{device.description}</p>}
        
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{device.last_check ? new Date(device.last_check).toLocaleString() : "Sin verificar"}</span>
        </div>

        <Separator className="my-3" />

        <div className="flex flex-col gap-2">
          <Button data-testid={`check-device-${device.id}`} variant="outline" size="sm" onClick={handleCheck} disabled={isChecking} className="w-full">
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isChecking ? 'animate-spin-slow' : ''}`} />Verificar
          </Button>
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="sm" onClick={openDeviceInBrowser} title="Abrir en navegador"><Globe className="w-4 h-4" /></Button>
            {isCamera && (
              <Button variant="ghost" size="sm" onClick={() => onMobotixInfo(device)} title="Info Cámara"><Info className="w-4 h-4" /></Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onViewHistory(device)} title="Historial"><History className="w-4 h-4" /></Button>
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
  const [formData, setFormData] = useState({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "", camera_protocol: "http", camera_user: "", camera_password: "", camera_path: "" });
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
          camera_path: device.camera_path || ""
        });
        const grp = groups.find(g => g.id === device.group_id);
        if (grp) setSelectedOrgId(grp.organization_id);
      } else {
        setFormData({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "", camera_protocol: "http", camera_user: "", camera_password: "", camera_path: "" });
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
              <Label>Logo (URL)</Label>
              <Input placeholder="https://ejemplo.com/logo.png" value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} />
              {formData.logo_url && <img src={formData.logo_url} alt="Logo preview" className="h-16 object-contain rounded border mt-2" />}
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
                    <SelectItem value="operator"><div className="flex items-center gap-2"><Camera className="w-4 h-4" />Operador</div></SelectItem>
                    <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="w-4 h-4" />Visor</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.role !== "admin" && (
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
const FailuresDialog = ({ open, onOpenChange, failures, onClear }) => {
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
                <span className="text-xs text-muted-foreground whitespace-nowrap">{f.time}</span>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClear}>Limpiar historial</Button>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ PANELS ============
const OrganizationsPanel = ({ organizations, groups, devices, onCreateOrg, onEditOrg, onDeleteOrg, onCreateGroup, onEditGroup, onDeleteGroup, canEdit, onExport }) => {
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
                              {canEdit && (
                                <div className="flex justify-end gap-1 mt-2">
                                  <Button variant="ghost" size="sm" onClick={() => onEditGroup(g)}><Edit className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => onDeleteGroup(g)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              )}
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

const DeviceTypesPanel = ({ deviceTypes, onCreateType, onEditType, onDeleteType, canEdit }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" />Tipos de Dispositivos</CardTitle><CardDescription>Define tipos con iconos para categorizar</CardDescription></div>
        {canEdit && <Button size="sm" onClick={() => onCreateType()}><Plus className="w-4 h-4 mr-2" />Nuevo Tipo</Button>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {deviceTypes.map(t => {
            const Icon = getIcon(t.icon);
            return (
              <div key={t.id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow text-center">
                <div className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${t.color}20` }}>
                  <Icon className="w-6 h-6" style={{ color: t.color }} />
                </div>
                <h4 className="font-medium text-sm">{t.name}</h4>
                {canEdit && !t.is_default && (
                  <div className="flex justify-center gap-1 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => onEditType(t)}><Edit className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteType(t)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                )}
                {t.is_default && <p className="text-xs text-muted-foreground mt-1">Predefinido</p>}
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

const AlertsPanel = ({ alerts }) => (
  <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Alertas</CardTitle></CardHeader>
    <CardContent>
      {alerts.length === 0 ? <div className="empty-state py-8"><Bell className="w-12 h-12 mb-4 opacity-20" /><p>No hay alertas</p></div> : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">{alerts.map(a => (
            <div key={a.id} className={`p-4 rounded-lg border ${a.alert_type === 'device_down' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">{a.alert_type === 'device_down' ? <WifiOff className="w-4 h-4 text-red-600" /> : <Wifi className="w-4 h-4 text-green-600" />}<span className={`font-medium ${a.alert_type === 'device_down' ? 'text-red-700' : 'text-green-700'}`}>{a.device_name}</span></div>
                {a.email_sent && <Badge variant="outline" className="text-xs"><Mail className="w-3 h-3 mr-1" />Enviado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(a.timestamp).toLocaleString()}</p>
            </div>
          ))}</div>
        </ScrollArea>
      )}
    </CardContent>
  </Card>
);

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
  const [formData, setFormData] = useState({ alert_email: "", gmail_user: "", gmail_app_password: "" });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { authAxios } = useAuth();

  useEffect(() => { if (settings) setFormData({ alert_email: settings.alert_email || "", gmail_user: settings.gmail_user || "", gmail_app_password: "" }); }, [settings]);

  const handleSave = async (e) => { e.preventDefault(); if (!formData.alert_email || !formData.gmail_user || !formData.gmail_app_password) { toast.error("Completa todos"); return; } setSaving(true); await onSave(formData); setSaving(false); };
  const handleTest = async () => { setTesting(true); try { await authAxios.post("/settings/test-email"); toast.success("Email enviado"); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } setTesting(false); };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Configuración Email</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2"><Label>Email alertas</Label><Input data-testid="settings-alert-email" type="email" value={formData.alert_email} onChange={(e) => setFormData({ ...formData, alert_email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Gmail usuario</Label><Input data-testid="settings-gmail-user" type="email" value={formData.gmail_user} onChange={(e) => setFormData({ ...formData, gmail_user: e.target.value })} /></div>
          <div className="space-y-2"><Label>Contraseña app</Label><Input data-testid="settings-gmail-password" type="password" value={formData.gmail_app_password} onChange={(e) => setFormData({ ...formData, gmail_app_password: e.target.value })} /></div>
          <div className="flex gap-2 pt-4">
            <Button data-testid="save-settings-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !settings?.gmail_user}><Send className="w-4 h-4 mr-2" />{testing ? "Enviando..." : "Probar"}</Button>
          </div>
        </form>
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

const LoadingSkeleton = () => (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{[1,2,3,4].map(i => <Card key={i} className="server-card"><CardContent className="p-6"><div className="flex items-start gap-3"><Skeleton className="w-10 h-10 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24" /></div></div><Skeleton className="h-4 w-full mt-4" /><Separator className="my-4" /><div className="flex gap-2"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-8" /></div></CardContent></Card>)}</div>);

// ============ DASHBOARD ============
const Dashboard = () => {
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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const DEVICES_PER_PAGE = 50;
  
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
  const handleResetPassword = async (userId) => { try { await authAxios.post(`/users/${userId}/reset-password`); toast.success("Contraseña: password123"); } catch (e) { toast.error("Error"); } };
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
  }

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
  }, [filterOrgId, filterGroupId, filterTypeId, filterCountry]);

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="app-header">
        <div className="container mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="Siempria" className="h-12 object-contain" />
              <div className="hidden md:block">
                <h1 className="text-xl font-bold tracking-tight">Network Monitor</h1>
                <p className="text-xs text-muted-foreground">Sistema de monitorización</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="flex items-center gap-2"><div className="status-dot status-dot-online" /><span className="text-sm font-medium">{onlineCount}</span></div>
                <button onClick={() => setFailuresDialogOpen(true)} className="flex items-center gap-2 hover:bg-red-50 px-2 py-1 rounded transition-colors" title="Ver resumen de fallos">
                  <div className="status-dot status-dot-offline" /><span className="text-sm font-medium">{offlineCount}</span>
                  {recentFailures.length > 0 && <Bell className="w-4 h-4 text-red-500 animate-pulse" />}
                </button>
              </div>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="gap-2"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4" /></div><span className="hidden md:inline">{user?.username}</span><ChevronDown className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5"><p className="text-sm font-medium">{user?.full_name || user?.username}</p><p className="text-xs text-muted-foreground">{user?.email}</p></div>
                  <DropdownMenuSeparator /><DropdownMenuItem><RoleBadge role={user?.role} /></DropdownMenuItem>
                  <DropdownMenuSeparator /><DropdownMenuItem onClick={logout} className="text-destructive gap-2"><LogOut className="w-4 h-4" />Cerrar Sesión</DropdownMenuItem>
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
            {!isOperator && <TabsTrigger data-testid="tab-structure" value="structure" className="gap-2"><Building2 className="w-4 h-4" />Estructura</TabsTrigger>}
            {!isOperator && <TabsTrigger data-testid="tab-types" value="types" className="gap-2"><Tag className="w-4 h-4" />Tipos</TabsTrigger>}
            {!isOperator && <TabsTrigger data-testid="tab-alerts" value="alerts" className="gap-2"><Bell className="w-4 h-4" />Alertas{alerts.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{alerts.length}</Badge>}</TabsTrigger>}
            {isAdmin && <TabsTrigger data-testid="tab-users" value="users" className="gap-2"><Users className="w-4 h-4" />Usuarios</TabsTrigger>}
            {isAdmin && <TabsTrigger data-testid="tab-settings" value="settings" className="gap-2"><Settings className="w-4 h-4" />Config</TabsTrigger>}
          </TabsList>

          <TabsContent value="devices">
            {/* Filters - not for operators */}
            {!isOperator && (
              <div className="flex gap-2 mb-6 flex-wrap items-center">
                {uniqueCountries.length > 0 && (
                  <Select value={filterCountry || "all"} onValueChange={(v) => { setFilterCountry(v === "all" ? null : v); setFilterOrgId(null); setFilterGroupId(null); }}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="País" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">🌍 Todos</SelectItem>{uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Select value={filterOrgId || "all"} onValueChange={(v) => { setFilterOrgId(v === "all" ? null : v); setFilterGroupId(null); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Organización" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todas las org.</SelectItem>{(filterCountry ? organizations.filter(o => o.country === filterCountry) : organizations).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterGroupId || "all"} onValueChange={(v) => setFilterGroupId(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Grupo" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos los grupos</SelectItem>{(filterOrgId ? groups.filter(g => g.organization_id === filterOrgId) : groups).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterTypeId || "all"} onValueChange={(v) => setFilterTypeId(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{deviceTypes.map(t => { const Icon = getIcon(t.icon); return <SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color: t.color }} />{t.name}</div></SelectItem>; })}</SelectContent>
                </Select>
                {(filterCountry || filterOrgId || filterGroupId || filterTypeId) && <Button variant="ghost" size="sm" onClick={() => { setFilterCountry(null); setFilterOrgId(null); setFilterGroupId(null); setFilterTypeId(null); }}>Limpiar filtros</Button>}
                <span className="text-sm text-muted-foreground ml-auto">{filteredDevices.length} dispositivo(s)</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedDevices.map(d => <ServerCard key={d.id} device={d} group={groups.find(g => g.id === d.group_id)} deviceType={deviceTypes.find(t => t.id === d.device_type_id)} onCheck={handleCheckDevice} onEdit={(dev) => { setSelectedDevice(dev); setDeviceDialogOpen(true); }} onClone={handleCloneDevice} onDelete={(dev) => { setDeleteTarget({ type: "device", item: dev }); setDeleteDialogOpen(true); }} onViewHistory={handleViewHistory} onMobotixInfo={handleMobotixInfo} canEdit={canEdit} />)}
                </div>
                
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

          <TabsContent value="structure">
            <OrganizationsPanel organizations={organizations} groups={groups} devices={devices} canEdit={canEdit}
              onCreateOrg={() => { setSelectedOrg(null); setOrgDialogOpen(true); }}
              onEditOrg={(o) => { setSelectedOrg(o); setOrgDialogOpen(true); }}
              onDeleteOrg={(o) => { setDeleteTarget({ type: "org", item: o }); setDeleteDialogOpen(true); }}
              onCreateGroup={(orgId) => { setSelectedGroup(null); setGroupDialogOrgId(orgId); setGroupDialogOpen(true); }}
              onEditGroup={(g) => { setSelectedGroup(g); setGroupDialogOpen(true); }}
              onDeleteGroup={(g) => { setDeleteTarget({ type: "group", item: g }); setDeleteDialogOpen(true); }}
              onExport={handleExport} />
          </TabsContent>

          <TabsContent value="types">
            <DeviceTypesPanel deviceTypes={deviceTypes} canEdit={canEdit}
              onCreateType={() => { setSelectedType(null); setTypeDialogOpen(true); }}
              onEditType={(t) => { setSelectedType(t); setTypeDialogOpen(true); }}
              onDeleteType={(t) => { setDeleteTarget({ type: "type", item: t }); setDeleteDialogOpen(true); }} />
          </TabsContent>

          <TabsContent value="alerts"><AlertsPanel alerts={alerts} /></TabsContent>
          {isAdmin && <TabsContent value="users"><UsersPanel users={users} onCreateUser={() => { setSelectedUser(null); setUserDialogOpen(true); }} onEditUser={(u) => { setSelectedUser(u); setUserDialogOpen(true); }} onDeleteUser={(u) => { setDeleteTarget({ type: "user", item: u }); setDeleteDialogOpen(true); }} onResetPassword={handleResetPassword} /></TabsContent>}
          {isAdmin && <TabsContent value="settings">
            <div className="space-y-6">
              <SettingsPanel settings={settings} onSave={handleSaveSettings} />
              <ScheduledReportsPanel organizations={organizations} />
            </div>
          </TabsContent>}
        </Tabs>
      </main>

      {/* Dialogs */}
      <DeviceFormDialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen} device={selectedDevice} organizations={organizations} groups={groups} deviceTypes={deviceTypes} onSave={handleSaveDevice} />
      <OrganizationFormDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} organization={selectedOrg} onSave={handleSaveOrg} />
      <GroupFormDialog open={groupDialogOpen} onOpenChange={(o) => { setGroupDialogOpen(o); if (!o) setGroupDialogOrgId(null); }} group={selectedGroup ? selectedGroup : groupDialogOrgId ? { organization_id: groupDialogOrgId } : null} organizations={organizations} onSave={handleSaveGroup} />
      <UserFormDialog open={userDialogOpen} onOpenChange={setUserDialogOpen} user={selectedUser} organizations={organizations} groups={groups} onSave={handleSaveUser} />
      <DeviceTypeFormDialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen} deviceType={selectedType} onSave={handleSaveType} />
      <HistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} device={selectedDevice} history={deviceHistory} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Confirmar Eliminación" message={`¿Eliminar "${deleteTarget.item?.name || deleteTarget.item?.username}"?`} onConfirm={handleDelete} />
      <FailuresDialog open={failuresDialogOpen} onOpenChange={setFailuresDialogOpen} failures={recentFailures} onClear={() => setRecentFailures([])} />
      
      {/* Mobotix Info Dialog */}
      <Dialog open={mobotixDialogOpen} onOpenChange={setMobotixDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-600" />
              Información de Cámara
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
          ) : mobotixInfo?.error ? (
            <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {mobotixInfo.error}
            </div>
          ) : mobotixInfo ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Estado de API Mobotix</p>
                <p className="text-xs text-muted-foreground">{mobotixInfo.device_status || "Sin respuesta"}</p>
              </div>
              
              {mobotixInfo.configuration && Object.keys(mobotixInfo.configuration).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Configuración Detectada</p>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {Object.entries(mobotixInfo.configuration).slice(0, 30).map(([key, value]) => (
                          <tr key={key} className="border-b">
                            <td className="py-1 pr-2 font-mono text-muted-foreground">{key}</td>
                            <td className="py-1 font-mono break-all">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {mobotixInfo.errors && mobotixInfo.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-amber-600">Endpoints no disponibles</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {mobotixInfo.errors.map((err, i) => (
                      <p key={i} className="font-mono">{err}</p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <p className="font-medium mb-1">Nota:</p>
                <p>Esta función utiliza la API HTTP de Mobotix. Si la cámara no es Mobotix o no tiene la API habilitada, algunos datos podrían no estar disponibles.</p>
              </div>
            </div>
          ) : null}
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
