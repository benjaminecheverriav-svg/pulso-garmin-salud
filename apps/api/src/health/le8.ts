import type { Le8, Le8Component } from "@pulso/shared";
import { fmtNum, mean } from "../common/util";
import type { HealthCtx } from "./context";

/** Puntuaciones oficiales de la AHA (Life's Essential 8) por componente. */
const activityScore = (m: number) => (m >= 150 ? 100 : m >= 120 ? 90 : m >= 90 ? 80 : m >= 60 ? 60 : m >= 30 ? 40 : m > 0 ? 20 : 0);
const sleepScore = (h: number) =>
  h >= 7 && h < 9 ? 100 : h >= 9 && h < 10 ? 90 : h >= 6 && h < 7 ? 70 : (h >= 5 && h < 6) || h >= 10 ? 40 : h >= 4 ? 20 : 0;
const bmiScore = (b: number) => (b < 25 ? 100 : b < 30 ? 70 : b < 35 ? 30 : b < 40 ? 15 : 0);
const bpScore = (s: number, d: number) => (s < 120 && d < 80 ? 100 : s < 130 && d < 80 ? 75 : s < 140 && d < 90 ? 50 : s < 160 && d < 100 ? 25 : 0);
const lipidScore = (nh: number) => (nh < 130 ? 100 : nh < 160 ? 60 : nh < 190 ? 40 : nh < 220 ? 20 : 0);
const SMOKE: Record<string, number> = { nunca: 100, ex5: 75, ex1: 50, reciente: 25, actual: 0 };
const DIET = [["Muy mala", 0], ["Mala", 25], ["Regular", 50], ["Buena", 80], ["Excelente", 100]] as const;

export function le8(c: HealthCtx): Le8 {
  const p = c.prof;
  const comps: Le8Component[] = [];
  const add = (key: string, name: string, score: number | null, value: string, source: string, tip = "") =>
    comps.push({ key, name, score, value, source, tip });

  if (c.mvpaWeek !== null) add("activity", "Actividad física", activityScore(c.mvpaWeek), `${Math.round(c.mvpaWeek)} min/sem`, "reloj");
  if (c.sleepH) add("sleep", "Sueño", sleepScore(c.sleepH), `${fmtNum(c.sleepH)} h`, "reloj");
  if (c.bmi) add("bmi", "Peso (IMC)", bmiScore(c.bmi), fmtNum(c.bmi), "reloj/perfil");
  else add("bmi", "Peso (IMC)", null, "—", "falta", "Registra peso y altura.");
  if (c.bp) {
    const [s, d] = c.bp;
    add("bp", "Presión arterial", Math.max(0, bpScore(s, d) - (p.bpMeds ? 20 : 0)), `${s}/${d}`, "Garmin/perfil");
  } else add("bp", "Presión arterial", null, "—", "falta", "Mide tu presión y regístrala.");
  if (p.smoking) add("nicotine", "Tabaco", SMOKE[p.smoking] ?? null, p.smoking, "perfil");
  else add("nicotine", "Tabaco", null, "—", "falta", "Indícalo en tu Perfil.");
  if (p.nonHdl) add("lipids", "Colesterol", Math.max(0, lipidScore(p.nonHdl) - (p.cholMeds ? 20 : 0)), `${Math.round(p.nonHdl)} mg/dL`, "perfil");
  else add("lipids", "Colesterol", null, "—", "falta", "Anota tu colesterol no-HDL (total − HDL).");
  if (p.diabetes) {
    const a = p.a1c ?? 8;
    add("glucose", "Glucosa", a < 7 ? 40 : a < 8 ? 30 : a < 9 ? 20 : a < 10 ? 10 : 0, `diabetes · HbA1c ${p.a1c ?? "—"}`, "perfil");
  } else if (p.glucose || p.a1c) {
    const pre = (p.glucose ?? 0) >= 100 || (p.a1c ?? 0) >= 5.7;
    add("glucose", "Glucosa", pre ? 60 : 100, `${p.glucose ?? "—"} mg/dL`, "perfil");
  } else add("glucose", "Glucosa", null, "—", "falta", "Anota tu glucosa en ayunas.");
  if (p.diet !== null && p.diet !== undefined && DIET[p.diet]) add("diet", "Alimentación", DIET[p.diet][1], DIET[p.diet][0], "perfil");
  else add("diet", "Alimentación", null, "—", "falta", "Autoevalúa tu dieta en el Perfil.");

  const scores = comps.map((x) => x.score).filter((s): s is number => s !== null);
  const total = scores.length ? Math.round(mean(scores)!) : null;
  const level = total === null ? null : total >= 80 ? "Alta" : total >= 50 ? "Moderada" : "Baja";
  return { score: total, level, components: comps, complete: scores.length, of: 8 };
}
