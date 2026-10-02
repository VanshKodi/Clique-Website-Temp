import { describe, expect, it } from 'vitest';
import { drawTeam } from './draw';
import { planSizes } from './plan';
import { intFrom, mulberry32 } from './rng';
import type { Person, Settings } from './types';

function makePool(n: number): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Person ${i}`,
    photo: '',
    present: true,
  }));
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

describe('planSizes fixtures', () => {
  const cases: Array<[number, Partial<Settings>, number[] | null, number]> = [
    [12, { by: 'size', size: 4, remainder: 'balanced' }, [4, 4, 4], 0],
    [12, { by: 'size', size: 5, remainder: 'balanced' }, [4, 4, 4], 0],
    [12, { by: 'size', size: 5, remainder: 'fillLast' }, [5, 5, 2], 0],
    [12, { by: 'size', size: 5, remainder: 'bench' }, [5, 5], 2],
    [10, { by: 'size', size: 4, remainder: 'balanced' }, [4, 3, 3], 0],
    [10, { by: 'size', size: 4, remainder: 'fillLast' }, [4, 4, 2], 0],
    [11, { by: 'size', size: 3, remainder: 'balanced' }, [3, 3, 3, 2], 0],
    [7, { by: 'size', size: 3, remainder: 'fillLast' }, [3, 3, 1], 0],
    [12, { by: 'count', count: 5 }, [3, 3, 2, 2, 2], 0],
    [12, { by: 'count', count: 3 }, [4, 4, 4], 0],
    [0, { by: 'size', size: 4, remainder: 'balanced' }, [], 0],
  ];

  for (const [n, patch, expectedSizes, expectedBench] of cases) {
    it(`n=${n} ${JSON.stringify(patch)} -> ${JSON.stringify(expectedSizes)} bench ${expectedBench}`, () => {
      const s: Settings = { by: 'size', size: 4, count: 3, remainder: 'balanced', ...patch };
      const plan = planSizes(n, 0, s);
      expect(plan.sizes).toEqual(expectedSizes);
      expect(plan.bench).toBe(expectedBench);
    });
  }

  it('warns on single-person teams', () => {
    const s: Settings = { by: 'size', size: 3, count: 3, remainder: 'fillLast' };
    expect(planSizes(7, 0, s).warnings).toContain('single-person-team');
    expect(planSizes(10, 0, { ...s, remainder: 'balanced' }).warnings).not.toContain('single-person-team');
  });
});

describe('planSizes invariants: every n in 2..30 x strategy x by-mode', () => {
  const sizes = [2, 3, 4, 5, 7];
  const strategies = ['balanced', 'fillLast', 'bench'] as const;

  for (let n = 2; n <= 30; n++) {
    for (const size of sizes) {
      for (const remainder of strategies) {
        it(`size-mode n=${n} size=${size} ${remainder}`, () => {
          const s: Settings = { by: 'size', size, count: 3, remainder };
          const plan = planSizes(n, 0, s);
          expect(sum(plan.sizes) + plan.bench).toBe(n);
          expect(plan.sizes.every((x) => x >= 1)).toBe(true);
          if (remainder === 'balanced') {
            expect(plan.sizes.length).toBe(Math.ceil(n / size));
            expect(plan.sizes.every((x) => x <= size)).toBe(true);
            expect(Math.max(...plan.sizes) - Math.min(...plan.sizes)).toBeLessThanOrEqual(1);
          } else if (remainder === 'fillLast') {
            const full = Math.floor(n / size);
            expect(plan.sizes.length).toBe(full + (n % size > 0 ? 1 : 0));
            expect(plan.sizes.slice(0, full).every((x) => x === size)).toBe(true);
            expect(plan.bench).toBe(0);
          } else {
            expect(plan.sizes.every((x) => x === size)).toBe(true);
            expect(plan.bench).toBe(n - Math.floor(n / size) * size);
          }
        });
      }
      it(`count-mode n=${n} size=${size}`, () => {
        const s: Settings = { by: 'count', size, count: size, remainder: 'balanced' };
        const plan = planSizes(n, 0, s);
        expect(sum(plan.sizes)).toBe(n);
        expect(plan.bench).toBe(0);
        expect(Math.max(...plan.sizes) - Math.min(...plan.sizes)).toBeLessThanOrEqual(1);
      });
    }
  }
});

describe('balanced re-planning is stable', () => {
  it('10, size 4 -> 4 then re-plan on 6 -> 3 / 3', () => {
    const s: Settings = { by: 'size', size: 4, count: 3, remainder: 'balanced' };
    const first = planSizes(10, 0, s);
    expect(first.sizes[0]).toBe(4);
    const rest = planSizes(6, 1, s);
    expect(rest.sizes).toEqual([3, 3]);
  });
});

describe('count-mode re-planning', () => {
  it('late arrival after planned count forms one extra team', () => {
    const s: Settings = { by: 'count', size: 4, count: 3, remainder: 'balanced' };
    expect(planSizes(12, 0, s).sizes).toEqual([4, 4, 4]);
    expect(planSizes(12, 3, s).sizes).toEqual([12]);
    expect(planSizes(4, 3, s).sizes).toEqual([4]);
    expect(planSizes(2, 3, s).sizes).toEqual([2]);
  });
});

describe('drawTeam', () => {
  it('no duplicates and correct sizes across a full run', () => {
    const s: Settings = { by: 'size', size: 4, count: 3, remainder: 'balanced' };
    let pool = makePool(12);
    let teamsDrawn = 0;
    const seen = new Set<string>();
    let guard = 0;
    for (;;) {
      const plan = planSizes(pool.length, teamsDrawn, s);
      const size = plan.sizes[0] ?? plan.bench;
      if (!size) break;
      const team = drawTeam(pool, size);
      expect(team.length).toBe(size);
      for (const p of team) {
        expect(seen.has(p.id)).toBe(false);
        seen.add(p.id);
      }
      const ids = new Set(team.map((p) => p.id));
      pool = pool.filter((p) => !ids.has(p.id));
      teamsDrawn++;
      expect(++guard).toBeLessThan(50);
    }
    expect(seen.size).toBe(12);
  });

  it('pool smaller than size returns the whole pool shuffled', () => {
    const pool = makePool(3);
    const team = drawTeam(pool, 10);
    expect(team).toHaveLength(3);
    expect(new Set(team.map((p) => p.id)).size).toBe(3);
    expect(pool).toHaveLength(3);
  });

  it('does not mutate the input pool', () => {
    const pool = makePool(6);
    const before = pool.map((p) => p.id);
    drawTeam(pool, 4);
    expect(pool.map((p) => p.id)).toEqual(before);
  });

  it('re-plan after late arrival and absence mid-run stays consistent', () => {
    const s: Settings = { by: 'size', size: 4, count: 3, remainder: 'balanced' };
    let pool = makePool(10);
    const plan1 = planSizes(pool.length, 0, s);
    const team1 = drawTeam(pool, plan1.sizes[0]);
    const ids1 = new Set(team1.map((p) => p.id));
    pool = pool.filter((p) => !ids1.has(p.id));
    pool = [...pool, makePool(1)[0]];
    const plan2 = planSizes(pool.length, 1, s);
    expect(sum(plan2.sizes)).toBe(pool.length);

    const team2 = drawTeam(pool, plan2.sizes[0]);
    const ids2 = new Set(team2.map((p) => p.id));
    pool = pool.filter((p) => !ids2.has(p.id));
    const gone = pool.pop()!;
    const plan3 = planSizes(pool.length, 2, s);
    expect(sum(plan3.sizes)).toBe(pool.length);
    expect(gone.id).toBeTruthy();
  });

  it('deterministic under a seeded rng', () => {
    const pool = makePool(10);
    const a = drawTeam(pool, 4, mulberry32(7)).map((p) => p.id);
    const b = drawTeam(pool, 4, mulberry32(7)).map((p) => p.id);
    expect(a).toEqual(b);
  });
});

describe('uniformity (10,000 runs)', () => {
  it('inclusion and position frequencies are roughly uniform', () => {
    const runs = 10000;
    const n = 10;
    const size = 3;
    const pool = makePool(n);
    const inclusion = new Array<number>(n).fill(0);
    const positions = Array.from({ length: n }, () => new Array<number>(size).fill(0));
    for (let i = 0; i < runs; i++) {
      const team = drawTeam(pool, size);
      team.forEach((p, pos) => {
        const idx = Number(p.id.slice(1));
        inclusion[idx]++;
        positions[idx][pos]++;
      });
    }
    const expectedInclusion = (runs * size) / n;
    for (let i = 0; i < n; i++) {
      expect(Math.abs(inclusion[i] - expectedInclusion)).toBeLessThan(expectedInclusion * 0.1);
      for (let pos = 0; pos < size; pos++) {
        expect(Math.abs(positions[i][pos] - runs / n)).toBeLessThan((runs / n) * 0.15);
      }
    }
  });
});

describe('intFrom rejection sampling', () => {
  it('covers 0..n-1 without bias', () => {
    const rng = mulberry32(42);
    const counts = [0, 0, 0];
    for (let i = 0; i < 9000; i++) counts[intFrom(rng, 3)]++;
    for (const c of counts) expect(Math.abs(c - 3000)).toBeLessThan(450);
  });
});
