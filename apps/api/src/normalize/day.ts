import type { DayRecord } from "@pulso/shared";
import { num, type Json } from "../common/util";
import { normalizeActivity } from "./activity";
import { normalizeSleep } from "./sleep";
import { normalizeTraining } from "./training";
import { normalizeBodyBattery, normalizeHrv, normalizeReadiness } from "./wellness";

/** Día normalizado, antes de añadir índices, carga y explicaciones. */
export type BaseDay = Omit<DayRecord, "indices" | "dailyLoad" | "story">;

export function normalizeDay(date: string, raw: Json): BaseDay {
  const s = raw?.summary ?? {};
  const sleep = normalizeSleep(raw?.sleep);
  const resp = raw?.respiration ?? {};
  const worn = ["sleepingSeconds", "sedentarySeconds", "activeSeconds", "highlyActiveSeconds"].reduce((a, k) => a + (num(s[k]) ?? 0), 0);
  return {
    date,
    sleep,
    hrv: normalizeHrv(raw?.hrv, sleep),
    readiness: normalizeReadiness(raw?.readiness),
    bodyBattery: normalizeBodyBattery(raw?.body_battery, s),
    stress: {
      avg: num(s.averageStressLevel),
      max: num(s.maxStressLevel),
      restS: num(s.restStressDuration),
      lowS: num(s.lowStressDuration),
      mediumS: num(s.mediumStressDuration),
      highS: num(s.highStressDuration),
    },
    heart: {
      rhr: num(s.restingHeartRate) ?? sleep.rhr ?? null,
      min: num(s.minHeartRate),
      max: num(s.maxHeartRate),
      rhr7d: num(s.lastSevenDaysAvgRestingHeartRate),
    },
    daily: {
      steps: num(s.totalSteps),
      stepGoal: num(s.dailyStepGoal),
      distanceM: num(s.totalDistanceMeters),
      kcalTotal: num(s.totalKilocalories),
      kcalActive: num(s.activeKilocalories),
      intensityModerate: num(s.moderateIntensityMinutes),
      intensityVigorous: num(s.vigorousIntensityMinutes),
      intensityGoalWeek: num(s.intensityMinutesGoal),
      floors: num(s.floorsAscended),
      wornS: worn || null,
    },
    respiration: {
      waking: num(resp.avgWakingRespirationValue) ?? num(s.avgWakingRespirationValue),
      sleep: num(resp.avgSleepRespirationValue) ?? sleep.avgResp ?? null,
    },
    spo2: {
      avg: num(s.averageSpo2) ?? sleep.avgSpo2 ?? null,
      lowest: num(s.lowestSpo2) ?? sleep.lowestSpo2 ?? null,
    },
    training: normalizeTraining(raw?.training_status),
    activities: (Array.isArray(raw?.activities) ? raw.activities : []).filter(Boolean).map(normalizeActivity),
  };
}
