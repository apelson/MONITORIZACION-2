import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  LogIn, Lock, User, Eye, EyeOff, LogOut, RefreshCw, Users, BarChart3,
  Camera, Settings, TrendingUp, TrendingDown, Clock, Shield, Activity,
  ChevronUp, ChevronDown, Wifi, WifiOff, AlertCircle, MapPin, Hash
} from 'lucide-react';

const API = '/api';

// ==================== LOGIN PAGE ====================
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.01) % (Math.PI * 2)), 16);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Completa todos los campos'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = `hsl(${195 + Math.sin(phase) * 8}, 100%, ${52 + Math.sin(phase * 1.5) * 6}%)`;

  return (
    <div className="login-page" data-testid="login-page">
      {/* Background effects */}
      <div className="login-bg">
        <div className="login-grid" />
        <div className="login-glow" style={{ background: `radial-gradient(ellipse at center, ${accentColor}12 0%, transparent 65%)` }} />
        <div className="login-conic" style={{ background: `conic-gradient(from ${phase * 57}deg, transparent, ${accentColor}20, transparent, ${accentColor}10, transparent)` }} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${(i * 5.3) % 100}%`, top: `${(i * 7.1) % 100}%`,
            animationDelay: `${i * 0.3}s`, animationDuration: `${12 + (i % 5) * 3}s`,
            width: `${1.5 + (i % 3)}px`, height: `${1.5 + (i % 3)}px`,
          }} />
        ))}
      </div>
      {/* Corner decorations */}
      <div className="corner-deco tl" /><div className="corner-deco tr" />
      <div className="corner-deco bl" /><div className="corner-deco br" />

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo-wrap">
          <div className="login-logo-glow" style={{ borderColor: `${accentColor}40`, boxShadow: `0 0 30px ${accentColor}20` }} />
          <div className="login-logo-box" style={{ borderColor: `${accentColor}30` }}>
            <Activity size={40} color={accentColor} strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="login-title" data-testid="login-title">SIEMPRIA CONTEO</h1>
        <p className="login-subtitle">Sistema de Conteo de Visitas en Tiempo Real</p>
        <div className="login-badge">
          <Shield size={11} />
          <span>Conexion Segura</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" data-testid="login-form">
          <div className="login-form-header">
            <div className="login-form-icon" style={{ background: `linear-gradient(135deg, ${accentColor}, hsl(210, 80%, 45%))` }}>
              <Lock size={16} color="#fff" />
            </div>
            <span>Iniciar Sesion</span>
          </div>

          <div className="field">
            <label>Usuario</label>
            <div className="input-wrap">
              <User size={16} className="input-icon" />
              <input data-testid="login-username" type="text" value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="Introduce tu usuario" autoComplete="username" />
            </div>
          </div>

          <div className="field">
            <label>Contrasena</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input data-testid="login-password" type={showPw ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Introduce tu contrasena" autoComplete="current-password" />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" data-testid="login-error">
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}

          <button data-testid="login-submit" type="submit" className="login-btn" disabled={loading}
            style={{ background: `linear-gradient(135deg, ${accentColor}, hsl(210, 80%, 45%))` }}>
            {loading ? <RefreshCw size={18} className="spin" /> : <><LogIn size={18} /><span>Acceder</span></>}
          </button>
        </form>

        {/* Features */}
        <div className="login-features">
          <div className="feature"><Activity size={14} /><span>Tiempo Real</span></div>
          <div className="feature"><BarChart3 size={14} /><span>Rankings</span></div>
          <div className="feature"><Camera size={14} /><span>Mobotix</span></div>
        </div>

        <div className="login-footer">
          <p>&copy; {new Date().getFullYear()} Siempria</p>
          <p>Distribuidor Autorizado Mobotix</p>
        </div>
      </div>
    </div>
  );
}

// ==================== DASHBOARD ====================
function Dashboard({ token, user, onLogout }) {
  const [view, setView] = useState('realtime');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef(null);

  const api = useCallback((url) => axios.get(`${API}${url}`, {
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const fetchData = useCallback(async () => {
    try {
      if (view === 'realtime') {
        const res = await api('/ranking/realtime');
        setData(res.data);
      } else if (view === 'by-brand') {
        const res = await api('/ranking/by-brand?period=day');
        setData(res.data);
      } else if (view === 'by-center') {
        const res = await api('/ranking/by-center?period=day');
        setData(res.data);
      } else if (view === 'cameras') {
        const res = await api('/cameras');
        setData(res.data);
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) onLogout();
    } finally {
      setLoading(false);
    }
  }, [view, api, onLogout]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [view, fetchData]);

  useEffect(() => {
    if (autoRefresh && (view === 'realtime' || view === 'by-brand' || view === 'by-center')) {
      timerRef.current = setInterval(fetchData, 30000);
      return () => clearInterval(timerRef.current);
    }
  }, [autoRefresh, view, fetchData]);

  const navItems = [
    { id: 'realtime', label: 'Tiempo Real', icon: Activity },
    { id: 'by-brand', label: 'Por Marca', icon: BarChart3 },
    { id: 'by-center', label: 'Por Centro', icon: MapPin },
    { id: 'cameras', label: 'Camaras', icon: Camera },
  ];

  return (
    <div className="dashboard" data-testid="dashboard">
      {/* Header */}
      <header className="dash-header" data-testid="dashboard-header">
        <div className="dash-header-left">
          <Activity size={22} className="header-logo-icon" />
          <div>
            <h1 className="header-title">SIEMPRIA CONTEO</h1>
            <span className="header-sub">Sistema de Conteo de Visitas</span>
          </div>
        </div>
        <div className="dash-header-center">
          {lastUpdate && (
            <div className="header-status">
              <Clock size={13} />
              <span>{lastUpdate.toLocaleTimeString('es-ES')}</span>
            </div>
          )}
          <button className="header-refresh" onClick={() => { setLoading(true); fetchData(); }}
            data-testid="refresh-btn" title="Actualizar">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button className={`header-auto ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)} title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}>
            {autoRefresh ? <Wifi size={14} /> : <WifiOff size={14} />}
          </button>
        </div>
        <div className="dash-header-right">
          <div className="header-user">
            <div className="user-avatar">{(user?.full_name || user?.username || 'U')[0].toUpperCase()}</div>
            <span className="user-name">{user?.full_name || user?.username}</span>
          </div>
          <button className="logout-btn" onClick={onLogout} data-testid="logout-btn" title="Cerrar sesion">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="dash-nav" data-testid="dashboard-nav">
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)} data-testid={`nav-${item.id}`}>
            <item.icon size={16} /><span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="dash-content">
        {loading && !data ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spin" />
            <p>Cargando datos...</p>
          </div>
        ) : (
          <>
            {view === 'realtime' && <RealtimeView data={data} />}
            {view === 'by-brand' && <BrandRankingView data={data} />}
            {view === 'by-center' && <CenterRankingView data={data} />}
            {view === 'cameras' && <CamerasView data={data} token={token} onRefresh={fetchData} />}
          </>
        )}
      </main>
    </div>
  );
}

// ==================== REALTIME VIEW ====================
function RealtimeView({ data }) {
  if (!data) return <EmptyState text="Sin datos en tiempo real" />;
  const { ranking = [], totals = {}, cameras_total = 0, cameras_online = 0 } = data;

  return (
    <div className="view-container" data-testid="realtime-view">
      {/* Stats bar */}
      <div className="stats-bar">
        <StatCard label="Visitas Hoy" value={totals.entries || 0} icon={Users} color="#00AEEF" />
        <StatCard label="Salidas" value={totals.exits || 0} icon={TrendingDown} color="#f59e0b" />
        <StatCard label="Camaras Online" value={`${cameras_online}/${cameras_total}`} icon={Camera} color="#22c55e" />
      </div>

      {/* Ranking */}
      <div className="section-card">
        <h2 className="section-title"><BarChart3 size={18} /> Ranking por Marca - Hoy</h2>
        <div className="ranking-list">
          {ranking.length === 0 && <EmptyState text="No hay datos de conteo todavia" />}
          {ranking.map((item, idx) => (
            <RankingItem key={item.brand_id} item={item} rank={idx + 1}
              valueKey="entries" labelKey="brand_name" colorKey="brand_color" />
          ))}
        </div>
      </div>

      {/* Camera details */}
      {ranking.some(r => r.cameras?.length > 0) && (
        <div className="section-card">
          <h2 className="section-title"><Camera size={18} /> Detalle por Camara</h2>
          <div className="camera-detail-grid">
            {ranking.flatMap(brand =>
              (brand.cameras || []).map(cam => (
                <div key={cam.camera_id} className="camera-detail-card" data-testid={`camera-${cam.camera_id}`}>
                  <div className="cam-header">
                    <span className={`cam-status ${cam.status}`}>
                      {cam.status === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                    </span>
                    <span className="cam-name">{cam.camera_name}</span>
                  </div>
                  <div className="cam-brand" style={{ color: brand.brand_color }}>{brand.brand_name}</div>
                  <div className="cam-stats">
                    <div className="cam-stat">
                      <span className="cam-stat-val">{cam.entries}</span>
                      <span className="cam-stat-label">Entradas</span>
                    </div>
                    <div className="cam-stat">
                      <span className="cam-stat-val">{cam.exits}</span>
                      <span className="cam-stat-label">Salidas</span>
                    </div>
                  </div>
                  {cam.island && <div className="cam-island"><MapPin size={10} /> {cam.island.replace(/-/g, ' ')}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== BRAND RANKING VIEW ====================
function BrandRankingView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking = [] } = data;
  const maxVal = Math.max(...ranking.map(r => r.total_visits), 1);

  return (
    <div className="view-container" data-testid="brand-ranking-view">
      <div className="section-card">
        <h2 className="section-title"><BarChart3 size={18} /> Ranking por Marca - Hoy</h2>
        <div className="ranking-list">
          {ranking.length === 0 && <EmptyState text="No hay datos" />}
          {ranking.map((item, idx) => (
            <div key={item.brand_id} className="ranking-row" data-testid={`brand-rank-${item.brand_id}`}>
              <div className="rank-pos">#{idx + 1}</div>
              <div className="rank-color" style={{ background: item.brand_color }} />
              <div className="rank-info">
                <span className="rank-name">{item.brand_name}</span>
                <div className="rank-bar-wrap">
                  <div className="rank-bar" style={{
                    width: `${(item.total_visits / maxVal) * 100}%`,
                    background: item.brand_color
                  }} />
                </div>
              </div>
              <div className="rank-value">{item.total_visits.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== CENTER RANKING VIEW ====================
function CenterRankingView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking = [] } = data;

  return (
    <div className="view-container" data-testid="center-ranking-view">
      <div className="section-card">
        <h2 className="section-title"><MapPin size={18} /> Ranking por Centro - Hoy</h2>
        <div className="ranking-list">
          {ranking.length === 0 && <EmptyState text="No hay datos de centros" />}
          {ranking.map((item, idx) => (
            <RankingItem key={item.center_id} item={item} rank={idx + 1}
              valueKey="total_visits" labelKey="center_name" colorKey="brand_color" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== CAMERAS CONFIG VIEW ====================
function CamerasView({ data, token, onRefresh }) {
  if (!data) return <EmptyState text="Cargando camaras..." />;
  const { cameras = [] } = data;

  return (
    <div className="view-container" data-testid="cameras-view">
      <div className="section-card">
        <div className="section-header-row">
          <h2 className="section-title"><Camera size={18} /> Configuracion de Camaras</h2>
          <span className="badge">{cameras.length} configuradas</span>
        </div>

        {cameras.length === 0 ? (
          <EmptyState text="No hay camaras configuradas" />
        ) : (
          <div className="cameras-table-wrap">
            <table className="cameras-table" data-testid="cameras-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Isla</th>
                  <th>IP</th>
                  <th>Puerto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cameras.map(cam => (
                  <tr key={cam.camera_id} data-testid={`cam-row-${cam.camera_id}`}>
                    <td className="mono">{cam.camera_id}</td>
                    <td>{cam.camera_name}</td>
                    <td><span className="brand-tag">{cam.brand_id}</span></td>
                    <td>{cam.island?.replace(/-/g, ' ')}</td>
                    <td className="mono">{cam.ip}</td>
                    <td className="mono">{cam.port}</td>
                    <td>
                      <span className={`status-dot ${cam.enabled ? 'online' : 'offline'}`} />
                      {cam.enabled ? 'Activa' : 'Inactiva'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SHARED COMPONENTS ====================
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="stat-card" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="stat-icon" style={{ color, background: `${color}15` }}>
        <Icon size={20} />
      </div>
      <div className="stat-info">
        <span className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

function RankingItem({ item, rank, valueKey, labelKey, colorKey }) {
  const val = item[valueKey] || 0;
  return (
    <div className="ranking-item" data-testid={`ranking-item-${rank}`}>
      <div className={`rank-position ${rank <= 3 ? `top-${rank}` : ''}`}>{rank}</div>
      <div className="rank-color-dot" style={{ background: item[colorKey] || '#666' }} />
      <div className="rank-label">{item[labelKey]}</div>
      <div className="rank-count mono">{val.toLocaleString()}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <BarChart3 size={36} />
      <p>{text}</p>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('conteo_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (data) => {
    const authData = { token: data.token, user: data.user };
    localStorage.setItem('conteo_auth', JSON.stringify(authData));
    setAuth(authData);
  };

  const handleLogout = () => {
    localStorage.removeItem('conteo_auth');
    setAuth(null);
  };

  if (!auth) return <LoginPage onLogin={handleLogin} />;
  return <Dashboard token={auth.token} user={auth.user} onLogout={handleLogout} />;
}
