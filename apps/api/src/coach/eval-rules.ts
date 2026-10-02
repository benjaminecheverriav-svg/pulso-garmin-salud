import { fmtNum, median } from "../common/util";
import { isHard, pct, zoneShare } from "./classify";
import type { EvalAcc, EvalInput } from "./eval-types";
import { hrText } from "./zones";

/** Intensidad con poca recuperación, días duros seguidos y poco sueño. */
export function ruleReadiness({ kind, day, prev }: EvalInput, acc: EvalAcc): void {
  if (kind !== "intensa") return;
  const ready = day.readiness.score ?? null;
  const recov = day.indices.recovery;
  const sleepH = day.sleep.totalS ? day.sleep.totalS / 3600 : null;
  if ((ready !== null && ready < 40) || (recov !== null && recov < 34)) {
    acc.score -= 2;
    acc.improve.push(
      `Sesión intensa con recuperación baja (disposición ${ready ?? "—"}). El beneficio es menor y el riesgo de lesión mayor: en días así, cámbiala por una suave.`,
    );
  } else if (ready !== null && ready >= 70) {
    acc.score += 1;
    acc.good.push(`Buen momento: hiciste intensidad con disposición alta (${ready}).`);
  }
  if (prev?.activities.some(isHard)) {
    acc.score -= 1;
    acc.improve.push("Dos días intensos seguidos: deja al menos 48 h entre sesiones duras.");
  }
  if (sleepH && sleepH < 6) {
    acc.score -= 0.5;
    acc.improve.push(`Dormiste ${fmtNum(sleepH)} h: con poco sueño la calidad del entrenamiento baja.`);
  }
}

/** Que lo suave sea realmente suave. */
export function ruleEasyZones({ a, kind, group, zones }: EvalInput, acc: EvalAcc): void {
  const hi = zoneShare(a, [2, 3, 4]);
  if (kind !== "suave" || hi === null) return;
  if ((group === "running" || group === "cycling") && hi > 0.3) {
    acc.score -= 1.5;
    acc.improve.push(`Tu sesión suave no fue tan suave: ${pct(hi)} del tiempo en zona 3 o más. Para que sume, quédate en zona 2 (${hrText(zones, "z2")}).`);
  } else if (hi < 0.15 && (a.durationS ?? 0) > 1800) {
    acc.score += 0.5;
    acc.good.push("Ritmo suave bien controlado: así se construye la base sin acumular fatiga.");
  }
}

/** Training Effect aeróbico de Garmin. */
export function ruleTrainingEffect({ a, kind }: EvalInput, acc: EvalAcc): void {
  const te = a.teAerobic;
  if (te == null || kind === "fuerza") return;
  if (te >= 5) {
    acc.score -= 1;
    acc.improve.push("Training Effect aeróbico 5,0 (sobrecarga): pasaste de lo productivo a lo agotador.");
  } else if (te >= 3 && (kind === "intensa" || kind === "larga")) {
    acc.score += 0.5;
    acc.good.push(`Estímulo productivo (Training Effect ${fmtNum(te)}): mejora tu forma física.`);
  } else if (te < 1 && (a.durationS ?? 0) > 1200) {
    acc.good.push("Efecto de recuperación: útil como día suave.");
  }
}

/** Carga mucho mayor que la sesión típica y aviso de sesión larga. */
export function ruleLoad({ a, past, kind }: EvalInput, acc: EvalAcc): void {
  const loads = past.map((p) => p.load).filter((x): x is number => !!x);
  if (a.load && loads.length >= 5 && a.load > 2 * median(loads)) {
    acc.score -= 0.5;
    acc.improve.push(`Carga ${Math.round(a.load)}: más del doble de tu sesión típica (${Math.round(median(loads))}). Da 1–2 días suaves después.`);
  }
  if (kind === "larga") acc.good.push("Sesión larga: clave para la resistencia y la economía.");
}

/** Eficiencia aeróbica: metros por latido frente a rodajes comparables. */
export function ruleEfficiency({ a, past, kind, group }: EvalInput, acc: EvalAcc): void {
  if (group !== "running" || !a.avgSpeed || !a.avgHr || kind === "intensa") return;
  const ref = past.filter((p) => p.avgSpeed && p.avgHr && !isHard(p)).map((p) => (p.avgSpeed! * 60) / p.avgHr!);
  if (ref.length < 4) return;
  const diff = (((a.avgSpeed * 60) / a.avgHr) / median(ref) - 1) * 100;
  acc.efficiency = Math.round(diff * 10) / 10;
  const s = `${diff > 0 ? "+" : ""}${Math.round(diff)}%`;
  if (diff > 3) {
    acc.score += 0.5;
    acc.good.push(`Eficiencia aeróbica ${s} frente a tus rodajes recientes: corres más rápido con el mismo pulso.`);
  } else if (diff < -4) {
    acc.improve.push(`Eficiencia aeróbica ${s}: pulso más alto para el mismo ritmo (calor, fatiga, deshidratación o terreno).`);
  }
}

export function ruleMissingHr({ a, group }: EvalInput, acc: EvalAcc): void {
  if (!a.zonesS && (group === "running" || group === "cycling")) {
    acc.improve.push("Sin datos de zonas de FC: revisa que el sensor de pulso esté activo.");
  }
}
