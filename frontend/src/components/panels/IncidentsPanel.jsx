/**
 * IncidentsPanel - Panel de gestión de incidencias
 * Extraído de App.js para mejor mantenibilidad
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, Plus, CheckCircle, Clock, XCircle, 
  Filter, ChevronDown, MessageSquare, User, Calendar,
  Edit, Trash2, MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_051d11b5-64eb-4eef-a44f-e7e0e5b16da5/artifacts/03lnmzfi_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";

const IncidentsPanel = ({ devices, authAxios }) => {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [formData, setFormData] = useState({
    title: "", description: "", device_id: "", priority: "medium", category: "network", status: "open"
  });
  
  const fetchIncidents = useCallback(async () => {
    try {
      const response = await authAxios.get("/incidents");
      setIncidents(response.data.incidents || []);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      toast.error("Error al cargar incidencias");
    }
    setLoading(false);
  }, [authAxios]);
  
  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);
  
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (statusFilter !== "all" && inc.status !== statusFilter) return false;
      if (priorityFilter !== "all" && inc.priority !== priorityFilter) return false;
      return true;
    });
  }, [incidents, statusFilter, priorityFilter]);
  
  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter(i => i.status === "open").length,
    in_progress: incidents.filter(i => i.status === "in_progress").length,
    resolved: incidents.filter(i => i.status === "resolved").length,
    closed: incidents.filter(i => i.status === "closed").length
  }), [incidents]);
  
  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Título y descripción son requeridos");
      return;
    }
    try {
      if (editingIncident) {
        await authAxios.put(`/incidents/${editingIncident.id}`, formData);
        toast.success("Incidencia actualizada");
      } else {
        await authAxios.post("/incidents", formData);
        toast.success("Incidencia creada");
      }
      fetchIncidents();
      setShowDialog(false);
      setEditingIncident(null);
      setFormData({ title: "", description: "", device_id: "", priority: "medium", category: "network", status: "open" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al guardar");
    }
  };
  
  const handleStatusChange = async (id, newStatus) => {
    try {
      await authAxios.put(`/incidents/${id}`, { status: newStatus });
      toast.success("Estado actualizado");
      fetchIncidents();
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta incidencia?")) return;
    try {
      await authAxios.delete(`/incidents/${id}`);
      toast.success("Incidencia eliminada");
      fetchIncidents();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };
  
  const getPriorityBadge = (priority) => {
    const styles = {
      critical: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-green-100 text-green-700"
    };
    const labels = { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" };
    return <Badge className={styles[priority]}>{labels[priority]}</Badge>;
  };
  
  const getStatusBadge = (status) => {
    const styles = {
      open: "bg-blue-100 text-blue-700",
      in_progress: "bg-yellow-100 text-yellow-700",
      resolved: "bg-green-100 text-green-700",
      closed: "bg-gray-100 text-gray-700"
    };
    const labels = { open: "Abierta", in_progress: "En Progreso", resolved: "Resuelta", closed: "Cerrada" };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <img src={LOGO_URL} alt="Siempria" className="absolute inset-0 m-auto w-10 h-10 object-contain" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">{t('incidents.loading', 'Cargando Incidencias')}</h3>
          <p className="text-sm text-muted-foreground">Obteniendo tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="incidents-panel">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-700">{stats.open}</p>
            <p className="text-xs text-cyan-600">Abiertas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.in_progress}</p>
            <p className="text-xs text-yellow-600">En Progreso</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
            <p className="text-xs text-green-600">Resueltas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.closed}</p>
            <p className="text-xs text-gray-600">Cerradas</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Actions Bar */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Abiertas</SelectItem>
              <SelectItem value="in_progress">En Progreso</SelectItem>
              <SelectItem value="resolved">Resueltas</SelectItem>
              <SelectItem value="closed">Cerradas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
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
        <Button onClick={() => { setEditingIncident(null); setFormData({ title: "", description: "", device_id: "", priority: "medium", category: "network" }); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Incidencia
        </Button>
      </div>
      
      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Incidencias ({filteredIncidents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No hay incidencias</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredIncidents.map(incident => (
                  <div key={incident.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{incident.title}</h4>
                          {getPriorityBadge(incident.priority)}
                          {getStatusBadge(incident.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(incident.created_at).toLocaleDateString()}</span>
                          {incident.device_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{incident.device_name}</span>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingIncident(incident); setFormData(incident); setShowDialog(true); }}>
                            <Edit className="w-4 h-4 mr-2" />Editar
                          </DropdownMenuItem>
                          {incident.status !== "resolved" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(incident.id, "resolved")}>
                              <CheckCircle className="w-4 h-4 mr-2" />Marcar Resuelta
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(incident.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIncident ? "Editar Incidencia" : "Nueva Incidencia"}</DialogTitle>
            <DialogDescription>Complete los detalles de la incidencia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Título de la incidencia" />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descripción detallada" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
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
              {editingIncident && (
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={formData.status || "open"} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Abierta</SelectItem>
                      <SelectItem value="in_progress">En Progreso</SelectItem>
                      <SelectItem value="resolved">Resuelta</SelectItem>
                      <SelectItem value="closed">Cerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Dispositivo</label>
                <Select value={formData.device_id || "none"} onValueChange={(v) => setFormData({ ...formData, device_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editingIncident ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncidentsPanel;
