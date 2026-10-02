"use client";

import type { Activity } from "@pulso/shared";
import { StackBar } from "@/components/ui/basics";
import { cap, dur, hm, longDate, nf, pace } from "@/lib/format";
import { actGroup, actInfo, TE_LABEL } from "@/lib/labels";
import { scoreTone } from "@/lib/status";
import { EvalBlock } from "./EvalBlock";

export const Score = ({ v }: { v: number }) => <span className={`score ${scoreTone(v)}`}>{nf(v, 1)}</span>;

/** Tarjeta de una actividad con sus métricas, zonas y la evaluación del entrenador. */
export function ActivityCard({ a, date, compact = false }: { a: Activity; date: string; compact?: boolean }) {
  const [name, icon] = actInfo(a.type);
  const run = actGroup(a.type) === "running";
  const z = a.zonesS;
  const meta = `${cap(longDate(date))} · ${(a.start ?? "").slice(11, 16)} · ${name}${a.teLabel ? ` · ${TE_LABEL[a.teLabel] ?? a.teLabel}` : ""}`;
  if (compact) {
    return (
      <div className="card act compact">
        <div className="icon">{icon}</div>
        <div><div className="name">{a.name || name}</div><div className="meta">{cap(longDate(date))} · {hm(a.durationS)} h{a.distanceM ? ` · ${nf(a.distanceM / 1000, 1)} km` : ""}</div></div>
        {a.coach ? <div className="m"><b><Score v={a.coach.score} /></b><span>{a.coach.grade}</span></div> : null}
        <EvalBlock a={a} date={date} />
      </div>
    );
  }
  return (
    <div className="card act">
      <div className="icon">{icon}</div>
      <div><div className="name">{a.name || name}</div><div className="meta">{meta}</div></div>
      <div className="m"><b>{hm(a.durationS)}</b><span>Duración</span></div>
      <div className="m"><b>{a.distanceM ? `${nf(a.distanceM / 1000, 2)} km` : "—"}</b><span>Distancia</span></div>
      <div className="m hide-sm"><b>{nf(a.avgHr)}</b><span>FC media</span></div>
      <div className="m hide-md hide-sm"><b>{a.avgSpeed ? (run ? pace(a.avgSpeed) : `${nf(a.avgSpeed * 3.6, 1)} km/h`) : "—"}</b><span>{run ? "Ritmo" : "Velocidad"}</span></div>
      <div className="m hide-md hide-sm"><b>{nf(a.teAerobic, 1)} / {nf(a.teAnaerobic, 1)}</b><span>Efecto aer./anaer.</span></div>
      <div className="m"><b>{a.coach ? <Score v={a.coach.score} /> : "—"}</b><span>Nota</span></div>
      {z ? <div className="zones"><StackBar height={8} parts={z.map((s, i) => ({ label: `Z${i + 1}: ${dur(s)}`, value: s, color: `var(--z${i + 1})` }))} /></div> : null}
      <EvalBlock a={a} date={date} />
    </div>
  );
}
