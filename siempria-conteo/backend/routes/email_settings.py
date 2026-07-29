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
