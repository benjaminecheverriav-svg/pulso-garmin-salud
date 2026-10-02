"use client";

import type { DayRecord, HealthReport } from "@pulso/shared";
import { ChartBox } from "@/components/charts/ChartBox";
import { line, opts } from "@/components/charts/options";
import { css } from "@/components/charts/setup";
import { Card, Legend } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { avg, nf, shortDate } from "@/lib/format";

/** Tendencias de 90 días: pulso en reposo, VFC, oxígeno nocturno, presión y peso. */
export function VitalsCharts({ days, h }: { days: DayRecord[]; h: HealthReport }) {
  const labels = days.map((x) => shortDate(x.date));
  const rhr = days.map((x) => x.heart.rhr ?? null);
  const roll = rhr.map((_, i) => { const v = avg(rhr.slice(Math.max(0, i - 13), i + 1)); return v ? +v.toFixed(1) : null; });
  const flat = (v: number) => days.map(() => v);
  const bp = h.bpReadings, w = h.weights;
  return (
    <div className="grid g2">
      <Card title={<>FC en reposo <Info k="rhr" /></>} sub="ppm">
        <ChartBox data={{ labels, datasets: [line("FC en reposo", rhr, css("--series-2"), { pointRadius: 1.5 }), line("Media 14 d", roll, css("--series-1"))] }} options={opts()} />
        <Legend items={[["FC en reposo", css("--series-2")], ["Media móvil 14 d", css("--series-1")]]} />
      </Card>
      <Card title={<>VFC nocturna <Info k="hrv" /></>} sub="ms">
        <ChartBox data={{ labels, datasets: [
          line("VFC", days.map((x) => x.hrv.lastNight ?? null), css("--series-1"), { pointRadius: 1.5 }),
          line("Referencia edad", flat(h.fitness.hrvNorm), css("--text-muted"), { borderWidth: 1, pointHoverRadius: 0 }),
        ] }} options={opts()} />
        <Legend items={[["VFC nocturna", css("--series-1")], ["Referencia para tu edad", css("--text-muted")]]} />
      </Card>
      <Card title={<>Oxígeno nocturno mínimo <Info k="spo2" /></>} sub="%">
        <ChartBox data={{ labels, datasets: [
          line("SpO₂ mínima", days.map((x) => x.sleep.lowestSpo2 ?? null), css("--series-3"), { pointRadius: 2, tension: 0.2 }),
          line("Umbral 88 %", flat(88), css("--text-muted"), { borderWidth: 1, pointHoverRadius: 0 }),
        ] }} options={opts({ yMin: 75, yMax: 100 })} />
        <Legend items={[["SpO₂ mínima", css("--series-3")], ["Umbral de alerta 88 %", css("--text-muted")]]} />
      </Card>
      {bp.length ? (
        <Card title="Presión arterial" sub="mmHg">
          <ChartBox data={{ labels: bp.map((x) => shortDate(x.date)), datasets: [
            line("Sistólica", bp.map((x) => x.sys), css("--series-2"), { pointRadius: 3 }), line("Diastólica", bp.map((x) => x.dia), css("--series-1"), { pointRadius: 3 }),
          ] }} options={opts({ yMin: 50 })} />
          <Legend items={[["Sistólica", css("--series-2")], ["Diastólica", css("--series-1")]]} />
        </Card>
      ) : (
        <Card title="Presión arterial">
          <p className="muted">No hay mediciones. Es el factor más importante para prevenir infarto y ACV: mídela varias mañanas al mes y regístrala en Garmin Connect (Salud &gt; Presión arterial).</p>
        </Card>
      )}
      {w.length ? (
        <Card title="Peso" sub="kg">
          <ChartBox data={{ labels: w.map((x) => shortDate(x.date)), datasets: [line("Peso", w.map((x) => x.kg), css("--series-7"), { pointRadius: 3 })] }}
            options={opts({ tip: (c) => ` ${nf(c.raw as number, 1)} kg` })} />
        </Card>
      ) : null}
    </div>
  );
}
