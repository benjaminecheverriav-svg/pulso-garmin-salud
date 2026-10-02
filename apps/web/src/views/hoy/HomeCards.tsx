"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/basics";
import { cap, shortDate } from "@/lib/format";
import { INTENSITY_TONE } from "@/lib/status";
import { useDash } from "@/store/DashboardContext";

/** Qué métricas se van activando durante los primeros días con el reloj. */
export function Onboarding() {
  const { data } = useDash();
  const ds = data!.dataStatus;
  if (data!.source === "demo") return null;
  const items: [string, number, number, string, string][] = [
    ["Índice de Recuperación", Math.min(ds.hrvNights, 4), 4, "noches con VFC", "Duerme con el reloj puesto."],
    ["Riesgos de salud", Math.min(ds.wellnessDays, 7), 7, "días de uso", "Úsalo de día y de noche."],
    ["Estado de VFC de Garmin", Math.min(ds.hrvNights, 19), 19, "noches", "Garmin necesita unas 3 semanas para fijar tu línea base."],
    ["Disposición para entrenar", ds.hasReadiness ? 1 : 0, 1, "", "Aparece tras unas noches de sueño y alguna actividad."],
    ["VO2 máx. y predicciones", ds.hasVo2 ? 1 : 0, 1, "", "Haz una carrera o ruta en bici al aire libre con GPS de al menos 15 min a buen ritmo."],
    ["Evaluación del entrenador", Math.min(ds.activities, 1), 1, "actividad", "Registra un entrenamiento con el reloj."],
  ];
  if (items.every(([, v, max]) => v >= max)) return null;
  return (
    <div className="card onboarding">
      <div className="card-head"><h2>Tus primeros días con Pulso</h2><span className="sub">desde el {ds.firstDay ? shortDate(ds.firstDay) : "—"} · {ds.days} día(s)</span></div>
      <p className="muted">Muchas métricas comparan contigo mismo, así que se activan a medida que usas el reloj:</p>
      <div className="factors">
        {items.map(([name, v, max, unit, how]) => (
          <div className="factor" key={name}>
            <span className="name">{v >= max ? "✓" : "○"} {name}</span>
            <span className="val">{max > 1 ? `${v}/${max} ${unit}` : v >= max ? "Listo" : "Pendiente"}</span>
            <div className="bar"><div style={{ width: `${(v / max) * 100}%`, background: v >= max ? "var(--good)" : "var(--accent)" }} /></div>
            {v < max ? <span className="fb">{how}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Alertas de salud y la sesión que recomienda el entrenador para hoy. */
export function CoachTeaser() {
  const { data, idx } = useDash();
  const today = data!.coach.today;
  const isLatest = idx === data!.days.length - 1;
  return (
    <>
      {data!.health.alerts.map((a) => (
        <div key={a.title} className={`card alert ${a.level}`}><b>{a.title}</b><p>{a.text}</p></div>
      ))}
      {isLatest ? (
        <Link className="card teaser" href="/entrenador">
          <div>
            <div className="label">Tu entrenador te recomienda hoy</div>
            <div className="teaser-title">{today.title} <Badge label={cap(today.intensity)} tone={INTENSITY_TONE[today.intensity]} /></div>
            <p>{today.detail}</p>
          </div>
          <span className="go">Ver plan ›</span>
        </Link>
      ) : null}
    </>
  );
}
