"""Perfil del usuario: datos de Garmin + objetivos y cuestionario de salud manual."""
from __future__ import annotations

from typing import Any

from . import normalizer, storage

# Campos que el usuario puede completar en la pestaña Perfil
MANUAL_FIELDS = {
    # objetivo deportivo
    "goal": "salud",            # salud | 5k | 10k | media | maraton | trail | triatlon | ciclismo | fuerza | peso
    "race_date": None,
    "target_time": None,        # "h:mm:ss" o "mm:ss"
    "days_per_week": 4,
    "experience": "intermedio",  # principiante | intermedio | avanzado
    "injuries": "",
    # datos corporales (sobrescriben los de Garmin si se completan)
    "sex": None, "age": None, "height_cm": None, "weight_kg": None,
    # cuestionario de salud
    "smoking": None,            # nunca | ex5 | ex1 | reciente | actual
    "bp_sys": None, "bp_dia": None, "bp_meds": False,
    "non_hdl": None, "chol_meds": False,
    "glucose": None, "a1c": None, "diabetes": False,
    "diet": None,               # 0 (muy mala) a 4 (excelente)
    "alcohol_week": None,       # bebidas por semana
    "family_cvd": False, "family_diabetes": False,
    "snoring": False,
}


def load_manual() -> dict[str, Any]:
    raw, _ = storage.load_global("user_profile")
    data = dict(MANUAL_FIELDS)
    if isinstance(raw, dict):
        data.update({k: v for k, v in raw.items() if k in MANUAL_FIELDS})
    return data


def save_manual(values: dict[str, Any]) -> dict[str, Any]:
    data = load_manual()
    for k, v in values.items():
        if k in MANUAL_FIELDS:
            data[k] = None if v == "" and MANUAL_FIELDS[k] is None else v
    storage.save_global("user_profile", data)
    return data


def effective(garmin_user: dict[str, Any] | None, manual: dict[str, Any]) -> dict[str, Any]:
    """Combina perfil de Garmin con lo que el usuario ingresó (lo manual gana)."""
    out = dict(garmin_user or {})
    for k, v in manual.items():
        if v not in (None, "") or k not in out:
            out[k] = v
    h, w = out.get("height_cm"), out.get("weight_kg")
    out["bmi"] = round(w / (h / 100) ** 2, 1) if h and w else None
    return out


def load_effective() -> dict[str, Any]:
    raw, _ = storage.load_global("user_settings")
    return effective(normalizer.normalize_user(raw) if raw else {}, load_manual())


DEMO_PROFILE = {
    "sex": "M", "age": 31, "height_cm": 178, "weight_kg": 72.5, "lthr": 172,
    "goal": "media", "race_date": None, "target_time": "1:25:00", "days_per_week": 5, "experience": "intermedio",
    "injuries": "", "smoking": "nunca", "bp_sys": None, "bp_dia": None, "bp_meds": False,
    "non_hdl": None, "chol_meds": False, "glucose": None, "a1c": None, "diabetes": False,
    "diet": 3, "alcohol_week": 3, "family_cvd": False, "family_diabetes": False, "snoring": False,
}
