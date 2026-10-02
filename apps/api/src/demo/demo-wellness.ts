import type { Activity, BodyBattery, Readiness, Stress, Training } from "@pulso/shared";
import { clamp, round } from "../common/util";
import type { Rng } from "./rng";

/** Serie de Body Battery cada 15 min: carga hasta despertar, gasta durante el día. */
export function demoBodyBattery(rng: Rng, date: Date, isToday: boolean, prevEnd: number, wakeMs: number, sleepScore: number, fatigue: number, act?: Activity): BodyBattery {
  const atWake = Math.round(clamp(22 + sleepScore * 0.8 - fatigue * 25 + rng.gauss(0, 5), 15, 100));
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = isToday ? Date.now() : start.getTime() + (23 * 60 + 59) * 60000;
  const actStart = act?.start ? new Date(act.start.replace(" ", "T")).getTime() : null;
  const actEnd = actStart && act?.durationS ? actStart + act.durationS * 1000 : null;
  const series: [number, number][] = [];
  let level = prevEnd;
  for (let t = start.getTime(); t <= end; t += 15 * 60000) {
    if (t < wakeMs) level = Math.min(atWake, level + (atWake - level) * 0.12 + 0.3);
    else if (actStart && actEnd && t >= actStart && t <= actEnd) level -= (act!.load ?? 0) / 9 / Math.max((act!.durationS ?? 0) / 900, 1);
    else level -= new Date(t).getHours() < 21 ? rng.uniform(0.4, 1) : 0.3;
    level = clamp(level, 5, 100);
    series.push([t, Math.round(level)]);
  }
  const vals = series.map((p) => p[1]);
  return {
    high: Math.max(...vals), low: Math.min(...vals), atWake, current: vals[vals.length - 1], series,
    charged: Math.max(0, atWake - vals[0]) + rng.int(0, 5), drained: Math.max(...vals) - vals[vals.length - 1],
  };
}

export interface ReadinessInput {
  sleepScore: number; loadToday: number; fatigue: number; hrv: number; weeklyHrv: number; acwr: number; sleepHistory: number;
}

export function demoReadiness(rng: Rng, x: ReadinessInput): Readiness {
  const sleep = Math.round(clamp(x.sleepScore + rng.gauss(0, 3), 0, 100));
  const recTime = Math.round(clamp(x.loadToday * 0.25 + x.fatigue * 20, 0, 72));
  const hrv = Math.round(clamp(60 + (x.hrv - x.weeklyHrv) * 3 + (x.weeklyHrv - 58) * 2, 5, 100));
  const acwr = Math.round(clamp(100 - Math.max(0, x.acwr - 1) * 150, 5, 100));
  const stressHistory = Math.round(clamp(rng.gauss(78, 10), 20, 100));
  const sleepHistory = Math.round(clamp(x.sleepHistory + rng.gauss(0, 5), 10, 100));
  const recoveryTime = Math.round(clamp(100 - recTime * 1.3, 0, 100));
  const score = Math.round(clamp(0.25 * sleep + 0.2 * recoveryTime + 0.15 * acwr + 0.2 * hrv + 0.1 * stressHistory + 0.1 * sleepHistory, 5, 100));
  const level = score >= 95 ? "PRIME" : score >= 75 ? "HIGH" : score >= 50 ? "MODERATE" : score >= 25 ? "LOW" : "POOR";
  return { score, level, recoveryTimeH: recTime, factors: { sleep, recoveryTime, acwr, hrv, stressHistory, sleepHistory }, factorFeedback: {} };
}

export function demoStress(rng: Rng, fatigue: number): Stress {
  const avg = Math.round(clamp(rng.gauss(28 + fatigue * 12, 6), 12, 60));
  const awake = 16 * 3600;
  const restS = Math.round(awake * 0.3);
  const highS = Math.round((awake * avg) / 600);
  const mediumS = Math.round((awake * avg) / 300);
  return { avg, max: Math.min(avg + rng.int(35, 55), 99), restS, lowS: awake - restS - highS - mediumS, mediumS, highS };
}

export function demoTraining(rng: Rng, acute: number, chronic: number, fitness: number, phrase: string): Training {
  const acwr = round(acute / Math.max(chronic, 1), 2);
  const c = (f: number) => Math.round(chronic * f);
  return {
    statusPhrase: phrase, acute: Math.round(acute), chronic: Math.round(chronic), chronicMin: c(0.8), chronicMax: c(1.5),
    acwr, acwrStatus: acwr > 1.5 ? "HIGH" : acwr >= 0.8 ? "OPTIMAL" : "LOW",
    loadLowAerobic: c(1.9), loadHighAerobic: c(1.6), loadAnaerobic: c(0.55),
    targetLowAerobic: [c(1.5), c(2.4)], targetHighAerobic: [c(1.1), c(1.9)], targetAnaerobic: [c(0.3), c(0.9)],
    balancePhrase: "BALANCED", vo2max: round(fitness, 1), vo2maxCycling: round(fitness - 2.5, 1),
    heatAcclimation: rng.int(0, 30), altitudeAcclimation: 520,
  };
}
