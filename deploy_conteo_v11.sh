#!/bin/bash
# ============================================================
# Siempria Conteo v11 - MEGA UPDATE
# - Cambiar contrasena (header button + modal)
# - Logs de acceso (admin)
# - Alertas de seguridad (3 fallos login -> email)
# - Reportes configurables (todos los usuarios)
# - Configuracion SMTP (admin)
# ============================================================
set -e
CONTEO="/opt/siempria-conteo"
BK="/opt/backups/conteo_v11_$(date +%Y%m%d_%H%M%S)"

echo "============================================="
echo " Siempria Conteo v11 - INICIO"
echo "============================================="
echo "[1/8] Backup..."
mkdir -p "$BK"
cp "$CONTEO/backend/config.py" "$BK/"
cp "$CONTEO/backend/server.py" "$BK/"
cp "$CONTEO/backend/routes/auth.py" "$BK/"
cp "$CONTEO/backend/routes/users.py" "$BK/"
cp "$CONTEO/frontend/src/App.jsx" "$BK/"
echo "  -> $BK"

# ── 2. CONFIG.PY ──
echo "[2/8] config.py..."
if ! grep -q "access_logs_collection" "$CONTEO/backend/config.py"; then
  sed -i '/^hourly_snapshots_collection/a access_logs_collection = db["access_logs"]' "$CONTEO/backend/config.py"
fi
echo "  OK"


# ── 3. EMAIL SERVICE ──
echo "[3/8] services/email_service.py..."
mkdir -p "$CONTEO/backend/services"
cat > "$CONTEO/backend/services/email_service.py" << 'EMAILEOF'
"""
Email service for Siempria Conteo
Uses SMTP (configurable via admin panel, stored in MongoDB)
"""
import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

logger = logging.getLogger("email_service")

DEFAULT_SMTP = {
    "smtp_host": "",
    "smtp_port": 587,
    "smtp_user": "",
    "smtp_password": "",
    "from_email": "alertas@siempria.com",
    "from_name": "Siempria Conteo",
    "enabled": False
}


async def get_email_config(db):
    """Get email config from DB or return defaults"""
    config = await db["email_config"].find_one({"_id": "smtp_settings"})
    if not config:
        return DEFAULT_SMTP.copy()
    config.pop("_id", None)
    return config


async def save_email_config(db, config_data):
    """Save email config to DB"""
    config_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db["email_config"].update_one(
        {"_id": "smtp_settings"},
        {"$set": config_data},
        upsert=True
    )


def _send_email_sync(config, to_email, subject, html_body):
    """Synchronous email send via SMTP"""
    if not config.get("enabled"):
        logger.info(f"[EMAIL DISABLED] To: {to_email} | Subject: {subject}")
        return False

    if not config.get("smtp_host") or not config.get("smtp_user"):
        logger.warning("[EMAIL] SMTP not configured")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{config.get('from_name', 'Siempria')} <{config.get('from_email', 'alertas@siempria.com')}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(config["smtp_host"], int(config.get("smtp_port", 587)), timeout=10) as server:
            server.starttls()
            server.login(config["smtp_user"], config["smtp_password"])
            server.send_message(msg)
        logger.info(f"[EMAIL OK] To: {to_email} | Subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL ERROR] {e}")
        return False


async def send_email(db, to_email, subject, html_body):
    """Async wrapper for sending email"""
    config = await get_email_config(db)
    return await asyncio.to_thread(_send_email_sync, config, to_email, subject, html_body)


async def send_failed_login_alert(db, username, ip_address, attempts):
    """Send alert when user fails login multiple times"""
    config = await get_email_config(db)
    alert_email = config.get("alert_email", "luis.gonzalez@siempria.com")
    now = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S UTC")

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:#e74c3c;padding:16px 24px;">
        <h2 style="margin:0;color:#fff;">Alerta de Seguridad - Siempria Conteo</h2>
      </div>
      <div style="padding:24px;">
        <p style="font-size:16px;">Se han detectado <strong style="color:#e74c3c;">{attempts} intentos fallidos</strong> de inicio de sesion:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#888;">Usuario:</td><td style="padding:8px;"><strong>{username}</strong></td></tr>
          <tr><td style="padding:8px;color:#888;">IP:</td><td style="padding:8px;"><code>{ip_address}</code></td></tr>
          <tr><td style="padding:8px;color:#888;">Fecha:</td><td style="padding:8px;">{now}</td></tr>
        </table>
        <p style="color:#888;font-size:13px;">Este es un mensaje automatico de Siempria Conteo.</p>
      </div>
    </div>
    """
    await send_email(db, alert_email, f"[ALERTA] {attempts} intentos fallidos - {username}", html)

EMAILEOF
echo "  OK"

# ── 4. AUTH.PY ──
echo "[4/8] routes/auth.py..."
cat > "$CONTEO/backend/routes/auth.py" << 'AUTHEOF'
"""
Auth routes for Siempria Conteo
"""
from fastapi import APIRouter, HTTPException, Body, Depends, Request
from datetime import datetime, timezone
import uuid

from config import users_collection, access_logs_collection, db, logger
from services.auth_service import verify_password, get_password_hash, create_access_token, get_current_user
from services.email_service import send_failed_login_alert

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory failed login tracker {username: {"count": N, "last_attempt": datetime}}
_failed_logins = {}
FAILED_LOGIN_THRESHOLD = 3


@router.post("/login")
async def login(request: Request, username: str = Body(...), password: str = Body(...)):
    """Login with username and password"""
    client_ip = request.headers.get("x-forwarded-for", request.headers.get("x-real-ip", request.client.host if request.client else "unknown"))
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    user = await users_collection.find_one({"username": username}, {"_id": 0})
    if not user or not verify_password(password, user.get("password_hash", "")):
        # Track failed login
        key = username.lower()
        if key not in _failed_logins:
            _failed_logins[key] = {"count": 0, "last_attempt": None}
        _failed_logins[key]["count"] += 1
        _failed_logins[key]["last_attempt"] = datetime.now(timezone.utc).isoformat()
        count = _failed_logins[key]["count"]

        # Log failed attempt
        await db["failed_login_log"].insert_one({
            "username": username,
            "ip_address": client_ip,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "attempt_number": count
        })

        # Send alert every FAILED_LOGIN_THRESHOLD attempts
        if count >= FAILED_LOGIN_THRESHOLD and count % FAILED_LOGIN_THRESHOLD == 0:
            logger.warning(f"[SECURITY] {count} failed logins for '{username}' from {client_ip}")
            try:
                await send_failed_login_alert(db, username, client_ip, count)
            except Exception as e:
                logger.error(f"Failed to send alert email: {e}")

        raise HTTPException(status_code=401, detail="Credenciales invalidas")

    # Reset failed login counter on success
    _failed_logins.pop(username.lower(), None)

    token = create_access_token({"sub": user["id"], "username": user["username"], "role": user.get("role", "viewer")})

    await users_collection.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )

    # Record access log
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
echo "  OK"

# ── 5a. USERS.PY ──
echo "[5/8] routes/users.py + email_settings.py + reports.py..."
cat > "$CONTEO/backend/routes/users.py" << 'USERSEOF'
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
cat > "$CONTEO/backend/routes/email_settings.py" << 'EMAILSEOF'
"""
Email settings routes (admin only)
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional

from config import db, logger
from services.auth_service import get_current_user
from services.email_service import get_email_config, save_email_config, send_email

router = APIRouter(prefix="/email-settings", tags=["email"])


@router.get("")
async def get_settings(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    config = await get_email_config(db)
    config.pop("smtp_password", None)
    return config


@router.put("")
async def update_settings(
    smtp_host: Optional[str] = Body(None),
    smtp_port: Optional[int] = Body(None),
    smtp_user: Optional[str] = Body(None),
    smtp_password: Optional[str] = Body(None),
    from_email: Optional[str] = Body(None),
    from_name: Optional[str] = Body(None),
    alert_email: Optional[str] = Body(None),
    enabled: Optional[bool] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")

    current = await get_email_config(db)
    if smtp_host is not None: current["smtp_host"] = smtp_host
    if smtp_port is not None: current["smtp_port"] = smtp_port
    if smtp_user is not None: current["smtp_user"] = smtp_user
    if smtp_password is not None: current["smtp_password"] = smtp_password
    if from_email is not None: current["from_email"] = from_email
    if from_name is not None: current["from_name"] = from_name
    if alert_email is not None: current["alert_email"] = alert_email
    if enabled is not None: current["enabled"] = enabled

    await save_email_config(db, current)
    current.pop("smtp_password", None)
    return {"message": "Configuracion actualizada", "config": current}


@router.post("/test")
async def test_email(
    to_email: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")

    html = """
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:#22c55e;padding:16px 24px;">
        <h2 style="margin:0;color:#fff;">Email de Prueba - Siempria Conteo</h2>
      </div>
      <div style="padding:24px;">
        <p>Si ves este mensaje, la configuracion SMTP funciona correctamente.</p>
      </div>
    </div>
    """
    result = await send_email(db, to_email, "[TEST] Siempria Conteo - Email de prueba", html)
    if result:
        return {"message": f"Email de prueba enviado a {to_email}"}
    raise HTTPException(status_code=500, detail="No se pudo enviar. Verifica la configuracion SMTP.")

EMAILSEOF
cat > "$CONTEO/backend/routes/reports.py" << 'REPORTSEOF'
"""
Report configuration routes
All authenticated users can create/manage their own reports
Admin can see all reports
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from config import db, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def get_reports(current_user: dict = Depends(get_current_user)):
    """Get reports - admin sees all, others see only their own"""
    query = {} if current_user.get("role") == "admin" else {"created_by": current_user["id"]}
    reports = await db["report_configs"].find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"reports": reports, "total": len(reports)}


@router.post("")
async def create_report(
    name: str = Body(...),
    report_type: str = Body(default="daily"),
    frequency: str = Body(default="daily"),
    email: str = Body(...),
    brands: Optional[List[str]] = Body(default=[]),
    centers: Optional[List[str]] = Body(default=[]),
    islands: Optional[List[str]] = Body(default=[]),
    enabled: bool = Body(default=True),
    current_user: dict = Depends(get_current_user)
):
    """Create a new report config"""
    report = {
        "id": str(uuid.uuid4()),
        "name": name,
        "report_type": report_type,
        "frequency": frequency,
        "email": email,
        "brands": brands or [],
        "centers": centers or [],
        "islands": islands or [],
        "enabled": enabled,
        "created_by": current_user["id"],
        "created_by_name": current_user.get("username", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_sent": None
    }
    await db["report_configs"].insert_one(report)
    return {"message": "Reporte creado", "report": {k: v for k, v in report.items() if k != "_id"}}


@router.put("/{report_id}")
async def update_report(
    report_id: str,
    name: Optional[str] = Body(None),
    report_type: Optional[str] = Body(None),
    frequency: Optional[str] = Body(None),
    email: Optional[str] = Body(None),
    brands: Optional[List[str]] = Body(None),
    centers: Optional[List[str]] = Body(None),
    islands: Optional[List[str]] = Body(None),
    enabled: Optional[bool] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a report config"""
    report = await db["report_configs"].find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if current_user.get("role") != "admin" and report.get("created_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este reporte")

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name is not None: update["name"] = name
    if report_type is not None: update["report_type"] = report_type
    if frequency is not None: update["frequency"] = frequency
    if email is not None: update["email"] = email
    if brands is not None: update["brands"] = brands
    if centers is not None: update["centers"] = centers
    if islands is not None: update["islands"] = islands
    if enabled is not None: update["enabled"] = enabled

    await db["report_configs"].update_one({"id": report_id}, {"$set": update})
    return {"message": "Reporte actualizado"}


@router.delete("/{report_id}")
async def delete_report(report_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a report config"""
    report = await db["report_configs"].find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if current_user.get("role") != "admin" and report.get("created_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")

    await db["report_configs"].delete_one({"id": report_id})
    return {"message": "Reporte eliminado"}

REPORTSEOF
echo "  OK"

# ── 5b. SERVER.PY - Add new routers ──
if ! grep -q "email_settings" "$CONTEO/backend/server.py"; then
  sed -i '/from routes.analytics import/a from routes.email_settings import router as email_settings_router\nfrom routes.reports import router as reports_router' "$CONTEO/backend/server.py"
  sed -i '/app.include_router(analytics_router/a app.include_router(email_settings_router, prefix="/api")\napp.include_router(reports_router, prefix="/api")' "$CONTEO/backend/server.py"
  echo "  server.py: routers anadidos"
else
  echo "  server.py: ya actualizado"
fi

# ── 6. FRONTEND PATCHES ──
echo "[6/8] Parcheando App.jsx..."
APP="$CONTEO/frontend/src/App.jsx"

python3 << 'PYEOF'
import sys
app_file = "/opt/siempria-conteo/frontend/src/App.jsx"
with open(app_file, "r") as f:
    content = f.read()

changes = 0

# 1. Add ClipboardList, Mail, Settings imports
if "ClipboardList" not in content:
    content = content.replace("ChevronRight, ChevronLeft", "ChevronRight, ChevronLeft,\n  ClipboardList, Mail, Settings")
    changes += 1
    print("  + ClipboardList/Mail/Settings imports")
elif "Mail" not in content and "lucide-react" in content:
    content = content.replace("ClipboardList", "ClipboardList, Mail, Settings")
    changes += 1
    print("  + Mail/Settings imports")

# 2. Add showChangePw state
if "showChangePw" not in content:
    content = content.replace(
        "const [mobileNav, setMobileNav] = useState(false);",
        "const [mobileNav, setMobileNav] = useState(false);\n  const [showChangePw, setShowChangePw] = useState(false);"
    )
    changes += 1
    print("  + showChangePw state")

# 3. Add nav items for admin
if "access-logs" not in content:
    content = content.replace(
        "...(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),",
        "...(user?.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: UserCog }] : []),\n    ...(user?.role === 'admin' ? [{ id: 'access-logs', label: 'Logs de Acceso', icon: ClipboardList }] : []),\n    ...(user?.role === 'admin' ? [{ id: 'email-settings', label: 'Config Email', icon: Mail }] : []),\n    { id: 'reports', label: 'Reportes', icon: FileSpreadsheet },"
    )
    changes += 1
    print("  + Nav items (logs, email, reports)")

# 4. Add change password button in header
if "change-password-btn" not in content:
    content = content.replace(
        '          <div className="header-sep" />\n          <div className="header-user">',
        '          <div className="header-sep" />\n          <button className="header-icon-btn" onClick={() => setShowChangePw(true)} data-testid="change-password-btn" title="Cambiar contrasena">\n            <Key size={14} />\n          </button>\n          <div className="header-user">'
    )
    changes += 1
    print("  + Change password header button")

# 5. Handle new views in fetchData
if "access-logs" not in content or "setLoading(false); return;" not in content:
    content = content.replace(
        "else if (view === 'users') res = await api('get', '/users');",
        "else if (view === 'users') res = await api('get', '/users');\n      else if (view === 'access-logs' || view === 'email-settings' || view === 'reports') { setLoading(false); return; }"
    )
    changes += 1
    print("  + fetchData bypass for self-managed views")

# 6. Add view renders + modal
if "AccessLogsView" not in content:
    content = content.replace(
        "          {view === 'users' && <UsersView data={data} api={api} onRefresh={fetchData} currentUser={user} />}\n        </>}\n      </main>",
        "          {view === 'users' && <UsersView data={data} api={api} onRefresh={fetchData} currentUser={user} />}\n          {view === 'access-logs' && <AccessLogsView api={api} />}\n          {view === 'email-settings' && <EmailSettingsView api={api} />}\n          {view === 'reports' && <ReportsConfigView api={api} user={user} />}\n        </>}\n      </main>\n\n      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} api={api} />}"
    )
    changes += 1
    print("  + View renders + modal")

# 7. Add components before APP marker
if "ChangePasswordModal" not in content:
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
    if (newPw.length < 4) { setError('Min 4 caracteres'); return; }
    if (newPw !== confirmPw) { setError('Las contrasenas no coinciden'); return; }
    setLoading(true);
    try {
      const res = await api('post', '/auth/change-password', { current_password: currentPw, new_password: newPw });
      setSuccess(res.data.message || 'Actualizada');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Cambiar Contrasena" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="form-field">
          <label>Contrasena actual</label>
          <div className="login-input-wrap">
            <Lock size={16} />
            <input data-testid="change-pw-current" type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError(''); }} placeholder="Actual" />
            <button type="button" className="login-pw-toggle" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
          </div>
        </div>
        <div className="form-field">
          <label>Nueva contrasena</label>
          <div className="login-input-wrap">
            <Key size={16} />
            <input data-testid="change-pw-new" type={showNew ? 'text' : 'password'} value={newPw} onChange={e => { setNewPw(e.target.value); setError(''); }} placeholder="Nueva" />
            <button type="button" className="login-pw-toggle" onClick={() => setShowNew(!showNew)}>{showNew ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
          </div>
        </div>
        <div className="form-field">
          <label>Confirmar</label>
          <div className="login-input-wrap">
            <Key size={16} />
            <input data-testid="change-pw-confirm" type={showNew ? 'text' : 'password'} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(''); }} placeholder="Repetir" />
          </div>
        </div>
        {error && <div className="login-error"><AlertCircle size={14}/><span>{error}</span></div>}
        {success && <div style={{color:'#22c55e',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:'0.4rem'}}><Check size={14}/><span>{success}</span></div>}
        <div className="modal-btns">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading} data-testid="change-pw-submit">
            {loading ? <RefreshCw size={16} className="spin"/> : <><Key size={16}/> Cambiar</>}
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
      setLogs(res.data.logs || []); setTotal(res.data.total || 0);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, page, filterUser]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  const totalPages = Math.ceil(total / pageSize);
  const fmtDate = (iso) => { if (!iso) return '-'; return new Date(iso).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}); };
  return (
    <div className="view-wrap" data-testid="access-logs-view">
      <div className="card">
        <div className="card-header-row"><h2 className="card-title"><ClipboardList size={18}/> Logs de Acceso</h2><span className="count-badge">{total}</span></div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap'}}>
          <div className="login-input-wrap" style={{maxWidth:240,flex:1}}>
            <Filter size={14}/>
            <input data-testid="logs-filter-user" type="text" value={filterUser} onChange={e=>{setFilterUser(e.target.value);setPage(0);}} placeholder="Filtrar usuario..." style={{border:'none',outline:'none',background:'transparent',width:'100%'}}/>
            {filterUser && <button style={{background:'none',border:'none',cursor:'pointer',padding:2}} onClick={()=>{setFilterUser('');setPage(0);}}><X size={14}/></button>}
          </div>
          <button className="btn-outline" onClick={fetchLogs} data-testid="logs-refresh-btn" style={{padding:'0.4rem 0.75rem',fontSize:'0.8rem'}}><RefreshCw size={14} className={loading?'spin':''}/> Actualizar</button>
        </div>
        {loading && logs.length===0 ? <LoadingState/> : logs.length===0 ? <EmptyState text="No hay registros"/> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>IP</th><th>Fecha</th></tr></thead><tbody>
            {logs.map((l,i)=>(<tr key={l.id||i}><td className="mono">@{l.username}</td><td>{l.full_name||l.username}</td><td><span className={"tag tag-"+(l.role||'viewer')}>{l.role==='admin'?'Admin':l.role==='operator'?'Operador':'Viewer'}</span></td><td className="mono" style={{fontSize:'0.78rem'}}>{l.ip_address||'-'}</td><td style={{fontSize:'0.82rem'}}>{fmtDate(l.login_time)}</td></tr>))}
          </tbody></table></div>
        )}
        {totalPages>1 && <div style={{display:'flex',justifyContent:'center',gap:'0.5rem',marginTop:'1rem',alignItems:'center'}}>
          <button className="btn-ghost" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}><ChevronLeft size={16}/> Anterior</button>
          <span style={{fontSize:'0.82rem',color:'#94A0B0'}}>Pag {page+1}/{totalPages}</span>
          <button className="btn-ghost" onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1}>Siguiente <ChevronRight size={16}/></button>
        </div>}
      </div>
    </div>
  );
}

/* ═══════════════ EMAIL SETTINGS VIEW (Admin) ═══════════════ */
function EmailSettingsView({ api }) {
  const [config, setConfig] = useState({smtp_host:'',smtp_port:587,smtp_user:'',smtp_password:'',from_email:'alertas@siempria.com',from_name:'Siempria Conteo',alert_email:'luis.gonzalez@siempria.com',enabled:false});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => { (async()=>{try{const r=await api('get','/email-settings');setConfig(c=>({...c,...r.data}));}catch(e){}finally{setLoading(false);}})(); }, [api]);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try { await api('put','/email-settings',config); setMsg('Guardado'); } catch(e){ setMsg('Error: '+(e.response?.data?.detail||e.message)); } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    try { const r = await api('post','/email-settings/test',{to_email:testEmail}); setMsg(r.data.message); } catch(e){ setMsg('Error: '+(e.response?.data?.detail||e.message)); }
  };

  if (loading) return <LoadingState/>;

  const F = ({label,field,type}) => (
    <div className="form-field" style={{flex:1,minWidth:200}}>
      <label>{label}</label>
      <input type={type||'text'} value={config[field]||''} onChange={e=>setConfig(c=>({...c,[field]:type==='number'?parseInt(e.target.value)||0:e.target.value}))} className="modal-input"/>
    </div>
  );

  return (
    <div className="view-wrap" data-testid="email-settings-view">
      <div className="card">
        <div className="card-header-row"><h2 className="card-title"><Mail size={18}/> Configuracion Email (SMTP)</h2></div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}>
          <F label="SMTP Host" field="smtp_host"/>
          <F label="Puerto" field="smtp_port" type="number"/>
          <F label="Usuario SMTP" field="smtp_user"/>
          <F label="Password SMTP" field="smtp_password" type="password"/>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'0.75rem'}}>
          <F label="Email remitente" field="from_email"/>
          <F label="Nombre remitente" field="from_name"/>
          <F label="Email alertas seguridad" field="alert_email"/>
        </div>
        <div style={{marginTop:'1rem',display:'flex',alignItems:'center',gap:'1rem'}}>
          <label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer'}}>
            <input type="checkbox" checked={config.enabled||false} onChange={e=>setConfig(c=>({...c,enabled:e.target.checked}))}/>
            Activar envio de emails
          </label>
        </div>
        <div className="modal-btns" style={{marginTop:'1rem'}}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?<RefreshCw size={16} className="spin"/>:<><Save size={16}/> Guardar</>}</button>
        </div>
        <div style={{marginTop:'1.5rem',borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:'1rem'}}>
          <h3 style={{fontSize:'0.9rem',marginBottom:'0.5rem'}}>Enviar email de prueba</h3>
          <div style={{display:'flex',gap:'0.5rem'}}>
            <input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="email@ejemplo.com" className="modal-input" style={{flex:1}}/>
            <button className="btn-outline" onClick={handleTest}>Enviar test</button>
          </div>
        </div>
        {msg && <div style={{marginTop:'0.75rem',padding:'0.5rem 1rem',borderRadius:6,background:msg.startsWith('Error')?'rgba(239,68,68,0.15)':'rgba(34,197,94,0.15)',color:msg.startsWith('Error')?'#ef4444':'#22c55e',fontSize:'0.85rem'}}>{msg}</div>}
      </div>
    </div>
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

  const fetchReports = useCallback(async()=>{
    setLoading(true);
    try{const r=await api('get','/reports');setReports(r.data.reports||[]);}catch(e){}finally{setLoading(false);}
  },[api]);
  useEffect(()=>{fetchReports();},[fetchReports]);

  const handleSave = async () => {
    setMsg('');
    try {
      if (editing) { await api('put','/reports/'+editing,form); }
      else { await api('post','/reports',form); }
      setShowForm(false); setEditing(null); setForm({name:'',report_type:'daily',frequency:'daily',email:'',islands:[],brands:[],centers:[],enabled:true});
      fetchReports();
    } catch(e){ setMsg(e.response?.data?.detail||'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este reporte?')) return;
    try { await api('delete','/reports/'+id); fetchReports(); } catch(e){}
  };

  const startEdit = (r) => { setForm({name:r.name,report_type:r.report_type,frequency:r.frequency,email:r.email,islands:r.islands||[],brands:r.brands||[],centers:r.centers||[],enabled:r.enabled}); setEditing(r.id); setShowForm(true); };

  const freqLabel = {daily:'Diario',weekly:'Semanal',monthly:'Mensual'};

  return (
    <div className="view-wrap" data-testid="reports-config-view">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title"><FileSpreadsheet size={18}/> Reportes Automaticos</h2>
          <button className="btn-primary" onClick={()=>{setShowForm(true);setEditing(null);setForm({name:'',report_type:'daily',frequency:'daily',email:user?.email||'',islands:[],brands:[],centers:[],enabled:true});}} style={{fontSize:'0.8rem',padding:'0.4rem 0.75rem'}}><Plus size={14}/> Nuevo Reporte</button>
        </div>
        {loading ? <LoadingState/> : reports.length===0 ? <EmptyState text="No hay reportes configurados"/> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Nombre</th><th>Frecuencia</th><th>Email</th><th>Filtros</th><th>Estado</th><th></th></tr></thead><tbody>
            {reports.map(r=>(<tr key={r.id}>
              <td><strong>{r.name}</strong><br/><span style={{fontSize:'0.75rem',color:'#888'}}>por {r.created_by_name}</span></td>
              <td>{freqLabel[r.frequency]||r.frequency}</td>
              <td className="mono" style={{fontSize:'0.78rem'}}>{r.email}</td>
              <td style={{fontSize:'0.78rem'}}>{[...(r.islands||[]),...(r.brands||[]),...(r.centers||[])].join(', ')||'Todos'}</td>
              <td><span className={"tag tag-"+(r.enabled?'admin':'viewer')}>{r.enabled?'Activo':'Pausa'}</span></td>
              <td style={{display:'flex',gap:'0.3rem'}}><button className="btn-ghost" onClick={()=>startEdit(r)} style={{padding:'0.3rem'}}><Edit3 size={14}/></button><button className="btn-ghost" onClick={()=>handleDelete(r.id)} style={{padding:'0.3rem',color:'#ef4444'}}><Trash2 size={14}/></button></td>
            </tr>))}
          </tbody></table></div>
        )}
      </div>
      {showForm && <Modal title={editing?'Editar Reporte':'Nuevo Reporte'} onClose={()=>{setShowForm(false);setEditing(null);}}>
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <div className="form-field"><label>Nombre</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="modal-input" placeholder="Ej: Reporte diario Tenerife"/></div>
          <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>
            <div className="form-field" style={{flex:1}}><label>Frecuencia</label><select value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))} className="modal-input"><option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></div>
            <div className="form-field" style={{flex:1}}><label>Tipo</label><select value={form.report_type} onChange={e=>setForm(f=>({...f,report_type:e.target.value}))} className="modal-input"><option value="daily">Resumen diario</option><option value="weekly">Resumen semanal</option><option value="ranking">Ranking</option></select></div>
          </div>
          <div className="form-field"><label>Email destino</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="modal-input" placeholder="email@empresa.com"/></div>
          <div className="form-field"><label>Islas (separar con coma, vacio = todas)</label><input value={(form.islands||[]).join(', ')} onChange={e=>setForm(f=>({...f,islands:e.target.value?e.target.value.split(',').map(s=>s.trim()):[]}))} className="modal-input" placeholder="Tenerife, Gran Canaria"/></div>
          <div className="form-field"><label>Marcas (separar con coma, vacio = todas)</label><input value={(form.brands||[]).join(', ')} onChange={e=>setForm(f=>({...f,brands:e.target.value?e.target.value.split(',').map(s=>s.trim()):[]}))} className="modal-input" placeholder="VW, Audi"/></div>
          <div className="form-field"><label>Centros (separar con coma, vacio = todos)</label><input value={(form.centers||[]).join(', ')} onChange={e=>setForm(f=>({...f,centers:e.target.value?e.target.value.split(',').map(s=>s.trim()):[]}))} className="modal-input" placeholder=""/></div>
          <label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer'}}><input type="checkbox" checked={form.enabled} onChange={e=>setForm(f=>({...f,enabled:e.target.checked}))}/>Activo</label>
          {msg && <div className="login-error"><AlertCircle size={14}/><span>{msg}</span></div>}
          <div className="modal-btns"><button className="btn-ghost" onClick={()=>{setShowForm(false);setEditing(null);}}>Cancelar</button><button className="btn-primary" onClick={handleSave}><Save size={16}/> {editing?'Actualizar':'Crear'}</button></div>
        </div>
      </Modal>}
    </div>
  );
}

'''
    marker = "/* ═══════════════ APP ═══════════════ */"
    if marker in content:
        content = content.replace(marker, components + marker)
        changes += 1
        print("  + 4 components added before APP")
    else:
        print("  [WARN] APP marker not found, appending before export")
        content = content.rstrip() + "\n" + components + "\n"
        changes += 1

print(f"  Total changes: {changes}")
with open(app_file, "w") as f:
    f.write(content)
print("  App.jsx OK")
PYEOF


# ── 7. BUILD FRONTEND ──
echo "[7/8] Compilando frontend..."
cd "$CONTEO/frontend"
if command -v yarn &>/dev/null; then yarn build 2>&1 | tail -3
elif command -v npm &>/dev/null; then npm run build 2>&1 | tail -3
fi

# ── 8. RESTART ──
echo "[8/8] Reiniciando..."
systemctl restart siempria-conteo
sleep 2
systemctl status siempria-conteo --no-pager | head -5

echo ""
echo "============================================="
echo " v11 DESPLEGADO CORRECTAMENTE"
echo "============================================="
echo ""
echo " Nuevas funcionalidades:"
echo "  1. Boton llave en header -> Cambiar contrasena"
echo "  2. Menu 'Logs de Acceso' (admin)"
echo "  3. Menu 'Config Email' (admin) -> SMTP configurable"
echo "  4. Menu 'Reportes' (todos los usuarios)"
echo "  5. Alerta email tras 3 logins fallidos"
echo ""
echo " SIGUIENTE PASO:"
echo "  -> Entrar como admin -> Config Email"
echo "  -> Configurar SMTP (Gmail: smtp.gmail.com:587)"
echo "  -> Activar envio y probar"
echo ""
echo " Backup en: $BK"
echo "============================================="
