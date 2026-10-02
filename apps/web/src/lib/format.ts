/** Formato de números, duraciones y fechas en español. */

export type Num = number | null | undefined;

export const nf = (v: Num, d = 0): string =>
  v === null || v === undefined || Number.isNaN(v)
    ? "—"
    : Number(v).toLocaleString("es", { maximumFractionDigits: d, minimumFractionDigits: d });

export const pad = (n: number): string => String(n).padStart(2, "0");

export function dur(s: Num): string {
  if (s == null) return "—";
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`;
}

export const hm = (s: Num): string => (s == null ? "—" : `${Math.floor(s / 3600)}:${pad(Math.round((s % 3600) / 60))}`);

export const clock = (ms: Num): string =>
  ms ? new Date(ms).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—";

export function raceTime(s: Num): string {
  if (!s) return "—";
  const t = Math.round(s);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** m/s → "5:12 /km". */
export function pace(ms: Num): string {
  if (!ms) return "—";
  const spk = 1000 / ms;
  return `${Math.floor(spk / 60)}:${pad(Math.round(spk % 60))} /km`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const shortDate = (s: string): string => parseDate(s).toLocaleDateString("es", { day: "numeric", month: "short" });
export const longDate = (s: string): string => parseDate(s).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
export const weekdayShort = (s: string): string => parseDate(s).toLocaleDateString("es", { weekday: "short" });
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export function avg(arr: Num[]): number | null {
  const v = arr.filter((x): x is number => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export const sum = (arr: Num[]): number => arr.reduce<number>((a, b) => a + (b ?? 0), 0);
export const signed = (v: Num, d = 0): string => (v == null ? "—" : (v > 0 ? "+" : "") + nf(v, d));
export const pctDiff = (v: Num, base: Num): number | null => (v != null && base ? ((v - base) / base) * 100 : null);

/** Lunes de la semana de una fecha AAAA-MM-DD (para agrupar por semanas). */
export function mondayOf(s: string): string {
  const d = parseDate(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const fmtSync = (s: string | null): string =>
  s ? new Date(s).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
