import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  LogIn, Lock, User, Eye, EyeOff, LogOut, RefreshCw, Users, BarChart3,
  Camera, Clock, Shield, Activity, Wifi, WifiOff, AlertCircle,
  MapPin, Plus, Trash2, Edit3, Save, X, Trophy, Crown, Flame, Award,
  Maximize2, Check, Download, ToggleLeft, ToggleRight, UserPlus, UserCog, Key
} from 'lucide-react';
import './ConteoApp.css';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : '/api';

/* ═══════════════ BRAND LOGOS ═══════════════ */
const BRAND_LOGOS = {
  audi: '/assets/brands/audi.jpg',
  volkswagen: '/assets/brands/volkswagen.png',
  skoda: '/assets/brands/skoda.png',
  honda: '/assets/brands/honda.png',
  ducati: '/assets/brands/ducati.png',
  daocasion: '/assets/brands/daocasion.png',
};
const BRAND_COLORS = {
  audi: '#BB0A1E', volkswagen: '#001E50', skoda: '#4BA82E',
  honda: '#CC0000', ducati: '#D40000', daocasion: '#FF6B00'
};

function BrandLogo({ brandId, size = 24 }) {
  const src = BRAND_LOGOS[brandId];
  if (!src) return null;
  return (
    <img
      src={src} alt={brandId} className="brand-logo-img"
      style={{ width: size, height: size }}
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
        filter: active ? `drop-shadow(0 0 6px ${color}80)` : 'brightness(0.3) grayscale(1)',
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
        {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
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
        <div className="login-subtitle">Conteo de Visitas</div>

        <div className="login-card">
          <div className="login-card-header">
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
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ DASHBOARD SHELL ═══════════════ */
function Dashboard({ token, user, onLogout }) {
  const [view, setView] = useState('realtime');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [nocFs, setNocFs] = useState(false);
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
      if (view === 'realtime' || view === 'noc') res = await api('get', '/ranking/realtime');
      else if (view === 'by-brand') res = await api('get', '/ranking/by-brand?period=day');
      else if (view === 'by-center') res = await api('get', '/ranking/by-center?period=day');
      else if (view === 'cameras') res = await api('get', '/cameras');
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
    if (autoRefresh && !['cameras', 'users'].includes(view)) {
      timerRef.current = setInterval(fetchData, 30000);
      return () => clearInterval(timerRef.current);
    }
  }, [autoRefresh, view, fetchData]);

  if (nocFs) {
    return (
      <NOCView
        data={data} onClose={() => setNocFs(false)} onRefresh={fetchData}
        loading={loading} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} api={api}
      />
    );
  }

  const navItems = [
    { id: 'realtime', label: 'Tiempo Real', icon: Activity },
    { id: 'noc', label: 'NOC Competitivo', icon: Trophy },
    { id: 'by-brand', label: 'Por Marca', icon: BarChart3 },
    { id: 'by-center', label: 'Por Centro', icon: MapPin },
    { id: 'cameras', label: 'Camaras', icon: Camera },
    ...(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),
  ];

  return (
    <div className="app-shell" data-testid="dashboard">
      <header className="app-header">
        <div className="header-left">
          <img src="/dag-logo.png" alt="Domingo Alonso Group" className="header-dag-logo" />
          <div className="header-sep" />
          <div className="header-app-info">
            <h1 className="header-app-name">Conteo de Visitas</h1>
            <span className="header-app-sub">Tiempo Real</span>
          </div>
        </div>
        <div className="header-center">
          <LiveClock compact />
          <button
            className="header-icon-btn" onClick={() => { setLoading(true); fetchData(); }}
            data-testid="refresh-btn" title="Refrescar"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button
            className={`header-icon-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="auto-refresh-btn" title="Auto-refresco"
          >
            {autoRefresh ? <Wifi size={14} /> : <WifiOff size={14} />}
          </button>
          {view === 'noc' && (
            <button
              className="header-icon-btn active" onClick={() => setNocFs(true)}
              data-testid="fullscreen-btn" title="Pantalla completa"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
        <div className="header-right">
          <div className="header-user">
            <div className="header-avatar">
              {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
            </div>
            <span className="header-username">{user?.full_name || user?.username}</span>
          </div>
          <button className="header-logout" onClick={onLogout} data-testid="logout-btn" title="Cerrar sesion">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <nav className="app-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`app-nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
            data-testid={`nav-${item.id}`}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-content">
        {loading && !data ? <LoadingState /> : <>
          {view === 'realtime' && <RealtimeView data={data} />}
          {view === 'noc' && (
            <NOCView
              data={data} embedded onRefresh={fetchData}
              loading={loading} autoRefresh={autoRefresh}
              setAutoRefresh={setAutoRefresh} api={api}
            />
          )}
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
          <span style={{ margin: '0 0.25rem', color: '#D1D5DB' }}>|</span>
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
          <div className="kpi-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
            <Users size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val mono"><AnimNum value={totals.entries || 0} /></span>
            <span className="kpi-label">Visitas Hoy</span>
          </div>
        </div>
        <div className="kpi-card accent-info">
          <div className="kpi-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
            <Camera size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{cameras_online}/{cameras_total}</span>
            <span className="kpi-label">Camaras Online</span>
          </div>
        </div>
        <div className="kpi-card accent-warning">
          <div className="kpi-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Trophy size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{ranking.length}</span>
            <span className="kpi-label">Marcas Activas</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">
          <BarChart3 size={18} /> Ranking por Marca — Hoy
        </h2>
        <div className="rank-list">
          {ranking.length === 0 && <EmptyState text="Sin datos de camaras — Las camaras estan en la red local" />}
          {ranking.map((item, i) => (
            <div key={item.brand_id} className="rank-row" data-testid={`ranking-item-${item.brand_id}`}>
              <div className={`rank-pos ${i < 3 ? `medal-${i + 1}` : ''}`}>{i + 1}</div>
              <div className="rank-logo"><BrandLogo brandId={item.brand_id} size={32} /></div>
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
                  <div className="cam-card-brand">
                    <BrandLogo brandId={brand.brand_id} size={14} />
                    <span>{brand.brand_name}</span>
                  </div>
                  <div className="cam-card-val">
                    <span className="cam-num">{cam.entries}</span>
                    <span className="cam-lbl">visitas</span>
                  </div>
                  {cam.island && (
                    <div className="cam-card-loc">
                      <MapPin size={10} />{cam.island.replace(/-/g, ' ')}
                    </div>
                  )}
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
            const color = BRAND_COLORS[item.brand_id] || item.brand_color || '#10B981';
            return (
              <div key={item.brand_id} className="brand-row" data-testid={`brand-row-${item.brand_id}`}>
                <div className="brand-row-left">
                  <span className="brand-rank">#{i + 1}</span>
                  <div className="brand-row-logo"><BrandLogo brandId={item.brand_id} size={36} /></div>
                  <span className="brand-row-name">{item.brand_name}</span>
                </div>
                <div className="brand-row-mid">
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(val / maxV) * 100}%`, background: color }} />
                  </div>
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

/* ═══════════════ CAMERAS VIEW ═══════════════ */
function CamerasView({ data, api, onRefresh, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [editCam, setEditCam] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migResult, setMigResult] = useState(null);
  const emptyForm = {
    camera_id: '', camera_name: '', brand_id: '', island: '',
    ip: '', port: 443, username: '', password: '', enabled: true
  };
  const [form, setForm] = useState(emptyForm);
  const brands = [
    { id: 'audi', name: 'AUDI' }, { id: 'volkswagen', name: 'VOLKSWAGEN' },
    { id: 'skoda', name: 'SKODA' }, { id: 'honda', name: 'HONDA' },
    { id: 'ducati', name: 'DUCATI' }, { id: 'daocasion', name: 'DAOCASION' }
  ];
  const islands = [
    { id: 'tenerife', name: 'Tenerife' }, { id: 'gran-canaria', name: 'Gran Canaria' },
    { id: 'lanzarote', name: 'Lanzarote' }, { id: 'fuerteventura', name: 'Fuerteventura' },
    { id: 'la-palma', name: 'La Palma' }
  ];
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
    try { await api('delete', `/cameras/${id}`); onRefresh(); }
    catch (e) { alert(e.response?.data?.detail || 'Error'); }
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
          <button className="btn-primary" onClick={openAdd} data-testid="add-camera-btn">
            <Plus size={16} /><span>Anadir Camara</span>
          </button>
          <button className="btn-outline" onClick={handleMigrate} disabled={migrating} data-testid="migrate-cameras-btn">
            {migrating ? <RefreshCw size={16} className="spin" /> : <Download size={16} />}
            <span>{migrating ? 'Migrando...' : 'Importar de Plataforma'}</span>
          </button>
        </div>
      )}

      {migResult && (
        <div className={`alert-msg ${migResult.error ? 'alert-error' : 'alert-ok'}`}>
          {migResult.error
            ? <><AlertCircle size={16} /><span>{migResult.error}</span></>
            : <><Check size={16} /><span>{migResult.message}</span></>
          }
          <button onClick={() => setMigResult(null)}><X size={14} /></button>
        </div>
      )}

      {showForm && (
        <Modal title={editCam ? 'Editar Camara' : 'Nueva Camara'} onClose={() => setShowForm(false)}>
          <div className="form-2col">
            <FormField label="ID Camara *" value={form.camera_id} onChange={v => setForm({ ...form, camera_id: v })} placeholder="ej: audi-tf-001" disabled={!!editCam} />
            <FormField label="Nombre *" value={form.camera_name} onChange={v => setForm({ ...form, camera_name: v })} placeholder="AUDI Tenerife" />
            <FormSelect label="Marca *" value={form.brand_id} onChange={v => setForm({ ...form, brand_id: v })} options={brands.map(b => ({ value: b.id, label: b.name }))} />
            <FormSelect label="Isla *" value={form.island} onChange={v => setForm({ ...form, island: v })} options={islands.map(i => ({ value: i.id, label: i.name }))} />
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
              <thead>
                <tr>
                  <th>ID</th><th>Nombre</th><th>Marca</th><th>Isla</th>
                  <th>IP:Puerto</th><th>Estado</th>{isAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {cameras.map(c => (
                  <tr key={c.camera_id} data-testid={`camera-row-${c.camera_id}`}>
                    <td className="mono">{c.camera_id}</td>
                    <td>{c.camera_name}</td>
                    <td>
                      <div className="table-brand">
                        <BrandLogo brandId={c.brand_id} size={18} />
                        <span>{c.brand_id}</span>
                      </div>
                    </td>
                    <td className="capitalize">{c.island?.replace(/-/g, ' ')}</td>
                    <td className="mono">{c.ip}:{c.port}</td>
                    <td>
                      <span className={`status-pill ${c.enabled !== false ? 'on' : 'off'}`}>
                        {c.enabled !== false ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="table-actions">
                          <button className="tbl-btn" onClick={() => openEdit(c)} data-testid={`edit-camera-${c.camera_id}`}>
                            <Edit3 size={13} />
                          </button>
                          <button className="tbl-btn danger" onClick={() => handleDelete(c.camera_id)} data-testid={`delete-camera-${c.camera_id}`}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
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
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'viewer' });
  const roles = [
    { id: 'admin', name: 'Administrador', desc: 'Acceso completo' },
    { id: 'viewer', name: 'Visualizador', desc: 'Solo lectura' },
    { id: 'operator', name: 'Operador', desc: 'Ver + exportar' }
  ];

  const openAdd = () => { setForm({ username: '', password: '', full_name: '', role: 'viewer' }); setEditUser(null); setShowForm(true); };
  const openEdit = (u) => { setForm({ username: u.username, password: '', full_name: u.full_name || '', role: u.role || 'viewer' }); setEditUser(u.id); setShowForm(true); };
  const handleSave = async () => {
    try {
      if (editUser) {
        const b = { full_name: form.full_name, role: form.role };
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
    try { await api('delete', `/users/${id}`); onRefresh(); }
    catch (e) { alert(e.response?.data?.detail || 'Error'); }
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
        <button className="btn-primary" onClick={openAdd} data-testid="add-user-btn">
          <UserPlus size={16} /><span>Nuevo Usuario</span>
        </button>
      </div>

      {showForm && (
        <Modal title={editUser ? 'Editar Usuario' : 'Nuevo Usuario'} onClose={() => setShowForm(false)}>
          <div className="form-2col">
            <FormField label="Usuario *" value={form.username} onChange={v => setForm({ ...form, username: v })} placeholder="usuario" disabled={!!editUser} testId="user-username-input" />
            <FormField label="Nombre completo" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} placeholder="Juan Garcia" testId="user-fullname-input" />
            <FormField label={editUser ? 'Nueva contrasena (vacio = mantener)' : 'Contrasena *'} value={form.password} onChange={v => setForm({ ...form, password: v })} type="password" testId="user-password-input" />
            <FormSelect label="Rol *" value={form.role} onChange={v => setForm({ ...form, role: v })} options={roles.map(r => ({ value: r.id, label: `${r.name} — ${r.desc}` }))} testId="user-role-select" />
          </div>
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
            return (
              <div key={u.id} className={`user-card ${!isActive ? 'dimmed' : ''}`} data-testid={`user-card-${u.username}`}>
                <div className="user-card-top">
                  <div
                    className="user-card-avatar"
                    style={{
                      background: u.role === 'admin'
                        ? 'linear-gradient(135deg,#F59E0B,#D97706)'
                        : 'linear-gradient(135deg,#10B981,#059669)'
                    }}
                  >
                    {(u.full_name || u.username)[0].toUpperCase()}
                  </div>
                  <div className="user-card-info">
                    <span className="user-card-name">{u.full_name || u.username}</span>
                    <span className="user-card-handle">@{u.username}</span>
                  </div>
                  {u.id !== currentUser?.id && (
                    <div className="user-card-btns">
                      <button className="tbl-btn" onClick={() => openEdit(u)} data-testid={`edit-user-${u.username}`}>
                        <Edit3 size={13} />
                      </button>
                      <button className="tbl-btn" onClick={() => handleToggle(u)} data-testid={`toggle-user-${u.username}`}>
                        {isActive
                          ? <ToggleRight size={14} style={{ color: '#10B981' }} />
                          : <ToggleLeft size={14} style={{ color: '#EF4444' }} />
                        }
                      </button>
                      <button className="tbl-btn danger" onClick={() => handleDelete(u.id, u.username)} data-testid={`delete-user-${u.username}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="user-card-tags">
                  <span className={`tag tag-${u.role}`}>
                    <Key size={10} />{u.role === 'admin' ? 'Admin' : u.role === 'operator' ? 'Operador' : 'Viewer'}
                  </span>
                  <span className={`tag ${isActive ? 'tag-active' : 'tag-inactive'}`}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ NOC COMPETITIVE ═══════════════ */
const ISLANDS_CFG = [
  { id: 'tenerife', name: 'Tenerife', short: 'TF', color: '#8B5CF6', png: '/islands/tenerife.png' },
  { id: 'gran-canaria', name: 'Gran Canaria', short: 'GC', color: '#10B981', png: '/islands/grancanaria.png' },
  { id: 'lanzarote', name: 'Lanzarote', short: 'LZ', color: '#3B82F6', png: '/islands/lanzarote.png' },
  { id: 'fuerteventura', name: 'Fuerteventura', short: 'FV', color: '#F59E0B', png: '/islands/fuerteventura.png' },
  { id: 'la-palma', name: 'La Palma', short: 'LP', color: '#06B6D4', png: '/islands/lapalma.png' },
];

function NOCView({ data, embedded, onClose, onRefresh, loading, autoRefresh, setAutoRefresh, api }) {
  const [islandStats, setIslandStats] = useState({});

  useEffect(() => {
    if (!api) return;
    api('get', '/ranking/by-island')
      .then(r => setIslandStats(r.data.islands || {}))
      .catch(() => {});
  }, [data, api]);

  const ranking = (data?.ranking || []).sort((a, b) => (b.entries || 0) - (a.entries || 0));
  const totalVisits = ranking.reduce((s, i) => s + (i.entries || 0), 0);
  const maxV = ranking[0]?.entries || 1;
  const maxI = Math.max(...Object.values(islandStats).map(i => i.total || 0), 1);
  const leaderI = Object.entries(islandStats).sort((a, b) => (b[1].total || 0) - (a[1].total || 0))[0];
  const cls = embedded ? 'noc-embed' : 'noc-full';

  return (
    <div className={cls} data-testid="noc-competitivo">
      {!embedded && (
        <div className="noc-bg">
          <div className="noc-orb o1" /><div className="noc-orb o2" /><div className="noc-orb o3" />
        </div>
      )}
      <div className={embedded ? '' : 'noc-inner'}>
        {!embedded && (
          <header className="noc-header">
            <div className="noc-header-left">
              <img src="/dag-logo.png" alt="DAG" className="noc-dag-logo" />
              <div className="noc-sep" />
              <div>
                <h1 className="noc-title">
                  NOC Competitivo <Flame size={15} className="noc-flame" />
                </h1>
                <p className="noc-subtitle-text">Ranking en tiempo real</p>
              </div>
            </div>
            <LiveClock />
            <div className="noc-header-right">
              <div className="noc-visits-box">
                <Users size={15} />
                <div>
                  <span className="noc-visits-label">VISITAS</span>
                  <span className="noc-visits-num mono"><AnimNum value={totalVisits} /></span>
                </div>
              </div>
              <button
                className={`noc-ctrl-btn ${autoRefresh ? 'active' : ''}`}
                onClick={() => setAutoRefresh(!autoRefresh)}
                data-testid="noc-auto-refresh"
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
                <span>{autoRefresh ? '30s' : 'Off'}</span>
              </button>
              {onClose && (
                <button className="noc-close-btn" onClick={onClose} data-testid="noc-close">
                  <X size={18} />
                </button>
              )}
            </div>
          </header>
        )}

        <div className={embedded ? '' : 'noc-body'} style={embedded ? { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' } : undefined}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Podium */}
            <div className={embedded ? 'card' : 'noc-panel'}>
              <div className={embedded ? 'card-title' : 'noc-panel-title'}>
                <Award size={15} className={embedded ? '' : 'gold-icon'} /> Podio de Honor
              </div>
              <div className="noc-podium">
                {[1, 0, 2].map(idx => {
                  const item = ranking[idx];
                  if (!item) return <div key={idx} className="podium-slot empty" />;
                  const r = idx + 1;
                  const h = { 1: 130, 2: 100, 3: 75 };
                  const ord = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                  return (
                    <div key={idx} className={`podium-slot r-${r}`} style={{ order: ord }} data-testid={`podium-rank-${r}`}>
                      {r === 1 && <Crown size={22} className="podium-crown" />}
                      <div className="podium-logo">
                        <BrandLogo brandId={item.brand_id} size={r === 1 ? 44 : 32} />
                      </div>
                      <div className={`podium-pillar p-${r}`} style={{ height: h[r] }}>
                        <span className="podium-num">{r}&#186;</span>
                      </div>
                      <p className="podium-label">{item.brand_name}</p>
                      <p className={`podium-count c-${r} mono`}><AnimNum value={item.entries || 0} /></p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full Ranking */}
            <div className={embedded ? 'card' : 'noc-panel'}>
              <div className={embedded ? 'card-title' : 'noc-panel-title'}>
                <BarChart3 size={15} /> Ranking Completo
              </div>
              <div className="noc-rank-rows">
                {ranking.slice(0, 8).map((item, i) => (
                  <div key={item.brand_id} className={`noc-rank-row ${i === 0 ? 'leader' : ''}`} data-testid={`noc-rank-${item.brand_id}`}>
                    <span className={`noc-rk-pos p-${i + 1}`}>{i + 1}</span>
                    <div className="noc-rk-logo"><BrandLogo brandId={item.brand_id} size={24} /></div>
                    <span className="noc-rk-name" style={embedded ? { color: '#111827' } : undefined}>{item.brand_name}</span>
                    <div className="noc-rk-bar-bg" style={embedded ? { background: '#E5E7EB' } : undefined}>
                      <div className="noc-rk-bar" style={{ width: `${((item.entries || 0) / maxV) * 100}%`, background: i === 0 ? '#F59E0B' : '#10B981' }} />
                    </div>
                    <span className={`noc-rk-val mono ${i === 0 ? 'gold' : ''}`} style={embedded ? { color: i === 0 ? '#D97706' : '#111827' } : undefined}>
                      <AnimNum value={item.entries || 0} />
                    </span>
                  </div>
                ))}
                {ranking.length === 0 && (
                  <div className="noc-empty">
                    <Trophy size={28} /><p>Esperando datos...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Islands Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={embedded ? 'card-title' : 'noc-panel-title'} style={{ marginBottom: 0 }}>
              <MapPin size={15} className={embedded ? '' : 'purple-icon'} /> Islas Canarias
            </div>
            <div className="noc-islands">
              {ISLANDS_CFG.map(island => {
                const stats = islandStats[island.id] || { total: 0 };
                const isLdr = leaderI && leaderI[0] === island.id && stats.total > 0;
                return (
                  <div
                    key={island.id}
                    className={`noc-island ${isLdr ? 'island-leader' : ''} ${stats.total === 0 ? 'island-zero' : ''}`}
                    style={embedded ? { background: '#F9FAFB', border: '1px solid #E5E7EB' } : undefined}
                    data-testid={`island-${island.id}`}
                  >
                    {isLdr && <Crown size={13} className="island-crown-ico" />}
                    <div className="island-visual">
                      <IslandSilhouette island={island.id} size={44} active={stats.total > 0} color={island.color} />
                      <div className="island-badge" style={{ background: island.color }}>{island.short}</div>
                    </div>
                    <div className="island-data">
                      <span className="island-name" style={embedded ? { color: '#111827' } : undefined}>{island.name}</span>
                      <span className={`island-total mono ${isLdr ? 'gold' : ''}`} style={embedded ? { color: '#111827' } : undefined}>
                        <AnimNum value={stats.total || 0} />
                      </span>
                    </div>
                    <div className="island-bar-bg" style={embedded ? { background: '#E5E7EB' } : undefined}>
                      <div className="island-bar" style={{ width: `${maxI > 0 ? (stats.total / maxI) * 100 : 0}%`, background: island.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={embedded ? 'card' : 'noc-summary-panel'} style={embedded ? { background: '#D1FAE5', textAlign: 'center', padding: '1rem', borderRadius: '12px' } : undefined}>
              <span className="noc-sum-label" style={embedded ? { color: '#065F46' } : undefined}>Total Archipielago</span>
              <span className="noc-sum-val mono" style={embedded ? { color: '#059669' } : undefined}><AnimNum value={totalVisits} /></span>
              <span className="noc-sum-sub" style={embedded ? { color: '#065F46' } : undefined}>visitas hoy</span>
            </div>
          </div>
        </div>

        {!embedded && (
          <footer className="noc-footer">
            <span className="noc-foot-dag">Domingo Alonso Group</span>
            <div className="noc-foot-right">
              <span>Desarrollado por</span>
              <img src="/siempria-logo.png" alt="" className="noc-foot-logo" />
              <span className="noc-foot-brand">Siempria</span>
              <span className="noc-foot-sep">|</span>
              <span>Tecnologia Mobotix</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ SHARED COMPONENTS ═══════════════ */
function EmptyState({ text }) {
  return (
    <div className="empty-box" data-testid="empty-state">
      <BarChart3 size={32} /><p>{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-box">
      <RefreshCw size={28} className="spin" /><p>Cargando datos...</p>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg" onClick={onClose} data-testid="modal-overlay">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
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
      <input
        data-testid={testId} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
      />
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
