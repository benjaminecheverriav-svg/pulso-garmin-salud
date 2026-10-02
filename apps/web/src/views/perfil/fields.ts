import type { ManualProfile } from "@pulso/shared";

export type FieldType = "select" | "date" | "text" | "number" | "check";
export interface Field { key: keyof ManualProfile; label: string; type: FieldType; options?: [string | number, string][] }

/** Formulario de perfil: objetivo, datos corporales y cuestionario de salud. */
export const FIELD_GROUPS: [string, Field[]][] = [
  ["Objetivo", [
    { key: "goal", label: "Objetivo principal", type: "select", options: [["salud", "Salud general"], ["5k", "5 K"], ["10k", "10 K"], ["media", "Media maratón"], ["maraton", "Maratón"], ["trail", "Trail"], ["triatlon", "Triatlón"], ["ciclismo", "Ciclismo"], ["fuerza", "Fuerza"], ["peso", "Perder peso"]] },
    { key: "raceDate", label: "Fecha de la carrera", type: "date" },
    { key: "targetTime", label: "Tiempo objetivo (h:mm:ss)", type: "text" },
    { key: "daysPerWeek", label: "Días de entrenamiento por semana", type: "select", options: [2, 3, 4, 5, 6, 7].map((n) => [n, String(n)]) },
    { key: "experience", label: "Experiencia", type: "select", options: [["principiante", "Principiante"], ["intermedio", "Intermedio"], ["avanzado", "Avanzado"]] },
    { key: "injuries", label: "Lesiones previas o molestias", type: "text" },
  ]],
  ["Datos corporales (vacío = usar los de Garmin)", [
    { key: "sex", label: "Sexo", type: "select", options: [["", "—"], ["M", "Hombre"], ["F", "Mujer"]] },
    { key: "age", label: "Edad", type: "number" },
    { key: "heightCm", label: "Altura (cm)", type: "number" },
    { key: "weightKg", label: "Peso (kg)", type: "number" },
  ]],
  ["Cuestionario de salud (opcional, mejora los indicadores)", [
    { key: "smoking", label: "Tabaco", type: "select", options: [["", "—"], ["nunca", "Nunca he fumado"], ["ex5", "Lo dejé hace más de 5 años"], ["ex1", "Lo dejé hace 1–5 años"], ["reciente", "Lo dejé hace menos de 1 año"], ["actual", "Fumo actualmente"]] },
    { key: "bpSys", label: "Presión sistólica (la alta, mmHg)", type: "number" },
    { key: "bpDia", label: "Presión diastólica (la baja, mmHg)", type: "number" },
    { key: "bpMeds", label: "Tomo medicación para la presión", type: "check" },
    { key: "nonHdl", label: "Colesterol no-HDL (total − HDL, mg/dL)", type: "number" },
    { key: "cholMeds", label: "Tomo medicación para el colesterol", type: "check" },
    { key: "glucose", label: "Glucosa en ayunas (mg/dL)", type: "number" },
    { key: "a1c", label: "HbA1c (%)", type: "number" },
    { key: "diabetes", label: "Tengo diabetes diagnosticada", type: "check" },
    { key: "diet", label: "¿Cómo valoras tu alimentación?", type: "select", options: [["", "—"], [0, "Muy mala"], [1, "Mala"], [2, "Regular"], [3, "Buena"], [4, "Excelente (mediterránea)"]] },
    { key: "alcoholWeek", label: "Bebidas alcohólicas por semana", type: "number" },
    { key: "familyCvd", label: "Padres o hermanos con infarto/ACV antes de los 55–65", type: "check" },
    { key: "familyDiabetes", label: "Padres o hermanos con diabetes", type: "check" },
    { key: "snoring", label: "Ronco fuerte o me dicen que hago pausas al respirar", type: "check" },
  ]],
];

const NUMERIC = new Set<keyof ManualProfile>(["daysPerWeek", "diet", "age", "heightCm", "weightKg", "bpSys", "bpDia", "nonHdl", "glucose", "a1c", "alcoholWeek"]);

/** Convierte los valores del formulario al tipo correcto (número, booleano o null). */
export function readForm(form: HTMLFormElement): Partial<ManualProfile> {
  const out: Record<string, unknown> = {};
  for (const group of FIELD_GROUPS) {
    for (const f of group[1]) {
      const el = form.elements.namedItem(f.key) as HTMLInputElement | HTMLSelectElement | null;
      if (!el) continue;
      if (f.type === "check") out[f.key] = (el as HTMLInputElement).checked;
      else if (el.value === "") out[f.key] = null;
      else out[f.key] = NUMERIC.has(f.key) ? Number(el.value) : el.value;
    }
  }
  return out as Partial<ManualProfile>;
}
