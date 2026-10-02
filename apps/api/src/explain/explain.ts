import type { DayRecord, StoryItem } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { effortStory } from "./effort-story";
import { recoveryStory } from "./recovery-story";
import { item, sleepStory } from "./sleep-story";

const REASONS: Record<string, string> = {
  "¿Dormiste lo suficiente?": "dormiste menos de lo que necesitabas",
  "Calidad del sueño": "la calidad del sueño",
  "Tu sistema nervioso": "tu VFC está por debajo de lo normal",
  "Pulso en reposo": "el pulso en reposo alto",
  "Disposición para entrenar": "la disposición para entrenar",
  "Tu energía (Body Battery)": "poca energía al despertar",
};

function summary(d: ScoredDay, sleep: StoryItem[], rec: StoryItem[]): StoryItem[] {
  const rv = d.indices.recovery;
  if (rv === null) return [item("", "Resumen", "Faltan noches con datos de VFC para darte un resumen completo.")];
  const [tone, head] = rv >= 67
    ? (["good", "Hoy tu cuerpo está listo para exigirse."] as const)
    : rv >= 34
      ? (["warning", "Hoy estás a medio gas: entrena, pero sin ir al máximo."] as const)
      : (["serious", "Hoy tu cuerpo pide descanso."] as const);
  const reasons = [...sleep.slice(0, 1), ...rec]
    .filter((x) => x.tone === "warning" || x.tone === "serious")
    .slice(0, 2)
    .map((x) => REASONS[x.title] ?? x.title.toLowerCase());
  return [item(tone, "Resumen del día", head + (reasons.length ? ` Lo que más influye: ${reasons.join(" y ")}.` : " Todos los indicadores acompañan."))];
}

/** Añade a cada día sus explicaciones en lenguaje cotidiano. */
export function explainDays(days: ScoredDay[]): DayRecord[] {
  return days.map((d) => {
    const sueno = sleepStory(d);
    const recuperacion = recoveryStory(d);
    return { ...d, story: { hoy: summary(d, sueno, recuperacion), sueno, recuperacion, esfuerzo: effortStory(d) } };
  });
}
