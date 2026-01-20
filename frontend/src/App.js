import { useState, useEffect, useCallback, createContext, useContext } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Server, Plus, RefreshCw, Settings, History, Bell, Trash2, Edit, 
  Activity, Clock, AlertCircle, Wifi, WifiOff, Mail, Send, Users,
  FolderOpen, LogOut, User, Shield, Eye, Lock, ChevronDown, Building2,
  Camera, HardDrive, Network, Router, Monitor, Printer, Box, ChevronRight,
  MapPin, FileText, Image, Tag, Layers
} from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_equip-tracker-39/artifacts/796492pi_version%20autorizada%202.png";

// Icon mapping
const ICON_MAP = {
  camera: Camera, "hard-drive": HardDrive, network: Network, router: Router,
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
  const cfg = { admin: { label: "Admin", cls: "bg-red-100 text-red-700 border-red-200" }, manager: { label: "Gestor", cls: "bg-blue-100 text-blue-700 border-blue-200" }, viewer: { label: "Visor", cls: "bg-gray-100 text-gray-700 border-gray-200" } }[role] || { label: role, cls: "bg-gray-100" };
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
          <img src={LOGO_URL} alt="Siempria" className="h-20 mx-auto mb-4 object-contain" />
          <CardTitle className="text-xl font-semibold">Network Monitor</CardTitle>
          <CardDescription>Inicia sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Usuario</Label><Input data-testid="login-username" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
            <div className="space-y-2"><Label>Contraseña</Label><Input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button data-testid="login-submit" type="submit" className="w-full" disabled={loading}>{loading ? "Iniciando..." : "Iniciar Sesión"}</Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">Usuario: admin / admin123</p>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ SERVER CARD ============
const ServerCard = ({ device, group, deviceType, onCheck, onEdit, onDelete, onViewHistory, canEdit }) => {
  const [isChecking, setIsChecking] = useState(false);
  const handleCheck = async () => { setIsChecking(true); await onCheck(device.id); setIsChecking(false); };
  const TypeIcon = deviceType ? getIcon(deviceType.icon) : Server;

  return (
    <Card data-testid={`device-card-${device.id}`} className="server-card fade-in hover:-translate-y-0.5 transition-transform duration-200 overflow-hidden">
      {device.image_url && (
        <div className="h-32 bg-muted overflow-hidden">
          <img src={device.image_url} alt={device.name} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className={`p-5 ${device.image_url ? 'pt-4' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: deviceType?.color ? `${deviceType.color}20` : '#f4f4f5' }}>
                <TypeIcon className="w-5 h-5" style={{ color: deviceType?.color || '#6b7280' }} />
              </div>
              <StatusDot status={device.status} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground leading-tight">{device.name}</h3>
              <p className="ip-text mt-0.5">{device.ip_address}:{device.port}</p>
            </div>
          </div>
          <StatusBadge status={device.status} />
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

        <div className="flex items-center gap-1">
          <Button data-testid={`check-device-${device.id}`} variant="outline" size="sm" onClick={handleCheck} disabled={isChecking} className="flex-1">
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isChecking ? 'animate-spin-slow' : ''}`} />Verificar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onViewHistory(device)}><History className="w-4 h-4" /></Button>
          {canEdit && (<><Button variant="ghost" size="sm" onClick={() => onEdit(device)}><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(device)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></>)}
        </div>
      </CardContent>
    </Card>
  );
};

// ============ DIALOGS ============
const DeviceFormDialog = ({ open, onOpenChange, device, organizations, groups, deviceTypes, onSave }) => {
  const [formData, setFormData] = useState({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "" });
  const [saving, setSaving] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  useEffect(() => {
    if (device) {
      setFormData({ name: device.name || "", ip_address: device.ip_address || "", port: device.port || 80, description: device.description || "", group_id: device.group_id || "", device_type_id: device.device_type_id || "", brand: device.brand || "", model: device.model || "", location: device.location || "", notes: device.notes || "", image_url: device.image_url || "" });
      const grp = groups.find(g => g.id === device.group_id);
      if (grp) setSelectedOrgId(grp.organization_id);
    } else {
      setFormData({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "" });
      setSelectedOrgId("");
    }
  }, [device, open, groups]);

  const filteredGroups = selectedOrgId ? groups.filter(g => g.organization_id === selectedOrgId) : groups;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ip_address || !formData.port) { toast.error("Completa los campos requeridos"); return; }
    setSaving(true);
    await onSave({ ...formData, group_id: formData.group_id || null, device_type_id: formData.device_type_id || null }, device?.id);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="device-form-dialog" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{device ? "Editar Dispositivo" : "Agregar Dispositivo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2"><Label>Nombre *</Label><Input data-testid="device-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>IP *</Label><Input data-testid="device-ip-input" className="font-mono" value={formData.ip_address} onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Puerto *</Label><Input data-testid="device-port-input" type="number" className="font-mono" value={formData.port} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 80 })} /></div>
            
            <div className="space-y-2">
              <Label>Tipo de Dispositivo</Label>
              <Select value={formData.device_type_id || "none"} onValueChange={(v) => setFormData({ ...formData, device_type_id: v === "none" ? "" : v })}>
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

            <Separator className="col-span-2" />
            <p className="col-span-2 text-sm font-medium text-muted-foreground">Información adicional</p>

            <div className="space-y-2"><Label>Marca</Label><Input placeholder="Ej: Hikvision, Synology" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} /></div>
            <div className="space-y-2"><Label>Modelo</Label><Input placeholder="Ej: DS-2CD2143G2" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Ubicación</Label><Input placeholder="Ej: Oficina Madrid - Planta 2" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Imagen (URL)</Label><Input placeholder="https://ejemplo.com/imagen.png o .gif" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
              {formData.image_url && <img src={formData.image_url} alt="Preview" className="h-20 object-contain rounded border mt-2" />}
            </div>
            <div className="col-span-2 space-y-2"><Label>Descripción</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Notas</Label><Textarea placeholder="Notas internas, contraseñas, configuración..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} /></div>
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
  const [formData, setFormData] = useState({ name: "", description: "", color: "#3b82f6" });
  const [saving, setSaving] = useState(false);
  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  useEffect(() => {
    if (organization) setFormData({ name: organization.name || "", description: organization.description || "", color: organization.color || "#3b82f6" });
    else setFormData({ name: "", description: "", color: "#3b82f6" });
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
  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

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

const UserFormDialog = ({ open, onOpenChange, user, onSave }) => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "", role: "viewer", full_name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setFormData({ username: user.username || "", email: user.email || "", password: "", role: user.role || "viewer", full_name: user.full_name || "" });
    else setFormData({ username: "", email: "", password: "", role: "viewer", full_name: "" });
  }, [user, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || (!user && !formData.password)) { toast.error("Completa los campos"); return; }
    setSaving(true); await onSave(formData, user?.id); setSaving(false); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{user ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Usuario *</Label><Input data-testid="user-username-input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={!!user} /></div>
            <div className="space-y-2"><Label>Email *</Label><Input data-testid="user-email-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            {!user && <div className="space-y-2"><Label>Contraseña *</Label><Input data-testid="user-password-input" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>}
            <div className="space-y-2"><Label>Nombre completo</Label><Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Rol</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="w-4 h-4" />Admin</div></SelectItem>
                  <SelectItem value="manager"><div className="flex items-center gap-2"><Edit className="w-4 h-4" />Gestor</div></SelectItem>
                  <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="w-4 h-4" />Visor</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button data-testid="save-user-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeviceTypeFormDialog = ({ open, onOpenChange, deviceType, onSave }) => {
  const [formData, setFormData] = useState({ name: "", icon: "server", color: "#6b7280" });
  const [saving, setSaving] = useState(false);
  const icons = ["camera", "hard-drive", "network", "router", "server", "monitor", "printer", "wifi", "shield", "box", "layers"];
  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#6b7280"];

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

// ============ PANELS ============
const OrganizationsPanel = ({ organizations, groups, devices, onCreateOrg, onEditOrg, onDeleteOrg, onCreateGroup, onEditGroup, onDeleteGroup, canEdit }) => {
  const [openOrgs, setOpenOrgs] = useState({});
  const toggleOrg = (id) => setOpenOrgs(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold">Organizaciones y Grupos</h2><p className="text-sm text-muted-foreground">Estructura jerárquica de tus dispositivos</p></div>
        {canEdit && <Button data-testid="add-org-btn" size="sm" onClick={() => onCreateOrg()}><Plus className="w-4 h-4 mr-2" />Nueva Organización</Button>}
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
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: org.color }} />
                          <div>
                            <CardTitle className="text-base">{org.name}</CardTitle>
                            {org.description && <CardDescription className="text-xs">{org.description}</CardDescription>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{orgGroups.length} grupos • {orgDeviceCount} dispositivos</Badge>
                          {canEdit && (
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => onCreateGroup(org.id)}><Plus className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => onEditOrg(org)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => onDeleteOrg(org)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          )}
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
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState({ type: "", item: null });

  const canEdit = user?.role === "admin" || user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;

  const fetchAll = useCallback(async () => {
    try {
      const [devRes, orgRes, grpRes, typeRes, alertRes] = await Promise.all([
        authAxios.get("/devices"), authAxios.get("/organizations"), authAxios.get("/groups"),
        authAxios.get("/device-types"), authAxios.get("/alerts")
      ]);
      setDevices(devRes.data.devices || []);
      setOrganizations(orgRes.data.organizations || []);
      setGroups(grpRes.data.groups || []);
      setDeviceTypes(typeRes.data.device_types || []);
      setAlerts(alertRes.data.alerts || []);
      if (isAdmin) {
        const [usrRes, setRes] = await Promise.all([authAxios.get("/users"), authAxios.get("/settings")]);
        setUsers(usrRes.data.users || []);
        setSettings(setRes.data.settings);
      }
    } catch (e) { console.error(e); }
  }, [authAxios, isAdmin]);

  useEffect(() => { const init = async () => { setLoading(true); await fetchAll(); setLoading(false); }; init(); const interval = setInterval(fetchAll, 30000); return () => clearInterval(interval); }, [fetchAll]);

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

  // Filter devices
  let filteredDevices = devices;
  if (filterGroupId) filteredDevices = filteredDevices.filter(d => d.group_id === filterGroupId);
  else if (filterOrgId) {
    const orgGroupIds = groups.filter(g => g.organization_id === filterOrgId).map(g => g.id);
    filteredDevices = filteredDevices.filter(d => orgGroupIds.includes(d.group_id));
  }
  if (filterTypeId) filteredDevices = filteredDevices.filter(d => d.device_type_id === filterTypeId);

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="app-header">
        <div className="container mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="Siempria" className="h-10 object-contain" />
              <h1 className="text-lg font-semibold tracking-tight hidden md:block">Network Monitor</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="flex items-center gap-2"><div className="status-dot status-dot-online" /><span className="text-sm font-medium">{onlineCount}</span></div>
                <div className="flex items-center gap-2"><div className="status-dot status-dot-offline" /><span className="text-sm font-medium">{offlineCount}</span></div>
              </div>
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
            <TabsTrigger data-testid="tab-devices" value="devices" className="gap-2"><Server className="w-4 h-4" />Dispositivos</TabsTrigger>
            <TabsTrigger data-testid="tab-structure" value="structure" className="gap-2"><Building2 className="w-4 h-4" />Estructura</TabsTrigger>
            <TabsTrigger data-testid="tab-types" value="types" className="gap-2"><Tag className="w-4 h-4" />Tipos</TabsTrigger>
            <TabsTrigger data-testid="tab-alerts" value="alerts" className="gap-2"><Bell className="w-4 h-4" />Alertas{alerts.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{alerts.length}</Badge>}</TabsTrigger>
            {isAdmin && <TabsTrigger data-testid="tab-users" value="users" className="gap-2"><Users className="w-4 h-4" />Usuarios</TabsTrigger>}
            {isAdmin && <TabsTrigger data-testid="tab-settings" value="settings" className="gap-2"><Settings className="w-4 h-4" />Config</TabsTrigger>}
          </TabsList>

          <TabsContent value="devices">
            {/* Filters */}
            <div className="flex gap-2 mb-6 flex-wrap items-center">
              <Select value={filterOrgId || "all"} onValueChange={(v) => { setFilterOrgId(v === "all" ? null : v); setFilterGroupId(null); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Organización" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas las org.</SelectItem>{organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterGroupId || "all"} onValueChange={(v) => setFilterGroupId(v === "all" ? null : v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Grupo" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos los grupos</SelectItem>{(filterOrgId ? groups.filter(g => g.organization_id === filterOrgId) : groups).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterTypeId || "all"} onValueChange={(v) => setFilterTypeId(v === "all" ? null : v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{deviceTypes.map(t => { const Icon = getIcon(t.icon); return <SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color: t.color }} />{t.name}</div></SelectItem>; })}</SelectContent>
              </Select>
              {(filterOrgId || filterGroupId || filterTypeId) && <Button variant="ghost" size="sm" onClick={() => { setFilterOrgId(null); setFilterGroupId(null); setFilterTypeId(null); }}>Limpiar filtros</Button>}
              <span className="text-sm text-muted-foreground ml-auto">{filteredDevices.length} dispositivo(s)</span>
            </div>

            {loading ? <LoadingSkeleton /> : filteredDevices.length === 0 ? (
              <div className="empty-state py-16"><Server className="w-16 h-16 mb-4 opacity-20" /><h3 className="text-lg font-medium mb-2">No hay dispositivos</h3>{canEdit && <Button onClick={() => setDeviceDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Agregar</Button>}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDevices.map(d => <ServerCard key={d.id} device={d} group={groups.find(g => g.id === d.group_id)} deviceType={deviceTypes.find(t => t.id === d.device_type_id)} onCheck={handleCheckDevice} onEdit={(dev) => { setSelectedDevice(dev); setDeviceDialogOpen(true); }} onDelete={(dev) => { setDeleteTarget({ type: "device", item: dev }); setDeleteDialogOpen(true); }} onViewHistory={handleViewHistory} canEdit={canEdit} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="structure">
            <OrganizationsPanel organizations={organizations} groups={groups} devices={devices} canEdit={canEdit}
              onCreateOrg={() => { setSelectedOrg(null); setOrgDialogOpen(true); }}
              onEditOrg={(o) => { setSelectedOrg(o); setOrgDialogOpen(true); }}
              onDeleteOrg={(o) => { setDeleteTarget({ type: "org", item: o }); setDeleteDialogOpen(true); }}
              onCreateGroup={(orgId) => { setSelectedGroup(null); setGroupDialogOrgId(orgId); setGroupDialogOpen(true); }}
              onEditGroup={(g) => { setSelectedGroup(g); setGroupDialogOpen(true); }}
              onDeleteGroup={(g) => { setDeleteTarget({ type: "group", item: g }); setDeleteDialogOpen(true); }} />
          </TabsContent>

          <TabsContent value="types">
            <DeviceTypesPanel deviceTypes={deviceTypes} canEdit={canEdit}
              onCreateType={() => { setSelectedType(null); setTypeDialogOpen(true); }}
              onEditType={(t) => { setSelectedType(t); setTypeDialogOpen(true); }}
              onDeleteType={(t) => { setDeleteTarget({ type: "type", item: t }); setDeleteDialogOpen(true); }} />
          </TabsContent>

          <TabsContent value="alerts"><AlertsPanel alerts={alerts} /></TabsContent>
          {isAdmin && <TabsContent value="users"><UsersPanel users={users} onCreateUser={() => { setSelectedUser(null); setUserDialogOpen(true); }} onEditUser={(u) => { setSelectedUser(u); setUserDialogOpen(true); }} onDeleteUser={(u) => { setDeleteTarget({ type: "user", item: u }); setDeleteDialogOpen(true); }} onResetPassword={handleResetPassword} /></TabsContent>}
          {isAdmin && <TabsContent value="settings"><SettingsPanel settings={settings} onSave={handleSaveSettings} /></TabsContent>}
        </Tabs>
      </main>

      {/* Dialogs */}
      <DeviceFormDialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen} device={selectedDevice} organizations={organizations} groups={groups} deviceTypes={deviceTypes} onSave={handleSaveDevice} />
      <OrganizationFormDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} organization={selectedOrg} onSave={handleSaveOrg} />
      <GroupFormDialog open={groupDialogOpen} onOpenChange={(o) => { setGroupDialogOpen(o); if (!o) setGroupDialogOrgId(null); }} group={selectedGroup ? selectedGroup : groupDialogOrgId ? { organization_id: groupDialogOrgId } : null} organizations={organizations} onSave={handleSaveGroup} />
      <UserFormDialog open={userDialogOpen} onOpenChange={setUserDialogOpen} user={selectedUser} onSave={handleSaveUser} />
      <DeviceTypeFormDialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen} deviceType={selectedType} onSave={handleSaveType} />
      <HistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} device={selectedDevice} history={deviceHistory} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Confirmar Eliminación" message={`¿Eliminar "${deleteTarget.item?.name || deleteTarget.item?.username}"?`} onConfirm={handleDelete} />
    </div>
  );
};

// ============ APP ============
function App() { return <AuthProvider><AppContent /></AuthProvider>; }
const AppContent = () => { const { user, loading } = useAuth(); if (loading) return <div className="min-h-screen flex items-center justify-center"><img src={LOGO_URL} alt="Siempria" className="h-16 animate-pulse" /></div>; return user ? <Dashboard /> : <LoginPage />; };
export default App;
