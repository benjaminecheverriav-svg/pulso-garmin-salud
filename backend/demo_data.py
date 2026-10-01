"""Datos de demostración realistas (mismo formato que normalizer.normalize_day).

Permiten probar la app sin conectar la cuenta de Garmin.
"""
from __future__ import annotations

import math
import random
from datetime import date, datetime, time, timedelta
from typing import Any

rng = random.Random(8)


def _ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


def _zones(duration_s: float, profile: list[float]) -> list[int]:
    tot = sum(profile)
    return [int(duration_s * p / tot) for p in profile]


WEEK_PLAN = {
    0: None,  # lunes: descanso
    1: ("running", "Series 6x800 m", 55, [5, 15, 25, 35, 20], 3.4, 3.6),
    2: ("running", "Rodaje suave", 50, [15, 60, 20, 5, 0], 2.8, 0.3),
    3: ("strength_training", "Fuerza", 45, [40, 40, 15, 5, 0], 1.6, 0.8),
    4: ("running", "Tempo 30'", 60, [5, 15, 30, 45, 5], 3.8, 1.2),
    5: ("cycling", "Bici Z2", 75, [10, 55, 30, 5, 0], 2.7, 0.1),
    6: ("running", "Tirada larga", 105, [5, 45, 40, 10, 0], 3.9, 0.4),
}


def _sleep_levels(start: datetime, total_s: int, deep_s: int, rem_s: int, awake_s: int) -> list[dict[str, Any]]:
    """Genera un hipnograma plausible: ~5 ciclos, más profundo al inicio, más REM al final."""
    cycles = 5
    levels = []
    t = start
    deep_w = [0.32, 0.27, 0.2, 0.13, 0.08]
    rem_w = [0.1, 0.16, 0.22, 0.25, 0.27]
    light_total = total_s - deep_s - rem_s
    for c in range(cycles):
        light = int(light_total / cycles)
        segs = [("light", light * 0.55), ("deep", deep_s * deep_w[c]), ("light", light * 0.45), ("rem", rem_s * rem_w[c])]
        if c in (1, 3):
            segs.append(("awake", awake_s * 0.35))
        if c == 4:
            segs.append(("awake", awake_s * 0.3))
        for stage, dur in segs:
            if dur < 60:
                continue
            end = t + timedelta(seconds=dur)
            levels.append({"start": _ms(t), "end": _ms(end), "stage": stage})
            t = end
    return levels


def generate(days: int = 120) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    rng.seed(8)  # mismos datos en cada carga
    today = date.today()
    out = []
    fatigue = 0.3
    fitness = 49.0
    acute = chronic = 300.0
    bb_prev_end = 35
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        week_idx = (days - 1 - i) // 7
        deload = week_idx % 4 == 3
        plan = WEEK_PLAN[d.weekday()]
        if plan and rng.random() < 0.08:
            plan = None  # algún día saltado

        # ---------- sueño (noche previa)
        bed = datetime.combine(d - timedelta(days=1), time(23, 0)) + timedelta(minutes=rng.gauss(10, 28))
        if d.weekday() in (5, 6):
            bed += timedelta(minutes=40)
        total_h = _clamp(rng.gauss(7.3, 0.6) - fatigue * 0.3, 5.2, 9.0)
        total_s = int(total_h * 3600)
        deep_s = int(total_s * _clamp(rng.gauss(0.19, 0.03), 0.1, 0.28))
        rem_s = int(total_s * _clamp(rng.gauss(0.22, 0.03), 0.12, 0.3))
        awake_s = int(rng.uniform(8, 35) * 60)
        light_s = total_s - deep_s - rem_s
        wake = bed + timedelta(seconds=total_s + awake_s)
        need = 460 + fatigue * 60
        sleep_score = int(_clamp(60 + (total_h - 6) * 11 + (deep_s / total_s - 0.15) * 120 - awake_s / 600 + rng.gauss(0, 4), 35, 97))

        hrv = _clamp(rng.gauss(62 - fatigue * 18 + (total_h - 7.2) * 3, 4.5), 30, 95)
        rhr = round(_clamp(rng.gauss(46 + fatigue * 6, 1.3), 40, 60))
        resp = round(_clamp(rng.gauss(14.2 + fatigue * 0.6, 0.35), 12, 18), 1)
        weekly_hrv = hrv if not out else mean_last(out, 6, lambda x: x["hrv"].get("last_night"), hrv)
        hrv_status = "BALANCED" if 52 <= weekly_hrv <= 70 else ("UNBALANCED" if weekly_hrv > 70 else "LOW")

        # ---------- actividad
        acts = []
        load_today = 0
        if plan:
            typ, name, dur_min, prof, te_a, te_an = plan
            factor = 0.7 if deload else 1.0 + 0.05 * (week_idx % 4)
            dur = dur_min * 60 * factor * rng.uniform(0.9, 1.1)
            zones = _zones(dur, prof)
            avg_hr = int(118 + sum(z * k for z, k in zip(zones, [0, 12, 26, 38, 50])) / max(dur, 1))
            speed = {"running": 3.3 + (fitness - 49) * 0.03, "cycling": 8.4, "strength_training": 0}[typ] * rng.uniform(0.95, 1.05)
            load = int(sum(z / 60 * w for z, w in zip(zones, [0.6, 1.2, 2.2, 3.4, 4.8])) * (0.9 + fatigue * 0.2))
            load_today = load
            start = datetime.combine(d, time(7, 0) if d.weekday() < 5 else time(8, 30)) + timedelta(minutes=rng.randint(-20, 30))
            acts.append({
                "id": int(d.strftime("%Y%m%d")),
                "name": name,
                "type": typ,
                "start": start.strftime("%Y-%m-%d %H:%M:%S"),
                "duration_s": dur,
                "moving_s": dur * 0.97,
                "distance_m": speed * dur if speed else None,
                "avg_hr": avg_hr,
                "max_hr": min(avg_hr + rng.randint(15, 30), 192),
                "kcal": int(dur / 60 * (11 if typ != "strength_training" else 7)),
                "te_aerobic": round(_clamp(te_a * factor + rng.gauss(0, 0.2), 1, 5), 1),
                "te_anaerobic": round(_clamp(te_an * factor + rng.gauss(0, 0.2), 0, 5), 1),
                "te_label": {"Series 6x800 m": "VO2MAX", "Tempo 30'": "THRESHOLD", "Tirada larga": "BASE"}.get(name, "RECOVERY" if dur_min < 55 else "BASE"),
                "load": load,
                "avg_speed": speed or None,
                "elevation_gain": int(rng.uniform(20, 180)) if typ != "strength_training" else None,
                "avg_power": int(rng.gauss(205, 12)) if typ == "cycling" else None,
                "cadence": int(rng.gauss(172, 3)) if typ == "running" else (int(rng.gauss(88, 3)) if typ == "cycling" else None),
                "steps": int(dur / 60 * 172) if typ == "running" else None,
                "bb_diff": -int(load / 9),
                "vo2max": round(fitness) if typ == "running" else None,
                "location": None,
                "zones_s": zones,
            })

        steps = int(_clamp(rng.gauss(8500, 2200), 3500, 16000)) + (acts[0]["steps"] or 0 if acts else 0)
        acute += (load_today - acute / 7) * 0.9
        chronic += (load_today - chronic / 7) * 0.25
        acute = max(acute, 50)
        fatigue = _clamp(fatigue * 0.78 + load_today / 520 + rng.gauss(0, 0.02) - (0.08 if deload else 0), 0.05, 0.95)
        fitness += (load_today - 60) * 0.0007

        # ---------- body battery
        bb_wake = int(_clamp(22 + sleep_score * 0.8 - fatigue * 25 + rng.gauss(0, 5), 15, 100))
        series = []
        t = datetime.combine(d, time(0, 0))
        end_of_day = datetime.now() if i == 0 else datetime.combine(d, time(23, 59))
        level = float(bb_prev_end)
        act_start = datetime.strptime(acts[0]["start"], "%Y-%m-%d %H:%M:%S") if acts else None
        act_end = act_start + timedelta(seconds=acts[0]["duration_s"]) if acts else None
        wake_today = wake
        while t <= end_of_day:
            if t < wake_today:
                level = min(bb_wake, level + (bb_wake - level) * 0.12 + 0.3)
            elif act_start and act_start <= t <= act_end:
                level -= acts[0]["load"] / 9 / max(acts[0]["duration_s"] / 900, 1)
            else:
                level -= rng.uniform(0.4, 1.0) if t.hour < 21 else 0.3
            level = _clamp(level, 5, 100)
            series.append([_ms(t), round(level)])
            t += timedelta(minutes=15)
        vals = [v for _, v in series]
        bb_prev_end = vals[-1] if i else vals[-1]

        # ---------- readiness
        sleep_f = int(_clamp(sleep_score + rng.gauss(0, 3), 0, 100))
        rec_time = int(_clamp(load_today * 0.25 + fatigue * 20, 0, 72))
        hrv_f = int(_clamp(60 + (hrv - weekly_hrv) * 3 + (weekly_hrv - 58) * 2, 5, 100))
        acwr_ratio = round(acute / max(chronic, 1), 2)
        acwr_f = int(_clamp(100 - max(0, acwr_ratio - 1.0) * 150, 5, 100))
        stress_hist = int(_clamp(rng.gauss(78, 10), 20, 100))
        sleep_hist = int(_clamp(mean_last(out, 3, lambda x: x["sleep"].get("score"), sleep_score) + rng.gauss(0, 5), 10, 100))
        readiness = int(_clamp(0.25 * sleep_f + 0.2 * (100 - rec_time * 1.3) + 0.15 * acwr_f + 0.2 * hrv_f + 0.1 * stress_hist + 0.1 * sleep_hist, 5, 100))
        r_level = "PRIME" if readiness >= 95 else "HIGH" if readiness >= 75 else "MODERATE" if readiness >= 50 else "LOW" if readiness >= 25 else "POOR"

        avg_stress = int(_clamp(rng.gauss(28 + fatigue * 12, 6), 12, 60))
        awake_day = 16 * 3600
        rest_s = int(awake_day * 0.3)
        high_s = int(awake_day * avg_stress / 600)
        med_s = int(awake_day * avg_stress / 300)
        low_s = awake_day - rest_s - high_s - med_s

        phrase = ("RECOVERY_1" if deload else
                  "OVERREACHING_1" if acwr_ratio > 1.5 else
                  "PRODUCTIVE_2" if fitness > (out[-7]["training"]["vo2max"] if len(out) > 7 else fitness) + 0.1 else
                  "MAINTAINING_1")

        out.append({
            "date": d.isoformat(),
            "sleep": {
                "score": sleep_score,
                "qualifier": "EXCELLENT" if sleep_score >= 90 else "GOOD" if sleep_score >= 80 else "FAIR" if sleep_score >= 60 else "POOR",
                "total_s": total_s, "deep_s": deep_s, "light_s": light_s, "rem_s": rem_s, "awake_s": awake_s, "nap_s": 0,
                "start_ms": _ms(bed), "end_ms": _ms(wake),
                "need_min": round(need), "need_baseline_min": 460,
                "avg_resp": resp, "avg_spo2": int(_clamp(rng.gauss(95, 1.2), 90, 99)), "lowest_spo2": int(_clamp(rng.gauss(91.5, 1.6), 85, 96)),
                "avg_hr": rhr + 5, "stress": int(_clamp(rng.gauss(14 + fatigue * 10, 4), 5, 40)),
                "awake_count": rng.randint(0, 4), "rhr": rhr, "hrv": round(hrv),
                "bb_change": bb_wake - (out[-1]["body_battery"]["series"][-1][1] if out else 35),
                "feedback": None, "insight": None,
                "subscores": {
                    "duration": "EXCELLENT" if total_h >= 7.5 else "GOOD" if total_h >= 7 else "FAIR" if total_h >= 6 else "POOR",
                    "stress": "GOOD" if fatigue < 0.5 else "FAIR",
                    "awake_count": "GOOD",
                    "rem": "GOOD", "rem_pct": round(rem_s / total_s * 100),
                    "light": "GOOD", "light_pct": round(light_s / total_s * 100),
                    "deep": "EXCELLENT" if deep_s / total_s > 0.2 else "GOOD", "deep_pct": round(deep_s / total_s * 100),
                    "restlessness": "GOOD",
                },
                "levels": _sleep_levels(bed, total_s, deep_s, rem_s, awake_s),
                "hr_series": [],
            },
            "hrv": {
                "last_night": round(hrv), "weekly_avg": round(weekly_hrv), "high_5min": round(hrv * 1.35),
                "baseline_low": 52, "baseline_high": 70, "low_upper": 45,
                "status": hrv_status, "feedback": None,
            },
            "readiness": {
                "score": readiness, "level": r_level, "feedback": None,
                "recovery_time_h": rec_time, "acute_load": round(acute),
                "factors": {"sleep": sleep_f, "recovery_time": int(_clamp(100 - rec_time * 1.3, 0, 100)), "acwr": acwr_f,
                            "hrv": hrv_f, "stress_history": stress_hist, "sleep_history": sleep_hist},
                "factor_feedback": {},
            },
            "body_battery": {
                "high": max(vals), "low": min(vals), "charged": max(0, bb_wake - (vals[0] if vals else 0)) + rng.randint(0, 5),
                "drained": max(vals) - vals[-1], "at_wake": bb_wake, "current": vals[-1], "series": series,
            },
            "stress": {"avg": avg_stress, "max": min(avg_stress + rng.randint(35, 55), 99), "rest_s": rest_s,
                       "low_s": low_s, "medium_s": med_s, "high_s": high_s, "qualifier": None},
            "heart": {"rhr": rhr, "min": rhr - 3, "max": acts[0]["max_hr"] if acts else rng.randint(115, 140),
                      "rhr_7d": round(mean_last(out, 7, lambda x: x["heart"]["rhr"], rhr))},
            "daily": {
                "steps": steps, "step_goal": 10000, "distance_m": steps * 0.78,
                "kcal_total": 1850 + (acts[0]["kcal"] if acts else 0) + int(steps * 0.04),
                "kcal_active": (acts[0]["kcal"] if acts else 0) + int(steps * 0.04),
                "intensity_moderate": int(sum(acts[0]["zones_s"][1:3]) / 60) if acts else rng.randint(0, 15),
                "intensity_vigorous": int(sum(acts[0]["zones_s"][3:]) / 60) if acts else 0,
                "intensity_goal_week": 150, "floors": rng.randint(3, 18),
                "worn_s": int(rng.uniform(21.5, 23.5) * 3600),
            },
            "respiration": {"waking": round(resp + 1.8, 1), "sleep": resp, "low": resp - 2, "high": resp + 9},
            "spo2": {"avg": int(_clamp(rng.gauss(95, 1.2), 90, 99)), "lowest": int(_clamp(rng.gauss(89, 2), 82, 95))},
            "training": {
                "status_phrase": phrase, "status_code": None, "fitness_trend": None,
                "acute": round(acute), "chronic": round(chronic),
                "chronic_min": round(chronic * 0.8), "chronic_max": round(chronic * 1.5),
                "acwr": acwr_ratio, "acwr_status": "HIGH" if acwr_ratio > 1.5 else "OPTIMAL" if acwr_ratio >= 0.8 else "LOW",
                "load_low_aerobic": int(chronic * 1.9), "load_high_aerobic": int(chronic * 1.6), "load_anaerobic": int(chronic * 0.55),
                "target_low_aerobic": [int(chronic * 1.5), int(chronic * 2.4)],
                "target_high_aerobic": [int(chronic * 1.1), int(chronic * 1.9)],
                "target_anaerobic": [int(chronic * 0.3), int(chronic * 0.9)],
                "balance_phrase": "BALANCED",
                "vo2max": round(fitness, 1), "vo2max_cycling": round(fitness - 2.5, 1),
                "heat_acclimation": rng.randint(0, 30), "altitude_acclimation": 520,
            },
            "activities": acts,
        })

    vo2 = out[-1]["training"]["vo2max"]
    five_k = 1200 * (50 / vo2) ** 1.05
    perf = {
        "race": {"5k": five_k, "10k": five_k * 2.085, "half": five_k * 4.62, "marathon": five_k * 9.75},
        "endurance": {
            "score": 6840, "classification": 4,
            "history": [[(today - timedelta(weeks=w)).isoformat(), 6300 + (12 - w) * 45 + rng.randint(-60, 60)] for w in range(12, -1, -1)],
        },
        "hill": {"score": 62, "strength": 58, "endurance": 66},
        "fitness_age": {"fitness_age": 24, "chronological": 31, "achievable": 22},
        "lactate": {"hr": 172, "speed_ms": 3.85, "ftp": 262},
        "devices": ["fēnix 8 AMOLED 47 mm (demo)"],
    }
    return out, perf


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def mean_last(items: list[dict[str, Any]], n: int, fn: Any, default: float) -> float:
    vals = [fn(x) for x in items[-n:]]
    vals = [v for v in vals if v is not None]
    return sum(vals) / len(vals) if vals else default


def demo_bp() -> list[dict[str, Any]]:
    today = date.today()
    vals = [(121, 77), (124, 79), (118, 75), (123, 78), (120, 76), (122, 78)]
    return [{"date": (today - timedelta(days=4 * i)).isoformat(), "time": "07:30", "sys": s, "dia": d, "pulse": 50 + i}
            for i, (s, d) in enumerate(vals)][::-1]


def demo_weights() -> list[dict[str, Any]]:
    today = date.today()
    return [{"date": (today - timedelta(days=7 * i)).isoformat(), "kg": round(73.4 - 0.12 * (8 - i), 1), "bmi": None, "fat_pct": 14.5, "muscle_kg": None}
            for i in range(8, -1, -1)]


def demo_detail(a: dict[str, Any]) -> dict[str, Any]:
    """Parciales, series y clima de ejemplo (mismo formato que normalizer.activity_extra)."""
    from .normalizer import _decoupling
    r = random.Random(a.get("id") or 1)
    dur = a.get("duration_s") or 1800
    typ = a.get("type") or ""
    out: dict[str, Any] = {}
    if typ == "strength_training":
        out["sets"] = [{"name": n, "sets": 3, "reps": reps, "max_kg": kg} for n, reps, kg in
                       (("Sentadilla con barra", 30, 70), ("Peso muerto rumano", 30, 60), ("Zancadas", 36, 16), ("Plancha", 3, 0))]
        out["sets_info"] = {"unknown": 0, "weighted": 9, "rest_avg_s": 105}
        return out
    base = a.get("avg_speed") or 3.2
    hard = a.get("te_label") in ("VO2MAX", "THRESHOLD")
    n = int(dur // 10)
    t = [i * 10 for i in range(n)]
    drift = r.uniform(0.02, 0.09) if not hard else 0.04
    speed, hr = [], []
    for i in range(n):
        f = i / max(n - 1, 1)
        rep = hard and (int(f * 12) % 2 == 1) and 0.15 < f < 0.85
        sp = base * (1.25 if rep else (0.85 if hard else 1.0)) * r.uniform(0.96, 1.04)
        speed.append(round(sp, 2))
        hr.append(round((a.get("avg_hr") or 145) * (0.92 + 0.08 * min(f * 5, 1)) * (1 + drift * f) * (1.06 if rep else 1)))
    out["series"] = {"t": t[::max(1, -(-n // 200))], "hr": hr[::max(1, -(-n // 200))], "speed": speed[::max(1, -(-n // 200))]}
    out["decoupling"] = _decoupling({"t": t, "hr": hr, "speed": speed}, False)
    if a.get("distance_m"):
        km = int(a["distance_m"] // 1000)
        laps = []
        for k in range(km):
            sp = base * (1 + (0.02 * (k - km / 2) / max(km, 1) if not hard else 0)) * r.uniform(0.97, 1.03)
            laps.append({"n": k + 1, "dist_m": 1000, "dur_s": round(1000 / sp), "speed": round(sp, 3), "hr": round((a.get("avg_hr") or 145) + k * 0.6),
                         "max_hr": None, "elev_gain": r.randint(0, 15), "cadence": a.get("cadence"), "power": None, "intensity": "ACTIVE"})
        out["laps"] = laps
        sp = [l["speed"] for l in laps] if len(laps) >= 3 else None
        if sp:
            m = sum(sp) / len(sp)
            out["pace_cv"] = round((sum((x - m) ** 2 for x in sp) / len(sp)) ** 0.5 / m * 100, 1)
            h = len(sp) // 2
            out["split_diff"] = round((sum(sp[-h:]) / h / (sum(sp[:h]) / h) - 1) * 100, 1)
        out["weather"] = {"temp_c": round(r.uniform(8, 29), 1), "feels_c": None, "humidity": r.randint(35, 80), "wind_kmh": r.randint(3, 20), "desc": r.choice(["Soleado", "Nublado", "Parcialmente nublado"])}
    return out
