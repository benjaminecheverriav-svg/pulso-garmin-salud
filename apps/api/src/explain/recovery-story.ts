import type { ReadinessFactor, StoryItem } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { item } from "./sleep-story";

const FACTOR_NAMES: Record<ReadinessFactor, string> = {
  sleep: "el sueño de anoche", recoveryTime: "el tiempo de recuperación pendiente", acwr: "la carga reciente",
  hrv: "tu VFC", stressHistory: "el estrés acumulado", sleepHistory: "el sueño de los últimos días",
};

/** VFC, pulso en reposo, disposición para entrenar y Body Battery explicados. */
export function recoveryStory(d: ScoredDay): StoryItem[] {
  const out: StoryItem[] = [];
  const c = d.indices.contributors;
  if (c.hrv) {
    const { value: v, baseline: b } = c.hrv;
    const p = (v / b - 1) * 100;
    const verdict = p >= -5 ? "Estás en buena forma para exigirte." : p >= -15 ? "Hay algo de fatiga o estrés."
      : "Tu cuerpo está bajo estrés (entreno, mal sueño, alcohol, enfermedad o preocupaciones).";
    out.push(item(p >= -5 ? "good" : p >= -15 ? "warning" : "serious", "Tu sistema nervioso",
      `Tu VFC anoche fue ${v} ms frente a tus ${b} ms habituales (${p > 0 ? "+" : ""}${Math.round(p)}%). La VFC mide cuánto varía el tiempo entre latidos: cuanto más alta respecto a tu normal, más relajado y recuperado está tu sistema nervioso. ${verdict}`));
  }
  if (c.rhr?.value && c.rhr.baseline) {
    const dlt = c.rhr.value - c.rhr.baseline;
    out.push(item(dlt <= 1 ? "good" : dlt <= 4 ? "warning" : "serious", "Pulso en reposo",
      `${c.rhr.value} ppm frente a ${Math.round(c.rhr.baseline)} habituales. ` +
        (dlt <= 1 ? "Normal." : "Un pulso en reposo más alto de lo normal indica que el cuerpo aún trabaja para recuperarse.")));
  }
  const r = d.readiness;
  if (r.score !== undefined) {
    const f = Object.entries(r.factors ?? {}).filter(([, v]) => v != null) as [ReadinessFactor, number][];
    const low = f.sort((a, b) => a[1] - b[1])[0];
    let txt = `Garmin te da ${r.score}/100 de disposición para entrenar.`;
    if (low && low[1] < 60) txt += ` Lo que más te limita hoy es ${FACTOR_NAMES[low[0]]} (${low[1]}%).`;
    if (r.recoveryTimeH) txt += ` Te quedan unas ${Math.round(r.recoveryTimeH)} h para estar totalmente recuperado del último esfuerzo.`;
    out.push(item(r.score >= 70 ? "good" : r.score >= 40 ? "warning" : "serious", "Disposición para entrenar", txt));
  }
  const w = d.bodyBattery.atWake;
  if (w != null) {
    const verdict = w >= 70 ? "Buena carga para el día." : w >= 45 ? "Carga a medias: dosifica el día." : "Batería baja: prioriza descansar.";
    out.push(item(w >= 70 ? "good" : w >= 45 ? "warning" : "serious", "Tu energía (Body Battery)",
      `Te despertaste con ${w} de 100. Es como la batería del móvil: el sueño y el descanso la cargan; el ejercicio, el estrés y las comidas pesadas la gastan. ${verdict}`));
  }
  return out;
}
