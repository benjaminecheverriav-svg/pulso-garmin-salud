import type { Risk } from "@pulso/shared";
import type { HealthCtx } from "./context";
import { NONE } from "./factor";
import { fBmi, fBp, fHrv, fRhr, fRhrTrend, fVo2 } from "./factors-cardio";
import { fAcwr, fHardLow, fHrvSupp, fInjuries, fIntensityDist, fMonotony, fRamp, fRest, fSleepLoad } from "./factors-load";
import { fActivity, fAgeSex, fAlcohol, fChol, fFamily, fGlucose, fSleep, fSmoking, fSteps, fStress } from "./factors-lifestyle";
import { fAwake, fEndurance, fMaleAge, fResp, fSnoring, fSpo2Avg, fSpo2Dips } from "./factors-sleep";
import { buildRisk, riskAsFactor } from "./risk";

/** Los 7 indicadores de riesgo. Con menos de 7 días de uso se marcan como "Recopilando datos". */
export function buildRisks(c: HealthCtx): Risk[] {
  const apnea = buildRisk("apnea", "Apnea del sueño", "🌙",
    "Pausas en la respiración durante el sueño. Si no se trata, sube la presión y el riesgo de arritmias y ACV.",
    [fSpo2Dips(c), fSpo2Avg(c), fResp(c), fAwake(c), fSnoring(c), fBmi(c), fMaleAge(c)]);
  const apneaF = riskAsFactor(apnea, "Señales de apnea", "La apnea no tratada eleva la presión y el riesgo de arritmias.",
    "Revisa la tarjeta de apnea del sueño.", "Activa el pulsioxímetro durante el sueño.");

  const hyper = buildRisk("hipertension", "Hipertensión", "🩺",
    "Presión alta sostenida. No da síntomas y es la principal causa de infarto y ACV.",
    [fBp(c), fBmi(c), fRhr(c), fSleep(c), apneaF, fActivity(c), fStress(c), fAlcohol(c), fAgeSex(c), fFamily(c)]);
  const heart = buildRisk("infarto", "Infarto / enfermedad coronaria", "❤️",
    "Obstrucción de las arterias del corazón. La prevención se basa en la forma física y en controlar presión, colesterol, glucosa y tabaco.",
    [fVo2(c), fSmoking(c), fBp(c, 1.5), fChol(c), fGlucose(c), fRhr(c), fHrv(c), fActivity(c), fBmi(c), fAgeSex(c), fFamily(c), fSleep(c, 0.5)]);
  const afib = buildRisk("arritmia", "Arritmias (fibrilación auricular)", "💓",
    "Latido irregular. Aumenta hasta 5 veces el riesgo de ACV. El reloj no la diagnostica, pero sí vigila sus factores de riesgo.",
    [fAgeSex(c), fBp(c, 1.5), apneaF, fBmi(c), fAlcohol(c, 1), fEndurance(c), fRhrTrend(c, 0.5)]);
  const afibF = riskAsFactor(afib, "Riesgo de arritmia", "La fibrilación auricular es una causa frecuente de ACV.",
    "Ante palpitaciones o pulso irregular, consulta.", "Completa tu perfil.");
  const stroke = buildRisk("acv", "ACV (ictus)", "🧠",
    "Falta de riego en el cerebro. La presión arterial explica cerca de la mitad del riesgo.",
    [fBp(c, 2.5), afibF, apneaF, fSmoking(c), fGlucose(c), fChol(c), fAgeSex(c), fActivity(c), fSleep(c, 0.5), fAlcohol(c)]);
  const metab = buildRisk("metabolico", "Diabetes tipo 2 / síndrome metabólico", "🩸",
    "Resistencia a la insulina. Muy ligada al peso, la actividad, el sueño y la forma física.",
    [fGlucose(c, 2), fBmi(c, 1.5), fActivity(c), fSteps(c), fSleep(c), fVo2(c, 1), fRhr(c, 0.5), fFamily(c, "familyDiabetes", "Antecedentes de diabetes")]);
  const injury = buildRisk("lesion", "Lesión por sobrecarga", "🦵",
    "Tendinitis, fracturas por estrés, roturas musculares: casi siempre por subir la carga más rápido de lo que el cuerpo se adapta.",
    [fAcwr(c), fRamp(c), fMonotony(c), fRest(c), fHardLow(c), fHrvSupp(c), fSleepLoad(c), fIntensityDist(c), fInjuries(c)]);

  const risks = [hyper, heart, stroke, afib, apnea, metab, injury];
  if (c.wearDays < 7) {
    for (const r of risks) {
      Object.assign(r, {
        level: NONE,
        label: "Recopilando datos",
        summary: `Llevas ${c.wearDays} día(s) con el reloj. Necesitamos al menos 7 días (idealmente 3 semanas) de uso de día y de noche para estimar este indicador con fiabilidad.`,
      });
    }
  }
  return risks;
}
