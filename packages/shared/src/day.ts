/** Registro diario normalizado a partir de las respuestas de Garmin Connect. */
import type { Activity } from "./activity";

export type SleepStage = "deep" | "light" | "rem" | "awake";
export type Tone = "good" | "warning" | "serious" | "critical" | "";

export interface SleepLevel {
  start: number;
  end: number;
  stage: SleepStage;
}

export interface SleepSubscores {
  duration?: string | null;
  stress?: string | null;
  awakeCount?: string | null;
  rem?: string | null;
  remPct?: number | null;
  light?: string | null;
  lightPct?: number | null;
  deep?: string | null;
  deepPct?: number | null;
  restlessness?: string | null;
}

export interface Sleep {
  score?: number | null;
  qualifier?: string | null;
  totalS?: number;
  deepS?: number | null;
  lightS?: number | null;
  remS?: number | null;
  awakeS?: number | null;
  napS?: number | null;
  startMs?: number | null;
  endMs?: number | null;
  needMin?: number | null;
  avgResp?: number | null;
  avgSpo2?: number | null;
  lowestSpo2?: number | null;
  avgHr?: number | null;
  stress?: number | null;
  awakeCount?: number | null;
  rhr?: number | null;
  hrv?: number | null;
  bbChange?: number | null;
  subscores?: SleepSubscores;
  levels?: SleepLevel[];
}

export interface Hrv {
  lastNight?: number;
  weeklyAvg?: number | null;
  high5min?: number | null;
  baselineLow?: number | null;
  baselineHigh?: number | null;
  status?: string | null;
}

export type ReadinessFactor = "sleep" | "recoveryTime" | "acwr" | "hrv" | "stressHistory" | "sleepHistory";

export interface Readiness {
  score?: number;
  level?: string | null;
  recoveryTimeH?: number | null;
  acuteLoad?: number | null;
  factors?: Partial<Record<ReadinessFactor, number | null>>;
  factorFeedback?: Partial<Record<ReadinessFactor, string | null>>;
}

export interface BodyBattery {
  high?: number | null;
  low?: number | null;
  charged?: number | null;
  drained?: number | null;
  atWake?: number | null;
  current?: number | null;
  series?: [number, number][];
}

export interface Stress {
  avg?: number | null;
  max?: number | null;
  restS?: number | null;
  lowS?: number | null;
  mediumS?: number | null;
  highS?: number | null;
}

export interface Heart {
  rhr?: number | null;
  min?: number | null;
  max?: number | null;
  rhr7d?: number | null;
}

export interface Daily {
  steps?: number | null;
  stepGoal?: number | null;
  distanceM?: number | null;
  kcalTotal?: number | null;
  kcalActive?: number | null;
  intensityModerate?: number | null;
  intensityVigorous?: number | null;
  intensityGoalWeek?: number | null;
  floors?: number | null;
  wornS?: number | null;
}

export interface Training {
  statusPhrase?: string | null;
  acute?: number | null;
  chronic?: number | null;
  chronicMin?: number | null;
  chronicMax?: number | null;
  acwr?: number | null;
  acwrStatus?: string | null;
  acuteEst?: number;
  chronicEst?: number;
  loadLowAerobic?: number | null;
  loadHighAerobic?: number | null;
  loadAnaerobic?: number | null;
  targetLowAerobic?: (number | null)[];
  targetHighAerobic?: (number | null)[];
  targetAnaerobic?: (number | null)[];
  balancePhrase?: string | null;
  vo2max?: number | null;
  vo2maxCycling?: number | null;
  heatAcclimation?: number | null;
  altitudeAcclimation?: number | null;
}

/** Índices propios de Pulso (recuperación %, esfuerzo 0–21, sueño %). */
export interface Indices {
  recovery: number | null;
  strain: number | null;
  strainTarget: [number, number];
  trimp: number;
  sleepPerformance: number | null;
  sleepNeedMin: number;
  sleepDebtMin: number;
  sleepConsistency: number | null;
  contributors: {
    hrv?: { value: number; baseline: number; z: number; score: number };
    rhr?: { value: number | null; baseline: number | null; z: number | null; score: number };
    resp?: { value: number | null; baseline: number | null; z: number | null };
    sleep?: { value: number | null };
  };
}

export interface StoryItem {
  tone: Tone;
  title: string;
  text: string;
}

export type StorySection = "hoy" | "sueno" | "recuperacion" | "esfuerzo";

export interface DayRecord {
  date: string;
  sleep: Sleep;
  hrv: Hrv;
  readiness: Readiness;
  bodyBattery: BodyBattery;
  stress: Stress;
  heart: Heart;
  daily: Daily;
  respiration: { waking?: number | null; sleep?: number | null };
  spo2: { avg?: number | null; lowest?: number | null };
  training: Training;
  activities: Activity[];
  indices: Indices;
  dailyLoad: number;
  story: Record<StorySection, StoryItem[]>;
}
