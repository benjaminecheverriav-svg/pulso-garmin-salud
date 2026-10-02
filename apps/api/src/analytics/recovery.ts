import type { Indices } from "@pulso/shared";
import { clamp, pstdev, round, values } from "../common/util";
import type { BaseDay } from "../normalize/day";

const BASELINE_DAYS = 30;

type Baseline = { mean: number; sd: number } | null;

function baseline(xs: (number | null | undefined)[], floor: number): Baseline {
  const v = values(xs);
  if (v.length < 4) return null;
  return { mean: v.reduce((a, b) => a + b, 0) / v.length, sd: Math.max(pstdev(v), floor) };
}

export const dayHrv = (d: BaseDay): number | null => d.hrv.lastNight ?? d.sleep.hrv ?? null;
export const dayRhr = (d: BaseDay): number | null => d.sleep.rhr ?? d.heart.rhr ?? null;
const dayResp = (d: BaseDay): number | null => d.sleep.avgResp ?? d.respiration.sleep ?? null;

/**
 * Recuperación (0–100): 50 % VFC (z-score del logaritmo frente a 30 días),
 * 20 % FC en reposo (z invertido) y 30 % rendimiento del sueño,
 * con penalización si la respiración nocturna sube más de 1 desviación.
 */
export function recoveryFor(
  days: BaseDay[],
  i: number,
  sleepPerf: number | null,
): { recovery: number | null; contributors: Indices["contributors"] } {
  const window = days.slice(Math.max(0, i - BASELINE_DAYS), i);
  const d = days[i];
  const hrv = dayHrv(d);
  const rhr = dayRhr(d);
  const resp = dayResp(d);
  const bHrv = baseline(window.map(dayHrv).filter((x): x is number => !!x).map(Math.log), 0.06);
  if (!hrv || !bHrv) return { recovery: null, contributors: {} };
  const bRhr = baseline(window.map(dayRhr), 1.5);
  const bResp = baseline(window.map(dayResp), 0.4);

  const zHrv = (Math.log(hrv) - bHrv.mean) / bHrv.sd;
  const hrvScore = clamp(50 + 30 * zHrv, 0, 100);
  const zRhr = rhr && bRhr ? (rhr - bRhr.mean) / bRhr.sd : null;
  const rhrScore = zRhr !== null ? clamp(50 - 30 * zRhr, 0, 100) : 50;
  const zResp = resp && bResp ? (resp - bResp.mean) / bResp.sd : null;
  const respPenalty = zResp !== null ? 8 * Math.max(0, zResp - 1) : 0;
  const recovery = Math.round(clamp(0.5 * hrvScore + 0.2 * rhrScore + 0.3 * (sleepPerf ?? 70) - respPenalty, 1, 99));

  return {
    recovery,
    contributors: {
      hrv: { value: hrv, baseline: Math.round(Math.exp(bHrv.mean)), z: round(zHrv, 2), score: Math.round(hrvScore) },
      rhr: { value: rhr, baseline: bRhr ? round(bRhr.mean, 1) : null, z: zRhr !== null ? round(zRhr, 2) : null, score: Math.round(rhrScore) },
      resp: { value: resp, baseline: bResp ? round(bResp.mean, 1) : null, z: zResp !== null ? round(zResp, 2) : null },
      sleep: { value: sleepPerf },
    },
  };
}
