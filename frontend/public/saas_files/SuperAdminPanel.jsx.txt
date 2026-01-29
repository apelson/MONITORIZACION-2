import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import {
  Building2, Users, Monitor, Shield, BarChart3, Settings,
  Search, Filter, MoreVertical, Edit, Trash2, Ban, Check,
  ChevronDown, ChevronUp, RefreshCw, Download, Mail,
  TrendingUp, Activity, Server, DollarSign, Calendar,
  Eye, Loader2, LogOut, Home, PlusCircle, X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api/saas/admin` : '/api/saas/admin';
const AUTH_API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api/saas` : '/api/saas';

// ============ SUPER ADMIN PANEL ============
const SuperAdminPanel = () => {
  const [token, setToken] = useState(localStorage.getItem('saas_token'));
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState(null);

  const authAxios = React.useMemo(() => {
    const instance = axios.create();
    instance.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('saas_token');
      if (currentToken) config.headers.Authorization = `Bearer ${currentToken}`;
      return config;
    });
    return instance;
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        // Verify token and get user
        const userRes = await authAxios.get(`${AUTH_API}/me`);
        setUser(userRes.data.user);
        
        // Fetch tenants and stats
        const [tenantsRes, statsRes] = await Promise.all([
          authAxios.get(`${API}/tenants`),
          authAxios.get(`${API}/stats`)
        ]);
        setTenants(tenantsRes.data.tenants || []);
        setStats(statsRes.data);
      } catch (e) {
        console.error(e);
        if (e.response?.status === 403) {
          toast.error('Acceso denegado. Se requiere Super Admin.');
        }
      }
      setLoading(false);
    };
    init();
  }, [token, authAxios]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const res = await axios.post(`${AUTH_API}/login`, {
        email: form.get('email'),
        password: form.get('password')
      });
      localStorage.setItem('saas_token', res.data.token);
      setToken(res.data.token);
      toast.success('Sesión iniciada');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error de autenticación');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('saas_token');
    setToken(null);
    setUser(null);
  };

  const handleUpdatePlan = async (tenantId, newPlan) => {
    try {
      await authAxios.patch(`${API}/tenants/${tenantId}`, { plan: newPlan });
      toast.success('Plan actualizado');
      // Refresh
      const res = await authAxios.get(`${API}/tenants`);
      setTenants(res.data.tenants || []);
    } catch (e) {
      toast.error('Error al actualizar');
    }
  };

  const handleToggleActive = async (tenantId, currentActive) => {
    try {
      if (currentActive) {
        await authAxios.post(`${API}/tenants/${tenantId}/suspend`);
        toast.success('Cuenta suspendida');
      } else {
        await authAxios.post(`${API}/tenants/${tenantId}/activate`);
        toast.success('Cuenta activada');
      }
      const res = await authAxios.get(`${API}/tenants`);
      setTenants(res.data.tenants || []);
    } catch (e) {
      toast.error('Error al cambiar estado');
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || t.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Super Admin</h2>
            <p className="text-slate-400 mt-2">Panel de administración de la plataforma</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input name="email" type="email" required placeholder="Email" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none" />
            <input name="password" type="password" required placeholder="Contraseña" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none" />
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-semibold hover:from-purple-400 hover:to-indigo-400 transition">
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">Super Admin</span>
              <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">MASTER</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{user?.email}</span>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white transition">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center justify-between">
                <Building2 className="w-8 h-8 text-cyan-400" />
                <span className="text-2xl font-bold text-white">{stats.tenants?.total || 0}</span>
              </div>
              <p className="text-slate-400 text-sm mt-2">Total Clientes</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center justify-between">
                <Activity className="w-8 h-8 text-green-400" />
                <span className="text-2xl font-bold text-green-400">{stats.tenants?.active || 0}</span>
              </div>
              <p className="text-slate-400 text-sm mt-2">Activos</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center justify-between">
                <Users className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold text-white">{stats.users?.total || 0}</span>
              </div>
              <p className="text-slate-400 text-sm mt-2">Usuarios</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-8 h-8 text-yellow-400" />
                <span className="text-2xl font-bold text-yellow-400">{stats.tenants?.new_this_month || 0}</span>
              </div>
              <p className="text-slate-400 text-sm mt-2">Nuevos (mes)</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center justify-between">
                <DollarSign className="w-8 h-8 text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-400">{(stats.plans?.basic || 0) * 29 + (stats.plans?.pro || 0) * 79}€</span>
              </div>
              <p className="text-slate-400 text-sm mt-2">MRR Estimado</p>
            </div>
          </div>
        )}

        {/* Plan Distribution */}
        {stats?.plans && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Distribución por Plan</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(stats.plans).map(([plan, count]) => (
                <div key={plan} className="text-center">
                  <div className={`text-3xl font-bold ${
                    plan === 'free' ? 'text-slate-400' :
                    plan === 'basic' ? 'text-cyan-400' :
                    plan === 'pro' ? 'text-purple-400' : 'text-yellow-400'
                  }`}>{count}</div>
                  <div className="text-slate-500 text-sm capitalize">{plan}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tenants Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Clientes</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none w-64"
                />
              </div>
              <select
                value={filterPlan}
                onChange={e => setFilterPlan(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">Todos los planes</option>
                <option value="free">Free</option>
                <option value="basic">Básico</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Dispositivos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Registro</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredTenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-white font-medium">{tenant.name}</p>
                        <p className="text-slate-400 text-sm">{tenant.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={tenant.plan}
                        onChange={e => handleUpdatePlan(tenant.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${
                          tenant.plan === 'free' ? 'bg-slate-600 text-slate-200' :
                          tenant.plan === 'basic' ? 'bg-cyan-500/20 text-cyan-400' :
                          tenant.plan === 'pro' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        <option value="free">Free</option>
                        <option value="basic">Básico</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-white">{tenant.stats?.devices?.current || 0}</span>
                      <span className="text-slate-500"> / {tenant.stats?.devices?.max || '∞'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleActive(tenant.id, tenant.is_active)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          tenant.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {tenant.is_active ? 'Activo' : 'Suspendido'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-sm">
                      {new Date(tenant.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="p-2 text-slate-400 hover:text-white transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTenants.length === 0 && (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No se encontraron clientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <TenantDetailModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}

      <Toaster position="top-right" richColors />
    </div>
  );
};

// ============ TENANT DETAIL MODAL ============
const TenantDetailModal = ({ tenant, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{tenant.name}</h2>
            <p className="text-slate-400 text-sm">{tenant.email}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Plan</p>
              <p className="text-white font-medium capitalize">{tenant.plan}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Estado</p>
              <p className={`font-medium ${tenant.is_active ? 'text-green-400' : 'text-red-400'}`}>
                {tenant.is_active ? 'Activo' : 'Suspendido'}
              </p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Slug (DB)</p>
              <p className="text-white font-mono text-sm">{tenant.slug}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Registro</p>
              <p className="text-white">{new Date(tenant.created_at).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          {/* Stats */}
          {tenant.stats && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Uso</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-cyan-400">{tenant.stats.devices?.current || 0}</p>
                  <p className="text-slate-400 text-sm">Dispositivos</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{tenant.stats.devices?.online || 0}</p>
                  <p className="text-slate-400 text-sm">Online</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">{tenant.stats.users?.current || 0}</p>
                  <p className="text-slate-400 text-sm">Usuarios</p>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          {tenant.stats?.features && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Características</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(tenant.stats.features).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    {value ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <X className="w-4 h-4 text-slate-500" />
                    )}
                    <span className={value ? 'text-white' : 'text-slate-500'}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPanel;
