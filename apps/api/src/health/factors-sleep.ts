import type { Factor } from "@pulso/shared";
import { fmtNum } from "../common/util";
import type { HealthCtx } from "./context";
import { GOOD, SERIOUS, WARN, factor, missing } from "./factor";

/** Factores de sueño, respiración nocturna y apnea. */

export function fSleepReg(c: HealthCtx, weight = 0.5): Factor {
  if (c.bedSd === null) return missing("Regularidad del sueño", "Se necesitan al menos 7 noches registradas.");
  const val = `± ${Math.round(c.bedSd)} min en la hora de acostarte`;
  if (c.bedSd > 90) return factor("Regularidad del sueño", val, SERIOUS, "Horarios muy irregulares alteran el reloj biológico.", "Fija una hora de acostarte, también el fin de semana.", weight);
  if (c.bedSd > 50) return factor("Regularidad del sueño", val, WARN, "Horarios algo irregulares.", "Intenta que la variación sea < 45 min.", weight);
  return factor("Regularidad del sueño", val, GOOD, "Horarios consistentes.", "", weight);
}

export function fSpo2Dips(c: HealthCtx, weight = 1.5): Factor {
  if (c.spo2LowFrac === null) return missing("Oxígeno nocturno (SpO₂)", "Activa el pulsioxímetro durante el sueño en el reloj.");
  const n = "Caídas de oxígeno nocturno";
  const val = `${Math.round(c.spo2LowFrac * 100)}% de noches con mínimo < 88% · mínimo ${c.spo2Min}%`;
  if (c.spo2LowFrac > 0.3 || (c.spo2Min ?? 100) < 82)
    return factor(n, val, SERIOUS, "Caídas repetidas de SpO₂ pueden indicar apnea del sueño.", "Consulta a un especialista en sueño (polisomnografía).", weight);
  if (c.spo2LowFrac > 0.1)
    return factor(n, val, WARN, "Algunas noches con caídas de oxígeno (ojo: la medición en muñeca tiene ruido si te mueves o aprietas el brazo).", "Vigila si coincide con ronquidos o cansancio diurno.", weight);
  return factor(n, val, GOOD, "Oxigenación nocturna estable.", "", weight);
}

export function fSpo2Avg(c: HealthCtx, weight = 0.75): Factor {
  if (!c.spo2Avg) return missing("SpO₂ media", "Activa el pulsioxímetro durante el sueño.");
  const val = `${Math.round(c.spo2Avg)}%`;
  if (c.spo2Avg < 92) return factor("SpO₂ media nocturna", val, SERIOUS, "Oxigenación baja (salvo que vivas en altura).", "Coméntalo con tu médico.", weight);
  if (c.spo2Avg < 94) return factor("SpO₂ media nocturna", val, WARN, "Algo baja (normal en altitud > 1.500 m).", "", weight);
  return factor("SpO₂ media nocturna", val, GOOD, "Normal.", "", weight);
}

export function fResp(c: HealthCtx, weight = 0.5): Factor {
  if (!c.resp30) return missing("Respiración nocturna", "Duerme con el reloj puesto.");
  const val = `${fmtNum(c.resp30)} rpm`;
  if (c.resp30 > 20) return factor("Respiración nocturna", val, SERIOUS, "Frecuencia respiratoria alta durante el sueño.", "Coméntalo con tu médico.", weight);
  if (c.resp30 > 17) return factor("Respiración nocturna", val, WARN, "En la parte alta de lo normal (12–18).", "", weight);
  return factor("Respiración nocturna", val, GOOD, "Normal.", "", weight);
}

export function fAwake(c: HealthCtx, weight = 0.5): Factor {
  if (c.awakeCount === null) return missing("Despertares", "Duerme con el reloj puesto.");
  const val = `${fmtNum(c.awakeCount)} por noche`;
  if (c.awakeCount > 4) return factor("Despertares nocturnos", val, WARN, "Sueño fragmentado: típico de apnea, estrés o mala higiene de sueño.", "Habitación fresca y oscura; sin pantallas 1 h antes.", weight);
  return factor("Despertares nocturnos", val, GOOD, "Sueño poco fragmentado.", "", weight);
}

export function fSnoring(c: HealthCtx, weight = 1): Factor {
  if (c.prof.snoring) return factor("Ronquidos", "Sí", WARN, "Roncar fuerte es la señal más común de apnea.", "Pregunta a quien duerme contigo si hay pausas al respirar.", weight);
  return factor("Ronquidos", "No indicado", GOOD, "Sin ronquidos indicados en tu Perfil.", "", weight);
}

export function fMaleAge(c: HealthCtx, weight = 0.5): Factor {
  if (!c.age) return missing("Edad y sexo", "Completa tu perfil.");
  const risky = (c.sex !== "F" && c.age >= 40) || (c.sex === "F" && c.age >= 50);
  return factor("Edad y sexo", `${c.age} años · ${c.sex !== "F" ? "hombre" : "mujer"}`, risky ? WARN : GOOD,
    risky ? "La apnea es más frecuente en hombres > 40 y mujeres tras la menopausia." : "Grupo de menor riesgo.", "", weight);
}

export function fEndurance(c: HealthCtx, weight = 0.75): Factor {
  const val = `${fmtNum(c.enduranceHWeek)} h/semana (últimas 12 semanas)`;
  if (c.enduranceHWeek > 10 && (c.age ?? 0) >= 40)
    return factor("Volumen de resistencia", val, WARN, "Años de mucho volumen de resistencia se asocian a más fibrilación auricular.", "Ante palpitaciones o pulso irregular, consulta.", weight);
  return factor("Volumen de resistencia", val, GOOD, "Volumen sin riesgo arrítmico conocido.", "", weight);
}
