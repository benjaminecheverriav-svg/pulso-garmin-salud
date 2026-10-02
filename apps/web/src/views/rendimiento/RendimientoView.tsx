"use client";

import { Badge, Section, Tile } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { Stories, ViewHead } from "@/components/ui/Stories";
import { nf } from "@/lib/format";
import { ACWR_ST, trainingStatus } from "@/lib/labels";
import { useDash, useDays } from "@/store/DashboardContext";
import { CapacitySection } from "./CapacitySection";
import { LoadSection, StrainSection } from "./LoadSection";
import { ZonesSection } from "./ZonesSection";

export function RendimientoView() {
  const { data } = useDash();
  const { day: d, days, all } = useDays();
  const t = d.training;
  const lastWith = <T,>(fn: (x: typeof d) => T | null | undefined): T | null => {
    for (let i = all.indexOf(d); i >= 0; i--) { const v = fn(all[i]); if (v != null) return v; }
    return null;
  };
  const ts = trainingStatus(t.statusPhrase ?? lastWith((x) => x.training.statusPhrase));
  const vo2 = t.vo2max ?? lastWith((x) => x.training.vo2max);
  const vo2c = t.vo2maxCycling ?? lastWith((x) => x.training.vo2maxCycling);
  const acute = t.acute ?? t.acuteEst, chronic = t.chronic ?? t.chronicEst;
  const acwr = t.acwr ?? (acute && chronic ? acute / chronic : null);
  const acwrS = ACWR_ST[t.acwrStatus ?? ""] ?? (acwr == null ? ["—", ""] : acwr > 1.5 ? ACWR_ST.VERY_HIGH : acwr > 1.3 ? ACWR_ST.HIGH : acwr < 0.8 ? ACWR_ST.LOW : ACWR_ST.OPTIMAL);
  const fa = data!.performance.fitnessAge;
  return (
    <>
      <ViewHead title="Rendimiento deportivo" subtitle="Estado de entrenamiento, capacidad aeróbica y predicciones." />
      <Stories section="esfuerzo" />
      <div className="grid g4">
        <Tile label={<>Estado de entrenamiento <Info k="training_status" /></>} value={ts?.[0] ?? "—"} note={ts?.[2]} />
        <Tile label={<>VO2 máx. carrera <Info k="vo2max" /></>} value={nf(vo2, 1)} unit="ml/kg/min" note={vo2c ? `Ciclismo: ${nf(vo2c, 1)}` : ""} />
        <Tile label={<>Edad física <Info k="fitness_age" /></>} value={nf(fa.fitnessAge)} unit="años"
          note={fa.chronological ? `Edad real ${fa.chronological}${fa.achievable ? ` · alcanzable ${fa.achievable}` : ""}` : ""} />
        <Tile label={<>Ratio de carga aguda <Info k="acwr" /></>} value={nf(acwr, 2)} note={<Badge label={acwrS[0]} tone={acwrS[1]} />}>
          <div className="note">{acute ? `Aguda ${nf(acute)} · Crónica ${nf(chronic)}` : "Se calcula tras 3 semanas de entrenamientos."}</div>
        </Tile>
      </div>

      <Section title="Carga de entrenamiento" tag="Garmin" />
      <LoadSection days={days} t={t} />

      <Section title="Esfuerzo y recuperación" />
      <StrainSection days={days} />

      <CapacitySection days={days} perf={data!.performance} t={t} />

      <Section title={<>Intensidad por zonas de FC <Info k="zones" /></>} tag={`${days.length} días`} />
      <ZonesSection days={days} />
    </>
  );
}
