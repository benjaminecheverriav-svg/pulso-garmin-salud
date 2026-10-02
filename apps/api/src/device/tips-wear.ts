import type { DeviceTip, DeviceUsage } from "@pulso/shared";
import { tip } from "./usage";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Uso 24/7, sueño, pulsioxímetro y batería. */
export function wearTips(u: DeviceUsage): DeviceTip[] {
  const out: DeviceTip[] = [];
  if (u.sleepNights < 0.85) {
    out.push(tip("Sueño", "alta", "Duerme con el reloj todas las noches",
      `Solo el ${pct(u.sleepNights)} de las noches tiene sueño registrado. Sin ellas no hay VFC, disposición para entrenar ni Body Battery fiable.`,
      "Carga el reloj mientras te duchas o desayunas (15–20 min dan para casi un día). Programa el horario de sueño en Ajustes > Salud y bienestar > Sueño para que active el modo sueño automáticamente."));
  }
  if (u.hrvNights < 0.8) {
    out.push(tip("Recuperación", "alta", "Consigue un estado de VFC estable",
      `Solo el ${pct(u.hrvNights)} de las noches tiene VFC. Garmin necesita ~3 semanas de noches seguidas para fijar tu línea base.`,
      "Lleva el reloj ajustado (un dedo por encima del hueso de la muñeca) al dormir y evita quitártelo por la noche."));
  }
  if (u.spo2Nights < 0.5) {
    out.push(tip("Salud", "alta", "Activa el pulsioxímetro durante el sueño",
      "Sin datos de oxígeno nocturno no podemos detectar señales de apnea del sueño, un factor clave de hipertensión y ACV.",
      "Ajustes > Salud y bienestar > Pulsioxímetro > Durante el sueño. Evita «Todo el día»: gasta mucha batería y aporta poco."));
  } else if (u.spo2Nights > 0.95) {
    out.push(tip("Batería", "baja", "Pulsioxímetro solo de noche",
      "Si lo tienes en «Todo el día», la batería dura bastante menos y la medición diurna es poco útil.",
      "Ajustes > Salud y bienestar > Pulsioxímetro > Durante el sueño."));
  }
  out.push(tip("Batería", "media", "Pantalla AMOLED: gesto en lugar de siempre encendida",
    "El modo «siempre encendida» puede reducir la autonomía a menos de la mitad. Con más batería te lo quitas menos y los datos 24/7 mejoran.",
    "Ajustes > Pantalla > Durante el uso general: «Gesto». Deja «Siempre encendida» solo para actividades si la necesitas. Activa el modo sueño para que se apague de noche."));
  if (u.wearH && u.wearH < 20) {
    out.push(tip("Uso", "media", "Úsalo más horas al día",
      `Lo llevas unas ${Math.round(u.wearH)} h/día. El estrés, el Body Battery y la FC en reposo son más precisos con uso continuo.`,
      "Quítatelo solo para cargarlo. Si te molesta, prueba una correa de nailon o de silicona perforada."));
  }
  if (u.withZones !== null && u.withZones < 0.8) {
    out.push(tip("Sensores", "media", "Revisa el sensor de pulso en las actividades",
      `Solo el ${pct(u.withZones)} de tus actividades tiene zonas de FC.`,
      "Comprueba Ajustes > Sensores y accesorios > FC muñeca: «Automático», y que el reloj esté ajustado durante el ejercicio."));
  }
  return out;
}
