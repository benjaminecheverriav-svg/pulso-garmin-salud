import type { CoachReport, HealthReport, Performance, Profile } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { todayPlan } from "./today-plan";
import { goalProgress, weekPlan } from "./week-plan";
import { weeklyReview } from "./weekly-review";

/** Informe completo del entrenador para el último día disponible. */
export function buildCoach(days: ScoredDay[], prof: Profile, perf: Performance, health: HealthReport | null): CoachReport {
  const today = todayPlan(days, prof, perf, health);
  return {
    today,
    week: weeklyReview(days),
    plan: weekPlan(days, prof, perf, today),
    goal: goalProgress(prof, perf),
  };
}
