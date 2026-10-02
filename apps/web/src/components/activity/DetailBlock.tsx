"use client";

import type { Activity } from "@pulso/shared";
import { Info } from "@/components/ui/Info";
import { nf, pace, raceTime } from "@/lib/format";
import { actGroup } from "@/lib/labels";
import { DetailCharts } from "./DetailCharts";

/** Parciales, gráficos de pulso/ritmo, clima y series de fuerza de una sesión. */
export function DetailBlock({ a, open }: { a: Activity; open: boolean }) {
  const d = a.detail ?? {};
  const run = actGroup(a.type) === "running";
  if (!d.laps && !d.series && !d.weather && !d.sets) return null;
  const chips: string[] = [];
  if (d.weather?.tempC != null) chips.push(`${nf(d.weather.tempC)} °C${d.weather.humidity ? ` · ${d.weather.humidity}% hum.` : ""}${d.weather.desc ? ` · ${d.weather.desc}` : ""}`);
  if (d.decoupling != null) chips.push(`Desacople aeróbico ${nf(d.decoupling, 1)}%`);
  if (d.splitDiff != null && run) chips.push(d.splitDiff > 1 ? `Parcial negativo (+${nf(d.splitDiff)}%)` : d.splitDiff < -1 ? `Parcial positivo (${nf(d.splitDiff)}%)` : "Ritmo parejo");
  const laps = actGroup(a.type) === "strength" || !(d.laps ?? []).some((l) => (l.distM ?? 0) > 0) ? [] : (d.laps ?? []).slice(0, 30);
  return (
    <div className="detail">
      {chips.length ? <div className="chips">{chips.map((c) => <span className="chip-s" key={c}>{c}</span>)}<Info k="decoupling" /></div> : null}
      {open && d.series ? <DetailCharts series={d.series} run={run} /> : null}
      {laps.length ? (
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table className="laps">
            <thead><tr><th>Parcial</th><th>Distancia</th><th>Tiempo</th><th>{run ? "Ritmo" : "Velocidad"}</th><th>FC</th><th>Desnivel +</th></tr></thead>
            <tbody>
              {laps.map((l) => (
                <tr key={l.n}>
                  <td>{l.n}</td><td className="num">{l.distM ? `${nf(l.distM / 1000, 2)} km` : "—"}</td><td className="num">{raceTime(l.durS)}</td>
                  <td className="num">{l.speed ? (run ? pace(l.speed) : `${nf(l.speed * 3.6, 1)} km/h`) : "—"}</td>
                  <td className="num">{nf(l.hr)}</td><td className="num">{l.elevGain != null ? `${nf(l.elevGain)} m` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {d.sets ? (
        <table className="laps" style={{ marginTop: 10 }}>
          <thead><tr><th>Ejercicio</th><th>Series</th><th>Reps</th><th>Máx. kg</th></tr></thead>
          <tbody>
            {d.sets.map((x) => (
              <tr key={x.name}><td>{x.name}</td><td className="num">{x.sets}</td><td className="num">{x.reps}</td><td className="num">{x.maxKg ? nf(x.maxKg, 1) : "—"}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
