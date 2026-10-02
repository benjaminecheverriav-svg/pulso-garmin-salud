"use client";

import type { WeekReview } from "@pulso/shared";
import { css } from "@/components/charts/setup";
import { Legend, StackBar, Tile } from "@/components/ui/basics";
import { hm, nf, signed } from "@/lib/format";
import { toneVar } from "@/lib/status";

/** Revisión de los últimos 7 días frente a los 7 anteriores. */
export function WeekReviewCard({ week }: { week: WeekReview }) {
  const c = week.current, p = week.previous;
  const delta = (a: number, b: number) => (b ? <span className="delta">{signed(((a - b) / b) * 100)}% vs semana previa</span> : null);
  return (
    <>
      <div className="grid g6">
        <Tile label="Sesiones" value={nf(c.sessions)} note={delta(c.sessions, p.sessions)} />
        <Tile label="Tiempo" value={hm(c.hours * 3600)} unit="h" note={delta(c.hours, p.hours)} />
        <Tile label="Distancia" value={nf(c.km, 1)} unit="km" note={delta(c.km, p.km)} />
        <Tile label="Carga" value={nf(c.load)} note={delta(c.load, p.load)} />
        <Tile label="Tiempo suave (Z1–Z2)" value={nf(c.easyPct)} unit="%" note="Objetivo ~80 %" />
        <Tile label="Nota media" value={nf(week.avgScore, 1)} unit="/10" note={`${c.restDays} día(s) de descanso`} />
      </div>
      <div className="card mt">
        <div className="card-head"><h2>{week.verdict}</h2></div>
        {week.notes.map(([tone, txt]) => (
          <div className="story-item" key={txt}><span className="dot" style={{ background: toneVar(tone) }} /><div><p>{txt}</p></div></div>
        ))}
        <div style={{ marginTop: 14 }}>
          <StackBar height={12} parts={[
            { label: `Suave Z1–Z2: ${c.easyPct}%`, value: c.easyPct, color: "var(--z2)" },
            { label: `Tempo Z3: ${c.midPct}%`, value: c.midPct, color: "var(--z3)" },
            { label: `Intenso Z4–Z5: ${c.hardPct}%`, value: c.hardPct, color: "var(--z5)" },
          ]} />
        </div>
        <Legend items={[["Suave Z1–Z2", css("--z2")], ["Tempo Z3", css("--z3")], ["Intenso Z4–Z5", css("--z5")]]} />
      </div>
    </>
  );
}
