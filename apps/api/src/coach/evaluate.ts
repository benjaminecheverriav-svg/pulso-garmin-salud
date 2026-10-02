import type { Activity, CoachEval, Performance, Profile, SessionKind, Zones } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { clamp, median, round } from "../common/util";
import { actGroup, PURPOSE, sessionKind, STRENGTH_PURPOSE } from "./classify";
import { ruleDecoupling, rulePacing, ruleStrength, ruleWeather } from "./eval-detail-rules";
import { ruleEasyZones, ruleEfficiency, ruleLoad, ruleMissingHr, ruleReadiness, ruleTrainingEffect } from "./eval-rules";
import { type EvalInput, newAcc } from "./eval-types";
import { personalZones } from "./zones";

const RULES = [
  ruleReadiness, ruleEasyZones, ruleTrainingEffect, ruleLoad, ruleEfficiency,
  ruleDecoupling, rulePacing, ruleWeather, ruleStrength, ruleMissingHr,
];

const NEXT: Record<SessionKind, string> = {
  fuerza: "Deja ~48 h antes de volver a trabajar los mismos grupos musculares; mañana puedes hacer cardio suave.",
  intensa: "Mañana: día suave o descanso.",
  larga: "Mañana: suave; pasado mañana ya puedes meter calidad.",
  suave: "Puedes hacer calidad en tu próxima sesión si la disposición es buena.",
};

const grade = (s: number): string => (s >= 8.5 ? "Excelente" : s >= 7 ? "Buena" : s >= 5 ? "Mejorable" : "Arriesgada");

function recoveryHours(a: Activity, kind: SessionKind): number | null {
  if (kind === "fuerza") return (a.durationS ?? 0) > 2400 ? 48 : 24;
  if (!a.teAerobic) return null;
  return Math.round(Math.max(a.teAerobic - 1.5, 0) * 12 + (a.teAnaerobic ?? 0) * 6);
}

export function evaluate(a: Activity, day: ScoredDay, prev: ScoredDay | null, past: Activity[], zones: Zones): CoachEval {
  const durs = past.map((p) => p.durationS).filter((x): x is number => !!x);
  const kind = sessionKind(a, durs.length >= 3 ? median(durs) : null);
  const input: EvalInput = { a, day, prev, past, zones, kind, group: actGroup(a.type) };
  const acc = newAcc();
  for (const rule of RULES) rule(input, acc);
  const score = round(clamp(acc.score, 1, 10), 1);
  return {
    score,
    grade: grade(score),
    kind,
    purpose: kind === "fuerza" ? STRENGTH_PURPOSE : (PURPOSE[a.teLabel ?? ""] ?? ""),
    good: acc.good,
    improve: acc.improve,
    context: acc.context,
    efficiency: acc.efficiency,
    recoveryH: recoveryHours(a, kind),
    next: NEXT[kind],
  };
}

/** Evalúa todas las actividades comparándolas con las 40 anteriores del mismo deporte. */
export function evaluateAll(days: ScoredDay[], prof: Profile, perf: Performance): void {
  const zones = personalZones(prof, perf);
  const history = new Map<string, Activity[]>();
  days.forEach((d, i) => {
    for (const a of d.activities) {
      const group = actGroup(a.type);
      const past = (history.get(group) ?? []).slice(-40);
      a.coach = evaluate(a, d, i ? days[i - 1] : null, past, zones);
      history.set(group, [...(history.get(group) ?? []), a]);
    }
  });
}
