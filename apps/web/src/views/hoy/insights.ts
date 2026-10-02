import type { DayRecord, Tone } from "@pulso/shared";
import { avg, hm, nf, pad, pctDiff, signed } from "@/lib/format";
import { recoveryStatus } from "@/lib/status";

/** Recomendaciones del día a partir de la recuperación, la VFC, el pulso, la carga y el sueño. */
export function insights(d: DayRecord, recent: DayRecord[]): [Tone, string][] {
  const out: [Tone, string][] = [];
  const w = d.indices;
  const c = w.contributors;
  if (w.recovery !== null) {
    const [lbl, st] = recoveryStatus(w.recovery);
    const msg = st === "good" ? "Tu cuerpo está listo para una sesión exigente." : st === "warning" ? "Entrena con moderación; evita el máximo." : "Prioriza descanso, movilidad o trabajo muy suave.";
    out.push([st, `**Recuperación ${lbl.toLowerCase()} (${w.recovery}%).** ${msg} Esfuerzo objetivo: ${w.strainTarget[0]}–${w.strainTarget[1]}.`]);
  }
  if (c.hrv?.baseline) {
    const diff = pctDiff(c.hrv.value, c.hrv.baseline)!;
    const st: Tone = diff < -15 ? "critical" : diff < -7 ? "warning" : "good";
    out.push([st, `**VFC ${signed(diff)}% respecto a tu línea base de 30 días.** ${diff < -7 ? "Señal de fatiga, estrés o mal descanso." : "Sistema nervioso en buen equilibrio."}`]);
  }
  if (c.rhr?.value && c.rhr.baseline && c.rhr.value - c.rhr.baseline >= 3) {
    out.push(["serious", `**FC en reposo elevada (+${nf(c.rhr.value - c.rhr.baseline)} ppm).** Puede indicar fatiga acumulada, alcohol, calor o el inicio de una enfermedad.`]);
  }
  const t = d.training;
  const a = t.acute ?? t.acuteEst, ch = t.chronic ?? t.chronicEst;
  const acwr = t.acwr ?? (a && ch ? a / ch : null);
  if (acwr != null) {
    if (acwr > 1.5) out.push(["critical", `**Carga aguda muy alta (ratio ${nf(acwr, 2)}).** Riesgo de lesión elevado; reduce el volumen unos días.`]);
    else if (acwr > 1.3) out.push(["warning", `**Carga en aumento (ratio ${nf(acwr, 2)}).** Estás cerca del límite; vigila la recuperación.`]);
    else if (acwr < 0.8) out.push(["warning", `**Carga baja (ratio ${nf(acwr, 2)}).** Si no estás en descarga, podrías estar perdiendo forma.`]);
  }
  const wakes = recent.map((x) => x.sleep.endMs).filter((x): x is number => !!x);
  if (wakes.length >= 3) {
    const mins = avg(wakes.map((ms) => { const dt = new Date(ms); return dt.getHours() * 60 + dt.getMinutes(); }))!;
    const need = 460 + ((w.strain ?? 0) / 21) * 50;
    let bed = mins - need - 15;
    if (bed < 0) bed += 1440;
    const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(Math.round(m % 60))}`;
    out.push(["good", `**Esta noche necesitarás ~${hm(need * 60)} h de sueño.** Para despertar a tu hora habitual (${hhmm(mins)}), acuéstate cerca de las ${hhmm(bed)}.`]);
  }
  return out.length ? out : [["", "Sincroniza más días para obtener recomendaciones."]];
}
