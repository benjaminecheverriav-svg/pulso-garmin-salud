import type { ChartDataset, ChartOptions, TooltipItem } from "chart.js";
import { css } from "./setup";

/* Los genéricos de Chart.js no admiten bien gráficos mixtos (barras + líneas):
   usamos tipos amplios solo dentro de este módulo de gráficos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dataset = ChartDataset<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Options = ChartOptions<any>;

type Fmt = (v: number) => string;
type Tip = (c: TooltipItem<"line">) => string;

interface OptsInput { yMin?: number; yMax?: number; stacked?: boolean; yFmt?: Fmt; tip?: Tip; yStep?: number; reverse?: boolean }

/** Opciones comunes: rejilla discreta, tooltip del tema y series ocultas con prefijo "_". */
export function opts({ yMin, yMax, stacked = false, yFmt, tip, yStep, reverse }: OptsInput = {}): Options {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: css("--surface-2"), borderColor: css("--border"), borderWidth: 1,
        titleColor: css("--text-primary"), bodyColor: css("--text-secondary"),
        padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
        filter: (i: TooltipItem<"line">) => !String(i.dataset.label ?? "").startsWith("_") && i.raw != null,
        callbacks: tip ? { label: tip } : {},
      },
    },
    scales: {
      x: { stacked, grid: { display: false }, border: { color: css("--grid") }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
      y: {
        stacked, min: yMin, max: yMax, reverse, grid: { color: css("--grid") }, border: { display: false },
        ticks: { maxTicksLimit: yStep ? 12 : 5, stepSize: yStep, callback: yFmt ? (v: number | string) => yFmt(Number(v)) : undefined },
      },
    },
  };
}

type Data = (number | null)[];

export const line = (label: string, data: Data, color: string, extra: Partial<ChartDataset<"line">> = {}): Dataset => ({
  type: "line", label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
  pointHoverBorderWidth: 2, pointHoverBorderColor: css("--surface-1"), tension: 0.3, spanGaps: true, ...extra,
});

export const bars = (label: string, data: Data, color: string | string[], extra: Partial<ChartDataset<"bar">> = {}): Dataset => ({
  type: "bar", label, data, backgroundColor: color, borderRadius: 4, borderSkipped: "start", maxBarThickness: 22,
  categoryPercentage: 0.85, barPercentage: 0.9, ...extra,
});

/** Segmento de barra apilada con 2 px de separación del color de la superficie. */
export const stackBars = (label: string, data: Data, color: string): Dataset =>
  bars(label, data, color, { borderRadius: 2, borderSkipped: false, borderColor: css("--surface-1"), borderWidth: { top: 2, bottom: 0, left: 0, right: 0 } });

/** Banda sombreada entre dos series (rango de referencia). */
export const band = (lo: Data, hi: Data, color: string): Dataset[] => [
  line("_hi", hi, "transparent", { fill: "+1", backgroundColor: color, pointHoverRadius: 0 }),
  line("_lo", lo, "transparent", { pointHoverRadius: 0 }),
];
