/**
 * AlertsPanel - Panel de alertas con filtros, analíticas y exportación
 * Extraído de App.js para mejor mantenibilidad
 */
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bell, WifiOff, Wifi, Database, AlertTriangle, HardDrive, VideoOff,
  Calendar, Building2, Users, Download, BarChart3, Mail, ClipboardList, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const AlertsPanel = ({ alerts, organizations = [], devices = [], groups = [], onCreateIncident, authAxios }) => {
  const { t } = useTranslation();
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [incidentData, setIncidentData] = useState({ title: "", description: "", priority: "high" });
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [timeRange, setTimeRange] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Create device to group mapping
  const deviceGroupMap = useMemo(() => {
    const map = {};
    devices.forEach(d => {
      if (d.group_id) {
        map[d.id] = d.group_id;
      }
    });
    return map;
  }, [devices]);

  // Create group to organization mapping
  const groupOrgMap = useMemo(() => {
    const map = {};
    groups.forEach(g => {
      map[g.id] = g.organization_id;
    });
    return map;
  }, [groups]);

  // Get groups filtered by selected organization
  const filteredGroupsForOrg = useMemo(() => {
    if (selectedOrg === 'all') return groups;
    return groups.filter(g => g.organization_id === selectedOrg);
  }, [groups, selectedOrg]);

  // Filter alerts by organization, group, and time range
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const deviceGroupId = deviceGroupMap[a.device_id];
      
      if (selectedOrg !== 'all') {
        const deviceOrgId = deviceGroupId ? groupOrgMap[deviceGroupId] : null;
        if (deviceOrgId !== selectedOrg) return false;
      }
      
      if (selectedGroup !== 'all') {
        if (deviceGroupId !== selectedGroup) return false;
      }
      
      if (timeRange !== 'all') {
        const alertDate = new Date(a.timestamp);
        const now = new Date();
        
        if (timeRange === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (alertDate < today) return false;
        } else if (timeRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (alertDate < weekAgo) return false;
        } else if (timeRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (alertDate < monthAgo) return false;
        } else if (timeRange === 'year') {
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          if (alertDate < yearAgo) return false;
        } else if (timeRange === 'custom') {
          if (dateFrom) {
            const from = new Date(dateFrom);
            if (alertDate < from) return false;
          }
          if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (alertDate > to) return false;
          }
        }
      }
      
      return true;
    });
  }, [alerts, selectedOrg, selectedGroup, timeRange, dateFrom, dateTo, deviceGroupMap, groupOrgMap]);

  // Export alerts to CSV
  const exportToCSV = () => {
    const headers = ['Fecha', 'Hora', 'Dispositivo', 'IP', 'Tipo', 'Mensaje', 'Centro', 'Grupo'];
    
    const rows = filteredAlerts.map(a => {
      const date = new Date(a.timestamp);
      const deviceGroupId = deviceGroupMap[a.device_id];
      const groupName = groups.find(g => g.id === deviceGroupId)?.name || '';
      const orgId = deviceGroupId ? groupOrgMap[deviceGroupId] : null;
      const orgName = organizations.find(o => o.id === orgId)?.name || '';
      
      const typeLabels = {
        'device_down': 'Caída',
        'device_up': 'Recuperación',
        'nas_disconnected': 'NAS Desconectado',
        'nas_reconnected': 'NAS Reconectado',
        'storage_full': 'Almacenamiento Lleno',
        'recording_stopped': 'Grabación Detenida'
      };
      
      return [
        date.toLocaleDateString('es-ES'),
        date.toLocaleTimeString('es-ES'),
        a.device_name || '',
        a.device_ip || '',
        typeLabels[a.alert_type] || a.alert_type || '',
        a.message || '',
        orgName,
        groupName
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fileName = `alertas_${selectedOrg !== 'all' ? organizations.find(o => o.id === selectedOrg)?.name + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exportadas ${filteredAlerts.length} alertas`);
  };

  const handleOrgChange = (value) => {
    setSelectedOrg(value);
    setSelectedGroup('all');
  };

  // Calculate alert statistics
  const alertStats = useMemo(() => {
    const byType = filteredAlerts.reduce((acc, alert) => {
      const type = alert.alert_type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const byDate = filteredAlerts.reduce((acc, alert) => {
      const date = new Date(alert.timestamp).toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const typeLabels = {
      'device_down': 'Caídas',
      'device_up': 'Recuperaciones',
      'nas_disconnected': 'NAS Desc.',
      'nas_reconnected': 'NAS Rec.',
      'storage_full': 'Almacenamiento',
      'recording_stopped': 'Grabación'
    };

    const typeData = Object.entries(byType).map(([type, count]) => ({
      name: typeLabels[type] || type,
      value: count,
      type: type
    }));

    const dateData = Object.entries(byDate)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, alertas: count }));

    return { typeData, dateData, total: filteredAlerts.length };
  }, [filteredAlerts]);

  const handleCreateFromAlert = (alert) => {
    setSelectedAlert(alert);
    const alertTitles = {
      'device_down': '🔴 Caída',
      'device_up': '🟢 Recuperación',
      'nas_disconnected': '💾 NAS Desconectado',
      'nas_reconnected': '💾 NAS Reconectado',
      'storage_full': '💾 Almacenamiento Lleno',
      'recording_stopped': '🔴 Grabación Detenida'
    };
    const alertPriorities = {
      'device_down': 'high',
      'nas_disconnected': 'high',
      'storage_full': 'high',
      'recording_stopped': 'medium',
      'device_up': 'low',
      'nas_reconnected': 'low'
    };
    setIncidentData({
      title: `${alertTitles[alert.alert_type] || '⚠️ Alerta'}: ${alert.device_name}`,
      description: `${alert.message}\n\nFecha del evento: ${new Date(alert.timestamp).toLocaleString('es-ES')}\nIP: ${alert.device_ip || 'N/A'}`,
      priority: alertPriorities[alert.alert_type] || 'medium'
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

  // Alert styling config
  const getAlertStyle = (alertType) => {
    const alertStyles = {
      'device_down': { bg: 'bg-red-50 border-red-200', icon: WifiOff, iconColor: 'text-red-600', textColor: 'text-red-700', msg: t('alerts.deviceDisconnected', 'Dispositivo se ha desconectado') },
      'device_up': { bg: 'bg-green-50 border-green-200', icon: Wifi, iconColor: 'text-green-600', textColor: 'text-green-700', msg: t('alerts.deviceRecovered', 'Dispositivo se ha recuperado') },
      'nas_disconnected': { bg: 'bg-orange-50 border-orange-200', icon: Database, iconColor: 'text-orange-600', textColor: 'text-orange-700', msg: t('alerts.nasDisconnected', 'Conexión NAS perdida') },
      'nas_reconnected': { bg: 'bg-blue-50 border-blue-200', icon: Database, iconColor: 'text-blue-600', textColor: 'text-blue-700', msg: 'NAS reconectado' },
      'storage_full': { bg: 'bg-red-50 border-red-200', icon: HardDrive, iconColor: 'text-red-600', textColor: 'text-red-700', msg: 'Almacenamiento lleno' },
      'recording_stopped': { bg: 'bg-orange-50 border-orange-200', icon: VideoOff, iconColor: 'text-orange-600', textColor: 'text-orange-700', msg: 'Grabación detenida' }
    };
    return alertStyles[alertType] || { bg: 'bg-gray-50 border-gray-200', icon: AlertTriangle, iconColor: 'text-gray-600', textColor: 'text-gray-700', msg: '' };
  };

  const typeColors = {
    'device_down': '#ef4444',
    'device_up': '#22c55e',
    'nas_disconnected': '#f97316',
    'nas_reconnected': '#3b82f6',
    'storage_full': '#dc2626',
    'recording_stopped': '#fb923c'
  };

  return (
    <>
      <div className="space-y-4" data-testid="alerts-panel">
        {/* Month Stats Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">{t('alerts.thisMonth', 'Este Mes')}</p>
                  <p className="text-2xl font-bold text-blue-700">{filteredAlerts.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">{t('alerts.offline', 'Caídas')}</p>
                  <p className="text-2xl font-bold text-red-700">{filteredAlerts.filter(a => a.alert_type === 'device_down').length}</p>
                </div>
                <WifiOff className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">{t('alerts.recovered', 'Recuperadas')}</p>
                  <p className="text-2xl font-bold text-green-700">{filteredAlerts.filter(a => a.alert_type === 'device_up').length}</p>
                </div>
                <Wifi className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium">{t('alerts.nas', 'NAS')}</p>
                  <p className="text-2xl font-bold text-orange-700">{filteredAlerts.filter(a => a.alert_type?.includes('nas')).length}</p>
                </div>
                <Database className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* View Mode Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="alerts-view-list"
            >
              <Bell className="w-4 h-4 mr-2" />
              Lista
            </Button>
            <Button 
              variant={viewMode === 'analytics' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('analytics')}
              data-testid="alerts-view-analytics"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            {/* Organization Filter */}
            <Select value={selectedOrg} onValueChange={handleOrgChange}>
              <SelectTrigger className="w-[180px]" data-testid="alerts-org-filter">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Group Filter */}
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-[180px]" data-testid="alerts-group-filter">
                <Users className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {filteredGroupsForOrg.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Time Range Filter */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px]" data-testid="alerts-time-filter">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el tiempo</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
                <SelectItem value="year">Último año</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Export Button */}
            <Button variant="outline" size="sm" onClick={exportToCSV} data-testid="alerts-export-btn">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        {/* Custom Date Range */}
        {timeRange === 'custom' && (
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Desde:</label>
              <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Hasta:</label>
              <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm"
              />
            </div>
          </div>
        )}

        {/* Selected Filter Badges */}
        {(selectedOrg !== 'all' || selectedGroup !== 'all' || timeRange !== 'all') && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedOrg !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {organizations.find(o => o.id === selectedOrg)?.name || 'Centro'}
                <button onClick={() => handleOrgChange('all')} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {selectedGroup !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {groups.find(g => g.id === selectedGroup)?.name || 'Grupo'}
                <button onClick={() => setSelectedGroup('all')} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {timeRange !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {timeRange === 'today' ? 'Hoy' : 
                 timeRange === 'week' ? 'Última semana' : 
                 timeRange === 'month' ? 'Último mes' : 
                 timeRange === 'year' ? 'Último año' : 
                 timeRange === 'custom' ? `${dateFrom || '...'} - ${dateTo || '...'}` : timeRange}
                <button onClick={() => setTimeRange('all')} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {filteredAlerts.length} alertas
            </span>
          </div>
        )}

        {/* Analytics View */}
        {viewMode === 'analytics' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total de Alertas</CardTitle>
                <CardDescription>
                  {timeRange === 'all' ? 'Todo el tiempo' : 
                   timeRange === 'today' ? 'Hoy' :
                   timeRange === 'week' ? 'Última semana' : 
                   timeRange === 'month' ? 'Último mes' : 
                   timeRange === 'year' ? 'Último año' :
                   timeRange === 'custom' ? `${dateFrom || '...'} - ${dateTo || '...'}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">{alertStats.total}</div>
                <p className="text-sm text-muted-foreground mt-2">Alertas registradas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alertas por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {alertStats.typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={alertStats.typeData}
                        cx="50%"
                        cy="45%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {alertStats.typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={typeColors[entry.type] || '#6366f1'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry) => (
                          <span style={{ color: entry.color }}>{value}</span>
                        )}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    Sin datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Tendencia de Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                {alertStats.dateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={alertStats.dateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="alertas" fill="#0891b2" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sin datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* List View */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t('nav.alerts', 'Alertas')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <div className="empty-state py-8 text-center">
                  <Bell className="w-12 h-12 mb-4 opacity-20 mx-auto" />
                  <p>{t('alerts.noAlerts', 'No hay alertas')}</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredAlerts.map(a => {
                      const style = getAlertStyle(a.alert_type);
                      const IconComponent = style.icon;
                      return (
                        <div key={a.id} className={`p-4 rounded-lg border ${style.bg}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <IconComponent className={`w-4 h-4 ${style.iconColor}`} />
                              <span className={`font-medium ${style.textColor}`}>{a.device_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {a.email_sent && (
                                <Badge variant="outline" className="text-xs">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {t('alerts.sent', 'Enviado')}
                                </Badge>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={() => handleCreateFromAlert(a)}
                              >
                                <ClipboardList className="w-3 h-3 mr-1" />
                                {t('incidents.addIncident', 'Crear Incidencia')}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{style.msg || a.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{new Date(a.timestamp).toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Incident from Alert Dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              {t('incidents.createFromAlert', 'Crear Incidencia desde Alerta')}
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
            <Button variant="outline" onClick={() => setShowIncidentDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmitIncident} disabled={creating}>
              {creating ? t('common.creating', 'Creando...') : t('incidents.addIncident')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AlertsPanel;
