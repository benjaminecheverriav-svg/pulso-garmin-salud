/** Utilidades numéricas, de fechas y de acceso seguro a JSON. */

export type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Acceso seguro a estructuras anidadas: get(d, "a", 0, "b"). */
export function get<T = Json>(obj: Json, ...path: (string | number)[]): T | undefined {
  let cur = obj;
  for (const key of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[key];
  }
  return cur === null ? undefined : cur;
}

export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const round = (v: number, d = 0): number => Math.round(v * 10 ** d) / 10 ** d;

export function values(xs: (number | null | undefined)[]): number[] {
  return xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
}

export function mean(xs: (number | null | undefined)[]): number | null {
  const v = values(xs);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Desviación estándar poblacional. */
export function pstdev(xs: number[]): number {
  if (!xs.length) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const sum = (xs: (number | null | undefined)[]): number => values(xs).reduce((a, b) => a + b, 0);

/** Fecha local en formato AAAA-MM-DD. */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export const todayIso = (): string => isoDate(new Date());

/** Lunes = 0 … domingo = 6 (como Python). */
export const weekday = (d: Date): number => (d.getDay() + 6) % 7;

export const fmtNum = (v: number, d = 1): string => v.toFixed(d).replace(".", ",");
