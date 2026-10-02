/** Reglas para convertir valores en estados (verde/amarillo/rojo) y textos cortos. */
import type { Tone } from "@pulso/shared";

export const recoveryStatus = (v: number | null | undefined): [string, Tone] =>
  v == null ? ["Sin datos", ""] : v >= 67 ? ["Verde", "good"] : v >= 34 ? ["Amarillo", "warning"] : ["Rojo", "critical"];

export const strainLabel = (v: number | null | undefined): string =>
  v == null ? "—" : v < 10 ? "Ligero" : v < 14 ? "Moderado" : v < 18 ? "Alto" : "Máximo";

export const scoreStatus = (v: number | null | undefined): Tone =>
  v == null ? "" : v >= 80 ? "good" : v >= 60 ? "warning" : v >= 40 ? "serious" : "critical";

export const scoreTone = (v: number): Tone => (v >= 7 ? "good" : v >= 5 ? "warning" : "critical");

export const stressWord = (v: number | null | undefined): string =>
  v == null ? "—" : v <= 25 ? "Reposo" : v <= 50 ? "Bajo" : v <= 75 ? "Medio" : "Alto";

export const INTENSITY_TONE: Record<string, Tone> = { descanso: "", suave: "good", moderada: "warning", intensa: "serious" };

/** Variable CSS del color de un estado (o gris si no hay estado). */
export const toneVar = (t: Tone | string | null | undefined): string => (t ? `var(--${t})` : "var(--text-muted)");
