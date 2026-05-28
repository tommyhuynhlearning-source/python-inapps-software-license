import hmac
import hashlib
import json
import os
import secrets
import time
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])

_SCOPES = " ".join([
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/firebase",
    "openid",
    "email",
])


def _s():
    from core.config import settings
    return settings


def _require(val: str, name: str) -> str:
    if not val:
        raise HTTPException(status_code=500, detail=f"Missing env var: {name}")
    return val


def _admin_secret() -> str:
    return _require(os.environ.get("ADMIN_REAUTH_SECRET") or _s().admin_reauth_secret, "ADMIN_REAUTH_SECRET")


def _oauth_client_id() -> str:
    return _require(os.environ.get("OAUTH_CLIENT_ID") or _s().oauth_client_id, "OAUTH_CLIENT_ID")


def _oauth_client_secret() -> str:
    return _require(os.environ.get("OAUTH_CLIENT_SECRET") or _s().oauth_client_secret, "OAUTH_CLIENT_SECRET")


def _vercel_token() -> str:
    return _require(os.environ.get("VERCEL_TOKEN") or _s().vercel_token, "VERCEL_TOKEN")


def _vercel_project_id() -> str:
    return os.environ.get("VERCEL_PROJECT_ID") or _s().vercel_project_id or "prj_b2fHPSSpBsEAu411iizy7YQARrJs"


def _callback_uri(request: Request) -> str:
    # Use production URL in production, current host in dev
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/admin/reauth/callback"


def _make_state() -> str:
    secret = _admin_secret()
    ts = str(int(time.time()))
    nonce = secrets.token_hex(8)
    payload = f"{ts}:{nonce}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def _verify_state(state: str, max_age: int = 600) -> bool:
    try:
        decoded = urllib.parse.unquote(state)
        parts = decoded.rsplit(":", 1)
        if len(parts) != 2:
            return False
        payload, sig = parts
        secret = _admin_secret()
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        ts = int(payload.split(":")[0])
        return time.time() - ts <= max_age
    except Exception:
        return False


def _update_vercel_env(key: str, value: str):
    token = _vercel_token()
    project_id = _vercel_project_id()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    req = urllib.request.Request(
        f"https://api.vercel.com/v9/projects/{project_id}/env?limit=100",
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        envs = json.loads(resp.read())

    env_id = next(
        (e["id"] for e in envs.get("envs", [])
         if e["key"] == key and "production" in e.get("target", [])),
        None,
    )

    if env_id:
        data = json.dumps({"value": value}).encode()
        req = urllib.request.Request(
            f"https://api.vercel.com/v9/projects/{project_id}/env/{env_id}",
            data=data, headers=headers, method="PATCH",
        )
    else:
        data = json.dumps({"key": key, "value": value, "target": ["production"], "type": "encrypted"}).encode()
        req = urllib.request.Request(
            f"https://api.vercel.com/v9/projects/{project_id}/env",
            data=data, headers=headers, method="POST",
        )
    with urllib.request.urlopen(req, timeout=15) as resp:
        resp.read()


def _trigger_redeploy() -> bool:
    token = _vercel_token()
    project_id = _vercel_project_id()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    req = urllib.request.Request(
        f"https://api.vercel.com/v6/deployments?projectId={project_id}&target=production&limit=1",
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())

    deployments = result.get("deployments", [])
    if not deployments:
        return False

    d = deployments[0]
    latest_id = d.get("uid") or d.get("id")
    if not latest_id:
        return False

    # POST /v13/deployments with deploymentId clones & redeploys an existing deployment
    data = json.dumps({"deploymentId": latest_id, "target": "production"}).encode()
    req = urllib.request.Request(
        "https://api.vercel.com/v13/deployments",
        data=data, headers=headers, method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        resp.read()
    return True


@router.get("/reauth")
def start_reauth(secret: str, request: Request):
    if secret != _admin_secret():
        raise HTTPException(status_code=403, detail="Forbidden")
    state = _make_state()
    params = urllib.parse.urlencode({
        "client_id": _oauth_client_id(),
        "redirect_uri": _callback_uri(request),
        "response_type": "code",
        "scope": _SCOPES,
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/reauth/callback")
def reauth_callback(request: Request, code: str = None, state: str = None, error: str = None):
    if error:
        return HTMLResponse(_page("❌ Lỗi", f"<p>Google từ chối: <code>{error}</code></p>"), status_code=400)

    if not state or not _verify_state(state):
        return HTMLResponse(_page("❌ Lỗi", "<p>State không hợp lệ hoặc đã hết hạn (10 phút). Thử lại.</p>"), status_code=400)

    if not code:
        return HTMLResponse(_page("❌ Lỗi", "<p>Không có authorization code.</p>"), status_code=400)

    # Exchange code for tokens
    try:
        data = urllib.parse.urlencode({
            "client_id": _oauth_client_id(),
            "client_secret": _oauth_client_secret(),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _callback_uri(request),
        }).encode()
        req = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            tokens = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return HTMLResponse(_page("❌ Lỗi", f"<p>Không lấy được token: <code>{body}</code></p>"), status_code=500)

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        return HTMLResponse(_page("❌ Lỗi", "<p>Không có refresh_token trong response. Thử lại từ đầu.</p>"), status_code=400)

    # Update Vercel + redeploy
    try:
        _update_vercel_env("GOOGLE_REFRESH_TOKEN", refresh_token)
    except Exception as e:
        return HTMLResponse(_page("❌ Lỗi", f"<p>Cập nhật Vercel thất bại: <code>{e}</code></p>"), status_code=500)

    try:
        redeployed = _trigger_redeploy()
    except Exception:
        redeployed = False

    body = "<p>✅ <strong>GOOGLE_REFRESH_TOKEN</strong> đã được cập nhật trên Vercel.</p>"
    if redeployed:
        body += "<p>🚀 Đang redeploy tự động... (~1 phút)</p>"
    else:
        body += "<p>⚠️ Token đã được cập nhật. Chạy <code>npx vercel deploy --prod</code> để áp dụng.</p>"
    body += '<p><a href="/">← Về trang chủ</a></p>'

    return HTMLResponse(_page("✅ Token đã được refresh!", body))


def _page(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>body{{font-family:sans-serif;padding:40px;max-width:600px;margin:auto;line-height:1.6}}
code{{background:#f4f4f4;padding:2px 6px;border-radius:4px}}</style>
</head><body><h2>{title}</h2>{body}</body></html>"""
