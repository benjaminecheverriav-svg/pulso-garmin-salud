"use client";

import type { DayRecord } from "@pulso/shared";
import { ChartBox } from "@/components/charts/ChartBox";
import { line, opts, stackBars } from "@/components/charts/options";
import { css } from "@/components/charts/setup";
import { Card, Legend } from "@/components/ui/basics";
import { hm, nf, pad, shortDate } from "@/lib/format";

/** Hora del día como minutos desde las 18:00, para que la medianoche no rompa la escala. */
const fromSix = (ms: number | null | undefined): number | null => {
  if (!ms) return null;
  const t = new Date(ms);
  const m = t.getHours() * 60 + t.getMinutes() - 1080;
  return m < 0 ? m + 1440 : m;
};
const clockLabel = (m: number) => {
  const t = (m + 1080) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(Math.round(t % 60))}`;
};

export const STAGES: [string, keyof DayRecord["sleep"], string][] = [
  ["Profundo", "deepS", "--stage-deep"], ["Ligero", "lightS", "--stage-light"], ["REM", "remS", "--stage-rem"], ["Despierto", "awakeS", "--stage-awake"],
];

/** Tendencias de sueño en el rango elegido. */
export function SleepCharts({ days }: { days: DayRecord[] }) {
  const labels = days.map((x) => shortDate(x.date));
  const hours = (k: keyof DayRecord["sleep"]) => days.map((x) => (typeof x.sleep[k] === "number" ? +((x.sleep[k] as number) / 3600).toFixed(2) : null));
  const stageLegend = STAGES.map(([n, , c]) => [n, css(c)] as [string, string]);
  return (
    <div className="grid g2">
      <Card title="Horas por fase">
        <ChartBox type="bar" size="tall" data={{ labels, datasets: STAGES.map(([n, k, c]) => stackBars(n, hours(k), css(c))) }}
          options={opts({ stacked: true, yFmt: (v) => `${v} h`, tip: (c) => ` ${c.dataset.label}: ${hm((c.raw as number) * 3600)} h` })} />
        <Legend items={stageLegend} />
      </Card>
      <Card title="Puntuación de sueño vs rendimiento">
        <ChartBox size="tall" data={{ labels, datasets: [
          line("Puntuación Garmin", days.map((x) => x.sleep.score ?? null), css("--series-1")),
          line("Rendimiento del sueño", days.map((x) => x.indices.sleepPerformance), css("--series-2")),
        ] }} options={opts({ yMin: 0, yMax: 100 })} />
        <Legend items={[["Puntuación Garmin", css("--series-1")], ["Rendimiento del sueño", css("--series-2")]]} />
      </Card>
      <Card title="Horario de sueño">
        <ChartBox data={{ labels, datasets: [
          line("Acostarse", days.map((x) => fromSix(x.sleep.startMs)), css("--series-7"), { pointRadius: 3 }),
          line("Despertar", days.map((x) => fromSix(x.sleep.endMs)), css("--series-4"), { pointRadius: 3 }),
        ] }} options={opts({ yStep: 120, yFmt: clockLabel, tip: (c) => ` ${c.dataset.label}: ${clockLabel(c.raw as number)}` })} />
        <Legend items={[["Acostarse", css("--series-7")], ["Despertar", css("--series-4")]]} />
      </Card>
      <Card title="Respiración y SpO₂ nocturnos" sub="respiraciones por minuto">
        <ChartBox data={{ labels, datasets: [line("Respiración (rpm)", days.map((x) => x.sleep.avgResp ?? null), css("--series-3"), { tension: 0.15, pointRadius: 2 })] }}
          options={opts({ tip: (c) => ` ${nf(c.raw as number, 1)} rpm · SpO₂ ${nf(days[c.dataIndex].sleep.avgSpo2)} %` })} />
      </Card>
    </div>
  );
}
