import type { Activity } from "@pulso/shared";
import { round } from "../common/util";

/** TRIMP → escala 0–21: 21 · (1 − e^(−TRIMP/190)). */
const STRAIN_K = 190;
const ZONE_WEIGHTS = [1, 2, 3, 4, 5]; // TRIMP de Edwards

export function trimpFromZones(zones?: number[] | null): number | null {
  if (!zones?.length) return null;
  return zones.reduce((acc, s, i) => acc + ZONE_WEIGHTS[i] * (s / 60), 0);
}

/** Sin zonas de FC, la carga de Garmin está en una escala parecida al TRIMP. */
export const activityTrimp = (a: Activity): number => trimpFromZones(a.zonesS) ?? a.load ?? 0;

export const strainFromTrimp = (trimp: number): number => round(21 * (1 - Math.exp(-Math.max(trimp, 0) / STRAIN_K)), 1);

/** Esfuerzo recomendado según la recuperación (verde / amarillo / rojo). */
export function strainTarget(recovery: number | null): [number, number] {
  if (recovery === null) return [10, 14];
  if (recovery >= 67) return [14, 18];
  if (recovery >= 34) return [10, 14];
  return [5, 10];
}
