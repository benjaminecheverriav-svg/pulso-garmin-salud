"use client";

import type { DayRecord } from "@pulso/shared";
import { ChartBox } from "@/components/charts/ChartBox";
import { bars, line, opts } from "@/components/charts/options";
import { alpha, css } from "@/components/charts/setup";
import { Badge, Card, KeyValues, Legend, StackBar } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { clock, dur, nf, shortDate } from "@/lib/format";

/** Body Battery del día, estrés y carga/descarga de energía en el rango. */
export function EnergyStress({ d, days }: { d: DayRecord; days: DayRecord[] }) {
  const st = d.stress;
  const bb = d.bodyBattery.series ?? [];
  const parts: [string, number | null | undefined, string][] = [
    ["Reposo", st.restS, "--series-1"], ["Bajo", st.lowS, "--series-3"], ["Medio", st.mediumS, "--series-4"], ["Alto", st.highS, "--series-5"],
  ];
  const labels = days.map((x) => shortDate(x.date));
  return (
    <div className="grid g3">
      <Card className="span2" title={<>Body Battery hoy <Info k="body_battery" /></>} sub={`+${nf(d.bodyBattery.charged)} cargado · −${nf(d.bodyBattery.drained)} gastado`}>
        <ChartBox data={{ labels: bb.map((p) => clock(p[0])), datasets: [
          line("Body Battery", bb.map((p) => p[1]), css("--series-1"), { fill: true, backgroundColor: alpha(css("--series-1"), 0.15), tension: 0.35 }),
        ] }} options={opts({ yMin: 0, yMax: 100 })} />
      </Card>
      <Card title={<>Estrés del día <Info k="stress" /></>}>
        <div className="tile"><div className="value">{nf(st.avg)}<small>medio · máx. {nf(st.max)}</small></div></div>
        <div style={{ margin: "14px 0" }}>
          <StackBar parts={parts.map(([n, v, c]) => ({ label: `${n}: ${dur(v)}`, value: v ?? 0, color: `var(${c})` }))} />
        </div>
        <KeyValues rows={parts.map(([n, v, c]) => [<Badge key={n} label={n} dot={`var(${c})`} />, dur(v)])} />
      </Card>
      <Card className="span3" title="Carga y descarga de Body Battery" sub={`${days.length} días`}>
        <ChartBox type="bar" data={{ labels, datasets: [
          bars("Cargado", days.map((x) => x.bodyBattery.charged ?? null), css("--series-3")),
          bars("Gastado", days.map((x) => x.bodyBattery.drained ?? null), css("--series-2")),
        ] }} options={opts({ yMin: 0 })} />
        <Legend items={[["Cargado", css("--series-3")], ["Gastado", css("--series-2")]]} />
      </Card>
    </div>
  );
}
