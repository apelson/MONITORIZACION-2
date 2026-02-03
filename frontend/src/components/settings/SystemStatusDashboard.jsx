/**
 * System Status Dashboard Component
 * Shows real-time status of backend, nginx, database and system resources
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
    running: { color: 'bg-emerald-500', text: 'Activo' },
    active: { color: 'bg-emerald-500', text: 'Activo' },
    connected: { color: 'bg-emerald-500', text: 'Conectado' },
    ok: { color: 'bg-emerald-500', text: 'OK' },
    inactive: { color: 'bg-red-500', text: 'Inactivo' },
    failed: { color: 'bg-red-500', text: 'Fallido' },
    error: { color: 'bg-red-500', text: 'Error' },
    degraded: { color: 'bg-amber-500', text: 'Degradado' },
    unknown: { color: 'bg-gray-400', text: 'Desconocido' }
  };
  
  const config = configs[status] || configs.unknown;
  
  return (
    <Badge className={`${config.color} text-white`}>
      {status === 'running' || status === 'active' || status === 'connected' || status === 'ok' ? (
        <CheckCircle className="w-3 h-3 mr-1" />
      ) : status === 'unknown' || status === 'degraded' ? (
        <AlertTriangle className="w-3 h-3 mr-1" />
      ) : (
        <XCircle className="w-3 h-3 mr-1" />
      )}
      {config.text}
    </Badge>
  );
};

const ServiceCard = ({ title, icon: Icon, status, details, iconColor }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      {details && (
        <div className="text-sm text-gray-500 space-y-1">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
              <span className="text-gray-700 font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const ResourceBar = ({ label, value, max, unit, color }) => {
  const percent = max > 0 ? (value / max) * 100 : 0;
  const getBarColor = (p) => {
    if (p > 90) return 'bg-red-500';
    if (p > 75) return 'bg-amber-500';
    return color;
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">{value.toFixed(1)} / {max.toFixed(1)} {unit}</span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor(percent)} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="text-right text-xs text-gray-400">{percent.toFixed(1)}% usado</div>
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
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API}/system-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setStatus(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('SystemStatus error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Show loading skeleton only during initial load
  if (loading && !status && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" />
            Estado del Sistema
          </CardTitle>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button 
          onClick={fetchStatus} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {status && (
          <>
            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ServiceCard
                title="Backend API"
                icon={Server}
                status={status.services?.backend?.status}
                details={{ Puerto: status.services?.backend?.port }}
                iconColor="bg-cyan-500"
              />
              <ServiceCard
                title="Nginx"
                icon={Globe}
                status={status.services?.nginx?.status}
                details={status.services?.nginx?.note ? { Nota: 'Entorno dev' } : { Puerto: 443 }}
                iconColor="bg-green-500"
              />
              <ServiceCard
                title="MongoDB"
                icon={Database}
                status={status.database?.status}
                details={{
                  Colecciones: status.database?.collections,
                  Documentos: status.database?.objects?.toLocaleString()
                }}
                iconColor="bg-emerald-500"
              />
              <ServiceCard
                title="Dispositivos"
                icon={Wifi}
                status="ok"
                details={{
                  Total: status.application?.devices?.total,
                  Online: status.application?.devices?.online,
                  Offline: status.application?.devices?.offline
                }}
                iconColor="bg-blue-500"
              />
            </div>

            {/* System Resources */}
            {status.system && !status.system.error && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-500" />
                  Recursos del Sistema
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* CPU */}
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <Cpu className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <div className="text-3xl font-bold text-gray-900">
                      {status.system.cpu_percent?.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">CPU</div>
                  </div>

                  {/* Memory */}
                  {status.system.memory && (
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <ResourceBar
                        label="Memoria RAM"
                        value={status.system.memory.used_gb}
                        max={status.system.memory.total_gb}
                        unit="GB"
                        color="bg-purple-500"
                      />
                    </div>
                  )}

                  {/* Disk */}
                  {status.system.disk && (
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <ResourceBar
                        label="Disco"
                        value={status.system.disk.used_gb}
                        max={status.system.disk.total_gb}
                        unit="GB"
                        color="bg-amber-500"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t text-sm text-gray-500 flex gap-4">
                  <span>🖥️ {status.system.platform}</span>
                  <span>📍 {status.system.hostname}</span>
                </div>
              </div>
            )}

            {/* Database Stats */}
            {status.database && status.database.status === 'connected' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {status.database.collections}
                  </div>
                  <div className="text-xs text-gray-500">Colecciones</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {status.database.objects?.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Documentos</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {status.database.size_mb} MB
                  </div>
                  <div className="text-xs text-gray-500">Tamaño BD</div>
                </div>
                <div className="p-4 bg-cyan-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-cyan-600">
                    {status.database.name}
                  </div>
                  <div className="text-xs text-gray-500">Base de datos</div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemStatusDashboard;
