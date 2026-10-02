import { Injectable, Logger } from "@nestjs/common";
import type { SyncState } from "@pulso/shared";
import { addDays, isoDate, type Json } from "../common/util";
import { StorageService } from "../storage/storage.service";
import { GarminApiService } from "./garmin-api.service";
import { GarminHttpService } from "./garmin-http.service";

/** Descarga los últimos N días de Garmin y los guarda en SQLite. */
@Injectable()
export class SyncService {
  private readonly log = new Logger("Sync");
  state: SyncState = { running: false, progress: 0, total: 0, message: "" };

  constructor(
    private readonly api: GarminApiService,
    private readonly http: GarminHttpService,
    private readonly storage: StorageService,
  ) {}

  start(days: number, force: boolean): "started" | "running" {
    if (this.state.running) return "running";
    void this.run(Math.max(1, Math.min(days, 365)), force);
    return "started";
  }

  private async run(days: number, force: boolean): Promise<void> {
    const today = new Date();
    const dates = Array.from({ length: days }, (_, i) => isoDate(addDays(today, -(days - 1 - i))));
    const recent = new Set([isoDate(today), isoDate(addDays(today, -1))]);
    this.state = { running: true, progress: 0, total: dates.length + 1, message: "Iniciando…", error: null };
    try {
      await this.http.ensureProfile();
      for (const [i, d] of dates.entries()) {
        this.state = { ...this.state, progress: i, message: `Descargando ${d}` };
        if (!force && !recent.has(d) && this.storage.hasDay(d)) continue;
        this.storage.saveDay(d, await this.fetchDay(d));
      }
      await this.syncActivityDetails(dates[0]);
      this.state = { ...this.state, progress: dates.length, message: "Métricas de rendimiento" };
      await this.syncGlobals(today, days);
      this.state = { ...this.state, progress: this.state.total, message: "Sincronización completa" };
    } catch (e) {
      this.log.error(e);
      this.state = { ...this.state, message: `Error: ${(e as Error).message}`, error: (e as Error).message };
    } finally {
      this.state = { ...this.state, running: false };
    }
  }

  /** Mismas claves que guardaba la versión en Python (compatibilidad con la caché). */
  private async fetchDay(d: string): Promise<Json> {
    return {
      sleep: await this.api.sleep(d),
      hrv: await this.api.hrv(d),
      readiness: await this.api.readiness(d),
      summary: await this.api.summary(d),
      training_status: await this.api.trainingStatus(d),
      respiration: await this.api.respiration(d),
      body_battery: await this.api.bodyBattery(d, d),
      activities: await this.api.activities(d, d),
    };
  }

  /** Parciales, series de pulso/ritmo, clima y series de fuerza (máx. 40 por sincronización). */
  private async syncActivityDetails(cutoff: string): Promise<void> {
    const pending: Json[] = [];
    for (const [d, raw] of Object.entries(this.storage.loadDays())) {
      if (d < cutoff) continue;
      for (const a of raw.activities ?? []) {
        if (a?.activityId && !this.storage.hasActivityDetail(a.activityId)) pending.push(a);
      }
    }
    pending.sort((a, b) => String(b.startTimeLocal).localeCompare(String(a.startTimeLocal)));
    for (const [i, a] of pending.slice(0, 40).entries()) {
      this.state = { ...this.state, message: `Detalle de actividades (${i + 1}/${Math.min(pending.length, 40)})` };
      const id = String(a.activityId);
      const type: string = a.activityType?.typeKey ?? "";
      const detail: Json = { splits: await this.api.activitySplits(id), details: await this.api.activityDetails(id) };
      if (a.distance && !/indoor|treadmill|virtual/.test(type)) detail.weather = await this.api.activityWeather(id);
      if (type.includes("strength")) detail.sets = await this.api.exerciseSets(id);
      this.storage.saveActivityDetail(id, detail);
    }
  }

  private async syncGlobals(today: Date, days: number): Promise<void> {
    const t = isoDate(today);
    const start = isoDate(addDays(today, -Math.max(days, 90)));
    const devices = await this.api.devices();
    this.storage.saveGlobal("performance", {
      race_predictions: await this.api.racePredictions(),
      endurance_score: await this.api.enduranceScore(t),
      endurance_history: await this.api.enduranceHistory(start, t),
      hill_score: await this.api.hillScore(t),
      fitness_age: await this.api.fitnessAge(t),
      max_metrics: await this.api.maxMetrics(t),
      lactate_threshold: await this.api.lactateThreshold(),
      devices,
      personal_records: await this.api.personalRecords(),
    });
    this.state = { ...this.state, message: "Perfil, presión arterial y peso" };
    this.storage.saveGlobal("user_settings", await this.api.userSettings());
    this.storage.saveGlobal("blood_pressure", await this.api.bloodPressure(start, t));
    this.storage.saveGlobal("body_composition", await this.api.bodyComposition(start, t));
    const devId = (Array.isArray(devices) ? devices : []).find((d: Json) => d?.deviceId)?.deviceId;
    if (devId) this.storage.saveGlobal("device_settings", await this.api.deviceSettings(String(devId)));
  }
}
