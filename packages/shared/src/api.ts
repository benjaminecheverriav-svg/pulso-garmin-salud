/** Contratos de la API HTTP entre NestJS y Next.js. */
import type { CoachReport } from "./coach";
import type { DayRecord } from "./day";
import type { HealthReport } from "./health";

export interface Performance {
  race: { "5k": number | null; "10k": number | null; half: number | null; marathon: number | null };
  endurance: { score: number | null; classification: number | null; history: [string, number][] };
  hill: { score: number | null; strength: number | null; endurance: number | null };
  fitnessAge: { fitnessAge: number | null; chronological: number | null; achievable: number | null };
  lactate: { hr: number | null; speedMs: number | null; ftp: number | null };
  devices: string[];
}

export type Goal = "salud" | "5k" | "10k" | "media" | "maraton" | "trail" | "triatlon" | "ciclismo" | "fuerza" | "peso";

export interface ManualProfile {
  goal: Goal;
  raceDate: string | null;
  targetTime: string | null;
  daysPerWeek: number;
  experience: "principiante" | "intermedio" | "avanzado";
  injuries: string;
  sex: "M" | "F" | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  smoking: "nunca" | "ex5" | "ex1" | "reciente" | "actual" | null;
  bpSys: number | null;
  bpDia: number | null;
  bpMeds: boolean;
  nonHdl: number | null;
  cholMeds: boolean;
  glucose: number | null;
  a1c: number | null;
  diabetes: boolean;
  diet: number | null;
  alcoholWeek: number | null;
  familyCvd: boolean;
  familyDiabetes: boolean;
  snoring: boolean;
}

export interface GarminProfile {
  sex: "M" | "F" | null;
  birthDate: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  lthr: number | null;
}

export type Profile = ManualProfile & Partial<GarminProfile> & { bmi: number | null; lthr?: number | null };

export interface DeviceTip {
  category: string;
  priority: "alta" | "media" | "baja";
  title: string;
  why: string;
  how: string;
}

export interface DeviceUsage {
  sleepNights: number;
  hrvNights: number;
  spo2Nights: number;
  wearH: number | null;
  actsWeek: number;
  groups: Record<string, number>;
  withZones: number | null;
  runsWithPower: number;
  ridesWithPower: number;
  hardSessions: number;
}

export interface DeviceReport {
  usage: DeviceUsage;
  tips: DeviceTip[];
  devices: string[];
}

export interface DataStatus {
  firstDay: string | null;
  days: number;
  wellnessDays: number;
  sleepNights: number;
  hrvNights: number;
  activities: number;
  hasVo2: boolean;
  hasReadiness: boolean;
  hasRecovery: boolean;
}

export interface Dashboard {
  source: "garmin" | "demo";
  days: DayRecord[];
  performance: Performance;
  profile: Profile;
  health: HealthReport;
  coach: CoachReport;
  device: DeviceReport;
  lastSync: string | null;
  aiEnabled: boolean;
  dataStatus: DataStatus;
}

export interface SyncState {
  running: boolean;
  progress: number;
  total: number;
  message: string;
  error?: string | null;
}

export interface Status {
  connected: boolean;
  profile: { name?: string | null; displayName?: string | null };
  hasData: boolean;
  lastSync: string | null;
  sync: SyncState;
  aiEnabled: boolean;
  login: { status: "idle" | "logging_in" | "ok" | "mfa" | "error"; error: string | null };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
