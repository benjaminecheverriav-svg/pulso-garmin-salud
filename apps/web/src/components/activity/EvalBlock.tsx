"use client";

import type { Activity } from "@pulso/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { nf } from "@/lib/format";
import { useDash } from "@/store/DashboardContext";
import { DetailBlock } from "./DetailBlock";

/** Evaluación desplegable del entrenador para una sesión. */
export function EvalBlock({ a, date }: { a: Activity; date: string }) {
  const { data } = useDash();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const c = a.coach;
  if (!c) return null;
  const ask = () => {
    sessionStorage.setItem("pulso-ask", `Evalúa en detalle mi sesión «${a.name ?? ""}» del ${date}: qué hice bien, qué mejorar y qué hago después.`);
    router.push("/entrenador#chat");
  };
  return (
    <details className="eval" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Evaluación del entrenador · <b>{c.grade}</b> ({nf(c.score, 1)}/10)</summary>
      {c.purpose ? <p className="muted">{c.purpose}</p> : null}
      {c.good.length ? <div className="ev-list">{c.good.map((x) => <div className="ok" key={x}>✓ {x}</div>)}</div> : null}
      {c.improve.length ? <div className="ev-list">{c.improve.map((x) => <div className="ko" key={x}>! {x}</div>)}</div> : null}
      {c.context.length ? <div className="ev-list">{c.context.map((x) => <div key={x}>☀ {x}</div>)}</div> : null}
      <DetailBlock a={a} open={open} />
      <p className="muted">{c.next}{c.recoveryH ? ` Recuperación estimada: ~${c.recoveryH} h.` : ""}</p>
      {data?.aiEnabled ? <button className="secondary" onClick={ask}>Pedir análisis detallado a la IA</button> : null}
    </details>
  );
}
