import type { Plan, Settings } from './types';

function splitEvenly(n: number, teams: number): number[] {
  if (teams <= 0 || n <= 0) return [];
  const base = Math.floor(n / teams);
  const rem = n % teams;
  const sizes: number[] = [];
  for (let i = 0; i < teams; i++) sizes.push(base + (i < rem ? 1 : 0));
  return sizes;
}

export function planSizes(poolCount: number, teamsDrawn: number, s: Settings): Plan {
  const n = Math.max(0, Math.floor(poolCount));

  if (n === 0) return { sizes: [], bench: 0, warnings: [] };

  let sizes: number[] = [];
  let bench = 0;

  if (s.by === 'count') {
    const remaining = Math.min(Math.max(1, s.count - teamsDrawn), n);
    sizes = splitEvenly(n, remaining);
  } else {
    const size = Math.max(1, Math.floor(s.size));
    if (s.remainder === 'balanced') {
      const teams = Math.max(1, Math.ceil(n / size));
      sizes = splitEvenly(n, teams);
    } else if (s.remainder === 'fillLast') {
      const full = Math.floor(n / size);
      const rem = n % size;
      if (full === 0) {
        sizes = [n];
      } else {
        sizes = Array.from({ length: full }, () => size);
        if (rem > 0) sizes.push(rem);
      }
    } else {
      const full = Math.floor(n / size);
      sizes = Array.from({ length: full }, () => size);
      bench = n - sizes.reduce((a, b) => a + b, 0);
    }
  }

  const warnings: Plan['warnings'] = sizes.some((x) => x === 1) ? ['single-person-team'] : [];
  return { sizes, bench, warnings };
}
