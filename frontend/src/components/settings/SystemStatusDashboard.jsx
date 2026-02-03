/**
 * System Status Dashboard Component - Simple Version
 * Shows real-time status of backend, nginx, database and system resources
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Server, Database, Globe, Cpu, Activity, 
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Wifi
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatusBadge = ({ status }) => {
  const isOk = ['running', 'active', 'connected', 'ok'].includes(status);
  const isWarning = ['unknown', 'degraded'].includes(status);
  
  return (
    <Badge className={`${isOk ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-red-500'} text-white`}>
      {isOk ? <CheckCircle className="w-3 h-3 mr-1" /> : 
       isWarning ? <AlertTriangle className="w-3 h-3 mr-1" /> : 
       <XCircle className="w-3 h-3 mr-1" />}
      {isOk ? 'Activo' : isWarning ? 'Desconocido' : 'Error'}
    </Badge>
  );
};

const SystemStatusDashboard = ({ authAxios }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/system-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Update every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5 text-cyan-500" />
          Estado del Sistema
        </CardTitle>
        <Button onClick={fetchStatus} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </Button>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            <XCircle className="w-4 h-4 inline mr-2" />
            {error}
          </div>
        )}

        {status ? (
          <div className="space-y-4">
            {/* Services Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Server className="w-5 h-5 text-cyan-500" />
                  <StatusBadge status={status.services?.backend?.status} />
                </div>
                <div className="font-medium text-sm">Backend API</div>
                <div className="text-xs text-gray-500">Puerto {status.services?.backend?.port}</div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-5 h-5 text-green-500" />
                  <StatusBadge status={status.services?.nginx?.status} />
                </div>
                <div className="font-medium text-sm">Nginx</div>
                <div className="text-xs text-gray-500">Puerto 443</div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Database className="w-5 h-5 text-emerald-500" />
                  <StatusBadge status={status.database?.status} />
                </div>
                <div className="font-medium text-sm">MongoDB</div>
                <div className="text-xs text-gray-500">{status.database?.collections} colecciones</div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Wifi className="w-5 h-5 text-blue-500" />
                  <StatusBadge status="ok" />
                </div>
                <div className="font-medium text-sm">Dispositivos</div>
                <div className="text-xs text-gray-500">
                  {status.application?.devices?.online} online / {status.application?.devices?.total} total
                </div>
              </div>
            </div>

            {/* System Resources */}
            {status.system && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Recursos del Sistema</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{status.system.cpu_percent?.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">CPU</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{status.system.memory?.percent?.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">RAM ({status.system.memory?.used_gb?.toFixed(1)} GB)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{status.system.disk?.percent?.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">Disco ({status.system.disk?.used_gb?.toFixed(0)} GB)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Database Stats */}
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="p-2 bg-emerald-50 rounded">
                <div className="font-bold text-emerald-600">{status.database?.collections}</div>
                <div className="text-xs text-gray-500">Colecciones</div>
              </div>
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-bold text-blue-600">{status.database?.objects?.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Documentos</div>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <div className="font-bold text-purple-600">{status.database?.size_mb} MB</div>
                <div className="text-xs text-gray-500">Tamaño</div>
              </div>
              <div className="p-2 bg-gray-100 rounded">
                <div className="font-bold text-gray-600">{status.system?.platform}</div>
                <div className="text-xs text-gray-500">Sistema</div>
              </div>
            </div>
          </div>
        ) : !loading && !error ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Haz clic en "Actualizar" para ver el estado</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-cyan-500" />
            <p>Cargando estado del sistema...</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default SystemStatusDashboard;
