import type { Activity, ActivityDetail, Lap } from "@pulso/shared";
import { pstdev, round } from "../common/util";
import { decoupling } from "../normalize/activity-series";
import { Rng } from "./rng";

/** Parciales, series de pulso/ritmo y clima de ejemplo (mismo formato que los reales). */
export function demoDetail(a: Activity): ActivityDetail {
  const r = new Rng(Number(a.id) || 1);
  const dur = a.durationS ?? 1800;
  if (a.type === "strength_training") {
    const ex: [string, number, number][] = [["Sentadilla con barra", 30, 70], ["Peso muerto rumano", 30, 60], ["Zancadas", 36, 16], ["Plancha", 3, 0]];
    return { sets: ex.map(([name, reps, maxKg]) => ({ name, sets: 3, reps, maxKg })), setsInfo: { unknown: 0, weighted: 9, restAvgS: 105 } };
  }
  const base = a.avgSpeed ?? 3.2;
  const hard = a.teLabel === "VO2MAX" || a.teLabel === "THRESHOLD";
  const n = Math.floor(dur / 10);
  const drift = hard ? 0.04 : r.uniform(0.02, 0.09);
  const t: number[] = [], hr: number[] = [], speed: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / Math.max(n - 1, 1);
    const rep = hard && Math.floor(f * 12) % 2 === 1 && f > 0.15 && f < 0.85;
    t.push(i * 10);
    speed.push(round(base * (rep ? 1.25 : hard ? 0.85 : 1) * r.uniform(0.96, 1.04), 2));
    hr.push(Math.round((a.avgHr ?? 145) * (0.92 + 0.08 * Math.min(f * 5, 1)) * (1 + drift * f) * (rep ? 1.06 : 1)));
  }
  const step = Math.max(1, Math.ceil(n / 200));
  const pick = <T>(xs: T[]) => xs.filter((_, i) => i % step === 0);
  const out: ActivityDetail = {
    series: { t: pick(t), hr: pick(hr), speed: pick(speed) },
    decoupling: decoupling({ t, hr, speed }, false),
  };
  if (!a.distanceM) return out;
  const km = Math.floor(a.distanceM / 1000);
  const laps: Lap[] = Array.from({ length: km }, (_, k) => {
    const sp = base * (1 + (hard ? 0 : (0.02 * (k - km / 2)) / Math.max(km, 1))) * r.uniform(0.97, 1.03);
    return { n: k + 1, distM: 1000, durS: Math.round(1000 / sp), speed: round(sp, 3), hr: Math.round((a.avgHr ?? 145) + k * 0.6),
      elevGain: r.int(0, 15), cadence: a.cadence, intensity: "ACTIVE" };
  });
  out.laps = laps;
  if (laps.length >= 3) {
    const sp = laps.map((l) => l.speed!);
    const m = sp.reduce((x, y) => x + y, 0) / sp.length;
    const h = Math.floor(sp.length / 2);
    const avg = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
    out.paceCv = round((pstdev(sp) / m) * 100, 1);
    out.splitDiff = round((avg(sp.slice(-h)) / avg(sp.slice(0, h)) - 1) * 100, 1);
  }
  out.weather = { tempC: round(r.uniform(8, 29), 1), feelsC: null, humidity: r.int(35, 80), windKmh: r.int(3, 20),
    desc: r.choice(["Soleado", "Nublado", "Parcialmente nublado"]) };
  return out;
}
