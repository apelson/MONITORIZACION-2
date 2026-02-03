/**
 * System Status Dashboard Component
 * Shows real-time status of backend, nginx, database and system resources
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Database, Globe, Cpu, HardDrive, Activity, 
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Wifi
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatusBadge = ({ status }) => {
  const configs = {
    running: { color: 'bg-emerald-500', icon: CheckCircle, text: 'Activo' },
    active: { color: 'bg-emerald-500', icon: CheckCircle, text: 'Activo' },
    connected: { color: 'bg-emerald-500', icon: CheckCircle, text: 'Conectado' },
    ok: { color: 'bg-emerald-500', icon: CheckCircle, text: 'OK' },
    inactive: { color: 'bg-red-500', icon: XCircle, text: 'Inactivo' },
    failed: { color: 'bg-red-500', icon: XCircle, text: 'Fallido' },
    error: { color: 'bg-red-500', icon: XCircle, text: 'Error' },
    degraded: { color: 'bg-amber-500', icon: AlertTriangle, text: 'Degradado' },
    unknown: { color: 'bg-gray-500', icon: AlertTriangle, text: 'Desconocido' }
  };
  
  const config = configs[status] || configs.unknown;
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.color} text-white flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
};

const ServiceCard = ({ title, icon: Icon, status, details, color = "cyan" }) => (
  <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-${color}-500/20`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
          </div>
          <span className="font-medium text-white">{title}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      {details && (
        <div className="text-sm text-slate-400 space-y-1">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
              <span className="text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const ResourceMeter = ({ label, value, max, unit, color = "cyan" }) => {
  const percent = max > 0 ? (value / max) * 100 : 0;
  const getColor = (p) => {
    if (p > 90) return 'bg-red-500';
    if (p > 75) return 'bg-amber-500';
    return `bg-${color}-500`;
  };
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{value} / {max} {unit}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(percent)} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-right text-xs text-slate-500">{percent.toFixed(1)}%</div>
    </div>
  );
};

const SystemStatusDashboard = ({ authAxios }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/system-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Error fetching status');
      
      const data = await response.json();
      setStatus(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading && !status) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 bg-slate-700" />
          <Skeleton className="h-10 w-32 bg-slate-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Estado del Sistema
          </h2>
          {lastUpdate && (
            <p className="text-sm text-slate-400 mt-1">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button 
          onClick={fetchStatus} 
          disabled={loading}
          variant="outline"
          className="border-slate-600 hover:bg-slate-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/50">
          <CardContent className="p-4 flex items-center gap-2 text-red-400">
            <XCircle className="w-5 h-5" />
            Error al obtener estado: {error}
          </CardContent>
        </Card>
      )}

      {status && (
        <>
          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ServiceCard
              title="Backend API"
              icon={Server}
              status={status.services?.backend?.status}
              details={{ puerto: status.services?.backend?.port }}
              color="cyan"
            />
            <ServiceCard
              title="Nginx"
              icon={Globe}
              status={status.services?.nginx?.status}
              details={status.services?.nginx?.note ? { nota: 'Dev env' } : { puerto: 443 }}
              color="green"
            />
            <ServiceCard
              title="MongoDB"
              icon={Database}
              status={status.database?.status}
              details={{
                colecciones: status.database?.collections,
                objetos: status.database?.objects?.toLocaleString()
              }}
              color="emerald"
            />
            <ServiceCard
              title="Dispositivos"
              icon={Wifi}
              status="ok"
              details={{
                total: status.application?.devices?.total,
                online: status.application?.devices?.online,
                offline: status.application?.devices?.offline
              }}
              color="blue"
            />
          </div>

          {/* System Resources */}
          {status.system && !status.system.error && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  Recursos del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* CPU */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Cpu className="w-4 h-4" />
                      <span>CPU</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {status.system.cpu_percent?.toFixed(1)}%
                    </div>
                    <Progress 
                      value={status.system.cpu_percent} 
                      className="h-2 bg-slate-700"
                    />
                  </div>

                  {/* Memory */}
                  {status.system.memory && (
                    <ResourceMeter
                      label="Memoria RAM"
                      value={status.system.memory.used_gb}
                      max={status.system.memory.total_gb}
                      unit="GB"
                      color="purple"
                    />
                  )}

                  {/* Disk */}
                  {status.system.disk && (
                    <ResourceMeter
                      label="Disco"
                      value={status.system.disk.used_gb}
                      max={status.system.disk.total_gb}
                      unit="GB"
                      color="amber"
                    />
                  )}
                </div>

                <div className="pt-2 border-t border-slate-700 text-sm text-slate-400">
                  <span className="mr-4">🖥️ {status.system.platform}</span>
                  <span>📍 {status.system.hostname}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Database Details */}
          {status.database && status.database.status === 'connected' && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  Base de Datos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-400">
                      {status.database.collections}
                    </div>
                    <div className="text-xs text-slate-400">Colecciones</div>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">
                      {status.database.objects?.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400">Documentos</div>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">
                      {status.database.size_mb} MB
                    </div>
                    <div className="text-xs text-slate-400">Tamaño</div>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">
                      {status.database.name}
                    </div>
                    <div className="text-xs text-slate-400">Nombre BD</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SystemStatusDashboard;
