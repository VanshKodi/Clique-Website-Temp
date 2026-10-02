import type { Person, Settings } from '../engine/types';

interface RosterExport {
  format: 'team-roulette-roster';
  version: 1;
  people: Person[];
  settings?: Settings;
}

export function buildRosterJson(people: Person[], settings: Settings): string {
  const payload: RosterExport = { format: 'team-roulette-roster', version: 1, people, settings };
  return JSON.stringify(payload, null, 2);
}

export function parseRosterJson(text: string): Person[] {
  const data = JSON.parse(text) as Partial<RosterExport>;
  if (data.format !== 'team-roulette-roster' || !Array.isArray(data.people)) {
    throw new Error('Not a Team Roulette roster file');
  }
  return data.people.map((p, i) => ({
    id: typeof p?.id === 'string' && p.id ? p.id : `import-${Date.now()}-${i}`,
    name: typeof p?.name === 'string' && p.name.trim() ? p.name : `Player ${i + 1}`,
    photo: typeof p?.photo === 'string' ? p.photo : '',
    present: p?.present !== false,
  }));
}

export function downloadRoster(people: Person[], settings: Settings): void {
  const blob = new Blob([buildRosterJson(people, settings)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'team-roulette-roster.json';
  a.click();
  URL.revokeObjectURL(url);
}
