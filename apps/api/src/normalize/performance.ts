import type { Performance } from "@pulso/shared";
import { get, num, type Json } from "../common/util";

export function normalizePerformance(raw: Json): Performance {
  raw = raw ?? {};
  let rp = raw.race_predictions;
  if (Array.isArray(rp)) rp = rp[rp.length - 1] ?? {};
  const es = raw.endurance_score ?? {};
  const hs = raw.hill_score ?? {};
  const fa = raw.fitness_age ?? {};
  const mm = Array.isArray(raw.max_metrics) ? (raw.max_metrics[0] ?? {}) : (raw.max_metrics ?? {});
  const lt = raw.lactate_threshold ?? {};
  let ltSpeed = num(get(lt, "speed_and_heart_rate", "speed"));
  if (ltSpeed !== null && ltSpeed < 1) ltSpeed *= 10; // Garmin lo entrega en décimas de m/s
  const groups = Object.entries((get(raw, "endurance_history", "groupMap") ?? {}) as Record<string, Json>);
  const history = groups
    .filter(([, g]) => g?.groupAverage)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, g]) => [d, g.groupAverage] as [string, number]);
  const devices = Array.isArray(raw.devices) ? raw.devices : [];
  return {
    race: { "5k": num(rp?.time5K), "10k": num(rp?.time10K), half: num(rp?.timeHalfMarathon), marathon: num(rp?.timeMarathon) },
    endurance: { score: num(es.overallScore), classification: num(es.classification), history },
    hill: { score: num(hs.overallScore), strength: num(hs.strengthScore), endurance: num(hs.enduranceScore) },
    fitnessAge: {
      fitnessAge: num(fa.fitnessAge) ?? num(get(mm, "generic", "fitnessAge")),
      chronological: num(fa.chronologicalAge),
      achievable: num(fa.achievableFitnessAge),
    },
    lactate: { hr: num(get(lt, "speed_and_heart_rate", "heartRate")), speedMs: ltSpeed, ftp: num(get(lt, "power", "functionalThresholdPower")) },
    devices: devices.map((d: Json) => d?.productDisplayName || d?.displayName).filter(Boolean),
  };
}
