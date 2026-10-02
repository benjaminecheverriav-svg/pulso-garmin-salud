"use client";

import { Hypnogram } from "@/components/charts/Hypnogram";
import { css } from "@/components/charts/setup";
import { Badge, Card, Empty, KeyValues, Legend, Section, StackBar } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { Ring, RingCard } from "@/components/ui/Ring";
import { Stories, ViewHead } from "@/components/ui/Stories";
import { clock, dur, hm, longDate, nf, signed } from "@/lib/format";
import { QUAL, QUAL_ST } from "@/lib/labels";
import { toneVar } from "@/lib/status";
import { useDays } from "@/store/DashboardContext";
import { SleepCharts, STAGES } from "./SleepCharts";

const SUBSCORES: [string, string][] = [
  ["Duración", "duration"], ["Estrés durante el sueño", "stress"], ["Despertares", "awakeCount"], ["Inquietud", "restlessness"],
  ["Sueño profundo", "deep"], ["Sueño ligero", "light"], ["Sueño REM", "rem"],
];

export function SuenoView() {
  const { day: d, days } = useDays();
  const s = d.sleep, w = d.indices;
  if (!s.totalS) return <><ViewHead title="Sueño" /><Empty>No hay datos de sueño para este día.</Empty></>;
  const stageVals = STAGES.map(([name, key, color]) => ({ name, value: (s[key] as number) ?? 0, color }));
  const total = stageVals.reduce((a, b) => a + b.value, 0) || 1;
  const sub = s.subscores as Record<string, string | null | undefined>;
  return (
    <>
      <ViewHead title="Sueño" subtitle={`Noche del ${longDate(d.date)} · ${clock(s.startMs)} – ${clock(s.endMs)}`} />
      <Stories section="sueno" />
      <div className="grid g3">
        <RingCard ring={<Ring value={s.score} max={100} color={toneVar(QUAL_ST[s.qualifier ?? ""])} big={nf(s.score)} unit="Puntuación" />}
          title={<>Puntuación de sueño <Info k="sleep_score" /> <Badge label={QUAL[s.qualifier ?? ""] ?? "—"} tone={QUAL_ST[s.qualifier ?? ""]} /></>}
          caption={`${dur(s.totalS)} dormido${s.napS ? ` · siesta ${dur(s.napS)}` : ""}`} />
        <RingCard ring={<Ring value={w.sleepPerformance} max={100} color={css("--series-7")} big={`${w.sleepPerformance ?? "—"}%`} unit="Rendimiento" />}
          title={<>Rendimiento del sueño <Info k="sueno_rend" /></>}
          caption={`Necesidad ${hm(w.sleepNeedMin * 60)} h · Deuda ${w.sleepDebtMin} min · Consistencia ${w.sleepConsistency ?? "—"}%`} />
        <Card title="Métricas nocturnas">
          <KeyValues rows={[
            ["FC en reposo", `${nf(s.rhr)} ppm`], ["VFC media nocturna", `${nf(d.hrv.lastNight ?? s.hrv)} ms`],
            ["Respiración", `${nf(s.avgResp, 1)} rpm`], ["SpO₂ media / mínima", `${nf(s.avgSpo2)} % / ${nf(s.lowestSpo2)} %`],
            ["Estrés durante el sueño", nf(s.stress)], ["Body Battery recuperado", signed(s.bbChange)], ["Despertares", nf(s.awakeCount)],
          ]} />
        </Card>
      </div>

      <Section title="Fases del sueño" />
      <div className="grid g3">
        <Card className="span2" title={<>Hipnograma <Info k="sleep_stages" /></>} sub="Pasa el cursor para ver cada fase">
          <Hypnogram levels={s.levels ?? []} />
          <Legend items={STAGES.map(([n, , c]) => [n, `var(${c})`])} />
        </Card>
        <Card title="Distribución">
          <StackBar parts={stageVals.map((x) => ({ label: `${x.name}: ${dur(x.value)}`, value: x.value, color: `var(${x.color})` }))} />
          <table style={{ marginTop: 16 }}>
            <tbody>
              {stageVals.map((x, i) => (
                <tr key={x.name}>
                  <td><Badge label={x.name} dot={`var(${x.color})`} /></td>
                  <td className="num">{dur(x.value)}</td>
                  <td className="num muted">{nf((x.value / total) * 100)}%</td>
                  <td>{i < 3 ? QUAL[sub[["deep", "light", "rem"][i]] ?? ""] ?? "" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Section title="Factores de la puntuación" tag="Garmin" />
      <div className="grid g4">
        {SUBSCORES.filter(([, k]) => sub[k]).map(([name, k]) => (
          <div className="card tile" key={k}><div className="label">{name}</div><div><Badge label={QUAL[sub[k]!] ?? sub[k]} tone={QUAL_ST[sub[k]!]} /></div></div>
        ))}
      </div>

      <Section title="Tendencia" tag={`${days.length} días`} />
      <SleepCharts days={days} />
    </>
  );
}
