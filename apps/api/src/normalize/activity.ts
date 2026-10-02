import type { Activity } from "@pulso/shared";
import { get, num, type Json } from "../common/util";

export function normalizeActivity(a: Json): Activity {
  const zones = [1, 2, 3, 4, 5].map((i) => num(a[`hrTimeInZone_${i}`]) ?? 0);
  return {
    id: a.activityId ?? null,
    name: a.activityName ?? null,
    type: get<string>(a, "activityType", "typeKey") ?? "other",
    start: a.startTimeLocal ?? null,
    durationS: num(a.duration),
    distanceM: num(a.distance),
    avgHr: num(a.averageHR),
    maxHr: num(a.maxHR),
    kcal: num(a.calories),
    teAerobic: num(a.aerobicTrainingEffect),
    teAnaerobic: num(a.anaerobicTrainingEffect),
    teLabel: a.trainingEffectLabel ?? null,
    load: num(a.activityTrainingLoad),
    avgSpeed: num(a.averageSpeed),
    elevationGain: num(a.elevationGain),
    avgPower: num(a.avgPower),
    cadence: num(a.averageRunningCadenceInStepsPerMinute) ?? num(a.averageBikingCadenceInRevPerMinute),
    steps: num(a.steps),
    zonesS: zones.some((z) => z) ? zones : null,
  };
}
