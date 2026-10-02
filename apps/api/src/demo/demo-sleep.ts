import type { Sleep, SleepLevel } from "@pulso/shared";
import { clamp } from "../common/util";
import type { Rng } from "./rng";

/** Hipnograma plausible: ~5 ciclos, más profundo al inicio y más REM al final. */
function sleepLevels(startMs: number, totalS: number, deepS: number, remS: number, awakeS: number): SleepLevel[] {
  const deepW = [0.32, 0.27, 0.2, 0.13, 0.08];
  const remW = [0.1, 0.16, 0.22, 0.25, 0.27];
  const light = (totalS - deepS - remS) / 5;
  const levels: SleepLevel[] = [];
  let t = startMs;
  for (let c = 0; c < 5; c++) {
    const segs: [SleepLevel["stage"], number][] = [["light", light * 0.55], ["deep", deepS * deepW[c]], ["light", light * 0.45], ["rem", remS * remW[c]]];
    if (c === 1 || c === 3) segs.push(["awake", awakeS * 0.35]);
    if (c === 4) segs.push(["awake", awakeS * 0.3]);
    for (const [stage, dur] of segs) {
      if (dur < 60) continue;
      levels.push({ start: t, end: t + dur * 1000, stage });
      t += dur * 1000;
    }
  }
  return levels;
}

const qual = (v: number, x: number, g: number, f: number) => (v >= x ? "EXCELLENT" : v >= g ? "GOOD" : v >= f ? "FAIR" : "POOR");

/** Noche previa a `date` según la fatiga acumulada. */
export function demoSleep(rng: Rng, date: Date, fatigue: number): { sleep: Sleep; wakeMs: number; hrv: number; rhr: number } {
  const bed = new Date(date);
  bed.setDate(bed.getDate() - 1);
  bed.setHours(23, 0, 0, 0);
  const weekend = date.getDay() === 6 || date.getDay() === 0;
  const bedMs = bed.getTime() + (rng.gauss(10, 28) + (weekend ? 40 : 0)) * 60000;
  const totalH = clamp(rng.gauss(7.3, 0.6) - fatigue * 0.3, 5.2, 9);
  const totalS = Math.round(totalH * 3600);
  const deepS = Math.round(totalS * clamp(rng.gauss(0.19, 0.03), 0.1, 0.28));
  const remS = Math.round(totalS * clamp(rng.gauss(0.22, 0.03), 0.12, 0.3));
  const awakeS = Math.round(rng.uniform(8, 35) * 60);
  const lightS = totalS - deepS - remS;
  const wakeMs = bedMs + (totalS + awakeS) * 1000;
  const score = Math.round(clamp(60 + (totalH - 6) * 11 + (deepS / totalS - 0.15) * 120 - awakeS / 600 + rng.gauss(0, 4), 35, 97));
  const hrv = clamp(rng.gauss(62 - fatigue * 18 + (totalH - 7.2) * 3, 4.5), 30, 95);
  const rhr = Math.round(clamp(rng.gauss(46 + fatigue * 6, 1.3), 40, 60));
  const resp = Math.round(clamp(rng.gauss(14.2 + fatigue * 0.6, 0.35), 12, 18) * 10) / 10;
  const sleep: Sleep = {
    score, qualifier: qual(score, 90, 80, 60),
    totalS, deepS, lightS, remS, awakeS, napS: 0, startMs: bedMs, endMs: wakeMs,
    needMin: Math.round(460 + fatigue * 60), avgResp: resp,
    avgSpo2: Math.round(clamp(rng.gauss(95, 1.2), 90, 99)), lowestSpo2: Math.round(clamp(rng.gauss(91.5, 1.6), 85, 96)),
    avgHr: rhr + 5, stress: Math.round(clamp(rng.gauss(14 + fatigue * 10, 4), 5, 40)), awakeCount: rng.int(0, 4),
    rhr, hrv: Math.round(hrv),
    subscores: {
      duration: qual(totalH, 7.5, 7, 6), stress: fatigue < 0.5 ? "GOOD" : "FAIR", awakeCount: "GOOD",
      rem: "GOOD", remPct: Math.round((remS / totalS) * 100), light: "GOOD", lightPct: Math.round((lightS / totalS) * 100),
      deep: deepS / totalS > 0.2 ? "EXCELLENT" : "GOOD", deepPct: Math.round((deepS / totalS) * 100), restlessness: "GOOD",
    },
    levels: sleepLevels(bedMs, totalS, deepS, remS, awakeS),
  };
  return { sleep, wakeMs, hrv, rhr };
}
