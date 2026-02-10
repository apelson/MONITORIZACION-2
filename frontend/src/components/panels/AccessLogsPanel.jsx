/**
 * AccessLogsPanel - System access logs viewer with security alerts
 * Extracted from App.js for better maintainability
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  FileSearch, Download, Trash2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_051d11b5-64eb-4eef-a44f-e7e0e5b16da5/artifacts/03lnmzfi_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";

const AccessLogsPanel = ({ authAxios }) => {
  const { t } = useTranslation();
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
    } catch (e) {
      toast.error("Error al limpiar logs");
    }
  };

  const getLogTypeLabel = (type) => {
    const labels = {
      auth_login: t('logs.authLogin', 'Inicio sesión'),
      auth_logout: t('logs.authLogout', 'Cierre sesión'),
      auth_failed: t('logs.authFailed', 'Login fallido'),
      device_create: t('logs.deviceCreate', 'Crear dispositivo'),
      device_update: t('logs.deviceUpdate', 'Editar dispositivo'),
      device_delete: t('logs.deviceDelete', 'Eliminar dispositivo'),
      camera_view: t('logs.cameraView', 'Ver cámara'),
      camera_image: t('logs.cameraImage', 'Descargar imagen'),
      camera_stats: t('logs.cameraStats', 'Ver estadísticas'),
      org_create: t('logs.orgCreate', 'Crear organización'),
      org_update: t('logs.orgUpdate', 'Editar organización'),
      org_delete: t('logs.orgDelete', 'Eliminar organización'),
      group_create: t('logs.groupCreate', 'Crear grupo'),
      group_update: t('logs.groupUpdate', 'Editar grupo'),
      group_delete: t('logs.groupDelete', 'Eliminar grupo'),
      user_create: t('logs.userCreate', 'Crear usuario'),
      user_update: t('logs.userUpdate', 'Editar usuario'),
      user_delete: t('logs.userDelete', 'Eliminar usuario'),
      user_password: t('logs.userPassword', 'Cambiar contraseña'),
      settings_update: t('logs.settingsUpdate', 'Actualizar config'),
      backup_create: t('logs.backupCreate', 'Crear backup'),
      backup_restore: t('logs.backupRestore', 'Restaurar backup'),
      backup_download: t('logs.backupDownload', 'Descargar backup'),
      export_data: t('logs.exportData', 'Exportar datos')
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6" data-testid="access-logs-loading">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <img 
            src={LOGO_URL} 
            alt="Siempria" 
            className="absolute inset-0 m-auto w-10 h-10 object-contain"
          />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">{t('logs.loading', 'Cargando Logs')}</h3>
          <p className="text-sm text-muted-foreground">{t('logs.loadingDescription', 'Obteniendo registros del sistema...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="access-logs-panel">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 font-medium">{t('logs.totalEvents', 'Total (7 días)')}</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total_logs}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 font-medium">{t('logs.activeUsers', 'Usuarios Activos')}</p>
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
              {t('security.alertsLast24h', 'Alertas de Seguridad (últimas 24h)')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSecurity(!showSecurity)}
              className="text-red-700"
            >
              {showSecurity ? t('security.hideDetails', 'Ocultar detalles') : t('security.showDetails', 'Ver detalles')}
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
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")} data-testid="export-logs-csv">
                <Download className="w-4 h-4 mr-1" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleCleanup} data-testid="cleanup-logs-btn">
                <Trash2 className="w-4 h-4 mr-1" />{t('common.clear', 'Limpiar')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={filters.category} onValueChange={(v) => { setFilters({...filters, category: v === "all" ? "" : v}); setPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="logs-filter-category">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="auth">Autenticación</SelectItem>
                <SelectItem value="devices">Dispositivos</SelectItem>
                <SelectItem value="cameras">Cámaras</SelectItem>
                <SelectItem value="organizations">Organizaciones</SelectItem>
                <SelectItem value="users">{t('users.title', 'Usuarios')}</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Usuario..." 
              className="w-[140px]"
              value={filters.username}
              onChange={(e) => setFilters({...filters, username: e.target.value})}
              onKeyDown={(e) => e.key === "Enter" && (setPage(0), fetchLogs())}
              data-testid="logs-filter-username"
            />
            <Input 
              type="date" 
              className="w-[150px]"
              value={filters.start_date}
              onChange={(e) => { setFilters({...filters, start_date: e.target.value}); setPage(0); }}
              data-testid="logs-filter-start-date"
            />
            <Input 
              type="date" 
              className="w-[150px]"
              value={filters.end_date}
              onChange={(e) => { setFilters({...filters, end_date: e.target.value}); setPage(0); }}
              data-testid="logs-filter-end-date"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setFilters({ category: "", username: "", log_type: "", start_date: "", end_date: "" }); setPage(0); }}
              data-testid="logs-filter-reset"
            >
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
              <table className="w-full text-sm" data-testid="logs-table">
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
                  data-testid="logs-prev-page"
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  data-testid="logs-next-page"
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

export default AccessLogsPanel;
