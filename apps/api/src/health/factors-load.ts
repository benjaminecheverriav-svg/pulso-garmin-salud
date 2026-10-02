import type { Factor } from "@pulso/shared";
import { fmtNum } from "../common/util";
import type { HealthCtx } from "./context";
import { CRIT, GOOD, SERIOUS, WARN, factor, missing } from "./factor";

/** Factores de lesión por sobrecarga. */

export function fAcwr(c: HealthCtx, weight = 1.5): Factor {
  if (!c.acwr) return missing("Ratio carga aguda/crónica", "Entrena con el reloj al menos 3–4 semanas.");
  const val = c.acwr.toFixed(2).replace(".", ",");
  const n = "Ratio de carga (ACWR)";
  if (c.acwr > 1.5) return factor(n, val, CRIT, "Por encima de 1,5 el riesgo de lesión se multiplica.", "Reduce volumen e intensidad un 30% esta semana.", weight);
  if (c.acwr > 1.3) return factor(n, val, SERIOUS, "Zona de riesgo: estás subiendo la carga rápido.", "No añadas más carga hasta que baje de 1,3.", weight);
  if (c.acwr < 0.8) return factor(n, val, WARN, "Carga baja: al volver de golpe te lesionas más fácil.", "Retoma la carga de forma progresiva.", weight);
  return factor(n, val, GOOD, "Zona óptima (0,8–1,3).", "", weight);
}

export function fRamp(c: HealthCtx, weight = 1): Factor {
  if (!c.loadPrev3w) return missing("Progresión semanal", "Se necesitan 4 semanas de entrenamientos.");
  const p = (c.load7 / c.loadPrev3w - 1) * 100;
  const val = `${p > 0 ? "+" : ""}${Math.round(p)}% vs. media de las 3 semanas previas`;
  if (p > 40) return factor("Progresión semanal", val, SERIOUS, "Subida brusca de carga.", "Sube como máximo un 10–20% por semana.", weight);
  if (p > 20) return factor("Progresión semanal", val, WARN, "Subida algo rápida.", "Mantén la carga una semana antes de volver a subir.", weight);
  return factor("Progresión semanal", val, GOOD, "Progresión controlada.", "", weight);
}

export function fMonotony(c: HealthCtx, weight = 0.75): Factor {
  if (c.monotony === null) return missing("Monotonía", "Se necesitan 7 días con datos.");
  const val = fmtNum(c.monotony);
  const n = "Monotonía del entrenamiento";
  if (c.monotony > 2) return factor(n, val, SERIOUS, "Todos los días se parecen: poca alternancia entre días duros y suaves.", "Alterna días duros, suaves y de descanso.", weight);
  if (c.monotony > 1.5) return factor(n, val, WARN, "Poca variación de carga entre días.", "Haz más suaves los días suaves.", weight);
  return factor(n, val, GOOD, "Buena alternancia de cargas.", "", weight);
}

export function fRest(c: HealthCtx, weight = 1): Factor {
  const r = c.restDays14;
  const val = `${r} días sin entrenar en las últimas 2 semanas`;
  if (r === 0) return factor("Días de descanso", val, SERIOUS, "Sin días de descanso el tejido no se repara.", "Programa al menos 1 día libre por semana.", weight);
  if (r < 2) return factor("Días de descanso", val, WARN, "Pocos días de descanso.", "Idealmente 1–2 por semana.", weight);
  return factor("Días de descanso", val, GOOD, "Descanso suficiente.", "", weight);
}

export function fHardLow(c: HealthCtx, weight = 1): Factor {
  const n = c.hardLowReady;
  const val = `${n} sesiones intensas con disposición < 40 (14 d)`;
  const name = "Intensidad sin recuperar";
  if (n >= 2) return factor(name, val, SERIOUS, "Entrenar fuerte sin haber recuperado es la vía clásica a la lesión.", "Cambia la sesión dura por una suave cuando la disposición esté baja.", weight);
  if (n === 1) return factor(name, val, WARN, "Una sesión dura con poca recuperación.", "Respeta los días de baja disposición.", weight);
  return factor(name, val, GOOD, "Entrenas duro cuando estás recuperado.", "", weight);
}

export function fHrvSupp(c: HealthCtx, weight = 1): Factor {
  if (!c.hrv7 || !c.hrvBase) return missing("VFC frente a tu base", "Duerme con el reloj puesto 3 semanas.");
  const p = (c.hrv7 / c.hrvBase - 1) * 100;
  const val = `${p > 0 ? "+" : ""}${Math.round(p)}% (7 d vs. base)`;
  if (p < -15) return factor("VFC suprimida", val, SERIOUS, "Tu cuerpo no está asimilando la carga.", "Semana de descarga.", weight);
  if (p < -7) return factor("VFC suprimida", val, WARN, "Algo de fatiga acumulada.", "Vigila el sueño y baja la intensidad.", weight);
  return factor("VFC frente a tu base", val, GOOD, "Estás asimilando bien.", "", weight);
}

export function fIntensityDist(c: HealthCtx, weight = 0.75): Factor {
  if (c.easyShare === null) return missing("Distribución de intensidad", "Entrena con FC.");
  const val = `${Math.round(c.easyShare * 100)}% del tiempo en Z1–Z2`;
  const n = "Distribución de intensidad";
  if (c.easyShare < 0.6) return factor(n, val, SERIOUS, "Entrenas demasiado fuerte la mayor parte del tiempo.", "Regla 80/20: 80% suave, 20% intenso.", weight);
  if (c.easyShare < 0.72) return factor(n, val, WARN, "Algo cargado hacia la intensidad.", "Haz tus rodajes más lentos.", weight);
  return factor(n, val, GOOD, "Distribución equilibrada.", "", weight);
}

export function fSleepLoad(c: HealthCtx, weight = 0.75): Factor {
  if (!c.sleepH) return missing("Sueño para recuperar", "Duerme con el reloj puesto.");
  const val = `${fmtNum(c.sleepH)} h/noche`;
  const n = "Sueño para recuperar";
  if (c.sleepH < 6.5) return factor(n, val, SERIOUS, "Deportistas que duermen < 7 h se lesionan hasta 1,7 veces más.", "Duerme 8 h en semanas de carga alta.", weight);
  if (c.sleepH < 7.2) return factor(n, val, WARN, "Justo para la carga que haces.", "Suma 30 min de sueño o una siesta corta.", weight);
  return factor(n, val, GOOD, "Suficiente.", "", weight);
}

export function fInjuries(c: HealthCtx, weight = 0.75): Factor {
  const inj = (c.prof.injuries ?? "").trim();
  if (inj) return factor("Lesiones previas", inj.slice(0, 60), WARN, "Una lesión previa es el mayor predictor de la siguiente.", "Mantén la fuerza y movilidad específicas de esa zona.", weight);
  return factor("Lesiones previas", "Ninguna indicada", GOOD, "Sin lesiones indicadas en tu Perfil.", "", weight);
}
