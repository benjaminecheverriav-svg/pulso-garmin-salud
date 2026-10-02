import type { Tone } from "@pulso/shared";
import type { CSSProperties, ReactNode } from "react";

/** Piezas visuales pequeñas reutilizadas en todas las vistas. */

export function Badge({ label, tone, dot }: { label: ReactNode; tone?: Tone | string; dot?: string }) {
  return <span className={`badge ${tone ?? ""}`} style={dot ? ({ "--dot": dot } as CSSProperties) : undefined}>{label}</span>;
}

export function Section({ title, tag }: { title: ReactNode; tag?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {tag ? <span className="tag">{tag}</span> : null}
    </div>
  );
}

export function Card({ title, sub, children, className = "" }: { title?: ReactNode; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      {title ? <div className="card-head"><h2>{title}</h2>{sub ? <span className="sub">{sub}</span> : null}</div> : null}
      {children}
    </div>
  );
}

export function Tile({ label, value, unit, note, children }: { label: ReactNode; value: ReactNode; unit?: string; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card tile">
      <div className="label">{label}</div>
      <div className="value">{value}{unit ? <small>{unit}</small> : null}</div>
      {note ? <div className="note">{note}</div> : null}
      {children}
    </div>
  );
}

export function Progress({ value, max, color = "var(--accent)" }: { value: number | null | undefined; max: number | null | undefined; color?: string }) {
  return <div className="progress"><div style={{ width: `${Math.min(100, ((value ?? 0) / (max || 1)) * 100)}%`, background: color }} /></div>;
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="legend">
      {items.map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}
    </div>
  );
}

/** Barra apilada horizontal con tooltip por segmento. */
export function StackBar({ parts, height }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="stack" style={height ? { height } : undefined}>
      {parts.map((p) => <div key={p.label} data-tip={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
    </div>
  );
}

export function KeyValues({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v], i) => [<dt key={`k${i}`}>{k}</dt>, <dd key={`v${i}`}>{v}</dd>])}
    </dl>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <div className="card empty">{children}</div>;
