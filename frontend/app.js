/* Pulso — panel de salud y rendimiento con datos de Garmin */
"use strict";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const state = {
  data: null,
  idx: 0,
  range: 30,
  view: "hoy",
  actFilter: "all",
  demo: false,
  status: null,
};

function store(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch { return null; }
}

/* ============================================================ traducciones */
const QUAL = { EXCELLENT: "Excelente", GOOD: "Bueno", FAIR: "Aceptable", POOR: "Deficiente" };
const QUAL_ST = { EXCELLENT: "good", GOOD: "good", FAIR: "warning", POOR: "critical" };
const READY = { PRIME: "Óptima", HIGH: "Alta", MODERATE: "Moderada", LOW: "Baja", POOR: "Muy baja" };
const READY_ST = { PRIME: "good", HIGH: "good", MODERATE: "warning", LOW: "serious", POOR: "critical" };
const HRV_ST = { BALANCED: ["Equilibrado", "good"], UNBALANCED: ["Desequilibrado", "warning"], LOW: ["Bajo", "serious"], POOR: ["Deficiente", "critical"] };
const TSTATUS = {
  PRODUCTIVE: ["Productivo", "good", "Tu forma física mejora con la carga actual."],
  MAINTAINING: ["Mantenimiento", "warning", "La carga actual mantiene tu forma física."],
  PEAKING: ["Pico de forma", "good", "Estás en condiciones ideales para competir."],
  RECOVERY: ["Recuperación", "warning", "Carga baja: el cuerpo se está recuperando."],
  UNPRODUCTIVE: ["No productivo", "serious", "La carga es buena pero la forma baja: revisa descanso y estrés."],
  OVERREACHING: ["Sobrecarga", "critical", "Carga muy alta: prioriza la recuperación."],
  STRAINED: ["Sobreexigido", "critical", "La recuperación no acompaña a la carga."],
  DETRAINING: ["Pérdida de forma", "serious", "Carga demasiado baja durante varios días."],
  NO_STATUS: ["Sin estado", "", "Garmin necesita más actividades con VO2 máx."],
};
const ACWR_ST = { OPTIMAL: ["Óptima", "good"], HIGH: ["Alta", "serious"], VERY_HIGH: ["Muy alta", "critical"], LOW: ["Baja", "warning"] };
const BALANCE = {
  BALANCED: "equilibrado", AEROBIC_LOW_SHORTAGE: "falta aeróbico bajo", AEROBIC_HIGH_SHORTAGE: "falta aeróbico alto",
  ANAEROBIC_SHORTAGE: "falta anaeróbico", AEROBIC_LOW_FOCUS: "enfocado en aeróbico bajo", AEROBIC_HIGH_FOCUS: "enfocado en aeróbico alto",
  ANAEROBIC_FOCUS: "enfocado en anaeróbico", NO_DATA: "sin datos",
};
const TE_LABEL = {
  RECOVERY: "Recuperación", BASE: "Base", TEMPO: "Tempo", THRESHOLD: "Umbral", LACTATE_THRESHOLD: "Umbral",
  VO2MAX: "VO2 máx.", ANAEROBIC_CAPACITY: "Capacidad anaeróbica", SPRINT: "Sprint", NO_BENEFIT: "Sin beneficio",
};
const ACT = {
  running: ["Carrera", "🏃"], treadmill_running: ["Cinta", "🏃"], trail_running: ["Trail", "⛰️"], track_running: ["Pista", "🏃"],
  cycling: ["Ciclismo", "🚴"], road_biking: ["Ciclismo ruta", "🚴"], mountain_biking: ["MTB", "🚵"], indoor_cycling: ["Bici indoor", "🚴"], virtual_ride: ["Bici virtual", "🚴"],
  strength_training: ["Fuerza", "🏋️"], lap_swimming: ["Natación", "🏊"], open_water_swimming: ["Aguas abiertas", "🏊"],
  walking: ["Caminata", "🚶"], hiking: ["Senderismo", "🥾"], yoga: ["Yoga", "🧘"], hiit: ["HIIT", "⚡"], cardio: ["Cardio", "⚡"],
  multi_sport: ["Multideporte", "🏅"], triathlon: ["Triatlón", "🏅"],
};
const actInfo = (t) => ACT[t] || [t ? t.replace(/_/g, " ") : "Otra", "⚡"];
const actGroup = (t) => {
  if (!t) return "other";
  if (t.includes("running") || t === "running") return "running";
  if (t.includes("cycling") || t.includes("biking") || t.includes("ride")) return "cycling";
  if (t.includes("swim")) return "swimming";
  if (t.includes("strength") || t === "hiit" || t === "cardio") return "strength";
  return "other";
};
const GROUPS = [
  ["running", "Carrera", "--series-1"],
  ["cycling", "Ciclismo", "--series-2"],
  ["strength", "Fuerza", "--series-3"],
  ["swimming", "Natación", "--series-4"],
  ["other", "Otras", "--series-5"],
];

const tstatus = (phrase) => {
  if (!phrase) return null;
  const key = phrase.replace(/_\d+$/, "");
  return TSTATUS[key] || [key.replace(/_/g, " ").toLowerCase(), "", ""];
};

/* ============================================================ formato */
const nf = (v, d = 0) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("es", { maximumFractionDigits: d, minimumFractionDigits: d }));
const pad = (n) => String(n).padStart(2, "0");
const dur = (s) => {
  if (s == null) return "—";
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`;
};
const hm = (s) => (s == null ? "—" : `${Math.floor(s / 3600)}:${pad(Math.round((s % 3600) / 60))}`);
const clock = (ms) => (ms ? new Date(ms).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—");
const raceTime = (s) => {
  if (!s) return "—";
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};
const pace = (ms) => {
  if (!ms) return "—";
  const spk = 1000 / ms;
  return `${Math.floor(spk / 60)}:${pad(Math.round(spk % 60))} /km`;
};
const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const shortDate = (s) => parseDate(s).toLocaleDateString("es", { day: "numeric", month: "short" });
const longDate = (s) => parseDate(s).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
const avg = (arr) => { const v = arr.filter((x) => x != null && !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const sum = (arr) => arr.reduce((a, b) => a + (b || 0), 0);
const pctDiff = (v, base) => (v != null && base ? ((v - base) / base) * 100 : null);
const signed = (v, d = 0) => (v == null ? "—" : (v > 0 ? "+" : "") + nf(v, d));

const recoveryStatus = (v) => (v == null ? ["Sin datos", ""] : v >= 67 ? ["Verde", "good"] : v >= 34 ? ["Amarillo", "warning"] : ["Rojo", "critical"]);
const strainLabel = (v) => (v == null ? "—" : v < 10 ? "Ligero" : v < 14 ? "Moderado" : v < 18 ? "Alto" : "Máximo");
const scoreStatus = (v) => (v == null ? "" : v >= 80 ? "good" : v >= 60 ? "warning" : v >= 40 ? "serious" : "critical");
const stColor = (st) => (st ? css(`--${st}`) : css("--text-muted"));
const badge = (label, st) => `<span class="badge ${st || ""}">${label}</span>`;

/* ============================================================ datos */
const day = () => state.data?.days[state.idx];
const rangeDays = () => state.data.days.slice(Math.max(0, state.idx - state.range + 1), state.idx + 1);
const lastWith = (fn) => { for (let i = state.idx; i >= 0; i--) { const v = fn(state.data.days[i]); if (v != null) return v; } return null; };

/* ============================================================ gráficos */
const charts = {};
function chart(id, config) {
  if (charts[id]) charts[id].destroy();
  const el = document.getElementById(id);
  if (!el) return;
  charts[id] = new Chart(el, config);
}
function destroyCharts() { Object.keys(charts).forEach((k) => { charts[k].destroy(); delete charts[k]; }); }

const crosshair = {
  id: "crosshair",
  afterDatasetsDraw(c) {
    const act = c.tooltip?.getActiveElements?.() || [];
    if (!act.length || c.config.type !== "line") return;
    const x = act[0].element.x, { top, bottom } = c.chartArea, ctx = c.ctx;
    ctx.save(); ctx.strokeStyle = css("--text-muted"); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); ctx.restore();
  },
};

function applyChartDefaults() {
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = css("--text-muted");
  Chart.defaults.borderColor = css("--grid");
}

function opts({ yMin, yMax, stacked = false, legend = false, yFmt, tip, indexAxis = "x", xType, yStep } = {}) {
  const surface = css("--surface-2");
  return {
    responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, indexAxis,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: legend, position: "bottom", labels: { boxWidth: 10, boxHeight: 10, color: css("--text-secondary"), padding: 14, filter: (i) => !i.text.startsWith("_") } },
      tooltip: {
        backgroundColor: surface, borderColor: css("--border"), borderWidth: 1, titleColor: css("--text-primary"),
        bodyColor: css("--text-secondary"), padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
        filter: (i) => !i.dataset.label?.startsWith("_") && i.raw != null,
        callbacks: tip ? { label: tip } : {},
      },
    },
    scales: {
      x: { ...(xType ? { type: xType } : {}), stacked, grid: { display: indexAxis === "y", color: css("--grid") }, border: { color: css("--grid") }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
      y: { stacked, min: yMin, max: yMax, grid: { color: css("--grid"), display: indexAxis === "x" }, border: { display: false }, ticks: { maxTicksLimit: yStep ? 12 : 5, stepSize: yStep, callback: yFmt } },
    },
  };
}

const line = (label, data, color, extra = {}) => ({
  label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
  pointHoverBorderWidth: 2, pointHoverBorderColor: css("--surface-1"), tension: 0.3, spanGaps: true, ...extra,
});
const bars = (label, data, color, extra = {}) => ({
  label, data, backgroundColor: color, borderRadius: 4, borderSkipped: "start", maxBarThickness: 22,
  categoryPercentage: 0.85, barPercentage: 0.9, ...extra,
});
const stackBars = (label, data, color) => bars(label, data, color, {
  borderRadius: 2, borderSkipped: false, borderColor: css("--surface-1"), borderWidth: { top: 2, bottom: 0, left: 0, right: 0 },
});
const band = (lo, hi, color) => [
  line("_hi", hi, "transparent", { fill: "+1", backgroundColor: color, pointHoverRadius: 0, tension: 0.3 }),
  line("_lo", lo, "transparent", { pointHoverRadius: 0, tension: 0.3 }),
];
const alpha = (hex, a) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/* ============================================================ componentes */
function ring(value, max, color, big, unit) {
  const r = 64, c = 2 * Math.PI * r, p = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  return `<div class="ring"><svg viewBox="0 0 150 150" aria-hidden="true">
    <circle cx="75" cy="75" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="10"/>
    <circle cx="75" cy="75" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}"/>
  </svg><div class="center"><div class="big">${big}</div><div class="unit">${unit}</div></div></div>`;
}

const tile = (label, value, unit = "", note = "", extra = "") => `
  <div class="card tile"><div class="label">${label}</div>
  <div class="value">${value}${unit ? `<small>${unit}</small>` : ""}</div>
  ${note ? `<div class="note">${note}</div>` : ""}${extra}</div>`;

const progress = (v, max, color = "var(--accent)") =>
  `<div class="progress"><div style="width:${Math.min(100, ((v || 0) / (max || 1)) * 100)}%;background:${color}"></div></div>`;

const section = (title, tag = "") => `<div class="section-title"><h2>${title}</h2>${tag ? `<span class="tag">${tag}</span>` : ""}</div>`;

const card = (title, body, sub = "", cls = "") => `
  <div class="card ${cls}"><div class="card-head"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}</div>${body}</div>`;

const canvas = (id, size = "") => `<div class="chart-box ${size}"><canvas id="${id}"></canvas></div>`;

function factorRow(name, val, fb = "") {
  const st = scoreStatus(val);
  return `<div class="factor"><span class="name">${name}</span><span class="val">${val == null ? "—" : val + " %"}</span>
    <div class="bar"><div style="width:${val || 0}%;background:${stColor(st)}"></div></div>${fb ? `<span class="fb">${fb}</span>` : ""}</div>`;
}

const legend = (items) => `<div class="legend">${items.map(([l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>`;

/* ============================================================ vista: HOY */
function viewHoy() {
  const d = day(), w = d.whoop, s = d.sleep || {}, r = d.readiness || {}, bb = d.body_battery || {}, hrv = d.hrv || {};
  const [recLbl, recSt] = recoveryStatus(w.recovery);
  const days7 = state.data.days.slice(Math.max(0, state.idx - 6), state.idx + 1);
  const weekIntensity = sum(days7.map((x) => (x.daily.intensity_moderate || 0) + 2 * (x.daily.intensity_vigorous || 0)));
  const hrvS = HRV_ST[hrv.status] || ["—", ""];

  return `
  <div class="view-head"><div><h1>${cap(longDate(d.date))}</h1><p>Lo esencial de tu día, explicado.</p></div></div>

  ${stories("hoy")}
  ${coachTeaser()}
  ${section("Tus índices del día", "calculados por Pulso con tus datos Garmin")}
  <div class="rings">
    <div class="card ring-card">
      ${ring(w.recovery, 100, stColor(recSt), w.recovery == null ? "—" : w.recovery + "%", "Recuperación")}
      <div class="title">Recuperación ${info("recuperacion")} ${badge(recLbl, recSt)}</div>
      <div class="caption">${recoveryCaption(w)}</div>
    </div>
    <div class="card ring-card">
      ${ring(w.strain, 21, css("--series-1"), nf(w.strain, 1), "Esfuerzo")}
      <div class="title">Esfuerzo ${info("esfuerzo")} · ${strainLabel(w.strain)}</div>
      <div class="caption">Objetivo según tu recuperación: <b>${w.strain_target[0]}–${w.strain_target[1]}</b> de 21. ${d.activities.length ? `${d.activities.length} actividad(es) hoy.` : "Sin entrenamientos registrados."}</div>
    </div>
    <div class="card ring-card">
      ${ring(w.sleep_performance, 100, css("--series-7"), w.sleep_performance == null ? "—" : w.sleep_performance + "%", "Sueño")}
      <div class="title">Rendimiento del sueño ${info("sueno_rend")}</div>
      <div class="caption">Dormiste ${hm(s.total_s)} h de ${hm((w.sleep_need_min || 0) * 60)} h necesarias. ${w.sleep_debt_min > 15 ? `Deuda de sueño: ${w.sleep_debt_min} min.` : ""}</div>
    </div>
  </div>

  ${section("Estilo Garmin · Mi día")}
  <div class="grid g4">
    ${tile("Disposición para entrenar" + info("readiness"), nf(r.score), "", r.level ? badge(READY[r.level] || r.level, READY_ST[r.level]) : "Sin datos",
      r.recovery_time_h != null ? `<div class="note">Recuperación restante: ${nf(r.recovery_time_h)} h</div>` : "")}
    ${tile("Body Battery" + info("body_battery"), nf(bb.current), "", `Al despertar ${nf(bb.at_wake)} · Máx. ${nf(bb.high)} · Mín. ${nf(bb.low)}`, `<div class="chart-box short" style="height:60px"><canvas id="c-bb-mini"></canvas></div>`)}
    ${tile("Puntuación de sueño" + info("sleep_score"), nf(s.score), "", s.qualifier ? badge(QUAL[s.qualifier] || s.qualifier, QUAL_ST[s.qualifier]) : "Sin datos")}
    ${tile("Estado de VFC" + info("hrv"), nf(hrv.last_night), "ms", `${badge(hrvS[0], hrvS[1])} &nbsp;Media 7 d: ${nf(hrv.weekly_avg)} ms`)}
  </div>
  <div class="grid g6" style="margin-top:14px">
    ${tile("FC en reposo" + info("rhr"), nf(d.heart.rhr), "ppm", `Media 7 d: ${nf(d.heart.rhr_7d)}`)}
    ${tile("Estrés medio" + info("stress"), nf(d.stress.avg), "", stressWord(d.stress.avg))}
    ${tile("Pasos" + info("steps"), nf(d.daily.steps), "", `Meta ${nf(d.daily.step_goal)}`, progress(d.daily.steps, d.daily.step_goal))}
    ${tile("Min. intensidad (7 d)" + info("intensity"), nf(weekIntensity), "", `Meta semanal ${nf(d.daily.intensity_goal_week || 150)}`, progress(weekIntensity, d.daily.intensity_goal_week || 150))}
    ${tile("Calorías", nf(d.daily.kcal_total), "kcal", `Activas ${nf(d.daily.kcal_active)}`)}
    ${tile("SpO₂ nocturno" + info("spo2"), nf(d.spo2.avg), "%", `Respiración ${nf(d.respiration.sleep, 1)} rpm`)}
  </div>

  ${section("Recomendaciones")}
  <div>${insights(d).map(([st, txt]) => `<div class="card insight"><span class="dot" style="background:${stColor(st)}"></span><div>${txt}</div></div>`).join("")}</div>

  ${section("Últimos 7 días")}
  <div class="grid g2">
    ${card("Recuperación" + info("recuperacion"), canvas("c-week-rec", "short"), "%")}
    ${card("Esfuerzo" + info("esfuerzo"), canvas("c-week-strain", "short"), "0–21")}
  </div>`;
}

function afterHoy() {
  const d = day(), bbS = d.body_battery?.series || [];
  if (bbS.length) {
    chart("c-bb-mini", {
      type: "line",
      data: { labels: bbS.map((p) => clock(p[0])), datasets: [line("Body Battery", bbS.map((p) => p[1]), css("--series-1"), { fill: true, backgroundColor: alpha(css("--series-1"), 0.15), tension: 0.4 })] },
      options: { ...opts({ yMin: 0, yMax: 100 }), scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } },
    });
  }
  const days7 = state.data.days.slice(Math.max(0, state.idx - 6), state.idx + 1);
  const labels = days7.map((x) => parseDate(x.date).toLocaleDateString("es", { weekday: "short" }));
  chart("c-week-rec", {
    type: "bar",
    data: { labels, datasets: [bars("Recuperación", days7.map((x) => x.whoop.recovery), days7.map((x) => stColor(recoveryStatus(x.whoop.recovery)[1])))] },
    options: opts({ yMin: 0, yMax: 100, tip: (c) => ` ${c.raw}% · ${recoveryStatus(c.raw)[0]}` }),
  });
  chart("c-week-strain", {
    type: "bar",
    data: { labels, datasets: [bars("Esfuerzo", days7.map((x) => x.whoop.strain), css("--series-1"))] },
    options: opts({ yMin: 0, yMax: 21, tip: (c) => ` ${nf(c.raw, 1)} · ${strainLabel(c.raw)}` }),
  });
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const stressWord = (v) => (v == null ? "—" : v <= 25 ? "Reposo" : v <= 50 ? "Bajo" : v <= 75 ? "Medio" : "Alto");

function recoveryCaption(w) {
  const c = w.contributors || {};
  if (w.recovery == null) return "Hacen falta al menos 4 noches con VFC para calcular tu línea base.";
  const bits = [];
  if (c.hrv) bits.push(`VFC ${c.hrv.value} ms (base ${c.hrv.baseline})`);
  if (c.rhr?.baseline) bits.push(`FC reposo ${c.rhr.value} (base ${c.rhr.baseline})`);
  return bits.join(" · ");
}

function insights(d) {
  const out = [], w = d.whoop, c = w.contributors || {};
  if (w.recovery != null) {
    const [lbl, st] = recoveryStatus(w.recovery);
    const msg = st === "good" ? "Tu cuerpo está listo para una sesión exigente." : st === "warning" ? "Entrena con moderación; evita el máximo." : "Prioriza descanso, movilidad o trabajo muy suave.";
    out.push([st, `<b>Recuperación ${lbl.toLowerCase()} (${w.recovery}%).</b> ${msg} Esfuerzo objetivo: ${w.strain_target[0]}–${w.strain_target[1]}.`]);
  }
  if (c.hrv?.baseline) {
    const diff = pctDiff(c.hrv.value, c.hrv.baseline);
    const st = diff < -15 ? "critical" : diff < -7 ? "warning" : "good";
    out.push([st, `<b>VFC ${signed(diff)}% respecto a tu línea base de 30 días.</b> ${diff < -7 ? "Señal de fatiga, estrés o mal descanso." : "Sistema nervioso en buen equilibrio."}`]);
  }
  if (c.rhr?.baseline && c.rhr.value - c.rhr.baseline >= 3) {
    out.push(["serious", `<b>FC en reposo elevada (+${nf(c.rhr.value - c.rhr.baseline)} ppm).</b> Puede indicar fatiga acumulada, alcohol, calor o el inicio de una enfermedad.`]);
  }
  const t = d.training || {};
  const acwr = t.acwr ?? (t.acute_est && t.chronic_est ? t.acute_est / t.chronic_est : null);
  if (acwr != null) {
    if (acwr > 1.5) out.push(["critical", `<b>Carga aguda muy alta (ratio ${nf(acwr, 2)}).</b> Riesgo de lesión elevado; reduce el volumen unos días.`]);
    else if (acwr > 1.3) out.push(["warning", `<b>Carga en aumento (ratio ${nf(acwr, 2)}).</b> Estás cerca del límite; vigila la recuperación.`]);
    else if (acwr < 0.8) out.push(["warning", `<b>Carga baja (ratio ${nf(acwr, 2)}).</b> Si no estás en descarga, podrías estar perdiendo forma.`]);
  }
  const wakes = state.data.days.slice(Math.max(0, state.idx - 6), state.idx + 1).map((x) => x.sleep?.end_ms).filter(Boolean);
  if (wakes.length >= 3) {
    const mins = avg(wakes.map((ms) => { const t = new Date(ms); return t.getHours() * 60 + t.getMinutes(); }));
    const need = 460 + ((w.strain || 0) / 21) * 50;
    let bed = mins - need - 15; if (bed < 0) bed += 1440;
    out.push(["good", `<b>Esta noche necesitarás ~${hm(need * 60)} h de sueño.</b> Para despertar a tu hora habitual (${pad(Math.floor(mins / 60))}:${pad(Math.round(mins % 60))}), acuéstate cerca de las ${pad(Math.floor(bed / 60))}:${pad(Math.round(bed % 60))}.`]);
  }
  return out.length ? out : [["", "Sincroniza más días para obtener recomendaciones."]];
}

/* ============================================================ vista: SUEÑO */
function viewSueno() {
  const d = day(), s = d.sleep || {}, w = d.whoop, ss = s.subscores || {};
  if (!s.total_s) return `<div class="view-head"><h1>Sueño</h1></div><div class="card empty">No hay datos de sueño para este día.</div>`;
  const stages = [["Profundo", s.deep_s, "--stage-deep", ss.deep], ["Ligero", s.light_s, "--stage-light", ss.light], ["REM", s.rem_s, "--stage-rem", ss.rem], ["Despierto", s.awake_s, "--stage-awake"]];
  const tot = sum(stages.map((x) => x[1]));
  const sub = [["Duración", ss.duration], ["Estrés durante el sueño", ss.stress], ["Despertares", ss.awake_count], ["Inquietud", ss.restlessness], ["Sueño profundo", ss.deep], ["Sueño ligero", ss.light], ["Sueño REM", ss.rem]];
  return `
  <div class="view-head"><div><h1>Sueño</h1><p>Noche del ${longDate(d.date)} · ${clock(s.start_ms)} – ${clock(s.end_ms)}</p></div></div>
  ${stories("sueno")}
  <div class="grid g3">
    <div class="card ring-card">
      ${ring(s.score, 100, stColor(QUAL_ST[s.qualifier]), nf(s.score), "Puntuación")}
      <div class="title">Puntuación de sueño ${info("sleep_score")} ${badge(QUAL[s.qualifier] || "—", QUAL_ST[s.qualifier])}</div>
      <div class="caption">${dur(s.total_s)} dormido${s.nap_s ? ` · siesta ${dur(s.nap_s)}` : ""}</div>
    </div>
    <div class="card ring-card">
      ${ring(w.sleep_performance, 100, css("--series-7"), (w.sleep_performance ?? "—") + "%", "Rendimiento")}
      <div class="title">Rendimiento del sueño ${info("sueno_rend")}</div>
      <div class="caption">Necesidad ${hm(w.sleep_need_min * 60)} h · Deuda ${w.sleep_debt_min} min · Consistencia ${w.sleep_consistency ?? "—"}%</div>
    </div>
    ${card("Métricas nocturnas", `<dl class="kv">
      <dt>FC en reposo</dt><dd>${nf(s.rhr)} ppm</dd>
      <dt>VFC media nocturna</dt><dd>${nf(d.hrv?.last_night ?? s.hrv)} ms</dd>
      <dt>Respiración</dt><dd>${nf(s.avg_resp, 1)} rpm</dd>
      <dt>SpO₂ media / mínima</dt><dd>${nf(s.avg_spo2)} % / ${nf(s.lowest_spo2)} %</dd>
      <dt>Estrés durante el sueño</dt><dd>${nf(s.stress)}</dd>
      <dt>Body Battery recuperado</dt><dd>${signed(s.bb_change)}</dd>
      <dt>Despertares</dt><dd>${nf(s.awake_count)}</dd>
    </dl>`)}
  </div>

  ${section("Fases del sueño")}
  <div class="grid g3">
    <div class="card span2"><div class="card-head"><h2>Hipnograma ${info("sleep_stages")}</h2><span class="sub">Pasa el cursor para ver cada fase</span></div>${hypnogram(s)}
      ${legend(stages.map((x) => [x[0], css(x[2])]))}</div>
    ${card("Distribución", `<div class="stack" style="margin-bottom:16px">${stages.map((x) => `<div data-tip="${x[0]}: ${dur(x[1])}" style="width:${((x[1] || 0) / tot) * 100}%;background:var(${x[2]})"></div>`).join("")}</div>
      <table><tbody>${stages.map((x) => `<tr><td><span class="badge" style="--dot:var(${x[2]})">${x[0]}</span></td><td class="num">${dur(x[1])}</td><td class="num muted">${nf(((x[1] || 0) / tot) * 100)}%</td><td>${x[3] ? QUAL[x[3]] || "" : ""}</td></tr>`).join("")}</tbody></table>`)}
  </div>

  ${section("Factores de la puntuación", "Garmin")}
  <div class="grid g4">${sub.filter((x) => x[1]).map(([n, q]) => `<div class="card tile"><div class="label">${n}</div><div>${badge(QUAL[q] || q, QUAL_ST[q])}</div></div>`).join("") || `<div class="card muted">Sin factores disponibles.</div>`}</div>

  ${section("Tendencia", `${state.range} días`)}
  <div class="grid g2">
    ${card("Horas por fase", canvas("c-sleep-stages", "tall") + legend(stages.map((x) => [x[0], css(x[2])])))}
    ${card("Puntuación de sueño vs rendimiento", canvas("c-sleep-score", "tall") + legend([["Puntuación Garmin", css("--series-1")], ["Rendimiento del sueño", css("--series-2")]]))}
    ${card("Horario de sueño", canvas("c-sleep-times") + legend([["Acostarse", css("--series-7")], ["Despertar", css("--series-4")]]))}
    ${card("Respiración y SpO₂ nocturnos", canvas("c-sleep-resp"), "respiraciones por minuto")}
  </div>`;
}

function hypnogram(s) {
  const lv = s.levels || [];
  if (!lv.length) return `<div class="empty">Sin hipnograma disponible.</div>`;
  const rows = { awake: 0, rem: 1, light: 2, deep: 3 }, names = ["Despierto", "REM", "Ligero", "Profundo"];
  const colors = { awake: "--stage-awake", rem: "--stage-rem", light: "--stage-light", deep: "--stage-deep" };
  const t0 = lv[0].start, t1 = lv[lv.length - 1].end, W = 1000, L = 70, H = 170, rowH = 34, span = t1 - t0;
  const x = (t) => L + ((t - t0) / span) * (W - L - 10);
  let ticks = "";
  const first = new Date(t0); first.setMinutes(0, 0, 0);
  for (let t = first.getTime() + 3600e3; t < t1; t += 3600e3) ticks += `<text x="${x(t)}" y="${H - 4}" text-anchor="middle">${clock(t)}</text>`;
  const rects = lv.map((l) => `<rect x="${x(l.start)}" y="${rows[l.stage] * rowH + 4}" width="${Math.max(1, x(l.end) - x(l.start) - 1)}" height="${rowH - 6}" rx="3"
      fill="var(${colors[l.stage]})" data-tip="${names[rows[l.stage]]} · ${clock(l.start)}–${clock(l.end)} (${dur((l.end - l.start) / 1000)})"/>`).join("");
  const labels = names.map((n, i) => `<text x="0" y="${i * rowH + rowH / 2 + 5}">${n}</text>`).join("");
  const grid = names.map((_, i) => `<line x1="${L}" x2="${W}" y1="${i * rowH + rowH + 1}" y2="${i * rowH + rowH + 1}" stroke="var(--grid)"/>`).join("");
  return `<svg class="hypno" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${labels}${rects}${ticks}</svg>`;
}

function afterSueno() {
  const ds = rangeDays(), labels = ds.map((x) => shortDate(x.date));
  const h = (k) => ds.map((x) => (x.sleep?.[k] != null ? +(x.sleep[k] / 3600).toFixed(2) : null));
  chart("c-sleep-stages", {
    type: "bar",
    data: { labels, datasets: [
      stackBars("Profundo", h("deep_s"), css("--stage-deep")), stackBars("Ligero", h("light_s"), css("--stage-light")),
      stackBars("REM", h("rem_s"), css("--stage-rem")), stackBars("Despierto", h("awake_s"), css("--stage-awake")),
    ] },
    options: opts({ stacked: true, yFmt: (v) => v + " h", tip: (c) => ` ${c.dataset.label}: ${hm(c.raw * 3600)} h` }),
  });
  chart("c-sleep-score", {
    type: "line",
    data: { labels, datasets: [line("Puntuación Garmin", ds.map((x) => x.sleep?.score ?? null), css("--series-1")), line("Rendimiento del sueño", ds.map((x) => x.whoop.sleep_performance), css("--series-2"))] },
    options: opts({ yMin: 0, yMax: 100 }),
  });
  // horas como minutos desde las 18:00 para que la medianoche no rompa la escala
  const mod = (ms) => { if (!ms) return null; const t = new Date(ms); let m = t.getHours() * 60 + t.getMinutes() - 1080; if (m < 0) m += 1440; return m; };
  const lbl = (m) => { const t = (m + 1080) % 1440; return `${pad(Math.floor(t / 60))}:${pad(Math.round(t % 60))}`; };
  chart("c-sleep-times", {
    type: "line",
    data: { labels, datasets: [line("Acostarse", ds.map((x) => mod(x.sleep?.start_ms)), css("--series-7"), { pointRadius: 3 }), line("Despertar", ds.map((x) => mod(x.sleep?.end_ms)), css("--series-4"), { pointRadius: 3 })] },
    options: opts({ yStep: 120, yFmt: lbl, tip: (c) => ` ${c.dataset.label}: ${lbl(c.raw)}` }),
  });
  chart("c-sleep-resp", {
    type: "line",
    data: { labels, datasets: [line("Respiración (rpm)", ds.map((x) => x.sleep?.avg_resp ?? null), css("--series-3"), { tension: 0.15, pointRadius: 2 })] },
    options: opts({ tip: (c) => ` ${nf(c.raw, 1)} rpm · SpO₂ ${nf(ds[c.dataIndex].sleep?.avg_spo2)} %` }),
  });
}

/* ============================================================ vista: RECUPERACIÓN */
function viewRecuperacion() {
  const d = day(), w = d.whoop, c = w.contributors || {}, r = d.readiness || {}, f = r.factors || {}, ff = r.factor_feedback || {}, hrv = d.hrv || {}, st = d.stress || {};
  const [recLbl, recSt] = recoveryStatus(w.recovery);
  const hrvS = HRV_ST[hrv.status] || ["—", ""];
  const zRow = (name, val, base, unit, z, better) => {
    const diff = val != null && base != null ? val - base : null;
    const good = diff == null ? null : better === "up" ? diff >= 0 : diff <= 0;
    return `<tr><td>${name}</td><td class="num">${nf(val, unit === "rpm" ? 1 : 0)} ${unit}</td><td class="num muted">${nf(base, unit === "rpm" ? 1 : 0)}</td>
      <td class="num">${diff == null ? "—" : `${badge(signed(diff, unit === "rpm" ? 1 : 0), good ? "good" : Math.abs(z || 0) > 1 ? "critical" : "warning")}`}</td></tr>`;
  };
  const stressTot = sum([st.rest_s, st.low_s, st.medium_s, st.high_s]) || 1;
  const stressParts = [["Reposo", st.rest_s, "--series-1"], ["Bajo", st.low_s, "--series-3"], ["Medio", st.medium_s, "--series-4"], ["Alto", st.high_s, "--series-5"]];
  return `
  <div class="view-head"><div><h1>Recuperación</h1><p>${cap(longDate(d.date))}</p></div></div>
  ${stories("recuperacion")}
  <div class="grid g3">
    <div class="card ring-card">
      ${ring(w.recovery, 100, stColor(recSt), w.recovery == null ? "—" : w.recovery + "%", "Recuperación")}
      <div class="title">Recuperación ${info("recuperacion")} ${badge(recLbl, recSt)}</div>
      <div class="caption">Combina VFC (50%), FC en reposo (20%) y sueño (30%) frente a tu línea base de 30 días.</div>
    </div>
    <div class="card span2"><div class="card-head"><h2>Qué influyó en tu recuperación</h2><span class="sub">vs. línea base 30 días</span></div>
      <table><thead><tr><th>Métrica</th><th>Anoche</th><th>Base</th><th>Diferencia</th></tr></thead><tbody>
      ${zRow("VFC (rMSSD)", c.hrv?.value, c.hrv?.baseline, "ms", c.hrv?.z, "up")}
      ${zRow("FC en reposo", c.rhr?.value, c.rhr?.baseline, "ppm", c.rhr?.z, "down")}
      ${zRow("Frecuencia respiratoria", c.resp?.value, c.resp?.baseline, "rpm", c.resp?.z, "down")}
      <tr><td>Rendimiento del sueño</td><td class="num">${nf(c.sleep?.value)} %</td><td class="num muted">100</td><td></td></tr>
      </tbody></table>
    </div>
  </div>

  ${section("Disposición para entrenar" + info("readiness"), "Garmin Training Readiness")}
  <div class="grid g3">
    <div class="card ring-card">
      ${ring(r.score, 100, stColor(READY_ST[r.level]), nf(r.score), "Disposición")}
      <div class="title">${badge(READY[r.level] || "—", READY_ST[r.level])}</div>
      <div class="caption">Tiempo de recuperación restante: <b>${nf(r.recovery_time_h)} h</b> · Carga aguda ${nf(r.acute_load)}</div>
    </div>
    <div class="card span2"><div class="card-head"><h2>Factores</h2><span class="sub">% de contribución óptima</span></div>
      <div class="grid g2" style="gap:14px 28px">
      ${factorRow("Puntuación de sueño", f.sleep, ff.sleep)}
      ${factorRow("Tiempo de recuperación", f.recovery_time, ff.recovery_time)}
      ${factorRow("Carga aguda (ACWR)", f.acwr, ff.acwr)}
      ${factorRow("Estado de VFC", f.hrv, ff.hrv)}
      ${factorRow("Historial de estrés", f.stress_history, ff.stress_history)}
      ${factorRow("Historial de sueño", f.sleep_history, ff.sleep_history)}
      </div></div>
  </div>

  ${section("Variabilidad de la frecuencia cardiaca" + info("hrv"), "VFC / HRV")}
  <div class="grid g4">
    ${tile("Media nocturna", nf(hrv.last_night), "ms", "Anoche")}
    ${tile("Media 7 días", nf(hrv.weekly_avg), "ms", badge(hrvS[0], hrvS[1]))}
    ${tile("Rango de referencia", `${nf(hrv.baseline_low)}–${nf(hrv.baseline_high)}`, "ms", "Tu línea base equilibrada")}
    ${tile("Máximo 5 min", nf(hrv.high_5min), "ms", "Pico nocturno")}
  </div>
  <div class="grid g2" style="margin-top:14px">
    ${card("VFC nocturna y media de 7 días", canvas("c-hrv", "tall") + legend([["VFC nocturna", css("--series-1")], ["Media 7 días", css("--series-2")], ["Rango equilibrado", alpha(css("--series-3"), 0.35)]]))}
    ${card("Recuperación diaria", canvas("c-rec", "tall") + legend([["Verde ≥ 67", stColor("good")], ["Amarillo 34–66", stColor("warning")], ["Rojo ≤ 33", stColor("critical")]]), "%")}
    ${card("FC en reposo", canvas("c-rhr"), "ppm")}
    ${card("Disposición Garmin", canvas("c-ready"), "0–100")}
  </div>

  ${section("Body Battery y estrés")}
  <div class="grid g3">
    <div class="card span2"><div class="card-head"><h2>Body Battery hoy ${info("body_battery")}</h2><span class="sub">+${nf(d.body_battery?.charged)} cargado · −${nf(d.body_battery?.drained)} gastado</span></div>${canvas("c-bb")}</div>
    ${card("Estrés del día", `<div class="tile"><div class="value">${nf(st.avg)}<small>medio · máx. ${nf(st.max)}</small></div></div>
      <div class="stack" style="margin:14px 0">${stressParts.map((p) => `<div data-tip="${p[0]}: ${dur(p[1])}" style="width:${((p[1] || 0) / stressTot) * 100}%;background:var(${p[2]})"></div>`).join("")}</div>
      <dl class="kv">${stressParts.map((p) => `<dt><span class="badge" style="--dot:var(${p[2]})">${p[0]}</span></dt><dd>${dur(p[1])}</dd>`).join("")}</dl>`)}
    <div class="card span3"><div class="card-head"><h2>Carga y descarga de Body Battery</h2><span class="sub">${state.range} días</span></div>${canvas("c-bb-range")}${legend([["Cargado", css("--series-3")], ["Gastado", css("--series-2")]])}</div>
  </div>`;
}

function afterRecuperacion() {
  const ds = rangeDays(), labels = ds.map((x) => shortDate(x.date));
  chart("c-hrv", {
    type: "line",
    data: { labels, datasets: [
      ...band(ds.map((x) => x.hrv?.baseline_low ?? null), ds.map((x) => x.hrv?.baseline_high ?? null), alpha(css("--series-3"), 0.18)),
      line("VFC nocturna", ds.map((x) => x.hrv?.last_night ?? null), css("--series-1"), { pointRadius: 2 }),
      line("Media 7 días", ds.map((x) => x.hrv?.weekly_avg ?? null), css("--series-2")),
    ] },
    options: opts({ tip: (c) => ` ${c.dataset.label}: ${c.raw} ms` }),
  });
  chart("c-rec", {
    type: "bar",
    data: { labels, datasets: [bars("Recuperación", ds.map((x) => x.whoop.recovery), ds.map((x) => stColor(recoveryStatus(x.whoop.recovery)[1])))] },
    options: opts({ yMin: 0, yMax: 100, tip: (c) => ` ${c.raw}% · ${recoveryStatus(c.raw)[0]}` }),
  });
  chart("c-rhr", {
    type: "line",
    data: { labels, datasets: [line("FC en reposo", ds.map((x) => x.heart?.rhr ?? null), css("--series-2"), { pointRadius: 2 })] },
    options: opts({ tip: (c) => ` ${c.raw} ppm` }),
  });
  chart("c-ready", {
    type: "line",
    data: { labels, datasets: [line("Disposición", ds.map((x) => x.readiness?.score ?? null), css("--series-1"), { fill: true, backgroundColor: alpha(css("--series-1"), 0.12) })] },
    options: opts({ yMin: 0, yMax: 100 }),
  });
  const bb = day().body_battery?.series || [];
  chart("c-bb", {
    type: "line",
    data: { labels: bb.map((p) => clock(p[0])), datasets: [line("Body Battery", bb.map((p) => p[1]), css("--series-1"), { fill: true, backgroundColor: alpha(css("--series-1"), 0.15), tension: 0.35 })] },
    options: opts({ yMin: 0, yMax: 100 }),
  });
  chart("c-bb-range", {
    type: "bar",
    data: { labels, datasets: [bars("Cargado", ds.map((x) => x.body_battery?.charged ?? null), css("--series-3")), bars("Gastado", ds.map((x) => x.body_battery?.drained ?? null), css("--series-2"))] },
    options: opts({ yMin: 0 }),
  });
}

/* ============================================================ vista: RENDIMIENTO */
function viewRendimiento() {
  const d = day(), t = d.training || {}, p = state.data.performance || {};
  const ts = tstatus(t.status_phrase || lastWith((x) => x.training?.status_phrase));
  const vo2 = t.vo2max ?? lastWith((x) => x.training?.vo2max);
  const vo2c = t.vo2max_cycling ?? lastWith((x) => x.training?.vo2max_cycling);
  const acute = t.acute ?? t.acute_est, chronic = t.chronic ?? t.chronic_est;
  const acwr = t.acwr ?? (acute && chronic ? acute / chronic : null);
  const acwrS = ACWR_ST[t.acwr_status] || (acwr == null ? ["—", ""] : acwr > 1.5 ? ACWR_ST.VERY_HIGH : acwr > 1.3 ? ACWR_ST.HIGH : acwr < 0.8 ? ACWR_ST.LOW : ACWR_ST.OPTIMAL);
  const race = p.race || {}, fa = p.fitness_age || {}, lt = p.lactate || {}, es = p.endurance || {}, hs = p.hill || {};
  const raceCard = (name, secs, km) => tile(name, raceTime(secs), "", secs ? `${pace(km * 1000 / secs)}` : "Sin predicción");
  const focus = [
    ["Anaeróbico", t.load_anaerobic, t.target_anaerobic, "--series-7"],
    ["Aeróbico alto", t.load_high_aerobic, t.target_high_aerobic, "--series-2"],
    ["Aeróbico bajo", t.load_low_aerobic, t.target_low_aerobic, "--series-1"],
  ];
  const fmax = Math.max(1, ...focus.flatMap((f) => [f[1] || 0, ...(f[2] || []).map((x) => x || 0)])) * 1.1;
  const ESC = ["", "Recreativo", "Intermedio", "Entrenado", "Bien entrenado", "Experto", "Superior", "Élite"];

  return `
  <div class="view-head"><div><h1>Rendimiento deportivo</h1><p>Estado de entrenamiento, capacidad aeróbica y predicciones.</p></div></div>
  ${stories("esfuerzo")}
  <div class="grid g4">
    ${tile("Estado de entrenamiento" + info("training_status"), ts ? ts[0] : "—", "", ts ? ts[2] : "")}
    ${tile("VO2 máx. carrera" + info("vo2max"), nf(vo2, 1), "ml/kg/min", vo2c ? `Ciclismo: ${nf(vo2c, 1)}` : "")}
    ${tile("Edad física" + info("fitness_age"), nf(fa.fitness_age), "años", fa.chronological ? `Edad real ${fa.chronological}${fa.achievable ? ` · alcanzable ${fa.achievable}` : ""}` : "")}
    ${tile("Ratio de carga aguda" + info("acwr"), nf(acwr, 2), "", badge(acwrS[0], acwrS[1]), `<div class="note">Aguda ${nf(acute)} · Crónica ${nf(chronic)}</div>`)}
  </div>

  ${section("Carga de entrenamiento", "Garmin")}
  <div class="grid g3">
    <div class="card span2"><div class="card-head"><h2>Carga aguda vs crónica ${info("acwr")}</h2><span class="sub">${state.range} días</span></div>
      ${canvas("c-load", "tall")}${legend([["Carga aguda (7 d)", css("--series-1")], ["Carga crónica (28 d)", css("--series-2")], ["Rango óptimo", alpha(css("--series-3"), 0.35)]])}</div>
    ${card("Enfoque de carga (4 semanas)" + info("load_focus"), `${focus.map(([n, v, tg, col]) => `
      <div class="focus-row"><span>${n}</span><div class="focus-track">
        ${tg && tg[0] != null ? `<div class="target" style="left:${(tg[0] / fmax) * 100}%;width:${((tg[1] - tg[0]) / fmax) * 100}%"></div>` : ""}
        <div class="fill" style="width:${((v || 0) / fmax) * 100}%;background:var(${col})"></div></div><span class="num">${nf(v)}</span></div>`).join("")}
      <p class="note-box">El recuadro marca el rango objetivo de Garmin para cada tipo de carga. ${t.balance_phrase ? `Balance: <b>${BALANCE[t.balance_phrase] || t.balance_phrase.replace(/_/g, " ").toLowerCase()}</b>.` : ""}</p>`)}
  </div>

  ${section("Esfuerzo y recuperación")}
  <div class="grid g2">
    ${card("Esfuerzo diario y objetivo", canvas("c-strain", "tall") + legend([["Esfuerzo", css("--series-1")], ["Objetivo según recuperación", alpha(css("--series-3"), 0.35)]]), "0–21")}
    ${card("Recuperación diaria", canvas("c-rec2", "tall") + legend([["Verde", stColor("good")], ["Amarillo", stColor("warning")], ["Rojo", stColor("critical")]]), "%")}
  </div>

  ${section("Capacidad aeróbica")}
  <div class="grid g3">
    ${card("VO2 máx.", canvas("c-vo2"), "ml/kg/min")}
    ${card("Puntuación de resistencia" + info("endurance"), `<div class="tile"><div class="value">${nf(es.score)}</div><div class="note">${ESC[es.classification] || ""}</div></div>${canvas("c-endur", "short")}`)}
    ${card("Umbral y colinas" + info("lactate"), `<dl class="kv">
      <dt>FC umbral de lactato</dt><dd>${nf(lt.hr)} ppm</dd>
      <dt>Ritmo umbral</dt><dd>${pace(lt.speed_ms)}</dd>
      <dt>Potencia umbral (carrera)</dt><dd>${nf(lt.ftp)} W</dd>
      <dt>Puntuación de colinas</dt><dd>${nf(hs.score)}</dd>
      <dt>· Fuerza / Resistencia</dt><dd>${nf(hs.strength)} / ${nf(hs.endurance)}</dd>
      <dt>Aclimatación al calor</dt><dd>${nf(t.heat_acclimation)} %</dd>
      <dt>Aclimatación a la altitud</dt><dd>${t.altitude_acclimation ? nf(t.altitude_acclimation) + " m" : "—"}</dd></dl>`)}
  </div>

  ${section("Predicciones de carrera" + info("race"))}
  <div class="grid g4">
    ${raceCard("5 K", race["5k"], 5)}${raceCard("10 K", race["10k"], 10)}${raceCard("Media maratón", race.half, 21.0975)}${raceCard("Maratón", race.marathon, 42.195)}
  </div>

  ${section("Intensidad por zonas de FC" + info("zones"), `${state.range} días`)}
  <div class="grid g3">
    <div class="card span2"><div class="card-head"><h2>Minutos por zona y semana</h2></div>${canvas("c-zones-week", "tall")}${legend([1, 2, 3, 4, 5].map((z) => [`Zona ${z}`, css(`--z${z}`)]))}</div>
    ${card("Distribución total", zonesTable(rangeDays()))}
  </div>`;
}

function zoneTotals(ds) {
  const z = [0, 0, 0, 0, 0];
  ds.forEach((d) => d.activities.forEach((a) => (a.zones_s || []).forEach((s, i) => (z[i] += s || 0))));
  return z;
}
function zonesTable(ds) {
  const z = zoneTotals(ds), tot = sum(z) || 1;
  const names = ["Calentamiento", "Suave", "Aeróbico", "Umbral", "Máximo"];
  return `<div class="stack" style="margin-bottom:14px">${z.map((s, i) => `<div data-tip="Zona ${i + 1}: ${dur(s)}" style="width:${(s / tot) * 100}%;background:var(--z${i + 1})"></div>`).join("")}</div>
    <table><tbody>${z.map((s, i) => `<tr><td><span class="badge" style="--dot:var(--z${i + 1})">Z${i + 1} · ${names[i]}</span></td><td class="num">${dur(s)}</td><td class="num muted">${nf((s / tot) * 100)}%</td></tr>`).join("")}</tbody></table>
    <p class="note-box" style="margin-top:10px">Regla 80/20: idealmente ~80% del tiempo en Z1–Z2. Tú: <b>${nf(((z[0] + z[1]) / tot) * 100)}%</b>.</p>`;
}

function afterRendimiento() {
  const ds = rangeDays(), labels = ds.map((x) => shortDate(x.date));
  const T = (k) => ds.map((x) => x.training?.[k] ?? x.training?.[k + "_est"] ?? null);
  chart("c-load", {
    type: "line",
    data: { labels, datasets: [
      ...band(ds.map((x) => x.training?.chronic_min ?? null), ds.map((x) => x.training?.chronic_max ?? null), alpha(css("--series-3"), 0.16)),
      line("Carga aguda", T("acute"), css("--series-1")), line("Carga crónica", T("chronic"), css("--series-2")),
    ] },
    options: opts({ yMin: 0 }),
  });
  chart("c-strain", {
    type: "bar",
    data: { labels, datasets: [
      { ...line("_obj_hi", ds.map((x) => x.whoop.strain_target[1]), "transparent", { fill: "+1", backgroundColor: alpha(css("--series-3"), 0.18), tension: 0, stepped: "middle", pointHoverRadius: 0 }), type: "line" },
      { ...line("_obj_lo", ds.map((x) => x.whoop.strain_target[0]), "transparent", { tension: 0, stepped: "middle", pointHoverRadius: 0 }), type: "line" },
      bars("Esfuerzo", ds.map((x) => x.whoop.strain), css("--series-1")),
    ] },
    options: opts({ yMin: 0, yMax: 21, tip: (c) => ` Esfuerzo ${nf(c.raw, 1)} (${strainLabel(c.raw)}) · objetivo ${ds[c.dataIndex].whoop.strain_target.join("–")}` }),
  });
  chart("c-rec2", {
    type: "bar",
    data: { labels, datasets: [bars("Recuperación", ds.map((x) => x.whoop.recovery), ds.map((x) => stColor(recoveryStatus(x.whoop.recovery)[1])))] },
    options: opts({ yMin: 0, yMax: 100, tip: (c) => ` ${c.raw}% · ${recoveryStatus(c.raw)[0]}` }),
  });
  chart("c-vo2", {
    type: "line",
    data: { labels, datasets: [line("VO2 máx.", T("vo2max"), css("--series-1"), { stepped: true, tension: 0 })] },
    options: opts({ tip: (c) => ` ${nf(c.raw, 1)} ml/kg/min` }),
  });
  const eh = state.data.performance?.endurance?.history || [];
  chart("c-endur", {
    type: "line",
    data: { labels: eh.map((e) => shortDate(e[0])), datasets: [line("Resistencia", eh.map((e) => e[1]), css("--series-3"))] },
    options: opts({}),
  });
  // minutos por zona agrupados por semana
  const weeks = {};
  ds.forEach((d) => {
    const dt = parseDate(d.date); const monday = new Date(dt); monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const k = monday.toISOString().slice(0, 10);
    weeks[k] = weeks[k] || [0, 0, 0, 0, 0];
    zoneTotals([d]).forEach((s, i) => (weeks[k][i] += s / 60));
  });
  const wk = Object.keys(weeks).sort();
  chart("c-zones-week", {
    type: "bar",
    data: { labels: wk.map((k) => "Sem. " + shortDate(k)), datasets: [1, 2, 3, 4, 5].map((z) => stackBars(`Zona ${z}`, wk.map((k) => Math.round(weeks[k][z - 1])), css(`--z${z}`))) },
    options: opts({ stacked: true, yFmt: (v) => v + " min", tip: (c) => ` ${c.dataset.label}: ${c.raw} min` }),
  });
}

/* ============================================================ vista: ACTIVIDADES */
function viewActividades() {
  const ds = rangeDays();
  const all = ds.flatMap((d) => d.activities.map((a) => ({ ...a, date: d.date }))).reverse();
  const list = state.actFilter === "all" ? all : all.filter((a) => actGroup(a.type) === state.actFilter);
  const present = GROUPS.filter((g) => all.some((a) => actGroup(a.type) === g[0]));
  const totTime = sum(list.map((a) => a.duration_s)), totDist = sum(list.map((a) => a.distance_m)), totLoad = sum(list.map((a) => a.load));
  const zoneBar = (z) => { if (!z) return ""; const t = sum(z) || 1; return `<div class="stack zones" style="height:8px">${z.map((s, i) => `<div data-tip="Z${i + 1}: ${dur(s)}" style="width:${(s / t) * 100}%;background:var(--z${i + 1})"></div>`).join("")}</div>`; };
  return `
  <div class="view-head"><div><h1>Actividades</h1><p>Últimos ${state.range} días hasta el ${shortDate(day().date)}. Abre «Evaluación» en cada sesión para ver el análisis del entrenador.</p></div></div>
  <div class="grid g4">
    ${tile("Actividades", nf(list.length))}${tile("Tiempo total", hm(totTime), "h")}${tile("Distancia", nf(totDist / 1000, 1), "km")}${tile("Carga total", nf(totLoad), "", "Carga de entrenamiento Garmin")}
  </div>
  ${section("Volumen semanal")}
  <div class="card">${canvas("c-volume")}${legend(present.map((g) => [g[1], css(g[2])]))}</div>
  ${section("Historial")}
  <div class="filters">
    <button data-f="all" class="${state.actFilter === "all" ? "on" : ""}">Todas</button>
    ${present.map((g) => `<button data-f="${g[0]}" class="${state.actFilter === g[0] ? "on" : ""}">${g[1]}</button>`).join("")}
  </div>
  ${list.length ? list.map((a) => {
    const [name, icon] = actInfo(a.type);
    const isRun = actGroup(a.type) === "running";
    return `<div class="card act">
      <div class="icon">${icon}</div>
      <div><div class="name">${a.name || name}</div><div class="meta">${cap(longDate(a.date))} · ${(a.start || "").slice(11, 16)} · ${name}${a.te_label ? ` · ${TE_LABEL[a.te_label] || a.te_label}` : ""}</div></div>
      <div class="m"><b>${hm(a.duration_s)}</b><span>Duración</span></div>
      <div class="m"><b>${a.distance_m ? nf(a.distance_m / 1000, 2) + " km" : "—"}</b><span>Distancia</span></div>
      <div class="m hide-sm"><b>${nf(a.avg_hr)}</b><span>FC media</span></div>
      <div class="m hide-md hide-sm"><b>${a.avg_speed ? (isRun ? pace(a.avg_speed) : nf(a.avg_speed * 3.6, 1) + " km/h") : "—"}</b><span>${isRun ? "Ritmo" : "Velocidad"}</span></div>
      <div class="m hide-md hide-sm"><b>${nf(a.te_aerobic, 1)} / ${nf(a.te_anaerobic, 1)}</b><span>Efecto aer./anaer.</span></div>
      <div class="m"><b>${a.coach ? `<span class="score ${scoreTone(a.coach.score)}">${nf(a.coach.score, 1)}</span>` : "—"}</b><span>Nota</span></div>
      ${zoneBar(a.zones_s)}
      ${a.coach ? evalBlock(a.coach, a) : ""}
    </div>`;
  }).join("") : `<div class="card empty">No hay actividades en este rango.</div>`}`;
}

function afterActividades() {
  $$(".filters button[data-f]").forEach((b) => b.addEventListener("click", () => { state.actFilter = b.dataset.f; render(); }));
  bindChat();
  const ds = rangeDays(), weeks = {};
  ds.forEach((d) => {
    const dt = parseDate(d.date); const monday = new Date(dt); monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const k = monday.toISOString().slice(0, 10);
    weeks[k] = weeks[k] || {};
    d.activities.forEach((a) => { const g = actGroup(a.type); weeks[k][g] = (weeks[k][g] || 0) + (a.duration_s || 0) / 3600; });
  });
  const wk = Object.keys(weeks).sort();
  const present = GROUPS.filter((g) => wk.some((k) => weeks[k][g[0]]));
  chart("c-volume", {
    type: "bar",
    data: { labels: wk.map((k) => "Sem. " + shortDate(k)), datasets: present.map((g) => stackBars(g[1], wk.map((k) => +(weeks[k][g[0]] || 0).toFixed(2)), css(g[2]))) },
    options: opts({ stacked: true, yFmt: (v) => v + " h", tip: (c) => ` ${c.dataset.label}: ${hm(c.raw * 3600)} h` }),
  });
}


/* ============================================================ render */
const views = () => ({
  hoy: [viewHoy, afterHoy], sueno: [viewSueno, afterSueno], recuperacion: [viewRecuperacion, afterRecuperacion],
  rendimiento: [viewRendimiento, afterRendimiento], actividades: [viewActividades, afterActividades], entrenador: [viewEntrenador, afterEntrenador], salud: [viewSalud, afterSalud], reloj: [viewReloj, () => {}], perfil: [viewPerfil, afterPerfil],
});

function render() {
  $$("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.view === state.view));
  $$("#range button").forEach((b) => b.classList.toggle("on", +b.dataset.range === state.range));
  destroyCharts();
  if (!state.data) { $("#view").innerHTML = `<div class="empty">Conecta tu cuenta de Garmin o abre el modo demo para empezar.</div>`; return; }
  const d = day();
  $("#date-pick").value = d.date;
  $("#date-pick").min = state.data.days[0].date;
  $("#date-pick").max = state.data.days[state.data.days.length - 1].date;
  $("#next-day").disabled = state.idx >= state.data.days.length - 1;
  $("#prev-day").disabled = state.idx <= 0;
  const V = views();
  const [html, after] = V[state.view] || V.hoy;
  $("#view").innerHTML = html();
  after();
  window.scrollTo({ top: 0 });
}

/* ============================================================ API y arranque */
async function api(path, body) {
  const res = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || res.statusText);
  return json;
}

async function loadData(demo) {
  state.demo = demo;
  store("pulso-demo", demo ? "1" : "0");
  $("#view").innerHTML = `<div class="empty">Cargando…</div>`;
  state.data = await api(`/api/dashboard${demo ? "?demo=true" : ""}`);
  state.idx = state.data.days.length - 1;
  const devs = state.data.performance?.devices || [];
  $("#device").textContent = devs[0] || "Garmin fēnix 8";
  $("#source").textContent = demo ? "Datos de demostración" : `Última sincronización: ${fmtSync(state.data.last_sync)}`;
  render();
}
const fmtSync = (s) => (s ? new Date(s).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

function modal(html) {
  $("#modal-body").innerHTML = html;
  $("#modal").hidden = !html;
}

function loginModal(error = "") {
  modal(`
    <h2>Conecta tu Garmin</h2>
    <p>Usa tu cuenta de Garmin Connect. Tus credenciales solo viajan de este equipo a Garmin; se guarda un token de sesión en la carpeta <code>data/</code>, nunca la contraseña.</p>
    <form id="f-login">
      <label for="email">Correo</label><input id="email" type="email" autocomplete="username" required>
      <label for="password">Contraseña</label><input id="password" type="password" autocomplete="current-password" required>
      <div class="error">${error}</div>
      <div class="actions"><button class="primary" type="submit">Conectar</button><button class="secondary" type="button" id="b-demo">Ver demo</button>
      ${state.data ? `<button class="secondary" type="button" id="b-close">Cerrar</button>` : ""}</div>
    </form>
    <p class="fine">Se usa la librería no oficial <i>garminconnect</i>, la misma vía que la web de Garmin Connect. Si Garmin te pide un código de verificación, lo introducirás en el siguiente paso.</p>`);
  $("#f-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter; btn.disabled = true; btn.textContent = "Conectando…";
    try {
      const r = await api("/api/login", { email: $("#email").value, password: $("#password").value });
      if (r.result === "mfa") return mfaModal();
      modal(""); startSync(true);
    } catch (err) { loginModal(err.message); }
  });
  $("#b-demo").addEventListener("click", () => { modal(""); loadData(true); });
  $("#b-close")?.addEventListener("click", () => modal(""));
}

function mfaModal(error = "") {
  modal(`<h2>Código de verificación</h2><p>Garmin te envió un código por correo o SMS.</p>
    <form id="f-mfa"><label for="code">Código</label><input id="code" inputmode="numeric" autocomplete="one-time-code" required>
    <div class="error">${error}</div><div class="actions"><button class="primary" type="submit">Verificar</button></div></form>`);
  $("#f-mfa").addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await api("/api/mfa", { code: $("#code").value }); modal(""); startSync(true); } catch (err) { mfaModal(err.message); }
  });
}

function accountModal() {
  const st = state.status;
  if (!st?.connected) return loginModal();
  modal(`<h2>Cuenta Garmin</h2><p>Conectado como <b>${st.profile?.name || "—"}</b>.<br>Última sincronización: ${fmtSync(st.last_sync)}</p>
    <div class="actions" style="flex-direction:column;align-items:stretch">
      <button class="primary" id="b-s30">Sincronizar últimos 30 días</button>
      <button class="secondary" id="b-s90">Descargar 90 días de historial</button>
      <button class="secondary" id="b-s180">Descargar 180 días de historial</button>
      <button class="secondary" id="b-real">${state.demo ? "Ver mis datos reales" : "Ver datos de demostración"}</button>
      <button class="secondary" id="b-out">Cerrar sesión</button>
      <button class="secondary" id="b-close">Cerrar</button>
    </div>`);
  $("#b-s30").onclick = () => { modal(""); startSync(false, 30); };
  $("#b-s90").onclick = () => { modal(""); startSync(false, 90); };
  $("#b-s180").onclick = () => { modal(""); startSync(false, 180); };
  $("#b-real").onclick = () => { modal(""); loadData(!state.demo).catch((e) => alert(e.message)); };
  $("#b-out").onclick = async () => { await api("/api/logout", {}); state.status.connected = false; loginModal(); };
  $("#b-close").onclick = () => modal("");
}

async function startSync(first = false, days = 30) {
  if (!state.status?.connected) {
    state.status = await api("/api/status");
    if (!state.status.connected) return loginModal();
  }
  await api("/api/sync", { days: first ? 60 : days });
  const bar = $("#sync-bar");
  bar.hidden = false; $("#btn-sync").disabled = true;
  const poll = async () => {
    const st = (state.status = await api("/api/status"));
    const s = st.sync;
    bar.querySelector("div").style.width = `${s.total ? (s.progress / s.total) * 100 : 5}%`;
    bar.querySelector("span").textContent = s.message || "Sincronizando…";
    if (s.running) return setTimeout(poll, 1200);
    $("#btn-sync").disabled = false;
    setTimeout(() => (bar.hidden = true), 2500);
    if (s.error) { bar.querySelector("span").textContent = "Error: " + s.error; return; }
    await loadData(false);
  };
  poll();
}

function bindUI() {
  window.addEventListener("hashchange", () => { state.view = location.hash.slice(1) || "hoy"; render(); });
  $("#prev-day").onclick = () => { state.idx = Math.max(0, state.idx - 1); render(); };
  $("#next-day").onclick = () => { state.idx = Math.min(state.data.days.length - 1, state.idx + 1); render(); };
  $("#today").onclick = () => { state.idx = state.data.days.length - 1; render(); };
  $("#date-pick").onchange = (e) => { const i = state.data.days.findIndex((d) => d.date === e.target.value); if (i >= 0) { state.idx = i; render(); } };
  $$("#range button").forEach((b) => (b.onclick = () => { state.range = +b.dataset.range; store("pulso-range", String(state.range)); render(); }));
  $("#btn-sync").onclick = () => (state.status?.connected ? startSync(false, 30) : loginModal());
  $("#btn-account").onclick = accountModal;
  $("#btn-theme").onclick = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next); store("pulso-theme", next); applyChartDefaults(); if (state.data) render();
  };
  // tooltips para elementos HTML/SVG con data-tip
  const tip = $("#tooltip");
  document.addEventListener("mousemove", (e) => {
    const el = e.target.closest?.("[data-tip]");
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const x = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px"; tip.style.top = e.clientY + 14 + "px";
  });
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $("#btn-theme").textContent = t === "dark" ? "Tema claro" : "Tema oscuro";
}

async function boot() {
  setTheme(store("pulso-theme") || "dark");
  applyChartDefaults();
  Chart.register(crosshair);
  state.range = +(store("pulso-range") || 30);
  state.view = location.hash.slice(1) || "hoy";
  bindUI();
  try { state.status = await api("/api/status"); } catch { state.status = null; }
  // espera a que termine el inicio de sesión automático (corre en segundo plano)
  for (let i = 0; i < 60 && state.status?.login?.status === "logging_in" && !state.status.has_data; i++) {
    $("#view").innerHTML = `<div class="empty">Conectando con Garmin…</div>`;
    await new Promise((r) => setTimeout(r, 1500));
    try { state.status = await api("/api/status"); } catch { break; }
  }
  const st = state.status;
  const wantDemo = store("pulso-demo") === "1";
  if (st?.has_data && !wantDemo) return loadData(false);
  if (wantDemo || !st) return loadData(true);
  if (st.connected) return startSync(true);
  render();
  loginModal(st.login?.error || "");
}

window.addEventListener("DOMContentLoaded", boot);
