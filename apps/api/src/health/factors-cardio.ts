import type { Factor } from "@pulso/shared";
import { fmtNum } from "../common/util";
import type { HealthCtx } from "./context";
import { CRIT, GOOD, SERIOUS, WARN, factor, missing } from "./factor";

export function fBp(c: HealthCtx, weight = 2): Factor {
  if (!c.bp) return missing("Presión arterial", "Mídela (idealmente con un tensiómetro validado, varias mañanas) y regístrala en Garmin Connect o en tu Perfil.");
  const [s, d, src] = c.bp;
  const val = `${s}/${d} mmHg (${src})`;
  const n = "Presión arterial";
  if (s >= 180 || d >= 120) return factor(n, val, CRIT, "Valores de crisis hipertensiva.", "Consulta médica urgente si se repite en reposo.", weight);
  if (s >= 140 || d >= 90) return factor(n, val, CRIT, "Hipertensión grado 2 según la AHA.", "Consulta a tu médico para confirmar y tratar.", weight);
  if (s >= 130 || d >= 80) return factor(n, val, SERIOUS, "Hipertensión grado 1 (≥130/80).", "Confírmala con más mediciones y coméntala con tu médico.", weight);
  if (s >= 120) return factor(n, val, WARN, "Presión elevada (120–129 de sistólica).", "Reduce la sal y el alcohol; vuelve a medir en un mes.", weight);
  return factor(n, val, GOOD, "Presión normal (<120/80).", "", weight);
}

export function fBmi(c: HealthCtx, weight = 1): Factor {
  if (!c.bmi) return missing("Índice de masa corporal", "Registra tu peso y altura en Garmin Connect o en tu Perfil.");
  const b = c.bmi;
  const v = fmtNum(b);
  const note = " (en deportistas musculados el IMC puede sobreestimar la grasa)";
  if (b >= 35) return factor("IMC", v, CRIT, "Obesidad grado 2 o más.", "Plan de pérdida de peso con apoyo profesional.", weight);
  if (b >= 30) return factor("IMC", v, SERIOUS, "Obesidad." + note, "Bajar un 5–10% del peso ya mejora la presión y el azúcar.", weight);
  if (b >= 25) return factor("IMC", v, WARN, "Sobrepeso." + note, "Revisa la composición corporal (% de grasa) antes de sacar conclusiones.", weight);
  if (b < 18.5) return factor("IMC", v, WARN, "Bajo peso: puede afectar a huesos, hormonas y recuperación.", "Asegura suficiente energía y proteína.", weight);
  return factor("IMC", v, GOOD, "Peso saludable.", "", weight);
}

export function fRhr(c: HealthCtx, weight = 1): Factor {
  if (!c.rhr30) return missing("FC en reposo", "Usa el reloj de día y de noche.");
  const r = c.rhr30;
  const val = `${Math.round(r)} ppm (media 30 d)`;
  if (r > 90) return factor("FC en reposo", val, CRIT, "Muy alta: se asocia a más riesgo cardiovascular.", "Coméntalo con tu médico.", weight);
  if (r > 80) return factor("FC en reposo", val, SERIOUS, "Alta: cada 10 ppm extra aumenta el riesgo cardiovascular.", "El ejercicio aeróbico regular la baja en pocas semanas.", weight);
  if (r > 70) return factor("FC en reposo", val, WARN, "En la parte alta de lo normal.", "Más trabajo aeróbico suave y mejor sueño ayudan a bajarla.", weight);
  return factor("FC en reposo", val, GOOD, "Corazón eficiente en reposo.", "", weight);
}

export function fRhrTrend(c: HealthCtx, weight = 1): Factor {
  if (!c.rhr7 || !c.rhrBase) return missing("Tendencia de FC en reposo", "Se necesitan al menos 3 semanas de datos.");
  const delta = c.rhr7 - c.rhrBase;
  const val = `${delta > 0 ? "+" : ""}${fmtNum(delta)} ppm vs. tu base`;
  const n = "Tendencia de FC en reposo";
  if (delta >= 5) return factor(n, val, SERIOUS, "Subida sostenida: fatiga, estrés, enfermedad o falta de sueño.", "Baja la intensidad unos días y vigila síntomas.", weight);
  if (delta >= 3) return factor(n, val, WARN, "Ligeramente por encima de lo habitual.", "Prioriza el descanso esta semana.", weight);
  return factor(n, val, GOOD, "Estable.", "", weight);
}

export const hrvNorm = (age: number | null): number => Math.max(25, 72 - 0.95 * ((age ?? 35) - 20));

export function fHrv(c: HealthCtx, weight = 1): Factor {
  if (!c.hrv30) return missing("Variabilidad cardiaca (VFC)", "Duerme con el reloj puesto: la VFC se mide de noche.");
  const n = hrvNorm(c.age);
  const ratio = c.hrv30 / n;
  const val = `${Math.round(c.hrv30)} ms (referencia para tu edad ≈ ${Math.round(n)})`;
  if (ratio < 0.65) return factor("VFC para tu edad", val, SERIOUS, "Baja: el sistema nervioso pasa más tiempo en modo estrés.", "Sueño regular, ejercicio aeróbico, menos alcohol y técnicas de respiración.", weight);
  if (ratio < 0.85) return factor("VFC para tu edad", val, WARN, "Algo por debajo de la media de tu edad (la VFC es muy individual).", "Observa tu tendencia más que el número aislado.", weight);
  return factor("VFC para tu edad", val, GOOD, "Buena capacidad de adaptación del corazón.", "", weight);
}

/** Umbrales bajo | regular | bueno | excelente (por encima: superior), por edad. */
const VO2_NORMS: Record<"M" | "F", [number, number[]][]> = {
  M: [[29, [36, 42, 46, 52]], [39, [34, 40, 44, 49]], [49, [32, 37, 42, 47]], [59, [29, 34, 38, 43]], [200, [26, 31, 35, 40]]],
  F: [[29, [31, 36, 40, 46]], [39, [29, 34, 38, 43]], [49, [27, 32, 36, 40]], [59, [24, 28, 32, 36]], [200, [22, 26, 30, 33]]],
};
const VO2_LABELS = ["Bajo", "Regular", "Bueno", "Excelente", "Superior"];

export function vo2Category(vo2: number | null, age: number | null, sex: string | null): [string, number] | null {
  if (!vo2) return null;
  const table = VO2_NORMS[sex === "F" ? "F" : "M"];
  const th = table.find(([maxAge]) => (age ?? 35) <= maxAge)![1];
  const idx = th.filter((x) => vo2 >= x).length;
  return [VO2_LABELS[idx], idx];
}

export function fVo2(c: HealthCtx, weight = 1.5): Factor {
  const cat = vo2Category(c.vo2, c.age, c.sex);
  if (!cat) return missing("Capacidad aeróbica (VO2 máx.)", "Haz carreras o rutas en bici al aire libre con GPS y FC para que Garmin la estime.");
  const val = `${Math.round(c.vo2!)} ml/kg/min · ${cat[0]} para tu edad`;
  if (cat[1] === 0) return factor("VO2 máx.", val, SERIOUS, "Una baja capacidad aeróbica es de los predictores más fuertes de enfermedad cardiovascular.", "Entrena resistencia 3 veces por semana; mejora rápido.", weight);
  if (cat[1] === 1) return factor("VO2 máx.", val, WARN, "Capacidad aeróbica mejorable.", "Añade una sesión semanal de intervalos.", weight);
  return factor("VO2 máx.", val, GOOD, "Buena forma cardiorrespiratoria: protege el corazón y el cerebro.", "", weight);
}
