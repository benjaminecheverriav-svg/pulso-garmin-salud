import type { BpReading, HealthAlert, HealthReport, Profile, WeightEntry } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { fmtNum } from "../common/util";
import { HealthCtx } from "./context";
import { CRIT, SERIOUS, WARN } from "./factor";
import { hrvNorm, vo2Category } from "./factors-cardio";
import { le8 } from "./le8";
import { buildRisks } from "./risks";

/** Patrón típico de un resfriado/infección o de sobreentrenamiento agudo. */
function earlyWarning(c: HealthCtx): HealthAlert | null {
  const signals: string[] = [];
  if (c.rhr3 && c.rhrBase && c.rhr3 - c.rhrBase >= 4) signals.push(`FC en reposo +${Math.round(c.rhr3 - c.rhrBase)} ppm`);
  if (c.hrv3 && c.hrvBase && c.hrv3 / c.hrvBase < 0.85) signals.push(`VFC ${Math.round((c.hrv3 / c.hrvBase - 1) * 100)}%`);
  if (c.resp3 && c.respBase && c.resp3 - c.respBase >= 1) signals.push(`respiración nocturna +${fmtNum(c.resp3 - c.respBase)} rpm`);
  if (c.sleepScore3 && c.sleepScoreBase && c.sleepScore3 < c.sleepScoreBase - 12) signals.push("sueño peor de lo habitual");
  if (signals.length < 2) return null;
  return {
    level: signals.length >= 3 ? SERIOUS : WARN,
    title: "Tu cuerpo muestra señales de estar combatiendo algo",
    text: `En los últimos 3 días: ${signals.join(", ")}. Este patrón suele aparecer 1–2 días antes de un resfriado o cuando se acumula demasiada fatiga. Hoy mejor descanso o actividad muy suave, hidrátate y duerme más.`,
  };
}

function alerts(c: HealthCtx): HealthAlert[] {
  const out: HealthAlert[] = [];
  const ew = earlyWarning(c);
  if (ew) out.push(ew);
  if (c.bp && (c.bp[0] >= 180 || c.bp[1] >= 120))
    out.push({ level: CRIT, title: "Presión arterial muy alta", text: "Tus últimas mediciones están en rango de crisis. Si tienes dolor de cabeza intenso, dolor en el pecho, falta de aire o alteraciones de visión o habla, llama a emergencias." });
  if (c.spo2Min && c.spo2Min < 80)
    out.push({ level: SERIOUS, title: "Oxígeno nocturno muy bajo en alguna noche", text: `Mínimo registrado: ${c.spo2Min}%. Puede ser un error de lectura, pero si se repite consulta a un especialista en sueño.` });
  if (c.rhr7 && c.rhr7 > 100)
    out.push({ level: SERIOUS, title: "FC en reposo por encima de 100", text: "Taquicardia en reposo sostenida: consulta a tu médico." });
  return out;
}

/** Indicadores orientativos de salud (no son un diagnóstico). */
export function assessHealth(days: ScoredDay[], prof: Profile, bp: BpReading[], weights: WeightEntry[]): HealthReport {
  const c = new HealthCtx(days, prof, bp, weights);
  const cat = vo2Category(c.vo2, c.age, c.sex);
  return {
    le8: le8(c),
    risks: buildRisks(c),
    alerts: alerts(c),
    fitness: {
      vo2max: c.vo2, vo2Category: cat?.[0] ?? null, hrvNorm: Math.round(hrvNorm(c.age)), age: c.age, sex: c.sex, bmi: c.bmi,
      bp: c.bp ? { sys: c.bp[0], dia: c.bp[1], source: c.bp[2] } : null,
    },
    vitals: {
      rhr30: c.rhr30, rhrBase: c.rhrBase, hrv30: c.hrv30, hrvBase: c.hrvBase, sleepH: c.sleepH, spo2Avg: c.spo2Avg,
      spo2Min: c.spo2Min, resp30: c.resp30, steps: c.steps, mvpaWeek: c.mvpaWeek, stress30: c.stress30,
    },
    bpReadings: bp.slice(-30),
    weights: weights.slice(-60),
  };
}
