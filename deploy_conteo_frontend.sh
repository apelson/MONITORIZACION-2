#!/bin/bash
set -e

echo "================================================"
echo "  Deploying siempria-conteo Frontend UI"
echo "================================================"

CONTEO_VIEWS="/opt/siempria-conteo/frontend/src/conteo/views"
CONTEO_SRC="/opt/siempria-conteo/frontend/src/conteo"
APP_SRC="/opt/siempria-conteo/frontend/src"

# ── Step 1: Backup ──
echo ""
echo "[1/6] Creando backup..."
cp "$CONTEO_SRC/Dashboard.jsx" "$CONTEO_SRC/Dashboard.jsx.bak"
cp "$APP_SRC/App.jsx" "$APP_SRC/App.jsx.bak"
echo "  OK - Dashboard.jsx.bak y App.jsx.bak creados"

# ── Step 2: Create AccessLogsView.jsx ──
echo ""
echo "[2/6] Creando AccessLogsView.jsx..."
cat << 'VIEWEOF' > "$CONTEO_VIEWS/AccessLogsView.jsx"
import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Filter, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export function AccessLogsView({ api }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState('');
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/users/access-logs?limit=' + pageSize + '&skip=' + (page * pageSize);
      if (filterUser) url += '&username=' + filterUser;
      const res = await api('get', url);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [api, page, filterUser]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);

  const fmtDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="view-wrap" data-testid="access-logs-view">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title"><ClipboardList size={18} /> Logs de Acceso</h2>
          <span className="count-badge">{total}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="login-input-wrap" style={{ maxWidth: 240, flex: 1 }}>
            <Filter size={14} />
            <input
              data-testid="logs-filter-user"
              type="text"
              value={filterUser}
              onChange={e => { setFilterUser(e.target.value); setPage(0); }}
              placeholder="Filtrar usuario..."
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
            />
            {filterUser && (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                onClick={() => { setFilterUser(''); setPage(0); }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button className="btn-outline" onClick={fetchLogs}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>

        {loading && logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8899aa' }}>Cargando...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8899aa' }}>No hay registros</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>IP</th>
                  <th>Resultado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id || i}>
                    <td className="mono">@{l.username}</td>
                    <td>{l.full_name || l.username}</td>
                    <td>
                      <span className={'tag tag-' + (l.role || 'viewer')}>
                        {l.role === 'admin' ? 'Admin' : l.role === 'operator' ? 'Operador' : 'Viewer'}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{l.ip_address || '-'}</td>
                    <td>
                      <span style={{
                        color: l.success !== false ? '#22c55e' : '#ef4444',
                        fontWeight: 600, fontSize: '0.82rem'
                      }}>
                        {l.success !== false ? 'OK' : 'Fallido'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{fmtDate(l.login_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <span style={{ fontSize: '0.82rem', color: '#94A0B0' }}>Pag {page + 1}/{totalPages}</span>
            <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
VIEWEOF
echo "  OK"

# ── Step 3: Create EmailSettingsView.jsx ──
echo ""
echo "[3/6] Creando EmailSettingsView.jsx..."
cat << 'VIEWEOF' > "$CONTEO_VIEWS/EmailSettingsView.jsx"
import { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw } from 'lucide-react';

export function EmailSettingsView({ api }) {
  const [config, setConfig] = useState({
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '',
    from_email: 'alertas@siempria.com', from_name: 'Siempria Conteo',
    alert_email: 'luis.gonzalez@siempria.com', enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api('get', '/email-settings');
        setConfig(c => ({ ...c, ...r.data }));
      } catch (e) {
        console.error('Error loading email settings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await api('put', '/email-settings', config);
      setMsg('Guardado correctamente');
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setMsg('Enviando...');
    try {
      const r = await api('post', '/email-settings/test', { to_email: testEmail });
      setMsg(r.data.message || 'Email de prueba enviado');
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.detail || e.message));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#8899aa' }}>Cargando...</div>;
  }

  const Field = ({ label, field, type }) => (
    <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
      <label>{label}</label>
      <input
        type={type || 'text'}
        value={config[field] || ''}
        onChange={e => setConfig(c => ({
          ...c,
          [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value
        }))}
        className="modal-input"
      />
    </div>
  );

  return (
    <div className="view-wrap" data-testid="email-settings-view">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title"><Mail size={18} /> Configuracion Email (SMTP)</h2>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Field label="SMTP Host" field="smtp_host" />
          <Field label="Puerto" field="smtp_port" type="number" />
          <Field label="Usuario SMTP" field="smtp_user" />
          <Field label="Password SMTP" field="smtp_password" type="password" />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
          <Field label="Email remitente" field="from_email" />
          <Field label="Nombre remitente" field="from_name" />
          <Field label="Email alertas seguridad" field="alert_email" />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#CBD2DB' }}>
            <input type="checkbox" checked={config.enabled || false}
              onChange={e => setConfig(c => ({ ...c, enabled: e.target.checked }))} />
            Activar envio de emails
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            {saving ? ' Guardando...' : ' Guardar'}
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#CBD2DB' }}>Enviar email de prueba</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
              placeholder="email@ejemplo.com" className="modal-input" style={{ flex: 1 }} />
            <button className="btn-outline" onClick={handleTest}>Enviar test</button>
          </div>
        </div>

        {msg && (
          <div style={{
            marginTop: '0.75rem', padding: '0.5rem 1rem', borderRadius: 6,
            background: msg.startsWith('Error') ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
            color: msg.startsWith('Error') ? '#ef4444' : '#22c55e',
            fontSize: '0.85rem'
          }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
VIEWEOF
echo "  OK"

# ── Step 4: Create ReportsConfigView.jsx ──
echo ""
echo "[4/6] Creando ReportsConfigView.jsx..."
cat << 'VIEWEOF' > "$CONTEO_VIEWS/ReportsConfigView.jsx"
import { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Plus, Edit3, Trash2, Save } from 'lucide-react';

export function ReportsConfigView({ api, user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', report_type: 'daily', frequency: 'daily', email: '',
    islands: [], brands: [], centers: [], enabled: true
  });
  const [msg, setMsg] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api('get', '/reports');
      setReports(r.data.reports || []);
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSave = async () => {
    setMsg('');
    try {
      if (editing) {
        await api('put', '/reports/' + editing, form);
      } else {
        await api('post', '/reports', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', report_type: 'daily', frequency: 'daily', email: '', islands: [], brands: [], centers: [], enabled: true });
      fetchReports();
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este reporte?')) return;
    try {
      await api('delete', '/reports/' + id);
      fetchReports();
    } catch (e) {
      console.error('Error deleting report:', e);
    }
  };

  const startEdit = (r) => {
    setForm({
      name: r.name, report_type: r.report_type, frequency: r.frequency,
      email: r.email, islands: r.islands || [], brands: r.brands || [],
      centers: r.centers || [], enabled: r.enabled
    });
    setEditing(r.id);
    setShowForm(true);
  };

  const openNew = () => {
    setShowForm(true);
    setEditing(null);
    setForm({
      name: '', report_type: 'daily', frequency: 'daily',
      email: user?.email || '', islands: [], brands: [], centers: [], enabled: true
    });
  };

  const freqLabel = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' };

  return (
    <div className="view-wrap" data-testid="reports-config-view">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title"><FileSpreadsheet size={18} /> Reportes Automaticos</h2>
          <button className="btn-primary" onClick={openNew}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Plus size={14} /> Nuevo Reporte
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8899aa' }}>Cargando...</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8899aa' }}>No hay reportes configurados</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Frecuencia</th>
                  <th>Email</th>
                  <th>Filtros</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      {r.created_by_name && (
                        <><br /><span style={{ fontSize: '0.75rem', color: '#888' }}>por {r.created_by_name}</span></>
                      )}
                    </td>
                    <td>{freqLabel[r.frequency] || r.frequency}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{r.email}</td>
                    <td style={{ fontSize: '0.78rem' }}>
                      {[...(r.islands || []), ...(r.brands || []), ...(r.centers || [])].join(', ') || 'Todos'}
                    </td>
                    <td>
                      <span className={'tag tag-' + (r.enabled ? 'admin' : 'viewer')}>
                        {r.enabled ? 'Activo' : 'Pausa'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.3rem' }}>
                      <button className="btn-ghost" onClick={() => startEdit(r)} style={{ padding: '0.3rem' }}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn-ghost" onClick={() => handleDelete(r.id)}
                        style={{ padding: '0.3rem', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => { setShowForm(false); setEditing(null); }}>
          <div style={{
            background: '#1a2332', borderRadius: '12px', padding: '28px',
            maxWidth: '500px', width: '90%', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>
              {editing ? 'Editar Reporte' : 'Nuevo Reporte'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field">
                <label>Nombre</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="modal-input" placeholder="Ej: Reporte diario Tenerife" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>Frecuencia</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                    className="modal-input">
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>Tipo</label>
                  <select value={form.report_type} onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}
                    className="modal-input">
                    <option value="daily">Resumen diario</option>
                    <option value="weekly">Resumen semanal</option>
                    <option value="ranking">Ranking</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Email destino</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="modal-input" placeholder="email@empresa.com" />
              </div>
              <div className="form-field">
                <label>Islas (separar con coma, vacio = todas)</label>
                <input value={(form.islands || []).join(', ')}
                  onChange={e => setForm(f => ({ ...f, islands: e.target.value ? e.target.value.split(',').map(s => s.trim()) : [] }))}
                  className="modal-input" placeholder="Tenerife, Gran Canaria" />
              </div>
              <div className="form-field">
                <label>Marcas (separar con coma, vacio = todas)</label>
                <input value={(form.brands || []).join(', ')}
                  onChange={e => setForm(f => ({ ...f, brands: e.target.value ? e.target.value.split(',').map(s => s.trim()) : [] }))}
                  className="modal-input" placeholder="VW, Audi" />
              </div>
              <div className="form-field">
                <label>Centros (separar con coma, vacio = todos)</label>
                <input value={(form.centers || []).join(', ')}
                  onChange={e => setForm(f => ({ ...f, centers: e.target.value ? e.target.value.split(',').map(s => s.trim()) : [] }))}
                  className="modal-input" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#CBD2DB' }}>
                <input type="checkbox" checked={form.enabled}
                  onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
                Activo
              </label>
              {msg && <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{msg}</div>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => { setShowForm(false); setEditing(null); }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #2d3748', background: 'transparent', color: '#8899aa', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSave}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#5B8DB8', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Save size={16} />
                  {editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
VIEWEOF
echo "  OK"

# ── Step 5: Patch Dashboard.jsx ──
echo ""
echo "[5/6] Parcheando Dashboard.jsx..."
python3 << 'PYEOF'
import re, sys

filepath = '/opt/siempria-conteo/frontend/src/conteo/Dashboard.jsx'

with open(filepath, 'r') as f:
    content = f.read()

errors = []

# --- 1. Add icons to lucide-react import ---
if 'ClipboardList' not in content:
    old_icons = 'Presentation, Flame, Key'
    new_icons = 'Presentation, Flame, Key,\n  ClipboardList, Mail, FileSpreadsheet'
    if old_icons in content:
        content = content.replace(old_icons, new_icons, 1)
        print('  [OK] Iconos ClipboardList, Mail, FileSpreadsheet agregados')
    else:
        # Try regex for different whitespace
        content, n = re.subn(
            r'(Presentation,\s*Flame,\s*Key)\s*\n(\s*}\s*from\s+.lucide-react.)',
            r'\1,\n  ClipboardList, Mail, FileSpreadsheet\n\2',
            content, count=1
        )
        if n > 0:
            print('  [OK] Iconos agregados (regex)')
        else:
            errors.append('No se pudo agregar iconos a lucide-react')

# --- 2. Add new view imports ---
if 'AccessLogsView' not in content:
    old_import = "import { HeatmapView } from './views/HeatmapView.jsx';"
    new_import = old_import + "\nimport { AccessLogsView } from './views/AccessLogsView.jsx';\nimport { EmailSettingsView } from './views/EmailSettingsView.jsx';\nimport { ReportsConfigView } from './views/ReportsConfigView.jsx';"
    if old_import in content:
        content = content.replace(old_import, new_import, 1)
        print('  [OK] Imports de nuevas vistas agregados')
    else:
        errors.append('No se encontro import de HeatmapView para insertar despues')

# --- 3. Add early return in fetchData for new views ---
if "'access-logs'" not in content or "includes(view)){setLoading" not in content:
    # Find "let res;" inside fetchData
    match = re.search(r'(\s+try\s*\{\s*\n)(\s*)(let res;)', content)
    if match:
        indent = match.group(2)
        insert = indent + "if(['access-logs','email-settings','reports'].includes(view)){setLoading(false);return;}\n"
        content = content[:match.start(2)] + insert + content[match.start(2):]
        print('  [OK] Early return en fetchData para nuevas vistas')
    else:
        # Try simpler pattern
        if '      let res;' in content:
            content = content.replace(
                '      let res;',
                "      if(['access-logs','email-settings','reports'].includes(view)){setLoading(false);return;}\n      let res;",
                1
            )
            print('  [OK] Early return en fetchData (simple match)')
        else:
            errors.append('No se pudo insertar early return en fetchData')

# --- 4. Add to autoRefresh exclusion ---
old_excl = re.search(r"!\[(['\w,\s]+)\]\.includes\(view\)", content)
if old_excl and 'access-logs' not in old_excl.group(0):
    content = content.replace(
        old_excl.group(0),
        "!['cameras','users','heatmap','executive','presentation','access-logs','email-settings','reports'].includes(view)",
        1
    )
    print('  [OK] autoRefresh exclusion actualizado')

# --- 5. Add nav items ---
if "'access-logs'" not in content or "Logs Acceso" not in content:
    # Find the users nav item
    users_nav = re.search(r"(\.\.\.\(user\?\.\s*role\s*===\s*'admin'\s*\?\s*\[\{\s*id:\s*'users'[^\]]*\]\s*:\s*\[\]\),)", content)
    if users_nav:
        old_text = users_nav.group(0)
        new_nav = old_text + "\n    ...(user?.role === 'admin' ? [{ id: 'access-logs', label: 'Logs Acceso', icon: ClipboardList }] : []),"
        new_nav += "\n    ...(user?.role === 'admin' ? [{ id: 'email-settings', label: 'Config Email', icon: Mail }] : []),"
        new_nav += "\n    ...(user?.role === 'admin' ? [{ id: 'reports', label: 'Reportes', icon: FileSpreadsheet }] : []),"
        content = content.replace(old_text, new_nav, 1)
        print('  [OK] Navegacion sidebar agregada (Logs, Email, Reportes)')
    else:
        errors.append('No se encontro nav item de users para insertar despues')

# --- 6. Add Change Password button in header ---
if 'change-pw-btn' not in content:
    # Find the logout button and insert before it
    logout_match = re.search(r'(\s*)(<button\s+className="header-logout"\s+onClick=\{onLogout\})', content)
    if logout_match:
        indent = logout_match.group(1)
        pw_btn = indent + '<button className="header-icon-btn" onClick={() => setShowChangePw(true)} data-testid="change-pw-btn" title="Cambiar contrasena"><Key size={14} /></button>'
        content = content[:logout_match.start()] + pw_btn + content[logout_match.start():]
        print('  [OK] Boton "Cambiar Contrasena" agregado al header')
    else:
        errors.append('No se encontro boton logout para insertar boton de cambio de contrasena')

# --- 7. Add view rendering ---
if "<AccessLogsView" not in content:
    users_view = re.search(r"(\{view === 'users' && <UsersView[^/]*/>\})", content)
    if users_view:
        old_text = users_view.group(0)
        new_text = old_text + "\n          {view === 'access-logs' && <AccessLogsView api={api} />}"
        new_text += "\n          {view === 'email-settings' && <EmailSettingsView api={api} />}"
        new_text += "\n          {view === 'reports' && <ReportsConfigView api={api} user={user} />}"
        content = content.replace(old_text, new_text, 1)
        print('  [OK] Renderizado de nuevas vistas agregado')
    else:
        errors.append('No se encontro renderizado de UsersView')

# Write result
with open(filepath, 'w') as f:
    f.write(content)

if errors:
    print('\n  ADVERTENCIAS:')
    for e in errors:
        print('  [!] ' + e)
    print('\n  El archivo fue guardado con los cambios que si se aplicaron.')
else:
    print('\n  Dashboard.jsx parcheado exitosamente (7/7 cambios)')
PYEOF

# ── Step 6: Clean App.jsx ──
echo ""
echo "[6/6] Limpiando App.jsx (removiendo codigo muerto)..."
cat << 'APPEOF' > "$APP_SRC/App.jsx"
import { useState } from 'react';
import './App.css';
import { LoginPage } from './conteo/LoginPage.jsx';
import { Dashboard } from './conteo/Dashboard.jsx';

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
APPEOF
echo "  OK - App.jsx limpio (solo login/routing)"

# ── Build ──
echo ""
echo "================================================"
echo "  Compilando frontend..."
echo "================================================"
cd /opt/siempria-conteo/frontend && npm run build 2>&1

echo ""
echo "================================================"
echo "  DESPLIEGUE COMPLETADO!"
echo ""
echo "  Cambios aplicados:"
echo "    - Boton 'Cambiar Contrasena' en header (icono llave)"
echo "    - Sidebar: Logs Acceso, Config Email, Reportes (solo admin)"
echo "    - Vista: Logs de acceso con filtro y paginacion"
echo "    - Vista: Configuracion SMTP con prueba de envio"
echo "    - Vista: Reportes automaticos (CRUD)"
echo "    - App.jsx limpio (sin codigo muerto)"
echo ""
echo "  Recarga la pagina para ver los cambios."
echo "================================================"
