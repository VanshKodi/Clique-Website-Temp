import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Bodies, Body, Composite, Engine, type Body as MBody } from 'matter-js';
import type { Person } from '../../engine/types';
import { sfx } from '../../sfx';
import { easeOutCubic } from '../../lib/anim';
import type { ModeHandle, ModeProps } from '../types';

const W = 720;
const H = 540;
const CX = 360;
const CY = 320;
const R_VIS = 210;
const WALL_R = 197;
const WALL_N = 30;
const WALL_SR = 13;
const MOUTH = { x: 360, y: 122 };
const TUBE_TOP = { x: 360, y: 58 };
const POP_GAP = 800;
const POP_DUR = 700;
const FIRST_POP = 750;

interface Entry {
  person: Person;
  body: MBody;
  popped: boolean;
  tween: { fromX: number; fromY: number; start: number; dur: number } | null;
}

interface DrumWorld {
  engine: Engine;
  entries: Entry[];
  poppedCount: number;
}

const imgCache = new Map<string, HTMLImageElement>();

function getImg(src: string): HTMLImageElement {
  let img = imgCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imgCache.set(src, img);
  }
  return img;
}

function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function ballRadius(n: number): number {
  const raw = Math.sqrt((0.24 * (WALL_R - WALL_SR) * (WALL_R - WALL_SR)) / Math.max(1, n));
  return Math.min(34, Math.max(14, raw));
}

function sunflower(n: number, radius: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = radius * Math.sqrt((i + 0.5) / n);
    const theta = i * 2.399963229728653;
    pts.push({ x: CX + r * Math.cos(theta), y: CY + r * Math.sin(theta) });
  }
  return pts;
}

function tubePos(t: number, fromX: number, fromY: number): { x: number; y: number; scale: number } {
  if (t < 0.5) {
    const u = easeOutCubic(t / 0.5) * 0.5 + (t / 0.5) * 0.5;
    const p0x = fromX;
    const p0y = fromY;
    const p1x = fromX;
    const p1y = MOUTH.y;
    const p2x = MOUTH.x;
    const p2y = MOUTH.y;
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    return {
      x: a * p0x + b * p1x + c * p2x,
      y: a * p0y + b * p1y + c * p2y,
      scale: 1 + 0.18 * Math.sin(Math.PI * u),
    };
  }
  const u = (t - 0.5) / 0.5;
  const e = easeOutCubic(u);
  return {
    x: MOUTH.x,
    y: MOUTH.y + (TUBE_TOP.y - MOUTH.y) * e,
    scale: 1 + 0.4 * Math.sin(Math.PI * u),
  };
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  r: number,
  person: Person,
  scale: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const img = person.photo ? getImg(person.photo) : null;
  const hasImg = Boolean(img && img.complete && img.naturalWidth > 0);

  if (hasImg && img) {
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    let sx = 0;
    let sy = 0;
    let sw = iw;
    let sh = ih;
    if (iw > ih) {
      sw = ih;
      sx = (iw - ih) / 2;
    } else {
      sh = iw;
      sy = (ih - iw) * 0.15;
    }
    ctx.drawImage(img, sx, sy, sw, sh, -r, -r, r * 2, r * 2);
    ctx.restore();
  } else {
    const hue = hueOf(person.id);
    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, `hsl(${hue} 70% 45%)`);
    grad.addColorStop(1, `hsl(${(hue + 60) % 360} 75% 30%)`);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = '#f4f1ff';
    ctx.font = `bold ${Math.round(r * 0.8)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initialsOf(person.name), 0, 1);
  }

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(124,58,237,0.95)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.35, r * 0.55, Math.PI * 1.05, Math.PI * 1.65);
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke();
  ctx.restore();
}

export const LotteryMode = forwardRef<ModeHandle, ModeProps>(function LotteryMode(props, ref) {
  const { team, pool, teamLabel, speed, reducedMotion, onReveal, onDone } = props;

  const basePeople = useMemo(() => {
    const present = pool.filter((p) => p.present);
    const list = present.length > 0 ? present : team;
    const seen = new Set<string>();
    return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [pool, team]);

  const [runTeam, setRunTeam] = useState<Person[]>([]);
  const [runLabel, setRunLabel] = useState('');
  const [drawn, setDrawn] = useState<Person[]>([]);
  const [ticker, setTicker] = useState('');
  const [won, setWon] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<DrumWorld | null>(null);
  const staticPtsRef = useRef<{ x: number; y: number }[]>([]);
  const rafRef = useRef(0);
  const loopRef = useRef(false);
  const scaleRef = useRef({ sx: 1, sy: 1 });
  const accRef = useRef(0);
  const blowRef = useRef(0);
  const lastTsRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const startedRef = useRef<string | null>(null);
  const revealedRef = useRef(new Set<string>());
  const runRef = useRef<Person[]>([]);
  const speedRef = useRef(speed);
  speedRef.current = speed;

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

  function stopLoop() {
    loopRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    stopLoop();
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

  function popReveal(person: Person, idx: number) {
    if (revealedRef.current.has(person.id)) return;
    revealedRef.current.add(person.id);
    onReveal(person, idx);
    setDrawn((prev) => (prev.some((p) => p.id === person.id) ? prev : [...prev, person]));
    sfx.play('pop');
    say(`${person.name.split(' ')[0]} pops out!`);
    const w = worldRef.current;
    if (w) w.poppedCount += 1;
    if (runRef.current.length > 0 && runRef.current.every((p) => revealedRef.current.has(p.id))) {
      pushTimer(finish, 650 / speedRef.current);
    }
  }

  function startPop(person: Person, idx: number) {
    const w = worldRef.current;
    if (!w || doneRef.current) return;
    const entry = w.entries.find((e) => e.person.id === person.id && !e.popped && !e.tween);
    if (reducedMotion || !entry) {
      if (entry) {
        Composite.remove(w.engine.world, entry.body);
        entry.popped = true;
      }
      drawOnce();
      popReveal(person, idx);
      return;
    }
    Composite.remove(w.engine.world, entry.body);
    entry.tween = { fromX: entry.body.position.x, fromY: entry.body.position.y, start: performance.now(), dur: POP_DUR / speedRef.current };
  }

  function buildWorld(people: Person[]): DrumWorld {
    const engine = Engine.create();
    const R = WALL_R;
    const walls: MBody[] = [];
    for (let i = 0; i < WALL_N; i++) {
      const a = (i / WALL_N) * Math.PI * 2;
      walls.push(
        Bodies.circle(CX + R * Math.cos(a), CY + R * Math.sin(a), WALL_SR, {
          isStatic: true,
          restitution: 0.3,
          friction: 0.2,
        }),
      );
    }
    const n = people.length;
    const br = ballRadius(n);
    const pts = sunflower(n, WALL_R - WALL_SR - br - 4);
    staticPtsRef.current = pts;
    const entries: Entry[] = people.map((person, i) => {
      const body = Bodies.circle(pts[i].x, pts[i].y, br, {
        restitution: 0.6,
        friction: 0.04,
        frictionAir: 0.015,
        density: 0.001,
      });
      Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 });
      return { person, body, popped: false, tween: null };
    });
    Composite.add(engine.world, [...walls, ...entries.map((e) => e.body)]);
    return { engine, entries, poppedCount: 0 };
  }

  function applyBlows(world: DrumWorld) {
    const live = world.entries.filter((e) => !e.popped && !e.tween);
    if (live.length === 0) return;
    const kicks = 1 + Math.floor(Math.random() * 2);
    for (let k = 0; k < kicks; k++) {
      const e = live[Math.floor(Math.random() * live.length)];
      const b = e.body;
      let fx: number;
      let fy: number;
      if (Math.random() < 0.75) {
        fx = (Math.random() - 0.5) * 1.4;
        fy = -(0.6 + Math.random() * 0.9);
      } else {
        const dx = b.position.x - CX;
        const dy = b.position.y - CY;
        const len = Math.max(1, Math.hypot(dx, dy));
        fx = -dy / len;
        fy = dx / len;
      }
      const mag = Math.hypot(fx, fy) || 1;
      const F = b.mass * 0.0075;
      Body.applyForce(b, b.position, { x: (fx / mag) * F, y: (fy / mag) * F });
    }
  }

  function drawScene(ctx: CanvasRenderingContext2D, now: number) {
    const w = worldRef.current;
    if (!w) return;
    const { sx, sy } = scaleRef.current;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const glass = ctx.createRadialGradient(CX - 70, CY - 90, 40, CX, CY, R_VIS + 10);
    glass.addColorStop(0, 'rgba(124,58,237,0.22)');
    glass.addColorStop(0.75, 'rgba(18,8,46,0.55)');
    glass.addColorStop(1, 'rgba(11,6,24,0.85)');
    ctx.beginPath();
    ctx.arc(CX, CY, R_VIS, 0, Math.PI * 2);
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(124,58,237,0.9)';
    ctx.stroke();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(244,241,255,0.16)';
    ctx.beginPath();
    ctx.arc(CX, CY, R_VIS - 14, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(124,58,237,0.9)';
    ctx.beginPath();
    ctx.moveTo(MOUTH.x - 40, MOUTH.y + 8);
    ctx.lineTo(MOUTH.x - 40, TUBE_TOP.y - 6);
    ctx.moveTo(MOUTH.x + 40, MOUTH.y + 8);
    ctx.lineTo(MOUTH.x + 40, TUBE_TOP.y - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(MOUTH.x, TUBE_TOP.y - 6, 40, 10, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,200,61,0.75)';
    ctx.stroke();

    const br = ballRadius(Math.max(1, w.entries.length));
    for (const e of w.entries) {
      if (e.popped || e.tween) continue;
      const p = w.engine ? e.body.position : { x: 0, y: 0 };
      drawBall(ctx, p.x, p.y, e.body.angle, br, e.person, 1);
    }

    for (const e of w.entries) {
      if (!e.tween) continue;
      const t = Math.min(1, (now - e.tween.start) / e.tween.dur);
      const pos = tubePos(t, e.tween.fromX, e.tween.fromY);
      drawBall(ctx, pos.x, pos.y, e.body.angle, br, e.person, pos.scale);
      if (t >= 1) {
        e.tween = null;
        e.popped = true;
        popReveal(e.person, runRef.current.findIndex((p) => p.id === e.person.id));
      }
    }
  }

  function drawOnce() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    updateScale();
    drawScene(ctx, performance.now());
  }

  function updateScale() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    scaleRef.current = { sx: canvas.width / W, sy: canvas.height / H };
  }

  function stepLoop(ts: number) {
    if (!loopRef.current) return;
    rafRef.current = requestAnimationFrame(stepLoop);
    const w = worldRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!w || !ctx) return;
    const real = lastTsRef.current ? ts - lastTsRef.current : 16;
    lastTsRef.current = ts;
    accRef.current += Math.min(60, real) * speedRef.current;
    let steps = 0;
    while (accRef.current >= 16.67 && steps < 8) {
      Engine.update(w.engine, 16.67);
      accRef.current -= 16.67;
      steps++;
      blowRef.current += 16.67;
      if (blowRef.current >= 150) {
        blowRef.current = 0;
        applyBlows(w);
      }
    }
    for (const e of w.entries) {
      if (e.popped) continue;
      const v = e.body.velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > 9) Body.setVelocity(e.body, { x: (v.x / sp) * 9, y: (v.y / sp) * 9 });
    }
    drawScene(ctx, ts);
  }

  function ensureLoop() {
    if (reducedMotion || doneRef.current || loopRef.current) return;
    loopRef.current = true;
    lastTsRef.current = 0;
    accRef.current = 0;
    rafRef.current = requestAnimationFrame(stepLoop);
  }

  useImperativeHandle(ref, () => ({
    skip: () => {
      if (doneRef.current || runRef.current.length === 0) return;
      clearTimers();
      stopLoop();
      runRef.current.forEach((p, i) => {
        if (revealedRef.current.has(p.id)) return;
        revealedRef.current.add(p.id);
        onReveal(p, i);
        setDrawn((prev) => (prev.some((d) => d.id === p.id) ? prev : [...prev, p]));
      });
      const w = worldRef.current;
      if (w) {
        for (const e of w.entries) {
          if (runRef.current.some((p) => p.id === e.person.id)) {
            Composite.remove(w.engine.world, e.body);
            e.popped = true;
            e.tween = null;
          }
        }
      }
      drawOnce();
      finish();
    },
  }));

  const peopleKey = basePeople.map((p) => p.id).join(',');

  useEffect(() => {
    const people = basePeople;
    if (people.length === 0) return;
    const world = buildWorld(people);
    worldRef.current = world;
    doneRef.current = false;

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    let ro: ResizeObserver | null = null;
    if (canvas && wrap) {
      const fit = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = wrap.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        updateScale();
      };
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(wrap);
    }
    drawOnce();
    if (!reducedMotion) ensureLoop();

    return () => {
      stopLoop();
      ro?.disconnect();
      clearTimers();
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleKey, reducedMotion]);

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
    setDrawn([]);
    setTicker('');
    revealedRef.current = new Set();
    runRef.current = [...team];
    setRunTeam([...team]);
    setRunLabel(teamLabel);
    ensureLoop();
    if (reducedMotion) {
      say('Drawing lots…');
      team.forEach((p, i) => {
        pushTimer(() => startPop(p, i), (500 + i * 320) / speed);
      });
    } else {
      say('The drum is tumbling…');
      team.forEach((p, i) => {
        pushTimer(() => startPop(p, i), (FIRST_POP + i * POP_GAP) / speed);
      });
    }
    return () => {
      clearTimers();
      startedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey, team.length]);

  const idle = runTeam.length === 0;
  const totalBalls = basePeople.length;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden p-4" data-testid="mode-lottery">
      <div
        className="relative aspect-[4/3] w-full max-w-3xl"
        ref={wrapRef}
        aria-label={`Lottery drum with ${totalBalls} balls`}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>

      <div
        className="min-h-6 rounded-full border border-[#7c3aed]/50 bg-black/50 px-5 py-1 text-center text-sm font-bold text-[#22d3ee]"
        aria-live="polite"
      >
        {ticker}
      </div>

      {drawn.length > 0 ? (
        <div className="flex items-center gap-2" aria-label="Drawn balls">
          {drawn.map((p) =>
            p.photo ? (
              <img
                key={p.id}
                src={p.photo}
                alt={p.name}
                title={p.name}
                className="h-8 w-8 rounded-full border-2 border-[#ffc83d] object-cover shadow-[0_0_10px_rgba(255,200,61,0.6)]"
              />
            ) : (
              <span
                key={p.id}
                title={p.name}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#ffc83d] bg-[#7c3aed]/70 text-xs font-bold text-white"
              >
                {initialsOf(p.name)}
              </span>
            ),
          )}
        </div>
      ) : null}

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
