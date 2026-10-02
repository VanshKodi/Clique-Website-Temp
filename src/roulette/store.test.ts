import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getPool, previewPlan, useRouletteStore } from './store';
import type { Person } from './engine/types';

function makePeople(n: number): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Person ${i}`,
    photo: '',
    present: true,
  }));
}

const state = () => useRouletteStore.getState();

beforeEach(() => {
  useRouletteStore.setState({
    people: makePeople(12),
    settings: { ...DEFAULT_SETTINGS },
    teams: [],
    mute: false,
    animating: null,
  });
});

describe('store invariants', () => {
  it('double commitNextTeam while animating is a no-op', () => {
    state().commitNextTeam();
    expect(state().teams).toHaveLength(1);
    expect(state().animating).not.toBeNull();
    state().commitNextTeam();
    state().commitNextTeam();
    expect(state().teams).toHaveLength(1);
  });

  it('reveals are idempotent and finishReveal clears animating', () => {
    state().commitNextTeam();
    const team = state().teams[0];
    state().revealMember(team.memberIds[0]);
    state().revealMember(team.memberIds[0]);
    expect(state().animating?.revealedIds).toEqual([team.memberIds[0]]);
    state().finishReveal(team.id);
    expect(state().animating).toBeNull();
  });

  it('undo returns members to the pool and the plan recomputes', () => {
    expect(getPool(state())).toHaveLength(12);
    state().commitNextTeam();
    const drawn = state().teams[0].memberIds.length;
    expect(getPool(state())).toHaveLength(12 - drawn);
    state().undoLastTeam();
    expect(state().teams).toHaveLength(0);
    expect(getPool(state())).toHaveLength(12);
    expect(previewPlan(state()).sizes.reduce((a, b) => a + b, 0)).toBe(12);
  });

  it('a person is on at most one team across many draws', () => {
    for (let i = 0; i < 6; i++) {
      state().commitNextTeam();
      const t = state().teams.at(-1);
      if (t) state().finishReveal(t.id);
    }
    const counts = new Map<string, number>();
    for (const t of state().teams) {
      for (const id of t.memberIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const c of counts.values()) expect(c).toBe(1);
    expect(state().teams).toHaveLength(3);
    expect(getPool(state())).toHaveLength(0);
    expect(state().animating).toBeNull();
  });

  it('absent people are excluded from the pool', () => {
    state().togglePresent('p0');
    expect(getPool(state())).toHaveLength(11);
    state().commitNextTeam();
    expect(state().teams[0].memberIds).not.toContain('p0');
  });

  it('removePerson clears them from people and teams', () => {
    state().commitNextTeam();
    const victim = state().teams[0].memberIds[0];
    state().removePerson(victim);
    expect(state().people.find((p) => p.id === victim)).toBeUndefined();
    expect(state().teams[0].memberIds).not.toContain(victim);
    expect(getPool(state()).find((p) => p.id === victim)).toBeUndefined();
  });

  it('bench strategy ends with a substitutes draw', () => {
    state().setSettings({ size: 5, remainder: 'bench' });
    state().commitNextTeam();
    state().finishReveal(state().teams[0].id);
    state().commitNextTeam();
    state().finishReveal(state().teams[1].id);
    state().commitNextTeam();
    expect(state().teams.map((t) => t.kind)).toEqual(['team', 'team', 'bench']);
    expect(state().teams[2].name).toBe('Substitutes');
    expect(state().teams[2].memberIds).toHaveLength(2);
  });

  it('resetDraw clears teams and animating', () => {
    state().commitNextTeam();
    state().resetDraw();
    expect(state().teams).toHaveLength(0);
    expect(state().animating).toBeNull();
    expect(getPool(state())).toHaveLength(12);
  });
});
