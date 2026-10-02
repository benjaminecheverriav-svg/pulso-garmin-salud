"use client";

import type { ActivitySeries } from "@pulso/shared";
import { ChartBox } from "@/components/charts/ChartBox";
import { line, opts } from "@/components/charts/options";
import { css } from "@/components/charts/setup";
import { nf, pad } from "@/lib/format";

const minPace = (v: number) => `${Math.floor(v)}:${pad(Math.round((v % 1) * 60))}`;

/** Pulso y ritmo (o velocidad) a lo largo de la sesión. */
export function DetailCharts({ series, run }: { series: ActivitySeries; run: boolean }) {
  const labels = series.t.map((t) => `${Math.floor((t ?? 0) / 60)}'`);
  const speed = (series.speed ?? []).map((v) => (v && v > 0.5 ? (run ? +(1000 / v / 60).toFixed(2) : +(v * 3.6).toFixed(1)) : null));
  const hasSpeed = speed.some((v) => v !== null);
  const paceOpts = opts({ reverse: run, yFmt: run ? minPace : undefined, tip: (c) => ` ${run ? `${minPace(c.raw as number)} /km` : `${nf(c.raw as number, 1)} km/h`}` });
  return (
    <div className={`grid ${hasSpeed ? "g2" : ""}`} style={{ marginTop: 10 }}>
      <div>
        <h3>Pulso</h3>
        <ChartBox size="short" data={{ labels, datasets: [line("Pulso", series.hr ?? [], css("--series-2"), { tension: 0.25 })] }}
          options={opts({ tip: (c) => ` ${nf(c.raw as number)} ppm` })} />
      </div>
      {hasSpeed ? (
        <div>
          <h3>{run ? "Ritmo" : "Velocidad"}</h3>
          <ChartBox size="short" data={{ labels, datasets: [line(run ? "Ritmo" : "Velocidad", speed, css("--series-1"), { tension: 0.25 })] }} options={paceOpts} />
        </div>
      ) : null}
    </div>
  );
}
