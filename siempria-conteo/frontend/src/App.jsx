import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  LogIn, Lock, User, Eye, EyeOff, LogOut, RefreshCw, Users, BarChart3,
  Camera, Clock, Shield, Activity, Wifi, WifiOff, AlertCircle,
  MapPin, Plus, Trash2, Edit3, Save, X, Trophy, Crown, Flame, Award,
  Maximize2, Check, Download, ToggleLeft, ToggleRight, UserPlus, UserCog, Key
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '/api';

// Brand logos from CDN
const BRAND_LOGOS = {
  audi: 'https://cdn.brandfetch.io/id_KsyK7J9/w/400/h/400/theme/dark/icon.jpeg',
  volkswagen: 'https://cdn.brandfetch.io/idVfYwcuQz/w/400/h/400/theme/dark/icon.jpeg',
  skoda: 'https://cdn.brandfetch.io/idjzVP2gvK/w/400/h/400/theme/dark/icon.jpeg',
  honda: 'https://cdn.brandfetch.io/id_udGE-32/w/400/h/400/theme/dark/icon.jpeg',
  ducati: 'https://cdn.brandfetch.io/idwBPeBOb0/w/400/h/400/theme/dark/icon.jpeg',
  daocasion: '/siempria-logo.png',
};

// ========================= LOGIN =========================
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState(0);
  useEffect(() => { const id = setInterval(() => setPhase(p => (p + 0.01) % (Math.PI * 2)), 16); return () => clearInterval(id); }, []);
  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!username || !password) { setError('Completa todos los campos'); return; }
    setLoading(true);
    try { const res = await axios.post(`${API}/auth/login`, { username, password }); onLogin(res.data); }
    catch (err) { setError(err.response?.data?.detail || 'Error de conexion'); }
    finally { setLoading(false); }
  };
  const accent = `hsl(${195 + Math.sin(phase) * 8}, 100%, ${52 + Math.sin(phase * 1.5) * 6}%)`;
  return (
    <div className="login-page" data-testid="login-page">
      <div className="login-bg"><div className="login-grid" />
        <div className="login-glow" style={{ background: `radial-gradient(ellipse at center, ${accent}12 0%, transparent 65%)` }} />
        {[...Array(16)].map((_, i) => (<div key={i} className="particle" style={{ left: `${(i*6.3)%100}%`, top: `${(i*7.9)%100}%`, animationDelay: `${i*0.4}s`, animationDuration: `${10+(i%4)*4}s`, width: `${1.5+(i%3)}px`, height: `${1.5+(i%3)}px` }} />))}
      </div>
      <div className="corner-deco tl"/><div className="corner-deco tr"/><div className="corner-deco bl"/><div className="corner-deco br"/>
      <div className="login-container">
        <div className="login-logos">
          <img src="/dag-logo.svg" alt="Domingo Alonso Group" className="login-dag-logo" />
          <div className="login-divider" />
          <div className="login-logo-box" style={{ borderColor: `${accent}30` }}>
            <img src="/siempria-logo.png" alt="Siempria" className="login-logo-img" />
          </div>
        </div>
        <h1 className="login-title" data-testid="login-title">CONTEO DE VISITAS</h1>
        <p className="login-subtitle">Sistema de Conteo en Tiempo Real</p>
        <div className="login-badge"><Shield size={11} /><span>Conexion Segura</span></div>
        <form onSubmit={handleSubmit} className="login-form" data-testid="login-form">
          <div className="login-form-header">
            <div className="login-form-icon" style={{ background: `linear-gradient(135deg, ${accent}, hsl(210,80%,45%))` }}><Lock size={16} color="#fff" /></div>
            <span>Iniciar Sesion</span>
          </div>
          <div className="field"><label>Usuario</label><div className="input-wrap"><User size={16} className="input-icon" /><input data-testid="login-username" type="text" value={username} onChange={e=>{setUsername(e.target.value);setError('');}} placeholder="Introduce tu usuario" /></div></div>
          <div className="field"><label>Contrasena</label><div className="input-wrap"><Lock size={16} className="input-icon" /><input data-testid="login-password" type={showPw?'text':'password'} value={password} onChange={e=>{setPassword(e.target.value);setError('');}} placeholder="Introduce tu contrasena" /><button type="button" className="pw-toggle" onClick={()=>setShowPw(!showPw)}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
          {error && <div className="login-error"><AlertCircle size={14}/><span>{error}</span></div>}
          <button data-testid="login-submit" type="submit" className="login-btn" disabled={loading} style={{ background: `linear-gradient(135deg, ${accent}, hsl(210,80%,45%))` }}>
            {loading ? <RefreshCw size={18} className="spin"/> : <><LogIn size={18}/><span>Acceder</span></>}
          </button>
        </form>
        <div className="login-footer"><p>&copy; {new Date().getFullYear()} Siempria - Tecnologia Mobotix</p></div>
      </div>
    </div>
  );
}

// ========================= ANIMATED NUMBER =========================
function AnimNum({ value }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    ref.current = display;
    const t0 = Date.now();
    const anim = () => { const p = Math.min((Date.now()-t0)/800,1); setDisplay(Math.round(ref.current+(value-ref.current)*(1-Math.pow(1-p,3)))); if(p<1) requestAnimationFrame(anim); };
    requestAnimationFrame(anim);
  }, [value]);
  return <span>{display.toLocaleString('es-ES')}</span>;
}

function LiveClock({ compact }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setTime(new Date()), 1000); return ()=>clearInterval(t); }, []);
  if (compact) return <div className="header-status"><Clock size={13}/><span>{time.toLocaleTimeString('es-ES')}</span></div>;
  return <div className="noc-clock"><div className="noc-clock-time">{time.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div><div className="noc-clock-date">{time.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})}</div></div>;
}

function BrandLogo({ brandId, size = 24 }) {
  const src = BRAND_LOGOS[brandId];
  if (!src) return null;
  return <img src={src} alt={brandId} className="brand-logo" style={{ width: size, height: size }} onError={e => { e.target.style.display = 'none'; }} />;
}

// ========================= DASHBOARD =========================
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
    } catch (err) { if (err.response?.status === 401) onLogout(); }
    finally { setLoading(false); }
  }, [view, api, onLogout]);

  useEffect(() => { setLoading(true); fetchData(); }, [view, fetchData]);
  useEffect(() => {
    if (autoRefresh && !['cameras','users'].includes(view)) { timerRef.current = setInterval(fetchData, 30000); return () => clearInterval(timerRef.current); }
  }, [autoRefresh, view, fetchData]);

  if (nocFs) return <NOCCompetitivo data={data} onClose={()=>setNocFs(false)} onRefresh={fetchData} loading={loading} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} api={api} />;

  const navItems = [
    { id: 'realtime', label: 'Tiempo Real', icon: Activity },
    { id: 'noc', label: 'NOC Competitivo', icon: Trophy },
    { id: 'by-brand', label: 'Por Marca', icon: BarChart3 },
    { id: 'by-center', label: 'Por Centro', icon: MapPin },
    { id: 'cameras', label: 'Camaras', icon: Camera },
    ...(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),
  ];

  return (
    <div className="dashboard" data-testid="dashboard">
      <header className="dash-header">
        <div className="dash-header-left">
          <img src="/dag-logo.svg" alt="DAG" className="header-dag-logo" />
          <div className="header-sep" />
          <img src="/siempria-logo.png" alt="Siempria" className="header-logo-img" />
          <div><h1 className="header-title">CONTEO DE VISITAS</h1><span className="header-sub">Tiempo Real</span></div>
        </div>
        <div className="dash-header-center">
          <LiveClock compact />
          <button className="header-refresh" onClick={()=>{setLoading(true);fetchData();}}><RefreshCw size={14} className={loading?'spin':''}/></button>
          <button className={`header-auto ${autoRefresh?'active':''}`} onClick={()=>setAutoRefresh(!autoRefresh)}>{autoRefresh?<Wifi size={14}/>:<WifiOff size={14}/>}</button>
          {view==='noc'&&<button className="header-auto active" onClick={()=>setNocFs(true)}><Maximize2 size={14}/></button>}
        </div>
        <div className="dash-header-right">
          <div className="header-user"><div className="user-avatar">{(user?.full_name||user?.username||'U')[0].toUpperCase()}</div><span className="user-name">{user?.full_name||user?.username}</span></div>
          <button className="logout-btn" onClick={onLogout} data-testid="logout-btn"><LogOut size={16}/></button>
        </div>
      </header>
      <nav className="dash-nav">
        {navItems.map(item => (<button key={item.id} className={`nav-item ${view===item.id?'active':''}`} onClick={()=>setView(item.id)} data-testid={`nav-${item.id}`}><item.icon size={16}/><span>{item.label}</span></button>))}
      </nav>
      <main className="dash-content">
        {loading && !data ? <div className="loading-state"><RefreshCw size={32} className="spin"/><p>Cargando datos...</p></div> : <>
          {view==='realtime'&&<RealtimeView data={data}/>}
          {view==='noc'&&<NOCCompetitivo data={data} embedded onRefresh={fetchData} loading={loading} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} api={api}/>}
          {view==='by-brand'&&<BrandRankingView data={data}/>}
          {view==='by-center'&&<CenterRankingView data={data}/>}
          {view==='cameras'&&<CamerasView data={data} api={api} onRefresh={fetchData} isAdmin={user?.role==='admin'}/>}
          {view==='users'&&<UsersView data={data} api={api} onRefresh={fetchData} currentUser={user}/>}
        </>}
      </main>
    </div>
  );
}

// ========================= REALTIME =========================
function RealtimeView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking=[], totals={}, cameras_total=0, cameras_online=0 } = data;
  return (
    <div className="view-container" data-testid="realtime-view">
      <div className="stats-bar">
        <StatCard label="Visitas Hoy" value={totals.entries||0} icon={Users} color="#00AEEF" />
        <StatCard label="Camaras Online" value={`${cameras_online}/${cameras_total}`} icon={Camera} color="#22c55e" />
      </div>
      <div className="section-card">
        <h2 className="section-title"><BarChart3 size={18}/> Ranking por Marca - Hoy</h2>
        <div className="ranking-list">
          {ranking.length===0&&<EmptyState text="Sin datos"/>}
          {ranking.map((item,idx) => (
            <div key={item.brand_id} className="ranking-item">
              <div className={`rank-position ${idx<3?`top-${idx+1}`:''}`}>{idx+1}</div>
              <BrandLogo brandId={item.brand_id} size={28} />
              <div className="rank-label">{item.brand_name}</div>
              <div className="rank-count mono"><AnimNum value={item.entries||0}/></div>
            </div>
          ))}
        </div>
      </div>
      {ranking.some(r=>r.cameras?.length>0)&&(
        <div className="section-card">
          <h2 className="section-title"><Camera size={18}/> Detalle por Camara</h2>
          <div className="camera-detail-grid">
            {ranking.flatMap(brand=>(brand.cameras||[]).map(cam=>(
              <div key={cam.camera_id} className="camera-detail-card">
                <div className="cam-header"><span className={`cam-status ${cam.status}`}>{cam.status==='online'?<Wifi size={10}/>:<WifiOff size={10}/>}</span><span className="cam-name">{cam.camera_name}</span></div>
                <div className="cam-brand-row"><BrandLogo brandId={brand.brand_id} size={16}/><span style={{color:brand.brand_color}}>{brand.brand_name}</span></div>
                <div className="cam-stats"><div className="cam-stat"><span className="cam-stat-val">{cam.entries}</span><span className="cam-stat-label">Visitas</span></div></div>
                {cam.island&&<div className="cam-island"><MapPin size={10}/> {cam.island.replace(/-/g,' ')}</div>}
              </div>
            )))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================= BRAND RANKING =========================
function BrandRankingView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking=[] } = data;
  const maxVal = Math.max(...ranking.map(r=>r.total_visits),1);
  return (
    <div className="view-container" data-testid="brand-ranking-view">
      <div className="section-card">
        <h2 className="section-title"><BarChart3 size={18}/> Ranking por Marca - Hoy</h2>
        <div className="ranking-list">
          {ranking.length===0&&<EmptyState text="Sin datos"/>}
          {ranking.map((item,idx) => (
            <div key={item.brand_id} className="ranking-row">
              <div className="rank-pos">#{idx+1}</div>
              <BrandLogo brandId={item.brand_id} size={32}/>
              <div className="rank-info">
                <span className="rank-name">{item.brand_name}</span>
                <div className="rank-bar-wrap"><div className="rank-bar" style={{width:`${(item.total_visits/maxVal)*100}%`,background:item.brand_color}}/></div>
              </div>
              <div className="rank-value"><AnimNum value={item.total_visits}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================= CENTER RANKING =========================
function CenterRankingView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking=[] } = data;
  return (
    <div className="view-container" data-testid="center-ranking-view">
      <div className="section-card">
        <h2 className="section-title"><MapPin size={18}/> Ranking por Centro - Hoy</h2>
        <div className="ranking-list">
          {ranking.length===0&&<EmptyState text="Sin datos de centros"/>}
          {ranking.map((item,idx) => (
            <div key={item.center_id} className="ranking-item">
              <div className={`rank-position ${idx<3?`top-${idx+1}`:''}`}>{idx+1}</div>
              <BrandLogo brandId={item.brand_id} size={24}/>
              <div className="rank-label">{item.center_name}</div>
              <div className="rank-count mono"><AnimNum value={item.total_visits||0}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================= CAMERAS =========================
function CamerasView({ data, api, onRefresh, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [editCam, setEditCam] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migResult, setMigResult] = useState(null);
  const [form, setForm] = useState({ camera_id:'', camera_name:'', brand_id:'', island:'', ip:'', port:443, username:'', password:'', enabled:true });
  const brands = [{id:'audi',name:'AUDI'},{id:'volkswagen',name:'VOLKSWAGEN'},{id:'skoda',name:'SKODA'},{id:'honda',name:'HONDA'},{id:'ducati',name:'DUCATI'},{id:'daocasion',name:'DAOCASION'}];
  const islands = [{id:'tenerife',name:'Tenerife'},{id:'gran-canaria',name:'Gran Canaria'},{id:'lanzarote',name:'Lanzarote'},{id:'fuerteventura',name:'Fuerteventura'},{id:'la-palma',name:'La Palma'}];
  const openAdd = () => { setForm({camera_id:'',camera_name:'',brand_id:'',island:'',ip:'',port:443,username:'',password:'',enabled:true}); setEditCam(null); setShowForm(true); };
  const openEdit = (cam) => { setForm({...cam,port:cam.port||443}); setEditCam(cam.camera_id); setShowForm(true); };
  const handleSave = async () => { try { if(editCam) await api('put',`/cameras/${editCam}`,form); else await api('post','/cameras',form); setShowForm(false); onRefresh(); } catch(err){alert(err.response?.data?.detail||'Error');} };
  const handleDelete = async (id) => { if(!confirm(`Eliminar camara ${id}?`)) return; try { await api('delete',`/cameras/${id}`); onRefresh(); } catch(err){alert(err.response?.data?.detail||'Error');} };
  const handleMigrate = async () => { setMigrating(true); setMigResult(null); try { const res = await api('post','/cameras/migrate-from-main'); setMigResult(res.data); onRefresh(); } catch(err){ setMigResult({error:err.response?.data?.detail||'Error'}); } finally{setMigrating(false);} };
  if (!data) return <EmptyState text="Cargando..."/>;
  const { cameras=[] } = data;
  return (
    <div className="view-container" data-testid="cameras-view">
      {isAdmin&&<div className="cameras-actions">
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/><span>Anadir Camara</span></button>
        <button className="btn-secondary" onClick={handleMigrate} disabled={migrating}>{migrating?<RefreshCw size={16} className="spin"/>:<Download size={16}/>}<span>{migrating?'Migrando...':'Importar de Plataforma Principal'}</span></button>
      </div>}
      {migResult&&<div className={`migrate-result ${migResult.error?'error':'success'}`}>{migResult.error?<><AlertCircle size={16}/><span>{migResult.error}</span></>:<><Check size={16}/><span>{migResult.message}</span></>}<button onClick={()=>setMigResult(null)}><X size={14}/></button></div>}
      {showForm&&<Modal title={editCam?'Editar Camara':'Nueva Camara'} onClose={()=>setShowForm(false)}>
        <div className="form-grid">
          <div className="field"><label>ID Camara *</label><input value={form.camera_id} onChange={e=>setForm({...form,camera_id:e.target.value})} placeholder="ej: audi-tf-001" disabled={!!editCam}/></div>
          <div className="field"><label>Nombre *</label><input value={form.camera_name} onChange={e=>setForm({...form,camera_name:e.target.value})} placeholder="ej: AUDI Tenerife"/></div>
          <div className="field"><label>Marca *</label><select value={form.brand_id} onChange={e=>setForm({...form,brand_id:e.target.value})}><option value="">Seleccionar...</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="field"><label>Isla *</label><select value={form.island} onChange={e=>setForm({...form,island:e.target.value})}><option value="">Seleccionar...</option>{islands.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
          <div className="field"><label>IP *</label><input value={form.ip} onChange={e=>setForm({...form,ip:e.target.value})} placeholder="212.64.168.61"/></div>
          <div className="field"><label>Puerto *</label><input type="number" value={form.port} onChange={e=>setForm({...form,port:parseInt(e.target.value)||443})}/></div>
          <div className="field"><label>Usuario *</label><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/></div>
          <div className="field"><label>Password *</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
        </div>
        <div className="form-toggle"><label>Estado:</label><button className={`toggle-btn ${form.enabled?'on':'off'}`} onClick={()=>setForm({...form,enabled:!form.enabled})}>{form.enabled?<><ToggleRight size={20}/> Activa</>:<><ToggleLeft size={20}/> Inactiva</>}</button></div>
        <div className="modal-actions"><button className="btn-ghost" onClick={()=>setShowForm(false)}>Cancelar</button><button className="btn-primary" onClick={handleSave}><Save size={16}/><span>Guardar</span></button></div>
      </Modal>}
      <div className="section-card">
        <div className="section-header-row"><h2 className="section-title"><Camera size={18}/> Camaras</h2><span className="badge">{cameras.length}</span></div>
        {cameras.length===0?<EmptyState text="No hay camaras. Usa 'Importar' o 'Anadir'."/>:(
          <div className="cameras-table-wrap"><table className="cameras-table"><thead><tr><th>ID</th><th>Nombre</th><th>Marca</th><th>Isla</th><th>IP:Puerto</th><th>Estado</th>{isAdmin&&<th>Acciones</th>}</tr></thead><tbody>
            {cameras.map(cam=>(<tr key={cam.camera_id}><td className="mono">{cam.camera_id}</td><td>{cam.camera_name}</td><td><BrandLogo brandId={cam.brand_id} size={18}/> {cam.brand_id}</td><td>{cam.island?.replace(/-/g,' ')}</td><td className="mono">{cam.ip}:{cam.port}</td><td><span className={`status-dot ${cam.enabled!==false?'online':'offline'}`}/>{cam.enabled!==false?'Activa':'Inactiva'}</td>{isAdmin&&<td className="actions-cell"><button className="icon-btn" onClick={()=>openEdit(cam)}><Edit3 size={14}/></button><button className="icon-btn danger" onClick={()=>handleDelete(cam.camera_id)}><Trash2 size={14}/></button></td>}</tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}

// ========================= USERS =========================
function UsersView({ data, api, onRefresh, currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username:'', password:'', full_name:'', role:'viewer' });
  const roles = [{id:'admin',name:'Administrador',desc:'Acceso completo'},{id:'viewer',name:'Visualizador',desc:'Solo lectura'},{id:'operator',name:'Operador',desc:'Ver + exportar'}];

  const openAdd = () => { setForm({username:'',password:'',full_name:'',role:'viewer'}); setEditUser(null); setShowForm(true); };
  const openEdit = (u) => { setForm({username:u.username,password:'',full_name:u.full_name||'',role:u.role||'viewer'}); setEditUser(u.id); setShowForm(true); };
  const handleSave = async () => {
    try {
      if (editUser) {
        const body = { full_name: form.full_name, role: form.role };
        if (form.password) body.password = form.password;
        await api('put', `/users/${editUser}`, body);
      } else {
        await api('post', '/users', form);
      }
      setShowForm(false); onRefresh();
    } catch(err) { alert(err.response?.data?.detail || 'Error'); }
  };
  const handleDelete = async (id, name) => { if(!confirm(`Eliminar usuario "${name}"?`)) return; try { await api('delete',`/users/${id}`); onRefresh(); } catch(err){alert(err.response?.data?.detail||'Error');} };
  const handleToggle = async (u) => { try { await api('put',`/users/${u.id}`,{is_active:!u.is_active}); onRefresh(); } catch(err){alert(err.response?.data?.detail||'Error');} };

  if (!data) return <EmptyState text="Cargando..." />;
  const { users=[] } = data;

  return (
    <div className="view-container" data-testid="users-view">
      <div className="cameras-actions">
        <button className="btn-primary" onClick={openAdd} data-testid="add-user-btn"><UserPlus size={16}/><span>Nuevo Usuario</span></button>
      </div>

      {showForm&&<Modal title={editUser?'Editar Usuario':'Nuevo Usuario'} onClose={()=>setShowForm(false)}>
        <div className="form-grid">
          <div className="field"><label>Nombre de usuario *</label><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="usuario" disabled={!!editUser}/></div>
          <div className="field"><label>Nombre completo</label><input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Juan Garcia"/></div>
          <div className="field"><label>{editUser?'Nueva contrasena (dejar vacio para mantener)':'Contrasena *'}</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="****"/></div>
          <div className="field"><label>Rol *</label><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(r=><option key={r.id} value={r.id}>{r.name} - {r.desc}</option>)}</select></div>
        </div>
        <div className="modal-actions"><button className="btn-ghost" onClick={()=>setShowForm(false)}>Cancelar</button><button className="btn-primary" onClick={handleSave}><Save size={16}/><span>Guardar</span></button></div>
      </Modal>}

      <div className="section-card">
        <div className="section-header-row"><h2 className="section-title"><UserCog size={18}/> Usuarios del Sistema</h2><span className="badge">{users.length}</span></div>
        <div className="users-grid">
          {users.map(u => (
            <div key={u.id} className={`user-card ${!u.is_active?'inactive':''}`} data-testid={`user-${u.username}`}>
              <div className="user-card-header">
                <div className="user-card-avatar" style={{background: u.role==='admin' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#00AEEF,#0077b6)'}}>
                  {(u.full_name||u.username)[0].toUpperCase()}
                </div>
                <div className="user-card-info">
                  <span className="user-card-name">{u.full_name || u.username}</span>
                  <span className="user-card-username">@{u.username}</span>
                </div>
                {u.id !== currentUser?.id && (
                  <div className="user-card-actions">
                    <button className="icon-btn" onClick={()=>openEdit(u)} title="Editar"><Edit3 size={14}/></button>
                    <button className="icon-btn" onClick={()=>handleToggle(u)} title={u.is_active?'Desactivar':'Activar'}>{u.is_active?<ToggleRight size={14} className="text-green"/>:<ToggleLeft size={14} className="text-red"/>}</button>
                    <button className="icon-btn danger" onClick={()=>handleDelete(u.id,u.username)} title="Eliminar"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>
              <div className="user-card-meta">
                <span className={`role-badge role-${u.role}`}><Key size={11}/> {u.role==='admin'?'Admin':u.role==='operator'?'Operador':'Viewer'}</span>
                <span className={`status-badge ${u.is_active?'active':'inactive'}`}>{u.is_active?'Activo':'Inactivo'}</span>
              </div>
              {u.last_login && <div className="user-card-login"><Clock size={11}/> {new Date(u.last_login).toLocaleDateString('es-ES')}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================= NOC COMPETITIVO =========================
const ISLANDS_CFG = [
  {id:'tenerife',name:'Tenerife',short:'TF',color:'#8B5CF6'},
  {id:'gran-canaria',name:'Gran Canaria',short:'GC',color:'#10B981'},
  {id:'lanzarote',name:'Lanzarote',short:'LZ',color:'#3B82F6'},
  {id:'fuerteventura',name:'Fuerteventura',short:'FV',color:'#F59E0B'},
  {id:'la-palma',name:'La Palma',short:'LP',color:'#06B6D4'},
];

function NOCCompetitivo({ data, embedded, onClose, onRefresh, loading, autoRefresh, setAutoRefresh, api }) {
  const [islandStats, setIslandStats] = useState({});
  useEffect(() => { if(!api)return; api('get','/ranking/by-island').then(r=>setIslandStats(r.data.islands||{})).catch(()=>{}); }, [data, api]);

  const ranking = (data?.ranking||[]).sort((a,b)=>(b.entries||0)-(a.entries||0));
  const totalVisits = ranking.reduce((s,i)=>s+(i.entries||0),0);
  const maxV = ranking[0]?.entries||1;
  const maxI = Math.max(...Object.values(islandStats).map(i=>i.total||0),1);
  const leader = Object.entries(islandStats).sort((a,b)=>(b[1].total||0)-(a[1].total||0))[0];
  const cls = embedded ? 'noc-embedded' : 'noc-fullscreen';

  return (
    <div className={cls} data-testid="noc-competitivo">
      <div className="noc-bg"><div className="noc-orb noc-orb-1"/><div className="noc-orb noc-orb-2"/><div className="noc-orb noc-orb-3"/><div className="noc-bg-grid"/></div>
      <div className="noc-content">
        <header className="noc-header">
          <div className="noc-header-left">
            <img src="/dag-logo.svg" alt="Domingo Alonso Group" className="noc-dag-logo" />
            <div className="noc-header-sep"/>
            <div className="noc-trophy-wrap"><Trophy size={20} color="#fff"/></div>
            <div><h1 className="noc-title">NOC Competitivo <Flame size={16} className="noc-flame"/></h1><p className="noc-subtitle">Ranking en tiempo real</p></div>
          </div>
          <LiveClock />
          <div className="noc-header-right">
            <div className="noc-total-box"><Users size={16} className="noc-total-icon"/><div><span className="noc-total-label">VISITAS</span><span className="noc-total-value"><AnimNum value={totalVisits}/></span></div></div>
            <button className={`noc-btn ${autoRefresh?'active':''}`} onClick={()=>setAutoRefresh(!autoRefresh)}><RefreshCw size={14} className={loading?'spin':''}/><span>{autoRefresh?'30s':'Off'}</span></button>
            {onClose&&<button className="noc-btn-close" onClick={onClose}><X size={18}/></button>}
          </div>
        </header>
        <div className="noc-main">
          <div className="noc-left">
            <div className="noc-section noc-podium-section">
              <div className="noc-section-header"><Award size={16} className="noc-icon-gold"/> Podio de Honor</div>
              <div className="noc-podium">
                {[1,0,2].map(idx => {
                  const item = ranking[idx]; if(!item) return <div key={idx} className="podium-slot empty"/>;
                  const rank = idx+1; const heights = {1:140,2:105,3:80}; const order = idx===0?2:idx===1?1:3;
                  return (
                    <div key={idx} className={`podium-slot rank-${rank}`} style={{order}}>
                      {rank===1&&<Crown size={24} className="podium-crown"/>}
                      <div className="podium-brand-icon"><BrandLogo brandId={item.brand_id} size={rank===1?48:36}/></div>
                      <div className={`podium-bar podium-bar-${rank}`} style={{height:heights[rank]}}><span className="podium-rank">{rank}&#186;</span></div>
                      <p className="podium-name">{item.brand_name}</p>
                      <p className={`podium-visits visits-${rank}`}><AnimNum value={item.entries||0}/></p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="noc-section noc-ranking-section">
              <div className="noc-section-header"><BarChart3 size={16}/> Ranking Completo</div>
              <div className="noc-ranking-list">
                {ranking.slice(0,8).map((item,i) => (
                  <div key={item.brand_id} className={`noc-rank-row ${i===0?'leader':''}`}>
                    <span className={`noc-rank-pos pos-${i+1}`}>{i+1}</span>
                    <BrandLogo brandId={item.brand_id} size={22}/>
                    <span className="noc-rank-name">{item.brand_name}</span>
                    <div className="noc-rank-bar-wrap"><div className="noc-rank-bar" style={{width:`${((item.entries||0)/maxV)*100}%`,background:i===0?'#fbbf24':'#38bdf8'}}/></div>
                    <span className={`noc-rank-val ${i===0?'gold':''}`}><AnimNum value={item.entries||0}/></span>
                  </div>
                ))}
                {ranking.length===0&&<div className="noc-empty"><Trophy size={32}/><p>Esperando datos...</p></div>}
              </div>
            </div>
          </div>
          <div className="noc-right">
            <div className="noc-section-header"><MapPin size={16} className="noc-icon-purple"/> Islas Canarias</div>
            <div className="noc-islands-grid">
              {ISLANDS_CFG.map(island => {
                const stats = islandStats[island.id]||{total:0};
                const isLeader = leader&&leader[0]===island.id&&stats.total>0;
                return (
                  <div key={island.id} className={`noc-island-card ${isLeader?'leader':''} ${stats.total===0?'inactive':''}`}>
                    {isLeader&&<Crown size={14} className="island-crown"/>}
                    <div className="island-icon" style={{background:island.color}}>{island.short}</div>
                    <div className="island-info"><span className="island-name">{island.name}</span><span className={`island-count ${isLeader?'gold':''}`}><AnimNum value={stats.total||0}/></span></div>
                    <div className="island-bar-wrap"><div className="island-bar" style={{width:`${maxI>0?(stats.total/maxI)*100:0}%`,background:island.color}}/></div>
                  </div>
                );
              })}
            </div>
            <div className="noc-section noc-total-section">
              <div className="noc-total-summary"><span className="noc-total-summary-label">Total Archipielago</span><span className="noc-total-summary-val"><AnimNum value={totalVisits}/></span><span className="noc-total-summary-sub">visitas hoy</span></div>
            </div>
          </div>
        </div>
        <footer className="noc-footer">
          <div className="noc-footer-left"><img src="/dag-logo.svg" alt="" className="noc-footer-dag"/></div>
          <div className="noc-footer-right"><span>Powered by</span><img src="/siempria-logo.png" alt="" className="noc-footer-logo"/><span className="noc-footer-brand">Siempria</span></div>
        </footer>
      </div>
    </div>
  );
}

// ========================= SHARED =========================
function StatCard({ label, value, icon: Icon, color }) {
  return <div className="stat-card"><div className="stat-icon" style={{color,background:`${color}15`}}><Icon size={20}/></div><div className="stat-info"><span className="stat-value">{typeof value==='number'?value.toLocaleString():value}</span><span className="stat-label">{label}</span></div></div>;
}
function EmptyState({ text }) { return <div className="empty-state"><BarChart3 size={36}/><p>{text}</p></div>; }
function Modal({ title, onClose, children }) {
  return <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e=>e.stopPropagation()}>
    <div className="modal-header"><h3>{title}</h3><button onClick={onClose}><X size={18}/></button></div>
    <div className="modal-body">{children}</div>
  </div></div>;
}

// ========================= APP =========================
export default function App() {
  const [auth, setAuth] = useState(() => { const s=localStorage.getItem('conteo_auth'); return s?JSON.parse(s):null; });
  const handleLogin = (d) => { const a={token:d.token,user:d.user}; localStorage.setItem('conteo_auth',JSON.stringify(a)); setAuth(a); };
  const handleLogout = () => { localStorage.removeItem('conteo_auth'); setAuth(null); };
  if (!auth) return <LoginPage onLogin={handleLogin}/>;
  return <Dashboard token={auth.token} user={auth.user} onLogout={handleLogout}/>;
}
