"""Entrenador conversacional con Claude (opcional: requiere ANTHROPIC_API_KEY en .env)."""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Iterator

log = logging.getLogger("ai_coach")

MODEL = "claude-opus-5-5"

SYSTEM = """Eres el entrenador personal y educador de salud del usuario dentro de la app «Pulso», que lee los datos de su reloj Garmin fēnix 8.

Tu trabajo:
- Evaluar sus entrenamientos con criterio de entrenador: qué buscaba la sesión, si la ejecutó bien (zonas, ritmo, Training Effect, carga), cómo encaja con su recuperación y qué debería hacer después.
- Proponer sesiones concretas con duración, zonas de FC y ritmos personales cuando los datos lo permitan.
- Explicar sueño, recuperación, VFC, carga y demás métricas en lenguaje sencillo, como a una persona sin formación técnica, con analogías cuando ayuden.
- Hablar de riesgos de salud con prudencia: son indicadores orientativos, no diagnósticos. Si hay señales de alarma (dolor en el pecho, presión en crisis, desmayos, palpitaciones con mareo, caídas de oxígeno repetidas), recomienda consultar a un médico sin alarmar innecesariamente.

Reglas:
- Responde siempre en español, cálido y directo. Ve al grano; usa listas cortas cuando haya pasos.
- Básate solo en los datos del contexto. Si falta un dato, dilo y explica cómo obtenerlo con el reloj.
- Cita los números concretos del usuario (fechas, valores) cuando evalúes algo.
- No inventes métricas que el fēnix 8 no mide (por ejemplo presión arterial o glucosa: solo existen si el usuario las registró).
"""


def enabled() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))


def _slim_day(d: dict) -> dict:
    s, w, r = d.get("sleep") or {}, d.get("whoop") or {}, d.get("readiness") or {}
    return {
        "fecha": d["date"],
        "sueño_h": round(s["total_s"] / 3600, 2) if s.get("total_s") else None,
        "puntuación_sueño": s.get("score"), "profundo_min": round((s.get("deep_s") or 0) / 60), "rem_min": round((s.get("rem_s") or 0) / 60),
        "vfc_ms": (d.get("hrv") or {}).get("last_night"), "vfc_estado": (d.get("hrv") or {}).get("status"),
        "fc_reposo": (d.get("heart") or {}).get("rhr"), "disposición": r.get("score"), "recuperación_%": w.get("recovery"),
        "esfuerzo_0_21": w.get("strain"), "carga_día": d.get("daily_load"), "estrés_medio": (d.get("stress") or {}).get("avg"),
        "body_battery_despertar": (d.get("body_battery") or {}).get("at_wake"), "pasos": (d.get("daily") or {}).get("steps"),
        "spo2_min": s.get("lowest_spo2"), "respiración": s.get("avg_resp"),
    }


def _slim_act(a: dict, date: str) -> dict:
    co = a.get("coach") or {}
    return {
        "fecha": date, "nombre": a.get("name"), "tipo": a.get("type"), "duración_min": round((a.get("duration_s") or 0) / 60),
        "distancia_km": round((a.get("distance_m") or 0) / 1000, 2), "fc_media": a.get("avg_hr"), "fc_max": a.get("max_hr"),
        "velocidad_m_s": a.get("avg_speed"), "potencia": a.get("avg_power"), "te_aeróbico": a.get("te_aerobic"),
        "te_anaeróbico": a.get("te_anaerobic"), "etiqueta_te": a.get("te_label"), "carga": a.get("load"),
        "zonas_min": [round(z / 60) for z in a["zones_s"]] if a.get("zones_s") else None,
        "desnivel_m": a.get("elevation_gain"), "nota_app": co.get("score"), "comentarios_app": co.get("good", []) + co.get("improve", []),
        "desacople_aeróbico_%": (a.get("detail") or {}).get("decoupling"),
        "diferencia_2a_mitad_%": (a.get("detail") or {}).get("split_diff"),
        "clima": (a.get("detail") or {}).get("weather"),
        "parciales": [{"km": round((l.get("dist_m") or 0) / 1000, 2), "seg": round(l["dur_s"]) if l.get("dur_s") else None, "fc": l.get("hr"), "tipo": l.get("intensity")}
                      for l in ((a.get("detail") or {}).get("laps") or [])[:25]],
        "series_fuerza": (a.get("detail") or {}).get("sets"),
    }


def build_context(dash: dict) -> str:
    days = dash["days"]
    last = days[-1]
    health = dash.get("health") or {}
    ctx = {
        "hoy": last["date"],
        "estado_de_los_datos": dash.get("data_status"),
        "perfil_y_objetivo": {k: v for k, v in (dash.get("profile") or {}).items() if v not in (None, "", False)},
        "rendimiento": dash.get("performance"),
        "estado_entrenamiento_hoy": last.get("training"),
        "últimos_21_días": [_slim_day(d) for d in days[-21:]],
        "actividades_últimos_28_días": [_slim_act(a, d["date"]) for d in days[-28:] for a in d["activities"]],
        "revisión_semanal_app": (dash.get("coach") or {}).get("week"),
        "recomendación_hoy_app": (dash.get("coach") or {}).get("today"),
        "zonas_personales": ((dash.get("coach") or {}).get("plan") or {}).get("zones"),
        "salud": {
            "life_essential_8": health.get("le8"),
            "riesgos": [{"riesgo": r["name"], "nivel": r["label"], "factores": [(f["name"], f["value"], f["status"]) for f in r["factors"]]} for r in health.get("risks", [])],
            "alertas": health.get("alerts"),
            "vitales_30d": health.get("vitals"),
        },
    }
    return json.dumps(ctx, ensure_ascii=False, default=str)


def stream_reply(dash: dict, messages: list[dict[str, str]]) -> Iterator[str]:
    import anthropic  # import perezoso: la app funciona sin el SDK configurado

    client = anthropic.Anthropic()
    system = [
        {"type": "text", "text": SYSTEM},
        {"type": "text", "text": "Datos actuales del usuario (JSON):\n" + build_context(dash), "cache_control": {"type": "ephemeral"}},
    ]
    msgs = [{"role": m["role"], "content": m["content"]} for m in messages if m.get("role") in ("user", "assistant") and m.get("content")]
    try:
        with client.beta.messages.stream(
            model=MODEL,
            max_tokens=16000,
            system=system,
            messages=msgs,
            output_config={"effort": "medium"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            for text in stream.text_stream:
                yield text
            final = stream.get_final_message()
            if final.stop_reason == "refusal":
                yield "\n\n_(No pude responder a esto. Prueba a reformular la pregunta.)_"
            elif final.stop_reason == "max_tokens":
                yield "\n\n_(Respuesta cortada por longitud.)_"
    except anthropic.AuthenticationError:
        yield "La clave ANTHROPIC_API_KEY no es válida. Revisa el archivo .env."
    except anthropic.RateLimitError:
        yield "Se alcanzó el límite de uso de la API. Inténtalo de nuevo en un minuto."
    except anthropic.APIStatusError as e:
        log.warning("Error de la API de Claude: %s", e)
        yield f"Error del servicio de IA ({e.status_code}). Inténtalo más tarde."
    except anthropic.APIConnectionError:
        yield "No hay conexión con el servicio de IA. Revisa tu internet."
