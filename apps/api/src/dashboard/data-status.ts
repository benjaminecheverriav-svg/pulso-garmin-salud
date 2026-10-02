import type { DataStatus, DayRecord } from "@pulso/shared";

/** Qué tan completa está la información, para guiar los primeros días de uso. */
export function dataStatus(days: DayRecord[]): DataStatus {
  const last = days[days.length - 1];
  return {
    firstDay: days[0]?.date ?? null,
    days: days.length,
    wellnessDays: days.filter((d) => d.daily.steps).length,
    sleepNights: days.filter((d) => d.sleep.totalS).length,
    hrvNights: days.filter((d) => d.hrv.lastNight).length,
    activities: days.reduce((n, d) => n + d.activities.length, 0),
    hasVo2: days.some((d) => d.training.vo2max),
    hasReadiness: last?.readiness.score !== undefined,
    hasRecovery: last?.indices.recovery != null,
  };
}
