"""Convierte las respuestas crudas de Garmin Connect en un registro diario limpio.

Garmin cambia sus JSON con frecuencia, así que todo el acceso es defensivo:
si un campo no existe, queda en None y la interfaz lo muestra como "—".
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def g(obj: Any, *path: Any, default: Any = None) -> Any:
    """Acceso seguro a estructuras anidadas: g(d, "a", 0, "b")."""
    cur = obj
    for key in path:
        if cur is None:
            return default
        try:
            cur = cur[key]
        except (KeyError, IndexError, TypeError):
            return default
    return default if cur is None else cur


def _gmt_ms(s: str | None) -> int | None:
    """'2024-05-01T22:31:00.0' (GMT) -> epoch ms."""
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "")[:19])
        return int(dt.replace(tzinfo=timezone.utc).timestamp() * 1000)
    except ValueError:
        return None


def _primary(device_map: Any) -> dict[str, Any]:
    """Garmin agrupa algunos datos por dispositivo; elige el principal."""
    if not isinstance(device_map, dict) or not device_map:
        return {}
    values = [v for v in device_map.values() if isinstance(v, dict)]
    for v in values:
        if v.get("primaryTrainingDevice"):
            return v
    return values[0] if values else {}


STAGES = {0: "deep", 1: "light", 2: "rem", 3: "awake"}


def sleep_block(raw: Any) -> dict[str, Any]:
    dto = g(raw, "dailySleepDTO", default={})
    scores = g(dto, "sleepScores", default={})
    levels = []
    for lv in g(raw, "sleepLevels", default=[]) or []:
        start, end = _gmt_ms(lv.get("startGMT")), _gmt_ms(lv.get("endGMT"))
        stage = STAGES.get(int(lv.get("activityLevel", -1)) if lv.get("activityLevel") is not None else -1)
        if start and end and stage:
            levels.append({"start": start, "end": end, "stage": stage})
    hr_series = [
        [p.get("startGMT"), p.get("value")]
        for p in g(raw, "sleepHeartRate", default=[]) or []
        if isinstance(p, dict) and p.get("value")
    ]
    total = g(dto, "sleepTimeSeconds")
    if not total:
        return {}
    return {
        "score": g(scores, "overall", "value"),
        "qualifier": g(scores, "overall", "qualifierKey"),
        "total_s": total,
        "deep_s": g(dto, "deepSleepSeconds"),
        "light_s": g(dto, "lightSleepSeconds"),
        "rem_s": g(dto, "remSleepSeconds"),
        "awake_s": g(dto, "awakeSleepSeconds"),
        "nap_s": g(dto, "napTimeSeconds"),
        "start_ms": g(dto, "sleepStartTimestampGMT"),
        "end_ms": g(dto, "sleepEndTimestampGMT"),
        "need_min": g(dto, "sleepNeed", "actual"),
        "need_baseline_min": g(dto, "sleepNeed", "baseline"),
        "avg_resp": g(dto, "averageRespirationValue"),
        "avg_spo2": g(dto, "averageSpO2Value"),
        "lowest_spo2": g(dto, "lowestSpO2Value"),
        "avg_hr": g(dto, "avgHeartRate"),
        "stress": g(dto, "avgSleepStress"),
        "awake_count": g(dto, "awakeCount"),
        "rhr": g(raw, "restingHeartRate"),
        "hrv": g(raw, "avgOvernightHrv"),
        "bb_change": g(raw, "bodyBatteryChange"),
        "feedback": g(dto, "sleepScoreFeedback"),
        "insight": g(dto, "sleepScoreInsight"),
        "subscores": {
            "duration": g(scores, "totalDuration", "qualifierKey"),
            "stress": g(scores, "stress", "qualifierKey"),
            "awake_count": g(scores, "awakeCount", "qualifierKey"),
            "rem": g(scores, "remPercentage", "qualifierKey"),
            "rem_pct": g(scores, "remPercentage", "value"),
            "light": g(scores, "lightPercentage", "qualifierKey"),
            "light_pct": g(scores, "lightPercentage", "value"),
            "deep": g(scores, "deepPercentage", "qualifierKey"),
            "deep_pct": g(scores, "deepPercentage", "value"),
            "restlessness": g(scores, "restlessness", "qualifierKey"),
        },
        "levels": levels,
        "hr_series": hr_series,
    }


def hrv_block(raw: Any, sleep: dict[str, Any]) -> dict[str, Any]:
    s = g(raw, "hrvSummary", default={})
    last = g(s, "lastNightAvg") or sleep.get("hrv")
    if not last:
        return {}
    return {
        "last_night": last,
        "weekly_avg": g(s, "weeklyAvg"),
        "high_5min": g(s, "lastNight5MinHigh"),
        "baseline_low": g(s, "baseline", "balancedLow"),
        "baseline_high": g(s, "baseline", "balancedUpper"),
        "low_upper": g(s, "baseline", "lowUpper"),
        "status": g(s, "status"),
        "feedback": g(s, "feedbackPhrase"),
    }


def readiness_block(raw: Any) -> dict[str, Any]:
    items = raw if isinstance(raw, list) else ([raw] if isinstance(raw, dict) else [])
    items = [i for i in items if isinstance(i, dict) and i.get("score") is not None]
    if not items:
        return {}
    r = max(items, key=lambda i: str(i.get("timestamp") or i.get("timestampLocal") or ""))
    rec = r.get("recoveryTime")
    return {
        "score": r.get("score"),
        "level": r.get("level"),
        "feedback": r.get("feedbackShort"),
        "recovery_time_h": round(rec / 60, 1) if isinstance(rec, (int, float)) else None,
        "acute_load": r.get("acuteLoad"),
        "factors": {
            "sleep": r.get("sleepScoreFactorPercent"),
            "recovery_time": r.get("recoveryTimeFactorPercent"),
            "acwr": r.get("acwrFactorPercent"),
            "hrv": r.get("hrvFactorPercent"),
            "stress_history": r.get("stressHistoryFactorPercent"),
            "sleep_history": r.get("sleepHistoryFactorPercent"),
        },
        "factor_feedback": {
            "sleep": r.get("sleepScoreFactorFeedback"),
            "recovery_time": r.get("recoveryTimeFactorFeedback"),
            "acwr": r.get("acwrFactorFeedback"),
            "hrv": r.get("hrvFactorFeedback"),
            "stress_history": r.get("stressHistoryFactorFeedback"),
            "sleep_history": r.get("sleepHistoryFactorFeedback"),
        },
    }


def body_battery_block(raw: Any, summary: Any) -> dict[str, Any]:
    entry = raw[0] if isinstance(raw, list) and raw else (raw if isinstance(raw, dict) else {})
    series = []
    descr = {d.get("bodyBatteryValueDescriptorKey"): d.get("bodyBatteryValueDescriptorIndex")
             for d in g(entry, "bodyBatteryValueDescriptorDTOList", default=[]) or []}
    ts_i = descr.get("timestamp", 0)
    lv_i = descr.get("bodyBatteryLevel")
    for row in g(entry, "bodyBatteryValuesArray", default=[]) or []:
        if not isinstance(row, list) or len(row) < 2:
            continue
        val = row[lv_i] if lv_i is not None and lv_i < len(row) else row[-1]
        if lv_i is None:  # sin descriptor: último valor numérico razonable
            nums = [v for v in row[1:] if isinstance(v, (int, float)) and 0 <= v <= 100]
            val = nums[0] if nums else None
        if isinstance(val, (int, float)):
            series.append([row[ts_i], val])
    out = {
        "high": g(summary, "bodyBatteryHighestValue"),
        "low": g(summary, "bodyBatteryLowestValue"),
        "charged": g(summary, "bodyBatteryChargedValue") or g(entry, "charged"),
        "drained": g(summary, "bodyBatteryDrainedValue") or g(entry, "drained"),
        "at_wake": g(summary, "bodyBatteryAtWakeTime"),
        "current": g(summary, "bodyBatteryMostRecentValue"),
        "series": series,
    }
    if out["high"] is None and series:
        vals = [v for _, v in series]
        out.update(high=max(vals), low=min(vals), current=vals[-1])
    return out if out["high"] is not None else {}


def activity_block(a: dict[str, Any]) -> dict[str, Any]:
    zones = [a.get(f"hrTimeInZone_{i}") or 0 for i in range(1, 6)]
    return {
        "id": a.get("activityId"),
        "name": a.get("activityName"),
        "type": g(a, "activityType", "typeKey", default="other"),
        "start": a.get("startTimeLocal"),
        "duration_s": a.get("duration"),
        "moving_s": a.get("movingDuration"),
        "distance_m": a.get("distance"),
        "avg_hr": a.get("averageHR"),
        "max_hr": a.get("maxHR"),
        "kcal": a.get("calories"),
        "te_aerobic": a.get("aerobicTrainingEffect"),
        "te_anaerobic": a.get("anaerobicTrainingEffect"),
        "te_label": a.get("trainingEffectLabel"),
        "load": a.get("activityTrainingLoad"),
        "avg_speed": a.get("averageSpeed"),
        "elevation_gain": a.get("elevationGain"),
        "avg_power": a.get("avgPower"),
        "cadence": a.get("averageRunningCadenceInStepsPerMinute") or a.get("averageBikingCadenceInRevPerMinute"),
        "steps": a.get("steps"),
        "bb_diff": a.get("differenceBodyBattery"),
        "vo2max": a.get("vO2MaxValue"),
        "location": a.get("locationName"),
        "zones_s": zones if any(zones) else None,
    }


def training_block(raw: Any) -> dict[str, Any]:
    st = _primary(g(raw, "mostRecentTrainingStatus", "latestTrainingStatusData"))
    lb = _primary(g(raw, "mostRecentTrainingLoadBalance", "metricsTrainingLoadBalanceDTOMap"))
    acute = g(st, "acuteTrainingLoadDTO", default={})
    vo2 = g(raw, "mostRecentVO2Max", default={})
    out = {
        "status_phrase": g(st, "trainingStatusFeedbackPhrase"),
        "status_code": g(st, "trainingStatus"),
        "fitness_trend": g(st, "fitnessTrend"),
        "acute": g(acute, "dailyTrainingLoadAcute"),
        "chronic": g(acute, "dailyTrainingLoadChronic"),
        "chronic_min": g(acute, "minTrainingLoadChronic"),
        "chronic_max": g(acute, "maxTrainingLoadChronic"),
        "acwr": g(acute, "dailyAcuteChronicWorkloadRatio"),
        "acwr_status": g(acute, "acwrStatus"),
        "load_low_aerobic": g(lb, "monthlyLoadAerobicLow"),
        "load_high_aerobic": g(lb, "monthlyLoadAerobicHigh"),
        "load_anaerobic": g(lb, "monthlyLoadAnaerobic"),
        "target_low_aerobic": [g(lb, "monthlyLoadAerobicLowTargetMin"), g(lb, "monthlyLoadAerobicLowTargetMax")],
        "target_high_aerobic": [g(lb, "monthlyLoadAerobicHighTargetMin"), g(lb, "monthlyLoadAerobicHighTargetMax")],
        "target_anaerobic": [g(lb, "monthlyLoadAnaerobicTargetMin"), g(lb, "monthlyLoadAnaerobicTargetMax")],
        "balance_phrase": g(lb, "trainingBalanceFeedbackPhrase"),
        "vo2max": g(vo2, "generic", "vo2MaxPreciseValue") or g(vo2, "generic", "vo2MaxValue"),
        "vo2max_cycling": g(vo2, "cycling", "vo2MaxPreciseValue") or g(vo2, "cycling", "vo2MaxValue"),
        "heat_acclimation": g(vo2, "heatAltitudeAcclimation", "heatAcclimationPercentage"),
        "altitude_acclimation": g(vo2, "heatAltitudeAcclimation", "altitudeAcclimation"),
    }
    return out if any(v for k, v in out.items() if not k.startswith("target")) else {}


def normalize_day(date: str, raw: dict[str, Any]) -> dict[str, Any]:
    summ = raw.get("summary") or {}
    sleep = sleep_block(raw.get("sleep"))
    resp = raw.get("respiration") or {}
    acts = [activity_block(a) for a in (raw.get("activities") or []) if isinstance(a, dict)]
    return {
        "date": date,
        "sleep": sleep,
        "hrv": hrv_block(raw.get("hrv"), sleep),
        "readiness": readiness_block(raw.get("readiness")),
        "body_battery": body_battery_block(raw.get("body_battery"), summ),
        "stress": {
            "avg": summ.get("averageStressLevel"),
            "max": summ.get("maxStressLevel"),
            "rest_s": summ.get("restStressDuration"),
            "low_s": summ.get("lowStressDuration"),
            "medium_s": summ.get("mediumStressDuration"),
            "high_s": summ.get("highStressDuration"),
            "qualifier": summ.get("stressQualifier"),
        },
        "heart": {
            "rhr": summ.get("restingHeartRate") or sleep.get("rhr"),
            "min": summ.get("minHeartRate"),
            "max": summ.get("maxHeartRate"),
            "rhr_7d": summ.get("lastSevenDaysAvgRestingHeartRate"),
        },
        "daily": {
            "steps": summ.get("totalSteps"),
            "step_goal": summ.get("dailyStepGoal"),
            "distance_m": summ.get("totalDistanceMeters"),
            "kcal_total": summ.get("totalKilocalories"),
            "kcal_active": summ.get("activeKilocalories"),
            "intensity_moderate": summ.get("moderateIntensityMinutes"),
            "intensity_vigorous": summ.get("vigorousIntensityMinutes"),
            "intensity_goal_week": summ.get("intensityMinutesGoal"),
            "floors": summ.get("floorsAscended"),
            "worn_s": sum(summ.get(k) or 0 for k in ("sleepingSeconds", "sedentarySeconds", "activeSeconds", "highlyActiveSeconds")) or None,
        },
        "respiration": {
            "waking": resp.get("avgWakingRespirationValue") or summ.get("avgWakingRespirationValue"),
            "sleep": resp.get("avgSleepRespirationValue") or sleep.get("avg_resp"),
            "low": resp.get("lowestRespirationValue"),
            "high": resp.get("highestRespirationValue"),
        },
        "spo2": {
            "avg": summ.get("averageSpo2") or sleep.get("avg_spo2"),
            "lowest": summ.get("lowestSpo2") or sleep.get("lowest_spo2"),
        },
        "training": training_block(raw.get("training_status")),
        "activities": acts,
    }


def normalize_performance(raw: dict[str, Any] | None) -> dict[str, Any]:
    raw = raw or {}
    rp = raw.get("race_predictions")
    if isinstance(rp, list):
        rp = rp[-1] if rp else {}
    es = raw.get("endurance_score") or {}
    hs = raw.get("hill_score") or {}
    fa = raw.get("fitness_age") or {}
    mm = raw.get("max_metrics")
    mm = mm[0] if isinstance(mm, list) and mm else (mm or {})
    lt = raw.get("lactate_threshold") or {}
    lt_speed = g(lt, "speed_and_heart_rate", "speed")
    if isinstance(lt_speed, (int, float)) and lt_speed < 1:
        lt_speed *= 10  # Garmin lo entrega en décimas de m/s
    hist = []
    for d, grp in sorted((g(raw, "endurance_history", "groupMap", default={}) or {}).items()):
        if isinstance(grp, dict) and grp.get("groupAverage"):
            hist.append([d, grp.get("groupAverage")])
    devices = raw.get("devices") or []
    return {
        "race": {
            "5k": g(rp, "time5K"),
            "10k": g(rp, "time10K"),
            "half": g(rp, "timeHalfMarathon"),
            "marathon": g(rp, "timeMarathon"),
        },
        "endurance": {"score": g(es, "overallScore"), "classification": g(es, "classification"), "history": hist},
        "hill": {"score": g(hs, "overallScore"), "strength": g(hs, "strengthScore"), "endurance": g(hs, "enduranceScore")},
        "fitness_age": {
            "fitness_age": g(fa, "fitnessAge") or g(mm, "generic", "fitnessAge"),
            "chronological": g(fa, "chronologicalAge"),
            "achievable": g(fa, "achievableFitnessAge"),
        },
        "lactate": {
            "hr": g(lt, "speed_and_heart_rate", "heartRate"),
            "speed_ms": lt_speed,
            "ftp": g(lt, "power", "functionalThresholdPower"),
        },
        "devices": [d.get("productDisplayName") or d.get("displayName") for d in devices if isinstance(d, dict)],
    }


def _walk(obj: Any):
    """Recorre cualquier estructura y entrega todos los dicts que contiene."""
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from _walk(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _walk(v)


def normalize_user(raw: Any) -> dict[str, Any]:
    """Perfil de Garmin (sexo, edad, peso, altura, umbrales)."""
    ud = g(raw, "userData", default={}) or {}
    birth = ud.get("birthDate")
    age = None
    if birth:
        try:
            b = datetime.fromisoformat(birth[:10])
            now = datetime.now()
            age = now.year - b.year - ((now.month, now.day) < (b.month, b.day))
        except ValueError:
            pass
    gender = (ud.get("gender") or "").upper()
    weight = ud.get("weight")
    return {
        "sex": "M" if gender == "MALE" else ("F" if gender == "FEMALE" else None),
        "birth_date": birth,
        "age": age,
        "height_cm": ud.get("height"),
        "weight_kg": round(weight / 1000, 1) if isinstance(weight, (int, float)) and weight > 500 else weight,
        "lthr": ud.get("lactateThresholdHeartRate"),
        "lt_speed": ud.get("lactateThresholdSpeed"),
        "vo2max_running": ud.get("vo2MaxRunning"),
        "vo2max_cycling": ud.get("vo2MaxCycling"),
        "activity_level": ud.get("activityLevel"),
    }


def normalize_bp(raw: Any) -> list[dict[str, Any]]:
    out = []
    for d in _walk(raw):
        if d.get("systolic") and d.get("diastolic"):
            ts = d.get("measurementTimestampLocal") or d.get("measurementTimestampGMT") or d.get("calendarDate") or ""
            out.append({"date": str(ts)[:10], "time": str(ts)[11:16], "sys": d["systolic"], "dia": d["diastolic"], "pulse": d.get("pulse")})
    out.sort(key=lambda x: (x["date"], x["time"]))
    return out


def normalize_weights(raw: Any) -> list[dict[str, Any]]:
    out = []
    for d in g(raw, "dateWeightList", default=[]) or []:
        w = d.get("weight")
        if not w:
            continue
        date = d.get("calendarDate")
        if not date and isinstance(d.get("date"), (int, float)):
            date = datetime.fromtimestamp(d["date"] / 1000).date().isoformat()
        out.append({"date": date, "kg": round(w / 1000, 1) if w > 500 else w, "bmi": d.get("bmi"),
                    "fat_pct": d.get("bodyFat"), "muscle_kg": round(d["muscleMass"] / 1000, 1) if d.get("muscleMass") else None})
    out.sort(key=lambda x: x["date"] or "")
    return out


# ============================================================ detalle de actividad
def _series_from_details(raw: Any) -> dict[str, list]:
    """Convierte metricDescriptors + activityDetailMetrics en columnas por nombre."""
    desc = {m.get("key"): m.get("metricsIndex") for m in g(raw, "metricDescriptors", default=[]) or [] if isinstance(m, dict)}
    rows = [r.get("metrics") for r in g(raw, "activityDetailMetrics", default=[]) or [] if isinstance(r, dict)]
    cols: dict[str, list] = {}
    for name, key in (("t", "sumDuration"), ("hr", "directHeartRate"), ("speed", "directSpeed"), ("elev", "directElevation"),
                      ("power", "directPower"), ("dist", "sumDistance"), ("ts", "directTimestamp")):
        idx = desc.get(key)
        if idx is not None:
            cols[name] = [r[idx] if r and idx < len(r) else None for r in rows]
    if "t" not in cols and "ts" in cols and cols["ts"] and cols["ts"][0]:
        t0 = cols["ts"][0]
        cols["t"] = [(x - t0) / 1000 if x else None for x in cols["ts"]]
    return cols


def _decoupling(cols: dict[str, list], use_power: bool) -> float | None:
    """Desacople aeróbico (Pa:HR): pérdida de eficiencia entre la 1.ª y la 2.ª mitad."""
    out_key = "power" if use_power else "speed"
    pts = [(t, h, o) for t, h, o in zip(cols.get("t", []), cols.get("hr", []), cols.get(out_key, []))
           if t is not None and h and o and h > 60 and o > (20 if use_power else 1.0)]
    if len(pts) < 40:
        return None
    pts = pts[len(pts) // 10:]  # descarta el calentamiento
    mid = pts[0][0] + (pts[-1][0] - pts[0][0]) / 2
    a = [p for p in pts if p[0] < mid]
    b = [p for p in pts if p[0] >= mid]
    if len(a) < 10 or len(b) < 10:
        return None
    ef1 = (sum(p[2] for p in a) / len(a)) / (sum(p[1] for p in a) / len(a))
    ef2 = (sum(p[2] for p in b) / len(b)) / (sum(p[1] for p in b) / len(b))
    return round((ef1 - ef2) / ef1 * 100, 1)


def activity_extra(raw: dict[str, Any] | None, act_type: str = "") -> dict[str, Any]:
    if not raw:
        return {}
    out: dict[str, Any] = {}
    laps = []
    for i, lap in enumerate(g(raw, "splits", "lapDTOs", default=[]) or []):
        if not isinstance(lap, dict):
            continue
        laps.append({
            "n": i + 1, "dist_m": lap.get("distance"), "dur_s": lap.get("duration") or lap.get("movingDuration"),
            "speed": lap.get("averageMovingSpeed") or lap.get("averageSpeed"), "hr": lap.get("averageHR"), "max_hr": lap.get("maxHR"),
            "elev_gain": lap.get("elevationGain"), "cadence": lap.get("averageRunCadence") or lap.get("averageBikeCadence"),
            "power": lap.get("averagePower"), "intensity": lap.get("intensityType"),
        })
    if laps:
        out["laps"] = laps
        full = [l for l in laps if l["speed"] and (l["dist_m"] or 0) >= 800]
        active = [l for l in full if (l["intensity"] or "ACTIVE") in ("ACTIVE", "INTERVAL")]
        if len(active) >= 3:
            sp = [l["speed"] for l in active]
            m = sum(sp) / len(sp)
            out["pace_cv"] = round((sum((x - m) ** 2 for x in sp) / len(sp)) ** 0.5 / m * 100, 1)
            half = len(active) // 2
            s1 = sum(l["speed"] for l in active[:half]) / half
            s2 = sum(l["speed"] for l in active[-half:]) / half
            out["split_diff"] = round((s2 / s1 - 1) * 100, 1)  # >0: segunda mitad más rápida (parcial negativo)
    cols = _series_from_details(raw.get("details"))
    if cols.get("t"):
        use_power = "cycling" in act_type or "biking" in act_type or "ride" in act_type
        use_power = use_power and any(cols.get("power") or [])
        out["decoupling"] = _decoupling(cols, use_power)
        n = len(cols["t"])
        step = max(1, -(-n // 200))
        out["series"] = {k: [v[i] for i in range(0, n, step)] for k, v in cols.items() if k in ("t", "hr", "speed", "elev", "power")}
    w = raw.get("weather") or {}
    if isinstance(w, dict) and w.get("temp") is not None:
        f2c = lambda f: round((f - 32) * 5 / 9, 1) if isinstance(f, (int, float)) else None
        out["weather"] = {
            "temp_c": f2c(w.get("temp")), "feels_c": f2c(w.get("apparentTemp")), "humidity": w.get("relativeHumidity"),
            "wind_kmh": round(w["windSpeed"] * 1.609) if isinstance(w.get("windSpeed"), (int, float)) else None,
            "desc": g(w, "weatherTypeDTO", "desc"),
        }
    sets: dict[str, dict[str, Any]] = {}
    rests, unknown, weighted = [], 0, 0
    for st in g(raw, "sets", "exerciseSets", default=[]) or []:
        if not isinstance(st, dict):
            continue
        if st.get("setType") == "REST":
            if st.get("duration"):
                rests.append(st["duration"])
            continue
        if st.get("setType") != "ACTIVE":
            continue
        ex = (st.get("exercises") or [{}])[0] or {}
        name = exercise_name(ex.get("name"), ex.get("category"))
        if name == "Sin identificar":
            unknown += 1
        e = sets.setdefault(name, {"name": name, "sets": 0, "reps": 0, "max_kg": 0})
        e["sets"] += 1
        e["reps"] += st.get("repetitionCount") or 0
        wkg = (st.get("weight") or 0) / 1000 if (st.get("weight") or 0) > 500 else (st.get("weight") or 0)
        if wkg:
            weighted += 1
        e["max_kg"] = max(e["max_kg"], round(wkg, 1))
    if sets:
        out["sets"] = sorted(sets.values(), key=lambda x: (x["name"] == "Sin identificar", -x["sets"]))
        out["sets_info"] = {"unknown": unknown, "weighted": weighted,
                            "rest_avg_s": round(sum(rests[:-1]) / len(rests[:-1])) if len(rests) > 1 else None}
    return out


EXERCISES = {
    "LAT_PULLDOWN": "Jalón al pecho", "PULL_UP": "Dominadas", "CHIN_UP": "Dominadas supinas", "SEATED_CABLE_ROW": "Remo en polea sentado",
    "BENT_OVER_ROW": "Remo inclinado", "DUMBBELL_ROW": "Remo con mancuerna", "ROW": "Remo", "TRICEPS_PRESSDOWN": "Extensión de tríceps en polea",
    "TRICEPS_EXTENSION": "Extensión de tríceps", "BICEPS_CURL": "Curl de bíceps", "CURL": "Curl", "HAMMER_CURL": "Curl martillo",
    "BENCH_PRESS": "Press de banca", "BARBELL_BENCH_PRESS": "Press de banca con barra", "DUMBBELL_BENCH_PRESS": "Press de banca con mancuernas",
    "INCLINE_BENCH_PRESS": "Press inclinado", "SHOULDER_PRESS": "Press de hombros", "OVERHEAD_PRESS": "Press militar", "LATERAL_RAISE": "Elevaciones laterales",
    "SQUAT": "Sentadilla", "BARBELL_BACK_SQUAT": "Sentadilla con barra", "GOBLET_SQUAT": "Sentadilla goblet", "LEG_PRESS": "Prensa de piernas",
    "DEADLIFT": "Peso muerto", "ROMANIAN_DEADLIFT": "Peso muerto rumano", "LUNGE": "Zancadas", "WALKING_LUNGE": "Zancadas caminando",
    "LEG_CURL": "Curl femoral", "LEG_EXTENSION": "Extensión de cuádriceps", "CALF_RAISE": "Elevación de gemelos", "HIP_RAISE": "Puente de glúteo",
    "HIP_THRUST": "Hip thrust", "PLANK": "Plancha", "CRUNCH": "Abdominales", "SIT_UP": "Abdominales", "PUSH_UP": "Flexiones",
    "CHEST_FLY": "Aperturas de pecho", "DIP": "Fondos", "SHRUG": "Encogimientos de hombros", "FACE_PULL": "Face pull",
    "CARRY": "Paseo del granjero", "OLYMPIC_LIFT": "Levantamiento olímpico", "CORE": "Core", "CARDIO": "Cardio",
}


def exercise_name(name: str | None, category: str | None) -> str:
    for key in (name, category):
        if key and key != "UNKNOWN":
            return EXERCISES.get(key) or key.replace("_", " ").capitalize()
    return "Sin identificar"
