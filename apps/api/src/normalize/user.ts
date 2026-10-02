import type { BpReading, GarminProfile, WeightEntry } from "@pulso/shared";
import { get, num, round, type Json } from "../common/util";

export function normalizeUser(raw: Json): GarminProfile {
  const ud = get(raw, "userData") ?? {};
  const birth: string | null = ud.birthDate ?? null;
  let age: number | null = null;
  if (birth) {
    const b = new Date(birth.slice(0, 10));
    const now = new Date();
    age = now.getFullYear() - b.getFullYear() - (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate()) ? 1 : 0);
  }
  const gender = String(ud.gender ?? "").toUpperCase();
  const weight = num(ud.weight);
  return {
    sex: gender === "MALE" ? "M" : gender === "FEMALE" ? "F" : null,
    birthDate: birth,
    age,
    heightCm: num(ud.height),
    weightKg: weight !== null && weight > 500 ? round(weight / 1000, 1) : weight,
    lthr: num(ud.lactateThresholdHeartRate),
  };
}

/** Recorre cualquier estructura y entrega todos los objetos que contiene. */
function* walk(obj: Json): Generator<Json> {
  if (Array.isArray(obj)) for (const v of obj) yield* walk(v);
  else if (obj && typeof obj === "object") {
    yield obj;
    for (const v of Object.values(obj)) yield* walk(v);
  }
}

export function normalizeBp(raw: Json): BpReading[] {
  const out: BpReading[] = [];
  for (const d of walk(raw)) {
    if (!d.systolic || !d.diastolic) continue;
    const ts = String(d.measurementTimestampLocal ?? d.measurementTimestampGMT ?? d.calendarDate ?? "");
    out.push({ date: ts.slice(0, 10), time: ts.slice(11, 16), sys: d.systolic, dia: d.diastolic, pulse: num(d.pulse) });
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function normalizeWeights(raw: Json): WeightEntry[] {
  const out: WeightEntry[] = [];
  for (const d of get<Json[]>(raw, "dateWeightList") ?? []) {
    const w = num(d?.weight);
    if (!w) continue;
    const date = d.calendarDate ?? (typeof d.date === "number" ? new Date(d.date).toISOString().slice(0, 10) : "");
    out.push({ date, kg: w > 500 ? round(w / 1000, 1) : w, bmi: num(d.bmi), fatPct: num(d.bodyFat) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
