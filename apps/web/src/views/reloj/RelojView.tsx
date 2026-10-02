"use client";

import { useState } from "react";
import { Badge, Section, Tile } from "@/components/ui/basics";
import { ViewHead } from "@/components/ui/Stories";
import { nf } from "@/lib/format";
import { GROUPS } from "@/lib/labels";
import { useDash } from "@/store/DashboardContext";

const PRIO_TONE = { alta: "serious", media: "warning", baja: "" } as const;
const pct = (x: number | null | undefined) => (x == null ? "—" : nf(x * 100));

/** Cómo se usa el reloj y consejos de configuración según los datos. */
export function RelojView() {
  const { data } = useDash();
  const dv = data!.device, u = dv.usage;
  const [cat, setCat] = useState("Todas");
  const cats = ["Todas", ...new Set(dv.tips.map((t) => t.category))];
  const groups = Object.entries(u.groups).map(([k, n]) => `${GROUPS.find((g) => g[0] === k)?.[1] ?? k} ${n}`).join(" · ");
  return (
    <>
      <ViewHead title="Mi reloj" subtitle={`${dv.devices[0] ?? "Garmin fēnix 8"} · Cómo lo usas y cómo sacarle más partido según tus actividades y tu estilo de vida.`} />
      <Section title="Cómo usas el reloj" tag="últimos 30 días" />
      <div className="grid g6">
        <Tile label="Noches con sueño" value={pct(u.sleepNights)} unit="%" note="Objetivo: todas" />
        <Tile label="Noches con VFC" value={pct(u.hrvNights)} unit="%" note="Clave para la recuperación" />
        <Tile label="Noches con SpO₂" value={pct(u.spo2Nights)} unit="%" note="Para detectar apnea" />
        <Tile label="Uso diario" value={u.wearH ? nf(u.wearH, 1) : "—"} unit="h" note="Objetivo: > 22 h" />
        <Tile label="Actividades/semana" value={nf(u.actsWeek, 1)} note={groups} />
        <Tile label="Con pulso registrado" value={pct(u.withZones)} unit="%" note="De tus actividades" />
      </div>

      <Section title="Recomendaciones de configuración" tag={`${dv.tips.length} consejos`} />
      <div className="filters">
        {cats.map((c) => <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="grid g2">
        {dv.tips.filter((t) => cat === "Todas" || t.category === cat).map((t) => (
          <div className="card tipc" key={t.title}>
            <div className="tip-head"><span className="tag">{t.category}</span><Badge label={`Prioridad ${t.priority}`} tone={PRIO_TONE[t.priority]} /></div>
            <h2>{t.title}</h2>
            <p><b>Por qué (según tus datos):</b> {t.why}</p>
            <p className="how"><b>Cómo hacerlo:</b> {t.how}</p>
          </div>
        ))}
      </div>
      <p className="note-box" style={{ marginTop: 14 }}>Las rutas de menú corresponden al fēnix 8 con software reciente y pueden variar un poco según la versión. En el reloj, mantén pulsado el botón MENU para abrir los Ajustes.</p>
    </>
  );
}
