import type { Activity, SessionKind } from "@pulso/shared";

export type SportGroup = "running" | "cycling" | "swimming" | "strength" | "walking" | "other";

const HARD_LABELS = new Set(["THRESHOLD", "LACTATE_THRESHOLD", "VO2MAX", "ANAEROBIC_CAPACITY", "SPRINT", "TEMPO"]);

export const PURPOSE: Record<string, string> = {
  RECOVERY: "Recuperación activa: mueve la sangre sin generar fatiga.",
  BASE: "Base aeróbica: construye resistencia, capilares y eficiencia para quemar grasa.",
  TEMPO: "Tempo: mejora la capacidad de sostener ritmos exigentes durante mucho tiempo.",
  THRESHOLD: "Umbral: sube el ritmo que puedes mantener ~1 hora sin «ahogarte».",
  LACTATE_THRESHOLD: "Umbral: sube el ritmo que puedes mantener ~1 hora sin «ahogarte».",
  VO2MAX: "VO2 máx.: amplía tu techo aeróbico (el tamaño de tu motor).",
  ANAEROBIC_CAPACITY: "Capacidad anaeróbica: tolerancia a esfuerzos muy intensos de 30 s a 2 min.",
  SPRINT: "Sprint: potencia y velocidad máxima.",
};

export const STRENGTH_PURPOSE =
  "Fuerza: protege articulaciones y tendones, mejora la economía de carrera y mantiene la masa muscular.";

export function actGroup(type?: string | null): SportGroup {
  const t = type ?? "";
  if (t.includes("running")) return "running";
  if (/cycling|biking|ride/.test(t)) return "cycling";
  if (t.includes("swim")) return "swimming";
  if (t.includes("strength") || t === "hiit" || t === "cardio") return "strength";
  if (t === "walking" || t === "hiking") return "walking";
  return "other";
}

/** Fracción del tiempo en las zonas indicadas (0 = Z1 … 4 = Z5). */
export function zoneShare(a: Activity, zones: number[]): number | null {
  const z = a.zonesS;
  const total = z?.reduce((s, x) => s + x, 0) ?? 0;
  if (!z || !total) return null;
  return zones.reduce((s, i) => s + (z[i] ?? 0), 0) / total;
}

/** Sesión intensa de resistencia (la fuerza se trata aparte). */
export function isHard(a: Activity): boolean {
  if (actGroup(a.type) === "strength") return false;
  return (
    HARD_LABELS.has(a.teLabel ?? "") ||
    (a.teAerobic ?? 0) >= 4 ||
    (a.teAnaerobic ?? 0) >= 2.5 ||
    (zoneShare(a, [3, 4]) ?? 0) > 0.25
  );
}

export function sessionKind(a: Activity, typicalDurS: number | null): SessionKind {
  if (actGroup(a.type) === "strength") return "fuerza";
  if (isHard(a)) return "intensa";
  const dur = a.durationS ?? 0;
  if (typicalDurS && dur >= Math.max(1.4 * typicalDurS, 75 * 60)) return "larga";
  return "suave";
}

export const pct = (x: number): string => `${Math.round(x * 100)}%`;
