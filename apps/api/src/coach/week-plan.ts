import type { Goal, GoalProgress, Performance, PlannedDay, Profile, TodayPlan, WeekPlan } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { addDays, isoDate, parseIso, round, weekday } from "../common/util";
import { type SessionKey, sessionLibrary } from "./session-library";
import { dominantSport } from "./today-plan";
import { personalZones } from "./zones";

export const GOAL_NAMES: Record<Goal, string> = {
  salud: "Salud general", "5k": "5 K", "10k": "10 K", media: "Media maratón", maraton: "Maratón",
  trail: "Trail", triatlon: "Triatlón", ciclismo: "Ciclismo", fuerza: "Fuerza", peso: "Perder peso",
};

const PHASE_TEXT: Record<string, string> = {
  base: "Base: construir volumen aeróbico con poca intensidad.",
  construccion: "Construcción: sesiones específicas para tu objetivo.",
  pico: "Pico: las sesiones más exigentes y específicas.",
  taper: "Puesta a punto: menos volumen y la misma intensidad para llegar fresco.",
  post: "Post-carrera: recuperación activa 1–2 semanas.",
};

const QUALITY: Partial<Record<Goal, [SessionKey, SessionKey]>> = {
  "5k": ["vo2", "umbral"], "10k": ["umbral", "vo2"], media: ["umbral", "tempo"], maraton: ["tempo", "umbral"],
  trail: ["cuestas", "umbral"], triatlon: ["umbral", "vo2"], ciclismo: ["umbral", "vo2"],
};

/** Plantillas por días de entrenamiento a la semana (0 = lunes). */
const TEMPLATES: Record<number, Record<number, string>> = {
  2: { 2: "q1", 5: "largo" },
  3: { 1: "q1", 3: "suave", 5: "largo" },
  4: { 1: "q1", 2: "fuerza", 3: "q2", 5: "largo" },
  5: { 1: "q1", 2: "suave", 3: "q2", 4: "fuerza", 5: "largo" },
  6: { 0: "suave", 1: "q1", 2: "suave", 3: "q2", 4: "fuerza", 5: "largo" },
  7: { 0: "suave", 1: "q1", 2: "suave", 3: "q2", 4: "fuerza", 5: "largo", 6: "recuperacion" },
};

function phaseOf(raceDate: string | null): { phase: string; weeksToRace: number | null } {
  if (!raceDate) return { phase: "base", weeksToRace: null };
  const w = (parseIso(raceDate).getTime() - Date.now()) / (7 * 86_400_000);
  if (Number.isNaN(w)) return { phase: "base", weeksToRace: null };
  const phase = w < 0 ? "post" : w < 1.5 ? "taper" : w < 4 ? "pico" : w < 12 ? "construccion" : "base";
  return { phase, weeksToRace: round(w, 1) };
}

export function weekPlan(days: ScoredDay[], prof: Profile, perf: Performance, today: TodayPlan): WeekPlan {
  const goal = prof.goal ?? "salud";
  const zones = personalZones(prof, perf);
  const sport = dominantSport(days);
  const { phase, weeksToRace } = phaseOf(prof.raceDate);
  const lib = sessionLibrary(sport, zones, goal);
  let quality = QUALITY[goal] ?? (["tempo", "anaerobico"] as [SessionKey, SessionKey]);
  if (phase === "base") quality = ["tempo", quality[0]];
  const tpl = TEMPLATES[Math.max(2, Math.min(7, prof.daysPerWeek || 4))];
  const start = parseIso(days[days.length - 1].date);

  const plan: PlannedDay[] = Array.from({ length: 7 }, (_, i) => {
    const dt = addDays(start, i);
    const slot = tpl[weekday(dt)] ?? "descanso";
    let key = (slot === "q1" ? quality[0] : slot === "q2" ? quality[1] : slot) as SessionKey;
    if (phase === "taper" && key === "largo") key = "suave";
    if (i === 0) key = today.key as SessionKey;
    const item = { ...lib[key], date: isoDate(dt) };
    if (phase === "taper" && item.intensity === "intensa" && i > 0) item.detail += " Semana de puesta a punto: reduce el volumen de series a la mitad.";
    return item;
  });
  // evita dos sesiones intensas seguidas tras ajustar el día de hoy
  for (let i = 1; i < 7; i++) {
    if (plan[i].intensity === "intensa" && plan[i - 1].intensity === "intensa") plan[i] = { ...lib.suave, date: plan[i].date };
  }
  return { goal: GOAL_NAMES[goal] ?? goal, phase, phaseText: PHASE_TEXT[phase], weeksToRace, days: plan, zones, sport };
}

const RACE_KEY: Partial<Record<Goal, keyof Performance["race"]>> = { "5k": "5k", "10k": "10k", media: "half", maraton: "marathon" };

export function goalProgress(prof: Profile, perf: Performance): GoalProgress | null {
  const key = RACE_KEY[prof.goal];
  const predicted = key ? perf.race[key] : null;
  if (!predicted) return null;
  const out: GoalProgress = { goal: GOAL_NAMES[prof.goal], predictedS: predicted, targetS: null, gapS: null };
  const parts = (prof.targetTime ?? "").split(":").map(Number);
  if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
    const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
    return { ...out, targetS: secs, gapS: predicted - secs };
  }
  return out;
}
