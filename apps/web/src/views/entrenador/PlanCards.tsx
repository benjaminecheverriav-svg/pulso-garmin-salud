"use client";

import type { CoachReport } from "@pulso/shared";
import Link from "next/link";
import { Badge, Card } from "@/components/ui/basics";
import { cap, nf, parseDate, raceTime } from "@/lib/format";
import { INTENSITY_TONE } from "@/lib/status";

/** Recomendación de hoy y el objetivo con su fase de entrenamiento. */
export function TodayAndGoal({ coach }: { coach: CoachReport }) {
  const { today: t, plan, goal } = coach;
  return (
    <div className="grid g3">
      <div className="card span2 today-card">
        <div className="label">Hoy te recomiendo</div>
        <div className="today-title">{t.title} <Badge label={cap(t.intensity)} tone={INTENSITY_TONE[t.intensity]} /></div>
        <p className="today-detail">{t.detail}</p>
        <p><b>Por qué:</b> {t.why}</p>
        <div className="chips">{t.reasons.map((r) => <span className="chip-s" key={r}>{r}</span>)}</div>
      </div>
      <Card title="Tu objetivo" sub={<Link href="/perfil">Editar</Link>}>
        <div className="tile">
          <div className="value" style={{ fontSize: 22 }}>{plan.goal}</div>
          {plan.weeksToRace != null ? <div className="note">{plan.weeksToRace >= 0 ? `Faltan ${nf(plan.weeksToRace, 1)} semanas` : "Carrera pasada"}</div> : null}
        </div>
        {goal ? (
          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>Predicción actual</dt><dd>{raceTime(goal.predictedS)}</dd>
            {goal.targetS ? <><dt>Tu objetivo</dt><dd>{raceTime(goal.targetS)}</dd><dt>Diferencia</dt><dd>{goal.gapS! > 0 ? `faltan ${raceTime(goal.gapS)}` : "¡ya en ritmo!"}</dd></> : null}
          </dl>
        ) : null}
        <p className="note-box" style={{ marginTop: 12 }}><b>Fase:</b> {plan.phaseText}</p>
      </Card>
    </div>
  );
}

const dayName = (s: string) => cap(parseDate(s).toLocaleDateString("es", { weekday: "long", day: "numeric" }));

/** Plan de los próximos 7 días. */
export function WeekPlanCard({ coach }: { coach: CoachReport }) {
  return (
    <div className="card plan">
      {coach.plan.days.map((d, i) => (
        <div className={`plan-row ${i === 0 ? "today" : ""}`} key={d.date}>
          <div className="plan-day">{i === 0 ? "Hoy" : dayName(d.date)}</div>
          <div><b>{d.title}</b> <Badge label={cap(d.intensity)} tone={INTENSITY_TONE[d.intensity]} /><p>{d.detail}</p></div>
        </div>
      ))}
      <p className="note-box" style={{ marginTop: 8 }}>El plan se recalcula cada día con tu recuperación. Si un día amaneces con la recuperación baja, el entrenador cambia la sesión dura por una suave.</p>
    </div>
  );
}

const ZONES: [keyof NonNullable<CoachReport["plan"]["zones"]["hr"]>, string][] = [
  ["z1", "Z1 · Recuperación"], ["z2", "Z2 · Aeróbico suave"], ["z3", "Z3 · Tempo"], ["z4", "Z4 · Umbral"], ["z5", "Z5 · VO2 máx."],
];
const PACES: [keyof NonNullable<CoachReport["plan"]["zones"]["pace"]>, string][] = [
  ["suave", "Rodaje suave"], ["largo", "Tirada larga"], ["tempo", "Tempo"], ["umbral", "Umbral"], ["vo2", "Series VO2 máx."],
];

/** Zonas de pulso y ritmos personales. */
export function ZonesCards({ coach }: { coach: CoachReport }) {
  const z = coach.plan.zones;
  const range = (r?: [number | null, number | null]) => (!r ? "—" : r[0] == null ? `< ${r[1]} ppm` : r[1] == null ? `> ${r[0]} ppm` : `${r[0]}–${r[1]} ppm`);
  return (
    <div className="grid g2">
      <Card title="Pulso por zonas">
        {z.hr ? (
          <>
            <table><tbody>{ZONES.map(([k, n], i) => (
              <tr key={k}><td><Badge label={n} dot={`var(--z${i + 1})`} /></td><td className="num">{range(z.hr?.[k])}</td></tr>
            ))}</tbody></table>
            <p className="note-box" style={{ marginTop: 8 }}>Calculadas con tu FC de umbral de lactato ({z.lthr} ppm).</p>
          </>
        ) : <p className="muted">Sin umbral de lactato. Haz la prueba guiada del reloj (sección Mi reloj).</p>}
      </Card>
      <Card title="Ritmos de carrera">
        {z.pace ? <table><tbody>{PACES.map(([k, n]) => <tr key={k}><td>{n}</td><td className="num">{z.pace![k]}</td></tr>)}</tbody></table>
          : <p className="muted">Se calculan con tu umbral o tus predicciones de carrera.</p>}
      </Card>
    </div>
  );
}
