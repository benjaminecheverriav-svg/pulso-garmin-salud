"""Índices de Recuperación, Esfuerzo y Sueño calculados a partir de los datos de Garmin.

Se basan en principios conocidos (VFC y FC en reposo frente a tu línea base, carga
cardiovascular por zonas de FC y sueño frente a necesidad de sueño).
"""
from __future__ import annotations

import math
from statistics import mean, pstdev
from typing import Any

BASELINE_DAYS = 30
STRAIN_K = 190.0  # calibra TRIMP -> escala 0-21
ZONE_WEIGHTS = [1, 2, 3, 4, 5]  # TRIMP de Edwards


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def trimp_from_zones(zones_s: list[float] | None) -> float | None:
    if not zones_s:
        return None
    return sum(w * (s / 60) for w, s in zip(ZONE_WEIGHTS, zones_s))


def activity_trimp(a: dict[str, Any]) -> float:
    t = trimp_from_zones(a.get("zones_s"))
    if t is None:  # sin zonas: la carga de entrenamiento de Garmin está en una escala similar
        t = a.get("load") or 0
    return float(t)


def strain_from_trimp(trimp: float) -> float:
    return round(21 * (1 - math.exp(-max(trimp, 0) / STRAIN_K)), 1)


def _baseline(values: list[float], floor: float) -> tuple[float, float] | None:
    vals = [v for v in values if v is not None]
    if len(vals) < 4:
        return None
    return mean(vals), max(pstdev(vals), floor)


def _zone(v: float) -> str:
    return "green" if v >= 67 else ("yellow" if v >= 34 else "red")


def strain_target(recovery: float | None) -> list[float]:
    if recovery is None:
        return [10, 14]
    if recovery >= 67:
        return [14, 18]
    if recovery >= 34:
        return [10, 14]
    return [5, 10]


def enrich(days: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Añade el bloque 'whoop' a cada día (lista ordenada por fecha)."""
    days = sorted(days, key=lambda d: d["date"])
    prev_strain = None
    prev_need = prev_sleep_min = None
    for i, d in enumerate(days):
        window = days[max(0, i - BASELINE_DAYS):i]
        sleep = d.get("sleep") or {}
        hrv = (d.get("hrv") or {}).get("last_night") or sleep.get("hrv")
        rhr = sleep.get("rhr") or (d.get("heart") or {}).get("rhr")
        resp = sleep.get("avg_resp") or (d.get("respiration") or {}).get("sleep")

        # --- Strain del día
        acts = d.get("activities") or []
        act_trimp = 0.0
        act_steps = 0
        for a in acts:
            t = activity_trimp(a)
            a["whoop_strain"] = strain_from_trimp(t)
            act_trimp += t
            act_steps += a.get("steps") or 0
        steps = (d.get("daily") or {}).get("steps") or 0
        base_trimp = 40 + max(steps - act_steps, 0) / 1000 * 4 if steps else 0
        day_trimp = act_trimp + base_trimp
        strain = strain_from_trimp(day_trimp) if (steps or acts) else None

        # --- Necesidad y rendimiento del sueño
        need = sleep.get("need_min")
        if not need:
            need = 450.0
            if prev_strain:
                need += prev_strain / 21 * 50
            if prev_need and prev_sleep_min:
                need += _clamp((prev_need - prev_sleep_min) * 0.5, 0, 60)
        sleep_min = (sleep.get("total_s") or 0) / 60 if sleep else None
        sleep_perf = round(_clamp(sleep_min / need * 100, 0, 100)) if sleep_min else None
        debt = max(0.0, prev_need - prev_sleep_min) if prev_need and prev_sleep_min else 0.0

        # --- Recuperación
        recovery = None
        contrib: dict[str, Any] = {}
        b_hrv = _baseline([math.log(x) for x in ((w.get("hrv") or {}).get("last_night") or (w.get("sleep") or {}).get("hrv") for w in window) if x], 0.06)
        b_rhr = _baseline([(w.get("sleep") or {}).get("rhr") or (w.get("heart") or {}).get("rhr") for w in window], 1.5)
        b_resp = _baseline([(w.get("sleep") or {}).get("avg_resp") for w in window], 0.4)
        if hrv and b_hrv:
            z_hrv = (math.log(hrv) - b_hrv[0]) / b_hrv[1]
            hrv_score = _clamp(50 + 30 * z_hrv, 0, 100)
            rhr_score = 50.0
            z_rhr = None
            if rhr and b_rhr:
                z_rhr = (rhr - b_rhr[0]) / b_rhr[1]
                rhr_score = _clamp(50 - 30 * z_rhr, 0, 100)
            z_resp = (resp - b_resp[0]) / b_resp[1] if resp and b_resp else None
            resp_pen = 8 * max(0.0, z_resp - 1) if z_resp is not None else 0
            sp = sleep_perf if sleep_perf is not None else 70
            recovery = round(_clamp(0.5 * hrv_score + 0.2 * rhr_score + 0.3 * sp - resp_pen, 1, 99))
            contrib = {
                "hrv": {"value": hrv, "baseline": round(math.exp(b_hrv[0])), "z": round(z_hrv, 2), "score": round(hrv_score)},
                "rhr": {"value": rhr, "baseline": round(b_rhr[0], 1) if b_rhr else None,
                        "z": round(z_rhr, 2) if z_rhr is not None else None, "score": round(rhr_score)},
                "resp": {"value": resp, "baseline": round(b_resp[0], 1) if b_resp else None,
                         "z": round(z_resp, 2) if z_resp is not None else None},
                "sleep": {"value": sleep_perf},
            }

        d["whoop"] = {
            "recovery": recovery,
            "recovery_zone": _zone(recovery) if recovery is not None else None,
            "strain": strain,
            "strain_target": strain_target(recovery),
            "trimp": round(day_trimp),
            "sleep_performance": sleep_perf,
            "sleep_need_min": round(need),
            "sleep_debt_min": round(debt),
            "contributors": contrib,
        }
        prev_strain = strain
        prev_need, prev_sleep_min = need, sleep_min

    _sleep_consistency(days)
    _fill_load(days)
    return days


def _sleep_consistency(days: list[dict[str, Any]]) -> None:
    """Consistencia del sueño: variación de hora de acostarse/levantarse (últimos 4 días)."""
    def minute_of_day(ms: int | None, shift: int) -> float | None:
        if not ms:
            return None
        m = (ms / 60000) % 1440
        return (m + shift) % 1440  # shift evita el salto de medianoche

    for i, d in enumerate(days):
        win = days[max(0, i - 3):i + 1]
        starts = [minute_of_day((w.get("sleep") or {}).get("start_ms"), 720) for w in win]
        ends = [minute_of_day((w.get("sleep") or {}).get("end_ms"), 0) for w in win]
        starts = [s for s in starts if s is not None]
        ends = [e for e in ends if e is not None]
        if len(starts) >= 3 and len(ends) >= 3:
            spread = (pstdev(starts) + pstdev(ends)) / 2
            d["whoop"]["sleep_consistency"] = round(_clamp(100 - spread * 0.9, 0, 100))
        else:
            d["whoop"]["sleep_consistency"] = None


def _fill_load(days: list[dict[str, Any]]) -> None:
    """Si Garmin no dio carga aguda/crónica, la calculamos (EWMA 7 y 28 días)."""
    acute = chronic = None
    a7, a28 = 2 / (7 + 1), 2 / (28 + 1)
    for i, d in enumerate(days):
        load = sum((a.get("load") or 0) for a in d.get("activities") or [])
        acute = load if acute is None else acute + a7 * (load - acute)
        chronic = load if chronic is None else chronic + a28 * (load - chronic)
        t = d.setdefault("training", {})
        d["daily_load"] = round(load)
        if t.get("acute") is None and i >= 20:  # con menos de 3 semanas el ratio no es fiable
            t["acute_est"] = round(acute * 7)
            t["chronic_est"] = round(chronic * 7)
