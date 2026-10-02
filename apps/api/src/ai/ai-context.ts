import type { Activity, Dashboard, DayRecord } from "@pulso/shared";

const slimDay = (d: DayRecord) => ({
  fecha: d.date,
  sueño_h: d.sleep.totalS ? Math.round((d.sleep.totalS / 3600) * 100) / 100 : null,
  puntuación_sueño: d.sleep.score,
  profundo_min: Math.round((d.sleep.deepS ?? 0) / 60),
  rem_min: Math.round((d.sleep.remS ?? 0) / 60),
  vfc_ms: d.hrv.lastNight, vfc_estado: d.hrv.status,
  fc_reposo: d.heart.rhr, disposición: d.readiness.score, recuperación: d.indices.recovery,
  esfuerzo_0_21: d.indices.strain, carga_día: d.dailyLoad, estrés_medio: d.stress.avg,
  body_battery_despertar: d.bodyBattery.atWake, pasos: d.daily.steps,
  spo2_min: d.sleep.lowestSpo2, respiración: d.sleep.avgResp,
});

const slimActivity = (a: Activity, date: string) => ({
  fecha: date, nombre: a.name, tipo: a.type,
  duración_min: Math.round((a.durationS ?? 0) / 60), distancia_km: Math.round((a.distanceM ?? 0) / 10) / 100,
  fc_media: a.avgHr, fc_max: a.maxHr, velocidad_m_s: a.avgSpeed, potencia: a.avgPower,
  te_aeróbico: a.teAerobic, te_anaeróbico: a.teAnaerobic, etiqueta_te: a.teLabel, carga: a.load,
  zonas_min: a.zonesS?.map((z) => Math.round(z / 60)) ?? null, desnivel_m: a.elevationGain,
  nota_app: a.coach?.score, comentarios_app: [...(a.coach?.good ?? []), ...(a.coach?.improve ?? [])],
  desacople_aeróbico: a.detail?.decoupling, diferencia_2a_mitad: a.detail?.splitDiff, clima: a.detail?.weather,
  parciales: (a.detail?.laps ?? []).slice(0, 25).map((l) => ({ km: (l.distM ?? 0) / 1000, seg: l.durS, fc: l.hr, tipo: l.intensity })),
  series_fuerza: a.detail?.sets,
});

/** Resumen compacto de los datos del usuario para el modelo (~15 mil tokens). */
export function buildAiContext(dash: Dashboard): string {
  const days = dash.days;
  const last = days[days.length - 1];
  const profile = Object.fromEntries(Object.entries(dash.profile).filter(([, v]) => v !== null && v !== "" && v !== false));
  return JSON.stringify({
    hoy: last?.date,
    estado_de_los_datos: dash.dataStatus,
    perfil_y_objetivo: profile,
    rendimiento: dash.performance,
    estado_entrenamiento_hoy: last?.training,
    últimos_21_días: days.slice(-21).map(slimDay),
    actividades_últimos_28_días: days.slice(-28).flatMap((d) => d.activities.map((a) => slimActivity(a, d.date))),
    revisión_semanal_app: dash.coach.week,
    recomendación_hoy_app: dash.coach.today,
    zonas_personales: dash.coach.plan.zones,
    salud: {
      life_essential_8: dash.health.le8,
      riesgos: dash.health.risks.map((r) => ({ riesgo: r.name, nivel: r.label, factores: r.factors.map((f) => [f.name, f.value, f.status]) })),
      alertas: dash.health.alerts,
      vitales_30d: dash.health.vitals,
    },
  });
}
