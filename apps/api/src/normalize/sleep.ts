import type { Sleep, SleepLevel, SleepStage } from "@pulso/shared";
import { get, num, type Json } from "../common/util";

const STAGES: Record<number, SleepStage> = { 0: "deep", 1: "light", 2: "rem", 3: "awake" };

/** "2024-05-01T22:31:00.0" (GMT) → epoch ms. */
export function gmtMs(s: unknown): number | null {
  if (typeof s !== "string" || !s) return null;
  const t = Date.parse(s.replace("Z", "").slice(0, 19) + "Z");
  return Number.isNaN(t) ? null : t;
}

function levels(raw: Json): SleepLevel[] {
  const out: SleepLevel[] = [];
  for (const lv of get<Json[]>(raw, "sleepLevels") ?? []) {
    const start = gmtMs(lv?.startGMT);
    const end = gmtMs(lv?.endGMT);
    const stage = STAGES[Math.round(Number(lv?.activityLevel))];
    if (start && end && stage) out.push({ start, end, stage });
  }
  return out;
}

export function normalizeSleep(raw: Json): Sleep {
  const dto = get(raw, "dailySleepDTO") ?? {};
  const scores = dto.sleepScores ?? {};
  const total = num(dto.sleepTimeSeconds);
  if (!total) return {};
  const q = (k: string) => get<string>(scores, k, "qualifierKey") ?? null;
  const v = (k: string) => num(get(scores, k, "value"));
  return {
    score: v("overall"),
    qualifier: q("overall"),
    totalS: total,
    deepS: num(dto.deepSleepSeconds),
    lightS: num(dto.lightSleepSeconds),
    remS: num(dto.remSleepSeconds),
    awakeS: num(dto.awakeSleepSeconds),
    napS: num(dto.napTimeSeconds),
    startMs: num(dto.sleepStartTimestampGMT),
    endMs: num(dto.sleepEndTimestampGMT),
    needMin: num(get(dto, "sleepNeed", "actual")),
    avgResp: num(dto.averageRespirationValue),
    avgSpo2: num(dto.averageSpO2Value),
    lowestSpo2: num(dto.lowestSpO2Value),
    avgHr: num(dto.avgHeartRate),
    stress: num(dto.avgSleepStress),
    awakeCount: num(dto.awakeCount),
    rhr: num(get(raw, "restingHeartRate")),
    hrv: num(get(raw, "avgOvernightHrv")),
    bbChange: num(get(raw, "bodyBatteryChange")),
    subscores: {
      duration: q("totalDuration"),
      stress: q("stress"),
      awakeCount: q("awakeCount"),
      rem: q("remPercentage"),
      remPct: v("remPercentage"),
      light: q("lightPercentage"),
      lightPct: v("lightPercentage"),
      deep: q("deepPercentage"),
      deepPct: v("deepPercentage"),
      restlessness: q("restlessness"),
    },
    levels: levels(raw),
  };
}
