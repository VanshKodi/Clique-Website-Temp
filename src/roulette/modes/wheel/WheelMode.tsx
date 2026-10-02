import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { Person } from '../../engine/types';
import { sfx } from '../../sfx';
import type { ModeHandle, ModeProps } from '../types';

const SPIN_BASE_MS = 3000;
const POP_MS = 480;
const BETWEEN_MS = 420;

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function mod360(a: number): number {
  return ((a % 360) + 360) % 360;
}

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [200 + r * Math.cos(rad), 200 + r * Math.sin(rad)];
}

function wedgePath(a0: number, a1: number): string {
  const [x0, y0] = polar(196, a0);
  const [x1, y1] = polar(196, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M200,200 L${x0.toFixed(2)},${y0.toFixed(2)} A196,196 0 ${large},1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
}

const WEDGE_FILLS = ['#3b1d7e', '#241056', '#4c1d6e', '#2c1460'];

export const WheelMode = forwardRef<ModeHandle, ModeProps>(function WheelMode(props, ref) {
  const { team, pool, teamLabel, speed, reducedMotion, onReveal, onDone } = props;

  const basePeople = useMemo(() => {
    const present = pool.filter((p) => p.present);
    return present.length > 0 ? present : team;
  }, [pool, team]);

  const [wheelPeople, setWheelPeople] = useState<Person[]>([]);
  const [runTeam, setRunTeam] = useState<Person[]>([]);
  const [runLabel, setRunLabel] = useState('');
  const [popped, setPopped] = useState<Person[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [won, setWon] = useState(false);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const rotationRef = useRef(0);
  const rafRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const startedRef = useRef<string | null>(null);
  const revealedRef = useRef(new Set<string>());
  const runRef = useRef<Person[]>([]);
  const wheelRefList = useRef<Person[]>([]);

  const n = wheelPeople.length;
  const W = n > 0 ? 360 / n : 360;
  const faceR = Math.min(34, Math.max(14, W * 0.9));
  const facePos = (i: number): [number, number] => [
    200 + 118 * Math.cos((((i + 0.5) * W - 90) * Math.PI) / 180),
    200 + 118 * Math.sin((((i + 0.5) * W - 90) * Math.PI) / 180),
  ];

  function clearTimers() {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }

  function pushTimer(fn: () => void, ms: number) {
    timeoutsRef.current.push(window.setTimeout(fn, Math.max(1, ms)));
  }

  function applyRotation() {
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
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

  function popWinner(person: Person, memberIdx: number, after: () => void) {
    setFlashId(person.id);
    sfx.play('clunk');
    if (popRef.current) {
      const el = popRef.current;
      el.style.backgroundImage = `url("${person.photo}")`;
      el.style.display = 'block';
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = `wheelPop ${POP_MS / speed}ms cubic-bezier(0.3,0.2,0.3,1) forwards`;
    }
      pushTimer(
        () => {
          if (doneRef.current) return;
          setFlashId(null);
          setWheelPeople((prev) => prev.filter((p) => p.id !== person.id));
          wheelRefList.current = wheelRefList.current.filter((p) => p.id !== person.id);
          setPopped((prev) => [...prev, person]);
        revealedRef.current.add(person.id);
        onReveal(person, memberIdx);
        sfx.play('pop');
        if (popRef.current) popRef.current.style.display = 'none';
        after();
      },
      (POP_MS / speed) * (reducedMotion ? 0.4 : 1),
    );
  }

  function spinTo(person: Person, memberIdx: number, wedgeIdx: number, turns: number, onLanded: () => void) {    const count = wheelRefList.current.length;
    if (count <= 1 || reducedMotion) {
      const jitter = (Math.random() * 0.7 - 0.35) * W;
      const targetLocal = wedgeIdx * W + W / 2 + jitter;
      rotationRef.current += mod360(-targetLocal - rotationRef.current);
      applyRotation();
      pushTimer(() => {
        if (!doneRef.current) popWinner(person, memberIdx, onLanded);
      }, 300 / speed);
      return;
    }
    const jitter = (Math.random() * 0.7 - 0.35) * W;
    const targetLocal = wedgeIdx * W + W / 2 + jitter;
    const delta = mod360(-targetLocal - rotationRef.current);
    const from = rotationRef.current;
    const to = from + turns * 360 + delta;
    const dur = (SPIN_BASE_MS * Math.max(0.55, 1 - 0.14 * memberIdx)) / speed;
    let start: number | null = null;
    let flickRot = 0;
    let lastIdx = Math.floor(mod360(-from) / W);

    const step = (ts: number) => {
      if (doneRef.current) return;
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const r = from + (to - from) * easeOutQuint(p);
      rotationRef.current = r;
      applyRotation();
      const idx = Math.floor(mod360(-r) / W);
      if (idx !== lastIdx) {
        lastIdx = idx;
        sfx.play('tick');
        flickRot = -14;
      }
      flickRot += (0 - flickRot) * 0.18;
      if (pointerRef.current) pointerRef.current.style.transform = `rotate(${flickRot.toFixed(2)}deg)`;
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else {
        if (pointerRef.current) pointerRef.current.style.transform = 'rotate(0deg)';
        sfx.play('clunk');
        onLanded();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function runOnce(members: Person[]) {
    const step = (i: number) => {
      if (doneRef.current) return;
      if (i >= members.length) {
        finish();
        return;
      }
      const person = members[i];
      const wedgeIdx = wheelRefList.current.findIndex((p) => p.id === person.id);
      const count = wheelRefList.current.length;
      const turns = Math.max(3, 6.5 - i * 0.7 - (count <= 3 ? 1.5 : 0) + Math.random());
      const land = () => popWinner(person, i, () => pushTimer(() => step(i + 1), BETWEEN_MS / speed));
      if (wedgeIdx < 0 || count <= 1) {
        pushTimer(land, 350 / speed);
        return;
      }
      spinTo(person, i, wedgeIdx, turns, land);
    };
    step(0);
  }

  useImperativeHandle(ref, () => ({
    skip: () => {
      if (doneRef.current || runRef.current.length === 0) return;
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      if (pointerRef.current) pointerRef.current.style.transform = 'rotate(0deg)';
      runRef.current.forEach((p, i) => {
        if (!revealedRef.current.has(p.id)) {
          revealedRef.current.add(p.id);
          onReveal(p, i);
          setWheelPeople((prev) => prev.filter((x) => x.id !== p.id));
          setPopped((prev) => (prev.find((x) => x.id === p.id) ? prev : [...prev, p]));
        }
      });
      if (popRef.current) popRef.current.style.display = 'none';
      setFlashId(null);
      finish();
    },
  }));

  const teamKey = team.map((p) => p.id).join(',');

  useEffect(() => {
    setWheelPeople((prev) => (prev.length > 0 ? prev : basePeople));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePeople]);

  useEffect(() => {
    if (team.length === 0) {
      startedRef.current = null;
      return;
    }
    if (startedRef.current === teamKey) return;
    startedRef.current = teamKey;
    doneRef.current = false;
    setWon(false);
    setPopped([]);
    setFlashId(null);
    revealedRef.current = new Set();
    runRef.current = [...team];
    setRunTeam([...team]);
    setRunLabel(teamLabel);
    const wheels = basePeople.length > 0 ? [...basePeople] : [...team];
    wheelRefList.current = wheels;
    setWheelPeople(wheels);
    requestAnimationFrame(() => runOnce([...team]));
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      startedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey, team.length]);

  const idle = runTeam.length === 0;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden p-4" data-testid="mode-wheel">
      <div className="relative" style={{ width: 'min(70vh, 540px)', aspectRatio: '1' }}>
        <div
          ref={wheelRef}
          className="absolute inset-0 will-change-transform"
          style={{
            animation: idle && !won ? 'wheelIdleSpin 44s linear infinite' : undefined,
            filter: 'drop-shadow(0 0 30px rgba(124,58,237,0.45))',
          }}
        >
          <svg viewBox="0 0 400 400" className="h-full w-full">
            <defs>
              {wheelPeople.map((p, i) => {
                const [cx, cy] = facePos(i);
                return (
                  <clipPath key={`c-${p.id}`} id={`clip-face-${p.id}`}>
                    <circle cx={cx} cy={cy} r={faceR} />
                  </clipPath>
                );
              })}
            </defs>
            <circle cx="200" cy="200" r="198" fill="#180a38" stroke="#ffc83d" strokeWidth="4" />
            {wheelPeople.map((p, i) => {
              const [cx, cy] = facePos(i);
              return (
                <g key={p.id}>
                  <path
                    d={wedgePath(i * W, (i + 1) * W)}
                    fill={flashId === p.id ? '#ffc83d' : WEDGE_FILLS[i % WEDGE_FILLS.length]}
                    stroke="#0b0618"
                    strokeWidth="2"
                  />
                  <image
                    href={p.photo}
                    clipPath={`url(#clip-face-${p.id})`}
                    x={cx - faceR}
                    y={cy - faceR}
                    width={faceR * 2}
                    height={faceR * 2}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={flashId === p.id ? 1 : 0.95}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={faceR + 2}
                    fill="none"
                    stroke={flashId === p.id ? '#fff' : '#ffc83d'}
                    strokeWidth="3"
                  />
                </g>
              );
            })}
            <circle cx="200" cy="200" r="34" fill="#180a38" stroke="#ffc83d" strokeWidth="3" />
            <text x="200" y="212" textAnchor="middle" fontSize="30" fill="#ff2bd6" fontFamily="Bungee, sans-serif">
              ◆
            </text>
          </svg>
        </div>

        <div
          ref={pointerRef}
          className="absolute left-1/2 top-[-14px] z-10 -translate-x-1/2"
          style={{ transformOrigin: '50% 8px' }}
          aria-hidden
        >
          <svg width="44" height="46" viewBox="0 0 44 46">
            <polygon points="2,2 42,2 22,42" fill="#ffc83d" stroke="#0b0618" strokeWidth="2" />
            <circle cx="22" cy="10" r="5" fill="#ff2bd6" />
          </svg>
        </div>

        <div
          ref={popRef}
          className="pointer-events-none absolute left-1/2 top-[6%] z-20 hidden h-24 w-24 -translate-x-1/2 rounded-full border-4 border-white bg-cover shadow-[0_0_30px_rgba(255,255,255,0.7)]"
          style={{ backgroundPosition: '50% 20%' }}
          aria-hidden
        />
      </div>

      <div className="flex min-h-7 flex-wrap items-center justify-center gap-2">
        {popped.map((p) => (
          <span
            key={p.id}
            className="animate-[nameDrop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both] rounded-full border border-[#ffc83d]/60 bg-black/50 px-2.5 py-1 text-xs font-bold text-[#ffc83d]"
          >
            {p.name}
          </span>
        ))}
        {idle ? <span className="font-display text-sm text-[#c4b5fd]">PRESS NEXT TEAM</span> : null}
      </div>

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
