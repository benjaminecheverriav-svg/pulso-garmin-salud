import type { ReactNode } from "react";

/** Anillo de progreso con el valor en el centro. */
export function Ring({ value, max, color, big, unit }: { value: number | null | undefined; max: number; color: string; big: ReactNode; unit: string }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  const p = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div className="ring">
      <svg viewBox="0 0 150 150" aria-hidden="true">
        <circle cx="75" cy="75" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="10" />
        <circle cx="75" cy="75" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(c * p).toFixed(1)} ${c.toFixed(1)}`} />
      </svg>
      <div className="center"><div className="big">{big}</div><div className="unit">{unit}</div></div>
    </div>
  );
}

export function RingCard({ ring, title, caption }: { ring: ReactNode; title: ReactNode; caption?: ReactNode }) {
  return (
    <div className="card ring-card">
      {ring}
      <div className="title">{title}</div>
      {caption ? <div className="caption">{caption}</div> : null}
    </div>
  );
}
