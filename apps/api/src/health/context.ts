import type { BpReading, Profile, WeightEntry } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { acwrOf } from "../coach/today-plan";
import { actGroup, isHard } from "../coach/classify";
import { addDays, isoDate, mean, pstdev, round, sum, values } from "../common/util";

type N = number | null;
const avgOf = (ds: ScoredDay[], fn: (d: ScoredDay) => number | null | undefined): N => mean(ds.map(fn));

/** Resume los últimos días para que los factores de riesgo no recalculen todo. */
export class HealthCtx {
  readonly age: number | null;
  readonly sex: string | null;
  readonly rhr30: N; readonly rhr7: N; readonly rhr3: N; readonly rhrBase: N;
  readonly hrv30: N; readonly hrv7: N; readonly hrv3: N; readonly hrvBase: N;
  readonly resp30: N; readonly resp3: N; readonly respBase: N;
  readonly sleepH: N; readonly shortNights: N;
  readonly sleepScore3: N; readonly sleepScoreBase: N;
  readonly bedSd: N;
  readonly spo2LowFrac: N; readonly spo2Min: N; readonly spo2Avg: N;
  readonly awakeCount: N; readonly stress30: N; readonly steps: N;
  readonly mvpaWeek: number | null;
  readonly vo2: number | null;
  readonly enduranceHWeek: number;
  readonly bp: [number, number, string] | null;
  readonly bmi: number | null;
  readonly load7: number; readonly loadPrev3w: number | null; readonly monotony: number | null;
  readonly acwr: number | null; readonly restDays14: number; readonly hardLowReady: number;
  readonly easyShare: number | null;
  readonly wearDays: number;

  constructor(readonly days: ScoredDay[], readonly prof: Profile, bp: BpReading[], weights: WeightEntry[]) {
    const d30 = days.slice(-30), d7 = days.slice(-7), d3 = days.slice(-3);
    const base = days.length > 14 ? days.slice(-37, -7) : days.slice(0, -7);
    this.age = prof.age ?? null;
    this.sex = prof.sex ?? null;
    const rhr = (d: ScoredDay) => d.heart.rhr;
    const hrv = (d: ScoredDay) => d.hrv.lastNight;
    const resp = (d: ScoredDay) => d.sleep.avgResp;
    [this.rhr30, this.rhr7, this.rhr3, this.rhrBase] = [d30, d7, d3, base].map((w) => avgOf(w, rhr));
    [this.hrv30, this.hrv7, this.hrv3, this.hrvBase] = [d30, d7, d3, base].map((w) => avgOf(w, hrv));
    [this.resp30, this.resp3, this.respBase] = [d30, d3, base].map((w) => avgOf(w, resp));
    const hours = values(d30.map((d) => (d.sleep.totalS ? d.sleep.totalS / 3600 : null)));
    this.sleepH = mean(hours);
    this.shortNights = hours.length ? hours.filter((h) => h < 6).length / hours.length : null;
    this.sleepScore3 = avgOf(d3, (d) => d.sleep.score);
    this.sleepScoreBase = avgOf(base, (d) => d.sleep.score);
    const starts = values(d30.map((d) => (d.sleep.startMs ? ((d.sleep.startMs / 60000) % 1440 + 720) % 1440 : null)));
    this.bedSd = starts.length >= 7 ? pstdev(starts) : null;
    const lows = values(d30.map((d) => d.sleep.lowestSpo2));
    this.spo2LowFrac = lows.length ? lows.filter((x) => x < 88).length / lows.length : null;
    this.spo2Min = lows.length ? Math.min(...lows) : null;
    this.spo2Avg = avgOf(d30, (d) => d.sleep.avgSpo2 ?? d.spo2.avg);
    this.awakeCount = avgOf(d30, (d) => d.sleep.awakeCount);
    this.stress30 = avgOf(d30, (d) => d.stress.avg);
    this.steps = mean(d30.map((d) => d.daily.steps || null));
    const d28 = days.slice(-28);
    this.mvpaWeek = d28.length ? sum(d28.map((d) => (d.daily.intensityModerate ?? 0) + 2 * (d.daily.intensityVigorous ?? 0))) / 4 : null;
    this.vo2 = [...days].reverse().find((d) => d.training.vo2max)?.training.vo2max ?? null;
    const endurance = ["running", "cycling", "swimming"];
    const endS = sum(days.slice(-84).flatMap((d) => d.activities.filter((a) => endurance.includes(actGroup(a.type))).map((a) => a.durationS)));
    this.enduranceHWeek = endS / 3600 / 12;
    this.bp = HealthCtx.bloodPressure(bp, prof);
    this.bmi = HealthCtx.bodyMass(weights, prof);
    const loads = d28.map((d) => d.dailyLoad);
    this.load7 = sum(loads.slice(-7));
    this.loadPrev3w = loads.length >= 14 ? sum(loads.slice(0, -7)) / 3 : null;
    const sd7 = pstdev(loads.slice(-7));
    this.monotony = loads.length >= 7 && sd7 > 0 ? mean(loads.slice(-7))! / sd7 : null;
    this.acwr = days.length ? acwrOf(days[days.length - 1].training) : null;
    this.restDays14 = days.slice(-14).filter((d) => !d.activities.length).length;
    this.hardLowReady = days.slice(-14).reduce((n, d) => n + d.activities.filter((a) => isHard(a) && (d.readiness.score ?? 100) < 40).length, 0);
    const z = [0, 0, 0, 0, 0];
    d28.forEach((d) => d.activities.forEach((a) => (a.zonesS ?? []).forEach((s, i) => (z[i] += s ?? 0))));
    this.easyShare = sum(z) > 0 ? (z[0] + z[1]) / sum(z) : null;
    this.wearDays = days.filter((d) => d.heart.rhr).length;
  }

  /** Media de las últimas mediciones de Garmin (60 días) o la del perfil. */
  private static bloodPressure(bp: BpReading[], prof: Profile): [number, number, string] | null {
    const since = isoDate(addDays(new Date(), -60));
    const recent = bp.filter((b) => b.date >= since).slice(-6);
    if (recent.length) return [Math.round(mean(recent.map((b) => b.sys))!), Math.round(mean(recent.map((b) => b.dia))!), `media de ${recent.length} mediciones Garmin`];
    if (prof.bpSys && prof.bpDia) return [prof.bpSys, prof.bpDia, "ingresada en tu perfil"];
    return null;
  }

  private static bodyMass(weights: WeightEntry[], prof: Profile): number | null {
    const w = weights[weights.length - 1];
    if (w?.bmi) return w.bmi;
    if (w && prof.heightCm) return round(w.kg / (prof.heightCm / 100) ** 2, 1);
    return prof.bmi ?? null;
  }
}
