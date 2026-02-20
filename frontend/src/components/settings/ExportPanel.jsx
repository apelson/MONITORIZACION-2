/**
 * Export Panel - Advanced Export & Backup Configuration
 * Supports CSV, Excel, PDF, JSON, XML exports for all data types
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Download, FileSpreadsheet, FileText, FileJson, FileCode, Database,
  Server, Bell, ClipboardList, FileSearch, Users, Building2, Calendar,
  Loader2, CheckCircle, ChevronDown, ChevronUp, Filter, Clock, HardDrive,
  Archive, Settings2, Zap, RefreshCw, CloudDownload, FolderArchive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const ExportPanel = ({ authAxios, organizations = [] }) => {
  const [expanded, setExpanded] = useState(true);
  const [exporting, setExporting] = useState({});
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  // Backup settings
  const [backupConfig, setBackupConfig] = useState({
    frequency: 'daily',
    time: '03:00',
    retention: 30,
    location: 'local',
    email_notify: true,
    include_images: false,
    include_logs: true,
    enabled: false
  });
  const [savingBackupConfig, setSavingBackupConfig] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [runningBackup, setRunningBackup] = useState(false);

  // Export data types configuration
  const exportTypes = [
    {
      id: 'devices',
      name: 'Dispositivos',
      description: 'Lista completa de dispositivos con estado y configuración',
      icon: Server,
      color: 'cyan',
      formats: ['csv', 'excel', 'pdf', 'json', 'xml']
    },
    {
      id: 'alerts',
      name: 'Alertas',
      description: 'Historial de alertas y notificaciones del sistema',
      icon: Bell,
      color: 'amber',
      formats: ['csv', 'excel', 'pdf', 'json', 'xml']
    },
    {
      id: 'incidents',
      name: 'Incidencias',
      description: 'Registro de incidencias técnicas y resoluciones',
      icon: ClipboardList,
      color: 'red',
      formats: ['csv', 'excel', 'pdf', 'json', 'xml']
    },
    {
      id: 'logs',
      name: 'Logs de Acceso',
      description: 'Registro de actividad y accesos al sistema',
      icon: FileSearch,
      color: 'purple',
      formats: ['csv', 'excel', 'json', 'xml']
    },
    {
      id: 'users',
      name: 'Usuarios',
      description: 'Lista de usuarios y roles del sistema',
      icon: Users,
      color: 'blue',
      formats: ['csv', 'excel', 'pdf', 'json', 'xml']
    },
    {
      id: 'organizations',
      name: 'Organizaciones',
      description: 'Estructura organizativa y grupos',
      icon: Building2,
      color: 'green',
      formats: ['csv', 'excel', 'pdf', 'json', 'xml']
    }
  ];

  const formatIcons = {
    csv: FileText,
    excel: FileSpreadsheet,
    pdf: FileText,
    json: FileJson,
    xml: FileCode
  };

  const formatLabels = {
    csv: 'CSV',
    excel: 'Excel',
    pdf: 'PDF',
    json: 'JSON',
    xml: 'XML'
  };

  const formatColors = {
    csv: 'bg-green-100 text-green-700 hover:bg-green-200',
    excel: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    pdf: 'bg-red-100 text-red-700 hover:bg-red-200',
    json: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    xml: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
  };

  const handleExport = async (dataType, format) => {
    const exportKey = `${dataType}-${format}`;
    setExporting(prev => ({ ...prev, [exportKey]: true }));
    
    try {
      // Build query params
      let params = new URLSearchParams();
      if (selectedOrg !== 'all') {
        params.append('organization_id', selectedOrg);
      }
      if (dateRange === 'custom' && customDateFrom && customDateTo) {
        params.append('date_from', customDateFrom);
        params.append('date_to', customDateTo);
      } else if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        params.append('date_from', dateFrom.toISOString().split('T')[0]);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      // Determine endpoint based on data type
      let endpoint = `/export/${format}`;
      if (dataType !== 'devices') {
        endpoint = `/export/${dataType}/${format}`;
      }
      
      const response = await authAxios.get(`${endpoint}${queryString}`, { 
        responseType: 'blob' 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extensions = {
        csv: 'csv',
        excel: 'xlsx',
        pdf: 'pdf',
        json: 'json',
        xml: 'xml'
      };
      
      const filename = `${dataType}_${new Date().toISOString().slice(0,10)}.${extensions[format]}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${formatLabels[format]} exportado correctamente`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.detail || `Error al exportar ${formatLabels[format]}`);
    } finally {
      setExporting(prev => ({ ...prev, [exportKey]: false }));
    }
  };

  const handleExportAll = async (format) => {
    setExporting(prev => ({ ...prev, [`all-${format}`]: true }));
    
    try {
      let params = new URLSearchParams();
      if (selectedOrg !== 'all') {
        params.append('organization_id', selectedOrg);
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const response = await authAxios.get(`/export/complete/${format}${queryString}`, { 
        responseType: 'blob' 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extensions = { csv: 'zip', excel: 'xlsx', pdf: 'pdf', json: 'json', xml: 'xml' };
      link.setAttribute('download', `backup_completo_${new Date().toISOString().slice(0,10)}.${extensions[format]}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Exportación completa descargada');
    } catch (error) {
      toast.error('Error al exportar todos los datos');
    } finally {
      setExporting(prev => ({ ...prev, [`all-${format}`]: false }));
    }
  };

  const handleSaveBackupConfig = async () => {
    setSavingBackupConfig(true);
    try {
      await authAxios.post('/backup/config', backupConfig);
      toast.success('Configuración de backup guardada');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar configuración');
    } finally {
      setSavingBackupConfig(false);
    }
  };

  const handleRunBackupNow = async () => {
    setRunningBackup(true);
    try {
      const response = await authAxios.post('/backup/run');
      toast.success('Backup iniciado correctamente');
      setLastBackup(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al ejecutar backup');
    } finally {
      setRunningBackup(false);
    }
  };

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Exportación y Copias de Seguridad</CardTitle>
                  <CardDescription>
                    Exporta datos en múltiples formatos y configura backups automáticos
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-cyan-500 text-cyan-600">
                  {exportTypes.length} tipos de datos
                </Badge>
                {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            <Tabs defaultValue="export" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="export" className="gap-2">
                  <Download className="w-4 h-4" />
                  Exportar Datos
                </TabsTrigger>
                <TabsTrigger value="backup" className="gap-2">
                  <HardDrive className="w-4 h-4" />
                  Copias de Seguridad
                </TabsTrigger>
              </TabsList>

              {/* Export Tab */}
              <TabsContent value="export" className="space-y-6">
                {/* Filters */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Filtros de Exportación</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Organización</Label>
                      <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las organizaciones" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las organizaciones</SelectItem>
                          {organizations.map(org => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Rango de Fechas</Label>
                      <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo el historial</SelectItem>
                          <SelectItem value="7">Últimos 7 días</SelectItem>
                          <SelectItem value="30">Últimos 30 días</SelectItem>
                          <SelectItem value="90">Últimos 90 días</SelectItem>
                          <SelectItem value="365">Último año</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {dateRange === 'custom' && (
                      <div className="space-y-2 md:col-span-1">
                        <Label className="text-xs">Fechas</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="date" 
                            value={customDateFrom}
                            onChange={(e) => setCustomDateFrom(e.target.value)}
                            className="text-xs"
                          />
                          <Input 
                            type="date" 
                            value={customDateTo}
                            onChange={(e) => setCustomDateTo(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Export All */}
                <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <FolderArchive className="w-8 h-8 text-cyan-600" />
                      <div>
                        <h4 className="font-semibold">Exportación Completa</h4>
                        <p className="text-sm text-muted-foreground">Descarga todos los datos en un solo archivo</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['excel', 'json', 'xml'].map(format => {
                        const Icon = formatIcons[format];
                        const isLoading = exporting[`all-${format}`];
                        return (
                          <Button
                            key={format}
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportAll(format)}
                            disabled={isLoading}
                            className={cn("gap-2", formatColors[format])}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                            {formatLabels[format]}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Individual Export Types */}
                <div className="grid gap-4">
                  {exportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div 
                        key={type.id}
                        className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              type.color === 'cyan' && "bg-cyan-100 text-cyan-700",
                              type.color === 'amber' && "bg-amber-100 text-amber-700",
                              type.color === 'red' && "bg-red-100 text-red-700",
                              type.color === 'purple' && "bg-purple-100 text-purple-700",
                              type.color === 'blue' && "bg-blue-100 text-blue-700",
                              type.color === 'green' && "bg-green-100 text-green-700"
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium">{type.name}</h4>
                              <p className="text-sm text-muted-foreground">{type.description}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {type.formats.map(format => {
                              const FormatIcon = formatIcons[format];
                              const exportKey = `${type.id}-${format}`;
                              const isLoading = exporting[exportKey];
                              return (
                                <Button
                                  key={format}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExport(type.id, format)}
                                  disabled={isLoading}
                                  className={cn("gap-1.5 text-xs", formatColors[format])}
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <FormatIcon className="w-3 h-3" />
                                  )}
                                  {formatLabels[format]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Backup Tab */}
              <TabsContent value="backup" className="space-y-6">
                {/* Backup Status */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-3 rounded-lg",
                        backupConfig.enabled ? "bg-emerald-100" : "bg-slate-100"
                      )}>
                        <HardDrive className={cn(
                          "w-6 h-6",
                          backupConfig.enabled ? "text-emerald-600" : "text-slate-500"
                        )} />
                      </div>
                      <div>
                        <h4 className="font-semibold">Estado del Backup Automático</h4>
                        <p className="text-sm text-muted-foreground">
                          {backupConfig.enabled 
                            ? `Programado: ${backupConfig.frequency === 'hourly' ? 'Cada hora' : backupConfig.frequency === 'daily' ? 'Diario' : 'Semanal'} a las ${backupConfig.time}`
                            : 'Desactivado'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleRunBackupNow}
                        disabled={runningBackup}
                        className="gap-2"
                      >
                        {runningBackup ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        Ejecutar Ahora
                      </Button>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="backup-enabled" className="text-sm">Activar</Label>
                        <Switch
                          id="backup-enabled"
                          checked={backupConfig.enabled}
                          onCheckedChange={(checked) => setBackupConfig(prev => ({ ...prev, enabled: checked }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {lastBackup && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>Último backup: {new Date(lastBackup.created_at).toLocaleString()}</span>
                        <Badge variant="outline" className="ml-2">{lastBackup.size}</Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Backup Configuration */}
                <div className="space-y-6">
                  <Separator />
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Configuración de Backups
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Frecuencia</Label>
                        <Select 
                          value={backupConfig.frequency} 
                          onValueChange={(v) => setBackupConfig(prev => ({ ...prev, frequency: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Cada hora</SelectItem>
                            <SelectItem value="daily">Diario</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Hora de ejecución</Label>
                        <Input 
                          type="time"
                          value={backupConfig.time}
                          onChange={(e) => setBackupConfig(prev => ({ ...prev, time: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Retención (días)</Label>
                        <Select 
                          value={backupConfig.retention.toString()} 
                          onValueChange={(v) => setBackupConfig(prev => ({ ...prev, retention: parseInt(v) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 días</SelectItem>
                            <SelectItem value="14">14 días</SelectItem>
                            <SelectItem value="30">30 días</SelectItem>
                            <SelectItem value="60">60 días</SelectItem>
                            <SelectItem value="90">90 días</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Ubicación de almacenamiento</Label>
                        <Select 
                          value={backupConfig.location} 
                          onValueChange={(v) => setBackupConfig(prev => ({ ...prev, location: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Servidor Local</SelectItem>
                            <SelectItem value="s3">Amazon S3</SelectItem>
                            <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                            <SelectItem value="azure">Azure Blob Storage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Notificar por email</Label>
                            <p className="text-xs text-muted-foreground">Recibe confirmación de cada backup</p>
                          </div>
                          <Switch
                            checked={backupConfig.email_notify}
                            onCheckedChange={(checked) => setBackupConfig(prev => ({ ...prev, email_notify: checked }))}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Incluir imágenes</Label>
                            <p className="text-xs text-muted-foreground">Capturas y galería (aumenta tamaño)</p>
                          </div>
                          <Switch
                            checked={backupConfig.include_images}
                            onCheckedChange={(checked) => setBackupConfig(prev => ({ ...prev, include_images: checked }))}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Incluir logs</Label>
                            <p className="text-xs text-muted-foreground">Registros de actividad del sistema</p>
                          </div>
                          <Switch
                            checked={backupConfig.include_logs}
                            onCheckedChange={(checked) => setBackupConfig(prev => ({ ...prev, include_logs: checked }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleSaveBackupConfig}
                      disabled={savingBackupConfig}
                      className="gap-2"
                    >
                      {savingBackupConfig ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Guardar Configuración
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ExportPanel;
