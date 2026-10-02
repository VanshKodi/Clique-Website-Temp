import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { Person } from '../../engine/types';
import { easeOutCubic, easeOutQuad } from '../../lib/anim';
import { sfx } from '../../sfx';
import type { ModeHandle, ModeProps } from '../types';

const C = 112;
const LOOP_CELLS = 144;
const FILLERS = 8;
const V_MAX = 2800;
const WOBBLE = 14;
const WOBBLE_T = 0.3;
const RAMP_T = 0.5;
const IDLE_REELS = 4;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

function loopStrip(pool: Person[]): Person[] {
  const cells: Person[] = [];
  if (pool.length === 0) return cells;
  let guard = 0;
  while (cells.length < LOOP_CELLS && guard++ < 50) {
    for (const p of shuffle(pool)) {
      if (cells.length > 0 && cells[cells.length - 1].id === p.id) continue;
      cells.push(p);
      if (cells.length >= LOOP_CELLS) break;
    }
  }
  return cells;
}

function spinAbs(t: number): number {
  if (t < WOBBLE_T) return -WOBBLE * easeOutQuad(t / WOBBLE_T);
  const u = t - WOBBLE_T;
  if (u < RAMP_T) {
    const s = u / RAMP_T;
    return -WOBBLE + V_MAX * RAMP_T * (1.5 * s * s - s * s * s + (s * s * s * s) / 4);
  }
  return -WOBBLE + V_MAX * RAMP_T * 1.25 + V_MAX * (u - RAMP_T);
}

function crawlEase(p: number): number {
  if (p < 0.6) return 0.95 * easeOutCubic(p / 0.6);
  return 0.95 + 0.05 * ((p - 0.6) / 0.4);
}

function blurFor(v: number): number {
  if (v > 1400) return 2;
  if (v > 300) return 1;
  return 0;
}

interface ReelRT {
  phase: 'spin' | 'settle' | 'stopped';
  settleAt: number;
  from: number;
  final: number;
  D: number;
  ease: (p: number) => number;
  blur: number;
}

export const SlotsMode = forwardRef<ModeHandle, ModeProps>(function SlotsMode(props, ref) {
  const { team, pool, teamLabel, speed, reducedMotion, onReveal, onDone } = props;
  const n = team.length;
  const [cells, setCells] = useState<Person[][]>(() =>
    Array.from({ length: IDLE_REELS }, () => loopStrip(pool.length > 0 ? pool : [])),
  );
  const [runTeam, setRunTeam] = useState<Person[]>([]);
  const [runLabel, setRunLabel] = useState('');
  const [stopped, setStopped] = useState<boolean[]>([]);
  const [won, setWon] = useState(false);
  const stripsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rtRef = useRef<ReelRT[]>([]);
  const targetRef = useRef<number[]>([]);
  const revealedRef = useRef<boolean[]>([]);
  const rafRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const startedRef = useRef<string | null>(null);

  function clearTimers() {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
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

  function stopReel(i: number) {
    const st = revealedRef.current;
    if (st[i]) return;
    st[i] = true;
    const strip = stripsRef.current[i];
    if (strip) strip.style.filter = 'blur(0px)';
    if (rtRef.current[i]) rtRef.current[i].phase = 'stopped';
    sfx.play('clunk');
    setStopped((prev) => prev.map((s, k) => (k === i ? true : s)));
    if (team[i]) onReveal(team[i], i);
    if (revealedRef.current.every(Boolean)) {
      timeoutsRef.current.push(window.setTimeout(() => finish(), 450 / speed));
    }
  }

  function startRun() {
    cancelAnimationFrame(rafRef.current);
    clearTimers();
    doneRef.current = false;
    setWon(false);
    setRunTeam([...team]);
    setRunLabel(teamLabel);
    setStopped(team.map(() => false));
    revealedRef.current = team.map(() => false);

    const faces = pool.filter((p) => p.present).length > 0 ? pool.filter((p) => p.present) : team;
    const newCells = team.map((target) => {
      const loop = loopStrip(faces);
      const others = shuffle(faces.filter((p) => p.id !== target.id));
      const fillerPool = others.length > 0 ? others : faces;
      const pre = Array.from({ length: FILLERS }, (_, i) => fillerPool[i % fillerPool.length]);
      const post = Array.from({ length: 3 }, (_, i) => fillerPool[(i + 3) % fillerPool.length]);
      return [...loop, ...pre, target, ...post];
    });
    targetRef.current = newCells.map(() => LOOP_CELLS + FILLERS);
    setCells(newCells);

    stripsRef.current.slice(0, team.length).forEach((strip) => {
      if (strip) {
        strip.style.transform = 'translateY(0px)';
        strip.style.filter = 'blur(0px)';
      }
    });

    const t0 = performance.now();
    const scale = 1 / speed;

    if (reducedMotion) {
      team.forEach((_, i) => {
        timeoutsRef.current.push(
          window.setTimeout(() => {
            const strip = stripsRef.current[i];
            if (strip) strip.style.transform = `translateY(${-(LOOP_CELLS + FILLERS - 1) * C}px)`;
            stopReel(i);
          }, i * 220 * scale),
        );
      });
      return;
    }

    team.forEach((_, i) => {
      const isLast = i === team.length - 1 && team.length > 1;
      rtRef.current[i] = {
        phase: 'spin',
        settleAt: 1.4 + 0.55 * i + (isLast ? 0.35 : 0),
        from: 0,
        final: 0,
        D: isLast ? 2.42 : 1.32,
        ease: isLast ? crawlEase : easeOutCubic,
        blur: 0,
      };
    });

    const step = (ts: number) => {
      if (doneRef.current) return;
      const t = ((ts - t0) / 1000) * speed;
      let running = false;
      for (let i = 0; i < team.length; i++) {
        const rt = rtRef.current[i];
        const strip = stripsRef.current[i];
        if (!strip || rt.phase === 'stopped') continue;
        running = true;
        if (rt.phase === 'spin') {
          const abs = spinAbs(t);
          strip.style.transform = `translateY(${-abs}px)`;
          const v = t < WOBBLE_T ? 0 : t < WOBBLE_T + RAMP_T ? V_MAX * easeOutCubic((t - WOBBLE_T) / RAMP_T) : V_MAX;
          const lvl = blurFor(v);
          if (lvl !== rt.blur) {
            rt.blur = lvl;
            strip.style.filter = `blur(${[0, 1.5, 4][lvl]}px)`;
          }
          if (t >= rt.settleAt) {
            const from = Math.max(0, spinAbs(rt.settleAt));
            const aNow = Math.floor(from / C);
            const targetA = aNow + 4 + FILLERS;
            const finalAbs = (targetA - 1) * C;
            const S = finalAbs - from;
            const baseD = Math.min(1.4, Math.max(0.8, (3 * S) / V_MAX));
            const isLastReel = i === team.length - 1 && team.length > 1;
            rt.D = isLastReel ? baseD + 1.1 : baseD;
            rt.from = from;
            rt.final = finalAbs;
            rt.phase = 'settle';
            targetRef.current[i] = targetA;
            const strip2 = cells[i] ? [...cells[i]] : null;
            if (strip2) {
              const others = shuffle((pool.length > 0 ? pool : team).filter((p) => p.present && p.id !== team[i].id));
              const fp = others.length > 0 ? others : team;
              for (let k = 0; k < FILLERS; k++) {
                const idx = targetA - FILLERS + k;
                if (idx < strip2.length) strip2[idx] = fp[k % fp.length];
              }
              strip2[targetA] = team[i];
              if (targetA + 1 < strip2.length) strip2[targetA + 1] = fp[0];
              if (targetA + 2 < strip2.length) strip2[targetA + 2] = fp[1 % fp.length];
              setCells((prev) => prev.map((row, r) => (r === i ? strip2 : row)));
            }
            sfx.play('flip');
          }
        } else if (rt.phase === 'settle') {
          const p = Math.min(1, (t - rt.settleAt) / rt.D);
          const abs = rt.from + (rt.final - rt.from) * rt.ease(p);
          strip.style.transform = `translateY(${-abs}px)`;
          const v = Math.abs(((3 * (rt.final - rt.from)) / rt.D) * Math.pow(1 - p, 2));
          const lvl = p >= 1 ? 0 : blurFor(v);
          if (lvl !== rt.blur) {
            rt.blur = lvl;
            strip.style.filter = `blur(${[0, 1.5, 4][lvl]}px)`;
          }
          if (p >= 1) stopReel(i);
        }
      }
      if (running && !doneRef.current) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  const teamKey = team.map((p) => p.id).join(',');

  useEffect(() => {
    if (n === 0) {
      startedRef.current = null;
      return;
    }
    if (startedRef.current === teamKey) return;
    startedRef.current = teamKey;
    startRun();
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      startedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey, n]);

  useEffect(() => {
    if (n > 0) sfx.play('whoosh');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team[0]?.id]);

  useImperativeHandle(ref, () => ({
    skip: () => {
      if (doneRef.current || n === 0) return;
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      targetRef.current.forEach((a, i) => {
        const strip = stripsRef.current[i];
        if (strip) {
          strip.style.transform = `translateY(${-(a - 1) * C}px)`;
          strip.style.filter = 'blur(0px)';
        }
        if (rtRef.current[i]) rtRef.current[i].phase = 'stopped';
      });
      setStopped(team.map(() => true));
      team.forEach((p, i) => {
        if (!revealedRef.current[i]) {
          revealedRef.current[i] = true;
          onReveal(p, i);
        }
      });
      finish();
    },
  }));

  const showFaces = n > 0;
  const rows = showFaces ? cells.slice(0, n) : cells;
  const allStopped = n > 0 && stopped.length === n && stopped.every(Boolean);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 p-4" data-testid="mode-slots">
      <div
        className={`relative rounded-3xl border-4 bg-[#180a38] p-4 shadow-[0_0_60px_rgba(124,58,237,0.4)] transition-colors sm:p-6 ${
          won ? 'border-[#ffc83d]' : 'border-[#7c3aed]'
        }`}
        style={{ maxWidth: 'min(96vw, 1100px)' }}
      >
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  showFaces && !allStopped
                    ? 'animate-[bulbChase_0.5s_linear_infinite] bg-[#ffd77a]'
                    : won
                      ? 'bg-[#ffc83d] shadow-[0_0_8px_#ffc83d]'
                      : 'bg-[#3d2a6b]'
                }`}
                style={showFaces && !allStopped ? { animationDelay: `${i * 0.07}s` } : undefined}
              />
            ))}
          </div>
          <span className="font-display text-[10px] tracking-widest text-[#c4b5fd]">FORTUNE CABINET</span>
        </div>

        <div className="flex gap-2 sm:gap-3" style={{ height: 3 * C + 16 }}>
          {rows.map((row, i) => (
            <div key={i} className="relative flex-1" style={{ minWidth: 56 }}>
              <div
                className={`absolute inset-0 overflow-hidden rounded-xl border-2 bg-black ${
                  showFaces && stopped[i] ? 'border-[#ffc83d]' : 'border-[#4c2f8f]'
                }`}
              >
                <div
                  ref={(el) => {
                    stripsRef.current[i] = el;
                  }}
                  className={`absolute left-0 w-full will-change-transform ${
                    !showFaces && !won ? 'animate-[attractDrift_7s_ease-in-out_infinite_alternate]' : ''
                  }`}
                  style={{ top: 0 }}
                >
                  {row.map((face, k) => (
                    <div
                      key={k}
                      className="w-full bg-cover"
                      style={{
                        height: C,
                        backgroundImage: `url("${face.photo}")`,
                        backgroundPosition: '50% 20%',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: '#12082e',
                      }}
                    />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70 opacity-70" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.10)_45%,transparent_55%)]" />
              </div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-10 -translate-y-1/2" aria-hidden>
          <div className={`h-0.5 w-full ${won ? 'bg-[#ffc83d] shadow-[0_0_14px_#ffc83d]' : 'bg-[#ff2bd6]/70'}`} />
        </div>

        <div
          className="mt-2 grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(showFaces ? n : runTeam.length || IDLE_REELS, 1)}, minmax(0, 1fr))` }}
        >
          {(showFaces ? team : runTeam).map((p, i) => {
            const person = p as Person | undefined;
            return (
              <div key={i} className="h-8 overflow-hidden text-center">
                {person && stopped[i] ? (
                  <div className="animate-[nameDrop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both] truncate px-1 text-sm font-bold text-[#ffc83d]">
                    {person.name}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {allStopped && !won ? <div className="mt-1 text-center font-display text-sm text-[#ff2bd6]">PAYLINE LOCKED</div> : null}
      </div>

      {won ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 animate-[bannerPop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both] text-center">
          <span className="font-display text-3xl text-[#ffc83d] drop-shadow-[0_0_24px_rgba(255,200,61,0.9)] sm:text-5xl">
            TEAM LOCKED: {runLabel}
          </span>
        </div>
      ) : null}

      {runTeam.length === 0 ? <div className="font-display text-sm text-[#c4b5fd]">PRESS NEXT TEAM TO SPIN</div> : null}
    </div>
  );
});
