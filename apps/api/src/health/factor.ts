import type { Factor, HealthStatus } from "@pulso/shared";

export const GOOD: HealthStatus = "good";
export const WARN: HealthStatus = "warning";
export const SERIOUS: HealthStatus = "serious";
export const CRIT: HealthStatus = "critical";
export const NONE: HealthStatus = "unknown";

export const POINTS: Record<HealthStatus, number> = { good: 0, warning: 1, serious: 2, critical: 3, unknown: 0 };

export function factor(name: string, value: string, status: HealthStatus, why: string, action = "", weight = 1): Factor {
  return { name, value, status, why, action, weight };
}

/** Factor sin datos: explica cómo conseguirlos. */
export const missing = (name: string, how: string): Factor => factor(name, "Sin datos", NONE, how, how);
