import type { Indices } from "@pulso/shared";
import { clamp, pstdev, values } from "../common/util";
import type { BaseDay } from "../normalize/day";
import { recoveryFor } from "./recovery";
import { activityTrimp, strainFromTrimp, strainTarget } from "./strain";

export type ScoredDay = BaseDay & { indices: Indices; dailyLoad: number };

/** Añade a cada día los índices de Recuperación, Esfuerzo y Sueño, y la carga. */
export function scoreDays(input: BaseDay[]): ScoredDay[] {
  const days = [...input].sort((a, b) => a.date.localeCompare(b.date));
  let prevStrain: number | null = null;
  let prevNeed: number | null = null;
  let prevSleepMin: number | null = null;
  const out: ScoredDay[] = [];

  days.forEach((d, i) => {
    // --- Esfuerzo del día: actividades + carga base por movimiento diario
    let actTrimp = 0;
    let actSteps = 0;
    const activities = d.activities.map((a) => {
      const t = activityTrimp(a);
      actTrimp += t;
      actSteps += a.steps ?? 0;
      return { ...a, strain: strainFromTrimp(t) };
    });
    const steps = d.daily.steps ?? 0;
    const dayTrimp = actTrimp + (steps ? 40 + (Math.max(steps - actSteps, 0) / 1000) * 4 : 0);
    const strain = steps || activities.length ? strainFromTrimp(dayTrimp) : null;

    // --- Necesidad y rendimiento del sueño
    let need = d.sleep.needMin ?? 0;
    if (!need) {
      need = 450 + (prevStrain ? (prevStrain / 21) * 50 : 0);
      if (prevNeed && prevSleepMin) need += clamp((prevNeed - prevSleepMin) * 0.5, 0, 60);
    }
    const sleepMin = d.sleep.totalS ? d.sleep.totalS / 60 : null;
    const sleepPerf = sleepMin ? Math.round(clamp((sleepMin / need) * 100, 0, 100)) : null;
    const debt = prevNeed && prevSleepMin ? Math.max(0, prevNeed - prevSleepMin) : 0;

    const { recovery, contributors } = recoveryFor(days, i, sleepPerf);
    out.push({
      ...d,
      activities,
      dailyLoad: Math.round(activities.reduce((s, a) => s + (a.load ?? 0), 0)),
      indices: {
        recovery,
        strain,
        strainTarget: strainTarget(recovery),
        trimp: Math.round(dayTrimp),
        sleepPerformance: sleepPerf,
        sleepNeedMin: Math.round(need),
        sleepDebtMin: Math.round(debt),
        sleepConsistency: consistency(days, i),
        contributors,
      },
    });
    prevStrain = strain;
    prevNeed = need;
    prevSleepMin = sleepMin;
  });
  fillLoad(out);
  return out;
}

/** Variación de la hora de acostarse y levantarse en las últimas 4 noches. */
function consistency(days: BaseDay[], i: number): number | null {
  const win = days.slice(Math.max(0, i - 3), i + 1);
  const minute = (ms: number | null | undefined, shift: number) => (ms ? ((ms / 60000) % 1440 + shift) % 1440 : null);
  const starts = values(win.map((w) => minute(w.sleep.startMs, 720)));
  const ends = values(win.map((w) => minute(w.sleep.endMs, 0)));
  if (starts.length < 3 || ends.length < 3) return null;
  return Math.round(clamp(100 - ((pstdev(starts) + pstdev(ends)) / 2) * 0.9, 0, 100));
}

/** Si Garmin no dio carga aguda/crónica, la estimamos (EWMA 7 y 28 días) tras 3 semanas de datos. */
function fillLoad(days: ScoredDay[]): void {
  let acute: number | null = null;
  let chronic: number | null = null;
  days.forEach((d, i) => {
    const load = d.dailyLoad;
    acute = acute === null ? load : acute + (2 / 8) * (load - acute);
    chronic = chronic === null ? load : chronic + (2 / 29) * (load - chronic);
    if (d.training.acute == null && i >= 20) {
      d.training = { ...d.training, acuteEst: Math.round(acute * 7), chronicEst: Math.round(chronic * 7) };
    }
  });
}
