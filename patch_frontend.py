#!/usr/bin/env python3
import sys
app_file = "/opt/siempria-conteo/frontend/src/App.jsx"
with open(app_file, "r") as f:
    content = f.read()
changes = 0

# 1. Add ClipboardList, Mail, Settings imports
if "ClipboardList" not in content:
    content = content.replace("ChevronRight, ChevronLeft", "ChevronRight, ChevronLeft,\n  ClipboardList, Mail, Settings")
    changes += 1
    print("  + imports")
elif "Mail" not in content:
    content = content.replace("ClipboardList", "ClipboardList, Mail, Settings")
    changes += 1

# 2. Add showChangePw state
if "showChangePw" not in content:
    content = content.replace(
        "const [mobileNav, setMobileNav] = useState(false);",
        "const [mobileNav, setMobileNav] = useState(false);\n  const [showChangePw, setShowChangePw] = useState(false);"
    )
    changes += 1
    print("  + showChangePw state")

# 3. Add nav items
if "access-logs" not in content:
    content = content.replace(
        "...(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),",
        "...(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),\n    ...(user?.role === 'admin' ? [{ id: 'access-logs', label: 'Logs de Acceso', icon: ClipboardList }] : []),\n    ...(user?.role === 'admin' ? [{ id: 'email-settings', label: 'Config Email', icon: Mail }] : []),\n    { id: 'reports', label: 'Reportes', icon: FileSpreadsheet },"
    )
    changes += 1
    print("  + nav items")

# 4. Add change password button in header
if "change-password-btn" not in content:
    content = content.replace(
        '          <div className="header-sep" />\n          <div className="header-user">',
        '          <div className="header-sep" />\n          <button className="header-icon-btn" onClick={() => setShowChangePw(true)} data-testid="change-password-btn" title="Cambiar contrasena">\n            <Key size={14} />\n          </button>\n          <div className="header-user">'
    )
    changes += 1
    print("  + header button")

# 5. Handle new views in fetchData
if "setLoading(false); return;" not in content:
    content = content.replace(
        "else if (view === 'users') res = await api('get', '/users');",
        "else if (view === 'users') res = await api('get', '/users');\n      else if (view === 'access-logs' || view === 'email-settings' || view === 'reports') { setLoading(false); return; }"
    )
    changes += 1
    print("  + fetchData bypass")

# 6. Add view renders + modal
if "AccessLogsView" not in content:
    content = content.replace(
        "          {view === 'users' && <UsersView data={data} api={api} onRefresh={fetchData} currentUser={user} />}\n        </>}\n      </main>",
        "          {view === 'users' && <UsersView data={data} api={api} onRefresh={fetchData} currentUser={user} />}\n          {view === 'access-logs' && <AccessLogsView api={api} />}\n          {view === 'email-settings' && <EmailSettingsView api={api} />}\n          {view === 'reports' && <ReportsConfigView api={api} user={user} />}\n        </>}\n      </main>\n\n      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} api={api} />}"
    )
    changes += 1
    print("  + view renders")

# 7. Add components
if "ChangePasswordModal" not in content:
    components = """
/* ═══════════════ CHANGE PASSWORD MODAL ═══════════════ */
function ChangePasswordModal({ onClose, api }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!currentPw || !newPw) { setError('Completa todos los campos'); return; }
    if (newPw.length < 4) { setError('Min 4 caracteres'); return; }
    if (newPw !== confirmPw) { setError('Las contrasenas no coinciden'); return; }
    setLoading(true);
    try {
      const res = await api('post', '/auth/change-password', { current_password: currentPw, new_password: newPw });
      setSuccess(res.data.message || 'Actualizada');
      setTimeout(() => onClose(), 1500);
    } catch (err) { setError(err.response?.data?.detail || 'Error'); } finally { setLoading(false); }
  };
  return (
    <Modal title="Cambiar Contrasena" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="form-field"><label>Contrasena actual</label><div className="login-input-wrap"><Lock size={16} /><input data-testid="change-pw-current" type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError(''); }} placeholder="Actual" /><button type="button" className="login-pw-toggle" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div></div>
        <div className="form-field"><label>Nueva contrasena</label><div className="login-input-wrap"><Key size={16} /><input data-testid="change-pw-new" type={showNew ? 'text' : 'password'} value={newPw} onChange={e => { setNewPw(e.target.value); setError(''); }} placeholder="Nueva" /><button type="button" className="login-pw-toggle" onClick={() => setShowNew(!showNew)}>{showNew ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div></div>
        <div className="form-field"><label>Confirmar</label><div className="login-input-wrap"><Key size={16} /><input data-testid="change-pw-confirm" type={showNew ? 'text' : 'password'} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(''); }} placeholder="Repetir" /></div></div>
        {error && <div className="login-error"><AlertCircle size={14}/><span>{error}</span></div>}
        {success && <div style={{color:'#22c55e',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:'0.4rem'}}><Check size={14}/><span>{success}</span></div>}
        <div className="modal-btns"><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={handleSubmit} disabled={loading} data-testid="change-pw-submit">{loading ? <RefreshCw size={16} className="spin"/> : <><Key size={16}/> Cambiar</>}</button></div>
      </div>
    </Modal>
  );
}

/* ═══════════════ ACCESS LOGS VIEW ═══════════════ */
function AccessLogsView({ api }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState('');
  const pageSize = 25;
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try { let url = "/users/access-logs?limit=" + pageSize + "&skip=" + (page * pageSize); if (filterUser) url += "&username=" + filterUser; const res = await api('get', url); setLogs(res.data.logs || []); setTotal(res.data.total || 0); } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, page, filterUser]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  const totalPages = Math.ceil(total / pageSize);
  const fmtDate = (iso) => { if (!iso) return '-'; return new Date(iso).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}); };
  return (
    <div className="view-wrap" data-testid="access-logs-view"><div className="card">
      <div className="card-header-row"><h2 className="card-title"><ClipboardList size={18}/> Logs de Acceso</h2><span className="count-badge">{total}</span></div>
      <div style={{display:'flex',gap:'0.75rem',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap'}}><div className="login-input-wrap" style={{maxWidth:240,flex:1}}><Filter size={14}/><input data-testid="logs-filter-user" type="text" value={filterUser} onChange={e=>{setFilterUser(e.target.value);setPage(0);}} placeholder="Filtrar usuario..." style={{border:'none',outline:'none',background:'transparent',width:'100%'}}/>{filterUser && <button style={{background:'none',border:'none',cursor:'pointer',padding:2}} onClick={()=>{setFilterUser('');setPage(0);}}><X size={14}/></button>}</div><button className="btn-outline" onClick={fetchLogs} style={{padding:'0.4rem 0.75rem',fontSize:'0.8rem'}}><RefreshCw size={14} className={loading?'spin':''}/> Actualizar</button></div>
      {loading && logs.length===0 ? <LoadingState/> : logs.length===0 ? <EmptyState text="No hay registros"/> : (
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>IP</th><th>Fecha</th></tr></thead><tbody>
          {logs.map((l,i)=>(<tr key={l.id||i}><td className="mono">@{l.username}</td><td>{l.full_name||l.username}</td><td><span className={"tag tag-"+(l.role||'viewer')}>{l.role==='admin'?'Admin':l.role==='operator'?'Operador':'Viewer'}</span></td><td className="mono" style={{fontSize:'0.78rem'}}>{l.ip_address||'-'}</td><td style={{fontSize:'0.82rem'}}>{fmtDate(l.login_time)}</td></tr>))}
        </tbody></table></div>)}
      {totalPages>1 && <div style={{display:'flex',justifyContent:'center',gap:'0.5rem',marginTop:'1rem',alignItems:'center'}}><button className="btn-ghost" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}><ChevronLeft size={16}/> Anterior</button><span style={{fontSize:'0.82rem',color:'#94A0B0'}}>Pag {page+1}/{totalPages}</span><button className="btn-ghost" onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1}>Siguiente <ChevronRight size={16}/></button></div>}
    </div></div>
  );
}

/* ═══════════════ EMAIL SETTINGS VIEW ═══════════════ */
function EmailSettingsView({ api }) {
  const [config, setConfig] = useState({smtp_host:'',smtp_port:587,smtp_user:'',smtp_password:'',from_email:'alertas@siempria.com',from_name:'Siempria Conteo',alert_email:'luis.gonzalez@siempria.com',enabled:false});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [testEmail, setTestEmail] = useState('');
  useEffect(() => { (async()=>{try{const r=await api('get','/email-settings');setConfig(c=>({...c,...r.data}));}catch(e){}finally{setLoading(false);}})(); }, [api]);
  const handleSave = async () => { setSaving(true); setMsg(''); try { await api('put','/email-settings',config); setMsg('Guardado'); } catch(e){ setMsg('Error: '+(e.response?.data?.detail||e.message)); } finally { setSaving(false); } };
  const handleTest = async () => { if (!testEmail) return; try { const r = await api('post','/email-settings/test',{to_email:testEmail}); setMsg(r.data.message); } catch(e){ setMsg('Error: '+(e.response?.data?.detail||e.message)); } };
  if (loading) return <LoadingState/>;
  const F = ({label,field,type}) => (<div className="form-field" style={{flex:1,minWidth:200}}><label>{label}</label><input type={type||'text'} value={config[field]||''} onChange={e=>setConfig(c=>({...c,[field]:type==='number'?parseInt(e.target.value)||0:e.target.value}))} className="modal-input"/></div>);
  return (
    <div className="view-wrap" data-testid="email-settings-view"><div className="card">
      <div className="card-header-row"><h2 className="card-title"><Mail size={18}/> Configuracion Email (SMTP)</h2></div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><F label="SMTP Host" field="smtp_host"/><F label="Puerto" field="smtp_port" type="number"/><F label="Usuario SMTP" field="smtp_user"/><F label="Password SMTP" field="smtp_password" type="password"/></div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'0.75rem'}}><F label="Email remitente" field="from_email"/><F label="Nombre remitente" field="from_name"/><F label="Email alertas seguridad" field="alert_email"/></div>
      <div style={{marginTop:'1rem'}}><label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer'}}><input type="checkbox" checked={config.enabled||false} onChange={e=>setConfig(c=>({...c,enabled:e.target.checked}))}/> Activar envio de emails</label></div>
      <div className="modal-btns" style={{marginTop:'1rem'}}><button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?<RefreshCw size={16} className="spin"/>:<><Save size={16}/> Guardar</>}</button></div>
      <div style={{marginTop:'1.5rem',borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:'1rem'}}><h3 style={{fontSize:'0.9rem',marginBottom:'0.5rem'}}>Enviar email de prueba</h3><div style={{display:'flex',gap:'0.5rem'}}><input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="email@ejemplo.com" className="modal-input" style={{flex:1}}/><button className="btn-outline" onClick={handleTest}>Enviar test</button></div></div>
      {msg && <div style={{marginTop:'0.75rem',padding:'0.5rem 1rem',borderRadius:6,background:msg.startsWith('Error')?'rgba(239,68,68,0.15)':'rgba(34,197,94,0.15)',color:msg.startsWith('Error')?'#ef4444':'#22c55e',fontSize:'0.85rem'}}>{msg}</div>}
    </div></div>
  );
}

/* ═══════════════ REPORTS CONFIG VIEW ═══════════════ */
function ReportsConfigView({ api, user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({name:'',report_type:'daily',frequency:'daily',email:'',islands:[],brands:[],centers:[],enabled:true});
  const [msg, setMsg] = useState('');
  const fetchReports = useCallback(async()=>{setLoading(true);try{const r=await api('get','/reports');setReports(r.data.reports||[]);}catch(e){}finally{setLoading(false);}},[api]);
  useEffect(()=>{fetchReports();},[fetchReports]);
  const handleSave = async () => { setMsg(''); try { if (editing) { await api('put','/reports/'+editing,form); } else { await api('post','/reports',form); } setShowForm(false); setEditing(null); setForm({name:'',report_type:'daily',frequency:'daily',email:'',islands:[],brands:[],centers:[],enabled:true}); fetchReports(); } catch(e){ setMsg(e.response?.data?.detail||'Error'); } };
  const handleDelete = async (id) => { if (!window.confirm('Eliminar?')) return; try { await api('delete','/reports/'+id); fetchReports(); } catch(e){} };
  const startEdit = (r) => { setForm({name:r.name,report_type:r.report_type,frequency:r.frequency,email:r.email,islands:r.islands||[],brands:r.brands||[],centers:r.centers||[],enabled:r.enabled}); setEditing(r.id); setShowForm(true); };
  const freqLabel = {daily:'Diario',weekly:'Semanal',monthly:'Mensual'};
  return (
    <div className="view-wrap" data-testid="reports-config-view"><div className="card">
      <div className="card-header-row"><h2 className="card-title"><FileSpreadsheet size={18}/> Reportes Automaticos</h2><button className="btn-primary" onClick={()=>{setShowForm(true);setEditing(null);setForm({name:'',report_type:'daily',frequency:'daily',email:user?.email||'',islands:[],brands:[],centers:[],enabled:true});}} style={{fontSize:'0.8rem',padding:'0.4rem 0.75rem'}}><Plus size={14}/> Nuevo Reporte</button></div>
      {loading ? <LoadingState/> : reports.length===0 ? <EmptyState text="No hay reportes configurados"/> : (
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Nombre</th><th>Frecuencia</th><th>Email</th><th>Filtros</th><th>Estado</th><th></th></tr></thead><tbody>
          {reports.map(r=>(<tr key={r.id}><td><strong>{r.name}</strong><br/><span style={{fontSize:'0.75rem',color:'#888'}}>por {r.created_by_name}</span></td><td>{freqLabel[r.frequency]||r.frequency}</td><td className="mono" style={{fontSize:'0.78rem'}}>{r.email}</td><td style={{fontSize:'0.78rem'}}>{[...(r.islands||[]),...(r.brands||[]),...(r.centers||[])].join(', ')||'Todos'}</td><td><span className={"tag tag-"+(r.enabled?'admin':'viewer')}>{r.enabled?'Activo':'Pausa'}</span></td><td style={{display:'flex',gap:'0.3rem'}}><button className="btn-ghost" onClick={()=>startEdit(r)} style={{padding:'0.3rem'}}><Edit3 size={14}/></button><button className="btn-ghost" onClick={()=>handleDelete(r.id)} style={{padding:'0.3rem',color:'#ef4444'}}><Trash2 size={14}/></button></td></tr>))}
        </tbody></table></div>)}
    </div>
    {showForm && <Modal title={editing?'Editar Reporte':'Nuevo Reporte'} onClose={()=>{setShowForm(false);setEditing(null);}}>
      <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
        <div className="form-field"><label>Nombre</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="modal-input" placeholder="Ej: Reporte diario Tenerife"/></div>
        <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}><div className="form-field" style={{flex:1}}><label>Frecuencia</label><select value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))} className="modal-input"><option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></div><div className="form-field" style={{flex:1}}><label>Tipo</label><select value={form.report_type} onChange={e=>setForm(f=>({...f,report_type:e.target.value}))} className="modal-input"><option value="daily">Resumen diario</option><option value="weekly">Resumen semanal</option><option value="ranking">Ranking</option></select></div></div>
        <div className="form-field"><label>Email destino</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="modal-input" placeholder="email@empresa.com"/></div>
        <div className="form-field"><label>Islas (coma, vacio=todas)</label><input value={(form.islands||[]).join(', ')} onChange={e=>setForm(f=>({...f,islands:e.target.value?e.target.value.split(',').map(s=>s.trim()):[]}))} className="modal-input" placeholder="Tenerife, Gran Canaria"/></div>
        <div className="form-field"><label>Marcas (coma, vacio=todas)</label><input value={(form.brands||[]).join(', ')} onChange={e=>setForm(f=>({...f,brands:e.target.value?e.target.value.split(',').map(s=>s.trim()):[]}))} className="modal-input" placeholder="VW, Audi"/></div>
        <div className="form-field"><label>Centros (coma, vacio=todos)</label><input value={(form.centers||[]).join(', ')} onChange={e=>setForm(f=>({...f,centers:e.target.value?e.target.value.split(',').map(s=>s.trim()):[]}))} className="modal-input" placeholder=""/></div>
        <label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer'}}><input type="checkbox" checked={form.enabled} onChange={e=>setForm(f=>({...f,enabled:e.target.checked}))}/>Activo</label>
        {msg && <div className="login-error"><AlertCircle size={14}/><span>{msg}</span></div>}
        <div className="modal-btns"><button className="btn-ghost" onClick={()=>{setShowForm(false);setEditing(null);}}>Cancelar</button><button className="btn-primary" onClick={handleSave}><Save size={16}/> {editing?'Actualizar':'Crear'}</button></div>
      </div>
    </Modal>}
    </div>
  );
}

"""
    marker = "/* ═══════════════ APP ═══════════════ */"
    if marker in content:
        content = content.replace(marker, components + marker)
        changes += 1
        print("  + 4 components")
    else:
        content = content.rstrip() + "\n" + components + "\n"
        changes += 1

print(f"  Total: {changes} cambios")
with open(app_file, "w") as f:
    f.write(content)
print("  OK App.jsx")
