/** Indicadores de riesgo de salud y Life's Essential 8 (AHA). */

export type HealthStatus = "good" | "warning" | "serious" | "critical" | "unknown";

export interface Factor {
  name: string;
  value: string;
  status: HealthStatus;
  why: string;
  action: string;
  weight: number;
}

export interface Risk {
  id: string;
  name: string;
  icon: string;
  intro: string;
  level: HealthStatus;
  label: string;
  index: number;
  coverage: number;
  summary: string;
  actions: string[];
  toComplete: string[];
  factors: Factor[];
}

export interface Le8Component {
  key: string;
  name: string;
  score: number | null;
  value: string;
  source: string;
  tip: string;
}

export interface Le8 {
  score: number | null;
  level: string | null;
  components: Le8Component[];
  complete: number;
  of: number;
}

export interface HealthAlert {
  level: HealthStatus;
  title: string;
  text: string;
}

export interface BpReading {
  date: string;
  time: string;
  sys: number;
  dia: number;
  pulse?: number | null;
}

export interface WeightEntry {
  date: string;
  kg: number;
  bmi?: number | null;
  fatPct?: number | null;
}

export interface HealthReport {
  le8: Le8;
  risks: Risk[];
  alerts: HealthAlert[];
  fitness: {
    vo2max: number | null;
    vo2Category: string | null;
    hrvNorm: number;
    age: number | null;
    sex: string | null;
    bmi: number | null;
    bp: { sys: number; dia: number; source: string } | null;
  };
  vitals: Record<string, number | null>;
  bpReadings: BpReading[];
  weights: WeightEntry[];
}
