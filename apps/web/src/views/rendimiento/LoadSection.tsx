"use client";

import type { DayRecord, Training } from "@pulso/shared";
import { ChartBox } from "@/components/charts/ChartBox";
import { band, bars, line, opts } from "@/components/charts/options";
import { alpha, css, toneColor } from "@/components/charts/setup";
import { Card, Legend } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { nf, shortDate } from "@/lib/format";
import { BALANCE } from "@/lib/labels";
import { recoveryStatus, strainLabel } from "@/lib/status";

/** Carga aguda vs crónica y enfoque de carga de 4 semanas. */
export function LoadSection({ days, t }: { days: DayRecord[]; t: Training }) {
  const labels = days.map((x) => shortDate(x.date));
  const T = (k: "acute" | "chronic") => days.map((x) => x.training[k] ?? x.training[`${k}Est`] ?? null);
  const focus: [string, number | null | undefined, (number | null)[] | undefined, string][] = [
    ["Anaeróbico", t.loadAnaerobic, t.targetAnaerobic, "--series-7"],
    ["Aeróbico alto", t.loadHighAerobic, t.targetHighAerobic, "--series-2"],
    ["Aeróbico bajo", t.loadLowAerobic, t.targetLowAerobic, "--series-1"],
  ];
  const fmax = Math.max(1, ...focus.flatMap(([, v, tg]) => [v ?? 0, ...(tg ?? []).map((x) => x ?? 0)])) * 1.1;
  return (
    <div className="grid g3">
      <Card className="span2" title={<>Carga aguda vs crónica <Info k="acwr" /></>} sub={`${days.length} días`}>
        <ChartBox size="tall" data={{ labels, datasets: [
          ...band(days.map((x) => x.training.chronicMin ?? null), days.map((x) => x.training.chronicMax ?? null), alpha(css("--series-3"), 0.16)),
          line("Carga aguda", T("acute"), css("--series-1")), line("Carga crónica", T("chronic"), css("--series-2")),
        ] }} options={opts({ yMin: 0 })} />
        <Legend items={[["Carga aguda (7 d)", css("--series-1")], ["Carga crónica (28 d)", css("--series-2")], ["Rango óptimo", alpha(css("--series-3"), 0.35)]]} />
      </Card>
      <Card title={<>Enfoque de carga (4 semanas) <Info k="load_focus" /></>}>
        {focus.map(([name, v, tg, color]) => (
          <div className="focus-row" key={name}>
            <span>{name}</span>
            <div className="focus-track">
              {tg?.[0] != null && tg[1] != null ? <div className="target" style={{ left: `${(tg[0] / fmax) * 100}%`, width: `${((tg[1] - tg[0]) / fmax) * 100}%` }} /> : null}
              <div className="fill" style={{ width: `${((v ?? 0) / fmax) * 100}%`, background: `var(${color})` }} />
            </div>
            <span className="num">{nf(v)}</span>
          </div>
        ))}
        <p className="note-box">El recuadro marca el rango objetivo de Garmin para cada tipo de carga.{t.balancePhrase ? <> Balance: <b>{BALANCE[t.balancePhrase] ?? t.balancePhrase.toLowerCase()}</b>.</> : null}</p>
      </Card>
    </div>
  );
}

/** Esfuerzo diario frente al objetivo y recuperación diaria. */
export function StrainSection({ days }: { days: DayRecord[] }) {
  const labels = days.map((x) => shortDate(x.date));
  const target = (i: 0 | 1) => days.map((x) => x.indices.strainTarget[i]);
  return (
    <div className="grid g2">
      <Card title={<>Esfuerzo diario y objetivo <Info k="esfuerzo" /></>} sub="0–21">
        <ChartBox type="bar" size="tall" data={{ labels, datasets: [
          line("_obj_hi", target(1), "transparent", { fill: "+1", backgroundColor: alpha(css("--series-3"), 0.18), tension: 0, stepped: "middle", pointHoverRadius: 0 }),
          line("_obj_lo", target(0), "transparent", { tension: 0, stepped: "middle", pointHoverRadius: 0 }),
          bars("Esfuerzo", days.map((x) => x.indices.strain), css("--series-1")),
        ] }} options={opts({ yMin: 0, yMax: 21, tip: (c) => ` Esfuerzo ${nf(c.raw as number, 1)} (${strainLabel(c.raw as number)}) · objetivo ${days[c.dataIndex].indices.strainTarget.join("–")}` })} />
        <Legend items={[["Esfuerzo", css("--series-1")], ["Objetivo según recuperación", alpha(css("--series-3"), 0.35)]]} />
      </Card>
      <Card title={<>Recuperación diaria <Info k="recuperacion" /></>} sub="%">
        <ChartBox type="bar" size="tall" data={{ labels, datasets: [
          bars("Recuperación", days.map((x) => x.indices.recovery), days.map((x) => toneColor(recoveryStatus(x.indices.recovery)[1]))),
        ] }} options={opts({ yMin: 0, yMax: 100, tip: (c) => ` ${c.raw}% · ${recoveryStatus(c.raw as number)[0]}` })} />
        <Legend items={[["Verde", toneColor("good")], ["Amarillo", toneColor("warning")], ["Rojo", toneColor("critical")]]} />
      </Card>
    </div>
  );
}
