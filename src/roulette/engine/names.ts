import { intFrom, type Rng, cryptoRng } from './rng';

const ADJECTIVES = [
  'Neon', 'Quantum', 'Savage', 'Golden', 'Cosmic', 'Turbo', 'Mystic', 'Electric',
  'Radiant', 'Frozen', 'Blazing', 'Lucky', 'Thunder', 'Shadow', 'Crystal', 'Wild',
  'Mighty', 'Silent', 'Rapid', 'Ancient', 'Brave', 'Lunar', 'Solar', 'Fierce',
];

const NOUNS = [
  'Panthers', 'Falcons', 'Wolves', 'Dragons', 'Tigers', 'Vipers', 'Phoenix', 'Sharks',
  'Bolts', 'Comets', 'Titans', 'Ravens', 'Jaguars', 'Cobras', 'Hawks', 'Unicorns',
  'Ninjas', 'Pirates', 'Gladiators', 'Wanderers', 'Legends', 'Rebels', 'Giants', 'Storms',
];

export const TEAM_COLORS = [
  '#7c3aed',
  '#ff2bd6',
  '#ffc83d',
  '#22d3ee',
  '#34d399',
  '#f87171',
  '#60a5fa',
  '#fb923c',
];

export const BENCH_COLOR = '#94a3b8';

export function pickTeamName(used: string[], rng: Rng = cryptoRng): string {
  for (let attempt = 0; attempt < 48; attempt++) {
    const name = `${ADJECTIVES[intFrom(rng, ADJECTIVES.length)]} ${NOUNS[intFrom(rng, NOUNS.length)]}`;
    if (!used.includes(name)) return name;
  }
  for (const a of ADJECTIVES) {
    for (const n of NOUNS) {
      const name = `${a} ${n}`;
      if (!used.includes(name)) return name;
    }
  }
  return `Team ${used.length + 1}`;
}
