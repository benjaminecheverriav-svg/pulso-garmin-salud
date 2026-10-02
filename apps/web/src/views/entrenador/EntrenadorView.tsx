"use client";

import { ActivityCard } from "@/components/activity/ActivityCard";
import { ChartBox } from "@/components/charts/ChartBox";
import { bars, opts } from "@/components/charts/options";
import { toneColor } from "@/components/charts/setup";
import { Card, Empty, Section } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { ViewHead } from "@/components/ui/Stories";
import { nf, shortDate } from "@/lib/format";
import { scoreTone } from "@/lib/status";
import { useDash, useDays } from "@/store/DashboardContext";
import { ChatPanel } from "./ChatPanel";
import { TodayAndGoal, WeekPlanCard, ZonesCards } from "./PlanCards";
import { WeekReviewCard } from "./WeekReviewCard";

export function EntrenadorView() {
  const { data } = useDash();
  const { days, all } = useDays();
  const coach = data!.coach;
  const acts = days.flatMap((d) => d.activities.map((a) => ({ a, date: d.date })));
  const recent = all.flatMap((d) => d.activities.map((a) => ({ a, date: d.date }))).reverse().slice(0, 6);
  return (
    <>
      <ViewHead title="Entrenador personal" subtitle="Evalúa tus sesiones, revisa tu semana y te dice qué hacer, según tu recuperación y tu objetivo." />
      <TodayAndGoal coach={coach} />

      <Section title="Plan de los próximos 7 días" />
      <WeekPlanCard coach={coach} />

      <Section title={<>Tus zonas personales <Info k="zones" /></>} />
      <ZonesCards coach={coach} />

      <Section title="Revisión de la semana" tag="últimos 7 días" />
      <WeekReviewCard week={coach.week} />

      <Section title="Notas de tus sesiones" tag={`${days.length} días`} />
      <Card>
        {acts.length ? (
          <ChartBox type="bar" data={{
            labels: acts.map((x) => shortDate(x.date)),
            datasets: [bars("Nota", acts.map((x) => x.a.coach?.score ?? null), acts.map((x) => toneColor(scoreTone(x.a.coach?.score ?? 0))))],
          }} options={opts({ yMin: 0, yMax: 10, tip: (c) => ` ${acts[c.dataIndex].a.name}: ${nf(c.raw as number, 1)}/10 · ${acts[c.dataIndex].a.coach?.grade}` })} />
        ) : <p className="muted">Aún no hay sesiones en este rango.</p>}
      </Card>

      <Section title="Últimas sesiones evaluadas" />
      {recent.length ? recent.map(({ a, date }) => <ActivityCard key={`${date}-${a.id}`} a={a} date={date} compact />) : <Empty>Registra un entrenamiento con el reloj para recibir tu primera evaluación.</Empty>}

      <Section title="Pregúntale a tu entrenador" tag="IA" />
      <ChatPanel />
    </>
  );
}
