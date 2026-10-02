/** Entrenador: plan de hoy, plan semanal, revisión de la semana y zonas personales. */
import type { Tone } from "./day";

export type Intensity = "descanso" | "suave" | "moderada" | "intensa";

export interface Session {
  key: string;
  title: string;
  detail: string;
  intensity: Intensity;
}

export interface TodayPlan extends Session {
  why: string;
  reasons: string[];
  sport: string;
}

export interface PlannedDay extends Session {
  date: string;
}

type HrRange = [number | null, number | null];

export interface Zones {
  lthr: number | null;
  ltSpeed: number | null;
  hr?: Record<"z1" | "z2" | "z3" | "z4" | "z5", HrRange>;
  pace?: Record<"suave" | "aerobico" | "tempo" | "umbral" | "vo2" | "largo", string>;
}

export interface WeekPlan {
  goal: string;
  phase: string;
  phaseText: string;
  weeksToRace: number | null;
  days: PlannedDay[];
  zones: Zones;
  sport: string;
}

export interface WeekStats {
  sessions: number;
  hours: number;
  km: number;
  load: number;
  hard: number;
  restDays: number;
  easyPct: number;
  midPct: number;
  hardPct: number;
  monotony: number | null;
  sleepH: number | null;
  recovery: number | null;
  scores: number[];
  longShare: number | null;
}

export interface WeekReview {
  current: WeekStats;
  previous: WeekStats;
  loadChange: number | null;
  notes: [Tone, string][];
  verdict: string;
  avgScore: number | null;
}

export interface GoalProgress {
  goal: string;
  predictedS: number;
  targetS: number | null;
  gapS: number | null;
}

export interface CoachReport {
  today: TodayPlan;
  week: WeekReview;
  plan: WeekPlan;
  goal: GoalProgress | null;
}
