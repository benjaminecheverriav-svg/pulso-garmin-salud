"""Entrenador personal basado en reglas: evalúa sesiones, revisa la semana y
propone qué hacer hoy y los próximos 7 días."""
from __future__ import annotations

from datetime import date, timedelta
from statistics import mean, median, pstdev
from typing import Any

HARD_LABELS = {"THRESHOLD", "LACTATE_THRESHOLD", "VO2MAX", "ANAEROBIC_CAPACITY", "SPRINT", "TEMPO"}
EASY_LABELS = {"RECOVERY", "BASE"}
PURPOSE = {
    "RECOVERY": "Recuperación activa: mueve la sangre sin generar fatiga.",
    "BASE": "Base aeróbica: construye resistencia, capilares y eficiencia para quemar grasa.",
    "TEMPO": "Tempo: mejora la capacidad de sostener ritmos exigentes durante mucho tiempo.",
    "THRESHOLD": "Umbral: sube el ritmo que puedes mantener ~1 hora sin «ahogarte».",
    "LACTATE_THRESHOLD": "Umbral: sube el ritmo que puedes mantener ~1 hora sin «ahogarte».",
    "VO2MAX": "VO2 máx.: amplía tu techo aeróbico (el tamaño de tu motor).",
    "ANAEROBIC_CAPACITY": "Capacidad anaeróbica: tolerancia a esfuerzos muy intensos de 30 s a 2 min.",
    "SPRINT": "Sprint: potencia y velocidad máxima.",
}


def act_group(t: str | None) -> str:
    t = t or ""
    if "running" in t:
        return "running"
    if "cycling" in t or "biking" in t or "ride" in t:
        return "cycling"
    if "swim" in t:
        return "swimming"
    if "strength" in t or t in ("hiit", "cardio"):
        return "strength"
    if t in ("walking", "hiking"):
        return "walking"
    return "other"


def zone_share(a: dict, zones: tuple[int, ...]) -> float | None:
    z = a.get("zones_s")
    if not z or not sum(z):
        return None
    return sum(z[i] for i in zones) / sum(z)


def is_hard(a: dict) -> bool:
    """Sesión intensa de resistencia (la fuerza se trata aparte)."""
    if act_group(a.get("type")) == "strength":
        return False
    hi = zone_share(a, (3, 4)) or 0
    return (a.get("te_label") in HARD_LABELS or (a.get("te_aerobic") or 0) >= 4.0
            or (a.get("te_anaerobic") or 0) >= 2.5 or hi > 0.25)


def session_kind(a: dict, typical_dur: float | None) -> str:
    if act_group(a.get("type")) == "strength":
        return "fuerza"
    if is_hard(a):
        return "intensa"
    dur = a.get("duration_s") or 0
    if typical_dur and dur >= max(1.4 * typical_dur, 75 * 60):
        return "larga"
    return "suave"


def pace_str(ms: float | None) -> str:
    if not ms:
        return "—"
    s = 1000 / ms
    return f"{int(s // 60)}:{int(round(s % 60)):02d}/km"


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


# ============================================================ zonas personales
def personal_zones(prof: dict, perf: dict) -> dict[str, Any]:
    lthr = (perf.get("lactate") or {}).get("hr") or prof.get("lthr")
    lt_speed = (perf.get("lactate") or {}).get("speed_ms")
    race = perf.get("race") or {}
    if not lt_speed and race.get("10k") and race.get("half"):
        lt_speed = ((10000 / race["10k"]) + (21097.5 / race["half"])) / 2
    out: dict[str, Any] = {"lthr": lthr, "lt_speed": lt_speed}
    if lthr:
        out["hr"] = {  # zonas de Friel basadas en FC umbral
            "z1": [None, round(lthr * 0.84)], "z2": [round(lthr * 0.85), round(lthr * 0.89)],
            "z3": [round(lthr * 0.90), round(lthr * 0.94)], "z4": [round(lthr * 0.95), round(lthr * 0.99)],
            "z5": [round(lthr * 1.0), None],
        }
    if lt_speed:
        spk = 1000 / lt_speed  # s/km
        f = lambda s: f"{int(s // 60)}:{int(round(s % 60)):02d}"
        out["pace"] = {
            "suave": f"{f(spk + 75)}–{f(spk + 105)}/km", "aerobico": f"{f(spk + 50)}–{f(spk + 75)}/km",
            "tempo": f"{f(spk + 10)}–{f(spk + 20)}/km", "umbral": f"{f(spk - 3)}–{f(spk + 5)}/km",
            "vo2": f"{f(spk - 25)}–{f(spk - 15)}/km", "largo": f"{f(spk + 55)}–{f(spk + 85)}/km",
        }
    return out


def hr_txt(z: dict, key: str) -> str:
    hr = z.get("hr")
    if not hr:
        return {"z1": "zona 1", "z2": "zona 2", "z3": "zona 3", "z4": "zona 4", "z5": "zona 5"}[key]
    lo, hi = hr[key]
    if lo is None:
        return f"< {hi} ppm"
    if hi is None:
        return f"> {lo} ppm"
    return f"{lo}–{hi} ppm"


# ============================================================ evaluación de sesión
def evaluate_all(days: list[dict], prof: dict, perf: dict) -> None:
    """Añade a cada actividad un bloque 'coach' con nota y comentarios."""
    zones = personal_zones(prof, perf)
    history: dict[str, list[dict]] = {}
    for i, d in enumerate(days):
        prev = days[i - 1] if i else None
        for a in d["activities"]:
            grp = act_group(a.get("type"))
            past = history.setdefault(grp, [])[-40:]
            a["coach"] = evaluate(a, d, prev, past, zones)
            history[grp].append(a)


def evaluate(a: dict, d: dict, prev: dict | None, past: list[dict], zones: dict) -> dict[str, Any]:
    grp = act_group(a.get("type"))
    durs = [p["duration_s"] for p in past if p.get("duration_s")]
    typical = median(durs) if len(durs) >= 3 else None
    kind = session_kind(a, typical)
    ready = (d.get("readiness") or {}).get("score")
    recov = (d.get("whoop") or {}).get("recovery")
    sleep_h = ((d.get("sleep") or {}).get("total_s") or 0) / 3600 or None
    score = 7.0
    good, improve = [], []
    label = a.get("te_label")
    te_a, te_an = a.get("te_aerobic"), a.get("te_anaerobic")
    hi_share = zone_share(a, (2, 3, 4))

    if kind == "intensa":
        if (ready is not None and ready < 40) or (recov is not None and recov < 34):
            score -= 2
            improve.append(f"Sesión intensa con recuperación baja (disposición {ready if ready is not None else '—'}). "
                           "El beneficio es menor y el riesgo de lesión mayor: en días así, cámbiala por una suave.")
        elif ready is not None and ready >= 70:
            score += 1
            good.append(f"Buen momento: hiciste intensidad con disposición alta ({ready}).")
        if prev and any(is_hard(x) for x in prev["activities"]):
            score -= 1
            improve.append("Dos días intensos seguidos: deja al menos 48 h entre sesiones duras.")
        if sleep_h and sleep_h < 6:
            score -= 0.5
            improve.append(f"Dormiste {sleep_h:.1f} h: con poco sueño la calidad del entrenamiento baja.")
    if kind == "suave" and grp in ("running", "cycling") and hi_share is not None and hi_share > 0.3:
        score -= 1.5
        improve.append(f"Tu sesión suave no fue tan suave: {hi_share:.0%} del tiempo en zona 3 o más. "
                       f"Para que sume, quédate en zona 2 ({hr_txt(zones, 'z2')}).")
    elif kind == "suave" and hi_share is not None and hi_share < 0.15 and (a.get("duration_s") or 0) > 1800:
        score += 0.5
        good.append("Ritmo suave bien controlado: así se construye la base sin acumular fatiga.")
    if te_a is not None and kind != "fuerza":
        if te_a >= 5:
            score -= 1
            improve.append("Training Effect aeróbico 5,0 (sobrecarga): pasaste de lo productivo a lo agotador.")
        elif te_a >= 3 and kind in ("intensa", "larga"):
            score += 0.5
            good.append(f"Estímulo productivo (Training Effect {te_a:.1f}): mejora tu forma física.")
        elif te_a < 1 and (a.get("duration_s") or 0) > 1200:
            good.append("Efecto de recuperación: útil como día suave.")
    load = a.get("load")
    loads = [p["load"] for p in past if p.get("load")]
    if load and len(loads) >= 5 and load > 2 * median(loads):
        score -= 0.5
        improve.append(f"Carga {load:.0f}: más del doble de tu sesión típica ({median(loads):.0f}). Da 1–2 días suaves después.")
    if kind == "larga":
        good.append("Sesión larga: clave para la resistencia y la economía.")
    # eficiencia aeróbica: metros por latido en rodajes comparables
    eff_note = None
    if grp == "running" and a.get("avg_speed") and a.get("avg_hr"):
        eff = a["avg_speed"] * 60 / a["avg_hr"]
        ref = [p["avg_speed"] * 60 / p["avg_hr"] for p in past if p.get("avg_speed") and p.get("avg_hr") and not is_hard(p)]
        if len(ref) >= 4 and kind != "intensa":
            diff = (eff / median(ref) - 1) * 100
            eff_note = round(diff, 1)
            if diff > 3:
                score += 0.5
                good.append(f"Eficiencia aeróbica {diff:+.0f}% frente a tus rodajes recientes: corres más rápido con el mismo pulso.")
            elif diff < -4:
                improve.append(f"Eficiencia aeróbica {diff:+.0f}%: pulso más alto para el mismo ritmo (calor, fatiga, deshidratación o terreno).")
    # --- con el detalle de la actividad (parciales, series, clima)
    det = a.get("detail") or {}
    context = []
    dc = det.get("decoupling")
    if dc is not None and kind != "intensa" and (a.get("duration_s") or 0) >= 40 * 60 and grp in ("running", "cycling"):
        if dc < 5:
            score += 0.5
            good.append(f"Desacople aeróbico {dc:.1f}%: el pulso se mantuvo estable respecto al ritmo toda la sesión. Tu base aeróbica aguanta esta duración.")
        elif dc < 10:
            improve.append(f"Desacople aeróbico {dc:.1f}%: en la segunda mitad el pulso subió más que el ritmo. Sal algo más lento, hidrátate y sigue sumando volumen suave.")
        else:
            score -= 0.5
            improve.append(f"Desacople aeróbico {dc:.1f}%: fuerte deriva del pulso. Esta duración aún supera tu base aeróbica (o hubo calor o deshidratación).")
    cv, sd = det.get("pace_cv"), det.get("split_diff")
    if cv is not None and grp == "running":
        if kind == "intensa" and len([l for l in det.get("laps", []) if (l.get("intensity") or "") in ("ACTIVE", "INTERVAL")]) >= 3:
            if cv < 3:
                good.append(f"Series muy regulares (variación de ritmo {cv:.1f}%): buen control del esfuerzo.")
            elif sd is not None and sd < -4:
                improve.append(f"Las últimas repeticiones fueron {abs(sd):.0f}% más lentas: saliste demasiado fuerte. Empieza las series un poco más conservador.")
        elif kind != "intensa":
            if sd is not None and sd > 1:
                good.append(f"Parcial negativo (segunda mitad {sd:.0f}% más rápida): excelente gestión del ritmo.")
            elif cv > 8 and not (a.get("elevation_gain") or 0) > 150:
                improve.append(f"Ritmo irregular (variación {cv:.0f}% entre kilómetros). En rodajes, un ritmo constante es más eficiente.")
    w = det.get("weather") or {}
    if w.get("temp_c") is not None:
        t = w["temp_c"]
        if t >= 26:
            hum = f", {w['humidity']}% de humedad" if w.get("humidity") else ""
            context.append(f"Hizo calor ({t:.0f} °C{hum}): el pulso sube 5–10 ppm para el mismo ritmo. Es normal ir más lento.")
        elif t <= 3:
            context.append(f"Hizo frío ({t:.0f} °C): calienta más tiempo antes de ir rápido.")
    if kind == "fuerza":
        info = det.get("sets_info") or {}
        if det.get("sets"):
            tot_sets = sum(x["sets"] for x in det["sets"])
            tot_reps = sum(x["reps"] for x in det["sets"])
            named = [x["name"] for x in det["sets"] if x["name"] != "Sin identificar"]
            good.append(f"{tot_sets} series y {tot_reps} repeticiones" + (f": {', '.join(named[:4]).lower()}." if named else "."))
            if info.get("unknown"):
                improve.append(f"{info['unknown']} series quedaron sin ejercicio identificado. Al terminar cada serie, confírmalo en el reloj "
                               "(o edítalo después en Garmin Connect) para medir bien el volumen por músculo.")
            if not info.get("weighted"):
                improve.append("No registraste el peso. Anotarlo te permite ver tu progreso de fuerza semana a semana.")
            if info.get("rest_avg_s"):
                r = info["rest_avg_s"]
                context.append(f"Descanso medio entre series: {r // 60} min {r % 60:02d} s "
                               + ("(adecuado para fuerza máxima)." if r >= 150 else "(bien para hipertrofia)." if r >= 60 else "(corto: más resistencia que fuerza)."))
        hi = zone_share(a, (2, 3, 4)) or 0
        if hi > 0.2:
            context.append(f"Pasaste un {hi:.0%} del tiempo en zona 3 o más: un circuito con efecto cardiovascular además de fuerza.")
    if a.get("zones_s") is None and grp in ("running", "cycling"):
        improve.append("Sin datos de zonas de FC: revisa que el sensor de pulso esté activo.")

    score = round(_clamp(score, 1, 10), 1)
    grade = "Excelente" if score >= 8.5 else "Buena" if score >= 7 else "Mejorable" if score >= 5 else "Arriesgada"
    purpose = ("Fuerza: protege articulaciones y tendones, mejora la economía de carrera y mantiene la masa muscular." if kind == "fuerza"
               else PURPOSE.get(label or "", ""))
    rec_h = None
    if te_a:
        rec_h = round(max(te_a - 1.5, 0) * 12 + (te_an or 0) * 6)
    if kind == "fuerza":
        rec_h = 48 if (a.get("duration_s") or 0) > 2400 else 24
    nxt = ("Deja ~48 h antes de volver a trabajar los mismos grupos musculares; mañana puedes hacer cardio suave." if kind == "fuerza" else
           "Mañana: día suave o descanso." if kind == "intensa" else
           "Mañana: suave; pasado mañana ya puedes meter calidad." if kind == "larga" else
           "Puedes hacer calidad en tu próxima sesión si la disposición es buena.")
    return {"score": score, "grade": grade, "kind": kind, "purpose": purpose, "good": good, "improve": improve,
            "context": context, "efficiency": eff_note, "recovery_h": rec_h, "next": nxt}


# ============================================================ revisión semanal
def weekly_review(days: list[dict]) -> dict[str, Any]:
    w, pw = days[-7:], days[-14:-7]

    def stats(ds):
        acts = [a for d in ds for a in d["activities"]]
        loads = [d.get("daily_load") or 0 for d in ds]
        z = [0.0] * 5
        for a in acts:
            for i, s in enumerate(a.get("zones_s") or []):
                z[i] += s or 0
        tz = sum(z) or 1
        return {
            "sessions": len(acts), "hours": sum(a.get("duration_s") or 0 for a in acts) / 3600,
            "km": sum(a.get("distance_m") or 0 for a in acts) / 1000, "load": sum(loads),
            "hard": sum(1 for a in acts if is_hard(a)), "rest_days": sum(1 for d in ds if not d["activities"]),
            "easy_pct": round((z[0] + z[1]) / tz * 100), "mid_pct": round(z[2] / tz * 100), "hard_pct": round((z[3] + z[4]) / tz * 100),
            "monotony": round(mean(loads) / pstdev(loads), 2) if len(loads) > 1 and pstdev(loads) > 0 else None,
            "sleep_h": mean([d["sleep"]["total_s"] / 3600 for d in ds if d["sleep"].get("total_s")] or [0]) or None,
            "recovery": mean([d["whoop"]["recovery"] for d in ds if d["whoop"].get("recovery") is not None] or [0]) or None,
            "scores": [a["coach"]["score"] for a in acts if a.get("coach")],
            "long_share": (max((a.get("duration_s") or 0) for a in acts) / (sum(a.get("duration_s") or 0 for a in acts) or 1)) if acts else None,
        }

    cur, prev = stats(w), stats(pw)
    change = (cur["load"] / prev["load"] - 1) * 100 if prev["load"] else None
    notes = []
    if change is not None:
        if change > 25:
            notes.append(("warning", f"La carga subió {change:.0f}% respecto a la semana anterior. Lo recomendable es no pasar de +10–20%."))
        elif change < -30 and cur["sessions"]:
            notes.append(("good", f"Semana más ligera ({change:.0f}%): perfecto si era de descarga."))
        else:
            notes.append(("good", f"Progresión de carga controlada ({change:+.0f}%)."))
    if cur["easy_pct"] < 70 and cur["sessions"] >= 3:
        notes.append(("warning", f"Solo {cur['easy_pct']}% del tiempo en zonas suaves. Los mejores resultados llegan con ~80% suave y ~20% intenso."))
    elif cur["sessions"] >= 3:
        notes.append(("good", f"Buena distribución de intensidad: {cur['easy_pct']}% suave."))
    if cur["mid_pct"] > 35:
        notes.append(("warning", f"{cur['mid_pct']}% en zona 3, la «zona gris»: cansa bastante y aporta poco. Haz lo suave más suave y lo duro más duro."))
    if cur["hard"] > 3:
        notes.append(("serious", f"{cur['hard']} sesiones intensas en 7 días: demasiadas para asimilarlas. Con 2–3 basta."))
    if cur["rest_days"] == 0:
        notes.append(("serious", "Ningún día de descanso esta semana."))
    if cur["monotony"] and cur["monotony"] > 2:
        notes.append(("warning", "Monotonía alta: alterna más los días duros y los suaves."))
    if cur["long_share"] and cur["long_share"] > 0.4 and cur["sessions"] >= 3:
        notes.append(("warning", f"Tu sesión más larga fue el {cur['long_share']:.0%} del volumen semanal; lo ideal es < 35%."))
    if cur["sleep_h"] and cur["sleep_h"] < 7:
        notes.append(("warning", f"Dormiste {cur['sleep_h']:.1f} h de media: con esta carga necesitas 7,5–8 h."))
    avg_score = round(mean(cur["scores"]), 1) if cur["scores"] else None
    if not cur["sessions"]:
        verdict = "Semana sin entrenamientos registrados."
    elif sum(1 for n in notes if n[0] in ("warning", "serious")) == 0:
        verdict = "Semana muy bien planteada: carga, intensidad y descanso equilibrados."
    elif sum(1 for n in notes if n[0] == "serious"):
        verdict = "Semana exigente con puntos de riesgo: prioriza la recuperación los próximos días."
    else:
        verdict = "Buena semana con algunos ajustes pendientes."
    return {"current": cur, "previous": prev, "load_change": change, "notes": notes, "verdict": verdict, "avg_score": avg_score}


# ============================================================ recomendación del día y plan
GOAL_NAMES = {"salud": "Salud general", "5k": "5 K", "10k": "10 K", "media": "Media maratón", "maraton": "Maratón",
              "trail": "Trail", "triatlon": "Triatlón", "ciclismo": "Ciclismo", "fuerza": "Fuerza", "peso": "Perder peso"}


def _dominant_sport(days: list[dict]) -> str:
    cnt: dict[str, float] = {}
    for d in days[-42:]:
        for a in d["activities"]:
            g = act_group(a.get("type"))
            cnt[g] = cnt.get(g, 0) + (a.get("duration_s") or 0)
    cnt.pop("strength", None)
    cnt.pop("walking", None)
    return max(cnt, key=cnt.get) if cnt else "running"


def session_library(sport: str, z: dict, phase: str, goal: str) -> dict[str, dict[str, str]]:
    p = z.get("pace") or {}
    run = sport == "running"
    unit = lambda key: f" (≈ {p[key]})" if run and p.get(key) else ""
    return {
        "descanso": {"title": "Descanso", "detail": "Día libre o 20–30 min de movilidad y estiramientos suaves. El descanso también es entrenamiento.", "intensity": "descanso"},
        "recuperacion": {"title": "Recuperación activa", "detail": f"30–40 min muy suave en zona 1 ({hr_txt(z, 'z1')}). Debes poder conversar sin esfuerzo.", "intensity": "suave"},
        "suave": {"title": "Rodaje suave" if run else "Sesión aeróbica suave",
                  "detail": f"45–60 min en zona 2 ({hr_txt(z, 'z2')}){unit('suave')}. Termina con 4–6 aceleraciones de 20 s.", "intensity": "suave"},
        "largo": {"title": "Tirada larga" if run else "Salida larga",
                  "detail": ("75–110 min" if goal in ("media", "maraton", "trail", "triatlon", "ciclismo") else "60–75 min") +
                            f" en zona 2 ({hr_txt(z, 'z2')}){unit('largo')}. Hidrátate cada 20 min; en las > 90 min, lleva hidratos.", "intensity": "moderada"},
        "tempo": {"title": "Tempo", "detail": f"15 min de calentamiento + 20–30 min en zona 3 alta ({hr_txt(z, 'z3')}){unit('tempo')} + 10 min suaves.", "intensity": "intensa"},
        "umbral": {"title": "Series de umbral", "detail": f"Calentamiento 15 min + 3×10 min en zona 4 ({hr_txt(z, 'z4')}){unit('umbral')} con 2 min suaves entre series + vuelta a la calma.", "intensity": "intensa"},
        "vo2": {"title": "Series de VO2 máx.", "detail": f"Calentamiento 15 min + 5×3 min en zona 5 ({hr_txt(z, 'z5')}){unit('vo2')} con 2–3 min de trote entre series.", "intensity": "intensa"},
        "anaerobico": {"title": "Series cortas", "detail": "Calentamiento 15 min + 10×45 s muy rápidos con 90 s de recuperación. Potencia y tolerancia al lactato.", "intensity": "intensa"},
        "cuestas": {"title": "Cuestas", "detail": "Calentamiento + 8×90 s en subida a ritmo fuerte, bajando al trote. Fuerza específica para trail.", "intensity": "intensa"},
        "fuerza": {"title": "Fuerza + core", "detail": "30–40 min: sentadilla, peso muerto rumano, zancadas, gemelos, plancha y puente de glúteo. 3×8–12. Previene lesiones.", "intensity": "moderada"},
    }


def today_plan(days: list[dict], prof: dict, perf: dict, health: dict) -> dict[str, Any]:
    d = days[-1]
    z = personal_zones(prof, perf)
    sport = _dominant_sport(days)
    goal = prof.get("goal") or "salud"
    lib = session_library(sport, z, "base", goal)
    ready = (d.get("readiness") or {}).get("score")
    rec = d["whoop"].get("recovery")
    t = d.get("training") or {}
    a, c = t.get("acute") or t.get("acute_est"), t.get("chronic") or t.get("chronic_est")
    acwr = t.get("acwr") or (a / c if a and c else None)
    last_hard = next((i for i, x in enumerate(reversed(days[:-1])) if any(is_hard(y) for y in x["activities"])), None)
    days_since_hard = (last_hard + 1) if last_hard is not None else 99
    illness = any("combatiendo" in al["title"] for al in (health or {}).get("alerts", []))
    reasons = []
    if ready is not None:
        reasons.append(f"Disposición para entrenar: {ready}/100")
    if rec is not None:
        reasons.append(f"Recuperación: {rec}%")
    if acwr:
        reasons.append(f"Ratio de carga: {acwr:.2f}")
    reasons.append(f"Última sesión intensa: hace {days_since_hard} día(s)" if days_since_hard < 99 else "Sin sesiones intensas recientes")

    if illness or (ready is not None and ready < 25) or (rec is not None and rec < 25):
        key, why = "descanso", "Tu cuerpo necesita recuperarse: hoy entrenar restaría más de lo que suma."
    elif (ready is not None and ready < 50) or (rec is not None and rec < 40) or (acwr and acwr > 1.5):
        key, why = "recuperacion", "Recuperación incompleta o carga acumulada alta: toca algo muy suave."
    elif days_since_hard <= 1:
        key, why = "suave", "Ayer hubo intensidad: hoy suave para asimilarla."
    elif (ready or 60) >= 70 and (rec or 60) >= 55 and days_since_hard >= 2:
        shortage = _load_shortage(t)
        key = shortage or {"5k": "vo2", "10k": "umbral", "media": "umbral", "maraton": "tempo", "trail": "cuestas"}.get(goal, "tempo")
        why = "Estás recuperado: es el día ideal para una sesión de calidad." + (
            f" Garmin detecta déficit de carga {'anaeróbica' if shortage == 'anaerobico' else 'aeróbica alta' if shortage == 'umbral' else 'aeróbica baja'}." if shortage else "")
    else:
        key, why = "suave", "Día intermedio: volumen aeróbico sin castigar el cuerpo."
    s = dict(lib[key])
    s.update(key=key, why=why, reasons=reasons, sport=sport)
    return s


def _load_shortage(t: dict) -> str | None:
    for key, lk, tk in (("anaerobico", "load_anaerobic", "target_anaerobic"), ("umbral", "load_high_aerobic", "target_high_aerobic"), ("largo", "load_low_aerobic", "target_low_aerobic")):
        v, tg = t.get(lk), t.get(tk)
        if v is not None and tg and tg[0] and v < tg[0]:
            return key
    return None


def week_plan(days: list[dict], prof: dict, perf: dict, today: dict) -> dict[str, Any]:
    goal = prof.get("goal") or "salud"
    dpw = int(prof.get("days_per_week") or 4)
    z = personal_zones(prof, perf)
    sport = _dominant_sport(days)
    phase, weeks_to_race = "base", None
    if prof.get("race_date"):
        try:
            weeks_to_race = (date.fromisoformat(prof["race_date"]) - date.today()).days / 7
            phase = ("post" if weeks_to_race < 0 else "taper" if weeks_to_race < 1.5 else "pico" if weeks_to_race < 4
                     else "construccion" if weeks_to_race < 12 else "base")
        except ValueError:
            pass
    lib = session_library(sport, z, phase, goal)
    quality = {"5k": ["vo2", "umbral"], "10k": ["umbral", "vo2"], "media": ["umbral", "tempo"], "maraton": ["tempo", "umbral"],
               "trail": ["cuestas", "umbral"], "triatlon": ["umbral", "vo2"], "ciclismo": ["umbral", "vo2"]}.get(goal, ["tempo", "anaerobico"])
    if phase == "base":
        quality = ["tempo", quality[0]]
    # plantilla semanal (0 = lunes)
    templates = {
        2: {2: "q1", 5: "largo"},
        3: {1: "q1", 3: "suave", 5: "largo"},
        4: {1: "q1", 2: "fuerza", 3: "q2", 5: "largo"},
        5: {1: "q1", 2: "suave", 3: "q2", 4: "fuerza", 5: "largo"},
        6: {0: "suave", 1: "q1", 2: "suave", 3: "q2", 4: "fuerza", 5: "largo"},
        7: {0: "suave", 1: "q1", 2: "suave", 3: "q2", 4: "fuerza", 5: "largo", 6: "recuperacion"},
    }
    tpl = templates[max(2, min(7, dpw))]
    start = date.fromisoformat(days[-1]["date"])
    plan = []
    for i in range(7):
        dt = start + timedelta(days=i)
        slot = tpl.get(dt.weekday(), "descanso")
        key = {"q1": quality[0], "q2": quality[1]}.get(slot, slot)
        if phase == "taper" and key in ("largo", "umbral", "vo2", "tempo", "cuestas", "anaerobico"):
            key = "suave" if key == "largo" else key
        if i == 0:
            key = today["key"]
        item = dict(lib[key])
        if phase == "taper" and item["intensity"] == "intensa" and i > 0:
            item["detail"] += " Semana de puesta a punto: reduce el volumen de series a la mitad."
        item.update(date=dt.isoformat(), key=key)
        plan.append(item)
    # evita dos intensas seguidas tras cambiar el día de hoy
    for i in range(1, 7):
        if plan[i]["intensity"] == "intensa" and plan[i - 1]["intensity"] == "intensa":
            plan[i] = dict(lib["suave"], date=plan[i]["date"], key="suave")
    phase_txt = {"base": "Base: construir volumen aeróbico con poca intensidad.", "construccion": "Construcción: sesiones específicas para tu objetivo.",
                 "pico": "Pico: las sesiones más exigentes y específicas.", "taper": "Puesta a punto: menos volumen y la misma intensidad para llegar fresco.",
                 "post": "Post-carrera: recuperación activa 1–2 semanas."}[phase]
    return {"goal": GOAL_NAMES.get(goal, goal), "phase": phase, "phase_text": phase_txt, "weeks_to_race": round(weeks_to_race, 1) if weeks_to_race is not None else None,
            "days": plan, "zones": z, "sport": sport}


def goal_progress(prof: dict, perf: dict) -> dict[str, Any] | None:
    goal = prof.get("goal")
    key = {"5k": "5k", "10k": "10k", "media": "half", "maraton": "marathon"}.get(goal or "")
    pred = (perf.get("race") or {}).get(key) if key else None
    target = prof.get("target_time")
    if not pred:
        return None
    out = {"goal": GOAL_NAMES[goal], "predicted_s": pred, "target_s": None, "gap_s": None}
    if target:
        try:
            parts = [int(x) for x in str(target).split(":")]
            secs = parts[0] * 3600 + parts[1] * 60 + parts[2] if len(parts) == 3 else parts[0] * 60 + parts[1]
            out.update(target_s=secs, gap_s=pred - secs)
        except (ValueError, IndexError):
            pass
    return out


def build(days: list[dict], prof: dict, perf: dict, health: dict) -> dict[str, Any]:
    if not days:
        return {}
    today = today_plan(days, prof, perf, health)
    return {
        "today": today,
        "week": weekly_review(days),
        "plan": week_plan(days, prof, perf, today),
        "goal": goal_progress(prof, perf),
    }
