import { Injectable } from "@nestjs/common";
import { todayIso, type Json } from "../common/util";
import { GarminHttpService } from "./garmin-http.service";

/** Endpoints de Garmin Connect que usa Pulso (devuelven null si fallan). */
@Injectable()
export class GarminApiService {
  constructor(private readonly http: GarminHttpService) {}

  private get user(): string {
    return this.http.displayName ?? "";
  }

  // ---------------------------------------------------------------- día
  sleep = (d: string) => this.http.tryGet(`/wellness-service/wellness/dailySleepData/${this.user}`, { date: d, nonSleepBufferMinutes: 60 });
  hrv = (d: string) => this.http.tryGet(`/hrv-service/hrv/${d}`);
  readiness = (d: string) => this.http.tryGet(`/metrics-service/metrics/trainingreadiness/${d}`);
  summary = (d: string) => this.http.tryGet(`/usersummary-service/usersummary/daily/${this.user}`, { calendarDate: d });
  trainingStatus = (d: string) => this.http.tryGet(`/metrics-service/metrics/trainingstatus/aggregated/${d}`);
  respiration = (d: string) => this.http.tryGet(`/wellness-service/wellness/daily/respiration/${d}`);
  bodyBattery = (start: string, end: string) =>
    this.http.tryGet("/wellness-service/wellness/bodyBattery/reports/daily", { startDate: start, endDate: end });

  async activities(start: string, end: string): Promise<Json[] | null> {
    const all: Json[] = [];
    for (let from = 0; from < 500; from += 20) {
      const page = await this.http.tryGet("/activitylist-service/activities/search/activities", {
        startDate: start, endDate: end, start: from, limit: 20,
      });
      if (page === null) return all.length ? all : null;
      if (!Array.isArray(page) || !page.length) break;
      all.push(...page);
    }
    return all;
  }

  // ---------------------------------------------------------------- rendimiento
  racePredictions = () => this.http.tryGet(`/metrics-service/metrics/racepredictions/latest/${this.user}`);
  enduranceScore = (d: string) => this.http.tryGet("/metrics-service/metrics/endurancescore", { calendarDate: d });
  enduranceHistory = (start: string, end: string) =>
    this.http.tryGet("/metrics-service/metrics/endurancescore/stats", { startDate: start, endDate: end, aggregation: "weekly" });
  hillScore = (d: string) => this.http.tryGet("/metrics-service/metrics/hillscore", { calendarDate: d });
  fitnessAge = (d: string) => this.http.tryGet(`/fitnessage-service/fitnessage/${d}`);
  maxMetrics = (d: string) => this.http.tryGet(`/metrics-service/metrics/maxmet/daily/${d}/${d}`);
  devices = () => this.http.tryGet("/device-service/deviceregistration/devices");
  personalRecords = () => this.http.tryGet(`/personalrecord-service/personalrecord/prs/${this.user}`);

  /** Igual que la librería de Python: une velocidad/FC umbral y potencia umbral. */
  async lactateThreshold(): Promise<Json> {
    const power = await this.http.tryGet(`/biometric-service/biometric/powerToWeight/latest/${todayIso()}?sport=Running`);
    const entries = await this.http.tryGet("/biometric-service/biometric/latestLactateThreshold");
    const shr: Record<string, Json> = { speed: null, heartRate: null, heartRateCycling: null, calendarDate: null };
    for (const e of Array.isArray(entries) ? entries : []) {
      if (e?.speed != null) Object.assign(shr, { speed: e.speed, calendarDate: e.calendarDate });
      if (e?.heartRate != null) shr.heartRate = e.heartRate;
      if (e?.heartRateCycling != null) shr.heartRateCycling = e.heartRateCycling;
    }
    return { speed_and_heart_rate: shr, power: Array.isArray(power) ? (power[0] ?? {}) : (power ?? {}) };
  }

  // ---------------------------------------------------------------- perfil y salud
  userSettings = () => this.http.tryGet("/userprofile-service/userprofile/user-settings");
  bloodPressure = (start: string, end: string) =>
    this.http.tryGet(`/bloodpressure-service/bloodpressure/range/${start}/${end}`, { includeAll: true });
  bodyComposition = (start: string, end: string) =>
    this.http.tryGet("/weight-service/weight/dateRange", { startDate: start, endDate: end });
  deviceSettings = (id: string) => this.http.tryGet(`/device-service/deviceservice/device-info/settings/${id}`);

  // ---------------------------------------------------------------- actividad
  activitySplits = (id: string) => this.http.tryGet(`/activity-service/activity/${id}/splits`);
  activityDetails = (id: string) =>
    this.http.tryGet(`/activity-service/activity/${id}/details`, { maxChartSize: 400, maxPolylineSize: 1 });
  activityWeather = (id: string) => this.http.tryGet(`/activity-service/activity/${id}/weather`);
  exerciseSets = (id: string) => this.http.tryGet(`/activity-service/activity/${id}/exerciseSets`);
}
