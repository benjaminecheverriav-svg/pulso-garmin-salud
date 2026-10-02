import type { Factor } from "@pulso/shared";
import { fmtNum } from "../common/util";
import type { HealthCtx } from "./context";
import { CRIT, GOOD, NONE, SERIOUS, WARN, factor, missing } from "./factor";

export function fSleep(c: HealthCtx, weight = 1): Factor {
  if (!c.sleepH) return missing("Duración del sueño", "Duerme con el reloj puesto.");
  const h = c.sleepH;
  const val = `${fmtNum(h)} h/noche${c.shortNights ? ` · ${Math.round(c.shortNights * 100)}% de noches < 6 h` : ""}`;
  if (h < 6) return factor("Sueño", val, SERIOUS, "Dormir menos de 6 h de forma habitual sube la presión arterial y el riesgo cardiometabólico.", "Adelanta la hora de acostarte 30 min durante 2 semanas.", weight);
  if (h < 7) return factor("Sueño", val, WARN, "Por debajo de las 7 h recomendadas para adultos.", "Busca 7–9 h; mantén horarios fijos.", weight);
  if (h >= 9.5) return factor("Sueño", val, WARN, "Dormir mucho de forma habitual puede reflejar mala calidad de sueño.", "Si te despiertas cansado, coméntalo con tu médico.", weight);
  return factor("Sueño", val, GOOD, "Duración adecuada.", "", weight);
}

export function fActivity(c: HealthCtx, weight = 1): Factor {
  if (c.mvpaWeek === null) return missing("Actividad física", "Usa el reloj a diario.");
  const m = c.mvpaWeek;
  const val = `${Math.round(m)} min de intensidad/semana (OMS: ≥150)`;
  if (m < 75) return factor("Actividad física", val, SERIOUS, "Actividad insuficiente: uno de los mayores factores de riesgo modificables.", "Suma 3 caminatas rápidas de 25 min por semana.", weight);
  if (m < 150) return factor("Actividad física", val, WARN, "Por debajo del mínimo recomendado por la OMS.", "Llega a 150 min/semana.", weight);
  return factor("Actividad física", val, GOOD, "Cumples (o superas) la recomendación de la OMS.", "", weight);
}

export function fSteps(c: HealthCtx, weight = 0.5): Factor {
  if (!c.steps) return missing("Pasos", "Usa el reloj a diario.");
  const val = `${Math.round(c.steps).toLocaleString("es")} pasos/día`;
  if (c.steps < 5000) return factor("Pasos diarios", val, SERIOUS, "Mucho tiempo sedentario.", "Levántate cada hora; activa la alerta de movimiento.", weight);
  if (c.steps < 7500) return factor("Pasos diarios", val, WARN, "La mortalidad baja claramente hasta ~8.000 pasos/día.", "Añade 2.000 pasos (unos 20 min andando).", weight);
  return factor("Pasos diarios", val, GOOD, "Buen movimiento diario.", "", weight);
}

export function fStress(c: HealthCtx, weight = 0.5): Factor {
  if (!c.stress30) return missing("Estrés", "Usa el reloj a diario.");
  const val = `${Math.round(c.stress30)}/100 de media`;
  if (c.stress30 > 45) return factor("Estrés crónico", val, SERIOUS, "Estrés fisiológico alto de forma sostenida.", "Pausas de respiración (app Relax del reloj), sueño y menos cafeína.", weight);
  if (c.stress30 > 35) return factor("Estrés crónico", val, WARN, "Estrés algo elevado.", "Busca bloques diarios de descanso real.", weight);
  return factor("Estrés crónico", val, GOOD, "Estrés controlado.", "", weight);
}

export function fAgeSex(c: HealthCtx, weight = 1): Factor {
  if (!c.age) return missing("Edad", "Completa tu fecha de nacimiento en Garmin Connect o en tu Perfil.");
  const val = `${c.age} años`;
  if (c.age >= 65) return factor("Edad", val, SERIOUS, "El riesgo aumenta con la edad (factor no modificable).", "Controles médicos periódicos.", weight);
  if (c.age >= (c.sex === "F" ? 55 : 45)) return factor("Edad", val, WARN, "Edad a partir de la cual sube el riesgo cardiovascular.", "Control anual de presión, colesterol y glucosa.", weight);
  return factor("Edad", val, GOOD, "Edad de bajo riesgo.", "", weight);
}

const SMOKING: Record<string, [Factor["status"], string, string]> = {
  nunca: [GOOD, "Nunca fumador.", "nunca"],
  ex5: [GOOD, "Dejaste de fumar hace más de 5 años.", "exfumador >5 años"],
  ex1: [WARN, "Dejaste de fumar hace 1–5 años: el riesgo sigue bajando.", "exfumador 1–5 años"],
  reciente: [SERIOUS, "Dejaste de fumar hace menos de 1 año.", "exfumador reciente"],
  actual: [CRIT, "Fumar multiplica el riesgo de infarto y ACV.", "fumador"],
};

export function fSmoking(c: HealthCtx, weight = 1.5): Factor {
  const s = c.prof.smoking;
  if (!s) return missing("Tabaco", "Indica en tu Perfil si fumas o has fumado.");
  const [st, why, label] = SMOKING[s] ?? [NONE, "", s];
  return factor("Tabaco", label, st, why, st === SERIOUS || st === CRIT ? "Dejar de fumar es la medida más potente." : "", weight);
}

export function fChol(c: HealthCtx, weight = 1): Factor {
  const v = c.prof.nonHdl;
  if (!v) return missing("Colesterol no-HDL", "Pide un perfil lipídico en tu próximo análisis y anótalo en tu Perfil.");
  const val = `${Math.round(v)} mg/dL${c.prof.cholMeds ? " (con tratamiento)" : ""}`;
  const n = "Colesterol no-HDL";
  if (v >= 190) return factor(n, val, CRIT, "Muy alto.", "Consulta médica.", weight);
  if (v >= 160) return factor(n, val, SERIOUS, "Alto.", "Dieta mediterránea y control médico.", weight);
  if (v >= 130) return factor(n, val, WARN, "Límite alto.", "Más fibra, menos grasas saturadas.", weight);
  return factor(n, val, GOOD, "Óptimo.", "", weight);
}

export function fGlucose(c: HealthCtx, weight = 1): Factor {
  const p = c.prof;
  if (p.diabetes) return factor("Glucosa", "Diabetes diagnosticada", CRIT, "La diabetes daña los vasos sanguíneos.", "Buen control de la HbA1c con tu médico.", weight);
  const g = p.glucose, a = p.a1c;
  if (!g && !a) return missing("Glucosa en ayunas / HbA1c", "Anota tu glucosa en ayunas o HbA1c del último análisis en tu Perfil.");
  const val = `${g ?? "—"} mg/dL · HbA1c ${a ?? "—"}%`;
  if ((g && g >= 126) || (a && a >= 6.5)) return factor("Glucosa", val, CRIT, "Valores compatibles con diabetes.", "Consulta médica para confirmar.", weight);
  if ((g && g >= 100) || (a && a >= 5.7)) return factor("Glucosa", val, SERIOUS, "Prediabetes.", "Ejercicio regular y menos azúcares simples; se revierte.", weight);
  return factor("Glucosa", val, GOOD, "Normal.", "", weight);
}

export function fFamily(c: HealthCtx, key: "familyCvd" | "familyDiabetes" = "familyCvd", label = "Antecedentes familiares", weight = 1): Factor {
  if (c.prof[key]) return factor(label, "Sí", WARN, "Padres o hermanos con la enfermedad a edad temprana aumentan tu riesgo.", "Controles médicos más frecuentes.", weight);
  return factor(label, "No indicado", GOOD, "Sin antecedentes indicados en tu Perfil.", "", weight);
}

export function fAlcohol(c: HealthCtx, weight = 0.75): Factor {
  const v = c.prof.alcoholWeek;
  if (v === null || v === undefined) return missing("Alcohol", "Indica cuántas bebidas tomas por semana en tu Perfil.");
  const lim = c.sex === "F" ? 7 : 14;
  const val = `${Math.round(v)} bebidas/semana`;
  if (v > lim) return factor("Alcohol", val, SERIOUS, "Sube la presión, altera el sueño y la VFC y favorece arritmias.", "Reduce a la mitad y observa tu VFC nocturna.", weight);
  if (v > lim / 2) return factor("Alcohol", val, WARN, "Consumo moderado: ya afecta a la calidad del sueño.", "Evítalo en los días previos a entrenos clave.", weight);
  return factor("Alcohol", val, GOOD, "Consumo bajo.", "", weight);
}
