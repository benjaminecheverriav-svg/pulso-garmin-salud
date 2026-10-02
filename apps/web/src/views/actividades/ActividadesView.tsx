"use client";

import { useState } from "react";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { ChartBox } from "@/components/charts/ChartBox";
import { opts, stackBars } from "@/components/charts/options";
import { css } from "@/components/charts/setup";
import { Card, Empty, Legend, Section, Tile } from "@/components/ui/basics";
import { ViewHead } from "@/components/ui/Stories";
import { hm, mondayOf, nf, shortDate, sum } from "@/lib/format";
import { actGroup, GROUPS, type Group } from "@/lib/labels";
import { useDays } from "@/store/DashboardContext";

export function ActividadesView() {
  const { day, days } = useDays();
  const [filter, setFilter] = useState<Group | "all">("all");
  const all = days.flatMap((d) => d.activities.map((a) => ({ a, date: d.date }))).reverse();
  const list = filter === "all" ? all : all.filter((x) => actGroup(x.a.type) === filter);
  const present = GROUPS.filter(([g]) => all.some((x) => actGroup(x.a.type) === g));

  const weeks = new Map<string, Partial<Record<Group, number>>>();
  for (const d of days) {
    const w = weeks.get(mondayOf(d.date)) ?? {};
    for (const a of d.activities) w[actGroup(a.type)] = (w[actGroup(a.type)] ?? 0) + (a.durationS ?? 0) / 3600;
    weeks.set(mondayOf(d.date), w);
  }
  const keys = [...weeks.keys()].sort();
  return (
    <>
      <ViewHead title="Actividades" subtitle={`Últimos ${days.length} días hasta el ${shortDate(day.date)}. Abre «Evaluación» en cada sesión para ver el análisis del entrenador.`} />
      <div className="grid g4">
        <Tile label="Actividades" value={nf(list.length)} />
        <Tile label="Tiempo total" value={hm(sum(list.map((x) => x.a.durationS)))} unit="h" />
        <Tile label="Distancia" value={nf(sum(list.map((x) => x.a.distanceM)) / 1000, 1)} unit="km" />
        <Tile label="Carga total" value={nf(sum(list.map((x) => x.a.load)))} note="Carga de entrenamiento Garmin" />
      </div>
      <Section title="Volumen semanal" />
      <Card>
        <ChartBox type="bar" data={{
          labels: keys.map((k) => `Sem. ${shortDate(k)}`),
          datasets: present.map(([g, n, c]) => stackBars(n, keys.map((k) => +(weeks.get(k)![g] ?? 0).toFixed(2)), css(c))),
        }} options={opts({ stacked: true, yFmt: (v) => `${v} h`, tip: (c) => ` ${c.dataset.label}: ${hm((c.raw as number) * 3600)} h` })} />
        <Legend items={present.map(([, n, c]) => [n, css(c)])} />
      </Card>
      <Section title="Historial" />
      <div className="filters">
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>Todas</button>
        {present.map(([g, n]) => <button key={g} className={filter === g ? "on" : ""} onClick={() => setFilter(g)}>{n}</button>)}
      </div>
      {list.length ? list.map(({ a, date }) => <ActivityCard key={`${date}-${a.id}`} a={a} date={date} />) : <Empty>No hay actividades en este rango.</Empty>}
    </>
  );
}
