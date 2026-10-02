/** Traducciones de los códigos de Garmin al español. */
import type { Tone } from "@pulso/shared";

export const QUAL: Record<string, string> = { EXCELLENT: "Excelente", GOOD: "Bueno", FAIR: "Aceptable", POOR: "Deficiente" };
export const QUAL_ST: Record<string, Tone> = { EXCELLENT: "good", GOOD: "good", FAIR: "warning", POOR: "critical" };
export const READY: Record<string, string> = { PRIME: "Óptima", HIGH: "Alta", MODERATE: "Moderada", LOW: "Baja", POOR: "Muy baja" };
export const READY_ST: Record<string, Tone> = { PRIME: "good", HIGH: "good", MODERATE: "warning", LOW: "serious", POOR: "critical" };
export const HRV_ST: Record<string, [string, Tone]> = {
  BALANCED: ["Equilibrado", "good"], UNBALANCED: ["Desequilibrado", "warning"], LOW: ["Bajo", "serious"], POOR: ["Deficiente", "critical"],
};
export const ACWR_ST: Record<string, [string, Tone]> = {
  OPTIMAL: ["Óptima", "good"], HIGH: ["Alta", "serious"], VERY_HIGH: ["Muy alta", "critical"], LOW: ["Baja", "warning"],
};
export const BALANCE: Record<string, string> = {
  BALANCED: "equilibrado", AEROBIC_LOW_SHORTAGE: "falta aeróbico bajo", AEROBIC_HIGH_SHORTAGE: "falta aeróbico alto",
  ANAEROBIC_SHORTAGE: "falta anaeróbico", AEROBIC_LOW_FOCUS: "enfocado en aeróbico bajo", AEROBIC_HIGH_FOCUS: "enfocado en aeróbico alto",
  ANAEROBIC_FOCUS: "enfocado en anaeróbico", NO_DATA: "sin datos",
};
export const TE_LABEL: Record<string, string> = {
  RECOVERY: "Recuperación", BASE: "Base", TEMPO: "Tempo", THRESHOLD: "Umbral", LACTATE_THRESHOLD: "Umbral",
  VO2MAX: "VO2 máx.", ANAEROBIC_CAPACITY: "Capacidad anaeróbica", SPRINT: "Sprint", NO_BENEFIT: "Sin beneficio",
};

const TSTATUS: Record<string, [string, Tone, string]> = {
  PRODUCTIVE: ["Productivo", "good", "Tu forma física mejora con la carga actual."],
  MAINTAINING: ["Mantenimiento", "warning", "La carga actual mantiene tu forma física."],
  PEAKING: ["Pico de forma", "good", "Estás en condiciones ideales para competir."],
  RECOVERY: ["Recuperación", "warning", "Carga baja: el cuerpo se está recuperando."],
  UNPRODUCTIVE: ["No productivo", "serious", "La carga es buena pero la forma baja: revisa descanso y estrés."],
  OVERREACHING: ["Sobrecarga", "critical", "Carga muy alta: prioriza la recuperación."],
  STRAINED: ["Sobreexigido", "critical", "La recuperación no acompaña a la carga."],
  DETRAINING: ["Pérdida de forma", "serious", "Carga demasiado baja durante varios días."],
  NO_STATUS: ["Sin estado", "", "Garmin necesita más actividades con VO2 máx."],
};

export function trainingStatus(phrase?: string | null): [string, Tone, string] | null {
  if (!phrase) return null;
  const key = phrase.replace(/_\d+$/, "");
  return TSTATUS[key] ?? [key.replace(/_/g, " ").toLowerCase(), "", ""];
}

const ACT: Record<string, [string, string]> = {
  running: ["Carrera", "🏃"], treadmill_running: ["Cinta", "🏃"], trail_running: ["Trail", "⛰️"], track_running: ["Pista", "🏃"],
  cycling: ["Ciclismo", "🚴"], road_biking: ["Ciclismo ruta", "🚴"], mountain_biking: ["MTB", "🚵"], indoor_cycling: ["Bici indoor", "🚴"],
  virtual_ride: ["Bici virtual", "🚴"], strength_training: ["Fuerza", "🏋️"], lap_swimming: ["Natación", "🏊"],
  open_water_swimming: ["Aguas abiertas", "🏊"], walking: ["Caminata", "🚶"], hiking: ["Senderismo", "🥾"], yoga: ["Yoga", "🧘"],
  hiit: ["HIIT", "⚡"], cardio: ["Cardio", "⚡"], multi_sport: ["Multideporte", "🏅"], triathlon: ["Triatlón", "🏅"],
};

export const actInfo = (t?: string | null): [string, string] => ACT[t ?? ""] ?? [t ? t.replace(/_/g, " ") : "Otra", "⚡"];

export type Group = "running" | "cycling" | "strength" | "swimming" | "other";

export function actGroup(t?: string | null): Group {
  const s = t ?? "";
  if (s.includes("running")) return "running";
  if (/cycling|biking|ride/.test(s)) return "cycling";
  if (s.includes("swim")) return "swimming";
  if (s.includes("strength") || s === "hiit" || s === "cardio") return "strength";
  return "other";
}

/** Orden fijo de colores categóricos (validado para daltonismo). */
export const GROUPS: [Group, string, string][] = [
  ["running", "Carrera", "--series-1"],
  ["cycling", "Ciclismo", "--series-2"],
  ["strength", "Fuerza", "--series-3"],
  ["swimming", "Natación", "--series-4"],
  ["other", "Otras", "--series-5"],
];
