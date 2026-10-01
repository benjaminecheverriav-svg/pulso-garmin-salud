"""Consejos para configurar y aprovechar mejor el fēnix 8 según tus datos reales.

Las rutas de menú son las del fēnix 8 con software reciente; pueden variar
ligeramente según la versión (en el reloj: mantén pulsado MENU > Ajustes).
"""
from __future__ import annotations

from statistics import mean
from typing import Any

from .coach import act_group, is_hard


def tip(cat: str, prio: str, title: str, why: str, how: str) -> dict[str, str]:
    return {"category": cat, "priority": prio, "title": title, "why": why, "how": how}


def usage(days: list[dict]) -> dict[str, Any]:
    d30 = days[-30:]
    n = len(d30) or 1
    worn = [d["daily"].get("worn_s") for d in d30 if d["daily"].get("worn_s")]
    acts = [a for d in days[-56:] for a in d["activities"]]
    groups: dict[str, int] = {}
    for a in acts:
        g = act_group(a.get("type"))
        groups[g] = groups.get(g, 0) + 1
    return {
        "sleep_nights": sum(1 for d in d30 if (d.get("sleep") or {}).get("total_s")) / n,
        "hrv_nights": sum(1 for d in d30 if (d.get("hrv") or {}).get("last_night")) / n,
        "spo2_nights": sum(1 for d in d30 if (d.get("sleep") or {}).get("avg_spo2")) / n,
        "wear_h": mean(worn) / 3600 if worn else None,
        "acts_week": len(acts) / 8,
        "groups": groups,
        "with_zones": sum(1 for a in acts if a.get("zones_s")) / len(acts) if acts else None,
        "runs_with_power": sum(1 for a in acts if act_group(a.get("type")) == "running" and a.get("avg_power")),
        "rides_with_power": sum(1 for a in acts if act_group(a.get("type")) == "cycling" and a.get("avg_power")),
        "hard_sessions": sum(1 for a in acts if is_hard(a)),
    }


def build(days: list[dict], perf: dict, prof: dict, health: dict) -> dict[str, Any]:
    if not days:
        return {"usage": {}, "tips": []}
    u = usage(days)
    g = u["groups"]
    runs, rides = g.get("running", 0), g.get("cycling", 0)
    tips: list[dict] = []
    goal = prof.get("goal") or "salud"

    # ---------------- uso 24/7 y sueño
    if u["sleep_nights"] < 0.85:
        tips.append(tip("Sueño", "alta", "Duerme con el reloj todas las noches",
                        f"Solo el {u['sleep_nights']:.0%} de las noches tiene sueño registrado. Sin ellas no hay VFC, disposición para entrenar ni Body Battery fiable.",
                        "Carga el reloj mientras te duchas o desayunas (15–20 min dan para casi un día). Programa el horario de sueño en Ajustes > Salud y bienestar > Sueño para que active el modo sueño automáticamente."))
    if u["hrv_nights"] < 0.8:
        tips.append(tip("Recuperación", "alta", "Consigue un estado de VFC estable",
                        f"Solo el {u['hrv_nights']:.0%} de las noches tiene VFC. Garmin necesita ~3 semanas de noches seguidas para fijar tu línea base.",
                        "Lleva el reloj ajustado (un dedo por encima del hueso de la muñeca) al dormir y evita quitártelo por la noche."))
    if u["spo2_nights"] < 0.5:
        tips.append(tip("Salud", "alta", "Activa el pulsioxímetro durante el sueño",
                        "Sin datos de oxígeno nocturno no podemos detectar señales de apnea del sueño, un factor clave de hipertensión y ACV.",
                        "Ajustes > Salud y bienestar > Pulsioxímetro > Durante el sueño. Evita «Todo el día»: gasta mucha batería y aporta poco."))
    elif u["spo2_nights"] > 0.95:
        tips.append(tip("Batería", "baja", "Pulsioxímetro solo de noche",
                        "Si lo tienes en «Todo el día», la batería dura bastante menos y la medición diurna es poco útil.",
                        "Ajustes > Salud y bienestar > Pulsioxímetro > Durante el sueño."))
    tips.append(tip("Batería", "media", "Pantalla AMOLED: gesto en lugar de siempre encendida",
                    "El modo «siempre encendida» puede reducir la autonomía a menos de la mitad. Con más batería te lo quitas menos y los datos 24/7 mejoran.",
                    "Ajustes > Pantalla > Durante el uso general: «Gesto». Deja «Siempre encendida» solo para actividades si la necesitas. Activa el modo sueño para que se apague de noche."))
    if u["wear_h"] and u["wear_h"] < 20:
        tips.append(tip("Uso", "media", "Úsalo más horas al día",
                        f"Lo llevas unas {u['wear_h']:.0f} h/día. El estrés, el Body Battery y la FC en reposo son más precisos con uso continuo.",
                        "Quítatelo solo para cargarlo. Si te molesta, prueba una correa de nailon o de silicona perforada."))

    # ---------------- entrenamiento
    tips.append(tip("Entrenamiento", "alta", "Zonas de FC basadas en tu umbral de lactato",
                    "Con zonas por % de FC máxima estimada (220 − edad) el error puede ser de ±10 ppm. Las zonas por FC umbral son las que usa el entrenador de esta app.",
                    "Ajustes > Perfil de usuario > Zonas de FC > Basadas en: %FC umbral de lactato. Haz antes la prueba guiada: menú de actividad Carrera > Opciones > Umbral de lactato (necesitas banda de pecho)."
                    if not (perf.get("lactate") or {}).get("hr") else
                    f"Ya tienes umbral detectado ({perf['lactate']['hr']} ppm). Comprueba en Ajustes > Perfil de usuario > Zonas de FC que estén «Basadas en: %FC umbral» y activa la detección automática del umbral."))
    if u["hard_sessions"] >= 4:
        tips.append(tip("Sensores", "alta", "Usa banda de pecho en las series",
                        f"Hiciste {u['hard_sessions']} sesiones intensas en 8 semanas. En cambios bruscos de ritmo el sensor óptico de muñeca se retrasa varios segundos y subestima la intensidad.",
                        "Una HRM 600 o HRM-Pro Plus da FC exacta, dinámica de carrera (tiempo de contacto, oscilación vertical) y permite la prueba de umbral de lactato. Emparéjala en Ajustes > Sensores y accesorios."))
    if runs >= 4:
        if not u["runs_with_power"]:
            tips.append(tip("Entrenamiento", "media", "Activa la potencia de carrera",
                            "El fēnix 8 calcula potencia desde la muñeca: responde al instante en cuestas y viento, mientras que el pulso tarda en subir.",
                            "Actividad Carrera > Ajustes > Pantallas de datos > añade el campo «Potencia». Para mayor precisión, usa también la banda de pecho."))
        if goal in ("5k", "10k", "media", "maraton", "trail") and not prof.get("race_date"):
            tips.append(tip("Objetivo", "alta", "Añade tu carrera objetivo al calendario",
                            "Con una carrera en el calendario, el widget de carrera muestra tu predicción y el reloj adapta sus entrenamientos sugeridos diarios a esa fecha.",
                            "Garmin Connect (app) > Más > Calendario de carreras > Añadir evento. Pon también la fecha en tu Perfil de esta app para que el plan se ajuste."))
        tips.append(tip("Entrenamiento", "media", "Entrenamientos sugeridos diarios",
                        "Combinan tu disposición, carga y VO2 máx. para proponerte la sesión del día directamente en el reloj; son un buen complemento al plan del entrenador.",
                        "Inicia Carrera > pulsa ARRIBA/ABAJO para ver el entrenamiento sugerido. Configúralo en Ajustes de la actividad > Entrenamiento sugerido."))
        tips.append(tip("Datos", "baja", "Campo «Condición de rendimiento»",
                        "Tras 6–20 min de carrera muestra de −20 a +20 cómo rindes hoy frente a tu nivel habitual. Te dice en vivo si es día para apretar.",
                        "Actividad Carrera > Pantallas de datos > añade «Condición de rendimiento»."))
    if rides >= 3 and not u["rides_with_power"]:
        tips.append(tip("Sensores", "media", "Potenciómetro para ciclismo",
                        "Sin potencia no hay FTP ni carga precisa en bici; el pulso sobreestima la fatiga en calor y la subestima en esfuerzos cortos.",
                        "Pedales Rally o un potenciómetro de biela; emparéjalo en Ajustes > Sensores y accesorios y haz la prueba guiada de FTP."))
    if g.get("strength", 0) >= 2:
        tips.append(tip("Entrenamiento", "baja", "Registra series y repeticiones en fuerza",
                        "Así el reloj calcula el volumen por grupo muscular (mapa muscular en Garmin Connect) y la carga es más realista.",
                        "Al terminar cada serie, pulsa LAP y confirma el ejercicio y las repeticiones. Crea tus rutinas en Garmin Connect > Entrenamientos."))
    elif goal in ("5k", "10k", "media", "maraton", "trail", "triatlon"):
        tips.append(tip("Entrenamiento", "media", "Añade 2 sesiones de fuerza por semana",
                        "Casi no registras fuerza. Dos sesiones cortas por semana reducen un tercio las lesiones por sobreuso y mejoran la economía de carrera.",
                        "Usa la actividad «Fuerza» del reloj con los entrenamientos guiados de Garmin Coach (app Connect > Entrenamiento y planificación)."))
    if g.get("other", 0) + g.get("walking", 0) >= 3 and any(a.get("type") in ("hiking", "trail_running") for d in days[-56:] for a in d["activities"]):
        tips.append(tip("Navegación", "baja", "ClimbPro y Up Ahead en montaña",
                        "Te muestran el perfil de la subida que tienes delante y la distancia a puntos clave, útil para dosificar.",
                        "Carga la ruta en el reloj y activa Ajustes de la actividad > ClimbPro."))

    # ---------------- salud
    if not health.get("fitness", {}).get("bp"):
        tips.append(tip("Salud", "alta", "Registra tu presión arterial",
                        "Es el factor más importante para prevenir infarto y ACV, y el reloj no la mide. Sin ella, esta app solo puede estimar parte del riesgo.",
                        "Con un tensiómetro Garmin Index BPM se sincroniza sola. Con otro validado: Garmin Connect > Salud > Presión arterial > +. Mide 2 veces por la mañana, 3 días seguidos cada mes."))
    if not health.get("weights"):
        tips.append(tip("Salud", "media", "Registra tu peso",
                        "El peso actualizado mejora el cálculo de VO2 máx., calorías e IMC.",
                        "Báscula Garmin Index S2 (también da % de grasa) o manual en Garmin Connect > Salud > Peso, una vez por semana en ayunas."))
    tips.append(tip("Salud", "media", "Informe matutino a tu medida",
                    "Al despertar el reloj te resume sueño, VFC, disposición y entreno del día: es la forma más rápida de revisar tu recuperación.",
                    "Ajustes > Informe matutino > Editar informe: incluye VFC, Disposición, Sueño y Entrenamiento sugerido."))
    tips.append(tip("Salud", "baja", "Instantánea de salud una vez por semana",
                    "Mide en 2 minutos FC, VFC, SpO₂, respiración y estrés en condiciones controladas. Hecha siempre a la misma hora da una tendencia muy fiable.",
                    "Controles > Instantánea de salud, sentado y quieto, por ejemplo el domingo al despertar."))
    if (health.get("vitals") or {}).get("stress30") and health["vitals"]["stress30"] > 35:
        tips.append(tip("Estrés", "media", "Alertas y respiración guiada",
                        f"Tu estrés medio es {health['vitals']['stress30']:.0f}. El reloj puede avisarte cuando sube y guiarte una respiración de 2–5 min.",
                        "Ajustes > Salud y bienestar > Estrés > Alertas de estrés: activar. Usa la actividad «Respiración» (Breathwork)."))
    tips.append(tip("Configuración", "media", "Perfil de usuario al día",
                    "Peso, altura, fecha de nacimiento y FC máxima afectan al VO2 máx., las calorías, las zonas y los riesgos de esta app.",
                    "Ajustes > Perfil de usuario. Si alguna vez superaste la FC máxima que muestra, actualízala o activa la detección automática."))
    tips.append(tip("Configuración", "baja", "Mantén el software al día",
                    "Garmin mejora con frecuencia los algoritmos de sueño, VFC y carga.",
                    "Garmin Connect > Dispositivos > fēnix 8 > Actualizaciones de software (con wifi activado en el reloj se actualiza solo)."))
    if u["with_zones"] is not None and u["with_zones"] < 0.8:
        tips.append(tip("Sensores", "media", "Revisa el sensor de pulso en las actividades",
                        f"Solo el {u['with_zones']:.0%} de tus actividades tiene zonas de FC.",
                        "Comprueba Ajustes > Sensores y accesorios > FC muñeca: «Automático», y que el reloj esté ajustado durante el ejercicio."))
    tips.append(tip("Entrenamiento", "baja", "Aclimatación al calor y la altitud",
                    "El fēnix 8 ajusta el VO2 máx. y la carga según el calor y la altitud si tiene datos de meteorología y GPS.",
                    "Mantén el teléfono conectado durante las actividades al aire libre para recibir la temperatura."))

    order = {"alta": 0, "media": 1, "baja": 2}
    tips.sort(key=lambda t: order[t["priority"]])
    return {"usage": u, "tips": tips, "devices": perf.get("devices") or []}
