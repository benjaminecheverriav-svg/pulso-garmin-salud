import type { DeviceTip, DeviceUsage } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { actGroup, isHard } from "../coach/classify";
import { mean } from "../common/util";

export const tip = (category: string, priority: DeviceTip["priority"], title: string, why: string, how: string): DeviceTip =>
  ({ category, priority, title, why, how });

/** Cómo usa el reloj la persona en los últimos 30 días (y 8 semanas de actividades). */
export function deviceUsage(days: ScoredDay[]): DeviceUsage {
  const d30 = days.slice(-30);
  const n = d30.length || 1;
  const acts = days.slice(-56).flatMap((d) => d.activities);
  const groups: Record<string, number> = {};
  for (const a of acts) groups[actGroup(a.type)] = (groups[actGroup(a.type)] ?? 0) + 1;
  const worn = mean(d30.map((d) => d.daily.wornS || null));
  return {
    sleepNights: d30.filter((d) => d.sleep.totalS).length / n,
    hrvNights: d30.filter((d) => d.hrv.lastNight).length / n,
    spo2Nights: d30.filter((d) => d.sleep.avgSpo2).length / n,
    wearH: worn !== null ? worn / 3600 : null,
    actsWeek: acts.length / 8,
    groups,
    withZones: acts.length ? acts.filter((a) => a.zonesS).length / acts.length : null,
    runsWithPower: acts.filter((a) => actGroup(a.type) === "running" && a.avgPower).length,
    ridesWithPower: acts.filter((a) => actGroup(a.type) === "cycling" && a.avgPower).length,
    hardSessions: acts.filter(isHard).length,
  };
}
