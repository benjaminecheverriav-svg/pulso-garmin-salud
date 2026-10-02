import type { Performance, Profile, Zones } from "@pulso/shared";

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Zonas de pulso de Friel (por FC umbral) y ritmos de carrera a partir del umbral de lactato. */
export function personalZones(prof: Profile, perf: Performance): Zones {
  const lthr = perf.lactate.hr ?? prof.lthr ?? null;
  let ltSpeed = perf.lactate.speedMs;
  const r = perf.race;
  if (!ltSpeed && r["10k"] && r.half) ltSpeed = (10000 / r["10k"] + 21097.5 / r.half) / 2;
  const out: Zones = { lthr, ltSpeed };
  if (lthr) {
    const z = (f: number) => Math.round(lthr * f);
    out.hr = { z1: [null, z(0.84)], z2: [z(0.85), z(0.89)], z3: [z(0.9), z(0.94)], z4: [z(0.95), z(0.99)], z5: [z(1), null] };
  }
  if (ltSpeed) {
    const spk = 1000 / ltSpeed;
    const range = (a: number, b: number) => `${mmss(spk + a)}–${mmss(spk + b)}/km`;
    out.pace = {
      suave: range(75, 105), aerobico: range(50, 75), tempo: range(10, 20),
      umbral: range(-3, 5), vo2: range(-25, -15), largo: range(55, 85),
    };
  }
  return out;
}

/** Texto de una zona: "146–153 ppm" o "zona 2" si no hay umbral. */
export function hrText(z: Zones, key: "z1" | "z2" | "z3" | "z4" | "z5"): string {
  const r = z.hr?.[key];
  if (!r) return `zona ${key.slice(1)}`;
  const [lo, hi] = r;
  if (lo === null) return `< ${hi} ppm`;
  if (hi === null) return `> ${lo} ppm`;
  return `${lo}–${hi} ppm`;
}
