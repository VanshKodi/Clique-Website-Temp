import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { Person } from '../../engine/types';
import { easeOutCubic } from '../../lib/anim';
import { sfx } from '../../sfx';
import type { ModeHandle, ModeProps } from '../types';

const HOP_MS = 620;
const LOCK_MS = 340;
const LIFT_MS = 460;

export const SpotlightGridMode = forwardRef<ModeHandle, ModeProps>(function SpotlightGridMode(props, ref) {
  const { team, pool, teamLabel, speed, reducedMotion, onReveal, onDone } = props;

  const gridPeople = useMemo(() => {
    const present = pool.filter((p) => p.present);
    const base = present.length > 0 ? present : team;
    const seen = new Set<string>();
    const out: Person[] = [];
    for (const p of [...base, ...team]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [pool, team]);

  const [runTeam, setRunTeam] = useState<Person[]>([]);
  const [runLabel, setRunLabel] = useState('');
  const [litId, setLitId] = useState<string | null>(null);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [won, setWon] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const spotRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const posRef = useRef({ x: 0, y: 0 });
  const hopRafRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const startedRef = useRef<string | null>(null);
  const revealedRef = useRef(new Set<string>());
  const runRef = useRef<Person[]>([]);

  function clearTimers() {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }

  function pushTimer(fn: () => void, ms: number) {
    timeoutsRef.current.push(window.setTimeout(fn, ms));
  }

  function placeSpot(x: number, y: number, size?: number) {
    const spot = spotRef.current;
    if (!spot) return;
    const s = size !== undefined ? size : spot.offsetWidth || 96;
    spot.style.width = `${s}px`;
    spot.style.height = `${s}px`;
    spot.style.transform = `translate(${x - s / 2}px, ${y - s / 2}px)`;
    posRef.current = { x, y };
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setWon(true);
    setLitId(null);
    sfx.play('win');
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.7 },
      colors: ['#ffc83d', '#ff2bd6', '#22d3ee', '#7c3aed'],
      disableForReducedMotion: reducedMotion,
    });
    onDone();
  }

  function hopTo(id: string, onArrive: () => void) {
    cancelAnimationFrame(hopRafRef.current);
    const cell = cellRefs.current.get(id);
    const grid = gridRef.current;
    if (!cell || !grid) {
      onArrive();
      return;
    }
    const size = Math.max(cell.offsetWidth, cell.offsetHeight) + 16;
    const tx = cell.offsetLeft + cell.offsetWidth / 2;
    const ty = cell.offsetTop + cell.offsetHeight / 2;
    const from = { ...posRef.current };
    placeSpot(from.x, from.y, size);

    if (reducedMotion) {
      placeSpot(tx, ty, size);
      onArrive();
      return;
    }

    sfx.play('tick');
    const dur = HOP_MS / speed;
    let start: number | null = null;
    const step = (ts: number) => {
      if (doneRef.current) return;
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const e = easeOutCubic(p);
      const x = from.x + (tx - from.x) * e;
      const y = from.y + (ty - from.y) * e - Math.sin(p * Math.PI) * 26;
      placeSpot(x, y, size);
      if (p < 1) hopRafRef.current = requestAnimationFrame(step);
      else onArrive();
    };
    hopRafRef.current = requestAnimationFrame(step);
  }

  function runOnce(members: Person[]) {
    const scale = reducedMotion ? 0.4 : 1;
    const step = (i: number) => {
      if (doneRef.current) return;
      if (i >= members.length) {
        finish();
        return;
      }
      const person = members[i];
      hopTo(person.id, () => {
        if (doneRef.current) return;
        setLitId(person.id);
        pushTimer(() => {
          if (doneRef.current) return;
          sfx.play('pop');
          revealedRef.current.add(person.id);
          onReveal(person, i);
          setLockedIds((prev) => (prev.includes(person.id) ? prev : [...prev, person.id]));
          setLitId(null);
          pushTimer(() => step(i + 1), (LIFT_MS / speed) * scale);
        }, (LOCK_MS / speed) * scale);
      });
    };
    step(0);
  }

  useImperativeHandle(ref, () => ({
    skip: () => {
      if (doneRef.current || runRef.current.length === 0) return;
      cancelAnimationFrame(hopRafRef.current);
      clearTimers();
      runRef.current.forEach((p, i) => {
        if (!revealedRef.current.has(p.id)) {
          revealedRef.current.add(p.id);
          onReveal(p, i);
        }
      });
      setLockedIds(runRef.current.map((p) => p.id));
      finish();
    },
  }));

  const teamKey = team.map((p) => p.id).join(',');

  useEffect(() => {
    if (n === 0) {
      startedRef.current = null;
      return;
    }
    if (startedRef.current === teamKey) return;
    startedRef.current = teamKey;
    doneRef.current = false;
    setWon(false);
    setLitId(null);
    setLockedIds([]);
    revealedRef.current = new Set();
    runRef.current = [...team];
    setRunTeam([...team]);
    setRunLabel(teamLabel);
    requestAnimationFrame(() => {
      const grid = gridRef.current;
      if (grid) placeSpot(grid.clientWidth / 2, grid.clientHeight / 2, 100);
      runOnce([...team]);
    });
    return () => {
      cancelAnimationFrame(hopRafRef.current);
      clearTimers();
      startedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey, team.length]);

  const n = team.length;
  const idle = runTeam.length === 0;
  const dimmed = !idle && !won;

  return (
    <div className="relative flex h-full w-full flex-col items-center gap-3 overflow-hidden p-4" data-testid="mode-spotlight">
      <div
        ref={gridRef}
        className="relative grid w-full max-w-4xl content-start gap-2.5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))' }}
      >
        {gridPeople.map((p) => {
          const locked = lockedIds.includes(p.id);
          const lit = litId === p.id;
          return (
            <div
              key={p.id}
              ref={(el) => {
                if (el) cellRefs.current.set(p.id, el);
                else cellRefs.current.delete(p.id);
              }}
              data-testid={`grid-face-${p.id}`}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                lit
                  ? 'z-10 scale-110 border-[#ffc83d] shadow-[0_0_28px_rgba(255,200,61,0.75)]'
                  : locked
                    ? 'pointer-events-none opacity-0'
                    : dimmed
                      ? 'border-[#4c2f8f]/60 opacity-25 saturate-50'
                      : 'border-[#7c3aed]/70'
              } ${locked ? 'animate-[spotLift_0.46s_ease-in_forwards]' : ''}`}
            >
              <img
                src={p.photo || undefined}
                alt={p.name}
                className="h-full w-full object-cover"
                style={{ objectPosition: '50% 20%' }}
                draggable={false}
              />
            </div>
          );
        })}

        {idle ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,200,61,0.20),transparent_70%)] animate-[spotSweep_7s_ease-in-out_infinite]" />
          </div>
        ) : null}

        {!won ? (
          <div
            ref={spotRef}
            className="pointer-events-none absolute left-0 top-0 z-20 rounded-2xl border-2 border-[#ffc83d] bg-[radial-gradient(circle,rgba(255,200,61,0.16),transparent_72%)] shadow-[0_0_34px_rgba(255,200,61,0.55),inset_0_0_18px_rgba(255,200,61,0.25)] transition-opacity duration-300"
            style={{ opacity: idle ? 0 : 1 }}
            aria-hidden
          />
        ) : null}
      </div>

      {idle ? <div className="font-display text-sm text-[#c4b5fd]">PRESS NEXT TEAM</div> : null}

      {won ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 animate-[bannerPop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both] text-center">
          <span className="font-display text-3xl text-[#ffc83d] drop-shadow-[0_0_24px_rgba(255,200,61,0.9)] sm:text-5xl">
            TEAM LOCKED: {runLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
});
