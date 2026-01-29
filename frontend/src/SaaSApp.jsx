import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import { 
  Building2, Users, Monitor, Shield, Zap, Check, X, ArrowRight, 
  Eye, EyeOff, Mail, Lock, Building, ChevronRight, Star, 
  BarChart3, Bell, Clock, Globe, CreditCard, Loader2,
  Menu, LogOut, Settings, Home, PlusCircle, Trash2, Edit,
  TrendingUp, Activity, Server, Wifi, WifiOff, RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api/saas` : '/api/saas';

// Siempria Brand Assets
const SIEMPRIA_LOGO = "https://www.siempria.com/wp-content/uploads/2018/04/horizontal-gris225-blanco.png";
const SIEMPRIA_LOGO_WHITE = "https://www.siempria.com/wp-content/uploads/2018/04/horizontal-blanco225-blanco.png";
const SIEMPRIA_ICON = "/icons/icon-192x192.png";

// ============ AUTH CONTEXT ============
const SaaSAuthContext = createContext(null);

const useSaaSAuth = () => {
  const context = useContext(SaaSAuthContext);
  if (!context) throw new Error('useSaaSAuth must be used within SaaSAuthProvider');
  return context;
};

const SaaSAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [limits, setLimits] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('saas_token'));
  const [loading, setLoading] = useState(true);

  const authAxios = React.useMemo(() => {
    const instance = axios.create({ baseURL: API });
    instance.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('saas_token');
      if (currentToken) config.headers.Authorization = `Bearer ${currentToken}`;
      return config;
    });
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('saas_token');
          setToken(null);
          setUser(null);
          setTenant(null);
        }
        return Promise.reject(error);
      }
    );
    return instance;
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await authAxios.get('/me');
        setUser(res.data.user);
        setTenant(res.data.tenant);
        setLimits(res.data.limits);
      } catch (e) {
        localStorage.removeItem('saas_token');
        setToken(null);
      }
      setLoading(false);
    };
    verifyToken();
  }, [token, authAxios]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/login`, { email, password });
    localStorage.setItem('saas_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    setTenant(res.data.tenant);
    setLimits(res.data.limits);
    return res.data;
  };

  const register = async (companyName, email, password) => {
    const res = await axios.post(`${API}/register`, { 
      company_name: companyName, 
      email, 
      password 
    });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('saas_token');
    setToken(null);
    setUser(null);
    setTenant(null);
    setLimits(null);
  };

  return (
    <SaaSAuthContext.Provider value={{ user, tenant, limits, token, login, register, logout, loading, authAxios }}>
      {children}
    </SaaSAuthContext.Provider>
  );
};

// ============ LANDING PAGE ============
const LandingPage = ({ onShowAuth }) => {
  const plans = [
    {
      name: 'Free',
      price: '0€',
      period: '/siempre',
      description: 'Perfecto para probar',
      features: ['4 cámaras', '24 verificaciones/día', '7 días de historial', 'Soporte por email'],
      notIncluded: ['Alertas por email', 'Exportar datos', 'API access'],
      highlighted: false,
      cta: 'Empezar Gratis'
    },
    {
      name: 'Básico',
      price: '29€',
      period: '/mes',
      description: 'Para pequeñas empresas',
      features: ['50 dispositivos', '1440 verificaciones/día', '30 días de historial', 'Alertas por email', 'Exportar datos', '3 usuarios'],
      notIncluded: ['API access', 'Dashboard público'],
      highlighted: false,
      cta: 'Comenzar'
    },
    {
      name: 'Pro',
      price: '79€',
      period: '/mes',
      description: 'Para empresas en crecimiento',
      features: ['200 dispositivos', 'Verificaciones ilimitadas', '90 días de historial', 'Alertas email + WhatsApp', 'API access', 'Dashboard público', '10 usuarios'],
      notIncluded: [],
      highlighted: true,
      cta: 'Más Popular'
    },
    {
      name: 'Enterprise',
      price: 'Contactar',
      period: '',
      description: 'Solución personalizada',
      features: ['Dispositivos ilimitados', 'Todo ilimitado', '1 año de historial', 'Soporte prioritario 24/7', 'Instalación on-premise', 'SLA garantizado'],
      notIncluded: [],
      highlighted: false,
      cta: 'Contactar'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={SIEMPRIA_LOGO_WHITE} alt="Siempria" className="h-8 md:h-10" />
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition">Características</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition">Precios</a>
            <a href="https://www.siempria.com/contacto/" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition">Contacto</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => onShowAuth('login')} className="px-4 py-2 text-slate-300 hover:text-white transition">
              Iniciar Sesión
            </button>
            <button onClick={() => onShowAuth('register')} className="px-5 py-2 bg-[#00AEEF] text-white rounded-lg font-medium hover:bg-[#00C0F0] transition">
              Prueba Gratis
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            Monitorización profesional en la nube
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Monitoriza tu infraestructura<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">desde cualquier lugar</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Controla cámaras, servidores y dispositivos de red en tiempo real. 
            Alertas instantáneas, estadísticas detalladas y acceso desde cualquier dispositivo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => onShowAuth('register')} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold text-lg hover:from-cyan-400 hover:to-blue-400 transition flex items-center gap-2 shadow-lg shadow-cyan-500/25">
              Comenzar Gratis <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-slate-800 text-white rounded-xl font-semibold text-lg hover:bg-slate-700 transition border border-slate-700">
              Ver Demo
            </button>
          </div>
          <p className="text-slate-500 mt-4 text-sm">Sin tarjeta de crédito · 4 cámaras gratis para siempre</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">Todo lo que necesitas</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Una plataforma completa para monitorizar tu infraestructura de red y seguridad
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Monitor, title: 'Multi-dispositivo', desc: 'Cámaras IP, NVRs, switches, routers, servidores y más' },
              { icon: Bell, title: 'Alertas Instantáneas', desc: 'Notificaciones por email, WhatsApp y push cuando algo falla' },
              { icon: BarChart3, title: 'Estadísticas', desc: 'Uptime, histórico de estados y reportes detallados' },
              { icon: Shield, title: 'Seguridad', desc: 'Conexiones cifradas, autenticación robusta y logs de acceso' },
              { icon: Globe, title: 'Acceso Global', desc: 'Monitoriza desde cualquier lugar con nuestra PWA' },
              { icon: Clock, title: '24/7 Automático', desc: 'Verificación continua sin intervención manual' }
            ].map((f, i) => (
              <div key={i} className="p-6 bg-slate-800 rounded-2xl border border-slate-700 hover:border-cyan-500/50 transition group">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition">
                  <f.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">Planes y Precios</h2>
          <p className="text-slate-400 text-center mb-12">Elige el plan que mejor se adapte a tu negocio</p>
          <div className="grid md:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <div key={i} className={`relative p-6 rounded-2xl border ${plan.highlighted ? 'bg-gradient-to-b from-cyan-500/10 to-blue-500/10 border-cyan-500' : 'bg-slate-800 border-slate-700'}`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> MÁS POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <button 
                  onClick={() => onShowAuth('register')}
                  className={`w-full py-3 rounded-lg font-medium transition mb-6 ${plan.highlighted ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                >
                  {plan.cta}
                </button>
                <ul className="space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-500">
                      <X className="w-4 h-4 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">¿Listo para empezar?</h2>
          <p className="text-slate-400 mb-8">Crea tu cuenta gratis y empieza a monitorizar en menos de 2 minutos</p>
          <button onClick={() => onShowAuth('register')} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold text-lg hover:from-cyan-400 hover:to-blue-400 transition shadow-lg shadow-cyan-500/25">
            Crear Cuenta Gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-6 h-6 text-cyan-400" />
            <span className="font-semibold text-white">SiempriaApp</span>
          </div>
          <p className="text-slate-500 text-sm">© 2024 Siempria - Distribuidor Autorizado Mobotix</p>
          <div className="flex items-center gap-6 text-slate-400 text-sm">
            <a href="#" className="hover:text-white transition">Privacidad</a>
            <a href="#" className="hover:text-white transition">Términos</a>
            <a href="#" className="hover:text-white transition">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============ AUTH MODAL ============
const AuthModal = ({ mode, onClose, onModeChange }) => {
  const { login, register } = useSaaSAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ companyName: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(formData.companyName, formData.email, formData.password);
        toast.success('¡Cuenta creada! Iniciando sesión...');
        await login(formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
        toast.success('¡Bienvenido!');
      }
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al procesar');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 p-8" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {mode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p className="text-slate-400 mt-2">
            {mode === 'register' ? 'Empieza gratis con 4 cámaras' : 'Accede a tu panel de control'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Nombre de la empresa</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Mi Empresa S.L."
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full pl-10 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {mode === 'register' ? 'Crear Cuenta Gratis' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          {mode === 'register' ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button onClick={() => onModeChange(mode === 'register' ? 'login' : 'register')} className="text-cyan-400 hover:text-cyan-300 ml-1 font-medium">
            {mode === 'register' ? 'Iniciar sesión' : 'Regístrate gratis'}
          </button>
        </p>
      </div>
    </div>
  );
};

// ============ TENANT DASHBOARD ============
const TenantDashboard = () => {
  const { user, tenant, limits, logout, authAxios } = useSaaSAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);

  const fetchDevices = async () => {
    try {
      const res = await authAxios.get('/devices');
      setDevices(res.data.devices || []);
    } catch (e) {
      toast.error('Error al cargar dispositivos');
    }
    setLoading(false);
  };

  useEffect(() => { fetchDevices(); }, [authAxios]);

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;

  const handleAddDevice = async (deviceData) => {
    try {
      await authAxios.post('/devices', deviceData);
      toast.success('Dispositivo añadido');
      fetchDevices();
      setShowAddDevice(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al añadir dispositivo');
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('¿Eliminar este dispositivo?')) return;
    try {
      await authAxios.delete(`/devices/${id}`);
      toast.success('Dispositivo eliminado');
      fetchDevices();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const handleCheckDevice = async (id) => {
    try {
      const res = await authAxios.post(`/devices/${id}/check`);
      toast.success(`Estado: ${res.data.status}`);
      fetchDevices();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al verificar');
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      const originUrl = window.location.origin;
      const res = await authAxios.post('/billing/checkout', {
        plan_id: planId,
        origin_url: originUrl
      });
      // Redirect to Stripe checkout
      window.location.href = res.data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al procesar');
    }
  };

  // Check for payment status on return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const paymentStatus = params.get('payment');
    
    if (sessionId && paymentStatus === 'success') {
      // Poll payment status
      const pollStatus = async () => {
        try {
          const res = await authAxios.get(`/billing/checkout/status/${sessionId}`);
          if (res.data.status === 'complete') {
            toast.success(res.data.message);
            // Clear URL params and reload to get new limits
            window.history.replaceState({}, '', '/saas');
            window.location.reload();
          } else if (res.data.status === 'expired') {
            toast.error('La sesión de pago ha expirado');
          }
        } catch (e) {
          console.error(e);
        }
      };
      pollStatus();
    } else if (paymentStatus === 'cancelled') {
      toast.info('Pago cancelado');
      window.history.replaceState({}, '', '/saas');
    }
  }, [authAxios]);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">{tenant?.name}</span>
              <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full uppercase">{tenant?.plan}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden md:block">{user?.email}</span>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-white transition" title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between">
              <Server className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold text-white">{devices.length}/{limits?.max_devices}</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">Dispositivos</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between">
              <Wifi className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-green-400">{onlineCount}</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">Online</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between">
              <WifiOff className="w-8 h-8 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{offlineCount}</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">Offline</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between">
              <Activity className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold text-white">{devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0}%</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">Uptime</p>
          </div>
        </div>

        {/* Plan Limits Warning */}
        {devices.length >= limits?.max_devices && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-200">Has alcanzado el límite de tu plan ({limits?.max_devices} dispositivos)</span>
            </div>
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition"
            >
              Actualizar Plan
            </button>
          </div>
        )}

        {/* Devices */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Dispositivos</h2>
            <button 
              onClick={() => setShowAddDevice(true)}
              disabled={devices.length >= limits?.max_devices}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Añadir
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            </div>
          ) : devices.length === 0 ? (
            <div className="p-12 text-center">
              <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No hay dispositivos configurados</p>
              <button onClick={() => setShowAddDevice(true)} className="mt-4 text-cyan-400 hover:text-cyan-300">
                Añadir tu primer dispositivo →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {devices.map(device => (
                <div key={device.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${device.status === 'online' ? 'bg-green-400' : device.status === 'offline' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                    <div>
                      <p className="text-white font-medium">{device.name}</p>
                      <p className="text-slate-400 text-sm">{device.ip_address}:{device.port}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCheckDevice(device.id)} className="p-2 text-slate-400 hover:text-cyan-400 transition" title="Verificar ahora">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteDevice(device.id)} className="p-2 text-slate-400 hover:text-red-400 transition" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <AddDeviceModal onClose={() => setShowAddDevice(false)} onSubmit={handleAddDevice} />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal 
          currentPlan={tenant?.plan} 
          onClose={() => setShowUpgradeModal(false)} 
          onUpgrade={handleUpgrade} 
        />
      )}
    </div>
  );
};

// ============ UPGRADE MODAL ============
const UpgradeModal = ({ currentPlan, onClose, onUpgrade }) => {
  const [loading, setLoading] = useState(null);
  
  const plans = [
    { id: 'basic', name: 'Básico', price: '29€', period: '/mes', devices: 50, users: 3, highlight: false },
    { id: 'pro', name: 'Pro', price: '79€', period: '/mes', devices: 200, users: 10, highlight: true },
    { id: 'enterprise', name: 'Enterprise', price: '299€', period: '/mes', devices: '∞', users: '∞', highlight: false }
  ];
  
  // Filter out current and lower plans
  const planOrder = ['free', 'basic', 'pro', 'enterprise'];
  const currentIdx = planOrder.indexOf(currentPlan || 'free');
  const availablePlans = plans.filter(p => planOrder.indexOf(p.id) > currentIdx);
  
  const handleSelect = async (planId) => {
    setLoading(planId);
    await onUpgrade(planId);
    setLoading(null);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl bg-slate-800 rounded-2xl border border-slate-700 p-8" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Actualizar Plan</h2>
          <p className="text-slate-400 mt-2">Elige el plan que mejor se adapte a tus necesidades</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {availablePlans.map(plan => (
            <div key={plan.id} className={`p-6 rounded-xl border ${plan.highlight ? 'bg-gradient-to-b from-cyan-500/10 to-blue-500/10 border-cyan-500' : 'bg-slate-900 border-slate-700'}`}>
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-2xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-slate-300">
                  <Check className="w-4 h-4 text-cyan-400" /> {plan.devices} dispositivos
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <Check className="w-4 h-4 text-cyan-400" /> {plan.users} usuarios
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <Check className="w-4 h-4 text-cyan-400" /> Alertas por email
                </li>
                {plan.id !== 'basic' && (
                  <li className="flex items-center gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-cyan-400" /> API access
                  </li>
                )}
              </ul>
              <button
                onClick={() => handleSelect(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  plan.highlight 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400' 
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                } disabled:opacity-50`}
              >
                {loading === plan.id ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading === plan.id ? 'Procesando...' : 'Seleccionar'}
              </button>
            </div>
          ))}
        </div>
        
        <p className="text-center text-slate-500 text-sm mt-6">
          Pago seguro con Stripe. Puedes cancelar en cualquier momento.
        </p>
        
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-slate-400 hover:text-white transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ============ ADD DEVICE MODAL ============
const AddDeviceModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    port: 80,
    device_type_id: 'type-camera'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-6">Añadir Dispositivo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Nombre</label>
            <input
              type="text"
              required
              placeholder="Cámara Entrada"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-slate-400 mb-2">Dirección IP</label>
              <input
                type="text"
                required
                placeholder="192.168.1.100"
                value={formData.ip_address}
                onChange={e => setFormData({...formData, ip_address: e.target.value})}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Puerto</label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={e => setFormData({...formData, port: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tipo</label>
            <select
              value={formData.device_type_id}
              onChange={e => setFormData({...formData, device_type_id: e.target.value})}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="type-camera">Cámara</option>
              <option value="type-nvr">NVR</option>
              <option value="type-switch">Switch</option>
              <option value="type-router">Router</option>
              <option value="type-server">Servidor</option>
              <option value="type-other">Otro</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Añadir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ MAIN APP ============
const SaaSApp = () => {
  const { user, loading } = useSaaSAuth();
  const [authMode, setAuthMode] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <TenantDashboard />;
  }

  return (
    <>
      <LandingPage onShowAuth={setAuthMode} />
      {authMode && (
        <AuthModal 
          mode={authMode} 
          onClose={() => setAuthMode(null)} 
          onModeChange={setAuthMode}
        />
      )}
    </>
  );
};

// ============ EXPORT ============
const SiempriaAppSaaS = () => (
  <SaaSAuthProvider>
    <Toaster position="top-right" richColors />
    <SaaSApp />
  </SaaSAuthProvider>
);

export default SiempriaAppSaaS;
