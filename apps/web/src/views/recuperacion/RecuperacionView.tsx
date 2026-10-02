"use client";

import { Badge, Section, Tile } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { Stories, ViewHead } from "@/components/ui/Stories";
import { cap, longDate, nf } from "@/lib/format";
import { HRV_ST } from "@/lib/labels";
import { useDays } from "@/store/DashboardContext";
import { EnergyStress } from "./EnergyStress";
import { RecoveryCharts } from "./RecoveryCharts";
import { RecoveryTop } from "./RecoveryTop";

export function RecuperacionView() {
  const { day: d, days } = useDays();
  const hrv = d.hrv;
  const [hrvLbl, hrvTone] = HRV_ST[hrv.status ?? ""] ?? ["—", ""];
  return (
    <>
      <ViewHead title="Recuperación" subtitle={cap(longDate(d.date))} />
      <Stories section="recuperacion" />
      <RecoveryTop d={d} />

      <Section title={<>Variabilidad de la frecuencia cardiaca <Info k="hrv" /></>} tag="VFC / HRV" />
      <div className="grid g4">
        <Tile label="Media nocturna" value={nf(hrv.lastNight)} unit="ms" note="Anoche" />
        <Tile label="Media 7 días" value={nf(hrv.weeklyAvg)} unit="ms" note={<Badge label={hrvLbl} tone={hrvTone} />} />
        <Tile label="Rango de referencia" value={`${nf(hrv.baselineLow)}–${nf(hrv.baselineHigh)}`} unit="ms" note="Tu línea base equilibrada" />
        <Tile label="Máximo 5 min" value={nf(hrv.high5min)} unit="ms" note="Pico nocturno" />
      </div>
      <RecoveryCharts days={days} />

      <Section title="Body Battery y estrés" />
      <EnergyStress d={d} days={days} />
    </>
  );
}
