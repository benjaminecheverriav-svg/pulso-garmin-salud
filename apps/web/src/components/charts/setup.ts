import {
  BarController, BarElement, CategoryScale, Chart, Filler, LinearScale, LineController, LineElement,
  PointElement, ScatterController, Tooltip, type Plugin,
} from "chart.js";

/** Lee una variable CSS del tema actual (solo en el navegador). */
export const css = (name: string): string =>
  typeof window === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Color real (hex) de un estado para el canvas, que no entiende variables CSS. */
export const toneColor = (tone: string | null | undefined): string => css(tone ? `--${tone}` : "--text-muted");

export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Línea vertical guía al pasar el cursor por un gráfico de líneas. */
const crosshair: Plugin = {
  id: "crosshair",
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length || (chart.config as { type?: string }).type !== "line") return;
    const x = active[0].element.x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = css("--text-muted");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

let registered = false;

export function setupCharts(): void {
  if (!registered) {
    Chart.register(LineController, BarController, ScatterController, LineElement, BarElement, PointElement,
      LinearScale, CategoryScale, Filler, Tooltip, crosshair);
    registered = true;
  }
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = css("--text-muted");
  Chart.defaults.borderColor = css("--grid");
}
