import type { SleepLevel, SleepStage } from "@pulso/shared";
import { clock, dur } from "@/lib/format";

const ROWS: Record<SleepStage, number> = { awake: 0, rem: 1, light: 2, deep: 3 };
const NAMES = ["Despierto", "REM", "Ligero", "Profundo"];
const COLORS: Record<SleepStage, string> = { awake: "--stage-awake", rem: "--stage-rem", light: "--stage-light", deep: "--stage-deep" };

/** Gráfico de las fases del sueño a lo largo de la noche. */
export function Hypnogram({ levels }: { levels: SleepLevel[] }) {
  if (!levels.length) return <div className="empty">Sin hipnograma disponible.</div>;
  const t0 = levels[0].start;
  const t1 = levels[levels.length - 1].end;
  const W = 1000, L = 70, H = 170, rowH = 34;
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - 10);
  const first = new Date(t0);
  first.setMinutes(0, 0, 0);
  const ticks: number[] = [];
  for (let t = first.getTime() + 3600e3; t < t1; t += 3600e3) ticks.push(t);
  return (
    <svg className="hypno" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {NAMES.map((_, i) => <line key={`g${i}`} x1={L} x2={W} y1={i * rowH + rowH + 1} y2={i * rowH + rowH + 1} stroke="var(--grid)" />)}
      {NAMES.map((n, i) => <text key={n} x={0} y={i * rowH + rowH / 2 + 5}>{n}</text>)}
      {levels.map((l) => (
        <rect key={l.start} x={x(l.start)} y={ROWS[l.stage] * rowH + 4} width={Math.max(1, x(l.end) - x(l.start) - 1)} height={rowH - 6} rx={3}
          fill={`var(${COLORS[l.stage]})`} data-tip={`${NAMES[ROWS[l.stage]]} · ${clock(l.start)}–${clock(l.end)} (${dur((l.end - l.start) / 1000)})`} />
      ))}
      {ticks.map((t) => <text key={t} x={x(t)} y={H - 4} textAnchor="middle">{clock(t)}</text>)}
    </svg>
  );
}
