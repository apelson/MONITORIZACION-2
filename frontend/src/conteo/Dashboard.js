import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  LogOut, RefreshCw, BarChart3, Camera, Activity, Wifi, WifiOff,
  MapPin, Trophy, Maximize2, UserCog, Menu, TrendingUp, Zap,
  Presentation, Flame
} from 'lucide-react';
import { LiveClock, LoadingState } from './shared';
import { API } from './constants';
import { RealtimeView } from './views/RealtimeView';
import { BrandView } from './views/BrandView';
import { CenterView } from './views/CenterView';
import { TrendsView } from './views/TrendsView';
import { CamerasView } from './views/CamerasView';
import { UsersView } from './views/UsersView';
import { NOCView } from './views/NOCView';
import { ExecutiveView } from './views/ExecutiveView';
import { PresentationMode } from './views/PresentationMode';
import { HeatmapView } from './views/HeatmapView';

export function Dashboard({ token, user, onLogout }) {
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
          {view === 'presentation' && <PresentationMode data={data} api={api} onExit={() => setView('executive')} />}
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
