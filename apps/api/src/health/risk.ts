import type { Factor, HealthStatus, Risk } from "@pulso/shared";
import { CRIT, GOOD, NONE, POINTS, SERIOUS, WARN, factor, missing } from "./factor";

/** Combina factores ponderados en un nivel de riesgo (bajo / moderado / elevado / alto). */
export function buildRisk(id: string, name: string, icon: string, intro: string, factors: Factor[]): Risk {
  const known = factors.filter((f) => f.status !== NONE);
  const maxPts = known.reduce((s, f) => s + 3 * f.weight, 0);
  const pts = known.reduce((s, f) => s + POINTS[f.status] * f.weight, 0);
  const ratio = maxPts ? pts / maxPts : 0;
  let level: HealthStatus;
  let label: string;
  if (known.length < 3) [level, label] = [NONE, "Datos insuficientes"];
  else if (ratio < 0.15) [level, label] = [GOOD, "Bajo"];
  else if (ratio < 0.3) [level, label] = [WARN, "Moderado"];
  else if (ratio < 0.5) [level, label] = [SERIOUS, "Elevado"];
  else [level, label] = [CRIT, "Alto"];

  const worst = known.filter((f) => f.status !== GOOD).sort((a, b) => POINTS[b.status] * b.weight - POINTS[a.status] * a.weight);
  const good = known.filter((f) => f.status === GOOD).slice(0, 3).map((f) => f.name.toLowerCase());
  let summary: string;
  if (level === NONE) summary = "Faltan datos para estimarlo. Completa tu perfil y usa el reloj de día y de noche.";
  else if (!worst.length) summary = `No vemos señales de alerta. A tu favor: ${good.join(", ")}.`;
  else {
    summary = `Lo que más pesa: ${worst.slice(0, 2).map((f) => f.name.toLowerCase()).join(", ")}.`;
    if (good.length) summary += ` A tu favor: ${good.slice(0, 2).join(", ")}.`;
  }
  return {
    id, name, icon, intro, level, label, summary, factors,
    index: Math.round(ratio * 100),
    coverage: factors.length ? Math.round((known.length / factors.length) * 100) : 0,
    actions: worst.filter((f) => f.action).slice(0, 3).map((f) => f.action),
    toComplete: factors.filter((f) => f.status === NONE).slice(0, 2).map((f) => f.action),
  };
}

/** Usa el resultado de un riesgo como factor de otro (p. ej. la apnea en la hipertensión). */
export function riskAsFactor(r: Risk, name: string, why: string, action: string, how: string): Factor {
  return r.level === NONE ? missing(name, how) : factor(name, r.label, r.level, why, action);
}
