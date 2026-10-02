import type { DeviceTip, HealthReport } from "@pulso/shared";
import { tip } from "./usage";

/** Presión, peso, informe matutino, estrés y configuración general. */
export function healthTips(health: HealthReport): DeviceTip[] {
  const out: DeviceTip[] = [];
  if (!health.fitness.bp) {
    out.push(tip("Salud", "alta", "Registra tu presión arterial",
      "Es el factor más importante para prevenir infarto y ACV, y el reloj no la mide. Sin ella, esta app solo puede estimar parte del riesgo.",
      "Con un tensiómetro Garmin Index BPM se sincroniza sola. Con otro validado: Garmin Connect > Salud > Presión arterial > +. Mide 2 veces por la mañana, 3 días seguidos cada mes."));
  }
  if (!health.weights.length) {
    out.push(tip("Salud", "media", "Registra tu peso",
      "El peso actualizado mejora el cálculo de VO2 máx., calorías e IMC.",
      "Báscula Garmin Index S2 (también da % de grasa) o manual en Garmin Connect > Salud > Peso, una vez por semana en ayunas."));
  }
  out.push(tip("Salud", "media", "Informe matutino a tu medida",
    "Al despertar el reloj te resume sueño, VFC, disposición y entreno del día: es la forma más rápida de revisar tu recuperación.",
    "Ajustes > Informe matutino > Editar informe: incluye VFC, Disposición, Sueño y Entrenamiento sugerido."));
  out.push(tip("Salud", "baja", "Instantánea de salud una vez por semana",
    "Mide en 2 minutos FC, VFC, SpO₂, respiración y estrés en condiciones controladas. Hecha siempre a la misma hora da una tendencia muy fiable.",
    "Controles > Instantánea de salud, sentado y quieto, por ejemplo el domingo al despertar."));
  const stress = health.vitals.stress30;
  if (stress && stress > 35) {
    out.push(tip("Estrés", "media", "Alertas y respiración guiada",
      `Tu estrés medio es ${Math.round(stress)}. El reloj puede avisarte cuando sube y guiarte una respiración de 2–5 min.`,
      "Ajustes > Salud y bienestar > Estrés > Alertas de estrés: activar. Usa la actividad «Respiración» (Breathwork)."));
  }
  out.push(tip("Configuración", "media", "Perfil de usuario al día",
    "Peso, altura, fecha de nacimiento y FC máxima afectan al VO2 máx., las calorías, las zonas y los riesgos de esta app.",
    "Ajustes > Perfil de usuario. Si alguna vez superaste la FC máxima que muestra, actualízala o activa la detección automática."));
  out.push(tip("Configuración", "baja", "Mantén el software al día",
    "Garmin mejora con frecuencia los algoritmos de sueño, VFC y carga.",
    "Garmin Connect > Dispositivos > fēnix 8 > Actualizaciones de software (con wifi activado en el reloj se actualiza solo)."));
  out.push(tip("Entrenamiento", "baja", "Aclimatación al calor y la altitud",
    "El fēnix 8 ajusta el VO2 máx. y la carga según el calor y la altitud si tiene datos de meteorología y GPS.",
    "Mantén el teléfono conectado durante las actividades al aire libre para recibir la temperatura."));
  return out;
}
