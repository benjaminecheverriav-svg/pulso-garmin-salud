import type { Tone, WeekReview, WeekStats } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { fmtNum, mean, pstdev, round, sum } from "../common/util";
import { isHard, pct } from "./classify";

function stats(ds: ScoredDay[]): WeekStats {
  const acts = ds.flatMap((d) => d.activities);
  const loads = ds.map((d) => d.dailyLoad);
  const z = [0, 0, 0, 0, 0];
  for (const a of acts) (a.zonesS ?? []).forEach((s, i) => (z[i] += s ?? 0));
  const tz = sum(z) || 1;
  const durs = acts.map((a) => a.durationS ?? 0);
  const sd = pstdev(loads);
  return {
    sessions: acts.length,
    hours: sum(durs) / 3600,
    km: sum(acts.map((a) => a.distanceM)) / 1000,
    load: sum(loads),
    hard: acts.filter(isHard).length,
    restDays: ds.filter((d) => !d.activities.length).length,
    easyPct: Math.round(((z[0] + z[1]) / tz) * 100),
    midPct: Math.round((z[2] / tz) * 100),
    hardPct: Math.round(((z[3] + z[4]) / tz) * 100),
    monotony: loads.length > 1 && sd > 0 ? round(mean(loads)! / sd, 2) : null,
    sleepH: mean(ds.map((d) => (d.sleep.totalS ? d.sleep.totalS / 3600 : null))),
    recovery: mean(ds.map((d) => d.indices.recovery)),
    scores: acts.map((a) => a.coach?.score).filter((s): s is number => s !== undefined),
    longShare: acts.length ? Math.max(...durs) / (sum(durs) || 1) : null,
  };
}

function notesFor(cur: WeekStats, change: number | null): [Tone, string][] {
  const notes: [Tone, string][] = [];
  const signed = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}%`;
  if (change !== null) {
    if (change > 25) notes.push(["warning", `La carga subió ${Math.round(change)}% respecto a la semana anterior. Lo recomendable es no pasar de +10–20%.`]);
    else if (change < -30 && cur.sessions) notes.push(["good", `Semana más ligera (${signed(change)}): perfecto si era de descarga.`]);
    else notes.push(["good", `Progresión de carga controlada (${signed(change)}).`]);
  }
  if (cur.sessions >= 3) {
    if (cur.easyPct < 70) notes.push(["warning", `Solo ${cur.easyPct}% del tiempo en zonas suaves. Los mejores resultados llegan con ~80% suave y ~20% intenso.`]);
    else notes.push(["good", `Buena distribución de intensidad: ${cur.easyPct}% suave.`]);
  }
  if (cur.midPct > 35) notes.push(["warning", `${cur.midPct}% en zona 3, la «zona gris»: cansa bastante y aporta poco. Haz lo suave más suave y lo duro más duro.`]);
  if (cur.hard > 3) notes.push(["serious", `${cur.hard} sesiones intensas en 7 días: demasiadas para asimilarlas. Con 2–3 basta.`]);
  if (cur.restDays === 0) notes.push(["serious", "Ningún día de descanso esta semana."]);
  if (cur.monotony && cur.monotony > 2) notes.push(["warning", "Monotonía alta: alterna más los días duros y los suaves."]);
  if (cur.longShare && cur.longShare > 0.4 && cur.sessions >= 3)
    notes.push(["warning", `Tu sesión más larga fue el ${pct(cur.longShare)} del volumen semanal; lo ideal es < 35%.`]);
  if (cur.sleepH && cur.sleepH < 7) notes.push(["warning", `Dormiste ${fmtNum(cur.sleepH)} h de media: con esta carga necesitas 7,5–8 h.`]);
  return notes;
}

function verdictFor(cur: WeekStats, notes: [Tone, string][]): string {
  if (!cur.sessions) return "Semana sin entrenamientos registrados.";
  if (!notes.some(([t]) => t === "warning" || t === "serious")) return "Semana muy bien planteada: carga, intensidad y descanso equilibrados.";
  if (notes.some(([t]) => t === "serious")) return "Semana exigente con puntos de riesgo: prioriza la recuperación los próximos días.";
  return "Buena semana con algunos ajustes pendientes.";
}

/** Últimos 7 días frente a los 7 anteriores. */
export function weeklyReview(days: ScoredDay[]): WeekReview {
  const cur = stats(days.slice(-7));
  const previous = stats(days.slice(-14, -7));
  const change = previous.load ? (cur.load / previous.load - 1) * 100 : null;
  const notes = notesFor(cur, change);
  const avgScore = cur.scores.length ? round(mean(cur.scores)!, 1) : null;
  return { current: cur, previous, loadChange: change, notes, verdict: verdictFor(cur, notes), avgScore };
}
