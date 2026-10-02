import type { HealthReport, Performance, Profile, TodayPlan, Training } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { actGroup, isHard } from "./classify";
import { type SessionKey, sessionLibrary } from "./session-library";
import { personalZones } from "./zones";

/** Deporte con más minutos en las últimas 6 semanas (sin contar fuerza ni caminatas). */
export function dominantSport(days: ScoredDay[]): string {
  const cnt = new Map<string, number>();
  for (const d of days.slice(-42)) {
    for (const a of d.activities) {
      const g = actGroup(a.type);
      if (g !== "strength" && g !== "walking") cnt.set(g, (cnt.get(g) ?? 0) + (a.durationS ?? 0));
    }
  }
  return [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "running";
}

/** Tipo de carga que falta según el enfoque de carga de Garmin. */
function loadShortage(t: Training): SessionKey | null {
  const checks: [SessionKey, number | null | undefined, (number | null)[] | undefined][] = [
    ["anaerobico", t.loadAnaerobic, t.targetAnaerobic],
    ["umbral", t.loadHighAerobic, t.targetHighAerobic],
    ["largo", t.loadLowAerobic, t.targetLowAerobic],
  ];
  for (const [key, v, target] of checks) if (v != null && target?.[0] && v < target[0]) return key;
  return null;
}

const SHORTAGE_TXT: Partial<Record<SessionKey, string>> = { anaerobico: "anaeróbica", umbral: "aeróbica alta", largo: "aeróbica baja" };
const QUALITY_BY_GOAL: Record<string, SessionKey> = { "5k": "vo2", "10k": "umbral", media: "umbral", maraton: "tempo", trail: "cuestas" };

export function acwrOf(t: Training): number | null {
  const a = t.acute ?? t.acuteEst;
  const c = t.chronic ?? t.chronicEst;
  return t.acwr ?? (a && c ? a / c : null);
}

export function todayPlan(days: ScoredDay[], prof: Profile, perf: Performance, health: HealthReport | null): TodayPlan {
  const d = days[days.length - 1];
  const sport = dominantSport(days);
  const lib = sessionLibrary(sport, personalZones(prof, perf), prof.goal ?? "salud");
  const ready = d.readiness.score ?? null;
  const rec = d.indices.recovery;
  const acwr = acwrOf(d.training);
  const lastHard = [...days.slice(0, -1)].reverse().findIndex((x) => x.activities.some(isHard));
  const sinceHard = lastHard >= 0 ? lastHard + 1 : 99;
  const illness = (health?.alerts ?? []).some((al) => al.title.includes("combatiendo"));
  const reasons: string[] = [];
  if (ready !== null) reasons.push(`Disposición para entrenar: ${ready}/100`);
  if (rec !== null) reasons.push(`Recuperación: ${rec}%`);
  if (acwr) reasons.push(`Ratio de carga: ${acwr.toFixed(2).replace(".", ",")}`);
  reasons.push(sinceHard < 99 ? `Última sesión intensa: hace ${sinceHard} día(s)` : "Sin sesiones intensas recientes");

  let key: SessionKey;
  let why: string;
  if (illness || (ready !== null && ready < 25) || (rec !== null && rec < 25)) {
    [key, why] = ["descanso", "Tu cuerpo necesita recuperarse: hoy entrenar restaría más de lo que suma."];
  } else if ((ready !== null && ready < 50) || (rec !== null && rec < 40) || (acwr && acwr > 1.5)) {
    [key, why] = ["recuperacion", "Recuperación incompleta o carga acumulada alta: toca algo muy suave."];
  } else if (sinceHard <= 1) {
    [key, why] = ["suave", "Ayer hubo intensidad: hoy suave para asimilarla."];
  } else if ((ready ?? 60) >= 70 && (rec ?? 60) >= 55) {
    const shortage = loadShortage(d.training);
    key = shortage ?? QUALITY_BY_GOAL[prof.goal] ?? "tempo";
    why = "Estás recuperado: es el día ideal para una sesión de calidad." + (shortage ? ` Garmin detecta déficit de carga ${SHORTAGE_TXT[shortage]}.` : "");
  } else {
    [key, why] = ["suave", "Día intermedio: volumen aeróbico sin castigar el cuerpo."];
  }
  return { ...lib[key], why, reasons, sport };
}
