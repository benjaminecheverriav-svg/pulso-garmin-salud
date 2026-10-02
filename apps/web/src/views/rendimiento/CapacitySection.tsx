"use client";

import type { DayRecord, Performance, Training } from "@pulso/shared";
import { ChartBox } from "@/components/charts/ChartBox";
import { line, opts } from "@/components/charts/options";
import { css } from "@/components/charts/setup";
import { Card, KeyValues, Section, Tile } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { nf, pace, raceTime, shortDate } from "@/lib/format";

const CLASS = ["", "Recreativo", "Intermedio", "Entrenado", "Bien entrenado", "Experto", "Superior", "Élite"];

/** VO2 máx., resistencia, umbral, colinas y predicciones de carrera. */
export function CapacitySection({ days, perf, t }: { days: DayRecord[]; perf: Performance; t: Training }) {
  const labels = days.map((x) => shortDate(x.date));
  const eh = perf.endurance.history;
  const lt = perf.lactate, hs = perf.hill, race = perf.race;
  const raceTile = (name: string, secs: number | null, km: number) => (
    <Tile key={name} label={name} value={raceTime(secs)} note={secs ? pace((km * 1000) / secs) : "Sin predicción"} />
  );
  return (
    <>
      <Section title="Capacidad aeróbica" />
      <div className="grid g3">
        <Card title={<>VO2 máx. <Info k="vo2max" /></>} sub="ml/kg/min">
          <ChartBox data={{ labels, datasets: [line("VO2 máx.", days.map((x) => x.training.vo2max ?? null), css("--series-1"), { stepped: true, tension: 0 })] }}
            options={opts({ tip: (c) => ` ${nf(c.raw as number, 1)} ml/kg/min` })} />
        </Card>
        <Card title={<>Puntuación de resistencia <Info k="endurance" /></>}>
          <div className="tile"><div className="value">{nf(perf.endurance.score)}</div><div className="note">{CLASS[perf.endurance.classification ?? 0] ?? ""}</div></div>
          <ChartBox size="short" data={{ labels: eh.map((e) => shortDate(e[0])), datasets: [line("Resistencia", eh.map((e) => e[1]), css("--series-3"))] }} options={opts()} />
        </Card>
        <Card title={<>Umbral y colinas <Info k="lactate" /></>}>
          <KeyValues rows={[
            ["FC umbral de lactato", `${nf(lt.hr)} ppm`], ["Ritmo umbral", pace(lt.speedMs)], ["Potencia umbral (carrera)", `${nf(lt.ftp)} W`],
            ["Puntuación de colinas", nf(hs.score)], ["· Fuerza / Resistencia", `${nf(hs.strength)} / ${nf(hs.endurance)}`],
            ["Aclimatación al calor", `${nf(t.heatAcclimation)} %`], ["Aclimatación a la altitud", t.altitudeAcclimation ? `${nf(t.altitudeAcclimation)} m` : "—"],
          ]} />
        </Card>
      </div>
      <Section title={<>Predicciones de carrera <Info k="race" /></>} tag="Garmin" />
      <div className="grid g4">
        {raceTile("5 K", race["5k"], 5)}{raceTile("10 K", race["10k"], 10)}{raceTile("Media maratón", race.half, 21.0975)}{raceTile("Maratón", race.marathon, 42.195)}
      </div>
    </>
  );
}
