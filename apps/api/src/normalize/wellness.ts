import type { BodyBattery, Hrv, Readiness, Sleep } from "@pulso/shared";
import { get, num, round, type Json } from "../common/util";

export function normalizeHrv(raw: Json, sleep: Sleep): Hrv {
  const s = get(raw, "hrvSummary") ?? {};
  const last = num(s.lastNightAvg) ?? sleep.hrv ?? null;
  if (!last) return {};
  return {
    lastNight: last,
    weeklyAvg: num(s.weeklyAvg),
    high5min: num(s.lastNight5MinHigh),
    baselineLow: num(get(s, "baseline", "balancedLow")),
    baselineHigh: num(get(s, "baseline", "balancedUpper")),
    status: s.status ?? null,
  };
}

const FACTORS = {
  sleep: "sleepScore",
  recoveryTime: "recoveryTime",
  acwr: "acwr",
  hrv: "hrv",
  stressHistory: "stressHistory",
  sleepHistory: "sleepHistory",
} as const;

export function normalizeReadiness(raw: Json): Readiness {
  const items = (Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : []).filter((i: Json) => i?.score != null);
  if (!items.length) return {};
  const r = items.reduce((a: Json, b: Json) => (String(b.timestamp ?? b.timestampLocal ?? "") > String(a.timestamp ?? a.timestampLocal ?? "") ? b : a));
  const rec = num(r.recoveryTime);
  const factors: Readiness["factors"] = {};
  const feedback: Readiness["factorFeedback"] = {};
  for (const [key, prefix] of Object.entries(FACTORS) as [keyof typeof FACTORS, string][]) {
    factors[key] = num(r[`${prefix}FactorPercent`]);
    feedback[key] = r[`${prefix}FactorFeedback`] ?? null;
  }
  return {
    score: r.score,
    level: r.level ?? null,
    recoveryTimeH: rec !== null ? round(rec / 60, 1) : null,
    acuteLoad: num(r.acuteLoad),
    factors,
    factorFeedback: feedback,
  };
}

function bbSeries(entry: Json): [number, number][] {
  const descr: Record<string, number> = {};
  for (const d of get<Json[]>(entry, "bodyBatteryValueDescriptorDTOList") ?? []) {
    descr[d?.bodyBatteryValueDescriptorKey] = d?.bodyBatteryValueDescriptorIndex;
  }
  const tsI = descr.timestamp ?? 0;
  const lvI = descr.bodyBatteryLevel;
  const out: [number, number][] = [];
  for (const row of get<Json[]>(entry, "bodyBatteryValuesArray") ?? []) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const val = lvI !== undefined ? row[lvI] : row.slice(1).find((v: unknown) => typeof v === "number" && v >= 0 && v <= 100);
    if (typeof val === "number") out.push([row[tsI], val]);
  }
  return out;
}

export function normalizeBodyBattery(raw: Json, summary: Json): BodyBattery {
  const entry = Array.isArray(raw) ? (raw[0] ?? {}) : (raw ?? {});
  const series = bbSeries(entry);
  const out: BodyBattery = {
    high: num(summary?.bodyBatteryHighestValue),
    low: num(summary?.bodyBatteryLowestValue),
    charged: num(summary?.bodyBatteryChargedValue) ?? num(entry.charged),
    drained: num(summary?.bodyBatteryDrainedValue) ?? num(entry.drained),
    atWake: num(summary?.bodyBatteryAtWakeTime),
    current: num(summary?.bodyBatteryMostRecentValue),
    series,
  };
  if (out.high === null && series.length) {
    const vals = series.map((p) => p[1]);
    Object.assign(out, { high: Math.max(...vals), low: Math.min(...vals), current: vals[vals.length - 1] });
  }
  return out.high !== null ? out : {};
}
