import type { Activity, SessionKind, Zones } from "@pulso/shared";
import type { ScoredDay } from "../analytics/indices";
import type { SportGroup } from "./classify";

/** Acumulador que van rellenando las reglas de evaluación. */
export interface EvalAcc {
  score: number;
  good: string[];
  improve: string[];
  context: string[];
  efficiency: number | null;
}

/** Todo lo que una regla necesita para juzgar una sesión. */
export interface EvalInput {
  a: Activity;
  day: ScoredDay;
  prev: ScoredDay | null;
  past: Activity[];
  zones: Zones;
  kind: SessionKind;
  group: SportGroup;
}

export const newAcc = (): EvalAcc => ({ score: 7, good: [], improve: [], context: [], efficiency: null });
