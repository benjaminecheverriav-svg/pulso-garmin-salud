import type { Goal, Session, Zones } from "@pulso/shared";
import { hrText } from "./zones";

export type SessionKey =
  | "descanso" | "recuperacion" | "suave" | "largo" | "tempo" | "umbral" | "vo2" | "anaerobico" | "cuestas" | "fuerza";

const LONG_GOALS: Goal[] = ["media", "maraton", "trail", "triatlon", "ciclismo"];

/** Catálogo de sesiones con pulso y ritmos personales. */
export function sessionLibrary(sport: string, z: Zones, goal: Goal): Record<SessionKey, Session> {
  const run = sport === "running";
  const p = z.pace;
  const unit = (k: keyof NonNullable<Zones["pace"]>) => (run && p?.[k] ? ` (≈ ${p[k]})` : "");
  const s = (key: SessionKey, title: string, detail: string, intensity: Session["intensity"]): Session => ({ key, title, detail, intensity });
  return {
    descanso: s("descanso", "Descanso", "Día libre o 20–30 min de movilidad y estiramientos suaves. El descanso también es entrenamiento.", "descanso"),
    recuperacion: s("recuperacion", "Recuperación activa",
      `30–40 min muy suave en zona 1 (${hrText(z, "z1")}). Debes poder conversar sin esfuerzo.`, "suave"),
    suave: s("suave", run ? "Rodaje suave" : "Sesión aeróbica suave",
      `45–60 min en zona 2 (${hrText(z, "z2")})${unit("suave")}. Termina con 4–6 aceleraciones de 20 s.`, "suave"),
    largo: s("largo", run ? "Tirada larga" : "Salida larga",
      `${LONG_GOALS.includes(goal) ? "75–110 min" : "60–75 min"} en zona 2 (${hrText(z, "z2")})${unit("largo")}. Hidrátate cada 20 min; en las > 90 min, lleva hidratos.`,
      "moderada"),
    tempo: s("tempo", "Tempo",
      `15 min de calentamiento + 20–30 min en zona 3 alta (${hrText(z, "z3")})${unit("tempo")} + 10 min suaves.`, "intensa"),
    umbral: s("umbral", "Series de umbral",
      `Calentamiento 15 min + 3×10 min en zona 4 (${hrText(z, "z4")})${unit("umbral")} con 2 min suaves entre series + vuelta a la calma.`, "intensa"),
    vo2: s("vo2", "Series de VO2 máx.",
      `Calentamiento 15 min + 5×3 min en zona 5 (${hrText(z, "z5")})${unit("vo2")} con 2–3 min de trote entre series.`, "intensa"),
    anaerobico: s("anaerobico", "Series cortas",
      "Calentamiento 15 min + 10×45 s muy rápidos con 90 s de recuperación. Potencia y tolerancia al lactato.", "intensa"),
    cuestas: s("cuestas", "Cuestas", "Calentamiento + 8×90 s en subida a ritmo fuerte, bajando al trote. Fuerza específica para trail.", "intensa"),
    fuerza: s("fuerza", "Fuerza + core",
      "30–40 min: sentadilla, peso muerto rumano, zancadas, gemelos, plancha y puente de glúteo. 3×8–12. Previene lesiones.", "moderada"),
  };
}
