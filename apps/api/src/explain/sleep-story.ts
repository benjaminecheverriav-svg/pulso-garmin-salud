import type { StoryItem, Tone } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";

export const hm = (minutes: number): string => `${Math.floor(minutes / 60)} h ${String(Math.floor(minutes % 60)).padStart(2, "0")} min`;
export const item = (tone: Tone, title: string, text: string): StoryItem => ({ tone, title, text });
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** ¿Dormiste lo suficiente?, calidad, regularidad y oxígeno nocturno. */
export function sleepStory(d: ScoredDay): StoryItem[] {
  const s = d.sleep;
  if (!s.totalS) {
    return [item("", "Sin datos de sueño", "El reloj no registró sueño esta noche. Para medir recuperación y VFC necesitas dormir con él puesto.")];
  }
  const out: StoryItem[] = [];
  const mins = s.totalS / 60;
  const need = d.indices.sleepNeedMin || 480;
  const diff = mins - need;
  const enough = diff >= -20
    ? "Cubriste lo que necesitabas."
    : diff < -60
      ? `Te faltaron ${hm(-diff)}: esa deuda se nota en la concentración, el apetito y el rendimiento.`
      : `Te faltaron ${Math.round(-diff)} min, nada grave si no se repite.`;
  out.push(item(diff >= -20 ? "good" : diff >= -75 ? "warning" : "serious", "¿Dormiste lo suficiente?",
    `Dormiste ${hm(mins)} y tu cuerpo necesitaba unas ${hm(need)}. ${enough}`));

  const deep = (s.deepS ?? 0) / s.totalS;
  const rem = (s.remS ?? 0) / s.totalS;
  let extra = "";
  if (deep < 0.13) extra = " El profundo baja con alcohol, cenas copiosas, calor en la habitación o entrenos intensos muy tarde.";
  else if (rem < 0.16) extra = " El REM se concentra al final de la noche: si recortas horas al despertar, es lo primero que pierdes.";
  out.push(item(deep >= 0.15 && rem >= 0.18 ? "good" : "warning", "Calidad del sueño",
    `Tuviste sueño profundo ${pct(deep)} (${deep >= 0.15 ? "bien" : "bajo"}; repara músculos y sistema inmune) y REM ${pct(rem)} (${rem >= 0.18 ? "bien" : "bajo"}; consolida memoria y aprendizaje).${extra}`));

  const cons = d.indices.sleepConsistency;
  if (cons !== null) {
    out.push(item(cons >= 75 ? "good" : "warning", "Regularidad",
      `Consistencia de horarios: ${cons}%. ` + (cons < 75
        ? "Acostarte y levantarte a la misma hora ayuda a dormirte antes y a despertar descansado."
        : "Tus horarios son regulares: tu reloj biológico te lo agradece.")));
  }
  if ((s.lowestSpo2 ?? 100) < 88) {
    out.push(item("warning", "Oxígeno nocturno",
      `El oxígeno llegó a ${s.lowestSpo2}% en algún momento. Una noche aislada puede ser un error de lectura; si se repite, revisa la sección Salud.`));
  }
  return out;
}
