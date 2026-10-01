"""Servidor local: API + interfaz web.

Ejecutar:  python -m uvicorn backend.app:app --port 8765
"""
from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import ai_coach, analytics, coach, demo_data, device_tips, explain, health, normalizer, storage
from . import profile as user_profile
from .garmin_client import GarminService, env_credentials

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Garmin Salud")
garmin = GarminService()


login_state: dict[str, Any] = {"status": "idle", "error": None}


def _auto_login() -> None:
    """Se ejecuta en segundo plano para que la web abra al instante."""
    login_state.update(status="logging_in", error=None)
    if garmin.try_resume():
        login_state["status"] = "ok"
        return
    email, password = env_credentials()
    if not (email and password):
        login_state["status"] = "idle"
        return
    try:
        result = garmin.login(email, password)
        login_state["status"] = "mfa" if result == "mfa" else "ok"
    except Exception as e:  # el usuario puede reintentar desde la interfaz
        logging.warning("Login automático con .env falló: %s", e)
        msg = str(e)
        if "429" in msg or "rate" in msg.lower():
            msg = "Garmin bloqueó temporalmente los inicios de sesión desde tu conexión por demasiados intentos. Espera 30–60 minutos y vuelve a intentarlo."
        login_state.update(status="error", error=msg)


@app.on_event("startup")
def _startup() -> None:
    threading.Thread(target=_auto_login, daemon=True).start()


class LoginBody(BaseModel):
    email: str
    password: str


class MfaBody(BaseModel):
    code: str


class SyncBody(BaseModel):
    days: int = 30
    force: bool = False


@app.get("/api/status")
def status() -> dict[str, Any]:
    return {
        "connected": garmin.connected,
        "profile": garmin.profile(),
        "has_data": storage.last_sync() is not None,
        "last_sync": storage.last_sync(),
        "sync": garmin.sync_state,
        "ai_enabled": ai_coach.enabled(),
        "login": login_state,
    }


@app.post("/api/login")
def login(body: LoginBody) -> dict[str, str]:
    try:
        return {"result": garmin.login(body.email, body.password)}
    except Exception as e:
        msg = str(e)
        if "429" in msg or "rate" in msg.lower():
            msg = "Garmin bloqueó temporalmente los inicios de sesión desde tu conexión por demasiados intentos. Espera 30–60 minutos y vuelve a intentarlo."
        raise HTTPException(401, f"No se pudo iniciar sesión: {msg}") from e


@app.post("/api/mfa")
def mfa(body: MfaBody) -> dict[str, str]:
    try:
        garmin.submit_mfa(body.code)
        return {"result": "ok"}
    except Exception as e:
        raise HTTPException(401, f"Código incorrecto: {e}") from e


@app.post("/api/logout")
def logout() -> dict[str, str]:
    garmin.logout()
    return {"result": "ok"}


@app.post("/api/sync")
def sync(body: SyncBody) -> dict[str, str]:
    if not garmin.connected:
        raise HTTPException(401, "Conecta tu cuenta de Garmin primero")
    if garmin.sync_state.get("running"):
        return {"result": "running"}
    days = max(1, min(body.days, 365))
    threading.Thread(target=garmin.sync, args=(days, body.force), daemon=True).start()
    return {"result": "started"}


def build_dashboard(demo: bool) -> dict[str, Any]:
    if demo:
        days, perf = demo_data.generate()
        prof = user_profile.effective(None, user_profile.DEMO_PROFILE)
        bp, weights = demo_data.demo_bp(), demo_data.demo_weights()
        source = "demo"
    else:
        raw_days = storage.load_days()
        if not raw_days:
            raise HTTPException(404, "Sin datos. Sincroniza con Garmin o usa el modo demo.")
        days = [normalizer.normalize_day(d, r) for d, r in raw_days.items()]
        perf = normalizer.normalize_performance(storage.load_global("performance")[0])
        prof = user_profile.load_effective()
        bp = normalizer.normalize_bp(storage.load_global("blood_pressure")[0])
        weights = normalizer.normalize_weights(storage.load_global("body_composition")[0])
        source = "garmin"
        # descarta los días previos al primero con datos del reloj
        first = next((i for i, d in enumerate(days) if d["daily"].get("steps") or d["sleep"] or d["activities"]), len(days) - 1)
        days = days[first:]
        details = storage.load_activity_details()
        for d in days:
            for a in d["activities"]:
                a["detail"] = normalizer.activity_extra(details.get(str(a.get("id"))), a.get("type") or "")
    if demo:
        for d in days:
            for a in d["activities"]:
                a["detail"] = demo_data.demo_detail(a)
    days = analytics.enrich(days)
    coach.evaluate_all(days, prof, perf)
    explain.enrich(days)
    hl = health.assess(days, prof, bp, weights)
    dash = {
        "source": source, "days": days, "performance": perf, "profile": prof, "health": hl,
        "coach": coach.build(days, prof, perf, hl), "device": device_tips.build(days, perf, prof, hl),
        "last_sync": storage.last_sync(), "ai_enabled": ai_coach.enabled(),
        "data_status": data_status(days, perf),
    }
    _cache[source] = dash
    return dash


_cache: dict[str, dict[str, Any]] = {}


def data_status(days: list[dict[str, Any]], perf: dict[str, Any]) -> dict[str, Any]:
    """Qué tan completa está la información, para guiar los primeros días de uso."""
    last = days[-1] if days else {}
    return {
        "first_day": days[0]["date"] if days else None,
        "days": len(days),
        "wellness_days": sum(1 for d in days if d["daily"].get("steps")),
        "sleep_nights": sum(1 for d in days if (d.get("sleep") or {}).get("total_s")),
        "hrv_nights": sum(1 for d in days if (d.get("hrv") or {}).get("last_night")),
        "activities": sum(len(d["activities"]) for d in days),
        "has_vo2": any((d.get("training") or {}).get("vo2max") for d in days),
        "has_readiness": (last.get("readiness") or {}).get("score") is not None,
        "has_recovery": (last.get("whoop") or {}).get("recovery") is not None,
    }


@app.get("/api/dashboard")
def dashboard(demo: bool = False) -> dict[str, Any]:
    return build_dashboard(demo)


class ProfileBody(BaseModel):
    values: dict[str, Any]


@app.get("/api/profile")
def get_profile() -> dict[str, Any]:
    raw, _ = storage.load_global("user_settings")
    return {"manual": user_profile.load_manual(), "garmin": normalizer.normalize_user(raw) if raw else {}}


@app.post("/api/profile")
def post_profile(body: ProfileBody) -> dict[str, Any]:
    return {"manual": user_profile.save_manual(body.values)}


class ChatBody(BaseModel):
    messages: list[dict[str, str]]
    demo: bool = False


@app.post("/api/coach/chat")
def coach_chat(body: ChatBody) -> StreamingResponse:
    if not ai_coach.enabled():
        raise HTTPException(400, "Añade ANTHROPIC_API_KEY al archivo .env y reinicia la app para activar el entrenador con IA.")
    source = "demo" if body.demo else "garmin"
    dash = _cache.get(source) or build_dashboard(body.demo)
    return StreamingResponse(ai_coach.stream_reply(dash, body.messages[-20:]), media_type="text/plain; charset=utf-8")


@app.get("/api/raw/{date}")
def raw_day(date: str) -> dict[str, Any]:
    """Respuesta cruda de Garmin para un día (útil para depurar)."""
    data = storage.load_days().get(date)
    if not data:
        raise HTTPException(404, "Día no sincronizado")
    return data


FRONTEND = ROOT / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND / "index.html")
