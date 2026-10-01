"""Indicadores de riesgo de salud a partir del reloj + cuestionario.

IMPORTANTE: esto NO es un diagnóstico. Son señales orientativas basadas en
factores de riesgo reconocidos (AHA Life's Essential 8, guías de hipertensión,
literatura sobre VO2 máx., FC en reposo, sueño y apnea). Sirven para saber qué
vigilar y cuándo consultar a un médico.
"""
from __future__ import annotations

from datetime import date, timedelta
from statistics import mean, pstdev
from typing import Any, Callable

GOOD, WARN, SERIOUS, CRIT, NONE = "good", "warning", "serious", "critical", "unknown"
POINTS = {GOOD: 0, WARN: 1, SERIOUS: 2, CRIT: 3}


def _avg(xs: list[Any]) -> float | None:
    v = [x for x in xs if x is not None]
    return mean(v) if v else None


def _series(days: list[dict], fn: Callable[[dict], Any]) -> list[Any]:
    out = []
    for d in days:
        try:
            out.append(fn(d))
        except (KeyError, TypeError):
            out.append(None)
    return out


def factor(name: str, value: str, status: str, why: str, action: str = "", weight: float = 1.0) -> dict[str, Any]:
    return {"name": name, "value": value, "status": status, "why": why, "action": action, "weight": weight}


def missing(name: str, how: str) -> dict[str, Any]:
    return factor(name, "Sin datos", NONE, how, how)


# ============================================================ métricas base
class Ctx:
    """Resume los últimos días para que los factores no recalculen todo."""

    def __init__(self, days: list[dict], prof: dict, bp: list[dict], weights: list[dict]):
        self.days = days
        self.prof = prof
        self.d30 = days[-30:]
        self.d7 = days[-7:]
        self.d28 = days[-28:]
        base = days[-37:-7] if len(days) > 14 else days[:-7]
        self.age = prof.get("age")
        self.sex = prof.get("sex")
        self.rhr30 = _avg(_series(self.d30, lambda d: d["heart"]["rhr"]))
        self.rhr7 = _avg(_series(self.d7, lambda d: d["heart"]["rhr"]))
        self.rhr_base = _avg(_series(base, lambda d: d["heart"]["rhr"]))
        self.rhr3 = _avg(_series(days[-3:], lambda d: d["heart"]["rhr"]))
        self.hrv30 = _avg(_series(self.d30, lambda d: d["hrv"].get("last_night")))
        self.hrv7 = _avg(_series(self.d7, lambda d: d["hrv"].get("last_night")))
        self.hrv3 = _avg(_series(days[-3:], lambda d: d["hrv"].get("last_night")))
        self.hrv_base = _avg(_series(base, lambda d: d["hrv"].get("last_night")))
        self.resp_base = _avg(_series(base, lambda d: d["sleep"].get("avg_resp")))
        self.resp3 = _avg(_series(days[-3:], lambda d: d["sleep"].get("avg_resp")))
        self.resp30 = _avg(_series(self.d30, lambda d: d["sleep"].get("avg_resp")))
        sleep_h = [s / 3600 for s in _series(self.d30, lambda d: d["sleep"].get("total_s")) if s]
        self.sleep_h = _avg(sleep_h)
        self.short_nights = sum(1 for h in sleep_h if h < 6) / len(sleep_h) if sleep_h else None
        self.sleep_score30 = _avg(_series(self.d30, lambda d: d["sleep"].get("score")))
        self.sleep_score3 = _avg(_series(days[-3:], lambda d: d["sleep"].get("score")))
        self.sleep_score_base = _avg(_series(base, lambda d: d["sleep"].get("score")))
        starts = []
        for s in _series(self.d30, lambda d: d["sleep"].get("start_ms")):
            if s:
                m = (s / 60000) % 1440
                starts.append((m + 720) % 1440)
        self.bed_sd = pstdev(starts) if len(starts) >= 7 else None
        lows = [x for x in _series(self.d30, lambda d: d["sleep"].get("lowest_spo2")) if x]
        self.spo2_nights = len(lows)
        self.spo2_low_frac = sum(1 for x in lows if x < 88) / len(lows) if lows else None
        self.spo2_min = min(lows) if lows else None
        self.spo2_avg = _avg(_series(self.d30, lambda d: d["sleep"].get("avg_spo2") or d["spo2"].get("avg")))
        self.awake_count = _avg(_series(self.d30, lambda d: d["sleep"].get("awake_count")))
        self.stress30 = _avg(_series(self.d30, lambda d: d["stress"].get("avg")))
        steps = _series(self.d30, lambda d: d["daily"].get("steps"))
        self.steps = _avg([s for s in steps if s])
        mvpa = sum((d["daily"].get("intensity_moderate") or 0) + 2 * (d["daily"].get("intensity_vigorous") or 0) for d in self.d28)
        self.mvpa_week = mvpa / 4 if self.d28 else None
        self.vo2 = next((d["training"].get("vo2max") for d in reversed(days) if d.get("training", {}).get("vo2max")), None)
        endurance = {"running", "cycling", "swimming"}
        from .coach import act_group  # evita import circular en carga
        wk_hours = sum((a.get("duration_s") or 0) for d in days[-84:] for a in d["activities"] if act_group(a.get("type")) in endurance) / 3600
        self.endurance_h_week = wk_hours / 12 if days else None
        # presión arterial: media de las últimas 2 semanas con mediciones, o manual
        recent_bp = [b for b in bp if b["date"] >= (date.today() - timedelta(days=60)).isoformat()]
        if recent_bp:
            last = recent_bp[-6:]
            self.bp = (round(mean(b["sys"] for b in last)), round(mean(b["dia"] for b in last)), f"media de {len(last)} mediciones Garmin")
        elif prof.get("bp_sys") and prof.get("bp_dia"):
            self.bp = (int(prof["bp_sys"]), int(prof["bp_dia"]), "ingresada en tu perfil")
        else:
            self.bp = None
        self.bmi = prof.get("bmi")
        if weights:
            w = weights[-1]
            if w.get("bmi"):
                self.bmi = w["bmi"]
            elif prof.get("height_cm"):
                self.bmi = round(w["kg"] / (prof["height_cm"] / 100) ** 2, 1)
        # carga de entrenamiento
        loads = [d.get("daily_load") or 0 for d in days[-28:]]
        self.load7 = sum(loads[-7:])
        self.load_prev3w = sum(loads[:-7]) / 3 if len(loads) >= 14 else None
        self.monotony = (mean(loads[-7:]) / pstdev(loads[-7:])) if len(loads) >= 7 and pstdev(loads[-7:]) > 0 else None
        t = days[-1].get("training", {}) if days else {}
        a, c = t.get("acute") or t.get("acute_est"), t.get("chronic") or t.get("chronic_est")
        self.acwr = t.get("acwr") or (a / c if a and c else None)
        self.rest_days14 = sum(1 for d in days[-14:] if not d["activities"])
        from .coach import is_hard
        self.hard_low_ready = sum(
            1 for d in days[-14:] for x in d["activities"]
            if is_hard(x) and ((d.get("readiness") or {}).get("score") or 100) < 40
        )
        z = [0.0] * 5
        for d in days[-28:]:
            for x in d["activities"]:
                for i, s in enumerate(x.get("zones_s") or []):
                    z[i] += s or 0
        self.easy_share = (z[0] + z[1]) / sum(z) if sum(z) > 0 else None


# ============================================================ factores
def f_bp(c: Ctx, weight: float = 2.0) -> dict:
    if not c.bp:
        return missing("Presión arterial", "Mídela (idealmente con un tensiómetro validado, varias mañanas) y regístrala en Garmin Connect o en tu Perfil.")
    s, d, src = c.bp
    val = f"{s}/{d} mmHg ({src})"
    if s >= 180 or d >= 120:
        return factor("Presión arterial", val, CRIT, "Valores de crisis hipertensiva.", "Consulta médica urgente si se repite en reposo.", weight)
    if s >= 140 or d >= 90:
        return factor("Presión arterial", val, CRIT, "Hipertensión grado 2 según la AHA.", "Consulta a tu médico para confirmar y tratar.", weight)
    if s >= 130 or d >= 80:
        return factor("Presión arterial", val, SERIOUS, "Hipertensión grado 1 (≥130/80).", "Confírmala con más mediciones y coméntala con tu médico.", weight)
    if s >= 120:
        return factor("Presión arterial", val, WARN, "Presión elevada (120–129 de sistólica).", "Reduce la sal y el alcohol; vuelve a medir en un mes.", weight)
    return factor("Presión arterial", val, GOOD, "Presión normal (<120/80).", "", weight)


def f_bmi(c: Ctx, weight: float = 1.0) -> dict:
    if not c.bmi:
        return missing("Índice de masa corporal", "Registra tu peso y altura en Garmin Connect o en tu Perfil.")
    b = c.bmi
    note = " (en deportistas musculados el IMC puede sobreestimar la grasa)"
    if b >= 35:
        return factor("IMC", f"{b}", CRIT, "Obesidad grado 2 o más.", "Plan de pérdida de peso con apoyo profesional.", weight)
    if b >= 30:
        return factor("IMC", f"{b}", SERIOUS, "Obesidad." + note, "Bajar un 5–10% del peso ya mejora la presión y el azúcar.", weight)
    if b >= 25:
        return factor("IMC", f"{b}", WARN, "Sobrepeso." + note, "Revisa la composición corporal (% de grasa) antes de sacar conclusiones.", weight)
    if b < 18.5:
        return factor("IMC", f"{b}", WARN, "Bajo peso: puede afectar a huesos, hormonas y recuperación.", "Asegura suficiente energía y proteína.", weight)
    return factor("IMC", f"{b}", GOOD, "Peso saludable.", "", weight)


def f_rhr(c: Ctx, weight: float = 1.0) -> dict:
    if not c.rhr30:
        return missing("FC en reposo", "Usa el reloj de día y de noche.")
    r = c.rhr30
    val = f"{r:.0f} ppm (media 30 d)"
    if r > 90:
        return factor("FC en reposo", val, CRIT, "Muy alta: se asocia a más riesgo cardiovascular.", "Coméntalo con tu médico.", weight)
    if r > 80:
        return factor("FC en reposo", val, SERIOUS, "Alta: cada 10 ppm extra aumenta el riesgo cardiovascular.", "El ejercicio aeróbico regular la baja en pocas semanas.", weight)
    if r > 70:
        return factor("FC en reposo", val, WARN, "En la parte alta de lo normal.", "Más trabajo aeróbico suave y mejor sueño ayudan a bajarla.", weight)
    return factor("FC en reposo", val, GOOD, "Corazón eficiente en reposo.", "", weight)


def f_rhr_trend(c: Ctx, weight: float = 1.0) -> dict:
    if not (c.rhr7 and c.rhr_base):
        return missing("Tendencia de FC en reposo", "Se necesitan al menos 3 semanas de datos.")
    delta = c.rhr7 - c.rhr_base
    val = f"{delta:+.1f} ppm vs. tu base"
    if delta >= 5:
        return factor("Tendencia de FC en reposo", val, SERIOUS, "Subida sostenida: fatiga, estrés, enfermedad o falta de sueño.", "Baja la intensidad unos días y vigila síntomas.", weight)
    if delta >= 3:
        return factor("Tendencia de FC en reposo", val, WARN, "Ligeramente por encima de lo habitual.", "Prioriza el descanso esta semana.", weight)
    return factor("Tendencia de FC en reposo", val, GOOD, "Estable.", "", weight)


def hrv_norm(age: int | None) -> float:
    return max(25.0, 72 - 0.95 * ((age or 35) - 20))


def f_hrv(c: Ctx, weight: float = 1.0) -> dict:
    if not c.hrv30:
        return missing("Variabilidad cardiaca (VFC)", "Duerme con el reloj puesto: la VFC se mide de noche.")
    n = hrv_norm(c.age)
    ratio = c.hrv30 / n
    val = f"{c.hrv30:.0f} ms (referencia para tu edad ≈ {n:.0f})"
    if ratio < 0.65:
        return factor("VFC para tu edad", val, SERIOUS, "Baja: el sistema nervioso pasa más tiempo en modo estrés.", "Sueño regular, ejercicio aeróbico, menos alcohol y técnicas de respiración.", weight)
    if ratio < 0.85:
        return factor("VFC para tu edad", val, WARN, "Algo por debajo de la media de tu edad (la VFC es muy individual).", "Observa tu tendencia más que el número aislado.", weight)
    return factor("VFC para tu edad", val, GOOD, "Buena capacidad de adaptación del corazón.", "", weight)


def f_sleep(c: Ctx, weight: float = 1.0) -> dict:
    if not c.sleep_h:
        return missing("Duración del sueño", "Duerme con el reloj puesto.")
    h = c.sleep_h
    val = f"{h:.1f} h/noche" + (f" · {c.short_nights:.0%} de noches < 6 h" if c.short_nights else "")
    if h < 6:
        return factor("Sueño", val, SERIOUS, "Dormir menos de 6 h de forma habitual sube la presión arterial y el riesgo cardiometabólico.", "Adelanta la hora de acostarte 30 min durante 2 semanas.", weight)
    if h < 7:
        return factor("Sueño", val, WARN, "Por debajo de las 7 h recomendadas para adultos.", "Busca 7–9 h; mantén horarios fijos.", weight)
    if h >= 9.5:
        return factor("Sueño", val, WARN, "Dormir mucho de forma habitual puede reflejar mala calidad de sueño.", "Si te despiertas cansado, coméntalo con tu médico.", weight)
    return factor("Sueño", val, GOOD, "Duración adecuada.", "", weight)


def f_sleep_reg(c: Ctx, weight: float = 0.5) -> dict:
    if c.bed_sd is None:
        return missing("Regularidad del sueño", "Se necesitan al menos 7 noches registradas.")
    val = f"± {c.bed_sd:.0f} min en la hora de acostarte"
    if c.bed_sd > 90:
        return factor("Regularidad del sueño", val, SERIOUS, "Horarios muy irregulares alteran el reloj biológico.", "Fija una hora de acostarte, también el fin de semana.", weight)
    if c.bed_sd > 50:
        return factor("Regularidad del sueño", val, WARN, "Horarios algo irregulares.", "Intenta que la variación sea < 45 min.", weight)
    return factor("Regularidad del sueño", val, GOOD, "Horarios consistentes.", "", weight)


def f_activity(c: Ctx, weight: float = 1.0) -> dict:
    if c.mvpa_week is None:
        return missing("Actividad física", "Usa el reloj a diario.")
    m = c.mvpa_week
    val = f"{m:.0f} min de intensidad/semana (OMS: ≥150)"
    if m < 75:
        return factor("Actividad física", val, SERIOUS, "Actividad insuficiente: uno de los mayores factores de riesgo modificables.", "Suma 3 caminatas rápidas de 25 min por semana.", weight)
    if m < 150:
        return factor("Actividad física", val, WARN, "Por debajo del mínimo recomendado por la OMS.", "Llega a 150 min/semana.", weight)
    return factor("Actividad física", val, GOOD, "Cumples (o superas) la recomendación de la OMS.", "", weight)


def f_steps(c: Ctx, weight: float = 0.5) -> dict:
    if not c.steps:
        return missing("Pasos", "Usa el reloj a diario.")
    val = f"{c.steps:,.0f} pasos/día".replace(",", ".")
    if c.steps < 5000:
        return factor("Pasos diarios", val, SERIOUS, "Mucho tiempo sedentario.", "Levántate cada hora; activa la alerta de movimiento.", weight)
    if c.steps < 7500:
        return factor("Pasos diarios", val, WARN, "La mortalidad baja claramente hasta ~8.000 pasos/día.", "Añade 2.000 pasos (unos 20 min andando).", weight)
    return factor("Pasos diarios", val, GOOD, "Buen movimiento diario.", "", weight)


VO2_NORMS = {  # umbrales bajo|regular|bueno|excelente (por encima: superior)
    "M": [(29, [36, 42, 46, 52]), (39, [34, 40, 44, 49]), (49, [32, 37, 42, 47]), (59, [29, 34, 38, 43]), (200, [26, 31, 35, 40])],
    "F": [(29, [31, 36, 40, 46]), (39, [29, 34, 38, 43]), (49, [27, 32, 36, 40]), (59, [24, 28, 32, 36]), (200, [22, 26, 30, 33])],
}
VO2_LABELS = ["Bajo", "Regular", "Bueno", "Excelente", "Superior"]


def vo2_category(vo2: float | None, age: int | None, sex: str | None) -> tuple[str | None, int | None]:
    if not vo2:
        return None, None
    table = VO2_NORMS.get(sex or "M")
    th = next(t for a, t in table if (age or 35) <= a)
    idx = sum(1 for x in th if vo2 >= x)
    return VO2_LABELS[idx], idx


def f_vo2(c: Ctx, weight: float = 1.5) -> dict:
    cat, idx = vo2_category(c.vo2, c.age, c.sex)
    if cat is None:
        return missing("Capacidad aeróbica (VO2 máx.)", "Haz carreras o rutas en bici al aire libre con GPS y FC para que Garmin la estime.")
    val = f"{c.vo2:.0f} ml/kg/min · {cat} para tu edad"
    if idx == 0:
        return factor("VO2 máx.", val, SERIOUS, "Una baja capacidad aeróbica es de los predictores más fuertes de enfermedad cardiovascular.", "Entrena resistencia 3 veces por semana; mejora rápido.", weight)
    if idx == 1:
        return factor("VO2 máx.", val, WARN, "Capacidad aeróbica mejorable.", "Añade una sesión semanal de intervalos.", weight)
    return factor("VO2 máx.", val, GOOD, "Buena forma cardiorrespiratoria: protege el corazón y el cerebro.", "", weight)


def f_stress(c: Ctx, weight: float = 0.5) -> dict:
    if not c.stress30:
        return missing("Estrés", "Usa el reloj a diario.")
    val = f"{c.stress30:.0f}/100 de media"
    if c.stress30 > 45:
        return factor("Estrés crónico", val, SERIOUS, "Estrés fisiológico alto de forma sostenida.", "Pausas de respiración (app Relax del reloj), sueño y menos cafeína.", weight)
    if c.stress30 > 35:
        return factor("Estrés crónico", val, WARN, "Estrés algo elevado.", "Busca bloques diarios de descanso real.", weight)
    return factor("Estrés crónico", val, GOOD, "Estrés controlado.", "", weight)


def f_age_sex(c: Ctx, weight: float = 1.0) -> dict:
    if not c.age:
        return missing("Edad", "Completa tu fecha de nacimiento en Garmin Connect o en tu Perfil.")
    threshold = 45 if c.sex != "F" else 55
    val = f"{c.age} años"
    if c.age >= 65:
        return factor("Edad", val, SERIOUS, "El riesgo aumenta con la edad (factor no modificable).", "Controles médicos periódicos.", weight)
    if c.age >= threshold:
        return factor("Edad", val, WARN, "Edad a partir de la cual sube el riesgo cardiovascular.", "Control anual de presión, colesterol y glucosa.", weight)
    return factor("Edad", val, GOOD, "Edad de bajo riesgo.", "", weight)


def f_smoking(c: Ctx, weight: float = 1.5) -> dict:
    s = c.prof.get("smoking")
    if not s:
        return missing("Tabaco", "Indica en tu Perfil si fumas o has fumado.")
    m = {"nunca": (GOOD, "Nunca fumador."), "ex5": (GOOD, "Dejaste de fumar hace más de 5 años."),
         "ex1": (WARN, "Dejaste de fumar hace 1–5 años: el riesgo sigue bajando."),
         "reciente": (SERIOUS, "Dejaste de fumar hace menos de 1 año."), "actual": (CRIT, "Fumar multiplica el riesgo de infarto y ACV.")}
    st, why = m.get(s, (NONE, ""))
    return factor("Tabaco", s.replace("ex5", "exfumador >5 años").replace("ex1", "exfumador 1–5 años"), st, why,
                  "Dejar de fumar es la medida más potente." if st in (SERIOUS, CRIT) else "", weight)


def f_chol(c: Ctx, weight: float = 1.0) -> dict:
    v = c.prof.get("non_hdl")
    if not v:
        return missing("Colesterol no-HDL", "Pide un perfil lipídico en tu próximo análisis y anótalo en tu Perfil.")
    v = float(v)
    val = f"{v:.0f} mg/dL" + (" (con tratamiento)" if c.prof.get("chol_meds") else "")
    if v >= 190:
        return factor("Colesterol no-HDL", val, CRIT, "Muy alto.", "Consulta médica.", weight)
    if v >= 160:
        return factor("Colesterol no-HDL", val, SERIOUS, "Alto.", "Dieta mediterránea y control médico.", weight)
    if v >= 130:
        return factor("Colesterol no-HDL", val, WARN, "Límite alto.", "Más fibra, menos grasas saturadas.", weight)
    return factor("Colesterol no-HDL", val, GOOD, "Óptimo.", "", weight)


def f_glucose(c: Ctx, weight: float = 1.0) -> dict:
    p = c.prof
    if p.get("diabetes"):
        return factor("Glucosa", "Diabetes diagnosticada", CRIT, "La diabetes daña los vasos sanguíneos.", "Buen control de la HbA1c con tu médico.", weight)
    g, a = p.get("glucose"), p.get("a1c")
    if not g and not a:
        return missing("Glucosa en ayunas / HbA1c", "Anota tu glucosa en ayunas o HbA1c del último análisis en tu Perfil.")
    if (g and float(g) >= 126) or (a and float(a) >= 6.5):
        return factor("Glucosa", f"{g or '—'} mg/dL · HbA1c {a or '—'}%", CRIT, "Valores compatibles con diabetes.", "Consulta médica para confirmar.", weight)
    if (g and float(g) >= 100) or (a and float(a) >= 5.7):
        return factor("Glucosa", f"{g or '—'} mg/dL · HbA1c {a or '—'}%", SERIOUS, "Prediabetes.", "Ejercicio regular y menos azúcares simples; se revierte.", weight)
    return factor("Glucosa", f"{g or '—'} mg/dL · HbA1c {a or '—'}%", GOOD, "Normal.", "", weight)


def f_family(c: Ctx, key: str = "family_cvd", label: str = "Antecedentes familiares", weight: float = 1.0) -> dict:
    v = c.prof.get(key)
    if v:
        return factor(label, "Sí", WARN, "Padres o hermanos con la enfermedad a edad temprana aumentan tu riesgo.", "Controles médicos más frecuentes.", weight)
    return factor(label, "No indicado", GOOD, "Sin antecedentes indicados en tu Perfil.", "", weight)


def f_alcohol(c: Ctx, weight: float = 0.75) -> dict:
    v = c.prof.get("alcohol_week")
    if v is None or v == "":
        return missing("Alcohol", "Indica cuántas bebidas tomas por semana en tu Perfil.")
    v = float(v)
    lim = 7 if c.sex == "F" else 14
    if v > lim:
        return factor("Alcohol", f"{v:.0f} bebidas/semana", SERIOUS, "Sube la presión, altera el sueño y la VFC y favorece arritmias.", "Reduce a la mitad y observa tu VFC nocturna.", weight)
    if v > lim / 2:
        return factor("Alcohol", f"{v:.0f} bebidas/semana", WARN, "Consumo moderado: ya afecta a la calidad del sueño.", "Evítalo en los días previos a entrenos clave.", weight)
    return factor("Alcohol", f"{v:.0f} bebidas/semana", GOOD, "Consumo bajo.", "", weight)


# --- apnea y respiración nocturna
def f_spo2_dips(c: Ctx, weight: float = 1.5) -> dict:
    if c.spo2_low_frac is None:
        return missing("Oxígeno nocturno (SpO₂)", "Activa el pulsioxímetro durante el sueño en el reloj.")
    val = f"{c.spo2_low_frac:.0%} de noches con mínimo < 88% · mínimo {c.spo2_min}%"
    if c.spo2_low_frac > 0.3 or (c.spo2_min or 100) < 82:
        return factor("Caídas de oxígeno nocturno", val, SERIOUS, "Caídas repetidas de SpO₂ pueden indicar apnea del sueño.", "Consulta a un especialista en sueño (polisomnografía).", weight)
    if c.spo2_low_frac > 0.1:
        return factor("Caídas de oxígeno nocturno", val, WARN, "Algunas noches con caídas de oxígeno (ojo: la medición en muñeca tiene ruido si te mueves o aprietas el brazo).", "Vigila si coincide con ronquidos o cansancio diurno.", weight)
    return factor("Caídas de oxígeno nocturno", val, GOOD, "Oxigenación nocturna estable.", "", weight)


def f_spo2_avg(c: Ctx, weight: float = 0.75) -> dict:
    if not c.spo2_avg:
        return missing("SpO₂ media", "Activa el pulsioxímetro durante el sueño.")
    val = f"{c.spo2_avg:.0f}%"
    if c.spo2_avg < 92:
        return factor("SpO₂ media nocturna", val, SERIOUS, "Oxigenación baja (salvo que vivas en altura).", "Coméntalo con tu médico.", weight)
    if c.spo2_avg < 94:
        return factor("SpO₂ media nocturna", val, WARN, "Algo baja (normal en altitud > 1.500 m).", "", weight)
    return factor("SpO₂ media nocturna", val, GOOD, "Normal.", "", weight)


def f_resp(c: Ctx, weight: float = 0.5) -> dict:
    if not c.resp30:
        return missing("Respiración nocturna", "Duerme con el reloj puesto.")
    val = f"{c.resp30:.1f} rpm"
    if c.resp30 > 20:
        return factor("Respiración nocturna", val, SERIOUS, "Frecuencia respiratoria alta durante el sueño.", "Coméntalo con tu médico.", weight)
    if c.resp30 > 17:
        return factor("Respiración nocturna", val, WARN, "En la parte alta de lo normal (12–18).", "", weight)
    return factor("Respiración nocturna", val, GOOD, "Normal.", "", weight)


def f_awake(c: Ctx, weight: float = 0.5) -> dict:
    if c.awake_count is None:
        return missing("Despertares", "Duerme con el reloj puesto.")
    val = f"{c.awake_count:.1f} por noche"
    if c.awake_count > 4:
        return factor("Despertares nocturnos", val, WARN, "Sueño fragmentado: típico de apnea, estrés o mala higiene de sueño.", "Habitación fresca y oscura; sin pantallas 1 h antes.", weight)
    return factor("Despertares nocturnos", val, GOOD, "Sueño poco fragmentado.", "", weight)


def f_snoring(c: Ctx, weight: float = 1.0) -> dict:
    if c.prof.get("snoring"):
        return factor("Ronquidos", "Sí", WARN, "Roncar fuerte es la señal más común de apnea.", "Pregunta a quien duerme contigo si hay pausas al respirar.", weight)
    return factor("Ronquidos", "No indicado", GOOD, "Sin ronquidos indicados en tu Perfil.", "", weight)


def f_male_age(c: Ctx, weight: float = 0.5) -> dict:
    if not c.age:
        return missing("Edad y sexo", "Completa tu perfil.")
    risky = (c.sex != "F" and c.age >= 40) or (c.sex == "F" and c.age >= 50)
    return factor("Edad y sexo", f"{c.age} años · {'hombre' if c.sex != 'F' else 'mujer'}", WARN if risky else GOOD,
                  "La apnea es más frecuente en hombres > 40 y mujeres tras la menopausia." if risky else "Grupo de menor riesgo.", "", weight)


def f_endurance(c: Ctx, weight: float = 0.75) -> dict:
    h = c.endurance_h_week
    if h is None:
        return missing("Volumen de resistencia", "Registra tus entrenamientos.")
    val = f"{h:.1f} h/semana (últimas 12 semanas)"
    if h > 10 and (c.age or 0) >= 40:
        return factor("Volumen de resistencia", val, WARN, "Años de mucho volumen de resistencia se asocian a más fibrilación auricular.", "Ante palpitaciones o pulso irregular, consulta.", weight)
    return factor("Volumen de resistencia", val, GOOD, "Volumen sin riesgo arrítmico conocido.", "", weight)


# --- lesión y sobrecarga
def f_acwr(c: Ctx, weight: float = 1.5) -> dict:
    if not c.acwr:
        return missing("Ratio carga aguda/crónica", "Entrena con el reloj al menos 4 semanas.")
    val = f"{c.acwr:.2f}"
    if c.acwr > 1.5:
        return factor("Ratio de carga (ACWR)", val, CRIT, "Por encima de 1,5 el riesgo de lesión se multiplica.", "Reduce volumen e intensidad un 30% esta semana.", weight)
    if c.acwr > 1.3:
        return factor("Ratio de carga (ACWR)", val, SERIOUS, "Zona de riesgo: estás subiendo la carga rápido.", "No añadas más carga hasta que baje de 1,3.", weight)
    if c.acwr < 0.8:
        return factor("Ratio de carga (ACWR)", val, WARN, "Carga baja: al volver de golpe te lesionas más fácil.", "Retoma la carga de forma progresiva.", weight)
    return factor("Ratio de carga (ACWR)", val, GOOD, "Zona óptima (0,8–1,3).", "", weight)


def f_ramp(c: Ctx, weight: float = 1.0) -> dict:
    if not c.load_prev3w:
        return missing("Progresión semanal", "Se necesitan 4 semanas de entrenamientos.")
    pct = (c.load7 / c.load_prev3w - 1) * 100 if c.load_prev3w else 0
    val = f"{pct:+.0f}% vs. media de las 3 semanas previas"
    if pct > 40:
        return factor("Progresión semanal", val, SERIOUS, "Subida brusca de carga.", "Sube como máximo un 10–20% por semana.", weight)
    if pct > 20:
        return factor("Progresión semanal", val, WARN, "Subida algo rápida.", "Mantén la carga una semana antes de volver a subir.", weight)
    return factor("Progresión semanal", val, GOOD, "Progresión controlada.", "", weight)


def f_monotony(c: Ctx, weight: float = 0.75) -> dict:
    if c.monotony is None:
        return missing("Monotonía", "Se necesitan 7 días con datos.")
    val = f"{c.monotony:.1f}"
    if c.monotony > 2:
        return factor("Monotonía del entrenamiento", val, SERIOUS, "Todos los días se parecen: poca alternancia entre días duros y suaves.", "Alterna días duros, suaves y de descanso.", weight)
    if c.monotony > 1.5:
        return factor("Monotonía del entrenamiento", val, WARN, "Poca variación de carga entre días.", "Haz más suaves los días suaves.", weight)
    return factor("Monotonía del entrenamiento", val, GOOD, "Buena alternancia de cargas.", "", weight)


def f_rest(c: Ctx, weight: float = 1.0) -> dict:
    r = c.rest_days14
    val = f"{r} días sin entrenar en las últimas 2 semanas"
    if r == 0:
        return factor("Días de descanso", val, SERIOUS, "Sin días de descanso el tejido no se repara.", "Programa al menos 1 día libre por semana.", weight)
    if r < 2:
        return factor("Días de descanso", val, WARN, "Pocos días de descanso.", "Idealmente 1–2 por semana.", weight)
    return factor("Días de descanso", val, GOOD, "Descanso suficiente.", "", weight)


def f_hard_low(c: Ctx, weight: float = 1.0) -> dict:
    n = c.hard_low_ready
    val = f"{n} sesiones intensas con disposición < 40 (14 d)"
    if n >= 2:
        return factor("Intensidad sin recuperar", val, SERIOUS, "Entrenar fuerte sin haber recuperado es la vía clásica a la lesión.", "Cambia la sesión dura por una suave cuando la disposición esté baja.", weight)
    if n == 1:
        return factor("Intensidad sin recuperar", val, WARN, "Una sesión dura con poca recuperación.", "Respeta los días de baja disposición.", weight)
    return factor("Intensidad sin recuperar", val, GOOD, "Entrenas duro cuando estás recuperado.", "", weight)


def f_hrv_supp(c: Ctx, weight: float = 1.0) -> dict:
    if not (c.hrv7 and c.hrv_base):
        return missing("VFC frente a tu base", "Duerme con el reloj puesto 3 semanas.")
    pct = (c.hrv7 / c.hrv_base - 1) * 100
    val = f"{pct:+.0f}% (7 d vs. base)"
    if pct < -15:
        return factor("VFC suprimida", val, SERIOUS, "Tu cuerpo no está asimilando la carga.", "Semana de descarga.", weight)
    if pct < -7:
        return factor("VFC suprimida", val, WARN, "Algo de fatiga acumulada.", "Vigila el sueño y baja la intensidad.", weight)
    return factor("VFC frente a tu base", val, GOOD, "Estás asimilando bien.", "", weight)


def f_intensity_dist(c: Ctx, weight: float = 0.75) -> dict:
    if c.easy_share is None:
        return missing("Distribución de intensidad", "Entrena con FC.")
    val = f"{c.easy_share:.0%} del tiempo en Z1–Z2"
    if c.easy_share < 0.6:
        return factor("Distribución de intensidad", val, SERIOUS, "Entrenas demasiado fuerte la mayor parte del tiempo.", "Regla 80/20: 80% suave, 20% intenso.", weight)
    if c.easy_share < 0.72:
        return factor("Distribución de intensidad", val, WARN, "Algo cargado hacia la intensidad.", "Haz tus rodajes más lentos.", weight)
    return factor("Distribución de intensidad", val, GOOD, "Distribución equilibrada.", "", weight)


def f_sleep_load(c: Ctx, weight: float = 0.75) -> dict:
    if not c.sleep_h:
        return missing("Sueño para recuperar", "Duerme con el reloj puesto.")
    val = f"{c.sleep_h:.1f} h/noche"
    if c.sleep_h < 6.5:
        return factor("Sueño para recuperar", val, SERIOUS, "Deportistas que duermen < 7 h se lesionan hasta 1,7 veces más.", "Duerme 8 h en semanas de carga alta.", weight)
    if c.sleep_h < 7.2:
        return factor("Sueño para recuperar", val, WARN, "Justo para la carga que haces.", "Suma 30 min de sueño o una siesta corta.", weight)
    return factor("Sueño para recuperar", val, GOOD, "Suficiente.", "", weight)


def f_injuries(c: Ctx, weight: float = 0.75) -> dict:
    inj = (c.prof.get("injuries") or "").strip()
    if inj:
        return factor("Lesiones previas", inj[:60], WARN, "Una lesión previa es el mayor predictor de la siguiente.", "Mantén la fuerza y movilidad específicas de esa zona.", weight)
    return factor("Lesiones previas", "Ninguna indicada", GOOD, "Sin lesiones indicadas en tu Perfil.", "", weight)


# ============================================================ riesgos
def build_risk(rid: str, name: str, icon: str, intro: str, factors: list[dict]) -> dict[str, Any]:
    known = [f for f in factors if f["status"] != NONE]
    max_pts = sum(3 * f["weight"] for f in known)
    pts = sum(POINTS[f["status"]] * f["weight"] for f in known)
    ratio = pts / max_pts if max_pts else 0
    coverage = len(known) / len(factors) if factors else 0
    if len(known) < 3:
        level, label = NONE, "Datos insuficientes"
    elif ratio < 0.15:
        level, label = GOOD, "Bajo"
    elif ratio < 0.3:
        level, label = WARN, "Moderado"
    elif ratio < 0.5:
        level, label = SERIOUS, "Elevado"
    else:
        level, label = CRIT, "Alto"
    worst = sorted([f for f in known if f["status"] != GOOD], key=lambda f: -POINTS[f["status"]] * f["weight"])
    good = [f["name"] for f in known if f["status"] == GOOD][:3]
    if level == NONE:
        summary = "Faltan datos para estimarlo. Completa tu perfil y usa el reloj de día y de noche."
    elif not worst:
        summary = f"No vemos señales de alerta. A tu favor: {', '.join(good).lower()}."
    else:
        summary = f"Lo que más pesa: {', '.join(f['name'].lower() for f in worst[:2])}."
        if good:
            summary += f" A tu favor: {', '.join(good[:2]).lower()}."
    actions = [f["action"] for f in worst if f["action"]][:3]
    missing_actions = [f["action"] for f in factors if f["status"] == NONE][:2]
    return {
        "id": rid, "name": name, "icon": icon, "intro": intro,
        "level": level, "label": label, "index": round(ratio * 100), "coverage": round(coverage * 100),
        "summary": summary, "actions": actions, "to_complete": missing_actions, "factors": factors,
    }


def early_warning(c: Ctx) -> dict[str, Any] | None:
    """Detecta el patrón típico de un resfriado/infección o de sobreentrenamiento agudo."""
    signals = []
    if c.rhr3 and c.rhr_base and c.rhr3 - c.rhr_base >= 4:
        signals.append(f"FC en reposo +{c.rhr3 - c.rhr_base:.0f} ppm")
    if c.hrv3 and c.hrv_base and c.hrv3 / c.hrv_base < 0.85:
        signals.append(f"VFC {(c.hrv3 / c.hrv_base - 1) * 100:.0f}%")
    if c.resp3 and c.resp_base and c.resp3 - c.resp_base >= 1:
        signals.append(f"respiración nocturna +{c.resp3 - c.resp_base:.1f} rpm")
    if c.sleep_score3 and c.sleep_score_base and c.sleep_score3 < c.sleep_score_base - 12:
        signals.append("sueño peor de lo habitual")
    if len(signals) >= 2:
        return {
            "level": SERIOUS if len(signals) >= 3 else WARN,
            "title": "Tu cuerpo muestra señales de estar combatiendo algo",
            "text": f"En los últimos 3 días: {', '.join(signals)}. Este patrón suele aparecer 1–2 días antes de un resfriado "
                    "o cuando se acumula demasiada fatiga. Hoy mejor descanso o actividad muy suave, hidrátate y duerme más.",
        }
    return None


def le8(c: Ctx) -> dict[str, Any]:
    """AHA Life's Essential 8 (0–100). Se calcula con lo disponible."""
    p = c.prof
    comps = []

    def add(key, name, score, value, source, tip=""):
        comps.append({"key": key, "name": name, "score": score, "value": value, "source": source, "tip": tip})

    # Actividad
    m = c.mvpa_week
    if m is not None:
        s = 100 if m >= 150 else 90 if m >= 120 else 80 if m >= 90 else 60 if m >= 60 else 40 if m >= 30 else 20 if m > 0 else 0
        add("activity", "Actividad física", s, f"{m:.0f} min/sem", "reloj")
    # Sueño
    if c.sleep_h:
        h = c.sleep_h
        s = 100 if 7 <= h < 9 else 90 if 9 <= h < 10 else 70 if 6 <= h < 7 else 40 if 5 <= h < 6 or h >= 10 else 20 if 4 <= h < 5 else 0
        add("sleep", "Sueño", s, f"{h:.1f} h", "reloj")
    # IMC
    if c.bmi:
        b = c.bmi
        s = 100 if b < 25 else 70 if b < 30 else 30 if b < 35 else 15 if b < 40 else 0
        add("bmi", "Peso (IMC)", s, f"{b}", "reloj/perfil")
    else:
        add("bmi", "Peso (IMC)", None, "—", "falta", "Registra peso y altura.")
    # Presión
    if c.bp:
        sy, di, _ = c.bp
        s = 100 if sy < 120 and di < 80 else 75 if sy < 130 and di < 80 else 50 if sy < 140 and di < 90 else 25 if sy < 160 and di < 100 else 0
        if p.get("bp_meds"):
            s = max(0, s - 20)
        add("bp", "Presión arterial", s, f"{sy}/{di}", "Garmin/perfil")
    else:
        add("bp", "Presión arterial", None, "—", "falta", "Mide tu presión y regístrala.")
    # Tabaco
    sm = p.get("smoking")
    if sm:
        add("nicotine", "Tabaco", {"nunca": 100, "ex5": 75, "ex1": 50, "reciente": 25, "actual": 0}.get(sm), sm, "perfil")
    else:
        add("nicotine", "Tabaco", None, "—", "falta", "Indícalo en tu Perfil.")
    # Colesterol
    nh = p.get("non_hdl")
    if nh:
        nh = float(nh)
        s = 100 if nh < 130 else 60 if nh < 160 else 40 if nh < 190 else 20 if nh < 220 else 0
        if p.get("chol_meds"):
            s = max(0, s - 20)
        add("lipids", "Colesterol", s, f"{nh:.0f} mg/dL", "perfil")
    else:
        add("lipids", "Colesterol", None, "—", "falta", "Anota tu colesterol no-HDL (total − HDL).")
    # Glucosa
    gl, a1c = p.get("glucose"), p.get("a1c")
    if p.get("diabetes"):
        a = float(a1c) if a1c else 8
        s = 40 if a < 7 else 30 if a < 8 else 20 if a < 9 else 10 if a < 10 else 0
        add("glucose", "Glucosa", s, f"diabetes · HbA1c {a1c or '—'}", "perfil")
    elif gl or a1c:
        pre = (gl and float(gl) >= 100) or (a1c and float(a1c) >= 5.7)
        add("glucose", "Glucosa", 60 if pre else 100, f"{gl or '—'} mg/dL", "perfil")
    else:
        add("glucose", "Glucosa", None, "—", "falta", "Anota tu glucosa en ayunas.")
    # Dieta (autoevaluación 0-4)
    dt = p.get("diet")
    if dt not in (None, ""):
        add("diet", "Alimentación", [0, 25, 50, 80, 100][int(dt)], ["Muy mala", "Mala", "Regular", "Buena", "Excelente"][int(dt)], "perfil")
    else:
        add("diet", "Alimentación", None, "—", "falta", "Autoevalúa tu dieta en el Perfil.")
    scores = [x["score"] for x in comps if x["score"] is not None]
    total = round(mean(scores)) if scores else None
    level = None if total is None else ("Alta" if total >= 80 else "Moderada" if total >= 50 else "Baja")
    return {"score": total, "level": level, "components": comps, "complete": len(scores), "of": 8}


def assess(days: list[dict], prof: dict, bp: list[dict], weights: list[dict]) -> dict[str, Any]:
    if not days:
        return {}
    c = Ctx(days, prof, bp, weights)
    apnea = build_risk("apnea", "Apnea del sueño", "🌙",
                       "Pausas en la respiración durante el sueño. Si no se trata, sube la presión y el riesgo de arritmias y ACV.",
                       [f_spo2_dips(c), f_spo2_avg(c), f_resp(c), f_awake(c), f_snoring(c), f_bmi(c), f_male_age(c)])
    apnea_factor = factor("Señales de apnea", apnea["label"], apnea["level"] if apnea["level"] != NONE else NONE,
                          "La apnea no tratada eleva la presión y el riesgo de arritmias.", "Revisa la tarjeta de apnea del sueño.")
    if apnea["level"] == NONE:
        apnea_factor = missing("Señales de apnea", "Activa el pulsioxímetro durante el sueño.")
    hyper = build_risk("hipertension", "Hipertensión", "🩺",
                       "Presión alta sostenida. No da síntomas y es la principal causa de infarto y ACV.",
                       [f_bp(c), f_bmi(c), f_rhr(c), f_sleep(c), apnea_factor, f_activity(c), f_stress(c), f_alcohol(c), f_age_sex(c), f_family(c)])
    heart = build_risk("infarto", "Infarto / enfermedad coronaria", "❤️",
                       "Obstrucción de las arterias del corazón. La prevención se basa en la forma física y en controlar presión, colesterol, glucosa y tabaco.",
                       [f_vo2(c), f_smoking(c), f_bp(c, 1.5), f_chol(c), f_glucose(c), f_rhr(c), f_hrv(c), f_activity(c), f_bmi(c), f_age_sex(c), f_family(c), f_sleep(c, 0.5)])
    afib = build_risk("arritmia", "Arritmias (fibrilación auricular)", "💓",
                      "Latido irregular. Aumenta hasta 5 veces el riesgo de ACV. El reloj no la diagnostica, pero sí vigila sus factores de riesgo.",
                      [f_age_sex(c), f_bp(c, 1.5), apnea_factor, f_bmi(c), f_alcohol(c, 1.0), f_endurance(c), f_rhr_trend(c, 0.5)])
    stroke_af = factor("Riesgo de arritmia", afib["label"], afib["level"], "La fibrilación auricular es una causa frecuente de ACV.", "Ante palpitaciones o pulso irregular, consulta.")
    if afib["level"] == NONE:
        stroke_af = missing("Riesgo de arritmia", "Completa tu perfil.")
    stroke = build_risk("acv", "ACV (ictus)", "🧠",
                        "Falta de riego en el cerebro. La presión arterial explica cerca de la mitad del riesgo.",
                        [f_bp(c, 2.5), stroke_af, apnea_factor, f_smoking(c), f_glucose(c), f_chol(c), f_age_sex(c), f_activity(c), f_sleep(c, 0.5), f_alcohol(c)])
    metab = build_risk("metabolico", "Diabetes tipo 2 / síndrome metabólico", "🩸",
                       "Resistencia a la insulina. Muy ligada al peso, la actividad, el sueño y la forma física.",
                       [f_glucose(c, 2.0), f_bmi(c, 1.5), f_activity(c), f_steps(c), f_sleep(c), f_vo2(c, 1.0), f_rhr(c, 0.5), f_family(c, "family_diabetes", "Antecedentes de diabetes")])
    injury = build_risk("lesion", "Lesión por sobrecarga", "🦵",
                        "Tendinitis, fracturas por estrés, roturas musculares: casi siempre por subir la carga más rápido de lo que el cuerpo se adapta.",
                        [f_acwr(c), f_ramp(c), f_monotony(c), f_rest(c), f_hard_low(c), f_hrv_supp(c), f_sleep_load(c), f_intensity_dist(c), f_injuries(c)])
    risks = [hyper, heart, stroke, afib, apnea, metab, injury]
    # con pocos días de uso, los indicadores del reloj no son fiables todavía
    wear_days = sum(1 for d in days if d["heart"].get("rhr"))
    if wear_days < 7:
        for r in risks:
            r.update(level=NONE, label="Recopilando datos",
                     summary=f"Llevas {wear_days} día(s) con el reloj. Necesitamos al menos 7 días (idealmente 3 semanas) de uso de día y de noche para estimar este indicador con fiabilidad.")

    alerts = []
    ew = early_warning(c)
    if ew:
        alerts.append(ew)
    if c.bp and (c.bp[0] >= 180 or c.bp[1] >= 120):
        alerts.append({"level": CRIT, "title": "Presión arterial muy alta", "text": "Tus últimas mediciones están en rango de crisis. Si tienes dolor de cabeza intenso, dolor en el pecho, falta de aire o alteraciones de visión o habla, llama a emergencias."})
    if c.spo2_min and c.spo2_min < 80:
        alerts.append({"level": SERIOUS, "title": "Oxígeno nocturno muy bajo en alguna noche", "text": f"Mínimo registrado: {c.spo2_min}%. Puede ser un error de lectura, pero si se repite consulta a un especialista en sueño."})
    if c.rhr7 and c.rhr7 > 100:
        alerts.append({"level": SERIOUS, "title": "FC en reposo por encima de 100", "text": "Taquicardia en reposo sostenida: consulta a tu médico."})

    cat, _ = vo2_category(c.vo2, c.age, c.sex)
    return {
        "le8": le8(c),
        "risks": risks,
        "alerts": alerts,
        "fitness": {"vo2max": c.vo2, "vo2_category": cat, "hrv_norm": round(hrv_norm(c.age)), "age": c.age, "sex": c.sex, "bmi": c.bmi,
                    "bp": {"sys": c.bp[0], "dia": c.bp[1], "source": c.bp[2]} if c.bp else None},
        "vitals": {
            "rhr30": c.rhr30, "rhr_base": c.rhr_base, "hrv30": c.hrv30, "hrv_base": c.hrv_base, "sleep_h": c.sleep_h,
            "spo2_avg": c.spo2_avg, "spo2_min": c.spo2_min, "resp30": c.resp30, "steps": c.steps, "mvpa_week": c.mvpa_week, "stress30": c.stress30,
        },
        "bp_readings": bp[-30:],
        "weights": weights[-60:],
    }
