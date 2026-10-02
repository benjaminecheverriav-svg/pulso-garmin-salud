import { Injectable, NotFoundException } from "@nestjs/common";
import type { BpReading, Dashboard, Performance, Profile, WeightEntry } from "@pulso/shared";
import { AiCoachService } from "../ai/ai-coach.service";
import { scoreDays } from "../analytics/indices";
import { buildCoach } from "../coach/coach";
import { evaluateAll } from "../coach/evaluate";
import { generateDemo } from "../demo/demo";
import { buildDevice } from "../device/device";
import { explainDays } from "../explain/explain";
import { assessHealth } from "../health/health";
import { normalizeActivityDetail } from "../normalize/activity-detail";
import { type BaseDay, normalizeDay } from "../normalize/day";
import { normalizePerformance } from "../normalize/performance";
import { normalizeBp, normalizeWeights } from "../normalize/user";
import { DEMO_PROFILE, ProfileService, effectiveProfile } from "../profile/profile.service";
import { StorageService } from "../storage/storage.service";
import { dataStatus } from "./data-status";

interface Inputs { days: BaseDay[]; perf: Performance; prof: Profile; bp: BpReading[]; weights: WeightEntry[] }

/** Construye el panel completo: normalizar → índices → entrenador → explicaciones → salud → reloj. */
@Injectable()
export class DashboardService {
  private readonly cache = new Map<string, Dashboard>();

  constructor(
    private readonly storage: StorageService,
    private readonly profile: ProfileService,
    private readonly ai: AiCoachService,
  ) {}

  build(demo: boolean): Dashboard {
    const { days: base, perf, prof, bp, weights } = demo ? this.demoInputs() : this.garminInputs();
    const scored = scoreDays(base);
    evaluateAll(scored, prof, perf);
    const health = assessHealth(scored, prof, bp, weights);
    const days = explainDays(scored);
    const dash: Dashboard = {
      source: demo ? "demo" : "garmin",
      days, performance: perf, profile: prof, health,
      coach: buildCoach(scored, prof, perf, health),
      device: buildDevice(scored, perf, prof, health),
      lastSync: this.storage.lastSync(),
      aiEnabled: this.ai.enabled,
      dataStatus: dataStatus(days),
    };
    this.cache.set(dash.source, dash);
    return dash;
  }

  cached(demo: boolean): Dashboard {
    return this.cache.get(demo ? "demo" : "garmin") ?? this.build(demo);
  }

  private demoInputs(): Inputs {
    const d = generateDemo();
    return { ...d, prof: effectiveProfile({}, DEMO_PROFILE, d.perf.lactate.hr) };
  }

  private garminInputs(): Inputs {
    const raw = this.storage.loadDays();
    const dates = Object.keys(raw).sort();
    if (!dates.length) throw new NotFoundException("Sin datos. Sincroniza con Garmin o usa el modo demo.");
    let days = dates.map((d) => normalizeDay(d, raw[d]));
    // descarta los días previos al primero con datos del reloj
    const first = days.findIndex((d) => d.daily.steps || d.sleep.totalS || d.activities.length);
    days = days.slice(first >= 0 ? first : days.length - 1);
    const details = this.storage.loadActivityDetails();
    for (const d of days) for (const a of d.activities) a.detail = normalizeActivityDetail(details[String(a.id)], a.type);
    return {
      days,
      perf: normalizePerformance(this.storage.loadGlobal("performance")),
      prof: this.profile.effective(),
      bp: normalizeBp(this.storage.loadGlobal("blood_pressure")),
      weights: normalizeWeights(this.storage.loadGlobal("body_composition")),
    };
  }
}
