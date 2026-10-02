"use client";

import type { DayRecord, ReadinessFactor } from "@pulso/shared";
import { Badge, Section } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { Ring, RingCard } from "@/components/ui/Ring";
import { nf, signed } from "@/lib/format";
import { READY, READY_ST } from "@/lib/labels";
import { recoveryStatus, scoreStatus, toneVar } from "@/lib/status";

function ContributorRow({ name, value, base, unit, z, better }: { name: string; value: number | null | undefined; base: number | null | undefined; unit: string; z?: number | null; better: "up" | "down" }) {
  const d = unit === "rpm" ? 1 : 0;
  const diff = value != null && base != null ? value - base : null;
  const good = diff === null ? null : better === "up" ? diff >= 0 : diff <= 0;
  return (
    <tr>
      <td>{name}</td><td className="num">{nf(value, d)} {unit}</td><td className="num muted">{nf(base, d)}</td>
      <td className="num">{diff === null ? "—" : <Badge label={signed(diff, d)} tone={good ? "good" : Math.abs(z ?? 0) > 1 ? "critical" : "warning"} />}</td>
    </tr>
  );
}

const FACTORS: [ReadinessFactor, string][] = [
  ["sleep", "Puntuación de sueño"], ["recoveryTime", "Tiempo de recuperación"], ["acwr", "Carga aguda (ACWR)"],
  ["hrv", "Estado de VFC"], ["stressHistory", "Historial de estrés"], ["sleepHistory", "Historial de sueño"],
];

/** Recuperación de Pulso con sus factores y la disposición para entrenar de Garmin. */
export function RecoveryTop({ d }: { d: DayRecord }) {
  const w = d.indices, c = w.contributors, r = d.readiness;
  const [recLbl, recSt] = recoveryStatus(w.recovery);
  return (
    <>
      <div className="grid g3">
        <RingCard ring={<Ring value={w.recovery} max={100} color={toneVar(recSt)} big={w.recovery == null ? "—" : `${w.recovery}%`} unit="Recuperación" />}
          title={<>Recuperación <Info k="recuperacion" /> <Badge label={recLbl} tone={recSt} /></>}
          caption="Combina VFC (50%), FC en reposo (20%) y sueño (30%) frente a tu línea base de 30 días." />
        <div className="card span2">
          <div className="card-head"><h2>Qué influyó en tu recuperación</h2><span className="sub">vs. línea base 30 días</span></div>
          <table>
            <thead><tr><th>Métrica</th><th>Anoche</th><th>Base</th><th>Diferencia</th></tr></thead>
            <tbody>
              <ContributorRow name="VFC (rMSSD)" value={c.hrv?.value} base={c.hrv?.baseline} unit="ms" z={c.hrv?.z} better="up" />
              <ContributorRow name="FC en reposo" value={c.rhr?.value} base={c.rhr?.baseline} unit="ppm" z={c.rhr?.z} better="down" />
              <ContributorRow name="Frecuencia respiratoria" value={c.resp?.value} base={c.resp?.baseline} unit="rpm" z={c.resp?.z} better="down" />
              <tr><td>Rendimiento del sueño</td><td className="num">{nf(c.sleep?.value)} %</td><td className="num muted">100</td><td /></tr>
            </tbody>
          </table>
        </div>
      </div>

      <Section title={<>Disposición para entrenar <Info k="readiness" /></>} tag="Garmin Training Readiness" />
      <div className="grid g3">
        <RingCard ring={<Ring value={r.score} max={100} color={toneVar(READY_ST[r.level ?? ""])} big={nf(r.score)} unit="Disposición" />}
          title={<Badge label={READY[r.level ?? ""] ?? "—"} tone={READY_ST[r.level ?? ""]} />}
          caption={<>Tiempo de recuperación restante: <b>{nf(r.recoveryTimeH)} h</b> · Carga aguda {nf(r.acuteLoad)}</>} />
        <div className="card span2">
          <div className="card-head"><h2>Factores</h2><span className="sub">% de contribución óptima</span></div>
          <div className="grid g2" style={{ gap: "14px 28px" }}>
            {FACTORS.map(([key, name]) => {
              const v = r.factors?.[key] ?? null;
              return (
                <div className="factor" key={key}>
                  <span className="name">{name}</span><span className="val">{v == null ? "—" : `${v} %`}</span>
                  <div className="bar"><div style={{ width: `${v ?? 0}%`, background: toneVar(scoreStatus(v)) }} /></div>
                  {r.factorFeedback?.[key] ? <span className="fb">{r.factorFeedback[key]}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
