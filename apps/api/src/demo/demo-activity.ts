import type { Activity } from "@pulso/shared";
import { clamp, isoDate, round } from "../common/util";
import type { Rng } from "./rng";

type PlanEntry = [type: string, name: string, minutes: number, zones: number[], teA: number, teAn: number];

/** Semana tipo del demo (0 = lunes). */
export const WEEK_PLAN: Record<number, PlanEntry | null> = {
  0: null,
  1: ["running", "Series 6x800 m", 55, [5, 15, 25, 35, 20], 3.4, 3.6],
  2: ["running", "Rodaje suave", 50, [15, 60, 20, 5, 0], 2.8, 0.3],
  3: ["strength_training", "Fuerza", 45, [40, 40, 15, 5, 0], 1.6, 0.8],
  4: ["running", "Tempo 30'", 60, [5, 15, 30, 45, 5], 3.8, 1.2],
  5: ["cycling", "Bici Z2", 75, [10, 55, 30, 5, 0], 2.7, 0.1],
  6: ["running", "Tirada larga", 105, [5, 45, 40, 10, 0], 3.9, 0.4],
};

const LABELS: Record<string, string> = { "Series 6x800 m": "VO2MAX", "Tempo 30'": "THRESHOLD", "Tirada larga": "BASE" };
const SPEED: Record<string, number> = { running: 3.3, cycling: 8.4, strength_training: 0 };

export function demoActivity(rng: Rng, date: Date, plan: PlanEntry, factor: number, fatigue: number, fitness: number): Activity {
  const [type, name, minutes, profile, teA, teAn] = plan;
  const dur = minutes * 60 * factor * rng.uniform(0.9, 1.1);
  const tot = profile.reduce((a, b) => a + b, 0);
  const zones = profile.map((p) => Math.round((dur * p) / tot));
  const avgHr = Math.round(118 + zones.reduce((s, z, i) => s + z * [0, 12, 26, 38, 50][i], 0) / Math.max(dur, 1));
  const speed = (SPEED[type] + (type === "running" ? (fitness - 49) * 0.03 : 0)) * rng.uniform(0.95, 1.05);
  const load = Math.round(zones.reduce((s, z, i) => s + (z / 60) * [0.6, 1.2, 2.2, 3.4, 4.8][i], 0) * (0.9 + fatigue * 0.2));
  const start = new Date(date);
  start.setHours(date.getDay() >= 1 && date.getDay() <= 5 ? 7 : 8, date.getDay() >= 1 && date.getDay() <= 5 ? 0 : 30, 0, 0);
  start.setMinutes(start.getMinutes() + rng.int(-20, 30));
  const p2 = (n: number) => String(n).padStart(2, "0");
  return {
    id: Number(isoDate(date).replace(/-/g, "")),
    name, type,
    start: `${isoDate(start)} ${p2(start.getHours())}:${p2(start.getMinutes())}:00`,
    durationS: dur,
    distanceM: speed ? speed * dur : null,
    avgHr,
    maxHr: Math.min(avgHr + rng.int(15, 30), 192),
    kcal: Math.round((dur / 60) * (type !== "strength_training" ? 11 : 7)),
    teAerobic: round(clamp(teA * factor + rng.gauss(0, 0.2), 1, 5), 1),
    teAnaerobic: round(clamp(teAn * factor + rng.gauss(0, 0.2), 0, 5), 1),
    teLabel: LABELS[name] ?? (minutes < 55 ? "RECOVERY" : "BASE"),
    load,
    avgSpeed: speed || null,
    elevationGain: type !== "strength_training" ? rng.int(20, 180) : null,
    avgPower: type === "cycling" ? Math.round(rng.gauss(205, 12)) : null,
    cadence: type === "running" ? Math.round(rng.gauss(172, 3)) : type === "cycling" ? Math.round(rng.gauss(88, 3)) : null,
    steps: type === "running" ? Math.round((dur / 60) * 172) : null,
    zonesS: zones,
  };
}
