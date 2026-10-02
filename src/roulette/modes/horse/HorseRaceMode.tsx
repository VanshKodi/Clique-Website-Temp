import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { Person } from '../../engine/types';
import { sfx } from '../../sfx';
import type { ModeHandle, ModeProps } from '../types';

const T0 = 6.0;
const LANE_NAME_MAX = 14;

interface Knot {
  t: number;
  p: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function makeCurve(knots: Knot[]): (t: number) => number {
  const n = knots.length;
  const deltas: number[] = [];
  const ms: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    deltas.push((knots[i + 1].p - knots[i].p) / (knots[i + 1].t - knots[i].t));
  }
  ms.push(deltas[0]);
  for (let i = 1; i < n - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) ms.push(0);
    else ms.push((deltas[i - 1] + deltas[i]) / 2);
  }
  ms.push(deltas[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (deltas[i] === 0) {
      ms[i] = 0;
      ms[i + 1] = 0;
      continue;
    }
    const a = ms[i] / deltas[i];
    const b = ms[i + 1] / deltas[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      ms[i] = tau * a * deltas[i];
      ms[i + 1] = tau * b * deltas[i];
    }
  }
  return (t: number) => {
    if (t <= knots[0].t) return knots[0].p;
    if (t >= knots[n - 1].t) return knots[n - 1].p;
    let i = 0;
    while (i < n - 2 && t > knots[i + 1].t) i++;
    const h = knots[i + 1].t - knots[i].t;
    const u = (t - knots[i].t) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * knots[i].p +
      (u3 - 2 * u2 + u) * h * ms[i] +
      (-2 * u3 + 3 * u2) * knots[i + 1].p +
      (u3 - u2) * h * ms[i + 1]
    );
  };
}

interface Racer {
  person: Person;
  finish: number;
  curve: (t: number) => number;
}

export const HorseRaceMode = forwardRef<ModeHandle, ModeProps>(function HorseRaceMode(props, ref) {
  const { team, pool, teamLabel, speed, reducedMotion, onReveal, onDone } = props;

  const basePeople = useMemo(() => {
    const present = pool.filter((p) => p.present);
    const list = present.length > 0 ? present : team;
    const seen = new Set<string>();
    return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [pool, team]);

  const [racers, setRacers] = useState<Racer[]>([]);
  const [runTeam, setRunTeam] = useState<Person[]>([]);
  const [runLabel, setRunLabel] = useState('');
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [ticker, setTicker] = useState('');
  const [won, setWon] = useState(false);

  const laneRefs = useRef(new Map<string, HTMLDivElement>());
  const trailRefs = useRef(new Map<string, HTMLDivElement>());
  const rafRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const startedRef = useRef<string | null>(null);
  const revealedRef = useRef(new Set<string>());
  const runRef = useRef<Person[]>([]);
  const racerListRef = useRef<Racer[]>([]);
  const leaderRef = useRef<string | null>(null);
  const lastCommentRef = useRef(0);

  function clearTimers() {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }

  function pushTimer(fn: () => void, ms: number) {
    timeoutsRef.current.push(window.setTimeout(fn, Math.max(1, ms)));
  }

  function say(text: string) {
    setTicker(text);
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setWon(true);
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

  function measureTravel(): number {
    const laneEl = document.querySelector<HTMLElement>('[data-lane-width]');
    const anyId = racerListRef.current[0]?.person.id;
    const racerEl = anyId ? laneRefs.current.get(anyId) : null;
    const laneW = laneEl ? laneEl.clientWidth : 640;
    const racerW = racerEl ? racerEl.offsetWidth : 150;
    return Math.max(80, laneW - racerW - 10);
  }

  function buildRacers(): Racer[] {
    const people: Person[] = [...basePeople];
    for (const c of team) {
      if (!people.some((p) => p.id === c.id)) people.push(c);
    }
    const chosenIdx = new Set(team.map((p) => p.id));
    const gap = 0.15 + Math.random() * 0.15;
    const lastChosenT = T0 + Math.max(0, team.length - 1) * gap;
    const rnd = () => Math.random();
    return people.map((person) => {
      const isChosen = chosenIdx.has(person.id);
      const order = team.findIndex((p) => p.id === person.id);
      const finishT = isChosen ? T0 + order * gap : lastChosenT + 1.6 + rnd() * 1.6;
      const j = () => rnd() * 2 - 1;
      const p1 = clamp(0.2 + j() * 0.12, 0.05, 0.33);
      const p2 = clamp(0.47 + j() * 0.17, p1 + 0.07, 0.62);
      const p3 = clamp(0.73 + j() * 0.13, p2 + 0.07, 0.87);
      const knots: Knot[] = [
        { t: 0, p: 0 },
        { t: finishT * 0.22, p: p1 },
        { t: finishT * 0.47, p: p2 },
        { t: finishT * 0.74, p: p3 },
        { t: finishT, p: 1 },
      ];
      return { person, finish: finishT, curve: makeCurve(knots) };
    });
  }

  function setRacerVisual(id: string, p: number, travel: number) {
    const el = laneRefs.current.get(id);
    const trail = trailRefs.current.get(id);
    const x = Math.max(0, p) * travel;
    if (el) el.style.transform = `translateX(${x.toFixed(1)}px)`;
    if (trail) trail.style.transform = `scaleX(${clamp(p, 0, 1).toFixed(4)})`;
  }

  function revealChosen(r: Racer, idx: number) {
    if (revealedRef.current.has(r.person.id)) return;
    revealedRef.current.add(r.person.id);
    onReveal(r.person, idx);
    setRevealedIds((prev) => [...prev, r.person.id]);
    sfx.play('clunk');
  }

  function revealAllChosen() {
    runRef.current.forEach((p, i) => {
      const r = racerListRef.current.find((x) => x.person.id === p.id);
      if (r) revealChosen(r, i);
    });
  }

  function startRace(list: Racer[]) {
    const travel = measureTravel();
    const start = performance.now();
    const chosen = [...team];
    const maxFinish = list.reduce((m, r) => Math.max(m, r.finish), 0);

    const step = (ts: number) => {
      if (doneRef.current) return;
      const t = ((ts - start) / 1000) * speed;
      let leader: Racer | null = null;
      let leaderP = -1;
      for (const r of list) {
        const p = r.curve(t);
        setRacerVisual(r.person.id, p, travel);
        if (p > leaderP) {
          leaderP = p;
          leader = r;
        }
        if (r.finish <= t && chosen.some((c) => c.id === r.person.id)) {
          const order = chosen.findIndex((c) => c.id === r.person.id);
          if (!revealedRef.current.has(r.person.id)) {
            revealChosen(r, order);
            say(`${shortName(r.person.name)} crosses the line!`);
          }
        }
      }
      if (leader && leader.person.id !== leaderRef.current && ts - lastCommentRef.current > 750 && t > 0.8) {
        leaderRef.current = leader.person.id;
        lastCommentRef.current = ts;
        say(`${shortName(leader.person.name)} takes the lead!`);
      }
      const allChosenDone = chosen.every((c) => revealedRef.current.has(c.id));
      if (allChosenDone || t > maxFinish + 2) {
        cancelAnimationFrame(rafRef.current);
        if (!allChosenDone) revealAllChosen();
        pushTimer(() => {
          if (!doneRef.current) {
            say('Photo finish!');
            finish();
          }
        }, 900 / speed);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  useImperativeHandle(ref, () => ({
    skip: () => {
      if (doneRef.current || runRef.current.length === 0) return;
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      const travel = measureTravel();
      racerListRef.current.forEach((r) => setRacerVisual(r.person.id, r.curve(9999), travel));
      revealAllChosen();
      finish();
    },
  }));

  const teamKey = team.map((p) => p.id).join(',');

  useEffect(() => {
    if (team.length === 0) {
      startedRef.current = null;
      return;
    }
    if (startedRef.current === teamKey) return;
    startedRef.current = teamKey;
    doneRef.current = false;
    setWon(false);
    setRevealedIds([]);
    setTicker('');
    revealedRef.current = new Set();
    leaderRef.current = null;
    lastCommentRef.current = 0;
    runRef.current = [...team];
    setRunTeam([...team]);
    setRunLabel(teamLabel);
    const list = buildRacers();
    racerListRef.current = list;
    setRacers(list);
    if (reducedMotion) {
      say("They're off!");
      team.forEach((p, i) => {
        pushTimer(
          () => {
            const r = list.find((x) => x.person.id === p.id);
            if (r) revealChosen(r, i);
            if (i === team.length - 1) pushTimer(finish, 500);
          },
          (400 + i * 260) / speed,
        );
      });
    } else {
      pushTimer(() => {
        say("They're off!");
        startRace(list);
      }, 450 / speed);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      startedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey, team.length]);

  const idle = runTeam.length === 0;
  const shown = racers.length > 0 ? racers : basePeople.map((p) => ({ person: p, finish: 0, curve: () => 0 }) as Racer);
  const laneH = shown.length > 14 ? 34 : shown.length > 9 ? 42 : 54;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden p-4" data-testid="mode-horse">
      <div className="w-full max-w-5xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-display text-xs tracking-widest text-[#c4b5fd]">START</span>
          <div
            className="min-h-6 flex-1 rounded-full border border-[#7c3aed]/50 bg-black/50 px-3 py-1 text-center text-sm font-bold text-[#22d3ee]"
            aria-live="polite"
          >
            {ticker}
          </div>
          <span className="font-display text-xs tracking-widest text-[#ffc83d]">FINISH</span>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border-2 border-[#7c3aed]/70 bg-[#12082e]/80"
          style={{ height: shown.length * laneH + 8 }}
        >
          <div
            className="absolute inset-y-0 right-0 z-10 w-5"
            style={{
              background: 'repeating-conic-gradient(#0b0618 0% 25%, #f4f1ff 0% 50%) 0 0 / 12px 12px',
              opacity: 0.85,
            }}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-5 w-px bg-[#ffc83d]/60" aria-hidden />

          {shown.map((r, i) => (
            <div
              key={r.person.id}
              data-lane-width=""
              className="relative border-b border-white/5 last:border-b-0"
              style={{ height: laneH, paddingRight: 26 }}
            >
              <div
                ref={(el) => {
                  if (el) trailRefs.current.set(r.person.id, el);
                  else trailRefs.current.delete(r.person.id);
                }}
                className="absolute inset-y-1 left-0 w-full origin-left rounded-full bg-gradient-to-r from-[#7c3aed]/10 via-[#ff2bd6]/40 to-[#ffc83d]/70"
                style={{ transform: 'scaleX(0)' }}
                aria-hidden
              />
              <div
                className="absolute left-1 top-1/2 -translate-y-1/2"
                ref={(el) => {
                  if (el) laneRefs.current.set(r.person.id, el);
                  else laneRefs.current.delete(r.person.id);
                }}
              >
                <div
                  className={`flex items-center gap-1.5 rounded-full border-2 bg-[#180a38]/95 py-1 pl-1 pr-2.5 shadow-[0_0_12px_rgba(0,0,0,0.6)] ${
                    revealedIds.includes(r.person.id)
                      ? 'border-[#ffc83d] shadow-[0_0_16px_rgba(255,200,61,0.7)]'
                      : 'border-[#7c3aed]/80'
                  } ${idle ? 'animate-[gateBob_0.9s_ease-in-out_infinite]' : ''}`}
                  style={idle ? { animationDelay: `${(i * 0.13).toFixed(2)}s` } : undefined}
                >
                  <img
                    src={r.person.photo || undefined}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    style={{ objectPosition: '50% 20%' }}
                  />
                  <span
                    className={`max-w-[110px] truncate text-xs font-bold ${
                      revealedIds.includes(r.person.id) ? 'text-[#ffc83d]' : 'text-[#e9e4ff]'
                    }`}
                  >
                    {r.person.name.length > LANE_NAME_MAX ? r.person.name.slice(0, LANE_NAME_MAX) + '…' : r.person.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
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

function shortName(name: string): string {
  return name.split(' ')[0];
}
