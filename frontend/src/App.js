import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Server, 
  Plus, 
  RefreshCw, 
  Settings, 
  History, 
  Bell, 
  Trash2, 
  Edit, 
  Check, 
  X,
  Activity,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
  Mail,
  Send
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  
  return (
    <Badge variant="outline" className={`${config.className} text-xs font-medium px-2 py-0.5`}>
      {config.label}
    </Badge>
  );
};

const ServerCard = ({ device, onCheck, onEdit, onDelete, onViewHistory }) => {
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
        
        {device.description && (
          <p className="text-sm text-muted-foreground mt-3">{device.description}</p>
        )}
        
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {device.last_check 
              ? `Último check: ${new Date(device.last_check).toLocaleString()}`
              : "Sin verificar"}
          </span>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex items-center gap-2">
          <Button 
            data-testid={`check-device-${device.id}`}
            variant="outline" 
            size="sm" 
            onClick={handleCheck}
            disabled={isChecking}
            className="flex-1"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isChecking ? 'animate-spin-slow' : ''}`} />
            Verificar
          </Button>
          <Button 
            data-testid={`history-device-${device.id}`}
            variant="ghost" 
            size="sm"
            onClick={() => onViewHistory(device)}
          >
            <History className="w-4 h-4" />
          </Button>
          <Button 
            data-testid={`edit-device-${device.id}`}
            variant="ghost" 
            size="sm"
            onClick={() => onEdit(device)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            data-testid={`delete-device-${device.id}`}
            variant="ghost" 
            size="sm"
            onClick={() => onDelete(device)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const DeviceFormDialog = ({ open, onOpenChange, device, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    ip_address: "",
    port: 80,
    description: ""
  });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name || "",
        ip_address: device.ip_address || "",
        port: device.port || 80,
        description: device.description || ""
      });
    } else {
      setFormData({ name: "", ip_address: "", port: 80, description: "" });
    }
  }, [device, open]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ip_address || !formData.port) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }
    
    setSaving(true);
    await onSave(formData, device?.id);
    setSaving(false);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="device-form-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{device ? "Editar Dispositivo" : "Agregar Dispositivo"}</DialogTitle>
          <DialogDescription>
            {device ? "Modifica los datos del dispositivo" : "Ingresa los datos del dispositivo a monitorizar"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                data-testid="device-name-input"
                id="name"
                placeholder="Servidor Web Principal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip">IP Pública *</Label>
              <Input
                data-testid="device-ip-input"
                id="ip"
                placeholder="192.168.1.1"
                className="font-mono"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Puerto *</Label>
              <Input
                data-testid="device-port-input"
                id="port"
                type="number"
                placeholder="80"
                className="font-mono"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 80 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                data-testid="device-description-input"
                id="description"
                placeholder="Servidor de producción"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button data-testid="save-device-btn" type="submit" disabled={saving}>
              {saving ? "Guardando..." : (device ? "Guardar" : "Agregar")}
            </Button>
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
      <DialogContent data-testid="history-dialog" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial - {device.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {device.ip_address}:{device.port}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          {history.length === 0 ? (
            <div className="empty-state py-12">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p>No hay historial disponible</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry, index) => (
                <div 
                  key={entry.id || index} 
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <StatusDot status={entry.status} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} />
                      {entry.response_time_ms && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {entry.response_time_ms.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {entry.ping_success ? (
                      <span className="text-green-600">Ping ✓</span>
                    ) : (
                      <span className="text-red-500">Ping ✗</span>
                    )}
                    {entry.port_success ? (
                      <span className="text-green-600">Puerto ✓</span>
                    ) : (
                      <span className="text-red-500">Puerto ✗</span>
                    )}
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

const DeleteConfirmDialog = ({ open, onOpenChange, device, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  
  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm(device?.id);
    setDeleting(false);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="delete-confirm-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Eliminar Dispositivo
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar <strong>{device?.name}</strong>? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            data-testid="confirm-delete-btn"
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SettingsPanel = ({ settings, onSave }) => {
  const [formData, setFormData] = useState({
    alert_email: "",
    gmail_user: "",
    gmail_app_password: ""
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  useEffect(() => {
    if (settings) {
      setFormData({
        alert_email: settings.alert_email || "",
        gmail_user: settings.gmail_user || "",
        gmail_app_password: ""
      });
    }
  }, [settings]);
  
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.alert_email || !formData.gmail_user || !formData.gmail_app_password) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };
  
  const handleTestEmail = async () => {
    setTesting(true);
    try {
      await axios.post(`${API}/settings/test-email`);
      toast.success("Email de prueba enviado correctamente");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error enviando email de prueba");
    }
    setTesting(false);
  };
  
  return (
    <Card data-testid="settings-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Configuración de Alertas por Email
        </CardTitle>
        <CardDescription>
          Configura las credenciales de Gmail para recibir alertas cuando un dispositivo se caiga
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert_email">Email para recibir alertas</Label>
            <Input
              data-testid="settings-alert-email"
              id="alert_email"
              type="email"
              placeholder="tu@email.com"
              value={formData.alert_email}
              onChange={(e) => setFormData({ ...formData, alert_email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gmail_user">Usuario Gmail (remitente)</Label>
            <Input
              data-testid="settings-gmail-user"
              id="gmail_user"
              type="email"
              placeholder="cuenta@gmail.com"
              value={formData.gmail_user}
              onChange={(e) => setFormData({ ...formData, gmail_user: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gmail_password">Contraseña de Aplicación Gmail</Label>
            <Input
              data-testid="settings-gmail-password"
              id="gmail_password"
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={formData.gmail_app_password}
              onChange={(e) => setFormData({ ...formData, gmail_app_password: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Genera una contraseña de aplicación en myaccount.google.com/apppasswords
            </p>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button data-testid="save-settings-btn" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar Configuración"}
            </Button>
            <Button 
              data-testid="test-email-btn"
              type="button" 
              variant="outline" 
              onClick={handleTestEmail}
              disabled={testing || !settings?.gmail_user}
            >
              <Send className="w-4 h-4 mr-2" />
              {testing ? "Enviando..." : "Enviar Email de Prueba"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const AlertsPanel = ({ alerts }) => {
  return (
    <Card data-testid="alerts-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Historial de Alertas
        </CardTitle>
        <CardDescription>
          Alertas enviadas cuando los dispositivos cambian de estado
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="empty-state py-8">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p>No hay alertas registradas</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.alert_type === 'device_down' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {alert.alert_type === 'device_down' ? (
                        <WifiOff className="w-4 h-4 text-red-600" />
                      ) : (
                        <Wifi className="w-4 h-4 text-green-600" />
                      )}
                      <span className={`font-medium ${
                        alert.alert_type === 'device_down' ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {alert.device_name}
                      </span>
                    </div>
                    {alert.email_sent && (
                      <Badge variant="outline" className="text-xs">
                        <Mail className="w-3 h-3 mr-1" />
                        Email enviado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i} className="server-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Skeleton className="w-3 h-3 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full mt-4" />
          <Separator className="my-4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// ============ MAIN APP ============

function App() {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");
  
  // Dialogs
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceHistory, setDeviceHistory] = useState([]);
  
  // Stats
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  
  // ============ API CALLS ============
  
  const fetchDevices = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/devices`);
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Error cargando dispositivos");
    }
  }, []);
  
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/alerts`);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  }, []);
  
  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data.settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, []);
  
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchDevices(), fetchAlerts(), fetchSettings()]);
  }, [fetchDevices, fetchAlerts, fetchSettings]);
  
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchAll();
      setLoading(false);
    };
    init();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);
  
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API}/devices/check-all`);
      toast.success("Verificación de todos los dispositivos iniciada");
      setTimeout(fetchDevices, 3000); // Wait for checks to complete
    } catch (error) {
      toast.error("Error verificando dispositivos");
    }
    setRefreshing(false);
  };
  
  const handleCheckDevice = async (deviceId) => {
    try {
      await axios.post(`${API}/devices/${deviceId}/check`);
      toast.success("Verificación completada");
      fetchDevices();
    } catch (error) {
      toast.error("Error verificando dispositivo");
    }
  };
  
  const handleSaveDevice = async (data, deviceId) => {
    try {
      if (deviceId) {
        await axios.put(`${API}/devices/${deviceId}`, data);
        toast.success("Dispositivo actualizado");
      } else {
        await axios.post(`${API}/devices`, data);
        toast.success("Dispositivo agregado");
      }
      fetchDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error guardando dispositivo");
    }
  };
  
  const handleDeleteDevice = async (deviceId) => {
    try {
      await axios.delete(`${API}/devices/${deviceId}`);
      toast.success("Dispositivo eliminado");
      fetchDevices();
    } catch (error) {
      toast.error("Error eliminando dispositivo");
    }
  };
  
  const handleViewHistory = async (device) => {
    setSelectedDevice(device);
    try {
      const response = await axios.get(`${API}/devices/${device.id}/history`);
      setDeviceHistory(response.data.history || []);
      setHistoryDialogOpen(true);
    } catch (error) {
      toast.error("Error cargando historial");
    }
  };
  
  const handleSaveSettings = async (data) => {
    try {
      await axios.post(`${API}/settings`, data);
      toast.success("Configuración guardada");
      fetchSettings();
    } catch (error) {
      toast.error("Error guardando configuración");
    }
  };
  
  return (
    <div className="app-container">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="app-header">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight">Monitor de Equipos</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="flex items-center gap-2">
                  <div className="status-dot status-dot-online" />
                  <span className="text-sm font-medium">{onlineCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="status-dot status-dot-offline" />
                  <span className="text-sm font-medium">{offlineCount}</span>
                </div>
              </div>
              
              <Button 
                data-testid="refresh-all-btn"
                variant="outline" 
                size="sm"
                onClick={handleRefreshAll}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin-slow' : ''}`} />
                Verificar Todo
              </Button>
              
              <Button 
                data-testid="add-device-btn"
                size="sm"
                onClick={() => {
                  setSelectedDevice(null);
                  setDeviceDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger data-testid="tab-devices" value="devices" className="gap-2">
              <Server className="w-4 h-4" />
              Dispositivos
            </TabsTrigger>
            <TabsTrigger data-testid="tab-alerts" value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              Alertas
              {alerts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger data-testid="tab-settings" value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuración
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="devices">
            {loading ? (
              <LoadingSkeleton />
            ) : devices.length === 0 ? (
              <div className="empty-state py-16">
                <Server className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">No hay dispositivos</h3>
                <p className="text-muted-foreground mb-4">
                  Agrega tu primer dispositivo para comenzar a monitorizar
                </p>
                <Button onClick={() => setDeviceDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Dispositivo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {devices.map((device) => (
                  <ServerCard
                    key={device.id}
                    device={device}
                    onCheck={handleCheckDevice}
                    onEdit={(d) => {
                      setSelectedDevice(d);
                      setDeviceDialogOpen(true);
                    }}
                    onDelete={(d) => {
                      setSelectedDevice(d);
                      setDeleteDialogOpen(true);
                    }}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="alerts">
            <AlertsPanel alerts={alerts} />
          </TabsContent>
          
          <TabsContent value="settings">
            <SettingsPanel settings={settings} onSave={handleSaveSettings} />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Dialogs */}
      <DeviceFormDialog
        open={deviceDialogOpen}
        onOpenChange={setDeviceDialogOpen}
        device={selectedDevice}
        onSave={handleSaveDevice}
      />
      
      <HistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        device={selectedDevice}
        history={deviceHistory}
      />
      
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        device={selectedDevice}
        onConfirm={handleDeleteDevice}
      />
    </div>
  );
}

export default App;
