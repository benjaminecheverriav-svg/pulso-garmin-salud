"use client";

import { Section, Tile } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { ViewHead } from "@/components/ui/Stories";
import { nf } from "@/lib/format";
import { useDash } from "@/store/DashboardContext";
import { Le8Section } from "./Le8Section";
import { RiskCard } from "./RiskCard";
import { VitalsCharts } from "./VitalsCharts";

export function SaludView() {
  const { data, idx } = useDash();
  const h = data!.health;
  const f = h.fitness, v = h.vitals;
  const days = data!.days.slice(Math.max(0, idx - 89), idx + 1);
  return (
    <>
      <ViewHead title="Salud y prevención" subtitle="Señales de tu reloj y de tu perfil que, en conjunto, indican qué vigilar." />
      <div className="card disclaimer">
        ⚕️ <b>Esto no es un diagnóstico.</b> Son indicadores orientativos basados en factores de riesgo reconocidos (American Heart Association, OMS, guías de hipertensión y sueño). Un reloj no mide presión, colesterol ni glucosa, ni detecta arritmias por sí solo. Ante síntomas o valores preocupantes, consulta a tu médico.
      </div>
      {h.alerts.map((a) => <div key={a.title} className={`card alert ${a.level}`}><b>{a.title}</b><p>{a.text}</p></div>)}

      <Section title={<>Tu salud cardiovascular <Info k="le8" /></>} tag="AHA Life's Essential 8" />
      <Le8Section le={h.le8} />

      <Section title="Indicadores de riesgo" />
      <div className="grid g2">{h.risks.map((r) => <RiskCard key={r.id} r={r} />)}</div>

      <Section title="Tu forma física como protección" />
      <div className="grid g4">
        <Tile label={<>VO2 máx. <Info k="vo2max" /></>} value={nf(f.vo2max, 1)} note={f.vo2Category ? `${f.vo2Category} para tu edad y sexo` : "Sin estimación"} />
        <Tile label={<>FC en reposo (30 d) <Info k="rhr" /></>} value={nf(v.rhr30)} unit="ppm" note={v.rhrBase ? `Base previa ${nf(v.rhrBase)}` : ""} />
        <Tile label={<>VFC nocturna (30 d) <Info k="hrv" /></>} value={nf(v.hrv30)} unit="ms" note={`Referencia para tu edad ≈ ${f.hrvNorm} ms`} />
        <Tile label="Presión arterial" value={f.bp ? `${f.bp.sys}/${f.bp.dia}` : "—"} unit="mmHg" note={f.bp ? f.bp.source : "Regístrala en Garmin Connect o en tu Perfil"} />
      </div>

      <Section title="Tendencias de tus signos vitales" tag="90 días" />
      <VitalsCharts days={days} h={h} />
    </>
  );
}
