#!/bin/bash
# ============================================================
# Siempria Conteo v10 - Cambiar Contrasena + Logs de Acceso
# Ejecutar en el servidor de produccion como root
# ============================================================
set -e

CONTEO_DIR="/opt/siempria-conteo"
BACKUP_DIR="/opt/backups/conteo_v10_$(date +%Y%m%d_%H%M%S)"

echo "============================================="
echo " Siempria Conteo v10 - INICIO DESPLIEGUE"
echo "============================================="

# ── 1. BACKUP ──
echo ""
echo "[1/7] Creando backup..."
mkdir -p "$BACKUP_DIR"
cp "$CONTEO_DIR/backend/config.py" "$BACKUP_DIR/config.py.bak"
cp "$CONTEO_DIR/backend/routes/auth.py" "$BACKUP_DIR/auth.py.bak"
cp "$CONTEO_DIR/backend/routes/users.py" "$BACKUP_DIR/users.py.bak"
cp "$CONTEO_DIR/frontend/src/App.jsx" "$BACKUP_DIR/App.jsx.bak"
echo "   Backup creado en: $BACKUP_DIR"

# ── 2. CONFIG.PY ──
echo ""
echo "[2/7] Actualizando config.py..."
if ! grep -q "access_logs_collection" "$CONTEO_DIR/backend/config.py"; then
  sed -i '/^hourly_snapshots_collection = db\["hourly_snapshots"\]/a access_logs_collection = db["access_logs"]' "$CONTEO_DIR/backend/config.py"
  echo "   [OK] access_logs_collection anadida"
else
  echo "   [OK] access_logs_collection ya existe"
fi

# ── 3. AUTH.PY ──
echo ""
echo "[3/7] Actualizando auth.py..."
cat > "$CONTEO_DIR/backend/routes/auth.py" << 'AUTHEOF'
"""
Auth routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Body, Depends, Request
from datetime import datetime, timezone
import uuid

from config import users_collection, access_logs_collection, logger
from services.auth_service import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(request: Request, username: str = Body(...), password: str = Body(...)):
    """Login with username and password"""
    user = await users_collection.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")

    token = create_access_token({"sub": user["id"], "username": user["username"], "role": user.get("role", "viewer")})

    await users_collection.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )

    # Record access log
    client_ip = request.headers.get("x-forwarded-for", request.headers.get("x-real-ip", request.client.host if request.client else "unknown"))
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    await access_logs_collection.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "full_name": user.get("full_name", user["username"]),
        "role": user.get("role", "viewer"),
        "ip_address": client_ip,
        "login_time": datetime.now(timezone.utc).isoformat(),
        "user_agent": request.headers.get("user-agent", "unknown")
    })

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user.get("role", "viewer"),
            "full_name": user.get("full_name", user["username"]),
            "allowed_brands": user.get("allowed_brands", []),
            "allowed_islands": user.get("allowed_islands", [])
        }
    }


@router.post("/change-password")
async def change_password(
    current_password: str = Body(...),
    new_password: str = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Change own password"""
    user = await users_collection.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not verify_password(current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Contrasena actual incorrecta")
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="La nueva contrasena debe tener al menos 4 caracteres")

    await users_collection.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": get_password_hash(new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Contrasena actualizada correctamente"}


@router.post("/create-user")
async def create_user(
    username: str = Body(...),
    password: str = Body(...),
    role: str = Body(default="viewer"),
    full_name: str = Body(default="")
):
    """Create a new user (for initial setup)"""
    existing = await users_collection.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": get_password_hash(password),
        "role": role,
        "full_name": full_name or username,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await users_collection.insert_one(user)

    return {"message": "Usuario creado", "username": username}
AUTHEOF
echo "   [OK] auth.py actualizado"

# ── 4. USERS.PY ──
echo ""
echo "[4/7] Actualizando users.py..."
cat > "$CONTEO_DIR/backend/routes/users.py" << 'USERSEOF'
"""
User management routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from config import users_collection, access_logs_collection, logger
from services.auth_service import get_current_user, get_password_hash

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def get_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver usuarios")
    users = await users_collection.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    for u in users:
        if "is_active" not in u:
            u["is_active"] = True
        if "allowed_brands" not in u:
            u["allowed_brands"] = []
        if "allowed_islands" not in u:
            u["allowed_islands"] = []
    return {"users": users, "total": len(users)}


@router.post("")
async def create_user(
    username: str = Body(...),
    password: str = Body(...),
    role: str = Body(default="viewer"),
    full_name: str = Body(default=""),
    allowed_brands: Optional[List[str]] = Body(default=[]),
    allowed_islands: Optional[List[str]] = Body(default=[]),
    current_user: dict = Depends(get_current_user)
):
    """Create a new user (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear usuarios")

    existing = await users_collection.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": get_password_hash(password),
        "role": role,
        "full_name": full_name or username,
        "is_active": True,
        "allowed_brands": allowed_brands or [],
        "allowed_islands": allowed_islands or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("username")
    }
    await users_collection.insert_one(user)
    return {"message": "Usuario creado", "username": username, "role": role}


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    full_name: Optional[str] = Body(None),
    role: Optional[str] = Body(None),
    is_active: Optional[bool] = Body(None),
    password: Optional[str] = Body(None),
    allowed_brands: Optional[List[str]] = Body(None),
    allowed_islands: Optional[List[str]] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a user (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede editar usuarios")

    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if full_name is not None:
        update["full_name"] = full_name
    if role is not None:
        update["role"] = role
    if is_active is not None:
        update["is_active"] = is_active
    if password:
        update["password_hash"] = get_password_hash(password)
    if allowed_brands is not None:
        update["allowed_brands"] = allowed_brands
    if allowed_islands is not None:
        update["allowed_islands"] = allowed_islands

    await users_collection.update_one({"id": user_id}, {"$set": update})
    return {"message": "Usuario actualizado"}


@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a user (admin only, cannot delete self)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede eliminar usuarios")

    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")

    result = await users_collection.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}


@router.get("/access-logs")
async def get_access_logs(
    limit: int = 100,
    skip: int = 0,
    username: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get access logs (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver logs de acceso")

    query = {}
    if username:
        query["username"] = username

    total = await access_logs_collection.count_documents(query)
    logs = await access_logs_collection.find(query, {"_id": 0}).sort("login_time", -1).skip(skip).limit(limit).to_list(limit)
    return {"logs": logs, "total": total, "limit": limit, "skip": skip}
USERSEOF
echo "   [OK] users.py actualizado"

# ── 5. APP.JSX - Frontend patches ──
echo ""
echo "[5/7] Parcheando App.jsx del frontend..."
APP_FILE="$CONTEO_DIR/frontend/src/App.jsx"

# 5a. Add ClipboardList to lucide import
if ! grep -q "ClipboardList" "$APP_FILE"; then
  sed -i "s/ChevronRight, ChevronLeft$/ChevronRight, ChevronLeft,\n  ClipboardList/" "$APP_FILE"
  # Fallback if the above didn't work (different line endings)
  if ! grep -q "ClipboardList" "$APP_FILE"; then
    sed -i "s/ChevronLeft\s*$/ChevronLeft, ClipboardList/" "$APP_FILE"
  fi
  echo "   [OK] ClipboardList import anadido"
else
  echo "   [OK] ClipboardList ya importado"
fi

# 5b. Add showChangePw state
if ! grep -q "showChangePw" "$APP_FILE"; then
  sed -i "s/const \[mobileNav, setMobileNav\] = useState(false);/const [mobileNav, setMobileNav] = useState(false);\n  const [showChangePw, setShowChangePw] = useState(false);/" "$APP_FILE"
  echo "   [OK] Estado showChangePw anadido"
else
  echo "   [OK] Estado showChangePw ya existe"
fi

# 5c. Add access-logs nav item
if ! grep -q "access-logs" "$APP_FILE"; then
  sed -i "s/\.\.\.(user?.role === 'admin' ? \[{ id: 'users', label: 'Usuarios', icon: UserCog }\] : \[\]),/\.\.\.(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),\n    \.\.\.(user?.role === 'admin' ? [{ id: 'access-logs', label: 'Logs de Acceso', icon: ClipboardList }] : []),/" "$APP_FILE"
  if ! grep -q "access-logs" "$APP_FILE"; then
    # Fallback: use python for more reliable patching
    python3 -c "
import re
with open('$APP_FILE', 'r') as f:
    content = f.read()
old = \"...(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),\"
new = old + \"\n    ...(user?.role === 'admin' ? [{ id: 'access-logs', label: 'Logs de Acceso', icon: ClipboardList }] : []),\"
content = content.replace(old, new)
with open('$APP_FILE', 'w') as f:
    f.write(content)
"
  fi
  echo "   [OK] Nav 'Logs de Acceso' anadido"
else
  echo "   [OK] Nav 'Logs de Acceso' ya existe"
fi

# 5d. Add change password button in header
if ! grep -q "change-password-btn" "$APP_FILE"; then
  python3 -c "
with open('$APP_FILE', 'r') as f:
    content = f.read()
old = '''          <div className=\"header-sep\" />
          <div className=\"header-user\">'''
new = '''          <div className=\"header-sep\" />
          <button className=\"header-icon-btn\" onClick={() => setShowChangePw(true)} data-testid=\"change-password-btn\" title=\"Cambiar contrasena\">
            <Key size={14} />
          </button>
          <div className=\"header-user\">'''
content = content.replace(old, new)
with open('$APP_FILE', 'w') as f:
    f.write(content)
"
  echo "   [OK] Boton cambiar contrasena anadido al header"
else
  echo "   [OK] Boton cambiar contrasena ya existe"
fi

# 5e. Add access-logs view render + change password modal
if ! grep -q "AccessLogsView" "$APP_FILE"; then
  python3 -c "
with open('$APP_FILE', 'r') as f:
    content = f.read()
# Add access-logs view and modal
old = '''          {view === 'users' && <UsersView data={data} api={api} onRefresh={fetchData} currentUser={user} />}
        </>}
      </main>'''
new = '''          {view === 'users' && <UsersView data={data} api={api} onRefresh={fetchData} currentUser={user} />}
          {view === 'access-logs' && <AccessLogsView api={api} />}
        </>}
      </main>

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} api={api} />}'''
content = content.replace(old, new)
with open('$APP_FILE', 'w') as f:
    f.write(content)
"
  echo "   [OK] Vistas de logs y modal anadidas"
else
  echo "   [OK] Vistas ya existen"
fi

# 5f. Handle access-logs in fetchData (skip fetching since component is self-managed)
if ! grep -q "access-logs.*return" "$APP_FILE"; then
  python3 -c "
with open('$APP_FILE', 'r') as f:
    content = f.read()
old = \"else if (view === 'users') res = await api('get', '/users');\"
new = old + \"\n      else if (view === 'access-logs') { setLoading(false); return; }\"
content = content.replace(old, new)
with open('$APP_FILE', 'w') as f:
    f.write(content)
"
  echo "   [OK] fetchData parcheado para access-logs"
else
  echo "   [OK] fetchData ya parcheado"
fi

# 5g. Add ChangePasswordModal and AccessLogsView components
if ! grep -q "ChangePasswordModal" "$APP_FILE"; then
  python3 << 'PYEOF'
with open("/opt/siempria-conteo/frontend/src/App.jsx", "r") as f:
    content = f.read()

components = '''
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
    if (newPw.length < 4) { setError('La nueva contrasena debe tener al menos 4 caracteres'); return; }
    if (newPw !== confirmPw) { setError('Las contrasenas no coinciden'); return; }
    setLoading(true);
    try {
      const res = await api('post', '/auth/change-password', { current_password: currentPw, new_password: newPw });
      setSuccess(res.data.message || 'Contrasena actualizada');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cambiar contrasena');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Cambiar Contrasena" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="form-field">
          <label>Contrasena actual</label>
          <div className="login-input-wrap">
            <Lock size={16} />
            <input data-testid="change-pw-current" type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError(''); }} placeholder="Contrasena actual" />
            <button type="button" className="login-pw-toggle" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
        </div>
        <div className="form-field">
          <label>Nueva contrasena</label>
          <div className="login-input-wrap">
            <Key size={16} />
            <input data-testid="change-pw-new" type={showNew ? 'text' : 'password'} value={newPw} onChange={e => { setNewPw(e.target.value); setError(''); }} placeholder="Nueva contrasena" />
            <button type="button" className="login-pw-toggle" onClick={() => setShowNew(!showNew)}>{showNew ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
        </div>
        <div className="form-field">
          <label>Confirmar nueva contrasena</label>
          <div className="login-input-wrap">
            <Key size={16} />
            <input data-testid="change-pw-confirm" type={showNew ? 'text' : 'password'} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(''); }} placeholder="Repetir contrasena" />
          </div>
        </div>
        {error && <div className="login-error"><AlertCircle size={14} /><span>{error}</span></div>}
        {success && <div style={{ color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} /><span>{success}</span></div>}
        <div className="modal-btns">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading} data-testid="change-pw-submit">
            {loading ? <RefreshCw size={16} className="spin" /> : <><Key size={16} /> Cambiar</>}
          </button>
        </div>
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
    try {
      let url = "/users/access-logs?limit=" + pageSize + "&skip=" + (page * pageSize);
      if (filterUser) url += "&username=" + filterUser;
      const res = await api('get', url);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally { setLoading(false); }
  }, [api, page, filterUser]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
            <input data-testid="logs-filter-user" type="text" value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(0); }} placeholder="Filtrar por usuario..." style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }} />
            {filterUser && <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} onClick={() => { setFilterUser(''); setPage(0); }}><X size={14} /></button>}
          </div>
          <button className="btn-outline" onClick={fetchLogs} data-testid="logs-refresh-btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>
        {loading && logs.length === 0 ? <LoadingState /> : logs.length === 0 ? <EmptyState text="No hay registros de acceso" /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>IP</th>
                  <th>Fecha / Hora</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id || i} data-testid={"log-row-" + i}>
                    <td className="mono">@{log.username}</td>
                    <td>{log.full_name || log.username}</td>
                    <td><span className={"tag tag-" + (log.role || 'viewer')}>{log.role === 'admin' ? 'Admin' : log.role === 'operator' ? 'Operador' : 'Viewer'}</span></td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{log.ip_address || '-'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{formatDate(log.login_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} data-testid="logs-prev-page">
              <ChevronLeft size={16} /> Anterior
            </button>
            <span style={{ fontSize: '0.82rem', color: '#94A0B0' }}>Pagina {page + 1} de {totalPages}</span>
            <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} data-testid="logs-next-page">
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'''

# Insert before the App() export
marker = "/* ═══════════════ APP ═══════════════ */"
content = content.replace(marker, components + marker)

with open("/opt/siempria-conteo/frontend/src/App.jsx", "w") as f:
    f.write(content)
print("   [OK] Componentes ChangePasswordModal y AccessLogsView anadidos")
PYEOF
else
  echo "   [OK] Componentes ya existen"
fi

# ── 6. BUILD FRONTEND ──
echo ""
echo "[6/7] Compilando frontend..."
cd "$CONTEO_DIR/frontend"
if command -v yarn &> /dev/null; then
  yarn build 2>&1 | tail -3
elif command -v npm &> /dev/null; then
  npm run build 2>&1 | tail -3
fi

# ── 7. RESTART ──
echo ""
echo "[7/7] Reiniciando servicio..."
systemctl restart siempria-conteo
sleep 2
systemctl status siempria-conteo --no-pager | head -5

echo ""
echo "============================================="
echo " DESPLIEGUE v10 COMPLETADO"
echo "============================================="
echo ""
echo " Nuevas funcionalidades:"
echo "  - Boton llave en header para cambiar contrasena"
echo "  - Menu 'Logs de Acceso' en el sidebar (solo admin)"
echo "  - Cada login queda registrado con IP, fecha y navegador"
echo "  - Filtro por usuario y paginacion en logs"
echo ""
echo " Backup en: $BACKUP_DIR"
echo "============================================="
