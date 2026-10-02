import type { DeviceTip, DeviceUsage, Performance, Profile } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import { tip } from "./usage";

const RACE_GOALS = ["5k", "10k", "media", "maraton", "trail"];
const ENDURANCE_GOALS = [...RACE_GOALS, "triatlon"];

/** Zonas, sensores, potencia, carreras objetivo y fuerza. */
export function trainingTips(u: DeviceUsage, perf: Performance, prof: Profile, days: ScoredDay[]): DeviceTip[] {
  const out: DeviceTip[] = [];
  const runs = u.groups.running ?? 0;
  const rides = u.groups.cycling ?? 0;
  const lthr = perf.lactate.hr;
  out.push(tip("Entrenamiento", "alta", "Zonas de FC basadas en tu umbral de lactato",
    "Con zonas por % de FC máxima estimada (220 − edad) el error puede ser de ±10 ppm. Las zonas por FC umbral son las que usa el entrenador de esta app.",
    lthr
      ? `Ya tienes umbral detectado (${lthr} ppm). Comprueba en Ajustes > Perfil de usuario > Zonas de FC que estén «Basadas en: %FC umbral» y activa la detección automática del umbral.`
      : "Ajustes > Perfil de usuario > Zonas de FC > Basadas en: %FC umbral de lactato. Haz antes la prueba guiada: menú de actividad Carrera > Opciones > Umbral de lactato (necesitas banda de pecho)."));
  if (u.hardSessions >= 4) {
    out.push(tip("Sensores", "alta", "Usa banda de pecho en las series",
      `Hiciste ${u.hardSessions} sesiones intensas en 8 semanas. En cambios bruscos de ritmo el sensor óptico de muñeca se retrasa varios segundos y subestima la intensidad.`,
      "Una HRM 600 o HRM-Pro Plus da FC exacta, dinámica de carrera (tiempo de contacto, oscilación vertical) y permite la prueba de umbral de lactato. Emparéjala en Ajustes > Sensores y accesorios."));
  }
  if (runs >= 4) {
    if (!u.runsWithPower) {
      out.push(tip("Entrenamiento", "media", "Activa la potencia de carrera",
        "El fēnix 8 calcula potencia desde la muñeca: responde al instante en cuestas y viento, mientras que el pulso tarda en subir.",
        "Actividad Carrera > Ajustes > Pantallas de datos > añade el campo «Potencia». Para mayor precisión, usa también la banda de pecho."));
    }
    if (RACE_GOALS.includes(prof.goal) && !prof.raceDate) {
      out.push(tip("Objetivo", "alta", "Añade tu carrera objetivo al calendario",
        "Con una carrera en el calendario, el widget de carrera muestra tu predicción y el reloj adapta sus entrenamientos sugeridos diarios a esa fecha.",
        "Garmin Connect (app) > Más > Calendario de carreras > Añadir evento. Pon también la fecha en tu Perfil de esta app para que el plan se ajuste."));
    }
    out.push(tip("Entrenamiento", "media", "Entrenamientos sugeridos diarios",
      "Combinan tu disposición, carga y VO2 máx. para proponerte la sesión del día directamente en el reloj; son un buen complemento al plan del entrenador.",
      "Inicia Carrera > pulsa ARRIBA/ABAJO para ver el entrenamiento sugerido. Configúralo en Ajustes de la actividad > Entrenamiento sugerido."));
    out.push(tip("Datos", "baja", "Campo «Condición de rendimiento»",
      "Tras 6–20 min de carrera muestra de −20 a +20 cómo rindes hoy frente a tu nivel habitual. Te dice en vivo si es día para apretar.",
      "Actividad Carrera > Pantallas de datos > añade «Condición de rendimiento»."));
  }
  if (rides >= 3 && !u.ridesWithPower) {
    out.push(tip("Sensores", "media", "Potenciómetro para ciclismo",
      "Sin potencia no hay FTP ni carga precisa en bici; el pulso sobreestima la fatiga en calor y la subestima en esfuerzos cortos.",
      "Pedales Rally o un potenciómetro de biela; emparéjalo en Ajustes > Sensores y accesorios y haz la prueba guiada de FTP."));
  }
  if ((u.groups.strength ?? 0) >= 2) {
    out.push(tip("Entrenamiento", "baja", "Registra series y repeticiones en fuerza",
      "Así el reloj calcula el volumen por grupo muscular (mapa muscular en Garmin Connect) y la carga es más realista.",
      "Al terminar cada serie, pulsa LAP y confirma el ejercicio y las repeticiones. Crea tus rutinas en Garmin Connect > Entrenamientos."));
  } else if (ENDURANCE_GOALS.includes(prof.goal)) {
    out.push(tip("Entrenamiento", "media", "Añade 2 sesiones de fuerza por semana",
      "Casi no registras fuerza. Dos sesiones cortas por semana reducen un tercio las lesiones por sobreuso y mejoran la economía de carrera.",
      "Usa la actividad «Fuerza» del reloj con los entrenamientos guiados de Garmin Coach (app Connect > Entrenamiento y planificación)."));
  }
  const mountain = days.slice(-56).some((d) => d.activities.some((a) => a.type === "hiking" || a.type === "trail_running"));
  if (mountain) {
    out.push(tip("Navegación", "baja", "ClimbPro y Up Ahead en montaña",
      "Te muestran el perfil de la subida que tienes delante y la distancia a puntos clave, útil para dosificar.",
      "Carga la ruta en el reloj y activa Ajustes de la actividad > ClimbPro."));
  }
  return out;
}
