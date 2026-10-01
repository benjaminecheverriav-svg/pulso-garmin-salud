"""Explicaciones en lenguaje cotidiano de lo que dicen tus métricas cada día."""
from __future__ import annotations

from statistics import mean
from typing import Any

FACTOR_NAMES = {
    "sleep": "el sueño de anoche", "recovery_time": "el tiempo de recuperación pendiente", "acwr": "la carga reciente",
    "hrv": "tu VFC", "stress_history": "el estrés acumulado", "sleep_history": "el sueño de los últimos días",
}


def _hm(minutes: float) -> str:
    return f"{int(minutes // 60)} h {int(minutes % 60):02d} min"


REASONS = {"¿Dormiste lo suficiente?": "dormiste menos de lo que necesitabas", "Calidad del sueño": "la calidad del sueño",
           "Tu sistema nervioso": "tu VFC está por debajo de lo normal", "Pulso en reposo": "el pulso en reposo alto",
           "Disposición para entrenar": "la disposición para entrenar", "Tu energía (Body Battery)": "poca energía al despertar",
           "Regularidad": "horarios de sueño irregulares", "Oxígeno nocturno": "el oxígeno nocturno"}


def item(tone: str, title: str, text: str) -> dict[str, str]:
    return {"tone": tone, "title": title, "text": text}


def sleep_story(d: dict, prev: list[dict]) -> list[dict]:
    s, w = d.get("sleep") or {}, d["whoop"]
    if not s.get("total_s"):
        return [item("", "Sin datos de sueño", "El reloj no registró sueño esta noche. Para medir recuperación y VFC necesitas dormir con él puesto.")]
    out = []
    mins = s["total_s"] / 60
    need = w.get("sleep_need_min") or 480
    diff = mins - need
    tone = "good" if diff >= -20 else "warning" if diff >= -75 else "serious"
    txt = f"Dormiste {_hm(mins)} y tu cuerpo necesitaba unas {_hm(need)}. "
    txt += ("Cubriste lo que necesitabas." if diff >= -20 else
            f"Te faltaron {_hm(-diff)}: esa deuda se nota en la concentración, el apetito y el rendimiento." if diff < -60 else
            f"Te faltaron {int(-diff)} min, nada grave si no se repite.")
    out.append(item(tone, "¿Dormiste lo suficiente?", txt))
    deep, rem = (s.get("deep_s") or 0) / s["total_s"], (s.get("rem_s") or 0) / s["total_s"]
    parts = []
    parts.append(f"sueño profundo {deep:.0%} ({'bien' if deep >= 0.15 else 'bajo'}; repara músculos y sistema inmune)")
    parts.append(f"REM {rem:.0%} ({'bien' if rem >= 0.18 else 'bajo'}; consolida memoria y aprendizaje)")
    tone = "good" if deep >= 0.15 and rem >= 0.18 else "warning"
    extra = ""
    if deep < 0.13:
        extra = " El profundo baja con alcohol, cenas copiosas, calor en la habitación o entrenos intensos muy tarde."
    elif rem < 0.16:
        extra = " El REM se concentra al final de la noche: si recortas horas al despertar, es lo primero que pierdes."
    out.append(item(tone, "Calidad del sueño", f"Tuviste {parts[0]} y {parts[1]}.{extra}"))
    cons = w.get("sleep_consistency")
    if cons is not None:
        out.append(item("good" if cons >= 75 else "warning", "Regularidad",
                        f"Consistencia de horarios: {cons}%. " + ("Acostarte y levantarte a la misma hora ayuda a dormirte antes y a despertar descansado."
                                                                    if cons < 75 else "Tus horarios son regulares: tu reloj biológico te lo agradece.")))
    if (s.get("lowest_spo2") or 100) < 88:
        out.append(item("warning", "Oxígeno nocturno", f"El oxígeno llegó a {s['lowest_spo2']}% en algún momento. Una noche aislada puede ser un error de lectura; si se repite, revisa la sección Salud."))
    return out


def recovery_story(d: dict) -> list[dict]:
    out = []
    w, r, h = d["whoop"], d.get("readiness") or {}, d.get("hrv") or {}
    c = w.get("contributors") or {}
    if c.get("hrv"):
        v, b = c["hrv"]["value"], c["hrv"]["baseline"]
        pct = (v / b - 1) * 100
        tone = "good" if pct >= -5 else "warning" if pct >= -15 else "serious"
        txt = (f"Tu VFC anoche fue {v} ms frente a tus {b} ms habituales ({pct:+.0f}%). La VFC mide cuánto varía el tiempo entre latidos: "
               "cuanto más alta respecto a tu normal, más relajado y recuperado está tu sistema nervioso. ")
        txt += ("Estás en buena forma para exigirte." if pct >= -5 else "Hay algo de fatiga o estrés." if pct >= -15 else
                "Tu cuerpo está bajo estrés (entreno, mal sueño, alcohol, enfermedad o preocupaciones).")
        out.append(item(tone, "Tu sistema nervioso", txt))
    if c.get("rhr") and c["rhr"].get("baseline"):
        v, b = c["rhr"]["value"], c["rhr"]["baseline"]
        dlt = v - b
        tone = "good" if dlt <= 1 else "warning" if dlt <= 4 else "serious"
        out.append(item(tone, "Pulso en reposo",
                        f"{v} ppm frente a {b:.0f} habituales. " + ("Normal." if dlt <= 1 else
                                                                     "Un pulso en reposo más alto de lo normal indica que el cuerpo aún trabaja para recuperarse.")))
    if r.get("score") is not None:
        f = {k: v for k, v in (r.get("factors") or {}).items() if v is not None}
        low = min(f, key=f.get) if f else None
        txt = f"Garmin te da {r['score']}/100 de disposición para entrenar."
        if low and f[low] < 60:
            txt += f" Lo que más te limita hoy es {FACTOR_NAMES.get(low, low)} ({f[low]}%)."
        if r.get("recovery_time_h"):
            txt += f" Te quedan unas {r['recovery_time_h']:.0f} h para estar totalmente recuperado del último esfuerzo."
        out.append(item("good" if r["score"] >= 70 else "warning" if r["score"] >= 40 else "serious", "Disposición para entrenar", txt))
    bb = d.get("body_battery") or {}
    if bb.get("at_wake") is not None:
        out.append(item("good" if bb["at_wake"] >= 70 else "warning" if bb["at_wake"] >= 45 else "serious", "Tu energía (Body Battery)",
                        f"Te despertaste con {bb['at_wake']} de 100. Es como la batería del móvil: el sueño y el descanso la cargan; "
                        "el ejercicio, el estrés y las comidas pesadas la gastan. " +
                        ("Buena carga para el día." if bb["at_wake"] >= 70 else "Carga a medias: dosifica el día." if bb["at_wake"] >= 45 else "Batería baja: prioriza descansar.")))
    return out


def effort_story(d: dict) -> list[dict]:
    out = []
    w, t = d["whoop"], d.get("training") or {}
    st = w.get("strain")
    if st is not None:
        lo, hi = w["strain_target"]
        where = "por debajo de" if st < lo else "por encima de" if st > hi else "dentro de"
        out.append(item("good" if where == "dentro de" else "warning", "Esfuerzo de hoy",
                        f"Tu esfuerzo fue {st:.1f} de 21, {where} lo que tu recuperación permitía ({lo}–{hi}). "
                        "La escala no es lineal: pasar de 10 a 14 exige mucho más que de 4 a 8."))
    a, c = t.get("acute") or t.get("acute_est"), t.get("chronic") or t.get("chronic_est")
    if a and c:
        ratio = a / c
        txt = (f"Tu carga de los últimos 7 días ({a:.0f}) frente a tu carga habitual de 4 semanas ({c:.0f}) da un ratio de {ratio:.2f}. ")
        txt += ("Estás subiendo demasiado rápido: aquí es donde aparecen las lesiones." if ratio > 1.5 else
                "Estás apretando: aguanta así una semana como máximo." if ratio > 1.3 else
                "Estás entrenando menos de lo que tu cuerpo está acostumbrado." if ratio < 0.8 else
                "Estás en la zona ideal para mejorar sin lesionarte.")
        out.append(item("serious" if ratio > 1.5 else "warning" if ratio > 1.3 or ratio < 0.8 else "good", "Carga de entrenamiento", txt))
    for a in d.get("activities") or []:
        co = a.get("coach")
        if co:
            out.append(item("good" if co["score"] >= 7 else "warning" if co["score"] >= 5 else "serious",
                            f"{a.get('name') or 'Actividad'} · nota {co['score']}/10",
                            (co["purpose"] + " " if co["purpose"] else "") + " ".join((co["good"] + co["improve"])[:2])))
    return out


def day_summary(d: dict, sleep: list, rec: list) -> list[dict]:
    w = d["whoop"]
    rv = w.get("recovery")
    if rv is None:
        return [item("", "Resumen", "Faltan noches con datos de VFC para darte un resumen completo.")]
    if rv >= 67:
        head = "Hoy tu cuerpo está listo para exigirse."
        tone = "good"
    elif rv >= 34:
        head = "Hoy estás a medio gas: entrena, pero sin ir al máximo."
        tone = "warning"
    else:
        head = "Hoy tu cuerpo pide descanso."
        tone = "serious"
    reasons = [REASONS.get(x["title"], x["title"].lower()) for x in (sleep[:1] + rec) if x["tone"] in ("warning", "serious")][:2]
    txt = head + (f" Lo que más influye: {' y '.join(reasons)}." if reasons else " Todos los indicadores acompañan.")
    return [item(tone, "Resumen del día", txt)]


def enrich(days: list[dict]) -> None:
    for i, d in enumerate(days):
        sl = sleep_story(d, days[max(0, i - 7):i])
        rc = recovery_story(d)
        d["story"] = {"sueno": sl, "recuperacion": rc, "esfuerzo": effort_story(d), "hoy": day_summary(d, sl, rc)}
