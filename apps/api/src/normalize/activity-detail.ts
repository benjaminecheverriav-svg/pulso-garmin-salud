import type { ActivityDetail, ExerciseSummary, Lap } from "@pulso/shared";
import { get, num, pstdev, round, type Json } from "../common/util";
import { decoupling, downsample, seriesColumns } from "./activity-series";
import { exerciseName, UNKNOWN_EXERCISE } from "./exercises";

function laps(raw: Json): Lap[] {
  return (get<Json[]>(raw, "splits", "lapDTOs") ?? []).filter(Boolean).map((l, i) => ({
    n: i + 1,
    distM: num(l.distance),
    durS: num(l.duration) ?? num(l.movingDuration),
    speed: num(l.averageMovingSpeed) ?? num(l.averageSpeed),
    hr: num(l.averageHR),
    maxHr: num(l.maxHR),
    elevGain: num(l.elevationGain),
    cadence: num(l.averageRunCadence) ?? num(l.averageBikeCadence),
    power: num(l.averagePower),
    intensity: l.intensityType ?? null,
  }));
}

/** Regularidad del ritmo (CV %) y diferencia 2.ª vs 1.ª mitad (+ = parcial negativo). */
function pacing(ls: Lap[]): Pick<ActivityDetail, "paceCv" | "splitDiff"> {
  const active = ls.filter((l) => l.speed && (l.distM ?? 0) >= 800 && ["ACTIVE", "INTERVAL"].includes(l.intensity ?? "ACTIVE"));
  if (active.length < 3) return {};
  const sp = active.map((l) => l.speed!);
  const m = sp.reduce((a, b) => a + b, 0) / sp.length;
  const half = Math.floor(sp.length / 2);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return { paceCv: round((pstdev(sp) / m) * 100, 1), splitDiff: round((avg(sp.slice(-half)) / avg(sp.slice(0, half)) - 1) * 100, 1) };
}

function weather(w: Json): ActivityDetail["weather"] {
  if (!w || typeof w !== "object" || w.temp == null) return undefined;
  const f2c = (f: unknown) => (typeof f === "number" ? round(((f - 32) * 5) / 9, 1) : null);
  return {
    tempC: f2c(w.temp),
    feelsC: f2c(w.apparentTemp),
    humidity: num(w.relativeHumidity),
    windKmh: typeof w.windSpeed === "number" ? Math.round(w.windSpeed * 1.609) : null,
    desc: get<string>(w, "weatherTypeDTO", "desc") ?? null,
  };
}

function strength(raw: Json): Pick<ActivityDetail, "sets" | "setsInfo"> {
  const sets = new Map<string, ExerciseSummary>();
  const rests: number[] = [];
  let unknown = 0;
  let weighted = 0;
  for (const st of get<Json[]>(raw, "sets", "exerciseSets") ?? []) {
    if (st?.setType === "REST") {
      if (st.duration) rests.push(st.duration);
      continue;
    }
    if (st?.setType !== "ACTIVE") continue;
    const ex = st.exercises?.[0] ?? {};
    const name = exerciseName(ex.name, ex.category);
    if (name === UNKNOWN_EXERCISE) unknown++;
    const e = sets.get(name) ?? { name, sets: 0, reps: 0, maxKg: 0 };
    const w = num(st.weight) ?? 0;
    const kg = w > 500 ? w / 1000 : w;
    if (kg) weighted++;
    sets.set(name, { ...e, sets: e.sets + 1, reps: e.reps + (num(st.repetitionCount) ?? 0), maxKg: Math.max(e.maxKg, round(kg, 1)) });
  }
  if (!sets.size) return {};
  const list = [...sets.values()].sort((a, b) => Number(a.name === UNKNOWN_EXERCISE) - Number(b.name === UNKNOWN_EXERCISE) || b.sets - a.sets);
  const between = rests.slice(0, -1);
  return { sets: list, setsInfo: { unknown, weighted, restAvgS: between.length ? Math.round(between.reduce((a, b) => a + b, 0) / between.length) : null } };
}

export function normalizeActivityDetail(raw: Json, actType = ""): ActivityDetail {
  if (!raw) return {};
  const ls = laps(raw);
  const out: ActivityDetail = ls.length ? { laps: ls, ...pacing(ls) } : {};
  const cols = seriesColumns(raw.details);
  if (cols.t?.length) {
    const usePower = /cycling|biking|ride/.test(actType) && (cols.power ?? []).some(Boolean);
    out.decoupling = decoupling(cols, usePower);
    out.series = downsample(cols);
  }
  const w = weather(raw.weather);
  if (w) out.weather = w;
  return { ...out, ...strength(raw) };
}
