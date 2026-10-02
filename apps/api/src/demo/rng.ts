/** Generador pseudoaleatorio con semilla (mulberry32): el demo es siempre igual. */
export class Rng {
  private state: number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  random(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(lo: number, hi: number): number {
    return lo + (hi - lo) * this.random();
  }

  /** Entero entre lo y hi (ambos incluidos). */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.random() * (hi - lo + 1));
  }

  /** Normal (Box-Muller). */
  gauss(mu: number, sigma: number): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return mu + sigma * s;
    }
    const u = 1 - this.random();
    const v = this.random();
    const r = Math.sqrt(-2 * Math.log(u));
    this.spare = r * Math.sin(2 * Math.PI * v);
    return mu + sigma * r * Math.cos(2 * Math.PI * v);
  }

  choice<T>(xs: readonly T[]): T {
    return xs[Math.floor(this.random() * xs.length)];
  }
}
