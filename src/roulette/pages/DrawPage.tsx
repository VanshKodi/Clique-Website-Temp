import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ControlBar } from '../components/ControlBar';
import { RosterDrawer } from '../components/RosterDrawer';
import type { Person } from '../engine/types';
import { DEFAULT_MODE, REGISTRY } from '../modes/registry';
import type { ModeHandle } from '../modes/types';
import { getPool, previewPlan, useRouletteStore } from '../store';
import { sfx } from '../sfx';
import { delay } from '../lib/anim';

export function DrawPage() {
  const { mode } = useParams();
  const navigate = useNavigate();
  const entry = REGISTRY.find((e) => e.id === mode) ?? REGISTRY.find((e) => e.id === DEFAULT_MODE)!;

  const people = useRouletteStore((s) => s.people);
  const teams = useRouletteStore((s) => s.teams);
  const settings = useRouletteStore((s) => s.settings);
  const mute = useRouletteStore((s) => s.mute);
  const animating = useRouletteStore((s) => s.animating);

  const [chrome, setChrome] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [reduced, setReduced] = useState(false);
  const modeRef = useRef<ModeHandle>(null);

  const speed = useMemo(
    () => (new URLSearchParams(window.location.search).get('fast') === '1' ? 4 : 1),
    [],
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    sfx.setMuted(mute);
    const unlock = () => sfx.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [mute]);

  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const poolNow = useMemo(() => getPool({ people, teams }), [people, teams]);

  const currentTeam = animating ? teams.find((t) => t.id === animating.teamId) ?? null : null;
  const teamKey = currentTeam ? currentTeam.memberIds.join(',') : '';
  const revealedKey = animating ? animating.revealedIds.join(',') : '';

  const modeTeam = useMemo<Person[]>(() => {
    if (!currentTeam) return [];
    return currentTeam.memberIds.map((id) => personById.get(id)).filter((p): p is Person => Boolean(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey, personById]);

  const modePool = useMemo<Person[]>(() => {
    if (!animating) return poolNow;
    return animating.poolIds.map((id) => personById.get(id)).filter((p): p is Person => Boolean(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating?.teamId, personById]);

  const visiblePool = useMemo(() => {
    const list = [...poolNow];
    if (animating && currentTeam) {
      for (const id of currentTeam.memberIds) {
        if (!animating.revealedIds.includes(id)) {
          const p = personById.get(id);
          if (p) list.push(p);
        }
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolNow, animating?.teamId, revealedKey, personById]);

  const nextPlan = previewPlan({ people, teams, settings });
  const nextSize = nextPlan.sizes[0] ?? nextPlan.bench;
  const substitutesNext = nextPlan.sizes.length === 0 && nextPlan.bench > 0;
  const nextLabel = substitutesNext
    ? 'REVEAL SUBSTITUTES'
    : `NEXT TEAM · ${nextSize} ${nextSize === 1 ? 'PERSON' : 'PEOPLE'}`;

  const commit = useCallback(() => {
    if (animating) return;
    sfx.play('pop');
    useRouletteStore.getState().commitNextTeam();
  }, [animating]);

  const skip = useCallback(() => modeRef.current?.skip(), []);

  const revealRemaining = useCallback(async () => {
    for (let guard = 0; guard < 60; guard++) {
      const s = useRouletteStore.getState();
      if (s.animating) {
        const t = s.teams.find((x) => x.id === s.animating!.teamId);
        if (t) {
          for (const id of t.memberIds) s.revealMember(id);
          s.finishReveal(t.id);
        }
        await delay(90);
        continue;
      }
      const plan = previewPlan({ people: s.people, teams: s.teams, settings: s.settings });
      if (plan.sizes.length === 0 && plan.bench === 0) break;
      s.commitNextTeam();
      await delay(90);
    }
  }, []);

  const undo = useCallback(() => {
    if (window.confirm('Undo the last team? Those members return to the pool.')) {
      useRouletteStore.getState().undoLastTeam();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (useRouletteStore.getState().animating) skip();
        else commit();
        return;
      }
      if (key === 'h') setChrome((c) => !c);
      if (key === 'm') useRouletteStore.getState().setMute(!useRouletteStore.getState().mute);
      if (key === 'f') toggleFullscreen();
      const num = Number(e.key);
      if (num >= 1 && num <= REGISTRY.length && !useRouletteStore.getState().animating) {
        const target = REGISTRY[num - 1];
        if (target && target.id !== mode) navigate(`/hidden/draw/${target.id}${window.location.search}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commit, skip, mode, toggleFullscreen, navigate]);

  if (people.length === 0) return <Navigate to="/hidden" replace />;
  if (!REGISTRY.some((e) => e.id === mode)) return <Navigate to={`/hidden/draw/${DEFAULT_MODE}`} replace />;

  const Mode = entry.Component;
  const announcement = currentTeam
    ? `${currentTeam.name}: ${(animating?.revealedIds ?? [])
        .map((id) => personById.get(id)?.name)
        .filter(Boolean)
        .join(', ')}`
    : '';

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0b0618]">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {chrome ? (
        <nav className="flex items-center gap-1 border-b border-[#7c3aed]/40 bg-[#12082e] px-3 py-2">
          <span className="mr-2 font-display text-xs text-[#ff2bd6]">TEAM·ROULETTE</span>
          {REGISTRY.map((e, i) => (
            <button
              key={e.id}
              type="button"
              data-testid={`tab-${e.id}`}
              disabled={Boolean(animating)}
              onClick={() => navigate(`/hidden/draw/${e.id}${window.location.search}`)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                e.id === mode
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#ff2bd6] text-white shadow-[0_0_14px_#ff2bd655]'
                  : 'text-[#b9a9e8] hover:bg-white/10'
              }`}
            >
              <span aria-hidden>{e.icon}</span> {e.label}
              <span className="ml-1.5 opacity-60">{i + 1}</span>
            </button>
          ))}
          <span className="ml-auto rounded-full border border-[#22d3ee]/60 px-2.5 py-1 text-[11px] font-bold text-[#22d3ee]">
            pool {poolNow.length}
          </span>
        </nav>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        {chrome ? (
          <aside className="w-40 shrink-0 overflow-y-auto border-r border-[#7c3aed]/40 bg-[#12082e]/60 p-3">
            <h2 className="mb-2 font-display text-[10px] tracking-widest text-[#8f7fc0]">POOL</h2>
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence>
                {visiblePool.map((p) => (
                  <motion.img
                    key={p.id}
                    src={p.photo || undefined}
                    alt={p.name}
                    title={p.name}
                    data-testid={`pool-face-${p.id}`}
                    layout
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, y: -30, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="h-9 w-9 rounded-lg border border-[#7c3aed]/60 object-cover"
                    style={{ objectPosition: '50% 20%' }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </aside>
        ) : null}

        <main className="relative min-w-0 flex-1">
          <Mode
            ref={modeRef}
            team={modeTeam}
            pool={modePool}
            teamLabel={currentTeam?.name ?? ''}
            speed={speed}
            reducedMotion={reduced}
            onReveal={(p) => useRouletteStore.getState().revealMember(p.id)}
            onDone={() => {
              const a = useRouletteStore.getState().animating;
              if (a) useRouletteStore.getState().finishReveal(a.teamId);
            }}
          />
          {!chrome ? (
            <button
              type="button"
              onMouseEnter={() => setChrome(true)}
              className="fixed left-0 top-0 z-30 h-16 w-16"
              aria-label="Show controls"
            />
          ) : null}
        </main>

        {chrome ? (
          <aside className="w-56 shrink-0 overflow-y-auto border-l border-[#7c3aed]/40 bg-[#12082e]/60 p-3">
            <h2 className="mb-2 font-display text-[10px] tracking-widest text-[#8f7fc0]">TEAMS</h2>
            <ul className="space-y-2">
              {teams.map((t) => (
                <li
                  key={t.id}
                  data-testid={`team-chip-${t.id}`}
                  className="rounded-lg border-l-4 bg-black/40 p-2"
                  style={{ borderColor: t.color }}
                >
                  <TeamName teamId={t.id} initial={t.name} color={t.color} />
                  <div className="mt-1.5 space-y-1">
                    {t.memberIds.map((id) => {
                      const p = personById.get(id);
                      if (!p) return null;
                      const revealed =
                        !animating || animating.teamId !== t.id || animating.revealedIds.includes(id);
                      return (
                        <div
                          key={id}
                          data-testid={`team-member-${t.id}-${id}`}
                          className="flex items-center gap-1.5 text-[11px]"
                        >
                          {revealed ? (
                            <>
                              <img
                                src={p.photo || undefined}
                                alt=""
                                className="h-5 w-5 rounded-full object-cover"
                                style={{ objectPosition: '50% 20%' }}
                              />
                              <span className={p.present ? 'truncate text-[#e9e4ff]' : 'truncate text-[#8f7fc0] line-through'}>
                                {p.name}
                              </span>
                              {!p.present ? (
                                <span className="ml-auto rounded bg-[#ff2bd6]/20 px-1 text-[9px] text-[#ff2bd6]">absent</span>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2a1b52] text-[10px] text-[#8f7fc0]">
                                ?
                              </span>
                              <span className="truncate text-[#8f7fc0]">???</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
              {teams.length === 0 ? <li className="text-xs text-[#8f7fc0]">No teams yet — hit Next Team.</li> : null}
            </ul>
          </aside>
        ) : null}
      </div>

      {chrome ? (
        <ControlBar
          animating={Boolean(animating)}
          nextLabel={nextLabel}
          canDraw={poolNow.length > 0 && !animating}
          canUndo={teams.length > 0 && !animating}
          muted={mute}
          chrome={chrome}
          onNext={commit}
          onSkip={skip}
          onUndo={undo}
          onRevealRemaining={() => void revealRemaining()}
          onToggleMute={() => useRouletteStore.getState().setMute(!mute)}
          onFullscreen={toggleFullscreen}
          onToggleChrome={() => setChrome(false)}
        />
      ) : null}

      {chrome ? (
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="fixed bottom-20 right-3 z-30 rounded-full border border-[#7c3aed] bg-[#140a2e] px-3 py-2 text-xs font-bold text-[#c4b5fd] shadow-lg hover:bg-[#7c3aed]/30"
          data-testid="roster-drawer-open"
        >
          Roster
        </button>
      ) : null}
      <RosterDrawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

function TeamName({ teamId, initial, color }: { teamId: string; initial: string; color: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== initial) useRouletteStore.getState().renameTeam(teamId, next);
    else setDraft(initial);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(initial);
            setEditing(false);
          }
        }}
        className="w-full rounded bg-black/50 px-1 py-0.5 text-xs font-bold outline-none"
        style={{ border: `1px solid ${color}`, color }}
        aria-label="Team name"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(initial);
        setEditing(true);
      }}
      className="truncate text-left text-xs font-bold hover:underline"
      style={{ color }}
      title="Click to rename"
    >
      {initial}
    </button>
  );
}
