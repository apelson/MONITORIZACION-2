import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  LogIn, Lock, User, Eye, EyeOff, LogOut, RefreshCw, Users, BarChart3,
  Camera, Clock, Shield, Activity, Wifi, WifiOff, AlertCircle,
  MapPin, Plus, Trash2, Edit3, Save, X, Trophy, Crown, Flame, Award,
  Maximize2, Check, Download, ToggleLeft, ToggleRight, UserPlus, UserCog, Key, ChevronDown,
  TrendingUp, TrendingDown, Menu, ArrowUpRight, ArrowDownRight, Minus, Zap, Database,
  Presentation, Play, Pause, Filter, FileSpreadsheet, Target, ChevronRight, ChevronLeft
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import './App.css';

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

/* ═══════════════ ECG HEARTBEAT COMPONENT ═══════════════ */
function EcgMonitor({ camerasOnline, camerasTotal }) {
  const canvasRef = useRef(null);
  const dataRef = useRef([]);
  const offsetRef = useRef(0);

  useEffect(() => {
    dataRef.current.push(camerasOnline);
    if (dataRef.current.length > 60) dataRef.current.shift();
  }, [camerasOnline]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const draw = () => {
      const w = canvas.width = canvas.offsetWidth * 2;
      const h = canvas.height = canvas.offsetHeight * 2;
      ctx.clearRect(0, 0, w, h);

      const pts = dataRef.current;
      const max = Math.max(camerasTotal || 1, ...pts, 1);
      offsetRef.current = (offsetRef.current + 1) % 20;

      // Grid lines
      ctx.strokeStyle = 'rgba(91,141,184,0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let x = -offsetRef.current; x < w; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }

      if (pts.length < 2) { animId = requestAnimationFrame(draw); return; }

      // ECG line
      const stepX = w / (pts.length - 1);
      ctx.beginPath();
      ctx.strokeStyle = camerasOnline >= camerasTotal ? '#22c55e' : camerasOnline > 0 ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.lineJoin = 'round';

      pts.forEach((val, i) => {
        const x = i * stepX;
        const baseY = h - (val / max) * (h * 0.7) - h * 0.1;
        // Add ECG-like spike effect at data transitions
        let y = baseY;
        if (i > 0 && pts[i] !== pts[i - 1]) {
          const diff = pts[i] - pts[i - 1];
          y = baseY - diff * 4;
        }
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Glow dot at the end
      const lastX = (pts.length - 1) * stepX;
      const lastY = h - (pts[pts.length - 1] / max) * (h * 0.7) - h * 0.1;
      ctx.beginPath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.shadowBlur = 16;
      ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [camerasOnline, camerasTotal]);

  return <canvas ref={canvasRef} className="ecg-canvas" />;
}

function SystemHealthWidget({ camerasOnline, camerasTotal }) {
  const pct = camerasTotal > 0 ? Math.round((camerasOnline / camerasTotal) * 100) : 0;
  const statusColor = pct >= 90 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const statusLabel = pct >= 90 ? 'OPERATIVO' : pct >= 50 ? 'PARCIAL' : 'CRITICO';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="noc-health-widget" data-testid="system-health-widget">
      <div className="health-header">
        <Activity size={14} style={{ color: statusColor }} />
        <span className="health-title">ESTADO DEL SISTEMA</span>
        <span className="health-pulse" style={{ background: statusColor }} />
      </div>
      <div className="health-body">
        <div className="health-gauge">
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx="34" cy="34" r={r} fill="none" stroke={statusColor} strokeWidth="5"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 34 34)"
              style={{ transition: 'stroke-dashoffset 1s ease' }} />
            <text x="34" y="31" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="JetBrains Mono, monospace">{pct}%</text>
            <text x="34" y="44" textAnchor="middle" fill={statusColor} fontSize="7" fontWeight="600" letterSpacing="0.5">{statusLabel}</text>
          </svg>
        </div>
        <div className="health-info">
          <div className="health-row">
            <Camera size={12} />
            <span className="health-label">Camaras</span>
            <span className="health-val mono">{camerasOnline}<span style={{opacity:0.4}}>/{camerasTotal}</span></span>
          </div>
          <div className="health-row">
            <Wifi size={12} style={{ color: '#22c55e' }} />
            <span className="health-label">Online</span>
            <span className="health-val mono" style={{ color: '#22c55e' }}>{camerasOnline}</span>
          </div>
          <div className="health-row">
            <WifiOff size={12} style={{ color: '#ef4444' }} />
            <span className="health-label">Offline</span>
            <span className="health-val mono" style={{ color: camerasTotal - camerasOnline > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>{camerasTotal - camerasOnline}</span>
          </div>
        </div>
      </div>
      <div className="health-ecg">
        <EcgMonitor camerasOnline={camerasOnline} camerasTotal={camerasTotal} />
      </div>
    </div>
  );
}

/* ═══════════════ BRAND CONFIG ═══════════════ */
const ALL_BRANDS = [
  { id: 'audi', name: 'AUDI', color: '#BB0A1E', logo: '/assets/brands/audi.png' },
  { id: 'volkswagen', name: 'VOLKSWAGEN', color: '#001E50', logo: '/assets/brands/volkswagen.png' },
  { id: 'skoda', name: 'SKODA', color: '#4BA82E', logo: '/assets/brands/skoda.png' },
  { id: 'honda', name: 'HONDA', color: '#CC0000', logo: '/assets/brands/honda.png' },
  { id: 'ducati', name: 'DUCATI', color: '#D40000', logo: '/assets/brands/ducati.png' },
  { id: 'daocasion', name: 'DAOCASION', color: '#FF6B00', logo: '/assets/brands/daocasion.png' },
];
const ALL_ISLANDS = [
  { id: 'tenerife', name: 'Tenerife', short: 'TF', color: '#8B5CF6' },
  { id: 'gran-canaria', name: 'Gran Canaria', short: 'GC', color: '#5B8DB8' },
  { id: 'lanzarote', name: 'Lanzarote', short: 'LZ', color: '#3B82F6' },
  { id: 'fuerteventura', name: 'Fuerteventura', short: 'FV', color: '#F59E0B' },
  { id: 'la-palma', name: 'La Palma', short: 'LP', color: '#06B6D4' },
];
const BRAND_COLORS = Object.fromEntries(ALL_BRANDS.map(b => [b.id, b.color]));

/* ═══════════════ TREND & SPARKLINE COMPONENTS ═══════════════ */
function TrendBadge({ current, previous }) {
  if (!previous || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="trend-badge neutral"><Minus size={10} /> 0%</span>;
  const up = pct > 0;
  return (
    <span className={`trend-badge ${up ? 'up' : 'down'}`}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}

function MiniSparkline({ data = [], width = 60, height = 20, color = '#5B8DB8' }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="mini-sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * width} cy={height - ((data[data.length - 1] - min) / range) * (height - 2) - 1}
        r="2" fill={color} />
    </svg>
  );
}

function BrandLogo({ brandId, size = 24 }) {
  const brand = ALL_BRANDS.find(b => b.id === brandId);
  if (!brand) return null;
  return (
    <img
      src={brand.logo} alt={brand.name} className="brand-logo-img"
      style={{ width: size, height: size, borderRadius: size > 30 ? 10 : 6, objectFit: 'contain', background: '#fff', padding: size > 30 ? 3 : 2 }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

/* ═══════════════ ISLAND IMAGES ═══════════════ */
const ISLAND_PNGS = {
  tenerife: '/islands/tenerife.png',
  'gran-canaria': '/islands/grancanaria.png',
  lanzarote: '/islands/lanzarote.png',
  fuerteventura: '/islands/fuerteventura.png',
  'la-palma': '/islands/lapalma.png',
};

function IslandSilhouette({ island, size = 44, active = false, color }) {
  const src = ISLAND_PNGS[island];
  if (!src) return null;
  return (
    <img
      src={src} alt={island} className="island-silhouette"
      style={{
        width: size, height: size, objectFit: 'contain',
        filter: active ? `drop-shadow(0 0 8px ${color}90)` : 'brightness(0.3) grayscale(1)',
        transition: 'filter 0.3s'
      }}
    />
  );
}

/* ═══════════════ ANIMATED NUMBER ═══════════════ */
function AnimNum({ value }) {
  const numVal = (typeof value === 'number' && !isNaN(value)) ? value : 0;
  const [display, setDisplay] = useState(numVal);
  const prevRef = useRef(numVal);
  useEffect(() => {
    const from = prevRef.current;
    const to = numVal;
    prevRef.current = to;
    if (from === to) { setDisplay(to); return; }
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - t0) / 700, 1);
      setDisplay(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numVal]);
  return <span>{display.toLocaleString('es-ES')}</span>;
}

function LiveClock({ compact }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (compact) {
    return (
      <div className="header-clock">
        <Clock size={13} />
        <span>{time.toLocaleTimeString('es-ES')}</span>
      </div>
    );
  }
  return (
    <div className="noc-clock">
      <div className="noc-clock-time">
        {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="noc-clock-date">
        {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

/* ═══════════════ MULTI-SELECT CHIPS ═══════════════ */
function ChipSelect({ label, options, selected, onChange, testId }) {
  return (
    <div className="chip-select-group" data-testid={testId}>
      <label className="chip-select-label">{label}</label>
      <div className="chip-select-desc">Vacio = acceso a todo</div>
      <div className="chip-select-wrap">
        {options.map(opt => {
          const isOn = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`chip-option ${isOn ? 'chip-on' : ''}`}
              onClick={() => {
                if (isOn) onChange(selected.filter(s => s !== opt.id));
                else onChange([...selected, opt.id]);
              }}
              data-testid={`chip-${opt.id}`}
            >
              {opt.logo && <img src={opt.logo} alt="" style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} />}
              <span>{opt.name}</span>
              {isOn && <Check size={12} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════ LOGIN ═══════════════ */
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="login-page" data-testid="login-page">
      <div className="login-container">
        <img src="/dag-logo.png" alt="Domingo Alonso Group" className="login-dag-logo" data-testid="dag-logo" />

        <div className="login-card">
          <div className="login-card-header">
            <div className="login-app-badge">
              <Shield size={14} />
              <span>Conteo de Visitas</span>
            </div>
            <h1 className="login-card-title" data-testid="login-title">Iniciar Sesion</h1>
            <p className="login-card-desc">Accede al panel de control</p>
          </div>

          <form onSubmit={handleSubmit} data-testid="login-form">
            <div className="login-field">
              <label>Usuario</label>
              <div className="login-input-wrap">
                <User size={16} />
                <input
                  data-testid="login-username" type="text" value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="Introduce tu usuario"
                />
              </div>
            </div>
            <div className="login-field">
              <label>Contrasena</label>
              <div className="login-input-wrap">
                <Lock size={16} />
                <input
                  data-testid="login-password" type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Introduce tu contrasena"
                />
                <button type="button" className="login-pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="login-error" data-testid="login-error">
                <AlertCircle size={14} /><span>{error}</span>
              </div>
            )}
            <button data-testid="login-submit" type="submit" className="login-submit" disabled={loading}>
              {loading
                ? <RefreshCw size={18} className="spin" />
                : <><LogIn size={18} /><span>Acceder</span></>
              }
            </button>
          </form>
        </div>

        <div className="login-footer-text">
          <span>Desarrollado por</span>
          <img src="/siempria-logo.png" alt="Siempria" />
          <span>Siempria</span>
          <span className="login-footer-sep">|</span>
          <span>Tecnologia Mobotix</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ DASHBOARD SHELL ═══════════════ */
function Dashboard({ token, user, onLogout }) {
  const [view, setView] = useState('realtime');
  const [data, setData] = useState(null);
  const [islandData, setIslandData] = useState({});
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [nocFs, setNocFs] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const timerRef = useRef(null);

  const api = useCallback((method, url, body) => {
    const cfg = { headers: { Authorization: `Bearer ${token}` } };
    if (method === 'get') return axios.get(`${API}${url}`, cfg);
    if (method === 'post') return axios.post(`${API}${url}`, body, cfg);
    if (method === 'put') return axios.put(`${API}${url}`, body, cfg);
    if (method === 'delete') return axios.delete(`${API}${url}`, cfg);
  }, [token]);

  const fetchData = useCallback(async () => {
    try {
      let res;
      if (view === 'realtime' || view === 'noc') {
        const [realtimeRes, islandRes] = await Promise.all([
          api('get', '/ranking/realtime'),
          api('get', '/ranking/by-island').catch(() => ({ data: { islands: {} } }))
        ]);
        res = realtimeRes;
        setIslandData(islandRes.data.islands || {});
      }
      else if (view === 'trends') res = await api('get', '/ranking/trends');
      else if (view === 'by-brand') res = await api('get', '/ranking/by-brand?period=day');
      else if (view === 'by-center') res = await api('get', '/ranking/by-center?period=day');
      else if (view === 'cameras') res = await api('get', '/cameras');
      else if (view === 'executive' || view === 'presentation') {
        const [execRes, compWeek, compMonth] = await Promise.all([
          api('get', '/analytics/executive'),
          api('get', '/analytics/comparison?period=week'),
          api('get', '/analytics/comparison?period=month')
        ]);
        res = { data: { ...execRes.data, comparison_week: compWeek.data, comparison_month: compMonth.data } };
      }
      else if (view === 'heatmap') {
        const [camerasRes, historyRes] = await Promise.all([
          api('get', '/heatmap/cameras'),
          api('get', '/heatmap/history?limit=50')
        ]);
        res = { cameras: camerasRes.cameras || [], heatmaps: historyRes.heatmaps || [], total: historyRes.total || 0 };
      }
      else if (view === 'users') res = await api('get', '/users');
      if (res) setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) onLogout();
    } finally {
      setLoading(false);
    }
  }, [view, api, onLogout]);

  useEffect(() => { setLoading(true); setData(null); fetchData(); }, [view, fetchData]);
  useEffect(() => {
    if (autoRefresh && !['cameras', 'users', 'heatmap', 'executive', 'presentation'].includes(view)) {
      timerRef.current = setInterval(fetchData, 30000);
      return () => clearInterval(timerRef.current);
    }
  }, [autoRefresh, view, fetchData]);

  if (nocFs) {
    return (
      <NOCView
        data={data} islandData={islandData} onClose={() => setNocFs(false)} onRefresh={fetchData}
        loading={loading} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} api={api}
      />
    );
  }

  const navItems = [
    { id: 'realtime', label: 'Tiempo Real', icon: Activity },
    { id: 'noc', label: 'NOC Competitivo', icon: Trophy },
    { id: 'trends', label: 'Tendencias', icon: TrendingUp },
    { id: 'heatmap', label: 'Mapa de Calor', icon: Flame },
    { id: 'executive', label: 'Ejecutivo', icon: Zap },
    { id: 'presentation', label: 'Presentacion', icon: Presentation },
    { id: 'by-brand', label: 'Por Marca', icon: BarChart3 },
    { id: 'by-center', label: 'Por Centro', icon: MapPin },
    { id: 'cameras', label: 'Camaras', icon: Camera },
    ...(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),
  ];

  return (
    <div className="app-shell" data-testid="dashboard">
      <header className="app-header">
        <div className="header-left">
          <button className="header-menu-btn" onClick={() => setMobileNav(!mobileNav)} data-testid="mobile-menu-btn">
            <Menu size={20} />
          </button>
          <img src="/dag-logo.png" alt="Domingo Alonso Group" className="header-dag-logo" />
        </div>
        <div className="header-center-brand">
          <div className="header-app-title-group">
            <h1 className="header-app-name">Conteo de Visitas</h1>
            <span className="header-app-sub">Sistema en Tiempo Real</span>
          </div>
        </div>
        <div className="header-right">
          <LiveClock compact />
          <button className="header-icon-btn" onClick={() => { setLoading(true); fetchData(); }} data-testid="refresh-btn" title="Refrescar">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button className={`header-icon-btn ${autoRefresh ? 'active' : ''}`} onClick={() => setAutoRefresh(!autoRefresh)} data-testid="auto-refresh-btn" title="Auto-refresco">
            {autoRefresh ? <Wifi size={14} /> : <WifiOff size={14} />}
          </button>
          {view === 'noc' && (
            <button className="header-icon-btn active" onClick={() => setNocFs(true)} data-testid="fullscreen-btn" title="Pantalla completa">
              <Maximize2 size={14} />
            </button>
          )}
          <div className="header-sep" />
          <div className="header-user">
            <div className="header-avatar">{(user?.full_name || user?.username || 'U')[0].toUpperCase()}</div>
            <span className="header-username">{user?.full_name || user?.username}</span>
          </div>
          <button className="header-logout" onClick={onLogout} data-testid="logout-btn" title="Cerrar sesion">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <nav className={`app-nav ${mobileNav ? 'nav-open' : ''}`}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`app-nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => { setView(item.id); setMobileNav(false); }}
            data-testid={`nav-${item.id}`}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {mobileNav && <div className="nav-overlay" onClick={() => setMobileNav(false)} />}

      <main className="app-content">
        {loading && !data ? <LoadingState /> : <>
          {view === 'realtime' && <RealtimeView data={data} />}
          {view === 'noc' && (
            <NOCView data={data} islandData={islandData} embedded onRefresh={fetchData} loading={loading} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} api={api} />
          )}
          {view === 'trends' && <TrendsView data={data} />}
          {view === 'heatmap' && <HeatmapView data={data} api={api} onRefresh={fetchData} />}
          {view === 'executive' && <ExecutiveView data={data} api={api} />}
          {view === 'presentation' && <PresentationMode data={data} api={api} />}
          {view === 'by-brand' && <BrandView data={data} />}
          {view === 'by-center' && <CenterView data={data} />}
          {view === 'cameras' && <CamerasView data={data} api={api} onRefresh={fetchData} isAdmin={user?.role === 'admin'} />}
          {view === 'users' && <UsersView data={data} api={api} onRefresh={fetchData} currentUser={user} />}
        </>}
      </main>

      <footer className="app-footer" data-testid="app-footer">
        <span className="footer-dag">Domingo Alonso Group</span>
        <div className="footer-right">
          <span>Desarrollado por</span>
          <img src="/siempria-logo.png" alt="Siempria" className="footer-siempria-logo" />
          <span className="footer-siempria">Siempria</span>
          <span style={{ margin: '0 0.25rem', color: '#CBD2DB' }}>|</span>
          <span>Tecnologia Mobotix</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════ REALTIME VIEW ═══════════════ */
function RealtimeView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking = [], totals = {}, cameras_total = 0, cameras_online = 0 } = data;
  return (
    <div className="view-wrap" data-testid="realtime-view">
      <div className="kpi-grid">
        <div className="kpi-card accent-primary">
          <div className="kpi-icon" style={{ background: '#E8F1F8', color: '#4A7CA7' }}><Users size={22} /></div>
          <div className="kpi-data">
            <span className="kpi-val mono"><AnimNum value={totals.entries || 0} /></span>
            <span className="kpi-label">Visitas Hoy</span>
          </div>
        </div>
        <div className="kpi-card accent-info">
          <div className="kpi-icon" style={{ background: '#E8EEF5', color: '#5B7FAD' }}><Camera size={22} /></div>
          <div className="kpi-data">
            <span className="kpi-val">{cameras_online}/{cameras_total}</span>
            <span className="kpi-label">Camaras Online</span>
          </div>
        </div>
        <div className="kpi-card accent-warning">
          <div className="kpi-icon" style={{ background: '#FDF5E6', color: '#C49030' }}><Trophy size={22} /></div>
          <div className="kpi-data">
            <span className="kpi-val">{ranking.length}</span>
            <span className="kpi-label">Marcas Activas</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><BarChart3 size={18} /> Ranking por Marca — Hoy</h2>
        <div className="rank-list">
          {ranking.length === 0 && <EmptyState text="Sin datos de camaras — Las camaras estan en la red local" />}
          {ranking.map((item, i) => (
            <div key={item.brand_id} className="rank-row" data-testid={`ranking-item-${item.brand_id}`}>
              <div className={`rank-pos ${i < 3 ? `medal-${i + 1}` : ''}`}>{i + 1}</div>
              <div className="rank-logo"><BrandLogo brandId={item.brand_id} size={36} /></div>
              <div className="rank-name">{item.brand_name}</div>
              <div className="rank-val mono"><AnimNum value={item.entries || 0} /></div>
              <span className="rank-label">visitas</span>
            </div>
          ))}
        </div>
      </div>

      {ranking.some(r => r.cameras?.length > 0) && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2 className="card-title"><Camera size={18} /> Detalle por Camara</h2>
          <div className="cam-grid">
            {ranking.flatMap(brand =>
              (brand.cameras || []).map(cam => (
                <div key={cam.camera_id} className="cam-card">
                  <div className="cam-card-top">
                    <span className={`cam-dot ${cam.status}`} />
                    <span className="cam-card-name">{cam.camera_name}</span>
                  </div>
                  <div className="cam-card-brand"><BrandLogo brandId={brand.brand_id} size={14} /><span>{brand.brand_name}</span></div>
                  <div className="cam-card-val"><span className="cam-num">{cam.entries}</span><span className="cam-lbl">visitas</span></div>
                  {cam.island && <div className="cam-card-loc"><MapPin size={10} />{cam.island.replace(/-/g, ' ')}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ BRAND VIEW ═══════════════ */
function BrandView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking = [] } = data;
  const maxV = Math.max(...ranking.map(r => (r.total_visits || r.entries || 0)), 1);
  return (
    <div className="view-wrap" data-testid="brand-ranking-view">
      <div className="card">
        <h2 className="card-title"><BarChart3 size={18} /> Ranking por Marca — Hoy</h2>
        <div className="rank-list">
          {ranking.length === 0 && <EmptyState text="Sin datos de camaras" />}
          {ranking.map((item, i) => {
            const val = item.total_visits || item.entries || 0;
            const color = BRAND_COLORS[item.brand_id] || item.brand_color || '#5B8DB8';
            return (
              <div key={item.brand_id} className="brand-row" data-testid={`brand-row-${item.brand_id}`}>
                <div className="brand-row-left">
                  <span className="brand-rank">#{i + 1}</span>
                  <div className="brand-row-logo"><BrandLogo brandId={item.brand_id} size={40} /></div>
                  <span className="brand-row-name">{item.brand_name}</span>
                </div>
                <div className="brand-row-mid">
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(val / maxV) * 100}%`, background: color }} /></div>
                </div>
                <div className="brand-row-val mono"><AnimNum value={val} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ CENTER VIEW ═══════════════ */
function CenterView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking = [] } = data;
  return (
    <div className="view-wrap" data-testid="center-ranking-view">
      <div className="card">
        <h2 className="card-title"><MapPin size={18} /> Ranking por Centro — Hoy</h2>
        <div className="rank-list">
          {ranking.length === 0 && <EmptyState text="Sin datos de centros" />}
          {ranking.map((item, i) => (
            <div key={item.center_id} className="rank-row" data-testid={`center-item-${item.center_id}`}>
              <div className={`rank-pos ${i < 3 ? `medal-${i + 1}` : ''}`}>{i + 1}</div>
              <div className="rank-logo"><BrandLogo brandId={item.brand_id} size={24} /></div>
              <div className="rank-name">{item.center_name}</div>
              <div className="rank-val mono"><AnimNum value={item.total_visits || 0} /></div>
              <span className="rank-label">visitas</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ TRENDS VIEW ═══════════════ */
function TrendsView({ data }) {
  const [selectedBrand, setSelectedBrand] = useState('all');
  const currentHour = new Date().getHours();
  
  const { hourly_today = [], daily_week = [], brand_hourly = {} } = data || {};

  const chartHourly = useMemo(() => {
    if (selectedBrand === 'all') {
      return hourly_today.filter(h => h.hour <= currentHour);
    }
    const bh = brand_hourly[selectedBrand] || [];
    return bh.filter(h => h.hour <= currentHour);
  }, [selectedBrand, hourly_today, brand_hourly, currentHour]);

  if (!data) return <EmptyState text="Sin datos de tendencias" />;

  const totalToday = hourly_today.reduce((s, h) => s + h.entries, 0);
  const peakHour = hourly_today.reduce((max, h) => h.entries > (max?.entries || 0) ? h : max, hourly_today[0]);
  const avgHourly = currentHour > 0 ? Math.round(totalToday / currentHour) : 0;

  const brandKeys = Object.keys(brand_hourly);
  const brandOptions = [{ id: 'all', name: 'Todas las marcas' }, ...ALL_BRANDS.filter(b => brandKeys.includes(b.id))];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="trend-tooltip">
        <p className="trend-tooltip-label">{label}</p>
        <p className="trend-tooltip-val">{payload[0].value.toLocaleString('es-ES')} visitas</p>
      </div>
    );
  };

  return (
    <div className="view-wrap" data-testid="trends-view">
      <div className="trends-kpi-grid">
        <div className="trends-kpi">
          <div className="trends-kpi-icon" style={{ background: '#E8F1F8', color: '#4A7CA7' }}><Users size={20} /></div>
          <div className="trends-kpi-data">
            <span className="trends-kpi-val mono"><AnimNum value={totalToday} /></span>
            <span className="trends-kpi-label">Total hoy</span>
          </div>
        </div>
        <div className="trends-kpi">
          <div className="trends-kpi-icon" style={{ background: '#FEF3C7', color: '#92400E' }}><TrendingUp size={20} /></div>
          <div className="trends-kpi-data">
            <span className="trends-kpi-val mono">{peakHour ? `${peakHour.hour}:00` : '--'}</span>
            <span className="trends-kpi-label">Hora pico ({peakHour?.entries || 0})</span>
          </div>
        </div>
        <div className="trends-kpi">
          <div className="trends-kpi-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}><Activity size={20} /></div>
          <div className="trends-kpi-data">
            <span className="trends-kpi-val mono"><AnimNum value={avgHourly} /></span>
            <span className="trends-kpi-label">Media/hora</span>
          </div>
        </div>
      </div>

      <div className="card trends-chart-card">
        <div className="trends-chart-header">
          <h2 className="card-title"><TrendingUp size={18} /> Flujo de Visitas por Hora — Hoy</h2>
          <select
            className="trends-brand-select"
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            data-testid="trends-brand-filter"
          >
            {brandOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="trends-chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartHourly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B8DB8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#5B8DB8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="entries" stroke="#5B8DB8" strokeWidth={2.5} fill="url(#gradientBlue)" dot={false} activeDot={{ r: 5, fill: '#5B8DB8', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {daily_week.length > 0 && (
        <div className="card trends-chart-card" style={{ marginTop: '1rem' }}>
          <h2 className="card-title"><BarChart3 size={18} /> Visitas por Dia — Esta Semana</h2>
          <div className="trends-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={daily_week} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94A0B0', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="entries" fill="#5B8DB8" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {brandKeys.length > 1 && (
        <div className="card trends-chart-card" style={{ marginTop: '1rem' }}>
          <h2 className="card-title"><Activity size={18} /> Comparativa por Marca — Hoy</h2>
          <div className="trends-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false}
                  data={hourly_today.filter(h => h.hour <= currentHour)} />
                <YAxis tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false} />
                <Tooltip />
                {brandKeys.map(bid => {
                  const brand = ALL_BRANDS.find(b => b.id === bid);
                  const bData = (brand_hourly[bid] || []).filter(h => h.hour <= currentHour);
                  return (
                    <Line key={bid} data={bData} dataKey="entries" name={brand?.name || bid}
                      stroke={BRAND_COLORS[bid] || '#5B8DB8'} strokeWidth={2} dot={false} />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ CAMERAS VIEW ═══════════════ */
function CamerasView({ data, api, onRefresh, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [editCam, setEditCam] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migResult, setMigResult] = useState(null);
  const emptyForm = { camera_id: '', camera_name: '', brand_id: '', island: '', ip: '', port: 443, username: '', password: '', enabled: true };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setForm(emptyForm); setEditCam(null); setShowForm(true); };
  const openEdit = (c) => { setForm({ ...c, port: c.port || 443 }); setEditCam(c.camera_id); setShowForm(true); };
  const handleSave = async () => {
    try {
      if (editCam) await api('put', `/cameras/${editCam}`, form);
      else await api('post', '/cameras', form);
      setShowForm(false); onRefresh();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm(`Eliminar camara ${id}?`)) return;
    try { await api('delete', `/cameras/${id}`); onRefresh(); } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };
  const handleMigrate = async () => {
    setMigrating(true); setMigResult(null);
    try { const r = await api('post', '/cameras/migrate-from-main'); setMigResult(r.data); onRefresh(); }
    catch (e) { setMigResult({ error: e.response?.data?.detail || 'Error' }); }
    finally { setMigrating(false); }
  };

  if (!data) return <LoadingState />;
  const { cameras = [] } = data;

  return (
    <div className="view-wrap" data-testid="cameras-view">
      {isAdmin && (
        <div className="action-bar">
          <button className="btn-primary" onClick={openAdd} data-testid="add-camera-btn"><Plus size={16} /><span>Anadir Camara</span></button>
          <button className="btn-outline" onClick={handleMigrate} disabled={migrating} data-testid="migrate-cameras-btn">
            {migrating ? <RefreshCw size={16} className="spin" /> : <Download size={16} />}
            <span>{migrating ? 'Migrando...' : 'Importar de Plataforma'}</span>
          </button>
        </div>
      )}
      {migResult && (
        <div className={`alert-msg ${migResult.error ? 'alert-error' : 'alert-ok'}`}>
          {migResult.error ? <><AlertCircle size={16} /><span>{migResult.error}</span></> : <><Check size={16} /><span>{migResult.message}</span></>}
          <button onClick={() => setMigResult(null)}><X size={14} /></button>
        </div>
      )}
      {showForm && (
        <Modal title={editCam ? 'Editar Camara' : 'Nueva Camara'} onClose={() => setShowForm(false)}>
          <div className="form-2col">
            <FormField label="ID Camara *" value={form.camera_id} onChange={v => setForm({ ...form, camera_id: v })} placeholder="ej: audi-tf-001" disabled={!!editCam} />
            <FormField label="Nombre *" value={form.camera_name} onChange={v => setForm({ ...form, camera_name: v })} placeholder="AUDI Tenerife" />
            <FormSelect label="Marca *" value={form.brand_id} onChange={v => setForm({ ...form, brand_id: v })} options={ALL_BRANDS.map(b => ({ value: b.id, label: b.name }))} />
            <FormSelect label="Isla *" value={form.island} onChange={v => setForm({ ...form, island: v })} options={ALL_ISLANDS.map(i => ({ value: i.id, label: i.name }))} />
            <FormField label="IP *" value={form.ip} onChange={v => setForm({ ...form, ip: v })} placeholder="212.64.168.61" />
            <FormField label="Puerto *" value={form.port} onChange={v => setForm({ ...form, port: parseInt(v) || 443 })} type="number" />
            <FormField label="Usuario *" value={form.username} onChange={v => setForm({ ...form, username: v })} />
            <FormField label="Password *" value={form.password} onChange={v => setForm({ ...form, password: v })} type="password" />
          </div>
          <div className="form-toggle-row">
            <span>Estado:</span>
            <button className={`toggle-chip ${form.enabled ? 'on' : 'off'}`} onClick={() => setForm({ ...form, enabled: !form.enabled })}>
              {form.enabled ? <><ToggleRight size={18} /> Activa</> : <><ToggleLeft size={18} /> Inactiva</>}
            </button>
          </div>
          <div className="modal-btns">
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} data-testid="save-camera-btn"><Save size={16} /> Guardar</button>
          </div>
        </Modal>
      )}
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title"><Camera size={18} /> Camaras Configuradas</h2>
          <span className="count-badge">{cameras.length}</span>
        </div>
        {cameras.length === 0 ? <EmptyState text="No hay camaras configuradas" /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Nombre</th><th>Marca</th><th>Isla</th><th>IP:Puerto</th><th>Estado</th>{isAdmin && <th>Acciones</th>}</tr></thead>
              <tbody>
                {cameras.map(c => (
                  <tr key={c.camera_id} data-testid={`camera-row-${c.camera_id}`}>
                    <td className="mono">{c.camera_id}</td>
                    <td>{c.camera_name}</td>
                    <td><div className="table-brand"><BrandLogo brandId={c.brand_id} size={20} /><span>{c.brand_id}</span></div></td>
                    <td className="capitalize">{c.island?.replace(/-/g, ' ')}</td>
                    <td className="mono">{c.ip}:{c.port}</td>
                    <td><span className={`status-pill ${c.enabled !== false ? 'on' : 'off'}`}>{c.enabled !== false ? 'Activa' : 'Inactiva'}</span></td>
                    {isAdmin && (
                      <td><div className="table-actions">
                        <button className="tbl-btn" onClick={() => openEdit(c)} data-testid={`edit-camera-${c.camera_id}`}><Edit3 size={13} /></button>
                        <button className="tbl-btn danger" onClick={() => handleDelete(c.camera_id)} data-testid={`delete-camera-${c.camera_id}`}><Trash2 size={13} /></button>
                      </div></td>
                    )}
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

/* ═══════════════ USERS VIEW ═══════════════ */
function UsersView({ data, api, onRefresh, currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'viewer', allowed_brands: [], allowed_islands: [] });
  const roles = [
    { id: 'admin', name: 'Administrador', desc: 'Acceso completo' },
    { id: 'viewer', name: 'Visualizador', desc: 'Solo lectura' },
    { id: 'operator', name: 'Operador', desc: 'Ver + exportar' }
  ];

  const openAdd = () => {
    setForm({ username: '', password: '', full_name: '', role: 'viewer', allowed_brands: [], allowed_islands: [] });
    setEditUser(null); setShowForm(true);
  };
  const openEdit = (u) => {
    setForm({
      username: u.username, password: '', full_name: u.full_name || '',
      role: u.role || 'viewer',
      allowed_brands: u.allowed_brands || [],
      allowed_islands: u.allowed_islands || []
    });
    setEditUser(u.id); setShowForm(true);
  };
  const handleSave = async () => {
    try {
      if (editUser) {
        const b = { full_name: form.full_name, role: form.role, allowed_brands: form.allowed_brands, allowed_islands: form.allowed_islands };
        if (form.password) b.password = form.password;
        await api('put', `/users/${editUser}`, b);
      } else {
        await api('post', '/users', form);
      }
      setShowForm(false); onRefresh();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };
  const handleDelete = async (id, n) => {
    if (!window.confirm(`Eliminar usuario "${n}"?`)) return;
    try { await api('delete', `/users/${id}`); onRefresh(); } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };
  const handleToggle = async (u) => {
    try { await api('put', `/users/${u.id}`, { is_active: !(u.is_active !== false) }); onRefresh(); }
    catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };

  if (!data) return <LoadingState />;
  const { users = [] } = data;

  return (
    <div className="view-wrap" data-testid="users-view">
      <div className="action-bar">
        <button className="btn-primary" onClick={openAdd} data-testid="add-user-btn"><UserPlus size={16} /><span>Nuevo Usuario</span></button>
      </div>
      {showForm && (
        <Modal title={editUser ? 'Editar Usuario' : 'Nuevo Usuario'} onClose={() => setShowForm(false)} wide>
          <div className="form-2col">
            <FormField label="Usuario *" value={form.username} onChange={v => setForm({ ...form, username: v })} placeholder="usuario" disabled={!!editUser} testId="user-username-input" />
            <FormField label="Nombre completo" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} placeholder="Juan Garcia" testId="user-fullname-input" />
            <FormField label={editUser ? 'Nueva contrasena (vacio = mantener)' : 'Contrasena *'} value={form.password} onChange={v => setForm({ ...form, password: v })} type="password" testId="user-password-input" />
            <FormSelect label="Rol *" value={form.role} onChange={v => setForm({ ...form, role: v })} options={roles.map(r => ({ value: r.id, label: `${r.name} — ${r.desc}` }))} testId="user-role-select" />
          </div>
          <ChipSelect
            label="Marcas permitidas"
            options={ALL_BRANDS}
            selected={form.allowed_brands}
            onChange={v => setForm({ ...form, allowed_brands: v })}
            testId="user-brands-select"
          />
          <ChipSelect
            label="Islas permitidas"
            options={ALL_ISLANDS}
            selected={form.allowed_islands}
            onChange={v => setForm({ ...form, allowed_islands: v })}
            testId="user-islands-select"
          />
          <div className="modal-btns">
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} data-testid="save-user-btn"><Save size={16} /> Guardar</button>
          </div>
        </Modal>
      )}
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title"><UserCog size={18} /> Usuarios del Sistema</h2>
          <span className="count-badge">{users.length}</span>
        </div>
        <div className="users-grid">
          {users.map(u => {
            const isActive = u.is_active !== false;
            const ab = u.allowed_brands || [];
            const ai = u.allowed_islands || [];
            return (
              <div key={u.id} className={`user-card ${!isActive ? 'dimmed' : ''}`} data-testid={`user-card-${u.username}`}>
                <div className="user-card-top">
                  <div className="user-card-avatar" style={{ background: u.role === 'admin' ? 'linear-gradient(135deg,#E8A83E,#C49030)' : 'linear-gradient(135deg,#5B8DB8,#4A7CA7)' }}>
                    {(u.full_name || u.username)[0].toUpperCase()}
                  </div>
                  <div className="user-card-info">
                    <span className="user-card-name">{u.full_name || u.username}</span>
                    <span className="user-card-handle">@{u.username}</span>
                  </div>
                  <div className="user-card-btns">
                    <button className="tbl-btn" onClick={() => openEdit(u)} data-testid={`edit-user-${u.username}`}><Edit3 size={13} /></button>
                    {u.id !== currentUser?.id && (
                      <>
                        <button className="tbl-btn" onClick={() => handleToggle(u)} data-testid={`toggle-user-${u.username}`}>
                          {isActive ? <ToggleRight size={14} style={{ color: '#5B8DB8' }} /> : <ToggleLeft size={14} style={{ color: '#D4574E' }} />}
                        </button>
                        <button className="tbl-btn danger" onClick={() => handleDelete(u.id, u.username)} data-testid={`delete-user-${u.username}`}><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </div>
                <div className="user-card-tags">
                  <span className={`tag tag-${u.role}`}><Key size={10} />{u.role === 'admin' ? 'Admin' : u.role === 'operator' ? 'Operador' : 'Viewer'}</span>
                  <span className={`tag ${isActive ? 'tag-active' : 'tag-inactive'}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
                {(ab.length > 0 || ai.length > 0) && (
                  <div className="user-card-perms">
                    {ab.length > 0 && <div className="perm-row"><span className="perm-label">Marcas:</span>{ab.map(b => <span key={b} className="perm-chip">{ALL_BRANDS.find(x => x.id === b)?.name || b}</span>)}</div>}
                    {ai.length > 0 && <div className="perm-row"><span className="perm-label">Islas:</span>{ai.map(i => <span key={i} className="perm-chip">{ALL_ISLANDS.find(x => x.id === i)?.name || i}</span>)}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ NOC COMPETITIVE — PREMIUM 55" ═══════════════ */
function NOCView({ data, islandData: parentIslandData, embedded, onClose, onRefresh, loading, autoRefresh, setAutoRefresh, api }) {
  const islandStats = parentIslandData || {};
  const camerasTotal = data?.cameras_total || 0;
  const camerasOnline = data?.cameras_online || 0;
  const [nocTab, setNocTab] = useState('ranking');
  const [trendsData, setTrendsData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);

  // Auto-rotate between tabs every 30s
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setNocTab(prev => prev === 'ranking' ? 'historico' : 'ranking');
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const ranking = (data?.ranking || []).sort((a, b) => (b.entries || 0) - (a.entries || 0));
  const totalVisits = ranking.reduce((s, i) => s + (i.entries || 0), 0);
  const maxV = ranking[0]?.entries || 1;
  const maxI = Math.max(...Object.values(islandStats).map(i => i.total || 0), 1);
  const leaderI = Object.entries(islandStats).sort((a, b) => (b[1].total || 0) - (a[1].total || 0))[0];

  // Fetch trends + historical data when switching to historical tab
  useEffect(() => {
    if (nocTab === 'historico' && !trendsData) {
      api('get', '/ranking/trends').then(res => setTrendsData(res)).catch(() => {});
    }
    if (nocTab === 'historico' && !historicalData) {
      api('get', '/ranking/historical?days=7').then(res => setHistoricalData(res)).catch(() => {});
    }
  }, [nocTab, trendsData, historicalData, api]);

  // Build dealership (camera) ranking from brand data
  const dealerships = ranking.flatMap(brand =>
    (brand.cameras || []).map(cam => ({
      ...cam,
      brand_id: brand.brand_id,
      brand_name: brand.brand_name,
    }))
  ).sort((a, b) => (b.entries || 0) - (a.entries || 0));

  if (embedded) {
    return (
      <div className="view-wrap" data-testid="noc-competitivo">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card">
              <h2 className="card-title"><Award size={18} /> Podio de Honor</h2>
              <Podium ranking={ranking} />
            </div>
            {dealerships.length > 0 && (
              <div className="card">
                <h2 className="card-title"><Camera size={18} /> Ranking Concesionarios</h2>
                <DealershipRows dealerships={dealerships} light />
              </div>
            )}
            <div className="card">
              <h2 className="card-title"><BarChart3 size={18} /> Ranking Completo</h2>
              <RankingRows ranking={ranking} maxV={maxV} light />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}><MapPin size={18} /> Islas Canarias</h2>
            <IslandCards islandStats={islandStats} maxI={maxI} leaderI={leaderI} light />
            <div className="card" style={{ background: '#E8F1F8', textAlign: 'center', padding: '1rem', border: '1px solid #B8D4E8' }}>
              <span className="noc-sum-label" style={{ color: '#3A6A94' }}>Total Archipielago</span>
              <span className="noc-sum-val mono" style={{ color: '#4A7CA7' }}><AnimNum value={totalVisits} /></span>
              <span className="noc-sum-sub" style={{ color: '#3A6A94' }}>visitas hoy</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── FULLSCREEN NOC for 55" monitors ── */
  return (
    <div className="noc-full" data-testid="noc-competitivo">
      <div className="noc-bg">
        <div className="noc-orb o1" /><div className="noc-orb o2" /><div className="noc-orb o3" />
      </div>
      <div className="noc-inner">
        {/* Header */}
        <header className="noc-header">
          <div className="noc-header-left">
            <img src="/dag-logo.png" alt="DAG" className="noc-dag-logo" />
            <div className="noc-sep" />
            <div className="noc-header-title-group">
              <h1 className="noc-title">NOC Competitivo <Flame size={18} className="noc-flame" /></h1>
              <p className="noc-subtitle-text">Ranking en tiempo real — Domingo Alonso Group</p>
            </div>
          </div>
          <LiveClock />
          <div className="noc-header-right">
            <div className="noc-tab-toggle" data-testid="noc-tab-toggle">
              <button className={`noc-tab-btn ${nocTab === 'ranking' ? 'active' : ''}`} onClick={() => setNocTab('ranking')} data-testid="noc-tab-ranking">
                <Trophy size={13} /> Ranking
              </button>
              <button className={`noc-tab-btn ${nocTab === 'historico' ? 'active' : ''}`} onClick={() => setNocTab('historico')} data-testid="noc-tab-historico">
                <TrendingUp size={13} /> Historico
              </button>
            </div>
            <button className={`noc-ctrl-btn ${autoRotate ? 'active' : ''}`} onClick={() => setAutoRotate(!autoRotate)} data-testid="noc-auto-rotate" title="Auto-rotacion 30s">
              <Zap size={14} />
              <span>{autoRotate ? 'Auto' : 'Manual'}</span>
            </button>
            <div className="noc-total-box">
              <span className="noc-total-label">TOTAL VISITAS HOY</span>
              <span className="noc-total-num mono"><AnimNum value={totalVisits} /></span>
            </div>
            <button className={`noc-ctrl-btn ${autoRefresh ? 'active' : ''}`} onClick={() => setAutoRefresh(!autoRefresh)} data-testid="noc-auto-refresh">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{autoRefresh ? '30s' : 'Off'}</span>
            </button>
            {onClose && <button className="noc-close-btn" onClick={onClose} data-testid="noc-close"><X size={20} /></button>}
          </div>
        </header>

        {/* Main Content */}
        <div className="noc-body-55">
          {nocTab === 'ranking' ? (
            <>
              {/* Left area: Podium on top, then Ranking + Concesionarios side by side */}
              <div className="noc-left-area">
                <div className="noc-panel noc-podium-panel">
                  <div className="noc-panel-title"><Award size={16} className="gold-icon" /> PODIO DE HONOR</div>
                  <Podium ranking={ranking} dark />
                </div>
                <div className="noc-left-cols">
                  <div className="noc-panel" style={{ flex: 1 }}>
                    <div className="noc-panel-title"><BarChart3 size={16} /> RANKING EN VIVO</div>
                    <RankingRows ranking={ranking} maxV={maxV} />
                  </div>
                  {dealerships.length > 0 && (
                    <div className="noc-panel" style={{ flex: 1 }}>
                      <div className="noc-panel-title"><Camera size={16} /> CONCESIONARIOS</div>
                      <DealershipRows dealerships={dealerships} />
                    </div>
                  )}
                </div>
              </div>

              {/* Right area: Islands + System Health */}
              <div className="noc-right-area">
                <div className="noc-panel-title"><MapPin size={16} className="purple-icon" /> ISLAS CANARIAS</div>
                <IslandCards islandStats={islandStats} maxI={maxI} leaderI={leaderI} />
                <SystemHealthWidget camerasOnline={camerasOnline} camerasTotal={camerasTotal} />
                <div className="noc-summary-panel">
                  <span className="noc-sum-label">TOTAL ARCHIPIELAGO</span>
                  <span className="noc-sum-val mono"><AnimNum value={totalVisits} /></span>
                  <span className="noc-sum-sub">visitas hoy</span>
                </div>
              </div>
            </>
          ) : (
            <NOCHistorico trendsData={trendsData} historicalData={historicalData} ranking={ranking} />
          )}
        </div>

        {/* Footer */}
        <footer className="noc-footer">
          <span className="noc-foot-dag">Domingo Alonso Group</span>
          <div className="noc-foot-center">
            <img src="/siempria-logo.png" alt="" className="noc-foot-logo" />
          </div>
          <div className="noc-foot-right">
            <span>Desarrollado por</span>
            <span className="noc-foot-brand">Siempria</span>
            <span className="noc-foot-sep">|</span>
            <span>Tecnologia Mobotix</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ═══════════════ EXECUTIVE DASHBOARD ═══════════════ */
function ExecutiveView({ data, api }) {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({ brand_id: '', target_visits: '', label: '' });
  const [editingGoal, setEditingGoal] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [exportRange, setExportRange] = useState({ from: '', to: '' });
  const [exportBrand, setExportBrand] = useState('');
  const [exportIsland, setExportIsland] = useState('');
  const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

  const {
    today_total = 0, yesterday_total = 0, day_change_pct = 0,
    month_total = 0, daily_avg = 0, cameras_total = 0, cameras_online = 0,
    goals_progress = [], month = '',
    comparison_week = {}, comparison_month = {}
  } = data || {};

  const refreshGoals = useCallback(async () => {
    try {
      const res = await api('get', `/goals?month=${month || new Date().toISOString().slice(0, 7)}`);
      setGoals(res.data?.goals || []);
    } catch {}
  }, [api, month]);

  useEffect(() => { refreshGoals(); }, [refreshGoals]);

  const saveGoal = async () => {
    if (!newGoal.brand_id || !newGoal.target_visits) return;
    try {
      await api('post', '/goals', {
        brand_id: newGoal.brand_id,
        month: month || new Date().toISOString().slice(0, 7),
        target_visits: parseInt(newGoal.target_visits),
        label: newGoal.label
      });
      setShowGoalForm(false);
      setNewGoal({ brand_id: '', target_visits: '', label: '' });
      refreshGoals();
    } catch (err) { alert('Error: ' + (err.response?.data?.detail || err.message)); }
  };

  const updateGoal = async () => {
    if (!editingGoal) return;
    try {
      await api('post', '/goals', {
        brand_id: editingGoal.brand_id,
        month: month || new Date().toISOString().slice(0, 7),
        target_visits: parseInt(editingGoal.target_visits),
        label: editingGoal.label || ''
      });
      setEditingGoal(null);
      refreshGoals();
    } catch (err) { alert('Error: ' + (err.response?.data?.detail || err.message)); }
  };

  const deleteGoal = async (goalId) => {
    if (!window.confirm('Eliminar este objetivo?')) return;
    try {
      await api('delete', `/goals/${goalId}`);
      refreshGoals();
    } catch (err) { alert('Error: ' + (err.response?.data?.detail || err.message)); }
  };

  const getToken = () => {
    try { const a = JSON.parse(localStorage.getItem('conteo_auth')); return a?.token || ''; } catch { return ''; }
  };

  const exportCSV = () => {
    if (!exportRange.from || !exportRange.to) return alert('Selecciona fechas');
    let url = `${API_BASE}/analytics/export?from_date=${exportRange.from}&to_date=${exportRange.to}&token=${getToken()}`;
    if (exportBrand) url += `&brand_id=${exportBrand}`;
    if (exportIsland) url += `&island=${exportIsland}`;
    window.open(url);
  };

  return (
    <div className="exec-view" data-testid="executive-view">
      {/* KPI Cards Row */}
      <div className="exec-kpis">
        <div className="exec-kpi-card exec-kpi-primary" data-testid="exec-kpi-today">
          <div className="exec-kpi-icon"><Users size={22} /></div>
          <div className="exec-kpi-data">
            <span className="exec-kpi-val mono"><AnimNum value={today_total} /></span>
            <span className="exec-kpi-label">Visitas hoy</span>
          </div>
          <TrendBadge current={today_total} previous={yesterday_total} />
        </div>
        <div className="exec-kpi-card" data-testid="exec-kpi-yesterday">
          <div className="exec-kpi-icon" style={{color:'#94A3B8'}}><Clock size={22} /></div>
          <div className="exec-kpi-data">
            <span className="exec-kpi-val mono"><AnimNum value={yesterday_total} /></span>
            <span className="exec-kpi-label">Ayer</span>
          </div>
        </div>
        <div className="exec-kpi-card" data-testid="exec-kpi-month">
          <div className="exec-kpi-icon" style={{color:'#E8A83E'}}><TrendingUp size={22} /></div>
          <div className="exec-kpi-data">
            <span className="exec-kpi-val mono"><AnimNum value={month_total} /></span>
            <span className="exec-kpi-label">Este mes</span>
          </div>
          <span className="exec-kpi-sub">{daily_avg}/dia</span>
        </div>
        <div className="exec-kpi-card" data-testid="exec-kpi-cameras">
          <div className="exec-kpi-icon" style={{color:'#22c55e'}}><Camera size={22} /></div>
          <div className="exec-kpi-data">
            <span className="exec-kpi-val mono">{cameras_online}/{cameras_total}</span>
            <span className="exec-kpi-label">Camaras online</span>
          </div>
        </div>
      </div>

      <div className="exec-grid">
        {/* Comparison Cards */}
        <div className="exec-panel" data-testid="exec-comparison">
          <div className="exec-panel-title"><BarChart3 size={16} /> COMPARATIVA</div>
          <div className="exec-comp-cards">
            <div className="exec-comp-card">
              <span className="exec-comp-period">{comparison_week.label_current || 'Esta semana'}</span>
              <span className="exec-comp-val mono"><AnimNum value={comparison_week.current_total || 0} /></span>
              <div className="exec-comp-vs">
                <span>vs {comparison_week.label_previous || 'anterior'}: {(comparison_week.previous_total || 0).toLocaleString('es-ES')}</span>
                <TrendBadge current={comparison_week.current_total || 0} previous={comparison_week.previous_total || 0} />
              </div>
            </div>
            <div className="exec-comp-card">
              <span className="exec-comp-period">{comparison_month.label_current || 'Este mes'}</span>
              <span className="exec-comp-val mono"><AnimNum value={comparison_month.current_total || 0} /></span>
              <div className="exec-comp-vs">
                <span>vs {comparison_month.label_previous || 'anterior'}: {(comparison_month.previous_total || 0).toLocaleString('es-ES')}</span>
                <TrendBadge current={comparison_month.current_total || 0} previous={comparison_month.previous_total || 0} />
              </div>
            </div>
          </div>
          {(comparison_week.brand_comparison || []).length > 0 && (
            <div className="exec-brand-comp">
              <span className="exec-sub-title">Por marca (semana)</span>
              {comparison_week.brand_comparison.map(bc => {
                const brand = ALL_BRANDS.find(b => b.id === bc.brand_id);
                return (
                  <div key={bc.brand_id} className="exec-brand-row">
                    <BrandLogo brandId={bc.brand_id} size={20} />
                    <span className="exec-brand-name">{brand?.name || bc.brand_id}</span>
                    <span className="mono" style={{fontSize:'0.82rem'}}>{bc.current.toLocaleString('es-ES')}</span>
                    <TrendBadge current={bc.current} previous={bc.previous} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Goals Progress with CRUD */}
        <div className="exec-panel" data-testid="exec-goals">
          <div className="exec-panel-title">
            <Target size={16} style={{color:'#E8A83E'}} /> OBJETIVOS {month}
            <button className="exec-add-btn" onClick={() => { setShowGoalForm(!showGoalForm); setEditingGoal(null); }} data-testid="exec-add-goal">
              <Plus size={14} />
            </button>
          </div>
          {showGoalForm && (
            <div className="exec-goal-form" data-testid="goal-form">
              <select value={newGoal.brand_id} onChange={e => setNewGoal({...newGoal, brand_id: e.target.value})} className="heatmap-select" data-testid="goal-brand-select">
                <option value="">Marca...</option>
                {ALL_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input type="number" placeholder="Objetivo visitas" value={newGoal.target_visits}
                onChange={e => setNewGoal({...newGoal, target_visits: e.target.value})} className="heatmap-date" data-testid="goal-target-input" />
              <input type="text" placeholder="Etiqueta (opcional)" value={newGoal.label}
                onChange={e => setNewGoal({...newGoal, label: e.target.value})} className="heatmap-date" data-testid="goal-label-input" />
              <button onClick={saveGoal} className="heatmap-gen-btn" style={{padding:'0.4rem 0.8rem'}} data-testid="goal-save-btn"><Save size={14} /> Guardar</button>
            </div>
          )}
          {goals_progress.length > 0 ? goals_progress.map(g => {
            const brand = ALL_BRANDS.find(b => b.id === g.brand_id);
            const color = g.pct >= 100 ? '#22c55e' : g.pct >= 60 ? '#E8A83E' : '#ef4444';
            const goalDoc = goals.find(gl => gl.brand_id === g.brand_id);
            const isEditing = editingGoal?.brand_id === g.brand_id;
            return (
              <div key={g.brand_id} className="exec-goal-row" data-testid={`goal-${g.brand_id}`}>
                <div className="exec-goal-header">
                  <BrandLogo brandId={g.brand_id} size={24} />
                  <span className="exec-goal-brand">{brand?.name || g.brand_id}</span>
                  <span className="exec-goal-pct mono" style={{color}}>{g.pct}%</span>
                  <div className="exec-goal-actions">
                    <button className="exec-goal-action-btn" onClick={() => setEditingGoal(isEditing ? null : { brand_id: g.brand_id, target_visits: g.target, label: g.label || '' })} data-testid={`goal-edit-${g.brand_id}`} title="Editar">
                      <Edit3 size={12} />
                    </button>
                    {goalDoc && (
                      <button className="exec-goal-action-btn del" onClick={() => deleteGoal(goalDoc.goal_id)} data-testid={`goal-delete-${g.brand_id}`} title="Eliminar">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div className="exec-goal-edit-form" data-testid={`goal-edit-form-${g.brand_id}`}>
                    <input type="number" value={editingGoal.target_visits} onChange={e => setEditingGoal({...editingGoal, target_visits: e.target.value})} className="heatmap-date" placeholder="Nuevo objetivo" />
                    <input type="text" value={editingGoal.label} onChange={e => setEditingGoal({...editingGoal, label: e.target.value})} className="heatmap-date" placeholder="Etiqueta" />
                    <button onClick={updateGoal} className="heatmap-gen-btn" style={{padding:'0.3rem 0.6rem', fontSize:'0.72rem'}}><Check size={12} /> Aplicar</button>
                  </div>
                )}
                <div className="exec-goal-bar-bg">
                  <div className="exec-goal-bar" style={{width: `${Math.min(g.pct, 100)}%`, background: color}} />
                  {g.projected_pct > 0 && g.projected_pct < 200 && (
                    <div className="exec-goal-projected" style={{left: `${Math.min(g.projected_pct, 100)}%`}} title={`Proyeccion: ${g.projected_pct}%`} />
                  )}
                </div>
                <div className="exec-goal-details">
                  <span>{g.actual.toLocaleString('es-ES')} / {g.target.toLocaleString('es-ES')}</span>
                  <span style={{color: g.projected_pct >= 100 ? '#22c55e' : '#E8A83E'}}>
                    Proyeccion: {g.projected.toLocaleString('es-ES')} ({g.projected_pct}%)
                  </span>
                </div>
              </div>
            );
          }) : <p className="hm-hist-empty">Sin objetivos definidos. Pulsa + para crear uno.</p>}
        </div>

        {/* Export Panel with Filters */}
        <div className="exec-panel exec-export-panel" data-testid="exec-export">
          <div className="exec-panel-title"><FileSpreadsheet size={16} /> EXPORTAR DATOS</div>
          <div className="exec-export-form">
            <div className="heatmap-ctrl-group">
              <label className="heatmap-label">Desde</label>
              <input type="date" className="heatmap-date" value={exportRange.from}
                onChange={e => setExportRange({...exportRange, from: e.target.value})} data-testid="export-from" />
            </div>
            <div className="heatmap-ctrl-group">
              <label className="heatmap-label">Hasta</label>
              <input type="date" className="heatmap-date" value={exportRange.to}
                onChange={e => setExportRange({...exportRange, to: e.target.value})} data-testid="export-to" />
            </div>
            <div className="heatmap-ctrl-group">
              <label className="heatmap-label">Marca</label>
              <select className="heatmap-select" value={exportBrand} onChange={e => setExportBrand(e.target.value)} data-testid="export-brand-filter">
                <option value="">Todas</option>
                {ALL_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="heatmap-ctrl-group">
              <label className="heatmap-label">Isla</label>
              <select className="heatmap-select" value={exportIsland} onChange={e => setExportIsland(e.target.value)} data-testid="export-island-filter">
                <option value="">Todas</option>
                {ALL_ISLANDS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <button className="heatmap-gen-btn" onClick={exportCSV} data-testid="export-btn">
              <Download size={14} /> Descargar CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ PRESENTATION MODE ═══════════════ */
function PresentationMode({ data, api }) {
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [trendsData, setTrendsData] = useState(null);

  const {
    today_total = 0, yesterday_total = 0,
    month_total = 0, daily_avg = 0, cameras_total = 0, cameras_online = 0,
    goals_progress = [], month = '',
    comparison_week = {}, comparison_month = {}
  } = data || {};

  useEffect(() => {
    api('get', '/ranking/trends').then(res => setTrendsData(res.data)).catch(() => {});
  }, [api]);

  const totalSlides = 4;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setSlide(prev => (prev + 1) % totalSlides);
    }, 12000);
    return () => clearInterval(timer);
  }, [playing]);

  const nextSlide = () => setSlide(prev => (prev + 1) % totalSlides);
  const prevSlide = () => setSlide(prev => (prev - 1 + totalSlides) % totalSlides);

  const slideNames = ['Resumen del Dia', 'Comparativa Temporal', 'Objetivos del Mes', 'Tendencias'];

  const hourlyData = (trendsData?.hourly_today || []).filter(h => h.hour <= new Date().getHours());
  const brandHourly = trendsData?.brand_hourly || {};
  const brandKeys = Object.keys(brandHourly);

  const DarkPresentTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(91,141,184,0.3)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(10px)' }}>
        <p style={{ color: '#7EB3D6', fontSize: '0.72rem', marginBottom: 3, fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#E2E8F0', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {p.name ? `${p.name}: ` : ''}{p.value.toLocaleString('es-ES')}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="pres-mode" data-testid="presentation-mode">
      <div className="pres-bg">
        <div className="pres-orb po1" /><div className="pres-orb po2" /><div className="pres-orb po3" /><div className="pres-orb po4" />
      </div>
      <div className="pres-inner">
        {/* Header */}
        <header className="pres-header">
          <div className="pres-header-left">
            <img src="/dag-logo.png" alt="DAG" className="pres-logo" />
            <div className="pres-sep" />
            <div>
              <h1 className="pres-title">Informe de Visitas</h1>
              <p className="pres-sub">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="pres-controls">
            <button className="pres-ctrl-btn" onClick={prevSlide} data-testid="pres-prev"><ChevronLeft size={16} /></button>
            <button className={`pres-ctrl-btn ${playing ? 'active' : ''}`} onClick={() => setPlaying(!playing)} data-testid="pres-play-pause">
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button className="pres-ctrl-btn" onClick={nextSlide} data-testid="pres-next"><ChevronRight size={16} /></button>
            <span className="pres-slide-info mono">{slide + 1}/{totalSlides}</span>
          </div>
          <LiveClock />
        </header>

        {/* Slide Indicators */}
        <div className="pres-indicators">
          {slideNames.map((name, i) => (
            <button key={i} className={`pres-dot ${slide === i ? 'active' : ''}`} onClick={() => setSlide(i)} data-testid={`pres-slide-${i}`}>
              <span className="pres-dot-label">{name}</span>
              <div className="pres-dot-bar"><div className="pres-dot-fill" style={{ width: slide === i && playing ? '100%' : slide === i ? '100%' : '0%', transition: slide === i && playing ? 'width 12s linear' : 'width 0.3s ease' }} /></div>
            </button>
          ))}
        </div>

        {/* Slide Content */}
        <div className="pres-slide-container">
          {/* Slide 0: Daily Summary */}
          {slide === 0 && (
            <div className="pres-slide pres-slide-summary" data-testid="pres-slide-summary">
              <div className="pres-hero-kpi">
                <div className="pres-hero-icon"><Users size={48} /></div>
                <div className="pres-hero-num mono"><AnimNum value={today_total} /></div>
                <div className="pres-hero-label">VISITAS HOY</div>
                <TrendBadge current={today_total} previous={yesterday_total} />
              </div>
              <div className="pres-kpi-row">
                <div className="pres-kpi-box">
                  <Clock size={20} style={{color:'#94A3B8'}} />
                  <span className="pres-kpi-num mono"><AnimNum value={yesterday_total} /></span>
                  <span className="pres-kpi-txt">Ayer</span>
                </div>
                <div className="pres-kpi-box">
                  <TrendingUp size={20} style={{color:'#E8A83E'}} />
                  <span className="pres-kpi-num mono"><AnimNum value={month_total} /></span>
                  <span className="pres-kpi-txt">Este mes</span>
                </div>
                <div className="pres-kpi-box">
                  <Activity size={20} style={{color:'#8B5CF6'}} />
                  <span className="pres-kpi-num mono"><AnimNum value={daily_avg} /></span>
                  <span className="pres-kpi-txt">Media/dia</span>
                </div>
                <div className="pres-kpi-box">
                  <Camera size={20} style={{color:'#22c55e'}} />
                  <span className="pres-kpi-num mono">{cameras_online}/{cameras_total}</span>
                  <span className="pres-kpi-txt">Camaras</span>
                </div>
              </div>
              {hourlyData.length > 1 && (
                <div className="pres-chart-area">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={hourlyData} margin={{top: 10, right: 20, left: -15, bottom: 0}}>
                      <defs>
                        <linearGradient id="presGrad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5B8DB8" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#5B8DB8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="label" tick={{fontSize:11, fill:'#64748B'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize:11, fill:'#64748B'}} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkPresentTooltip />} />
                      <Area type="monotone" dataKey="entries" stroke="#5B8DB8" strokeWidth={3} fill="url(#presGrad1)" dot={false}
                        activeDot={{r:5, fill:'#5B8DB8', stroke:'#0A0F1E', strokeWidth:2}} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Slide 1: Temporal Comparison */}
          {slide === 1 && (
            <div className="pres-slide pres-slide-comparison" data-testid="pres-slide-comparison">
              <h2 className="pres-slide-title">Comparativa Temporal</h2>
              <div className="pres-comp-grid">
                <div className="pres-comp-block">
                  <div className="pres-comp-header">SEMANAL</div>
                  <div className="pres-comp-nums">
                    <div className="pres-comp-main">
                      <span className="pres-comp-big mono"><AnimNum value={comparison_week.current_total || 0} /></span>
                      <span className="pres-comp-lbl">{comparison_week.label_current || 'Esta semana'}</span>
                    </div>
                    <div className="pres-comp-vs-block">
                      <span className="pres-comp-vs-num mono">{(comparison_week.previous_total || 0).toLocaleString('es-ES')}</span>
                      <span className="pres-comp-vs-lbl">{comparison_week.label_previous || 'Anterior'}</span>
                    </div>
                  </div>
                  <div className="pres-comp-trend">
                    <TrendBadge current={comparison_week.current_total || 0} previous={comparison_week.previous_total || 0} />
                  </div>
                </div>
                <div className="pres-comp-block">
                  <div className="pres-comp-header">MENSUAL</div>
                  <div className="pres-comp-nums">
                    <div className="pres-comp-main">
                      <span className="pres-comp-big mono"><AnimNum value={comparison_month.current_total || 0} /></span>
                      <span className="pres-comp-lbl">{comparison_month.label_current || 'Este mes'}</span>
                    </div>
                    <div className="pres-comp-vs-block">
                      <span className="pres-comp-vs-num mono">{(comparison_month.previous_total || 0).toLocaleString('es-ES')}</span>
                      <span className="pres-comp-vs-lbl">{comparison_month.label_previous || 'Anterior'}</span>
                    </div>
                  </div>
                  <div className="pres-comp-trend">
                    <TrendBadge current={comparison_month.current_total || 0} previous={comparison_month.previous_total || 0} />
                  </div>
                </div>
              </div>
              {(comparison_week.brand_comparison || []).length > 0 && (
                <div className="pres-brand-table">
                  <div className="pres-brand-table-header">
                    <span>Marca</span><span>Actual</span><span>Anterior</span><span>Variacion</span>
                  </div>
                  {comparison_week.brand_comparison.slice(0, 6).map(bc => {
                    const brand = ALL_BRANDS.find(b => b.id === bc.brand_id);
                    return (
                      <div key={bc.brand_id} className="pres-brand-table-row">
                        <div className="pres-brand-cell"><BrandLogo brandId={bc.brand_id} size={22} /><span>{brand?.name || bc.brand_id}</span></div>
                        <span className="mono">{bc.current.toLocaleString('es-ES')}</span>
                        <span className="mono" style={{color:'#64748B'}}>{bc.previous.toLocaleString('es-ES')}</span>
                        <TrendBadge current={bc.current} previous={bc.previous} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Slide 2: Goals */}
          {slide === 2 && (
            <div className="pres-slide pres-slide-goals" data-testid="pres-slide-goals">
              <h2 className="pres-slide-title">Objetivos del Mes — {month}</h2>
              {goals_progress.length > 0 ? (
                <div className="pres-goals-grid">
                  {goals_progress.map(g => {
                    const brand = ALL_BRANDS.find(b => b.id === g.brand_id);
                    const color = g.pct >= 100 ? '#22c55e' : g.pct >= 60 ? '#E8A83E' : '#ef4444';
                    return (
                      <div key={g.brand_id} className="pres-goal-card" data-testid={`pres-goal-${g.brand_id}`}>
                        <div className="pres-goal-top">
                          <BrandLogo brandId={g.brand_id} size={32} />
                          <span className="pres-goal-name">{brand?.name || g.brand_id}</span>
                          <span className="pres-goal-pct mono" style={{color}}>{g.pct}%</span>
                        </div>
                        <div className="pres-goal-bar-outer">
                          <div className="pres-goal-bar-fill" style={{width: `${Math.min(g.pct, 100)}%`, background: `linear-gradient(90deg, ${color}dd, ${color})`}} />
                        </div>
                        <div className="pres-goal-nums">
                          <span><strong>{g.actual.toLocaleString('es-ES')}</strong> / {g.target.toLocaleString('es-ES')}</span>
                          <span style={{color: g.projected_pct >= 100 ? '#22c55e' : '#E8A83E'}}>
                            Proyeccion: {g.projected.toLocaleString('es-ES')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="pres-empty">
                  <Target size={48} style={{color:'#334155'}} />
                  <p>Sin objetivos definidos para este mes</p>
                  <p style={{fontSize:'0.82rem', color:'#475569'}}>Defina objetivos desde el panel Ejecutivo</p>
                </div>
              )}
            </div>
          )}

          {/* Slide 3: Trends */}
          {slide === 3 && (
            <div className="pres-slide pres-slide-trends" data-testid="pres-slide-trends">
              <h2 className="pres-slide-title">Tendencias por Marca</h2>
              {brandKeys.length > 0 && hourlyData.length > 1 ? (
                <>
                  <div className="pres-chart-large">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart margin={{top: 10, right: 20, left: -15, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="label" tick={{fontSize:11, fill:'#64748B'}} axisLine={false} tickLine={false}
                          data={hourlyData} />
                        <YAxis tick={{fontSize:11, fill:'#64748B'}} axisLine={false} tickLine={false} />
                        <Tooltip content={<DarkPresentTooltip />} />
                        {brandKeys.map(bid => {
                          const bData = (brandHourly[bid] || []).filter(h => h.hour <= new Date().getHours());
                          return (
                            <Line key={bid} data={bData} dataKey="entries" name={ALL_BRANDS.find(b => b.id === bid)?.name || bid}
                              stroke={BRAND_COLORS[bid] || '#5B8DB8'} strokeWidth={2.5} dot={false}
                              activeDot={{r:4, strokeWidth:2}} />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="pres-legend">
                    {brandKeys.map(bid => {
                      const brand = ALL_BRANDS.find(b => b.id === bid);
                      return (
                        <span key={bid} className="pres-legend-item">
                          <span className="pres-legend-dot" style={{background: BRAND_COLORS[bid] || '#5B8DB8'}} />
                          {brand?.name || bid}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="pres-empty">
                  <TrendingUp size={48} style={{color:'#334155'}} />
                  <p>Cargando datos de tendencias...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="pres-footer">
          <span>Domingo Alonso Group</span>
          <div className="pres-footer-center">
            <img src="/siempria-logo.png" alt="" className="pres-foot-logo" />
            <span>Siempria</span>
          </div>
          <span className="pres-footer-conf">Confidencial — Solo uso interno</span>
        </footer>
      </div>
    </div>
  );
}

/* ═══════════════ HEATMAP VIEW ═══════════════ */
function HeatmapView({ data, api, onRefresh }) {
  const [cameras, setCameras] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedCam, setSelectedCam] = useState('');
  const [rangeType, setRangeType] = useState('yesterday');
  const [customDate, setCustomDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [viewingHeatmap, setViewingHeatmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

  // Fetch cameras and history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [camRes, histRes] = await Promise.all([
          api('get', '/heatmap/cameras'),
          api('get', '/heatmap/history?limit=50')
        ]);
        const cams = camRes.data?.cameras || [];
        setCameras(cams);
        setHistory(histRes.data?.heatmaps || []);
        if (cams.length > 0) setSelectedCam(cams[0].camera_id);
        if (histRes.data?.heatmaps?.length > 0) setViewingHeatmap(histRes.data.heatmaps[0].heatmap_id);
      } catch (err) { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [api]);

  const ranges = [
    { id: 'today', label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mes' },
    { id: 'custom', label: 'Fecha Especifica' },
  ];

  const generateHeatmap = async () => {
    if (!selectedCam) return;
    setGenerating(true);
    try {
      let url = `/heatmap/generate?camera_id=${selectedCam}&range_type=${rangeType}`;
      if (rangeType === 'custom' && customDate) url += `&custom_date=${customDate}`;
      const res = await api('post', url);
      setHistory(prev => [res.data, ...prev]);
      setViewingHeatmap(res.data.heatmap_id);
    } catch (err) {
      alert('Error generando heatmap: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const deleteHeatmap = async (id) => {
    try {
      await api('delete', `/heatmap/${id}`);
      setHistory(prev => prev.filter(h => h.heatmap_id !== id));
      if (viewingHeatmap === id) setViewingHeatmap(null);
    } catch (err) { /* ignore */ }
  };

  const getToken = () => {
    try { const a = JSON.parse(localStorage.getItem('conteo_auth')); return a?.token || ''; } catch { return ''; }
  };

  if (loading) return (
    <div className="empty-state">
      <RefreshCw size={32} className="spin" style={{ color: '#5B8DB8' }} />
      <p style={{ marginTop: 12 }}>Cargando camaras...</p>
    </div>
  );

  if (cameras.length === 0) return (
    <div className="empty-state" data-testid="heatmap-no-cameras">
      <Flame size={48} style={{ color: '#64748B', marginBottom: 16 }} />
      <h3>Sin camaras con Heatmap</h3>
      <p>Configura el perfil de heatmap (heatmap_profile) en las camaras para activar esta funcion.</p>
    </div>
  );

  return (
    <div className="heatmap-view" data-testid="heatmap-view">
      {/* Controls */}
      <div className="heatmap-controls">
        <div className="heatmap-ctrl-group">
          <label className="heatmap-label">Camara</label>
          <select className="heatmap-select" value={selectedCam} onChange={e => setSelectedCam(e.target.value)} data-testid="heatmap-camera-select">
            {cameras.map(c => <option key={c.camera_id} value={c.camera_id}>{c.camera_name} ({c.island})</option>)}
          </select>
        </div>
        <div className="heatmap-ctrl-group">
          <label className="heatmap-label">Periodo</label>
          <div className="heatmap-range-btns">
            {ranges.map(r => (
              <button key={r.id} className={`hm-range-btn ${rangeType === r.id ? 'active' : ''}`}
                onClick={() => setRangeType(r.id)} data-testid={`heatmap-range-${r.id}`}>{r.label}</button>
            ))}
          </div>
        </div>
        {rangeType === 'custom' && (
          <div className="heatmap-ctrl-group">
            <label className="heatmap-label">Fecha</label>
            <input type="date" className="heatmap-date" value={customDate} onChange={e => setCustomDate(e.target.value)} data-testid="heatmap-custom-date" />
          </div>
        )}
        <button className="heatmap-gen-btn" onClick={generateHeatmap} disabled={generating} data-testid="heatmap-generate-btn">
          {generating ? <><RefreshCw size={14} className="spin" /> Generando...</> : <><Flame size={14} /> Generar Heatmap</>}
        </button>
      </div>

      <div className="heatmap-layout">
        {/* Viewer */}
        <div className="heatmap-viewer" data-testid="heatmap-viewer">
          {viewingHeatmap ? (
            <img src={`${API_BASE}/heatmap/image/${viewingHeatmap}?token=${getToken()}`}
              alt="Heatmap" className="heatmap-image" data-testid="heatmap-image" />
          ) : (
            <div className="heatmap-placeholder">
              <Flame size={56} />
              <p>Selecciona un heatmap del historial o genera uno nuevo</p>
            </div>
          )}
        </div>

        {/* History */}
        <div className="heatmap-history" data-testid="heatmap-history">
          <div className="heatmap-hist-title">
            <Database size={14} /> Historial ({history.length})
          </div>
          <div className="heatmap-hist-list">
            {history.map(hm => (
              <div key={hm.heatmap_id}
                className={`heatmap-hist-card ${viewingHeatmap === hm.heatmap_id ? 'active' : ''}`}
                onClick={() => setViewingHeatmap(hm.heatmap_id)}>
                <div className="hm-hist-info">
                  <span className="hm-hist-cam">{hm.camera_name || hm.camera_id}</span>
                  <span className="hm-hist-range">{hm.range_type} {hm.custom_range ? `(${hm.custom_range})` : ''}</span>
                  <span className="hm-hist-date">{new Date(hm.generated_at).toLocaleString('es-ES')}</span>
                </div>
                <button className="hm-hist-del" onClick={e => { e.stopPropagation(); deleteHeatmap(hm.heatmap_id); }} title="Eliminar">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {history.length === 0 && <p className="hm-hist-empty">Sin heatmaps almacenados</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── NOC Historical View ── */
function NOCHistorico({ trendsData, historicalData, ranking }) {
  const currentHour = new Date().getHours();
  const { hourly_today = [], daily_week = [], brand_hourly = {} } = trendsData || {};

  const totalToday = historicalData?.today_total || hourly_today.reduce((s, h) => s + h.entries, 0);
  const peakHour = hourly_today.reduce((max, h) => h.entries > (max?.entries || 0) ? h : max, hourly_today[0]);
  const avgHourly = currentHour > 0 ? Math.round(totalToday / currentHour) : 0;
  const chartHourly = (historicalData?.today_hourly?.length > 0 ? historicalData.today_hourly : hourly_today).filter(h => h.hour <= currentHour);
  const brandKeys = Object.keys(brand_hourly);

  // Historical comparison data
  const yesterdayTotal = historicalData?.yesterday_total || 0;
  const trendPct = historicalData?.trend_pct || 0;
  const readingsStored = historicalData?.readings_stored || 0;
  const dailySeries = historicalData?.daily_series || daily_week;

  const DarkTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px' }}>
        <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginBottom: 2 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#E2E8F0', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {p.name ? `${p.name}: ` : ''}{p.value.toLocaleString('es-ES')} visitas
          </p>
        ))}
      </div>
    );
  };

  if (!trendsData) return (
    <div className="noc-historico-loading">
      <RefreshCw size={24} className="spin" style={{ color: '#5B8DB8' }} />
      <p style={{ color: '#94A3B8', marginTop: '0.75rem' }}>Cargando datos historicos...</p>
    </div>
  );

  return (
    <div className="noc-historico" data-testid="noc-historico">
      {/* KPI Row */}
      <div className="noc-hist-kpis">
        <div className="noc-hist-kpi">
          <Users size={16} style={{ color: '#5B8DB8' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="noc-hist-kpi-val mono"><AnimNum value={totalToday} /></span>
              <TrendBadge current={totalToday} previous={yesterdayTotal} />
            </div>
            <span className="noc-hist-kpi-label">Total hoy</span>
          </div>
        </div>
        <div className="noc-hist-kpi">
          <TrendingUp size={16} style={{ color: '#E8A83E' }} />
          <div>
            <span className="noc-hist-kpi-val mono">{peakHour ? `${peakHour.hour}:00` : '--'}</span>
            <span className="noc-hist-kpi-label">Hora pico ({peakHour?.entries || 0})</span>
          </div>
        </div>
        <div className="noc-hist-kpi">
          <Activity size={16} style={{ color: '#8B5CF6' }} />
          <div>
            <span className="noc-hist-kpi-val mono"><AnimNum value={avgHourly} /></span>
            <span className="noc-hist-kpi-label">Media/hora</span>
          </div>
        </div>
        <div className="noc-hist-kpi">
          <Database size={16} style={{ color: '#22c55e' }} />
          <div>
            <span className="noc-hist-kpi-val mono">{readingsStored.toLocaleString('es-ES')}</span>
            <span className="noc-hist-kpi-label">Lecturas almacenadas</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="noc-hist-charts">
        {/* Hourly chart — today vs yesterday */}
        <div className="noc-panel noc-hist-chart-panel">
          <div className="noc-panel-title"><TrendingUp size={16} style={{ color: '#5B8DB8' }} /> FLUJO HORARIO — HOY vs AYER</div>
          <div style={{ width: '100%', height: 220, minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartHourly} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="nocGradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5B8DB8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5B8DB8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                {(historicalData?.yesterday_hourly || []).length > 0 && (
                  <Area type="monotone" data={historicalData.yesterday_hourly} dataKey="entries" name="Ayer"
                    stroke="#64748B" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
                )}
                <Area type="monotone" dataKey="entries" name="Hoy" stroke="#5B8DB8" strokeWidth={2.5} fill="url(#nocGradBlue)" dot={false}
                  activeDot={{ r: 4, fill: '#5B8DB8', stroke: '#0F172A', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily chart — from stored data */}
        <div className="noc-panel noc-hist-chart-panel">
          <div className="noc-panel-title"><BarChart3 size={16} style={{ color: '#E8A83E' }} /> VISITAS POR DIA — SEMANA</div>
          <div style={{ width: '100%', height: 220, minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="entries" name="Visitas" fill="#E8A83E" radius={[4, 4, 0, 0]} maxBarSize={40} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Brand comparison chart */}
        {brandKeys.length > 0 && (
          <div className="noc-panel noc-hist-chart-panel noc-hist-chart-wide">
            <div className="noc-panel-title"><Flame size={16} style={{ color: '#ef4444' }} /> COMPARATIVA POR MARCA</div>
            <div style={{ width: '100%', height: 220, minWidth: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false}
                    data={hourly_today.filter(h => h.hour <= currentHour)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  {brandKeys.map(bid => {
                    const brand = ALL_BRANDS.find(b => b.id === bid);
                    const bData = (brand_hourly[bid] || []).filter(h => h.hour <= currentHour);
                    return (
                      <Line key={bid} data={bData} dataKey="entries" name={brand?.name || bid}
                        stroke={BRAND_COLORS[bid] || '#5B8DB8'} strokeWidth={2.5} dot={false} />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="noc-hist-legend">
              {brandKeys.map(bid => {
                const brand = ALL_BRANDS.find(b => b.id === bid);
                return (
                  <span key={bid} className="noc-hist-legend-item">
                    <span className="noc-hist-legend-dot" style={{ background: BRAND_COLORS[bid] || '#5B8DB8' }} />
                    {brand?.name || bid}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── NOC Sub-Components ── */
function Podium({ ranking, dark }) {
  const medals = [
    { accent: '#E8A83E', bg: 'rgba(232,168,62,0.08)', border: 'rgba(232,168,62,0.25)', label: '1er' },
    { accent: '#94A3B8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.18)', label: '2do' },
    { accent: '#CD7F32', bg: 'rgba(205,127,50,0.06)', border: 'rgba(205,127,50,0.18)', label: '3er' },
  ];
  const top3 = ranking.slice(0, 3);
  if (top3.length === 0) return <div className="noc-empty"><Trophy size={32} /><p>Esperando datos...</p></div>;

  return (
    <div className="podium-cards">
      {top3.map((item, i) => {
        const m = medals[i];
        return (
          <div key={item.brand_id} className={`podium-card ${i === 0 ? 'podium-leader' : ''}`}
            style={{ background: m.bg, borderColor: m.border }}
            data-testid={`podium-rank-${i + 1}`}>
            <div className="podium-card-accent" style={{ background: m.accent }} />
            <div className="podium-card-rank" style={{ color: m.accent }}>{m.label}</div>
            <div className="podium-card-logo">
              <BrandLogo brandId={item.brand_id} size={i === 0 ? 44 : 36} />
            </div>
            <div className="podium-card-info">
              <span className="podium-card-name" style={!dark ? { color: '#1A2332' } : undefined}>{item.brand_name}</span>
              <span className="podium-card-count mono" style={{ color: m.accent }}>
                <AnimNum value={item.entries || 0} />
                <span className="podium-card-unit">visitas</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankingRows({ ranking, maxV, light }) {
  if (ranking.length === 0) {
    return <div className="noc-empty"><Trophy size={32} /><p>Esperando datos de camaras...</p></div>;
  }
  return (
    <div className="noc-rank-rows">
      {ranking.slice(0, 8).map((item, i) => (
        <div key={item.brand_id} className={`noc-rank-row ${i === 0 ? 'leader' : ''}`} data-testid={`noc-rank-${item.brand_id}`}>
          <span className={`noc-rk-pos p-${i + 1}`}>{i + 1}</span>
          <div className="noc-rk-logo"><BrandLogo brandId={item.brand_id} size={28} /></div>
          <span className="noc-rk-name" style={light ? { color: '#1A2332' } : undefined}>{item.brand_name}</span>
          <div className="noc-rk-bar-bg" style={light ? { background: '#E2E6EC' } : undefined}>
            <div className="noc-rk-bar" style={{ width: `${((item.entries || 0) / maxV) * 100}%`, background: i === 0 ? '#E8A83E' : '#5B8DB8' }} />
          </div>
          <span className={`noc-rk-val mono ${i === 0 ? 'gold' : ''}`} style={light ? { color: i === 0 ? '#C49030' : '#1A2332' } : undefined}>
            <AnimNum value={item.entries || 0} />
          </span>
        </div>
      ))}
    </div>
  );
}

function IslandCards({ islandStats, maxI, leaderI, light }) {
  return (
    <div className="noc-islands">
      {ALL_ISLANDS.map(island => {
        const stats = islandStats[island.id] || { total: 0 };
        const isLdr = leaderI && leaderI[0] === island.id && stats.total > 0;
        return (
          <div
            key={island.id}
            className={`noc-island ${isLdr ? 'island-leader' : ''} ${stats.total === 0 ? 'island-zero' : ''}`}
            style={light ? { background: '#F5F7FA', border: '1px solid #E2E6EC' } : undefined}
            data-testid={`island-${island.id}`}
          >
            {isLdr && <Crown size={14} className="island-crown-ico" />}
            <div className="island-visual">
              <IslandSilhouette island={island.id} size={48} active={stats.total > 0} color={island.color} />
              <div className="island-badge" style={{ background: island.color }}>{island.short}</div>
            </div>
            <div className="island-data">
              <span className="island-name" style={light ? { color: '#1A2332' } : undefined}>{island.name}</span>
              <span className={`island-total mono ${isLdr ? 'gold' : ''}`} style={light ? { color: '#1A2332' } : undefined}>
                <AnimNum value={stats.total || 0} />
              </span>
            </div>
            <div className="island-bar-bg" style={light ? { background: '#E2E6EC' } : undefined}>
              <div className="island-bar" style={{ width: `${maxI > 0 ? (stats.total / maxI) * 100 : 0}%`, background: island.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════ DEALERSHIP ROWS ═══════════════ */
function DealershipRows({ dealerships, light }) {
  if (!dealerships || dealerships.length === 0) {
    return <div className={`noc-empty ${light ? 'light' : ''}`}><Camera size={24} /><p>Sin datos de concesionarios</p></div>;
  }
  const maxD = dealerships[0]?.entries || 1;
  return (
    <div className="noc-dealer-rows" data-testid="dealership-ranking">
      {dealerships.slice(0, 10).map((d, i) => (
        <div key={d.camera_id} className={`noc-dealer-row ${i === 0 ? 'leader' : ''}`} data-testid={`dealer-row-${d.camera_id}`}>
          <span className={`noc-dl-pos ${i < 3 ? `p-${i + 1}` : ''}`}>{i + 1}</span>
          <div className="noc-dl-logo"><BrandLogo brandId={d.brand_id} size={22} /></div>
          <div className="noc-dl-info">
            <span className="noc-dl-name" style={light ? { color: '#1A2332' } : undefined}>{d.camera_name || d.camera_id}</span>
            <span className="noc-dl-brand" style={light ? { color: '#94A0B0' } : undefined}>{d.brand_name}</span>
          </div>
          <div className="noc-dl-bar-bg" style={light ? { background: '#E2E6EC' } : undefined}>
            <div className="noc-dl-bar" style={{ width: `${((d.entries || 0) / maxD) * 100}%`, background: BRAND_COLORS[d.brand_id] || '#5B8DB8' }} />
          </div>
          <span className={`noc-dl-val mono ${i === 0 ? 'gold' : ''}`} style={light ? { color: i === 0 ? '#C49030' : '#1A2332' } : undefined}>
            <AnimNum value={d.entries || 0} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ SHARED COMPONENTS ═══════════════ */
function EmptyState({ text }) {
  return <div className="empty-box" data-testid="empty-state"><BarChart3 size={32} /><p>{text}</p></div>;
}
function LoadingState() {
  return <div className="loading-box"><RefreshCw size={28} className="spin" /><p>Cargando datos...</p></div>;
}
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-bg" onClick={onClose} data-testid="modal-overlay">
      <div className={`modal-box ${wide ? 'modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h3>{title}</h3>
          <button onClick={onClose} data-testid="modal-close"><X size={18} /></button>
        </div>
        <div className="modal-inner">{children}</div>
      </div>
    </div>
  );
}
function FormField({ label, value, onChange, placeholder, disabled, type = 'text', testId }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input data-testid={testId} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
    </div>
  );
}
function FormSelect({ label, value, onChange, options, testId }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <select data-testid={testId} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ═══════════════ APP ═══════════════ */
export default function App() {
  const [auth, setAuth] = useState(() => {
    const s = localStorage.getItem('conteo_auth');
    return s ? JSON.parse(s) : null;
  });
  const handleLogin = (d) => {
    const a = { token: d.token, user: d.user };
    localStorage.setItem('conteo_auth', JSON.stringify(a));
    setAuth(a);
  };
  const handleLogout = () => {
    localStorage.removeItem('conteo_auth');
    setAuth(null);
  };

  if (!auth) return <LoginPage onLogin={handleLogin} />;
  return <Dashboard token={auth.token} user={auth.user} onLogout={handleLogout} />;
}
