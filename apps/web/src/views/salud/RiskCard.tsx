import type { HealthStatus, Risk } from "@pulso/shared";
import { Badge } from "@/components/ui/basics";
import { toneVar } from "@/lib/status";

export const LEVEL_TONE: Record<HealthStatus, string> = { good: "good", warning: "warning", serious: "serious", critical: "critical", unknown: "" };
const LABEL: Record<HealthStatus, string> = { good: "Bien", warning: "Atención", serious: "Riesgo", critical: "Alto riesgo", unknown: "Sin datos" };

/** Indicador de riesgo con sus factores, acciones y lo que falta para afinarlo. */
export function RiskCard({ r }: { r: Risk }) {
  const tone = LEVEL_TONE[r.level];
  return (
    <div className="card risk">
      <div className="risk-head">
        <span className="risk-icon">{r.icon}</span>
        <div><h2>{r.name}</h2><div className="muted small">{r.intro}</div></div>
        <Badge label={r.label} tone={tone} />
      </div>
      <div className="progress" style={{ margin: "12px 0 8px" }}>
        <div style={{ width: `${r.level === "unknown" ? 0 : Math.max(4, r.index)}%`, background: toneVar(tone) }} />
      </div>
      <p>{r.summary}</p>
      {r.actions.length ? (
        <div className="ev-list"><b>Qué puedes hacer:</b>{r.actions.map((a) => <div key={a}>→ {a}</div>)}</div>
      ) : null}
      <details>
        <summary>Ver los {r.factors.length} factores analizados (datos del {r.coverage}%)</summary>
        <table>
          <tbody>
            {r.factors.map((f) => (
              <tr key={f.name}>
                <td><b>{f.name}</b><div className="muted small">{f.why}</div></td>
                <td className="num">{f.value}</td>
                <td><Badge label={LABEL[f.status]} tone={LEVEL_TONE[f.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.toComplete.length ? <p className="note-box"><b>Para afinar este indicador:</b> {r.toComplete.join(" ")}</p> : null}
      </details>
    </div>
  );
}
