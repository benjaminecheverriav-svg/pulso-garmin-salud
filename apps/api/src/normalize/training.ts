import type { Training } from "@pulso/shared";
import { get, num, type Json } from "../common/util";

/** Garmin agrupa algunos datos por dispositivo: elige el principal. */
function primary(deviceMap: Json): Json {
  if (!deviceMap || typeof deviceMap !== "object") return {};
  const values = Object.values(deviceMap).filter((v) => v && typeof v === "object") as Json[];
  return values.find((v) => v.primaryTrainingDevice) ?? values[0] ?? {};
}

export function normalizeTraining(raw: Json): Training {
  const st = primary(get(raw, "mostRecentTrainingStatus", "latestTrainingStatusData"));
  const lb = primary(get(raw, "mostRecentTrainingLoadBalance", "metricsTrainingLoadBalanceDTOMap"));
  const acute = st.acuteTrainingLoadDTO ?? {};
  const vo2 = get(raw, "mostRecentVO2Max") ?? {};
  const out: Training = {
    statusPhrase: st.trainingStatusFeedbackPhrase ?? null,
    acute: num(acute.dailyTrainingLoadAcute),
    chronic: num(acute.dailyTrainingLoadChronic),
    chronicMin: num(acute.minTrainingLoadChronic),
    chronicMax: num(acute.maxTrainingLoadChronic),
    acwr: num(acute.dailyAcuteChronicWorkloadRatio),
    acwrStatus: acute.acwrStatus ?? null,
    loadLowAerobic: num(lb.monthlyLoadAerobicLow),
    loadHighAerobic: num(lb.monthlyLoadAerobicHigh),
    loadAnaerobic: num(lb.monthlyLoadAnaerobic),
    targetLowAerobic: [num(lb.monthlyLoadAerobicLowTargetMin), num(lb.monthlyLoadAerobicLowTargetMax)],
    targetHighAerobic: [num(lb.monthlyLoadAerobicHighTargetMin), num(lb.monthlyLoadAerobicHighTargetMax)],
    targetAnaerobic: [num(lb.monthlyLoadAnaerobicTargetMin), num(lb.monthlyLoadAnaerobicTargetMax)],
    balancePhrase: lb.trainingBalanceFeedbackPhrase ?? null,
    vo2max: num(get(vo2, "generic", "vo2MaxPreciseValue")) ?? num(get(vo2, "generic", "vo2MaxValue")),
    vo2maxCycling: num(get(vo2, "cycling", "vo2MaxPreciseValue")) ?? num(get(vo2, "cycling", "vo2MaxValue")),
    heatAcclimation: num(get(vo2, "heatAltitudeAcclimation", "heatAcclimationPercentage")),
    altitudeAcclimation: num(get(vo2, "heatAltitudeAcclimation", "altitudeAcclimation")),
  };
  const hasData = Object.entries(out).some(([k, v]) => !k.startsWith("target") && v !== null);
  return hasData ? out : {};
}
