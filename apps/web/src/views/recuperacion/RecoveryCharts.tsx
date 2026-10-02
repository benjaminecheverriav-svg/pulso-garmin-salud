"use client";

import type { DayRecord } from "@pulso/shared";
import { ChartBox } from "@/components/charts/ChartBox";
import { band, bars, line, opts } from "@/components/charts/options";
import { alpha, css, toneColor } from "@/components/charts/setup";
import { Card, Legend } from "@/components/ui/basics";
import { shortDate } from "@/lib/format";
import { recoveryStatus } from "@/lib/status";

/** Tendencias de VFC, recuperación, FC en reposo y disposición. */
export function RecoveryCharts({ days }: { days: DayRecord[] }) {
  const labels = days.map((x) => shortDate(x.date));
  const bandColor = alpha(css("--series-3"), 0.18);
  return (
    <div className="grid g2 mt">
      <Card title="VFC nocturna y media de 7 días">
        <ChartBox size="tall" data={{ labels, datasets: [
          ...band(days.map((x) => x.hrv.baselineLow ?? null), days.map((x) => x.hrv.baselineHigh ?? null), bandColor),
          line("VFC nocturna", days.map((x) => x.hrv.lastNight ?? null), css("--series-1"), { pointRadius: 2 }),
          line("Media 7 días", days.map((x) => x.hrv.weeklyAvg ?? null), css("--series-2")),
        ] }} options={opts({ tip: (c) => ` ${c.dataset.label}: ${c.raw} ms` })} />
        <Legend items={[["VFC nocturna", css("--series-1")], ["Media 7 días", css("--series-2")], ["Rango equilibrado", alpha(css("--series-3"), 0.35)]]} />
      </Card>
      <Card title="Recuperación diaria" sub="%">
        <ChartBox type="bar" size="tall" data={{ labels, datasets: [
          bars("Recuperación", days.map((x) => x.indices.recovery), days.map((x) => toneColor(recoveryStatus(x.indices.recovery)[1]))),
        ] }} options={opts({ yMin: 0, yMax: 100, tip: (c) => ` ${c.raw}% · ${recoveryStatus(c.raw as number)[0]}` })} />
        <Legend items={[["Verde ≥ 67", toneColor("good")], ["Amarillo 34–66", toneColor("warning")], ["Rojo ≤ 33", toneColor("critical")]]} />
      </Card>
      <Card title="FC en reposo" sub="ppm">
        <ChartBox data={{ labels, datasets: [line("FC en reposo", days.map((x) => x.heart.rhr ?? null), css("--series-2"), { pointRadius: 2 })] }}
          options={opts({ tip: (c) => ` ${c.raw} ppm` })} />
      </Card>
      <Card title="Disposición Garmin" sub="0–100">
        <ChartBox data={{ labels, datasets: [line("Disposición", days.map((x) => x.readiness.score ?? null), css("--series-1"), { fill: true, backgroundColor: alpha(css("--series-1"), 0.12) })] }}
          options={opts({ yMin: 0, yMax: 100 })} />
      </Card>
    </div>
  );
}
