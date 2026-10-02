/** Traducción de los nombres de ejercicio de Garmin al español. */
const EXERCISES: Record<string, string> = {
  LAT_PULLDOWN: "Jalón al pecho", PULL_UP: "Dominadas", CHIN_UP: "Dominadas supinas", SEATED_CABLE_ROW: "Remo en polea sentado",
  BENT_OVER_ROW: "Remo inclinado", DUMBBELL_ROW: "Remo con mancuerna", ROW: "Remo", TRICEPS_PRESSDOWN: "Extensión de tríceps en polea",
  TRICEPS_EXTENSION: "Extensión de tríceps", BICEPS_CURL: "Curl de bíceps", CURL: "Curl", HAMMER_CURL: "Curl martillo",
  BENCH_PRESS: "Press de banca", BARBELL_BENCH_PRESS: "Press de banca con barra", DUMBBELL_BENCH_PRESS: "Press de banca con mancuernas",
  INCLINE_BENCH_PRESS: "Press inclinado", SHOULDER_PRESS: "Press de hombros", OVERHEAD_PRESS: "Press militar", LATERAL_RAISE: "Elevaciones laterales",
  SQUAT: "Sentadilla", BARBELL_BACK_SQUAT: "Sentadilla con barra", GOBLET_SQUAT: "Sentadilla goblet", LEG_PRESS: "Prensa de piernas",
  DEADLIFT: "Peso muerto", ROMANIAN_DEADLIFT: "Peso muerto rumano", LUNGE: "Zancadas", WALKING_LUNGE: "Zancadas caminando",
  LEG_CURL: "Curl femoral", LEG_EXTENSION: "Extensión de cuádriceps", CALF_RAISE: "Elevación de gemelos", HIP_RAISE: "Puente de glúteo",
  HIP_THRUST: "Hip thrust", PLANK: "Plancha", CRUNCH: "Abdominales", SIT_UP: "Abdominales", PUSH_UP: "Flexiones",
  CHEST_FLY: "Aperturas de pecho", DIP: "Fondos", SHRUG: "Encogimientos de hombros", FACE_PULL: "Face pull",
  CARRY: "Paseo del granjero", OLYMPIC_LIFT: "Levantamiento olímpico", CORE: "Core", CARDIO: "Cardio",
};

export const UNKNOWN_EXERCISE = "Sin identificar";

export function exerciseName(name?: string | null, category?: string | null): string {
  for (const key of [name, category]) {
    if (key && key !== "UNKNOWN") {
      const pretty = key.replace(/_/g, " ").toLowerCase();
      return EXERCISES[key] ?? pretty.charAt(0).toUpperCase() + pretty.slice(1);
    }
  }
  return UNKNOWN_EXERCISE;
}
