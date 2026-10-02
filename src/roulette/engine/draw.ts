import { cryptoRng, intFrom, type Rng } from './rng';
import type { Person } from './types';

export function drawTeam(pool: Person[], size: number, rng: Rng = cryptoRng): Person[] {
  const out = [...pool];
  if (out.length === 0) return out;
  const take = Math.min(out.length, Math.max(1, Math.floor(size)));
  for (let i = 0; i < take; i++) {
    const j = i + intFrom(rng, out.length - i);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out.slice(0, take);
}
