"use client";

import type { DayRecord } from "@pulso/shared";
import { ChartBox } from "@/components/charts/ChartBox";
import { opts, stackBars } from "@/components/charts/options";
import { css } from "@/components/charts/setup";
import { Badge, Card, Legend, StackBar } from "@/components/ui/basics";
import { dur, mondayOf, nf, shortDate, sum } from "@/lib/format";

const NAMES = ["Calentamiento", "Suave", "Aeróbico", "Umbral", "Máximo"];

export function zoneTotals(days: DayRecord[]): number[] {
  const z = [0, 0, 0, 0, 0];
  days.forEach((d) => d.activities.forEach((a) => (a.zonesS ?? []).forEach((s, i) => (z[i] += s ?? 0))));
  return z;
}

/** Minutos por zona de pulso, por semana y en total, con la regla 80/20. */
export function ZonesSection({ days }: { days: DayRecord[] }) {
  const weeks = new Map<string, number[]>();
  for (const d of days) {
    const k = mondayOf(d.date);
    const w = weeks.get(k) ?? [0, 0, 0, 0, 0];
    zoneTotals([d]).forEach((s, i) => (w[i] += s / 60));
    weeks.set(k, w);
  }
  const keys = [...weeks.keys()].sort();
  const z = zoneTotals(days);
  const tot = sum(z) || 1;
  return (
    <div className="grid g3">
      <Card className="span2" title="Minutos por zona y semana">
        <ChartBox type="bar" size="tall" data={{
          labels: keys.map((k) => `Sem. ${shortDate(k)}`),
          datasets: [1, 2, 3, 4, 5].map((n) => stackBars(`Zona ${n}`, keys.map((k) => Math.round(weeks.get(k)![n - 1])), css(`--z${n}`))),
        }} options={opts({ stacked: true, yFmt: (v) => `${v} min`, tip: (c) => ` ${c.dataset.label}: ${c.raw} min` })} />
        <Legend items={[1, 2, 3, 4, 5].map((n) => [`Zona ${n}`, css(`--z${n}`)] as [string, string])} />
      </Card>
      <Card title="Distribución total">
        <StackBar parts={z.map((s, i) => ({ label: `Zona ${i + 1}: ${dur(s)}`, value: s, color: `var(--z${i + 1})` }))} />
        <table style={{ marginTop: 14 }}>
          <tbody>
            {z.map((s, i) => (
              <tr key={i}>
                <td><Badge label={`Z${i + 1} · ${NAMES[i]}`} dot={`var(--z${i + 1})`} /></td>
                <td className="num">{dur(s)}</td><td className="num muted">{nf((s / tot) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note-box" style={{ marginTop: 10 }}>Regla 80/20: idealmente ~80% del tiempo en Z1–Z2. Tú: <b>{nf(((z[0] + z[1]) / tot) * 100)}%</b>.</p>
      </Card>
    </div>
  );
}
