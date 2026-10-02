"use client";

import { useEffect, useState } from "react";
import { Chart } from "react-chartjs-2";
import { useDash } from "@/store/DashboardContext";
import type { Dataset, Options } from "./options";
import { setupCharts } from "./setup";

type Size = "" | "tall" | "short" | "mini";

/** Contenedor de gráfico: se dibuja solo en el navegador y se redibuja al cambiar de tema. */
export function ChartBox({ type = "line", data, options, size = "" }: {
  type?: "line" | "bar" | "scatter";
  data: { labels?: (string | number)[]; datasets: Dataset[] };
  options: Options;
  size?: Size;
}) {
  const { theme } = useDash();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setupCharts();
    setReady(true);
  }, [theme]);
  return (
    <div className={`chart-box ${size}`}>
      {ready ? <Chart key={theme} type={type} data={data} options={options} /> : null}
    </div>
  );
}
