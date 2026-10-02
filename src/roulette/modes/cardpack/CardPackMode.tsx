import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { Person } from '../../engine/types';
import { sfx } from '../../sfx';
import type { ModeHandle, ModeProps } from '../types';

const SHAKE_MS = 700;
const OPEN_MS = 450;
const FAN_MS = 550;
const FLIP_MS = 620;
const FLIP_SETTLE_MS = 560;

type Phase = 'idle' | 'shake' | 'open' | 'fan' | 'flip' | 'won';

export const CardPackMode = forwardRef<ModeHandle, ModeProps>(function CardPackMode(props, ref) {
  const { team, teamLabel, speed, reducedMotion, onReveal, onDone } = props;

  const [phase, setPhase] = useState<Phase>('idle');
  const [flipped, setFlipped] = useState(0);
  const [runTeam, setRunTeam] = useState<Person[]>([]);
  const [runLabel, setRunLabel] = useState('');

  const timeoutsRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const startedRef = useRef<string | null>(null);
  const revealedRef = useRef(new Set<string>());
  const runRef = useRef<Person[]>([]);

  const scale = reducedMotion ? 0.3 : 1;

  function clearTimers() {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }

  function pushTimer(fn: () => void, ms: number) {
    timeoutsRef.current.push(window.setTimeout(fn, Math.max(1, ms)));
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('won');
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

  function runOnce(members: Person[]) {
    const s = speed;
    setPhase('shake');
    pushTimer(() => {
      if (doneRef.current) return;
      setPhase('open');
      sfx.play('flip');
    }, (SHAKE_MS / s) * scale);
    pushTimer(() => {
      if (doneRef.current) return;
      setPhase('fan');
      sfx.play('whoosh');
    }, ((SHAKE_MS + OPEN_MS) / s) * scale);
    const fanEnd = ((SHAKE_MS + OPEN_MS + FAN_MS) / s) * scale;
    members.forEach((p, i) => {
      pushTimer(
        () => {
          if (doneRef.current) return;
          setFlipped(i + 1);
          sfx.play('pop');
          pushTimer(
            () => {
              if (doneRef.current) return;
              revealedRef.current.add(p.id);
              onReveal(p, i);
            },
            (FLIP_SETTLE_MS / s) * scale,
          );
        },
        fanEnd + (i * FLIP_MS) / s * scale,
      );
    });
    pushTimer(finish, fanEnd + ((members.length - 1) * FLIP_MS + 950) / s * scale);
  }

  useImperativeHandle(ref, () => ({
    skip: () => {
      if (doneRef.current || runRef.current.length === 0) return;
      clearTimers();
      setPhase('fan');
      setFlipped(runRef.current.length);
      runRef.current.forEach((p, i) => {
        if (!revealedRef.current.has(p.id)) {
          revealedRef.current.add(p.id);
          onReveal(p, i);
        }
      });
      finish();
    },
  }));

  const teamKey = team.map((p) => p.id).join(',');
  const n = team.length;

  useEffect(() => {
    if (n === 0) {
      startedRef.current = null;
      return;
    }
    if (startedRef.current === teamKey) return;
    startedRef.current = teamKey;
    doneRef.current = false;
    setFlipped(0);
    revealedRef.current = new Set();
    runRef.current = [...team];
    setRunTeam([...team]);
    setRunLabel(teamLabel);
    runOnce([...team]);
    return () => {
      clearTimers();
      startedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey, n]);

  const idle = runTeam.length === 0;
  const showCards = phase === 'fan' || phase === 'flip' || phase === 'won';
  const cardCount = runTeam.length || team.length || 4;
  const fanStep = cardCount > 1 ? Math.min(7, 42 / (cardCount - 1)) : 0;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden p-4" data-testid="mode-cardpack">
      {idle || phase === 'shake' || phase === 'open' ? (
        <div className="relative" style={{ perspective: 1200 }}>
          <div
            className={`relative h-64 w-48 overflow-hidden rounded-2xl border-4 border-[#ffc83d] shadow-[0_0_50px_rgba(255,200,61,0.45),0_0_90px_rgba(255,43,214,0.3)] ${
              phase === 'shake' ? 'animate-[packShake_steps(12,end)_both]' : 'animate-[packFloat_3s_ease-in-out_infinite]'
            }`}
            style={{ animationDuration: phase === 'shake' ? `${SHAKE_MS / speed}ms` : undefined }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(145deg,#3b1d7e_0%,#180a38_55%,#4c1d6e_100%)]" />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent_0_10px,rgba(255,43,214,0.14)_10px_20px)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-7xl text-[#ffc83d] drop-shadow-[0_0_18px_rgba(255,200,61,0.8)]">?</span>
            </div>
            <div className="absolute inset-x-4 bottom-4 text-center font-display text-[10px] tracking-widest text-[#c4b5fd]">
              TEAM PACK
            </div>
            {phase === 'open' ? (
              <>
                <div className="absolute inset-0 z-10 animate-[tearTop_0.45s_ease-in_forwards] bg-[linear-gradient(145deg,#3b1d7e,#180a38)]" />
                <div className="absolute inset-x-0 top-1/2 z-20 h-px animate-[packFlash_0.4s_ease-out_forwards] bg-white shadow-[0_0_30px_10px_rgba(255,255,255,0.8)]" />
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {showCards ? (
        <div className="relative flex items-end justify-center" style={{ perspective: 1400 }}>
          {runTeam.map((p, i) => {
            const isFlipped = i < flipped;
            const rot = (i - (runTeam.length - 1) / 2) * fanStep;
            const tx = (i - (runTeam.length - 1) / 2) * 18;
            const ty = Math.abs(i - (runTeam.length - 1) / 2) * 6;
            return (
              <div
                key={p.id}
                className="relative"
                style={{
                  marginLeft: i === 0 ? 0 : -14,
                  width: 'clamp(96px, 12vw, 148px)',
                  animation: `cardFanIn ${FAN_MS / speed}ms cubic-bezier(0.2,0.9,0.3,1.15) both`,
                  animationDelay: `${(i * 70) / speed}ms`,
                  zIndex: isFlipped ? 20 : 10 + i,
                }}
              >
                <div style={{ transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)` }}>
                  <div
                    className="relative aspect-[3/4] w-full"
                    style={{
                      transformStyle: 'preserve-3d',
                      transition: `transform ${FLIP_SETTLE_MS / speed}ms cubic-bezier(0.4,0,0.2,1)`,
                      transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
                    }}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-xl border-2 border-[#ffc83d]/80 shadow-[0_8px_24px_rgba(0,0,0,0.55)] [backface-visibility:hidden]">
                      <img
                        src={p.photo || undefined}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: '50% 20%' }}
                        draggable={false}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1.5 pt-4 text-center text-xs font-bold text-[#ffc83d]">
                        {isFlipped ? p.name : ''}
                      </div>
                      {isFlipped ? (
                        <div
                          className="pointer-events-none absolute inset-0 animate-[cardSweep_0.55s_ease-out_forwards]"
                          style={{ animationDelay: '0.1s' }}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div
                      className="absolute inset-0 overflow-hidden rounded-xl border-2 border-[#7c3aed] shadow-[0_8px_24px_rgba(0,0,0,0.55)] [backface-visibility:hidden]"
                      style={{ transform: 'rotateY(180deg)' }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(145deg,#3b1d7e,#180a38_60%,#4c1d6e)]" />
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent_0_8px,rgba(255,43,214,0.16)_8px_16px)]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-4xl text-[#ff2bd6]/80">◆</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {idle ? <div className="font-display text-sm text-[#c4b5fd]">PRESS NEXT TEAM</div> : null}

      {phase === 'won' ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 animate-[bannerPop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both] text-center">
          <span className="font-display text-3xl text-[#ffc83d] drop-shadow-[0_0_24px_rgba(255,200,61,0.9)] sm:text-5xl">
            TEAM LOCKED: {runLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
});
