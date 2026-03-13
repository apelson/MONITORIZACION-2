import { useState } from 'react';
import {
  Camera, Plus, Download, Trash2, Edit3, Save, RefreshCw, X, Check,
  AlertCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { BrandLogo, LoadingState, EmptyState, Modal, FormField, FormSelect } from '../shared';
import { ALL_BRANDS, ALL_ISLANDS } from '../constants';

export function CamerasView({ data, api, onRefresh, isAdmin }) {
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
