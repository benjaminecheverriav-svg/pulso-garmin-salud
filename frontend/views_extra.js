/* Pulso — vistas de Entrenador, Salud, Mi reloj, Perfil y glosario */
"use strict";

/* ============================================================ glosario */
const GLOSSARY = {
  recuperacion: { t: "Recuperación (0–100 %)", what: "Cuánto se ha recuperado tu cuerpo, calculado con tu VFC nocturna, tu pulso en reposo y tu sueño frente a tus propios valores de los últimos 30 días.", why: "Te dice si hoy conviene exigirse o bajar el ritmo. Entrenar duro con la recuperación baja da menos beneficio y más riesgo de lesión.", ref: "Verde ≥ 67 · Amarillo 34–66 · Rojo ≤ 33.", tip: "Sube con sueño suficiente y regular, menos alcohol, buena hidratación y días suaves tras los duros." },
  esfuerzo: { t: "Esfuerzo (0–21)", what: "La carga que soportó tu sistema cardiovascular en el día: minutos en cada zona de pulso de tus entrenamientos más tu actividad diaria.", why: "Ayuda a dosificar: el esfuerzo ideal depende de lo recuperado que estés.", ref: "Ligero < 10 · Moderado 10–13 · Alto 14–17 · Máximo ≥ 18. La escala es logarítmica: cada punto arriba cuesta más.", tip: "Mira el objetivo de esfuerzo del día (según tu recuperación) y trata de quedarte dentro." },
  sueno_rend: { t: "Rendimiento del sueño", what: "El porcentaje del sueño que necesitabas que realmente dormiste.", why: "La necesidad cambia cada día: aumenta con el esfuerzo del día anterior y con la deuda de sueño acumulada.", ref: "≥ 85 % óptimo · 70–84 % suficiente · < 70 % insuficiente.", tip: "Si sabes que mañana necesitas más sueño, adelanta la hora de acostarte en lugar de retrasar la alarma." },
  readiness: { t: "Disposición para entrenar (Garmin)", what: "Puntuación de 0 a 100 que combina seis factores: sueño de anoche, historial de sueño, tiempo de recuperación, carga aguda, VFC e historial de estrés.", why: "Es la recomendación de Garmin sobre cuánto exigirte hoy.", ref: "Óptima 95–100 · Alta 75–94 · Moderada 50–74 · Baja 25–49 · Muy baja < 25.", tip: "Revisa qué factor está más bajo en la sección Recuperación: te dice qué mejorar." },
  body_battery: { t: "Body Battery", what: "Tu nivel de energía de 5 a 100, como la batería de un móvil. Lo carga el descanso (sobre todo dormir) y lo gastan el ejercicio, el estrés y la actividad.", why: "Te ayuda a planificar el día y a ver qué te agota.", ref: "Al despertar lo ideal es > 70. Por debajo de 25 conviene descansar.", tip: "Siestas cortas, pausas sin pantalla y cenar ligero ayudan a cargarla." },
  sleep_score: { t: "Puntuación de sueño (Garmin)", what: "Nota de 0 a 100 que valora la duración, las fases (profundo, ligero, REM), los despertares y el estrés durante la noche.", why: "Resume la calidad de tu descanso.", ref: "Excelente 90–100 · Buena 80–89 · Aceptable 60–79 · Deficiente < 60.", tip: "Habitación fresca (18–20 °C) y oscura, sin alcohol ni pantallas antes de dormir, y horarios fijos." },
  hrv: { t: "Variabilidad de la frecuencia cardiaca (VFC/HRV)", what: "Las pequeñas variaciones de tiempo entre un latido y el siguiente, medidas mientras duermes (en milisegundos).", why: "Una VFC alta respecto a tu normal indica un sistema nervioso relajado y recuperado; una VFC baja, estrés, fatiga o enfermedad. Es de los mejores indicadores de recuperación.", ref: "Es muy individual: compárala solo con tu propia línea base. Garmin la marca como Equilibrada cuando tu media de 7 días está en tu rango.", tip: "Sube con sueño regular, ejercicio aeróbico, respiración lenta y menos alcohol." },
  rhr: { t: "Frecuencia cardiaca en reposo", what: "Tus pulsaciones por minuto en total reposo, normalmente durante el sueño.", why: "Un corazón entrenado late menos en reposo. Si sube varios latidos sobre tu normal, suele indicar fatiga, estrés, deshidratación o el inicio de una enfermedad.", ref: "Adultos 60–80 ppm; deportistas 40–60. Más de 80 de forma sostenida se asocia a más riesgo cardiovascular.", tip: "Baja con entrenamiento aeróbico regular y buen descanso." },
  stress: { t: "Estrés (Garmin)", what: "Nivel de 0 a 100 estimado a partir de tu VFC durante el día cuando estás quieto.", why: "Refleja la carga del sistema nervioso: trabajo, preocupaciones, cafeína, falta de sueño o digestión.", ref: "0–25 reposo · 26–50 bajo · 51–75 medio · 76–100 alto.", tip: "2–5 minutos de respiración lenta (actividad Respiración del reloj) bajan el estrés al momento." },
  steps: { t: "Pasos", what: "Pasos diarios contados por el acelerómetro del reloj.", why: "El movimiento diario, además del entrenamiento, reduce el riesgo cardiovascular y metabólico.", ref: "El beneficio para la salud crece claramente hasta ~8.000–10.000 pasos al día.", tip: "Llamadas caminando, escaleras y bajarte una parada antes suman rápido." },
  intensity: { t: "Minutos de intensidad", what: "Minutos de actividad moderada (cuentan x1) o vigorosa (x2), como recomienda la OMS.", why: "Es la métrica con más evidencia en salud: 150 minutos a la semana reducen la mortalidad de forma notable.", ref: "OMS: 150–300 min moderados o 75–150 vigorosos por semana.", tip: "Reparte a lo largo de la semana; bloques de 10 minutos ya cuentan." },
  spo2: { t: "Saturación de oxígeno (SpO₂)", what: "El porcentaje de oxígeno en tu sangre, medido de noche con luz en la muñeca.", why: "Caídas repetidas por debajo del 88–90 % pueden indicar apnea del sueño. También te dice cómo te aclimatas a la altitud.", ref: "Normal 95–100 % a nivel del mar; algo menos en altura.", tip: "Actívalo solo durante el sueño para ahorrar batería. Si ves caídas frecuentes, revisa la sección Salud." },
  vo2max: { t: "VO2 máx.", what: "El máximo de oxígeno que tu cuerpo puede usar por minuto y kilo. Es el tamaño de tu motor aeróbico.", why: "Es uno de los predictores más potentes de longevidad y salud cardiovascular, y define tu techo de rendimiento.", ref: "Depende de edad y sexo; mira tu categoría en la sección Salud.", tip: "Mejora con series de 3–5 min a ritmo fuerte y con volumen aeróbico constante." },
  fitness_age: { t: "Edad física", what: "La edad que corresponde a tu VO2 máx., pulso en reposo, IMC y actividad.", why: "Una forma intuitiva de ver si tu cuerpo funciona como el de alguien más joven o mayor.", ref: "Por debajo de tu edad real = buena señal.", tip: "Sube la actividad vigorosa semanal y mejora el peso corporal." },
  training_status: { t: "Estado de entrenamiento", what: "Cómo evoluciona tu forma física según tu carga y tu VO2 máx.: productivo, mantenimiento, recuperación, pico, sobrecarga, no productivo o pérdida de forma.", why: "Te dice si tu entrenamiento está funcionando.", ref: "Lo ideal es alternar Productivo y Mantenimiento, con algo de Recuperación.", tip: "«No productivo» suele significar que la carga está bien pero no recuperas: revisa el sueño y el estrés." },
  acwr: { t: "Carga aguda vs crónica (ACWR)", what: "Compara tu carga de los últimos 7 días (aguda) con la de las últimas 4 semanas (crónica, a lo que tu cuerpo está acostumbrado).", why: "Subir la carga más rápido de lo que te adaptas es la primera causa de lesiones.", ref: "0,8–1,3 zona óptima · 1,3–1,5 precaución · > 1,5 alto riesgo de lesión.", tip: "Sube el volumen como máximo un 10–20 % por semana y haz una semana de descarga cada 3–4." },
  load_focus: { t: "Enfoque de carga", what: "Cómo se reparte tu carga de 4 semanas entre aeróbico bajo (suave), aeróbico alto (umbral/tempo) y anaeróbico (series muy intensas).", why: "Un buen entrenamiento necesita las tres, en proporción a tu objetivo.", ref: "El recuadro marca el rango objetivo de Garmin para cada una.", tip: "Si falta aeróbico bajo: más rodajes suaves. Si falta anaeróbico: series cortas." },
  sleep_stages: { t: "Fases del sueño", what: "Ligero (transición), profundo (reparación física y del sistema inmune) y REM (memoria, aprendizaje y emociones). Se repiten en ciclos de ~90 min.", why: "Cada fase cumple una función: el profundo domina al inicio de la noche y el REM al final.", ref: "Profundo 13–23 % · REM 20–25 % · Ligero ~50–60 %.", tip: "El alcohol reduce el REM; las cenas copiosas y el calor reducen el profundo." },
  race: { t: "Predicciones de carrera", what: "Tiempo estimado por Garmin para 5 K, 10 K, media y maratón, basado en tu VO2 máx. y tu historial.", why: "Sirve para elegir objetivos realistas y ritmos de entrenamiento.", ref: "En distancias largas asumen que has hecho tiradas largas suficientes.", tip: "Si tu objetivo es más rápido que la predicción, el plan del entrenador te dirá cuánto falta." },
  endurance: { t: "Puntuación de resistencia", what: "Tu capacidad de sostener esfuerzos largos, combinando VO2 máx. y carga de entrenamiento de todos tus deportes.", why: "Complementa al VO2 máx.: mide aguante, no solo motor.", ref: "Categorías de Recreativo a Élite.", tip: "Sube con sesiones largas y constancia semanal." },
  lactate: { t: "Umbral de lactato", what: "El pulso y ritmo a partir de los cuales el lactato se acumula más rápido de lo que lo eliminas. Es el esfuerzo que puedes sostener ~1 hora.", why: "Es la mejor referencia para fijar tus zonas de entrenamiento personales.", ref: "Garmin lo detecta con banda de pecho en carreras con esfuerzos sostenidos.", tip: "Haz la prueba guiada del reloj cada 6–8 semanas." },
  zones: { t: "Zonas de frecuencia cardiaca", what: "Rangos de pulso que corresponden a intensidades: Z1 muy suave, Z2 aeróbico, Z3 tempo, Z4 umbral, Z5 máximo.", why: "Cada zona entrena algo distinto. Los mejores resultados llegan con ~80 % del tiempo en Z1–Z2 y ~20 % en Z4–Z5.", ref: "Evita pasar demasiado tiempo en Z3: cansa bastante y aporta poco.", tip: "Configura las zonas por FC umbral en el reloj para mayor precisión." },
  decoupling: { t: "Desacople aeróbico (Pa:HR)", what: "Compara la relación entre ritmo (o potencia) y pulso en la primera y la segunda mitad de una sesión continua.", why: "Si el pulso sube mientras el ritmo se mantiene, tu base aeróbica todavía no aguanta esa duración. Es una de las métricas favoritas de los entrenadores de resistencia.", ref: "< 5 % excelente base aeróbica · 5–10 % aceptable · > 10 % la duración supera tu base (o hubo calor o deshidratación). Solo tiene sentido en sesiones continuas de ≥ 40 min.", tip: "Más volumen en zona 2, salir más lento al principio e hidratarte en sesiones largas." },
  le8: { t: "Salud cardiovascular (Life's Essential 8)", what: "Índice de 0 a 100 de la American Heart Association con 8 factores: actividad, sueño, peso, presión, tabaco, colesterol, glucosa y alimentación.", why: "Cada 10 puntos más se asocian a menos infartos, ACV y demencia.", ref: "Alta ≥ 80 · Moderada 50–79 · Baja < 50.", tip: "El reloj mide 3 factores; completa el resto en tu Perfil para un cálculo completo." },
};

function info(key) {
  return GLOSSARY[key] ? ` <button class="info" data-info="${key}" aria-label="¿Qué significa?">?</button>` : "";
}

document.addEventListener("click", (e) => {
  const b = e.target.closest?.(".info");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const g = GLOSSARY[b.dataset.info];
  modal(`<h2>${g.t}</h2>
    <div class="gloss"><h3>¿Qué es?</h3><p>${g.what}</p><h3>¿Por qué importa?</h3><p>${g.why}</p>
    <h3>Valores de referencia</h3><p>${g.ref}</p><h3>¿Cómo mejorarlo?</h3><p>${g.tip}</p></div>
    <div class="actions"><button class="primary" id="b-close-g">Entendido</button></div>`);
  $("#b-close-g").onclick = () => modal("");
});

/* ============================================================ piezas comunes */
const TONE_DOT = (t) => (t ? `var(--${t})` : "var(--text-muted)");
function stories(section) {
  const items = day()?.story?.[section] || [];
  if (!items.length) return "";
  return `<div class="story card"><div class="story-head">En palabras simples</div>${items.map((i) => `
    <div class="story-item"><span class="dot" style="background:${TONE_DOT(i.tone)}"></span><div><b>${i.title}</b><p>${i.text}</p></div></div>`).join("")}</div>`;
}

const scoreTone = (v) => (v >= 8.5 ? "good" : v >= 7 ? "good" : v >= 5 ? "warning" : "critical");
const INTENSITY_ST = { descanso: "", suave: "good", moderada: "warning", intensa: "serious" };

function evalBlock(c, a) {
  return `<details class="eval"><summary>Evaluación del entrenador · <b>${c.grade}</b> (${nf(c.score, 1)}/10)</summary>
    ${c.purpose ? `<p class="muted">${c.purpose}</p>` : ""}
    ${c.good.length ? `<div class="ev-list good">${c.good.map((x) => `<div>✓ ${x}</div>`).join("")}</div>` : ""}
    ${c.improve.length ? `<div class="ev-list warn">${c.improve.map((x) => `<div>! ${x}</div>`).join("")}</div>` : ""}
    ${(c.context || []).length ? `<div class="ev-list">${c.context.map((x) => `<div>☀ ${x}</div>`).join("")}</div>` : ""}
    ${detailBlock(a)}
    <p class="muted">${c.next}${c.recovery_h ? ` Recuperación estimada: ~${c.recovery_h} h.` : ""}</p>
    ${state.data.ai_enabled ? `<button class="secondary ask-ai" data-q="Evalúa en detalle mi sesión «${(a.name || "").replace(/"/g, "")}» del ${a.date || ""}: qué hice bien, qué mejorar y qué hago después.">Pedir análisis detallado a la IA</button>` : ""}
  </details>`;
}

/* ---------------- detalle de actividad: parciales, gráfico y clima */
function detailBlock(a) {
  const d = a.detail || {};
  if (!d.laps && !d.series && !d.weather && !d.sets) return "";
  const run = actGroup(a.type) === "running";
  const chips = [];
  if (d.weather?.temp_c != null) chips.push(`${nf(d.weather.temp_c, 0)} °C${d.weather.humidity ? ` · ${d.weather.humidity}% hum.` : ""}${d.weather.desc ? ` · ${d.weather.desc}` : ""}`);
  if (d.decoupling != null) chips.push(`Desacople aeróbico ${nf(d.decoupling, 1)}%`);
  if (d.split_diff != null && run) chips.push(d.split_diff > 1 ? `Parcial negativo (+${nf(d.split_diff, 0)}%)` : d.split_diff < -1 ? `Parcial positivo (${nf(d.split_diff, 0)}%)` : "Ritmo parejo");
  const laps = actGroup(a.type) === "strength" || !(d.laps || []).some((l) => l.dist_m > 0) ? [] : (d.laps || []).slice(0, 30);
  const hasSpeed = (d.series?.speed || []).some((v) => v > 0.5);
  const id = String(a.id || a.date + a.name).replace(/\W/g, "");
  return `<div class="detail">
    ${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip-s">${c}</span>`).join("")}${info("decoupling")}</div>` : ""}
    ${d.series ? `<div class="grid ${hasSpeed ? "g2" : ""}" style="margin-top:10px">
      <div><h3>Pulso</h3><div class="chart-box short"><canvas data-series="hr" data-aid="${id}"></canvas></div></div>
      ${hasSpeed ? `<div><h3>${run ? "Ritmo" : "Velocidad"}</h3><div class="chart-box short"><canvas data-series="speed" data-aid="${id}"></canvas></div></div>` : ""}</div>` : ""}
    ${laps.length ? `<div style="overflow-x:auto;margin-top:10px"><table class="laps"><thead><tr><th>Parcial</th><th>Distancia</th><th>Tiempo</th><th>${run ? "Ritmo" : "Velocidad"}</th><th>FC</th><th>Desnivel +</th></tr></thead><tbody>
      ${laps.map((l) => `<tr><td>${l.n}</td><td class="num">${l.dist_m ? nf(l.dist_m / 1000, 2) + " km" : "—"}</td><td class="num">${raceTime(l.dur_s)}</td>
        <td class="num">${l.speed ? (run ? pace(l.speed) : nf(l.speed * 3.6, 1) + " km/h") : "—"}</td><td class="num">${nf(l.hr)}</td><td class="num">${l.elev_gain != null ? nf(l.elev_gain) + " m" : "—"}</td></tr>`).join("")}
      </tbody></table></div>` : ""}
    ${d.sets ? `<table class="laps" style="margin-top:10px"><thead><tr><th>Ejercicio</th><th>Series</th><th>Reps</th><th>Máx. kg</th></tr></thead><tbody>
      ${d.sets.map((x) => `<tr><td>${x.name}</td><td class="num">${x.sets}</td><td class="num">${x.reps}</td><td class="num">${x.max_kg ? nf(x.max_kg, 1) : "—"}</td></tr>`).join("")}</tbody></table>` : ""}
  </div>`;
}

// dibuja los gráficos del detalle solo al abrir la evaluación
document.addEventListener("toggle", (e) => {
  const det = e.target;
  if (!(det instanceof HTMLDetailsElement) || !det.open || !det.classList.contains("eval")) return;
  det.querySelectorAll("canvas[data-series]").forEach((cv) => {
    const aid = cv.dataset.aid, key = cv.dataset.series;
    const act = state.data.days.flatMap((d) => d.activities).find((x) => String(x.id || "").replace(/\W/g, "") === aid);
    const s = act?.detail?.series;
    if (!s || !s[key]) return;
    const run = actGroup(act.type) === "running";
    const labels = s.t.map((t) => `${Math.floor(t / 60)}'`);
    let data = s[key], color = css("--series-2"), fmt = (v) => `${nf(v)} ppm`;
    if (key === "speed") {
      data = s.speed.map((v) => (v && v > 0.5 ? (run ? +(1000 / v / 60).toFixed(2) : +(v * 3.6).toFixed(1)) : null));
      color = css("--series-1");
      fmt = run ? (v) => `${Math.floor(v)}:${pad(Math.round((v % 1) * 60))} /km` : (v) => `${nf(v, 1)} km/h`;
    }
    const id = `c-${key}-${aid}`;
    cv.id = id;
    const o = opts({ tip: (c) => ` ${fmt(c.raw)}`, yFmt: key === "speed" && run ? (v) => `${Math.floor(v)}:${pad(Math.round((v % 1) * 60))}` : undefined });
    if (key === "speed" && run) o.scales.y.reverse = true; // ritmo: más arriba = más rápido
    chart(id, { type: "line", data: { labels, datasets: [line(key === "hr" ? "Pulso" : run ? "Ritmo" : "Velocidad", data, color, { tension: 0.25 })] }, options: o });
  });
}, true);

/* ---------------- primeros días: qué se desbloquea con el uso */
function onboardingCard() {
  const ds = state.data.data_status;
  if (!ds || state.data.source === "demo") return "";
  const items = [
    ["Índice de Recuperación", Math.min(ds.hrv_nights, 4), 4, "noches con VFC", "Duerme con el reloj puesto."],
    ["Riesgos de salud", Math.min(ds.wellness_days, 7), 7, "días de uso", "Úsalo de día y de noche."],
    ["Estado de VFC de Garmin", Math.min(ds.hrv_nights, 19), 19, "noches", "Garmin necesita unas 3 semanas para fijar tu línea base."],
    ["Disposición para entrenar", ds.has_readiness ? 1 : 0, 1, "", "Aparece tras unas noches de sueño y alguna actividad."],
    ["VO2 máx. y predicciones", ds.has_vo2 ? 1 : 0, 1, "", "Haz una carrera o ruta en bici al aire libre con GPS de al menos 15 min a buen ritmo."],
    ["Evaluación del entrenador", Math.min(ds.activities, 1), 1, "actividad", "Registra un entrenamiento con el reloj."],
  ];
  const pending = items.filter((i) => i[1] < i[2]);
  if (!pending.length) return "";
  return `<div class="card onboarding"><div class="card-head"><h2>Tus primeros días con Pulso</h2><span class="sub">desde el ${shortDate(ds.first_day)} · ${ds.days} día(s)</span></div>
    <p class="muted">Muchas métricas comparan contigo mismo, así que se activan a medida que usas el reloj:</p>
    <div class="factors">${items.map(([n, v, max, unit, how]) => `
      <div class="factor"><span class="name">${v >= max ? "✓" : "○"} ${n}</span><span class="val">${max > 1 ? `${v}/${max} ${unit}` : v >= max ? "Listo" : "Pendiente"}</span>
      <div class="bar"><div style="width:${(v / max) * 100}%;background:${v >= max ? stColor("good") : "var(--accent)"}"></div></div>
      ${v < max ? `<span class="fb">${how}</span>` : ""}</div>`).join("")}</div></div>`;
}

function coachTeaser() {
  const c = state.data.coach?.today;
  const al = state.data.health?.alerts || [];
  if (!c) return "";
  const isLatest = state.idx === state.data.days.length - 1;
  return `${onboardingCard()}${al.map((x) => `<div class="card alert ${x.level}"><b>${x.title}</b><p>${x.text}</p></div>`).join("")}
  ${isLatest ? `<a class="card teaser" href="#entrenador"><div><div class="label">Tu entrenador te recomienda hoy</div>
    <div class="teaser-title">${c.title} ${badge(cap(c.intensity), INTENSITY_ST[c.intensity])}</div><p>${c.detail}</p></div><span class="go">Ver plan ›</span></a>` : ""}`;
}

/* ============================================================ ENTRENADOR */
function viewEntrenador() {
  const co = state.data.coach || {}, t = co.today, wk = co.week, plan = co.plan, goal = co.goal;
  if (!t) return `<div class="empty">Sin datos suficientes para el entrenador.</div>`;
  const c = wk.current, p = wk.previous;
  const delta = (a, b, d = 0) => (b ? `<span class="delta">${signed(((a - b) / b) * 100, 0)}% vs semana previa</span>` : "");
  const z = plan.zones || {};
  const recent = state.data.days.flatMap((d) => d.activities.map((a) => ({ ...a, date: d.date }))).reverse().slice(0, 6);
  const dname = (s) => cap(parseDate(s).toLocaleDateString("es", { weekday: "long", day: "numeric" }));
  return `
  <div class="view-head"><div><h1>Entrenador personal</h1><p>Evalúa tus sesiones, revisa tu semana y te dice qué hacer, según tu recuperación y tu objetivo.</p></div></div>

  <div class="grid g3">
    <div class="card span2 today-card">
      <div class="label">Hoy te recomiendo</div>
      <div class="today-title">${t.title} ${badge(cap(t.intensity), INTENSITY_ST[t.intensity])}</div>
      <p class="today-detail">${t.detail}</p>
      <p><b>Por qué:</b> ${t.why}</p>
      <div class="chips">${t.reasons.map((r) => `<span class="chip-s">${r}</span>`).join("")}</div>
    </div>
    <div class="card">
      <div class="card-head"><h2>Tu objetivo</h2><a href="#perfil" class="sub">Editar</a></div>
      <div class="tile"><div class="value" style="font-size:22px">${plan.goal}</div>
      ${plan.weeks_to_race != null ? `<div class="note">${plan.weeks_to_race >= 0 ? `Faltan ${nf(plan.weeks_to_race, 1)} semanas` : "Carrera pasada"}</div>` : ""}</div>
      ${goal ? `<dl class="kv" style="margin-top:12px"><dt>Predicción actual</dt><dd>${raceTime(goal.predicted_s)}</dd>
        ${goal.target_s ? `<dt>Tu objetivo</dt><dd>${raceTime(goal.target_s)}</dd><dt>Diferencia</dt><dd>${goal.gap_s > 0 ? `faltan ${raceTime(goal.gap_s)}` : "¡ya en ritmo!"}</dd>` : ""}</dl>` : ""}
      <p class="note-box" style="margin-top:12px"><b>Fase:</b> ${plan.phase_text}</p>
    </div>
  </div>

  ${section("Plan de los próximos 7 días")}
  <div class="card plan">${plan.days.map((d, i) => `
    <div class="plan-row ${i === 0 ? "today" : ""}"><div class="plan-day">${i === 0 ? "Hoy" : dname(d.date)}</div>
      <div><b>${d.title}</b> ${badge(cap(d.intensity), INTENSITY_ST[d.intensity])}<p>${d.detail}</p></div></div>`).join("")}
  <p class="note-box" style="margin-top:8px">El plan se recalcula cada día con tu recuperación. Si un día amaneces con la recuperación baja, el entrenador cambia la sesión dura por una suave.</p></div>

  ${section("Tus zonas personales" + info("zones"))}
  <div class="grid g2">
    ${card("Pulso por zonas", z.hr ? `<table><tbody>${[["z1", "Z1 · Recuperación"], ["z2", "Z2 · Aeróbico suave"], ["z3", "Z3 · Tempo"], ["z4", "Z4 · Umbral"], ["z5", "Z5 · VO2 máx."]].map(([k, n], i) =>
      `<tr><td><span class="badge" style="--dot:var(--z${i + 1})">${n}</span></td><td class="num">${hr_txt(z, k)}</td></tr>`).join("")}</tbody></table>
      <p class="note-box" style="margin-top:8px">Calculadas con tu FC de umbral de lactato (${z.lthr} ppm).</p>` : `<p class="muted">Sin umbral de lactato. Haz la prueba guiada del reloj (sección Mi reloj).</p>`)}
    ${card("Ritmos de carrera", z.pace ? `<table><tbody>${[["suave", "Rodaje suave"], ["largo", "Tirada larga"], ["tempo", "Tempo"], ["umbral", "Umbral"], ["vo2", "Series VO2 máx."]].map(([k, n]) =>
      `<tr><td>${n}</td><td class="num">${z.pace[k]}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Se calculan con tu umbral o tus predicciones de carrera.</p>`)}
  </div>

  ${section("Revisión de la semana", "últimos 7 días")}
  <div class="grid g6">
    ${tile("Sesiones", nf(c.sessions), "", delta(c.sessions, p.sessions))}
    ${tile("Tiempo", hm(c.hours * 3600), "h", delta(c.hours, p.hours))}
    ${tile("Distancia", nf(c.km, 1), "km", delta(c.km, p.km))}
    ${tile("Carga", nf(c.load), "", delta(c.load, p.load))}
    ${tile("Tiempo suave (Z1–Z2)", nf(c.easy_pct), "%", "Objetivo ~80 %")}
    ${tile("Nota media", nf(wk.avg_score, 1), "/10", `${c.rest_days} día(s) de descanso`)}
  </div>
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>${wk.verdict}</h2></div>
    ${wk.notes.map(([tone, txt]) => `<div class="story-item"><span class="dot" style="background:${TONE_DOT(tone)}"></span><div><p>${txt}</p></div></div>`).join("")}
    <div class="stack" style="margin-top:14px;height:12px">
      <div data-tip="Suave Z1–Z2: ${c.easy_pct}%" style="width:${c.easy_pct}%;background:var(--z2)"></div>
      <div data-tip="Tempo Z3: ${c.mid_pct}%" style="width:${c.mid_pct}%;background:var(--z3)"></div>
      <div data-tip="Intenso Z4–Z5: ${c.hard_pct}%" style="width:${c.hard_pct}%;background:var(--z5)"></div>
    </div>${legend([["Suave Z1–Z2", css("--z2")], ["Tempo Z3", css("--z3")], ["Intenso Z4–Z5", css("--z5")]])}
  </div>

  ${section("Notas de tus sesiones", `${state.range} días`)}
  <div class="card">${canvas("c-scores")}</div>

  ${section("Últimas sesiones evaluadas")}
  ${recent.map((a) => { const [n, icon] = actInfo(a.type); return `<div class="card act act-s">
      <div class="icon">${icon}</div>
      <div><div class="name">${a.name || n}</div><div class="meta">${cap(longDate(a.date))} · ${hm(a.duration_s)} h${a.distance_m ? ` · ${nf(a.distance_m / 1000, 1)} km` : ""}</div></div>
      <div class="m"><b><span class="score ${scoreTone(a.coach.score)}">${nf(a.coach.score, 1)}</span></b><span>${a.coach.grade}</span></div>
      ${evalBlock(a.coach, a)}</div>`; }).join("")}

  ${section("Pregúntale a tu entrenador", "IA")}
  ${chatPanel()}`;
}

function afterEntrenador() {
  const ds = rangeDays();
  const acts = ds.flatMap((d) => d.activities.map((a) => ({ ...a, date: d.date })));
  chart("c-scores", {
    type: "bar",
    data: { labels: acts.map((a) => shortDate(a.date)), datasets: [bars("Nota", acts.map((a) => a.coach?.score), acts.map((a) => stColor(scoreTone(a.coach?.score || 0))))] },
    options: opts({ yMin: 0, yMax: 10, tip: (c) => ` ${acts[c.dataIndex].name}: ${nf(c.raw, 1)}/10 · ${acts[c.dataIndex].coach.grade}` }),
  });
  bindChat();
}

function hr_txt(z, key) {
  const r = z.hr?.[key];
  if (!r) return "—";
  return r[0] == null ? `< ${r[1]} ppm` : r[1] == null ? `> ${r[0]} ppm` : `${r[0]}–${r[1]} ppm`;
}

/* ---------------- chat con IA */
const QUICK = [
  "Evalúa mi último entrenamiento",
  "¿Qué entreno hoy y por qué?",
  "Analiza mi semana y dime qué mejorar",
  "Explícame mi sueño de anoche en palabras simples",
  "¿Qué dicen mis datos de mi salud cardiovascular?",
  "Diséñame un plan de 4 semanas para mi objetivo",
];
state.chat = (() => { try { return JSON.parse(store("pulso-chat") || "[]"); } catch { return []; } })();

function chatPanel() {
  if (!state.data.ai_enabled) {
    return `<div class="card note-box"><p><b>Activa el entrenador conversacional.</b> Usa Claude para responder preguntas sobre tus datos, evaluar sesiones en detalle y diseñar planes.</p>
      <p>1. Crea una clave en <b>console.anthropic.com</b> (API Keys). &nbsp;2. Copia <code>.env.example</code> como <code>.env</code> y añade <code>ANTHROPIC_API_KEY=tu_clave</code>. &nbsp;3. Reinicia la app con <code>iniciar.bat</code>.</p>
      <p class="muted">Tiene un coste por uso (unos céntimos por pregunta). Todo lo demás de la app funciona sin ella.</p></div>`;
  }
  return `<div class="card chat">
    <div id="chat-log" class="chat-log">${state.chat.length ? state.chat.map(msgHtml).join("") : `<p class="muted">Pregúntame lo que quieras sobre tus entrenamientos, tu sueño o tu salud. Conozco tus datos de las últimas semanas.</p>`}</div>
    <div class="chips">${QUICK.map((q) => `<button class="chip-s q" data-q="${q}">${q}</button>`).join("")}</div>
    <form id="chat-form" class="chat-form"><input id="chat-in" placeholder="Escribe tu pregunta…" autocomplete="off"><button class="primary" type="submit">Enviar</button>
    <button class="secondary" type="button" id="chat-clear" title="Borrar conversación">Borrar</button></form>
    <p class="fine muted">Orientación deportiva y educativa; no sustituye a un médico.</p></div>`;
}

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
function md(s) {
  const lines = esc(s).split("\n");
  let html = "", inList = false;
  for (const l of lines) {
    const li = l.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
    if (li) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${li[1]}</li>`; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    if (/^#{1,4}\s/.test(l)) html += `<h4>${l.replace(/^#+\s/, "")}</h4>`;
    else if (l.trim()) html += `<p>${l}</p>`;
  }
  if (inList) html += "</ul>";
  return html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<i>$2</i>").replace(/_\((.+?)\)_/g, "<i>($1)</i>");
}
const msgHtml = (m) => `<div class="msg ${m.role}">${m.role === "user" ? esc(m.content) : md(m.content)}</div>`;

function bindChat() {
  $$(".ask-ai").forEach((b) => (b.onclick = () => { location.hash = "entrenador"; setTimeout(() => sendChat(b.dataset.q), 50); }));
  const f = $("#chat-form");
  if (!f) return;
  f.onsubmit = (e) => { e.preventDefault(); const v = $("#chat-in").value.trim(); if (v) { $("#chat-in").value = ""; sendChat(v); } };
  $$(".q").forEach((b) => (b.onclick = () => sendChat(b.dataset.q)));
  $("#chat-clear").onclick = () => { state.chat = []; store("pulso-chat", "[]"); render(); };
}

async function sendChat(text) {
  if (state.chatBusy) return;
  state.chatBusy = true;
  state.chat.push({ role: "user", content: text }, { role: "assistant", content: "" });
  const log = $("#chat-log");
  const redraw = () => { if (log) { log.innerHTML = state.chat.map(msgHtml).join(""); log.scrollTop = log.scrollHeight; } };
  redraw();
  const cur = state.chat[state.chat.length - 1];
  try {
    const res = await fetch("/api/coach/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: state.chat.slice(0, -1), demo: state.demo }),
    });
    if (!res.ok) { cur.content = (await res.json().catch(() => ({}))).detail || "Error"; redraw(); return; }
    const reader = res.body.getReader(), dec = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      cur.content += dec.decode(value, { stream: true });
      redraw();
    }
  } catch (e) {
    cur.content = "No se pudo conectar: " + e.message;
    redraw();
  } finally {
    state.chatBusy = false;
    store("pulso-chat", JSON.stringify(state.chat.slice(-30)));
  }
}

/* ============================================================ SALUD */
const LEVEL_ST = { good: "good", warning: "warning", serious: "serious", critical: "critical", unknown: "" };
const ST_LABEL = { good: "Bien", warning: "Atención", serious: "Riesgo", critical: "Alto riesgo", unknown: "Sin datos" };

function viewSalud() {
  const h = state.data.health || {};
  if (!h.risks) return `<div class="empty">Sin datos suficientes.</div>`;
  const le = h.le8, f = h.fitness, v = h.vitals;
  return `
  <div class="view-head"><div><h1>Salud y prevención</h1><p>Señales de tu reloj y de tu perfil que, en conjunto, indican qué vigilar.</p></div></div>
  <div class="card disclaimer">⚕️ <b>Esto no es un diagnóstico.</b> Son indicadores orientativos basados en factores de riesgo reconocidos (American Heart Association, OMS, guías de hipertensión y sueño). Un reloj no mide presión, colesterol ni glucosa, ni detecta arritmias por sí solo. Ante síntomas o valores preocupantes, consulta a tu médico.</div>
  ${(h.alerts || []).map((x) => `<div class="card alert ${x.level}"><b>${x.title}</b><p>${x.text}</p></div>`).join("")}

  ${section("Tu salud cardiovascular" + info("le8"), "AHA Life's Essential 8")}
  <div class="grid g3">
    <div class="card ring-card">
      ${ring(le.score, 100, stColor(le.score == null ? "" : le.score >= 80 ? "good" : le.score >= 50 ? "warning" : "critical"), nf(le.score), "de 100")}
      <div class="title">Salud cardiovascular ${le.level ? badge(le.level, le.score >= 80 ? "good" : le.score >= 50 ? "warning" : "critical") : ""}</div>
      <div class="caption">Calculada con ${le.complete} de ${le.of} factores. ${le.complete < le.of ? `<a href="#perfil">Completa tu perfil</a> para afinarla.` : ""}</div>
    </div>
    <div class="card span2"><div class="factors">${le.components.map((c) => `
      <div class="factor"><span class="name">${c.name} <span class="muted">· ${c.value}</span></span><span class="val">${c.score == null ? "—" : c.score}</span>
      <div class="bar"><div style="width:${c.score || 0}%;background:${stColor(c.score == null ? "" : c.score >= 80 ? "good" : c.score >= 50 ? "warning" : "critical")}"></div></div>
      ${c.tip ? `<span class="fb">${c.tip}</span>` : ""}</div>`).join("")}</div></div>
  </div>

  ${section("Indicadores de riesgo")}
  <div class="grid g2 risks">${h.risks.map(riskCard).join("")}</div>

  ${section("Tu forma física como protección")}
  <div class="grid g4">
    ${tile("VO2 máx." + info("vo2max"), nf(f.vo2max, 1), "", f.vo2_category ? `${f.vo2_category} para tu edad y sexo` : "Sin estimación")}
    ${tile("FC en reposo (30 d)" + info("rhr"), nf(v.rhr30), "ppm", v.rhr_base ? `Base previa ${nf(v.rhr_base)}` : "")}
    ${tile("VFC nocturna (30 d)" + info("hrv"), nf(v.hrv30), "ms", `Referencia para tu edad ≈ ${f.hrv_norm} ms`)}
    ${tile("Presión arterial", f.bp ? `${f.bp.sys}/${f.bp.dia}` : "—", "mmHg", f.bp ? f.bp.source : "Regístrala en Garmin Connect o en tu Perfil")}
  </div>

  ${section("Tendencias de tus signos vitales", "90 días")}
  <div class="grid g2">
    ${card("FC en reposo", canvas("c-h-rhr") + legend([["FC en reposo", css("--series-2")], ["Media móvil 14 d", css("--series-1")]]), "ppm")}
    ${card("VFC nocturna", canvas("c-h-hrv") + legend([["VFC nocturna", css("--series-1")], ["Referencia para tu edad", css("--text-muted")]]), "ms")}
    ${card("Oxígeno nocturno mínimo" + info("spo2"), canvas("c-h-spo2") + legend([["SpO₂ mínima", css("--series-3")], ["Umbral de alerta 88 %", css("--text-muted")]]), "%")}
    ${h.bp_readings?.length ? card("Presión arterial", canvas("c-h-bp") + legend([["Sistólica", css("--series-2")], ["Diastólica", css("--series-1")]]), "mmHg")
      : card("Presión arterial", `<p class="muted">No hay mediciones. Es el factor más importante para prevenir infarto y ACV: mídela varias mañanas al mes y regístrala en Garmin Connect (Salud > Presión arterial).</p>`)}
    ${h.weights?.length ? card("Peso", canvas("c-h-weight"), "kg") : ""}
  </div>`;
}

function riskCard(r) {
  const st = LEVEL_ST[r.level];
  return `<div class="card risk">
    <div class="risk-head"><span class="risk-icon">${r.icon}</span><div><h2>${r.name}</h2><div class="muted small">${r.intro}</div></div>${badge(r.label, st)}</div>
    <div class="progress" style="margin:12px 0 8px"><div style="width:${r.level === "unknown" ? 0 : Math.max(4, r.index)}%;background:${stColor(st)}"></div></div>
    <p>${r.summary}</p>
    ${r.actions.length ? `<div class="ev-list"><b>Qué puedes hacer:</b>${r.actions.map((a) => `<div>→ ${a}</div>`).join("")}</div>` : ""}
    <details><summary>Ver los ${r.factors.length} factores analizados (datos del ${r.coverage}%)</summary>
      <table><tbody>${r.factors.map((f) => `<tr><td><b>${f.name}</b><div class="muted small">${f.why}</div></td><td class="num">${f.value}</td><td>${badge(ST_LABEL[f.status], LEVEL_ST[f.status])}</td></tr>`).join("")}</tbody></table>
      ${r.to_complete.length ? `<p class="note-box"><b>Para afinar este indicador:</b> ${r.to_complete.join(" ")}</p>` : ""}
    </details></div>`;
}

function afterSalud() {
  const h = state.data.health;
  const ds = state.data.days.slice(Math.max(0, state.idx - 89), state.idx + 1), labels = ds.map((x) => shortDate(x.date));
  const rhr = ds.map((x) => x.heart?.rhr ?? null);
  const roll = rhr.map((_, i) => avg(rhr.slice(Math.max(0, i - 13), i + 1)));
  chart("c-h-rhr", { type: "line", data: { labels, datasets: [line("FC en reposo", rhr, css("--series-2"), { pointRadius: 1.5 }), line("Media 14 d", roll.map((v) => (v ? +v.toFixed(1) : null)), css("--series-1"))] }, options: opts({}) });
  const norm = h.fitness.hrv_norm;
  chart("c-h-hrv", { type: "line", data: { labels, datasets: [line("VFC", ds.map((x) => x.hrv?.last_night ?? null), css("--series-1"), { pointRadius: 1.5 }), line("Referencia edad", ds.map(() => norm), css("--text-muted"), { borderWidth: 1, pointHoverRadius: 0 })] }, options: opts({}) });
  chart("c-h-spo2", { type: "line", data: { labels, datasets: [line("SpO₂ mínima", ds.map((x) => x.sleep?.lowest_spo2 ?? null), css("--series-3"), { pointRadius: 2, tension: 0.2 }), line("Umbral 88 %", ds.map(() => 88), css("--text-muted"), { borderWidth: 1, pointHoverRadius: 0 })] }, options: opts({ yMin: 75, yMax: 100 }) });
  if (h.bp_readings?.length) {
    const b = h.bp_readings;
    chart("c-h-bp", { type: "line", data: { labels: b.map((x) => shortDate(x.date)), datasets: [line("Sistólica", b.map((x) => x.sys), css("--series-2"), { pointRadius: 3 }), line("Diastólica", b.map((x) => x.dia), css("--series-1"), { pointRadius: 3 })] }, options: opts({ yMin: 50 }) });
  }
  if (h.weights?.length) {
    const w = h.weights;
    chart("c-h-weight", { type: "line", data: { labels: w.map((x) => shortDate(x.date)), datasets: [line("Peso", w.map((x) => x.kg), css("--series-7"), { pointRadius: 3 })] }, options: opts({ tip: (c) => ` ${nf(c.raw, 1)} kg` }) });
  }
}

/* ============================================================ MI RELOJ */
function viewReloj() {
  const dv = state.data.device || {}, u = dv.usage || {};
  const pct = (x) => (x == null ? "—" : nf(x * 100));
  const cats = [...new Set((dv.tips || []).map((t) => t.category))];
  const PRIO = { alta: "serious", media: "warning", baja: "" };
  return `
  <div class="view-head"><div><h1>Mi reloj</h1><p>${dv.devices?.[0] || "Garmin fēnix 8"} · Cómo lo usas y cómo sacarle más partido según tus actividades y tu estilo de vida.</p></div></div>
  ${section("Cómo usas el reloj", "últimos 30 días")}
  <div class="grid g6">
    ${tile("Noches con sueño", pct(u.sleep_nights), "%", "Objetivo: todas")}
    ${tile("Noches con VFC", pct(u.hrv_nights), "%", "Clave para la recuperación")}
    ${tile("Noches con SpO₂", pct(u.spo2_nights), "%", "Para detectar apnea")}
    ${tile("Uso diario", u.wear_h ? nf(u.wear_h, 1) : "—", "h", "Objetivo: > 22 h")}
    ${tile("Actividades/semana", nf(u.acts_week, 1), "", Object.entries(u.groups || {}).map(([k, n]) => `${(GROUPS.find((g) => g[0] === k) || [0, k])[1]} ${n}`).join(" · "))}
    ${tile("Con pulso registrado", pct(u.with_zones), "%", "De tus actividades")}
  </div>
  ${section("Recomendaciones de configuración", `${(dv.tips || []).length} consejos`)}
  <div class="filters">${["Todas", ...cats].map((c, i) => `<button data-c="${c}" class="${i === 0 ? "on" : ""}">${c}</button>`).join("")}</div>
  <div class="grid g2 tips">${(dv.tips || []).map((t) => `
    <div class="card tipc" data-cat="${t.category}">
      <div class="tip-head"><span class="tag">${t.category}</span>${badge("Prioridad " + t.priority, PRIO[t.priority])}</div>
      <h2>${t.title}</h2>
      <p><b>Por qué (según tus datos):</b> ${t.why}</p>
      <p class="how"><b>Cómo hacerlo:</b> ${t.how}</p>
    </div>`).join("")}</div>
  <p class="note-box" style="margin-top:14px">Las rutas de menú corresponden al fēnix 8 con software reciente y pueden variar un poco según la versión. En el reloj, mantén pulsado el botón MENU para abrir los Ajustes.</p>`;
}

document.addEventListener("click", (e) => {
  const b = e.target.closest?.(".filters button[data-c]");
  if (!b) return;
  $$(".filters button[data-c]").forEach((x) => x.classList.toggle("on", x === b));
  $$(".tipc").forEach((c) => (c.hidden = b.dataset.c !== "Todas" && c.dataset.cat !== b.dataset.c));
});

/* ============================================================ PERFIL */
const FIELDS = [
  ["Objetivo", [
    ["goal", "Objetivo principal", "select", [["salud", "Salud general"], ["5k", "5 K"], ["10k", "10 K"], ["media", "Media maratón"], ["maraton", "Maratón"], ["trail", "Trail"], ["triatlon", "Triatlón"], ["ciclismo", "Ciclismo"], ["fuerza", "Fuerza"], ["peso", "Perder peso"]]],
    ["race_date", "Fecha de la carrera", "date"],
    ["target_time", "Tiempo objetivo (h:mm:ss)", "text"],
    ["days_per_week", "Días de entrenamiento por semana", "select", [2, 3, 4, 5, 6, 7].map((n) => [n, n])],
    ["experience", "Experiencia", "select", [["principiante", "Principiante"], ["intermedio", "Intermedio"], ["avanzado", "Avanzado"]]],
    ["injuries", "Lesiones previas o molestias", "text"],
  ]],
  ["Datos corporales (vacío = usar los de Garmin)", [
    ["sex", "Sexo", "select", [["", "—"], ["M", "Hombre"], ["F", "Mujer"]]],
    ["age", "Edad", "number"], ["height_cm", "Altura (cm)", "number"], ["weight_kg", "Peso (kg)", "number"],
  ]],
  ["Cuestionario de salud (opcional, mejora los indicadores)", [
    ["smoking", "Tabaco", "select", [["", "—"], ["nunca", "Nunca he fumado"], ["ex5", "Lo dejé hace más de 5 años"], ["ex1", "Lo dejé hace 1–5 años"], ["reciente", "Lo dejé hace menos de 1 año"], ["actual", "Fumo actualmente"]]],
    ["bp_sys", "Presión sistólica (la alta, mmHg)", "number"], ["bp_dia", "Presión diastólica (la baja, mmHg)", "number"],
    ["bp_meds", "Tomo medicación para la presión", "check"],
    ["non_hdl", "Colesterol no-HDL (total − HDL, mg/dL)", "number"], ["chol_meds", "Tomo medicación para el colesterol", "check"],
    ["glucose", "Glucosa en ayunas (mg/dL)", "number"], ["a1c", "HbA1c (%)", "number"], ["diabetes", "Tengo diabetes diagnosticada", "check"],
    ["diet", "¿Cómo valoras tu alimentación?", "select", [["", "—"], [0, "Muy mala"], [1, "Mala"], [2, "Regular"], [3, "Buena"], [4, "Excelente (mediterránea)"]]],
    ["alcohol_week", "Bebidas alcohólicas por semana", "number"],
    ["family_cvd", "Padres o hermanos con infarto/ACV antes de los 55–65", "check"],
    ["family_diabetes", "Padres o hermanos con diabetes", "check"],
    ["snoring", "Ronco fuerte o me dicen que hago pausas al respirar", "check"],
  ]],
];

function viewPerfil() {
  return `
  <div class="view-head"><div><h1>Perfil y objetivos</h1><p>Personaliza el entrenador y completa los datos que el reloj no puede medir.</p></div></div>
  ${state.demo ? `<div class="card disclaimer">Estás viendo datos de demostración: lo que guardes aquí se aplicará a tus datos reales de Garmin.</div>` : ""}
  <form id="f-profile">${FIELDS.map(([title, fs]) => `${section(title)}<div class="card form-grid">${fs.map(([k, label, type, opts]) =>
    type === "select" ? `<label>${label}<select name="${k}">${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label>` :
    type === "check" ? `<label class="check"><input type="checkbox" name="${k}"> ${label}</label>` :
    `<label>${label}<input name="${k}" type="${type}" ${type === "number" ? 'step="any"' : ""}></label>`).join("")}</div>`).join("")}
  <div class="actions" style="margin-top:18px"><button class="primary" type="submit">Guardar y recalcular</button><span id="p-msg" class="muted"></span></div>
  </form>
  <p class="note-box" style="margin-top:14px">Tus datos se guardan solo en este equipo (carpeta <code>data/</code>). Si usas el entrenador con IA, se envía un resumen de tus datos a Claude (Anthropic) para responderte.</p>`;
}

async function afterPerfil() {
  const f = $("#f-profile");
  try {
    const { manual, garmin } = await api("/api/profile");
    for (const el of f.elements) {
      if (!el.name) continue;
      const v = manual[el.name];
      if (el.type === "checkbox") el.checked = !!v;
      else if (v != null) el.value = v;
      if (garmin[el.name] != null && el.tagName === "INPUT" && el.type !== "checkbox") el.placeholder = `Garmin: ${garmin[el.name]}`;
    }
  } catch { /* sin perfil guardado */ }
  f.onsubmit = async (e) => {
    e.preventDefault();
    const values = {};
    for (const el of f.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") values[el.name] = el.checked;
      else if (el.type === "number" || el.name === "days_per_week" || el.name === "diet") values[el.name] = el.value === "" ? null : Number(el.value);
      else values[el.name] = el.value === "" ? null : el.value;
    }
    await api("/api/profile", { values });
    $("#p-msg").textContent = "Guardado. Recalculando…";
    await loadData(state.demo);
    location.hash = "salud";
  };
}
