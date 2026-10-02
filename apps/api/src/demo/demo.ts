import type { Activity, BpReading, Performance, WeightEntry } from "@pulso/shared";
import { addDays, clamp, isoDate, mean, round, weekday } from "../common/util";
import type { BaseDay } from "../normalize/day";
import { WEEK_PLAN, demoActivity } from "./demo-activity";
import { demoDetail } from "./demo-detail";
import { demoSleep } from "./demo-sleep";
import { demoBodyBattery, demoReadiness, demoStress, demoTraining } from "./demo-wellness";
import { Rng } from "./rng";

export interface DemoData { days: BaseDay[]; perf: Performance; bp: BpReading[]; weights: WeightEntry[] }

const lastMean = (out: BaseDay[], n: number, fn: (d: BaseDay) => number | null | undefined, def: number) =>
  mean(out.slice(-n).map(fn)) ?? def;

/** 120 días de datos ficticios realistas: bloques de 3 semanas de carga + 1 de descarga. */
export function generateDemo(nDays = 120): DemoData {
  const rng = new Rng(8);
  const today = new Date();
  const out: BaseDay[] = [];
  let fatigue = 0.3, fitness = 49, acute = 300, chronic = 300, bbPrevEnd = 35;
  for (let i = nDays - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const weekIdx = Math.floor((nDays - 1 - i) / 7);
    const deload = weekIdx % 4 === 3;
    let plan = WEEK_PLAN[weekday(date)];
    if (plan && rng.random() < 0.08) plan = null;

    const { sleep, wakeMs, hrv, rhr } = demoSleep(rng, date, fatigue);
    const weeklyHrv = out.length ? lastMean(out, 6, (x) => x.hrv.lastNight, hrv) : hrv;
    const factor = deload ? 0.7 : 1 + 0.05 * (weekIdx % 4);
    const acts: Activity[] = plan ? [demoActivity(rng, date, plan, factor, fatigue, fitness)] : [];
    const act = acts[0];
    for (const a of acts) a.detail = demoDetail(a);
    const loadToday = act?.load ?? 0;
    const steps = Math.round(clamp(rng.gauss(8500, 2200), 3500, 16000)) + (act?.steps ?? 0);
    acute = Math.max(acute + (loadToday - acute / 7) * 0.9, 50);
    chronic += (loadToday - chronic / 7) * 0.25;
    fatigue = clamp(fatigue * 0.78 + loadToday / 520 + rng.gauss(0, 0.02) - (deload ? 0.08 : 0), 0.05, 0.95);
    fitness += (loadToday - 60) * 0.0007;

    const bodyBattery = demoBodyBattery(rng, date, i === 0, bbPrevEnd, wakeMs, sleep.score!, fatigue, act);
    bbPrevEnd = bodyBattery.current!;
    const acwr = round(acute / Math.max(chronic, 1), 2);
    const prevVo2 = out.length > 7 ? (out[out.length - 7].training.vo2max ?? fitness) : fitness;
    const phrase = deload ? "RECOVERY_1" : acwr > 1.5 ? "OVERREACHING_1" : fitness > prevVo2 + 0.1 ? "PRODUCTIVE_2" : "MAINTAINING_1";
    const z = act?.zonesS ?? [];
    out.push({
      date: isoDate(date),
      sleep: { ...sleep, bbChange: bodyBattery.atWake! - (out.length ? (out[out.length - 1].bodyBattery.current ?? 35) : 35) },
      hrv: { lastNight: Math.round(hrv), weeklyAvg: Math.round(weeklyHrv), high5min: Math.round(hrv * 1.35), baselineLow: 52, baselineHigh: 70,
        status: weeklyHrv >= 52 && weeklyHrv <= 70 ? "BALANCED" : weeklyHrv > 70 ? "UNBALANCED" : "LOW" },
      readiness: { ...demoReadiness(rng, { sleepScore: sleep.score!, loadToday, fatigue, hrv, weeklyHrv, acwr,
        sleepHistory: lastMean(out, 3, (x) => x.sleep.score, sleep.score!) }), acuteLoad: Math.round(acute) },
      bodyBattery,
      stress: demoStress(rng, fatigue),
      heart: { rhr, min: rhr - 3, max: act?.maxHr ?? rng.int(115, 140), rhr7d: Math.round(lastMean(out, 7, (x) => x.heart.rhr, rhr)) },
      daily: {
        steps, stepGoal: 10000, distanceM: steps * 0.78, kcalTotal: 1850 + (act?.kcal ?? 0) + Math.round(steps * 0.04),
        kcalActive: (act?.kcal ?? 0) + Math.round(steps * 0.04),
        intensityModerate: act ? Math.round(((z[1] ?? 0) + (z[2] ?? 0)) / 60) : rng.int(0, 15),
        intensityVigorous: act ? Math.round(((z[3] ?? 0) + (z[4] ?? 0)) / 60) : 0,
        intensityGoalWeek: 150, floors: rng.int(3, 18), wornS: Math.round(rng.uniform(21.5, 23.5) * 3600),
      },
      respiration: { waking: round((sleep.avgResp ?? 14) + 1.8, 1), sleep: sleep.avgResp },
      spo2: { avg: Math.round(clamp(rng.gauss(95, 1.2), 90, 99)), lowest: sleep.lowestSpo2 },
      training: demoTraining(rng, acute, chronic, fitness, phrase),
      activities: acts,
    });
  }
  return { days: out, perf: demoPerformance(rng, out, today), bp: demoBp(today), weights: demoWeights(today) };
}

function demoPerformance(rng: Rng, days: BaseDay[], today: Date): Performance {
  const vo2 = days[days.length - 1].training.vo2max ?? 50;
  const fiveK = 1200 * (50 / vo2) ** 1.05;
  return {
    race: { "5k": fiveK, "10k": fiveK * 2.085, half: fiveK * 4.62, marathon: fiveK * 9.75 },
    endurance: { score: 6840, classification: 4,
      history: Array.from({ length: 13 }, (_, k) => [isoDate(addDays(today, -7 * (12 - k))), 6300 + k * 45 + rng.int(-60, 60)] as [string, number]) },
    hill: { score: 62, strength: 58, endurance: 66 },
    fitnessAge: { fitnessAge: 24, chronological: 31, achievable: 22 },
    lactate: { hr: 172, speedMs: 3.85, ftp: 262 },
    devices: ["fēnix 8 AMOLED 47 mm (demo)"],
  };
}

const demoBp = (today: Date): BpReading[] =>
  [[121, 77], [124, 79], [118, 75], [123, 78], [120, 76], [122, 78]]
    .map(([sys, dia], i) => ({ date: isoDate(addDays(today, -4 * i)), time: "07:30", sys, dia, pulse: 50 + i }))
    .reverse();

const demoWeights = (today: Date): WeightEntry[] =>
  Array.from({ length: 9 }, (_, k) => ({ date: isoDate(addDays(today, -7 * (8 - k))), kg: round(73.4 - 0.12 * k, 1), fatPct: 14.5 }));
