"""Conexión con Garmin Connect y descarga de datos crudos.

Usa la librería no oficial `garminconnect`. Las credenciales nunca se guardan:
solo se guardan los tokens de sesión en data/garmin_tokens para no tener que
volver a iniciar sesión (duran ~1 año).
"""
from __future__ import annotations

import logging
import os
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Callable

from garminconnect import Garmin

from . import storage

log = logging.getLogger("garmin")

ROOT = Path(__file__).resolve().parent.parent
TOKEN_DIR = ROOT / "data" / "garmin_tokens"

# Pausa entre llamadas para no saturar la API de Garmin
REQUEST_PAUSE_S = 0.35


class GarminService:
    def __init__(self) -> None:
        self.api: Garmin | None = None
        self._mfa_api: Garmin | None = None
        self.sync_state: dict[str, Any] = {"running": False, "progress": 0, "total": 0, "message": ""}

    # ------------------------------------------------------------------ auth
    @property
    def connected(self) -> bool:
        return self.api is not None

    def try_resume(self) -> bool:
        """Intenta reutilizar tokens guardados."""
        if not TOKEN_DIR.exists() or not any(TOKEN_DIR.iterdir()):
            return False
        try:
            api = Garmin()
            api.login(str(TOKEN_DIR))
            self.api = api
            log.info("Sesión Garmin restaurada desde tokens")
            return True
        except Exception as e:  # tokens caducados o corruptos
            log.warning("No se pudo restaurar la sesión: %s", e)
            return False

    def login(self, email: str, password: str) -> str:
        """Devuelve 'ok' o 'mfa' (si Garmin pide código de verificación)."""
        api = Garmin(email, password, return_on_mfa=True)
        status, _ = api.login()
        if status == "needs_mfa":
            self._mfa_api = api
            return "mfa"
        self._finish_login(api)
        return "ok"

    def submit_mfa(self, code: str) -> None:
        if not self._mfa_api:
            raise RuntimeError("No hay un inicio de sesión pendiente de MFA")
        self._mfa_api.resume_login(None, code.strip())
        self._finish_login(self._mfa_api)
        self._mfa_api = None

    def _finish_login(self, api: Garmin) -> None:
        TOKEN_DIR.mkdir(parents=True, exist_ok=True)
        api.client.dump(str(TOKEN_DIR))
        # Re-login desde tokens para cargar perfil y ajustes completos
        fresh = Garmin()
        fresh.login(str(TOKEN_DIR))
        self.api = fresh

    def logout(self) -> None:
        self.api = None
        if TOKEN_DIR.exists():
            for f in TOKEN_DIR.iterdir():
                f.unlink()

    def profile(self) -> dict[str, Any]:
        if not self.api:
            return {}
        return {"name": self.api.full_name or self.api.display_name, "display_name": self.api.display_name}

    # ------------------------------------------------------------------ sync
    def _call(self, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        try:
            result = fn(*args, **kwargs)
        except Exception as e:
            log.info("%s%s falló: %s", fn.__name__, args, e)
            result = None
        time.sleep(REQUEST_PAUSE_S)
        return result

    def sync(self, days: int = 30, force: bool = False) -> None:
        """Descarga los últimos `days` días. Los días ya descargados (salvo hoy y
        ayer, que aún pueden cambiar) se saltan a menos que force=True."""
        if not self.api:
            raise RuntimeError("No conectado a Garmin")
        api = self.api
        today = date.today()
        dates = [today - timedelta(days=i) for i in range(days)]
        st = self.sync_state
        st.update(running=True, progress=0, total=len(dates) + 1, message="Iniciando…", error=None)
        try:
            recent = {today, today - timedelta(days=1)}
            for i, d in enumerate(sorted(dates)):
                ds = d.isoformat()
                st.update(progress=i, message=f"Descargando {ds}")
                if not force and d not in recent and storage.has_day(ds):
                    continue
                raw = {
                    "sleep": self._call(api.get_sleep_data, ds),
                    "hrv": self._call(api.get_hrv_data, ds),
                    "readiness": self._call(api.get_training_readiness, ds),
                    "summary": self._call(api.get_user_summary, ds),
                    "training_status": self._call(api.get_training_status, ds),
                    "respiration": self._call(api.get_respiration_data, ds),
                    "body_battery": self._call(api.get_body_battery, ds, ds),
                    "activities": self._call(api.get_activities_by_date, ds, ds),
                }
                storage.save_day(ds, raw)

            self._sync_activity_details(dates)

            st.update(progress=len(dates), message="Métricas de rendimiento")
            start = (today - timedelta(days=max(days, 90))).isoformat()
            perf = {
                "race_predictions": self._call(api.get_race_predictions),
                "endurance_score": self._call(api.get_endurance_score, today.isoformat()),
                "endurance_history": self._call(api.get_endurance_score, start, today.isoformat()),
                "hill_score": self._call(api.get_hill_score, today.isoformat()),
                "fitness_age": self._call(api.get_fitnessage_data, today.isoformat()),
                "max_metrics": self._call(api.get_max_metrics, today.isoformat()),
                "lactate_threshold": self._call(api.get_lactate_threshold),
                "devices": self._call(api.get_devices),
                "personal_records": self._call(api.get_personal_record),
            }
            storage.save_global("performance", perf)

            st.update(message="Perfil, presión arterial y peso")
            storage.save_global("user_settings", self._call(api.get_user_profile))
            storage.save_global("blood_pressure", self._call(api.get_blood_pressure, start, today.isoformat()))
            storage.save_global("body_composition", self._call(api.get_body_composition, start, today.isoformat()))
            devices = perf.get("devices") or []
            dev_id = next((d.get("deviceId") for d in devices if isinstance(d, dict) and d.get("deviceId")), None)
            if dev_id:
                storage.save_global("device_settings", self._call(api.get_device_settings, str(dev_id)))
            st.update(progress=st["total"], message="Sincronización completa")
        except Exception as e:
            log.exception("Error de sincronización")
            st.update(message=f"Error: {e}", error=str(e))
        finally:
            st["running"] = False


    def _sync_activity_details(self, dates: list[date], limit: int = 40) -> None:
        """Parciales, series de pulso/ritmo, clima y series de fuerza de cada actividad."""
        api = self.api
        cutoff = min(dates).isoformat()
        pending = []
        for ds, raw in storage.load_days().items():
            if ds < cutoff:
                continue
            for a in raw.get("activities") or []:
                aid = a.get("activityId")
                if aid and not storage.has_activity_detail(aid):
                    pending.append(a)
        pending = sorted(pending, key=lambda a: a.get("startTimeLocal") or "", reverse=True)[:limit]
        for i, a in enumerate(pending):
            aid = a["activityId"]
            self.sync_state["message"] = f"Detalle de actividades ({i + 1}/{len(pending)})"
            typ = ((a.get("activityType") or {}).get("typeKey") or "")
            detail = {
                "splits": self._call(api.get_activity_splits, aid),
                "details": self._call(api.get_activity_details, aid, 400, 1),
            }
            if a.get("distance") and "indoor" not in typ and "treadmill" not in typ and "virtual" not in typ:
                detail["weather"] = self._call(api.get_activity_weather, aid)
            if "strength" in typ:
                detail["sets"] = self._call(api.get_activity_exercise_sets, aid)
            storage.save_activity_detail(aid, detail)


def env_credentials() -> tuple[str | None, str | None]:
    return os.getenv("GARMIN_EMAIL"), os.getenv("GARMIN_PASSWORD")
