import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { drawTeam } from './engine/draw';
import { BENCH_COLOR, TEAM_COLORS, pickTeamName } from './engine/names';
import { planSizes } from './engine/plan';
import { resolveRng, setRngOverride } from './engine/rng';
import type { Animating, Person, Settings, Team } from './engine/types';

export { setRngOverride };

export const DEFAULT_SETTINGS: Settings = { by: 'size', size: 4, count: 3, remainder: 'balanced' };

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function computePool(people: Person[], teams: Team[]): Person[] {
  const drawn = new Set(teams.flatMap((t) => t.memberIds));
  return people.filter((p) => p.present && !drawn.has(p.id));
}

export function getPool(s: Pick<RouletteState, 'people' | 'teams'>): Person[] {
  return computePool(s.people, s.teams);
}

interface RouletteActions {
  commitNextTeam: () => void;
  revealMember: (personId: string) => void;
  finishReveal: (teamId: string) => void;
  undoLastTeam: () => void;
  resetDraw: () => void;
  togglePresent: (id: string) => void;
  addPeople: (people: Person[]) => void;
  updatePerson: (id: string, patch: Partial<Omit<Person, 'id'>>) => void;
  removePerson: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  renameTeam: (id: string, name: string) => void;
  setMute: (mute: boolean) => void;
  markInitialized: () => void;
}

export type RouletteState = RouletteActions & {
  people: Person[];
  settings: Settings;
  teams: Team[];
  mute: boolean;
  initialized: boolean;
  animating: Animating | null;
};

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

const safeStorage = createJSONStorage(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    /* unavailable (e.g. Node test env) — fall through */
  }
  return memoryStorage();
});

export const useRouletteStore = create<RouletteState>()(
  persist(
    (set) => ({
      people: [],
      settings: { ...DEFAULT_SETTINGS },
      teams: [],
      mute: false,
      initialized: false,
      animating: null,

      commitNextTeam: () =>
        set((s) => {
          if (s.animating) return {};
          const pool = computePool(s.people, s.teams);
          if (pool.length === 0) return {};
          const plan = planSizes(pool.length, s.teams.length, s.settings);
          let size: number;
          let kind: Team['kind'];
          if (plan.sizes.length > 0) {
            size = plan.sizes[0];
            kind = 'team';
          } else if (plan.bench > 0) {
            size = plan.bench;
            kind = 'bench';
          } else {
            return {};
          }
          const members = drawTeam(pool, size, resolveRng());
          const usedNames = s.teams.map((t) => t.name);
          const team: Team = {
            id: newId(),
            index: s.teams.length + 1,
            name: kind === 'bench' ? 'Substitutes' : pickTeamName(usedNames),
            color: kind === 'bench' ? BENCH_COLOR : TEAM_COLORS[s.teams.length % TEAM_COLORS.length],
            memberIds: members.map((m) => m.id),
            kind,
          };
          return {
            teams: [...s.teams, team],
            animating: { teamId: team.id, revealedIds: [], poolIds: pool.map((p) => p.id) },
          };
        }),

      revealMember: (personId) =>
        set((s) => {
          if (!s.animating) return {};
          if (s.animating.revealedIds.includes(personId)) return {};
          return { animating: { ...s.animating, revealedIds: [...s.animating.revealedIds, personId] } };
        }),

      finishReveal: (teamId) =>
        set((s) => (s.animating && s.animating.teamId === teamId ? { animating: null } : {})),

      undoLastTeam: () =>
        set((s) => {
          if (s.teams.length === 0) return {};
          return { teams: s.teams.slice(0, -1), animating: null };
        }),

      resetDraw: () => set({ teams: [], animating: null }),

      togglePresent: (id) =>
        set((s) => ({
          people: s.people.map((p) => (p.id === id ? { ...p, present: !p.present } : p)),
        })),

      addPeople: (people) => set((s) => ({ people: [...s.people, ...people] })),

      updatePerson: (id, patch) =>
        set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      removePerson: (id) =>
        set((s) => ({
          people: s.people.filter((p) => p.id !== id),
          teams: s.teams
            .map((t) => ({ ...t, memberIds: t.memberIds.filter((m) => m !== id) }))
            .filter((t) => t.memberIds.length > 0),
        })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      renameTeam: (id, name) =>
        set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, name } : t)) })),

      setMute: (mute) => set({ mute }),

      markInitialized: () => set({ initialized: true }),
    }),
    {
      name: 'team-roulette:v3',
      version: 3,
      storage: safeStorage,
      migrate: (persisted) => {
        const p = persisted as RouletteState;
        return { ...p, people: [], teams: [], initialized: false };
      },
      partialize: (s) => ({
        people: s.people,
        settings: s.settings,
        teams: s.teams,
        mute: s.mute,
        initialized: s.initialized,
      }),
    },
  ),
);

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __tr?: unknown }).__tr = useRouletteStore;
}

export function previewPlan(s: Pick<RouletteState, 'people' | 'teams' | 'settings'>) {
  const pool = computePool(s.people, s.teams);
  return planSizes(pool.length, s.teams.length, s.settings);
}
