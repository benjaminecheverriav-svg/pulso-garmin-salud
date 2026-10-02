"use client";

import type { StorySection } from "@pulso/shared";
import type { ReactNode } from "react";
import { toneVar } from "@/lib/status";
import { useDays } from "@/store/DashboardContext";

/** Bloque "En palabras simples" con las explicaciones del día. */
export function Stories({ section }: { section: StorySection }) {
  const { day } = useDays();
  const items = day.story?.[section] ?? [];
  if (!items.length) return null;
  return (
    <div className="story card">
      <div className="story-head">En palabras simples</div>
      {items.map((i) => (
        <div className="story-item" key={i.title}>
          <span className="dot" style={{ background: toneVar(i.tone) }} />
          <div><b>{i.title}</b><p>{i.text}</p></div>
        </div>
      ))}
    </div>
  );
}

export function ViewHead({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="view-head">
      <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
    </div>
  );
}
