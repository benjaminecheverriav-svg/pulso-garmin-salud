"use client";

import { ChartBox } from "@/components/charts/ChartBox";
import { bars, line, opts } from "@/components/charts/options";
import { alpha, css, toneColor } from "@/components/charts/setup";
import { Badge, Card, Progress, Section, Tile } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { inline } from "@/components/ui/RichText";
import { Ring, RingCard } from "@/components/ui/Ring";
import { Stories, ViewHead } from "@/components/ui/Stories";
import { cap, clock, hm, longDate, nf, sum, weekdayShort } from "@/lib/format";
import { HRV_ST, QUAL, QUAL_ST, READY, READY_ST } from "@/lib/labels";
import { recoveryStatus, strainLabel, stressWord, toneVar } from "@/lib/status";
import { useDash, useDays } from "@/store/DashboardContext";
import { CoachTeaser, Onboarding } from "./HomeCards";
import { insights } from "./insights";

export function HoyView() {
  const { idx } = useDash();
  const { day: d, all } = useDays();
  const w = d.indices, s = d.sleep, r = d.readiness, bb = d.bodyBattery, hrv = d.hrv;
  const [recLbl, recSt] = recoveryStatus(w.recovery);
  const days7 = all.slice(Math.max(0, idx - 6), idx + 1);
  const weekIntensity = sum(days7.map((x) => (x.daily.intensityModerate ?? 0) + 2 * (x.daily.intensityVigorous ?? 0)));
  const goal = d.daily.intensityGoalWeek || 150;
  const [hrvLbl, hrvTone] = HRV_ST[hrv.status ?? ""] ?? ["—", ""];
  const labels = days7.map((x) => weekdayShort(x.date));
  return (
    <>
      <ViewHead title={cap(longDate(d.date))} subtitle="Lo esencial de tu día, explicado." />
      <Onboarding />
      <Stories section="hoy" />
      <CoachTeaser />

      <Section title="Tus índices del día" tag="calculados por Pulso con tus datos Garmin" />
      <div className="rings">
        <RingCard ring={<Ring value={w.recovery} max={100} color={toneVar(recSt)} big={w.recovery == null ? "—" : `${w.recovery}%`} unit="Recuperación" />}
          title={<>Recuperación <Info k="recuperacion" /> <Badge label={recLbl} tone={recSt} /></>}
          caption={w.contributors.hrv ? `VFC ${w.contributors.hrv.value} ms (base ${w.contributors.hrv.baseline})` : "Hacen falta al menos 4 noches con VFC para calcular tu línea base."} />
        <RingCard ring={<Ring value={w.strain} max={21} color={css("--series-1")} big={nf(w.strain, 1)} unit="Esfuerzo" />}
          title={<>Esfuerzo <Info k="esfuerzo" /> · {strainLabel(w.strain)}</>}
          caption={<>Objetivo según tu recuperación: <b>{w.strainTarget[0]}–{w.strainTarget[1]}</b> de 21. {d.activities.length ? `${d.activities.length} actividad(es) hoy.` : "Sin entrenamientos registrados."}</>} />
        <RingCard ring={<Ring value={w.sleepPerformance} max={100} color={css("--series-7")} big={w.sleepPerformance == null ? "—" : `${w.sleepPerformance}%`} unit="Sueño" />}
          title={<>Rendimiento del sueño <Info k="sueno_rend" /></>}
          caption={`Dormiste ${hm(s.totalS)} h de ${hm(w.sleepNeedMin * 60)} h necesarias.${w.sleepDebtMin > 15 ? ` Deuda: ${w.sleepDebtMin} min.` : ""}`} />
      </div>

      <Section title="Mi día" tag="Garmin" />
      <div className="grid g4">
        <Tile label={<>Disposición para entrenar <Info k="readiness" /></>} value={nf(r.score)}
          note={r.level ? <Badge label={READY[r.level] ?? r.level} tone={READY_ST[r.level]} /> : "Sin datos"} />
        <Tile label={<>Body Battery <Info k="body_battery" /></>} value={nf(bb.current)} note={`Al despertar ${nf(bb.atWake)} · Máx. ${nf(bb.high)} · Mín. ${nf(bb.low)}`}>
          {bb.series?.length ? (
            <ChartBox size="mini" data={{ labels: bb.series.map((p) => clock(p[0])), datasets: [line("Body Battery", bb.series.map((p) => p[1]), css("--series-1"), { fill: true, backgroundColor: alpha(css("--series-1"), 0.15) })] }}
              options={{ ...opts(), scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } }} />
          ) : null}
        </Tile>
        <Tile label={<>Puntuación de sueño <Info k="sleep_score" /></>} value={nf(s.score)}
          note={s.qualifier ? <Badge label={QUAL[s.qualifier] ?? s.qualifier} tone={QUAL_ST[s.qualifier]} /> : "Sin datos"} />
        <Tile label={<>Estado de VFC <Info k="hrv" /></>} value={nf(hrv.lastNight)} unit="ms" note={<><Badge label={hrvLbl} tone={hrvTone} /> Media 7 d: {nf(hrv.weeklyAvg)} ms</>} />
      </div>
      <div className="grid g6 mt">
        <Tile label={<>FC en reposo <Info k="rhr" /></>} value={nf(d.heart.rhr)} unit="ppm" note={`Media 7 d: ${nf(d.heart.rhr7d)}`} />
        <Tile label={<>Estrés medio <Info k="stress" /></>} value={nf(d.stress.avg)} note={stressWord(d.stress.avg)} />
        <Tile label={<>Pasos <Info k="steps" /></>} value={nf(d.daily.steps)} note={`Meta ${nf(d.daily.stepGoal)}`}><Progress value={d.daily.steps} max={d.daily.stepGoal} /></Tile>
        <Tile label={<>Min. intensidad (7 d) <Info k="intensity" /></>} value={nf(weekIntensity)} note={`Meta semanal ${goal}`}><Progress value={weekIntensity} max={goal} /></Tile>
        <Tile label="Calorías" value={nf(d.daily.kcalTotal)} unit="kcal" note={`Activas ${nf(d.daily.kcalActive)}`} />
        <Tile label={<>SpO₂ nocturno <Info k="spo2" /></>} value={nf(d.spo2.avg)} unit="%" note={`Respiración ${nf(d.respiration.sleep, 1)} rpm`} />
      </div>

      <Section title="Recomendaciones" />
      <div>
        {insights(d, days7).map(([tone, txt]) => (
          <div className="card insight" key={txt}><span className="dot" style={{ background: toneVar(tone) }} /><div>{inline(txt)}</div></div>
        ))}
      </div>

      <Section title="Últimos 7 días" />
      <div className="grid g2">
        <Card title={<>Recuperación <Info k="recuperacion" /></>} sub="%">
          <ChartBox type="bar" size="short" data={{ labels, datasets: [bars("Recuperación", days7.map((x) => x.indices.recovery), days7.map((x) => toneColor(recoveryStatus(x.indices.recovery)[1])))] }}
            options={opts({ yMin: 0, yMax: 100, tip: (c) => ` ${c.raw}% · ${recoveryStatus(c.raw as number)[0]}` })} />
        </Card>
        <Card title={<>Esfuerzo <Info k="esfuerzo" /></>} sub="0–21">
          <ChartBox type="bar" size="short" data={{ labels, datasets: [bars("Esfuerzo", days7.map((x) => x.indices.strain), css("--series-1"))] }}
            options={opts({ yMin: 0, yMax: 21, tip: (c) => ` ${nf(c.raw as number, 1)} · ${strainLabel(c.raw as number)}` })} />
        </Card>
      </div>
    </>
  );
}
