/** Actividades, su detalle (parciales, series, clima) y la evaluación del entrenador. */

export interface Lap {
  n: number;
  distM?: number | null;
  durS?: number | null;
  speed?: number | null;
  hr?: number | null;
  maxHr?: number | null;
  elevGain?: number | null;
  cadence?: number | null;
  power?: number | null;
  intensity?: string | null;
}

export interface Weather {
  tempC: number | null;
  feelsC: number | null;
  humidity?: number | null;
  windKmh: number | null;
  desc?: string | null;
}

export interface ExerciseSummary {
  name: string;
  sets: number;
  reps: number;
  maxKg: number;
}

export interface ActivitySeries {
  t: (number | null)[];
  hr?: (number | null)[];
  speed?: (number | null)[];
  elev?: (number | null)[];
  power?: (number | null)[];
}

export interface ActivityDetail {
  laps?: Lap[];
  paceCv?: number;
  splitDiff?: number;
  decoupling?: number | null;
  series?: ActivitySeries;
  weather?: Weather;
  sets?: ExerciseSummary[];
  setsInfo?: { unknown: number; weighted: number; restAvgS: number | null };
}

export type SessionKind = "intensa" | "larga" | "suave" | "fuerza";

export interface CoachEval {
  score: number;
  grade: string;
  kind: SessionKind;
  purpose: string;
  good: string[];
  improve: string[];
  context: string[];
  efficiency: number | null;
  recoveryH: number | null;
  next: string;
}

export interface Activity {
  id: number | string | null;
  name?: string | null;
  type: string;
  start?: string | null;
  durationS?: number | null;
  distanceM?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  kcal?: number | null;
  teAerobic?: number | null;
  teAnaerobic?: number | null;
  teLabel?: string | null;
  load?: number | null;
  avgSpeed?: number | null;
  elevationGain?: number | null;
  avgPower?: number | null;
  cadence?: number | null;
  steps?: number | null;
  zonesS?: number[] | null;
  detail?: ActivityDetail;
  strain?: number;
  coach?: CoachEval;
}
