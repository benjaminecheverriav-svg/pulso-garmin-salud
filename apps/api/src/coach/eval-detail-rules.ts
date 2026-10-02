import { fmtNum } from "../common/util";
import { UNKNOWN_EXERCISE } from "../normalize/exercises";
import { pct, zoneShare } from "./classify";
import type { EvalAcc, EvalInput } from "./eval-types";

/** Reglas que usan el detalle de la actividad: desacople, ritmo, clima y fuerza. */

export function ruleDecoupling({ a, kind, group }: EvalInput, acc: EvalAcc): void {
  const dc = a.detail?.decoupling;
  if (dc == null || kind === "intensa" || (a.durationS ?? 0) < 40 * 60 || (group !== "running" && group !== "cycling")) return;
  const v = fmtNum(dc);
  if (dc < 5) {
    acc.score += 0.5;
    acc.good.push(`Desacople aeróbico ${v}%: el pulso se mantuvo estable respecto al ritmo toda la sesión. Tu base aeróbica aguanta esta duración.`);
  } else if (dc < 10) {
    acc.improve.push(`Desacople aeróbico ${v}%: en la segunda mitad el pulso subió más que el ritmo. Sal algo más lento, hidrátate y sigue sumando volumen suave.`);
  } else {
    acc.score -= 0.5;
    acc.improve.push(`Desacople aeróbico ${v}%: fuerte deriva del pulso. Esta duración aún supera tu base aeróbica (o hubo calor o deshidratación).`);
  }
}

export function rulePacing({ a, kind, group }: EvalInput, acc: EvalAcc): void {
  const d = a.detail;
  const cv = d?.paceCv;
  const sd = d?.splitDiff;
  if (cv == null || group !== "running") return;
  const activeLaps = (d?.laps ?? []).filter((l) => ["ACTIVE", "INTERVAL"].includes(l.intensity ?? "")).length;
  if (kind === "intensa" && activeLaps >= 3) {
    if (cv < 3) acc.good.push(`Series muy regulares (variación de ritmo ${fmtNum(cv)}%): buen control del esfuerzo.`);
    else if (sd != null && sd < -4)
      acc.improve.push(`Las últimas repeticiones fueron ${Math.round(Math.abs(sd))}% más lentas: saliste demasiado fuerte. Empieza las series un poco más conservador.`);
  } else if (kind !== "intensa") {
    if (sd != null && sd > 1) acc.good.push(`Parcial negativo (segunda mitad ${Math.round(sd)}% más rápida): excelente gestión del ritmo.`);
    else if (cv > 8 && (a.elevationGain ?? 0) <= 150)
      acc.improve.push(`Ritmo irregular (variación ${Math.round(cv)}% entre kilómetros). En rodajes, un ritmo constante es más eficiente.`);
  }
}

export function ruleWeather({ a }: EvalInput, acc: EvalAcc): void {
  const w = a.detail?.weather;
  if (w?.tempC == null) return;
  if (w.tempC >= 26) {
    const hum = w.humidity ? `, ${w.humidity}% de humedad` : "";
    acc.context.push(`Hizo calor (${Math.round(w.tempC)} °C${hum}): el pulso sube 5–10 ppm para el mismo ritmo. Es normal ir más lento.`);
  } else if (w.tempC <= 3) {
    acc.context.push(`Hizo frío (${Math.round(w.tempC)} °C): calienta más tiempo antes de ir rápido.`);
  }
}

export function ruleStrength({ a, kind }: EvalInput, acc: EvalAcc): void {
  if (kind !== "fuerza") return;
  const sets = a.detail?.sets ?? [];
  const info = a.detail?.setsInfo;
  if (sets.length) {
    const totSets = sets.reduce((s, x) => s + x.sets, 0);
    const totReps = sets.reduce((s, x) => s + x.reps, 0);
    const named = sets.filter((x) => x.name !== UNKNOWN_EXERCISE).map((x) => x.name.toLowerCase());
    acc.good.push(`${totSets} series y ${totReps} repeticiones${named.length ? `: ${named.slice(0, 4).join(", ")}.` : "."}`);
    if (info?.unknown)
      acc.improve.push(
        `${info.unknown} series quedaron sin ejercicio identificado. Al terminar cada serie, confírmalo en el reloj (o edítalo después en Garmin Connect) para medir bien el volumen por músculo.`,
      );
    if (!info?.weighted) acc.improve.push("No registraste el peso. Anotarlo te permite ver tu progreso de fuerza semana a semana.");
    if (info?.restAvgS) {
      const r = info.restAvgS;
      const kindTxt = r >= 150 ? "(adecuado para fuerza máxima)." : r >= 60 ? "(bien para hipertrofia)." : "(corto: más resistencia que fuerza).";
      acc.context.push(`Descanso medio entre series: ${Math.floor(r / 60)} min ${String(r % 60).padStart(2, "0")} s ${kindTxt}`);
    }
  }
  const hi = zoneShare(a, [2, 3, 4]) ?? 0;
  if (hi > 0.2) acc.context.push(`Pasaste un ${pct(hi)} del tiempo en zona 3 o más: un circuito con efecto cardiovascular además de fuerza.`);
}
