import { useState } from 'react';
import {
  UserPlus, UserCog, Edit3, Trash2, Save, Key,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { BrandLogo, LoadingState, Modal, FormField, FormSelect, ChipSelect } from '../shared';
import { ALL_BRANDS, ALL_ISLANDS } from '../constants';

export function UsersView({ data, api, onRefresh, currentUser }) {
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
