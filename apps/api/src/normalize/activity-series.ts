import type { ActivitySeries } from "@pulso/shared";
import { get, round, type Json } from "../common/util";

type Columns = Partial<Record<"t" | "hr" | "speed" | "elev" | "power" | "ts", (number | null)[]>>;

const KEYS: [keyof Columns, string][] = [
  ["t", "sumDuration"], ["hr", "directHeartRate"], ["speed", "directSpeed"], ["elev", "directElevation"],
  ["power", "directPower"], ["ts", "directTimestamp"],
];

/** Convierte metricDescriptors + activityDetailMetrics en columnas por nombre. */
export function seriesColumns(raw: Json): Columns {
  const desc: Record<string, number> = {};
  for (const m of get<Json[]>(raw, "metricDescriptors") ?? []) desc[m?.key] = m?.metricsIndex;
  const rows: Json[] = (get<Json[]>(raw, "activityDetailMetrics") ?? []).map((r) => r?.metrics);
  const cols: Columns = {};
  for (const [name, key] of KEYS) {
    const idx = desc[key];
    if (idx !== undefined) cols[name] = rows.map((r) => (Array.isArray(r) && idx < r.length ? r[idx] : null));
  }
  if (!cols.t && cols.ts?.[0]) {
    const t0 = cols.ts[0];
    cols.t = cols.ts.map((x) => (x ? (x - t0) / 1000 : null));
  }
  return cols;
}

/** Desacople aeróbico (Pa:HR): pérdida de eficiencia entre la 1.ª y la 2.ª mitad, en %. */
export function decoupling(cols: Columns, usePower: boolean): number | null {
  const out = (usePower ? cols.power : cols.speed) ?? [];
  const hr = cols.hr ?? [];
  const t = cols.t ?? [];
  let pts: [number, number, number][] = [];
  t.forEach((ti, i) => {
    const h = hr[i];
    const o = out[i];
    if (ti !== null && h && o && h > 60 && o > (usePower ? 20 : 1.0)) pts.push([ti, h, o]);
  });
  if (pts.length < 40) return null;
  pts = pts.slice(Math.floor(pts.length / 10)); // descarta el calentamiento
  const mid = pts[0][0] + (pts[pts.length - 1][0] - pts[0][0]) / 2;
  const a = pts.filter((p) => p[0] < mid);
  const b = pts.filter((p) => p[0] >= mid);
  if (a.length < 10 || b.length < 10) return null;
  const ef = (xs: typeof pts) => xs.reduce((s, p) => s + p[2], 0) / xs.reduce((s, p) => s + p[1], 0);
  return round(((ef(a) - ef(b)) / ef(a)) * 100, 1);
}

/** Reduce la serie a ~200 puntos para los gráficos. */
export function downsample(cols: Columns): ActivitySeries {
  const n = cols.t?.length ?? 0;
  const step = Math.max(1, Math.ceil(n / 200));
  const pick = (xs?: (number | null)[]) => xs?.filter((_, i) => i % step === 0);
  return { t: pick(cols.t) ?? [], hr: pick(cols.hr), speed: pick(cols.speed), elev: pick(cols.elev), power: pick(cols.power) };
}
