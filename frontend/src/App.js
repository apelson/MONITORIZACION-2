import { useState, useEffect, useCallback, createContext, useContext } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Server, Plus, RefreshCw, Settings, History, Bell, Trash2, Edit, 
  Activity, Clock, AlertCircle, Wifi, WifiOff, Mail, Send, Users,
  FolderOpen, LogOut, User, Shield, Eye, Lock, ChevronDown, Palette
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_equip-tracker-39/artifacts/796492pi_version%20autorizada%202.png";

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
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
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

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const authAxios = axios.create({ baseURL: API });
  authAxios.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, authAxios }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============ COMPONENTS ============

const StatusDot = ({ status }) => {
  const statusClass = {
    online: "status-dot-online animate-pulse-online",
    offline: "status-dot-offline",
    checking: "status-dot-checking animate-pulse",
    unknown: "status-dot-unknown"
  }[status] || "status-dot-unknown";
  return <div className={`status-dot ${statusClass}`} />;
};

const StatusBadge = ({ status }) => {
  const config = {
    online: { label: "Online", className: "badge-online" },
    offline: { label: "Offline", className: "badge-offline" },
    checking: { label: "Verificando...", className: "badge-checking" },
    unknown: { label: "Desconocido", className: "bg-muted text-muted-foreground" }
  }[status] || { label: "Desconocido", className: "bg-muted" };
  return <Badge variant="outline" className={`${config.className} text-xs font-medium px-2 py-0.5`}>{config.label}</Badge>;
};

const RoleBadge = ({ role }) => {
  const config = {
    admin: { label: "Admin", className: "bg-red-100 text-red-700 border-red-200" },
    manager: { label: "Gestor", className: "bg-blue-100 text-blue-700 border-blue-200" },
    viewer: { label: "Visor", className: "bg-gray-100 text-gray-700 border-gray-200" }
  }[role] || { label: role, className: "bg-gray-100" };
  return <Badge variant="outline" className={`${config.className} text-xs`}>{config.label}</Badge>;
};

// ============ LOGIN PAGE ============

const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Bienvenido");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error de autenticación");
    }
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
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                data-testid="login-username"
                id="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                data-testid="login-password"
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button data-testid="login-submit" type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando..." : "Iniciar Sesión"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Usuario por defecto: admin / admin123
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ SERVER CARD ============

const ServerCard = ({ device, group, onCheck, onEdit, onDelete, onViewHistory, canEdit }) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    await onCheck(device.id);
    setIsChecking(false);
  };

  return (
    <Card data-testid={`device-card-${device.id}`} className="server-card fade-in hover:-translate-y-0.5 transition-transform duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusDot status={device.status} />
            <div>
              <h3 className="font-semibold text-foreground">{device.name}</h3>
              <p className="ip-text mt-1">{device.ip_address}:{device.port}</p>
            </div>
          </div>
          <StatusBadge status={device.status} />
        </div>
        
        {group && (
          <div className="mt-3">
            <Badge variant="outline" style={{ borderColor: group.color, color: group.color }} className="text-xs">
              <FolderOpen className="w-3 h-3 mr-1" />
              {group.name}
            </Badge>
          </div>
        )}
        
        {device.description && <p className="text-sm text-muted-foreground mt-3">{device.description}</p>}
        
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{device.last_check ? `Último check: ${new Date(device.last_check).toLocaleString()}` : "Sin verificar"}</span>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex items-center gap-2">
          <Button data-testid={`check-device-${device.id}`} variant="outline" size="sm" onClick={handleCheck} disabled={isChecking} className="flex-1">
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isChecking ? 'animate-spin-slow' : ''}`} />
            Verificar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onViewHistory(device)}>
            <History className="w-4 h-4" />
          </Button>
          {canEdit && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onEdit(device)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(device)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============ DIALOGS ============

const DeviceFormDialog = ({ open, onOpenChange, device, groups, onSave }) => {
  const [formData, setFormData] = useState({ name: "", ip_address: "", port: 80, description: "", group_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (device) {
      setFormData({ name: device.name || "", ip_address: device.ip_address || "", port: device.port || 80, description: device.description || "", group_id: device.group_id || "" });
    } else {
      setFormData({ name: "", ip_address: "", port: 80, description: "", group_id: "" });
    }
  }, [device, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ip_address || !formData.port) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }
    setSaving(true);
    await onSave({ ...formData, group_id: formData.group_id || null }, device?.id);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="device-form-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{device ? "Editar Dispositivo" : "Agregar Dispositivo"}</DialogTitle>
          <DialogDescription>Ingresa los datos del dispositivo</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input data-testid="device-name-input" placeholder="Servidor Web" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>IP Pública *</Label>
              <Input data-testid="device-ip-input" placeholder="192.168.1.1" className="font-mono" value={formData.ip_address} onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Puerto *</Label>
              <Input data-testid="device-port-input" type="number" placeholder="80" className="font-mono" value={formData.port} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 80 })} />
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select value={formData.group_id} onValueChange={(v) => setFormData({ ...formData, group_id: v })}>
                <SelectTrigger data-testid="device-group-select"><SelectValue placeholder="Sin grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin grupo</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input data-testid="device-description-input" placeholder="Descripción opcional" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
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

const GroupFormDialog = ({ open, onOpenChange, group, onSave }) => {
  const [formData, setFormData] = useState({ name: "", description: "", color: "#3b82f6" });
  const [saving, setSaving] = useState(false);
  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  useEffect(() => {
    if (group) {
      setFormData({ name: group.name || "", description: group.description || "", color: group.color || "#3b82f6" });
    } else {
      setFormData({ name: "", description: "", color: "#3b82f6" });
    }
  }, [group, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    await onSave(formData, group?.id);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? "Editar Grupo" : "Crear Grupo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input data-testid="group-name-input" placeholder="Servidores Producción" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input placeholder="Descripción opcional" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button data-testid="save-group-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UserFormDialog = ({ open, onOpenChange, user, onSave }) => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "", role: "viewer", full_name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ username: user.username || "", email: user.email || "", password: "", role: user.role || "viewer", full_name: user.full_name || "" });
    } else {
      setFormData({ username: "", email: "", password: "", role: "viewer", full_name: "" });
    }
  }, [user, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || (!user && !formData.password)) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    setSaving(true);
    await onSave(formData, user?.id);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuario *</Label>
              <Input data-testid="user-username-input" placeholder="usuario" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={!!user} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input data-testid="user-email-input" type="email" placeholder="usuario@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            {!user && (
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <Input data-testid="user-password-input" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input placeholder="Juan Pérez" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button data-testid="save-user-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
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
        <ScrollArea className="h-[400px] pr-4">
          {history.length === 0 ? (
            <div className="empty-state py-12"><Activity className="w-12 h-12 mb-4 opacity-20" /><p>No hay historial</p></div>
          ) : (
            <div className="space-y-2">
              {history.map((entry, i) => (
                <div key={entry.id || i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <StatusDot status={entry.status} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} />
                      {entry.response_time_ms && <span className="text-xs text-muted-foreground font-mono">{entry.response_time_ms.toFixed(0)}ms</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className={entry.ping_success ? "text-green-600" : "text-red-500"}>Ping {entry.ping_success ? "✓" : "✗"}</span>
                    <span className={entry.port_success ? "text-green-600" : "text-red-500"}>Puerto {entry.port_success ? "✓" : "✗"}</span>
                  </div>
                </div>
              ))}
            </div>
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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="w-5 h-5" />{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button data-testid="confirm-delete-btn" variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Eliminando..." : "Eliminar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ PANELS ============

const UsersPanel = ({ users, onCreateUser, onEditUser, onDeleteUser, onResetPassword }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Gestión de Usuarios</CardTitle><CardDescription>Administra los usuarios del sistema</CardDescription></div>
        <Button data-testid="add-user-btn" size="sm" onClick={() => onCreateUser()}><Plus className="w-4 h-4 mr-2" />Nuevo Usuario</Button>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="empty-state py-8"><Users className="w-12 h-12 mb-4 opacity-20" /><p>No hay usuarios</p></div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="w-5 h-5 text-muted-foreground" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.username}</span>
                      <RoleBadge role={u.role} />
                      {!u.is_active && <Badge variant="outline" className="text-xs bg-red-50 text-red-600">Inactivo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onResetPassword(u.id)}><Lock className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onEditUser(u)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDeleteUser(u)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const GroupsPanel = ({ groups, onCreateGroup, onEditGroup, onDeleteGroup }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5" />Grupos</CardTitle><CardDescription>Organiza tus dispositivos</CardDescription></div>
        <Button data-testid="add-group-btn" size="sm" onClick={() => onCreateGroup()}><Plus className="w-4 h-4 mr-2" />Nuevo Grupo</Button>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="empty-state py-8"><FolderOpen className="w-12 h-12 mb-4 opacity-20" /><p>No hay grupos</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: g.color }} />
                    <div>
                      <h4 className="font-medium">{g.name}</h4>
                      {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                    </div>
                  </div>
                  <Badge variant="secondary">{g.device_count || 0} dispositivos</Badge>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="ghost" size="sm" onClick={() => onEditGroup(g)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDeleteGroup(g)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AlertsPanel = ({ alerts }) => (
  <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Historial de Alertas</CardTitle></CardHeader>
    <CardContent>
      {alerts.length === 0 ? (
        <div className="empty-state py-8"><Bell className="w-12 h-12 mb-4 opacity-20" /><p>No hay alertas</p></div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className={`p-4 rounded-lg border ${a.alert_type === 'device_down' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {a.alert_type === 'device_down' ? <WifiOff className="w-4 h-4 text-red-600" /> : <Wifi className="w-4 h-4 text-green-600" />}
                    <span className={`font-medium ${a.alert_type === 'device_down' ? 'text-red-700' : 'text-green-700'}`}>{a.device_name}</span>
                  </div>
                  {a.email_sent && <Badge variant="outline" className="text-xs"><Mail className="w-3 h-3 mr-1" />Email enviado</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(a.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
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

  useEffect(() => {
    if (settings) setFormData({ alert_email: settings.alert_email || "", gmail_user: settings.gmail_user || "", gmail_app_password: "" });
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.alert_email || !formData.gmail_user || !formData.gmail_app_password) { toast.error("Completa todos los campos"); return; }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try { await authAxios.post("/settings/test-email"); toast.success("Email de prueba enviado"); } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
    setTesting(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Configuración de Email</CardTitle><CardDescription>Alertas por correo cuando un dispositivo se caiga</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2"><Label>Email para alertas</Label><Input data-testid="settings-alert-email" type="email" placeholder="alertas@empresa.com" value={formData.alert_email} onChange={(e) => setFormData({ ...formData, alert_email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Usuario Gmail</Label><Input data-testid="settings-gmail-user" type="email" placeholder="cuenta@gmail.com" value={formData.gmail_user} onChange={(e) => setFormData({ ...formData, gmail_user: e.target.value })} /></div>
          <div className="space-y-2"><Label>Contraseña de Aplicación</Label><Input data-testid="settings-gmail-password" type="password" placeholder="xxxx xxxx xxxx xxxx" value={formData.gmail_app_password} onChange={(e) => setFormData({ ...formData, gmail_app_password: e.target.value })} /><p className="text-xs text-muted-foreground">Genera en myaccount.google.com/apppasswords</p></div>
          <div className="flex gap-2 pt-4">
            <Button data-testid="save-settings-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            <Button type="button" variant="outline" onClick={handleTestEmail} disabled={testing || !settings?.gmail_user}><Send className="w-4 h-4 mr-2" />{testing ? "Enviando..." : "Probar Email"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i} className="server-card"><CardContent className="p-6"><div className="flex items-start gap-3"><Skeleton className="w-3 h-3 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24" /></div></div><Skeleton className="h-4 w-full mt-4" /><Separator className="my-4" /><div className="flex gap-2"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-8" /></div></CardContent></Card>
    ))}
  </div>
);

// ============ MAIN DASHBOARD ============

const Dashboard = () => {
  const { user, logout, authAxios } = useAuth();
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Dialogs
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedGroupEdit, setSelectedGroupEdit] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState({ type: "", item: null });

  const canEdit = user?.role === "admin" || user?.role === "manager";
  const isAdmin = user?.role === "admin";

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;

  const fetchAll = useCallback(async () => {
    try {
      const [devRes, grpRes, alertRes] = await Promise.all([
        authAxios.get("/devices"),
        authAxios.get("/groups"),
        authAxios.get("/alerts")
      ]);
      setDevices(devRes.data.devices || []);
      setGroups(grpRes.data.groups || []);
      setAlerts(alertRes.data.alerts || []);
      if (isAdmin) {
        const [usrRes, setRes] = await Promise.all([authAxios.get("/users"), authAxios.get("/settings")]);
        setUsers(usrRes.data.users || []);
        setSettings(setRes.data.settings);
      }
    } catch (e) { console.error(e); }
  }, [authAxios, isAdmin]);

  useEffect(() => {
    const init = async () => { setLoading(true); await fetchAll(); setLoading(false); };
    init();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try { await authAxios.post("/devices/check-all"); toast.success("Verificando todos los dispositivos..."); setTimeout(fetchAll, 3000); } catch (e) { toast.error("Error"); }
    setRefreshing(false);
  };

  const handleCheckDevice = async (deviceId) => {
    try { await authAxios.post(`/devices/${deviceId}/check`); toast.success("Verificación completada"); fetchAll(); } catch (e) { toast.error("Error"); }
  };

  const handleSaveDevice = async (data, deviceId) => {
    try {
      if (deviceId) { await authAxios.put(`/devices/${deviceId}`, data); toast.success("Dispositivo actualizado"); }
      else { await authAxios.post("/devices", data); toast.success("Dispositivo creado"); }
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
  };

  const handleSaveGroup = async (data, groupId) => {
    try {
      if (groupId) { await authAxios.put(`/groups/${groupId}`, data); toast.success("Grupo actualizado"); }
      else { await authAxios.post("/groups", data); toast.success("Grupo creado"); }
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
  };

  const handleSaveUser = async (data, userId) => {
    try {
      if (userId) { await authAxios.put(`/users/${userId}`, data); toast.success("Usuario actualizado"); }
      else { await authAxios.post("/users", data); toast.success("Usuario creado"); }
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
  };

  const handleDelete = async () => {
    try {
      const { type, item } = deleteTarget;
      if (type === "device") await authAxios.delete(`/devices/${item.id}`);
      else if (type === "group") await authAxios.delete(`/groups/${item.id}`);
      else if (type === "user") await authAxios.delete(`/users/${item.id}`);
      toast.success("Eliminado correctamente");
      fetchAll();
    } catch (e) { toast.error("Error al eliminar"); }
  };

  const handleResetPassword = async (userId) => {
    try { await authAxios.post(`/users/${userId}/reset-password`); toast.success("Contraseña restablecida a: password123"); } catch (e) { toast.error("Error"); }
  };

  const handleViewHistory = async (device) => {
    setSelectedDevice(device);
    try { const res = await authAxios.get(`/devices/${device.id}/history`); setDeviceHistory(res.data.history || []); setHistoryDialogOpen(true); } catch (e) { toast.error("Error"); }
  };

  const handleSaveSettings = async (data) => {
    try { await authAxios.post("/settings", data); toast.success("Configuración guardada"); fetchAll(); } catch (e) { toast.error("Error"); }
  };

  const filteredDevices = selectedGroup ? devices.filter(d => d.group_id === selectedGroup) : devices;

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="app-header">
        <div className="container mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="Siempria" className="h-10 object-contain" />
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold tracking-tight">Network Monitor</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="flex items-center gap-2"><div className="status-dot status-dot-online" /><span className="text-sm font-medium">{onlineCount}</span></div>
                <div className="flex items-center gap-2"><div className="status-dot status-dot-offline" /><span className="text-sm font-medium">{offlineCount}</span></div>
              </div>

              <Button data-testid="refresh-all-btn" variant="outline" size="sm" onClick={handleRefreshAll} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin-slow' : ''}`} />Verificar
              </Button>

              {canEdit && (
                <Button data-testid="add-device-btn" size="sm" onClick={() => { setSelectedDevice(null); setDeviceDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Agregar
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4" /></div>
                    <span className="hidden md:inline">{user?.username}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5"><p className="text-sm font-medium">{user?.full_name || user?.username}</p><p className="text-xs text-muted-foreground">{user?.email}</p></div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2"><RoleBadge role={user?.role} /></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive gap-2"><LogOut className="w-4 h-4" />Cerrar Sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto max-w-7xl px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger data-testid="tab-devices" value="devices" className="gap-2"><Server className="w-4 h-4" />Dispositivos</TabsTrigger>
            <TabsTrigger data-testid="tab-groups" value="groups" className="gap-2"><FolderOpen className="w-4 h-4" />Grupos</TabsTrigger>
            <TabsTrigger data-testid="tab-alerts" value="alerts" className="gap-2"><Bell className="w-4 h-4" />Alertas{alerts.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{alerts.length}</Badge>}</TabsTrigger>
            {isAdmin && <TabsTrigger data-testid="tab-users" value="users" className="gap-2"><Users className="w-4 h-4" />Usuarios</TabsTrigger>}
            {isAdmin && <TabsTrigger data-testid="tab-settings" value="settings" className="gap-2"><Settings className="w-4 h-4" />Configuración</TabsTrigger>}
          </TabsList>

          <TabsContent value="devices">
            {/* Group filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <Button variant={selectedGroup === null ? "default" : "outline"} size="sm" onClick={() => setSelectedGroup(null)}>Todos ({devices.length})</Button>
              {groups.map(g => (
                <Button key={g.id} variant={selectedGroup === g.id ? "default" : "outline"} size="sm" onClick={() => setSelectedGroup(g.id)} style={selectedGroup === g.id ? { backgroundColor: g.color } : { borderColor: g.color, color: g.color }}>
                  {g.name} ({g.device_count || 0})
                </Button>
              ))}
            </div>

            {loading ? <LoadingSkeleton /> : filteredDevices.length === 0 ? (
              <div className="empty-state py-16">
                <Server className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">No hay dispositivos</h3>
                {canEdit && <Button onClick={() => setDeviceDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Agregar Dispositivo</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDevices.map(d => (
                  <ServerCard key={d.id} device={d} group={groups.find(g => g.id === d.group_id)} onCheck={handleCheckDevice}
                    onEdit={(dev) => { setSelectedDevice(dev); setDeviceDialogOpen(true); }}
                    onDelete={(dev) => { setDeleteTarget({ type: "device", item: dev }); setDeleteDialogOpen(true); }}
                    onViewHistory={handleViewHistory} canEdit={canEdit} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups">
            <GroupsPanel groups={groups} onCreateGroup={() => { setSelectedGroupEdit(null); setGroupDialogOpen(true); }}
              onEditGroup={(g) => { setSelectedGroupEdit(g); setGroupDialogOpen(true); }}
              onDeleteGroup={(g) => { setDeleteTarget({ type: "group", item: g }); setDeleteDialogOpen(true); }} />
          </TabsContent>

          <TabsContent value="alerts"><AlertsPanel alerts={alerts} /></TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <UsersPanel users={users} onCreateUser={() => { setSelectedUser(null); setUserDialogOpen(true); }}
                onEditUser={(u) => { setSelectedUser(u); setUserDialogOpen(true); }}
                onDeleteUser={(u) => { setDeleteTarget({ type: "user", item: u }); setDeleteDialogOpen(true); }}
                onResetPassword={handleResetPassword} />
            </TabsContent>
          )}

          {isAdmin && <TabsContent value="settings"><SettingsPanel settings={settings} onSave={handleSaveSettings} /></TabsContent>}
        </Tabs>
      </main>

      {/* Dialogs */}
      <DeviceFormDialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen} device={selectedDevice} groups={groups} onSave={handleSaveDevice} />
      <GroupFormDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} group={selectedGroupEdit} onSave={handleSaveGroup} />
      <UserFormDialog open={userDialogOpen} onOpenChange={setUserDialogOpen} user={selectedUser} onSave={handleSaveUser} />
      <HistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} device={selectedDevice} history={deviceHistory} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Confirmar Eliminación"
        message={`¿Estás seguro de eliminar "${deleteTarget.item?.name || deleteTarget.item?.username}"?`} onConfirm={handleDelete} />
    </div>
  );
};

// ============ APP ============

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src={LOGO_URL} alt="Siempria" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
};

export default App;
