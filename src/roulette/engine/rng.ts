export type Rng = () => number;

const UINT32 = 4294967296;

export const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / UINT32;
};

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
}

export function intFrom(rng: Rng, n: number): number {
  if (n <= 0) throw new RangeError('intFrom: n must be > 0');
  if (n === 1) return 0;
  const limit = Math.floor(UINT32 / n) * n;
  for (;;) {
    const x = Math.floor(rng() * UINT32);
    if (x < limit) return x % n;
  }
}

let override: Rng | null = null;

export function setRngOverride(rng: Rng | null): void {
  override = rng;
}

export function resolveRng(): Rng {
  if (override) return override;
  if (typeof window !== 'undefined') {
    const raw = new URLSearchParams(window.location.search).get('seed');
    if (raw !== null && import.meta.env.VITE_E2E === '1') {
      const n = Number(raw);
      if (Number.isFinite(n)) return mulberry32(n >>> 0);
    }
  }
  return cryptoRng;
}
