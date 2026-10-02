import type { StoryItem } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { fmtNum } from "../common/util";
import { item } from "./sleep-story";

/** Esfuerzo del día, carga de entrenamiento y resumen de cada sesión. */
export function effortStory(d: ScoredDay): StoryItem[] {
  const out: StoryItem[] = [];
  const st = d.indices.strain;
  if (st !== null) {
    const [lo, hi] = d.indices.strainTarget;
    const where = st < lo ? "por debajo de" : st > hi ? "por encima de" : "dentro de";
    out.push(item(where === "dentro de" ? "good" : "warning", "Esfuerzo de hoy",
      `Tu esfuerzo fue ${fmtNum(st)} de 21, ${where} lo que tu recuperación permitía (${lo}–${hi}). La escala no es lineal: pasar de 10 a 14 exige mucho más que de 4 a 8.`));
  }
  const t = d.training;
  const a = t.acute ?? t.acuteEst;
  const c = t.chronic ?? t.chronicEst;
  if (a && c) {
    const ratio = a / c;
    const verdict = ratio > 1.5 ? "Estás subiendo demasiado rápido: aquí es donde aparecen las lesiones."
      : ratio > 1.3 ? "Estás apretando: aguanta así una semana como máximo."
        : ratio < 0.8 ? "Estás entrenando menos de lo que tu cuerpo está acostumbrado."
          : "Estás en la zona ideal para mejorar sin lesionarte.";
    out.push(item(ratio > 1.5 ? "serious" : ratio > 1.3 || ratio < 0.8 ? "warning" : "good", "Carga de entrenamiento",
      `Tu carga de los últimos 7 días (${Math.round(a)}) frente a tu carga habitual de 4 semanas (${Math.round(c)}) da un ratio de ${ratio.toFixed(2).replace(".", ",")}. ${verdict}`));
  }
  for (const act of d.activities) {
    const co = act.coach;
    if (!co) continue;
    out.push(item(co.score >= 7 ? "good" : co.score >= 5 ? "warning" : "serious", `${act.name || "Actividad"} · nota ${fmtNum(co.score)}/10`,
      [co.purpose, ...[...co.good, ...co.improve].slice(0, 2)].filter(Boolean).join(" ")));
  }
  return out;
}
