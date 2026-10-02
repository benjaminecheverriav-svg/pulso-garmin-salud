import type { DeviceReport, HealthReport, Performance, Profile } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { healthTips } from "./tips-health";
import { trainingTips } from "./tips-training";
import { wearTips } from "./tips-wear";
import { deviceUsage } from "./usage";

const ORDER = { alta: 0, media: 1, baja: 2 } as const;

/** Uso del reloj y consejos de configuración ordenados por prioridad. */
export function buildDevice(days: ScoredDay[], perf: Performance, prof: Profile, health: HealthReport): DeviceReport {
  const usage = deviceUsage(days);
  const tips = [...wearTips(usage), ...trainingTips(usage, perf, prof, days), ...healthTips(health)];
  tips.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  return { usage, tips, devices: perf.devices };
}
