import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FilmGrain } from '../components/FilmGrain';
import { Footer } from '../components/Footer';
import { Logo } from '../components/Logo';
import { fireConfetti } from '../lib/confetti';
import { BidArt, ClueCardArt, FightArt, SpiderDoodle } from '../components/ZoneArt';
import { HeroBanner } from '../components/HeroBanner';
import { GAUNTLET_META } from '../lib/content';
import { GAUNTLET_REFERRALS } from '../lib/members';
import { buildIcosahedron, drawIcosahedron, sizeCanvasToDisplay } from '../lib/icosahedron';
import { getStoredAccent } from '../hooks/useAccent';
import { isGauntletSheetConfigured, submitGauntletRegistration } from '../lib/eventRegistration';
import { useMagnetic } from '../hooks/useMagnetic';
import { useScramble } from '../hooks/useScramble';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mono: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: '0.18em',
};

// Same scan order as JoinPage: bright label > dim placeholder > typed text.
const fieldLabel: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: '0.14em',
  fontSize: 12,
  fontWeight: 500,
  color: '#F5F3F0',
  display: 'block',
  marginBottom: 10,
};

// Pixel-consistent with JoinPage's inputStyle — don't re-derive.
const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#0B0B0B',
  border: '1px dashed #FFFFFF33',
  borderRadius: 12,
  color: '#F5F3F0',
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 15,
  padding: '13px 16px',
  outline: 'none',
};

const BURST_CLIP =
  'polygon(50% 0%, 61% 12%, 75% 5%, 79% 19%, 94% 18%, 92% 32%, 100% 40%, 92% 50%, 100% 60%, 92% 68%, 94% 82%, 79% 81%, 75% 95%, 61% 88%, 50% 100%, 39% 88%, 25% 95%, 21% 81%, 6% 82%, 8% 68%, 0% 60%, 8% 50%, 0% 40%, 8% 32%, 6% 18%, 21% 19%, 25% 5%, 39% 12%)';

interface Round {
  id: string;
  chip: string;
  chipColor: string;
  title: string;
  tag: string;
  body: string;
  points: string;
  quirkClass: string;
  art: React.ComponentType<{ size?: number }>;
}

const ROUNDS: Round[] = [
  {
    id: 'ff',
    chip: 'FAMILY FEUD × WHO AM I',
    chipColor: 'var(--accent)',
    title: 'Zone 01 — Family Feud × Who Am I',
    tag: 'survey says… ✦',
    body: 'Survey-style showdown meets guess-who chaos — rank the top answers, then figure out who you are from the clues stuck on your back.',
    points: '≈ 15 MIN',
    quirkClass: 'g-quirk-blob',
    art: ClueCardArt,
  },
  {
    id: 'bw',
    chip: 'BIDDING WAR',
    chipColor: 'var(--lime)',
    title: 'Zone 02 — Bidding War',
    tag: 'numbers go up ✦',
    body: 'Pockets deep. Nerves deeper. Highest number takes it — or does it?',
    points: '≈ 15 MIN',
    quirkClass: 'g-quirk-flip',
    art: BidArt,
  },
  {
    id: 'tk',
    chip: 'TEKKEN-STYLE FIGHT',
    chipColor: 'var(--pink)',
    title: 'Zone 03 — Tekken-Style Fight',
    tag: 'round 1… fight! ✦',
    body: 'Pick your fighter, read your opponent, and take it to the next round — combos, counters and one perfect KO.',
    points: '≈ 10 MIN',
    quirkClass: 'g-quirk-hop',
    art: FightArt,
  },
];

// Same [threshold, label] shape as AURA_RANKS in JoinPage — we pick one at
// random for the player ticket instead of scoring it.
const RANKS: [number, string][] = [
  [1, 'CERTIFIED FROLIC EXPERT ✦'],
  [0.8, 'CHIEF VIBE OFFICER'],
  [0.6, 'PLAYTIME ENTHUSIAST'],
  [0.4, 'SNACK-BREAK PRO'],
  [0.2, 'HIDE-AND-SEEK ROOKIE'],
  [0, 'PROFESSIONAL NAPPER'],
];

const HEADLINE = 'Your invite to game night.';
const splitWords = (s: string) => s.split(' ');

const SENDING_LINES = ['SEALING YOUR ENTRY…', 'INKING THE TICKET…', 'WARMING UP THE CROWD…'];

const TICKER: { text: string; color: string }[] = [
  { text: 'FAMILY FEUD × WHO AM I', color: 'var(--accent)' },
  { text: 'BIDDING WAR', color: 'var(--lime)' },
  { text: 'TEKKEN-STYLE FIGHT', color: 'var(--pink)' },
  { text: 'JUST FOR FUN', color: 'var(--lime)' },
  { text: 'TUE · SEP 29', color: 'var(--accent)' },
  { text: 'CR-4 · IMNU', color: 'var(--pink)' },
];

function MetaPill({ children }: { children: string }) {
  return (
    <span
      style={{
        ...mono,
        fontSize: 11,
        color: '#F5F3F0',
        border: '1px dashed #FFFFFF33',
        borderRadius: 100,
        padding: '8px 16px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function RoundCard({ round }: { round: Round }) {
  const [flipped, setFlipped] = useState(false);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  };

  return (
    <div
      className={`${round.quirkClass} g-zone`}
      style={{
        border: '1px dashed #FFFFFF33',
        borderRadius: 22,
        background: '#FFFFFF08',
        backdropFilter: 'blur(14px)',
        minHeight: 260,
        position: 'relative',
        perspective: 1200,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={`${round.title} — flip for the rules`}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={onKey}
        className={`g-flip${flipped ? ' is-flipped' : ''}`}
      >
        {/* front — the design */}
        <div className="g-face">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <span
              style={{
                ...mono,
                fontSize: 10,
                color: '#0B0B0B',
                background: round.chipColor,
                border: '2px solid #0B0B0B',
                boxShadow: '3px 3px 0 #00000080',
                borderRadius: 100,
                padding: '6px 12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {round.chip}
            </span>
            <round.art size={76} />
          </div>
          <h3
            className="glitch-name"
            style={{ margin: 0, fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 19, lineHeight: 1.3 }}
          >
            {round.title}
          </h3>
          <p
            style={{
              margin: 0,
              fontFamily: "'Shantell Sans', cursive",
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.5,
              color: round.chipColor,
            }}
          >
            {round.tag}
          </p>
          <div style={{ marginTop: 'auto', ...mono, fontSize: 9, color: '#6E6862' }}>HOVER / TAP — SEE THE RULES →</div>
        </div>

        {/* back — the details */}
        <div className="g-face g-face-back">
          <div style={{ ...mono, fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {round.chip}
            <span style={{ flex: 1, height: 1, background: '#FFFFFF14' }} />
          </div>
          <p style={{ margin: 0, color: '#F5F3F0', fontSize: 15, lineHeight: 1.65, flex: 1 }}>{round.body}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                ...mono,
                fontSize: 11,
                color: 'var(--lime)',
                border: '1px dashed #FFFFFF33',
                borderRadius: 100,
                padding: '7px 14px',
                display: 'inline-block',
              }}
            >
              {round.points}
            </span>
            <span style={{ ...mono, fontSize: 9, color: '#6E6862' }}>← BACK</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fill-o-meter donut: tracks how much of the form is filled, but never sits
// still — the needle wobbles ±3% around the true value on a rAF loop, with a
// slow-spinning dashed orbit ring. Motion-heavy on purpose.
function HypeDonut({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(valueRef.current);
      return;
    }
    let raf = 0;
    let cur = 0;
    const tick = (t: number) => {
      const s = t / 1000;
      const wobble = Math.sin(s * 2.4) * 0.028 + Math.sin(s * 6.1 + 1.3) * 0.014;
      const target = Math.min(1, Math.max(0, valueRef.current + wobble));
      cur += (target - cur) * 0.08;
      setDisplay(cur);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const R = 52;
  const C = 2 * Math.PI * R;
  const pct = Math.round(display * 100);
  const status = value >= 1 ? 'LOCKED IN ✦' : value >= 0.5 ? 'COOKING…' : value > 0 ? 'WARMING UP' : 'EMPTY';
  const statusColor = value >= 1 ? '#4DE8FF' : value >= 0.5 ? '#38BDF8' : '#9A948C';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={{ ...mono, fontSize: 10, color: '#6E6862' }}>FILL-O-METER</span>
      <div style={{ position: 'relative', width: 132, height: 132 }}>
        <svg viewBox="0 0 132 132" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="hypeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: '#4DE8FF' }} />
              <stop offset="55%" style={{ stopColor: '#38BDF8' }} />
              <stop offset="100%" style={{ stopColor: '#2563EB' }} />
            </linearGradient>
          </defs>
          {/* slow-spinning dashed orbit */}
          <circle
            className="g-hype-orbit"
            cx="66"
            cy="66"
            r="62"
            fill="none"
            stroke="#FFFFFF2A"
            strokeWidth="1.5"
            strokeDasharray="4 9"
            strokeLinecap="round"
          />
          {/* track */}
          <circle cx="66" cy="66" r={R} fill="none" stroke="#FFFFFF14" strokeWidth="11" />
          {/* wobbling value arc */}
          <circle
            cx="66"
            cy="66"
            r={R}
            fill="none"
            stroke="url(#hypeGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - display)}
            transform="rotate(-90 66 66)"
            style={{ filter: 'drop-shadow(0 0 8px rgba(77, 232, 255, 0.65))' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 24, lineHeight: 1, color: '#F5F3F0' }}>
            {pct}
            <span style={{ fontSize: 13 }}>%</span>
          </span>
        </div>
      </div>
      <span style={{ ...mono, fontSize: 10, color: statusColor }}>{status}</span>
    </div>
  );
}

export function GauntletPage() {
  const successRef = useRef<HTMLHeadingElement>(null);
  const icoCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const burstWrapRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ name: '', email: '' });
  const [referral, setReferral] = useState('');
  const [refOpen, setRefOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [sendLine, setSendLine] = useState(0);
  const [ticket, setTicket] = useState<{ id: number; rank: string } | null>(null);

  useScramble(successRef, "You're in.");
  useMagnetic();

  // gradient scroll-progress bar at the top, same as home
  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.width = `${max > 0 ? Math.min(1, window.scrollY / max) * 100 : 0}%`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // burst + sticker drift toward the cursor (like the hero shape follows on home)
  useEffect(() => {
    const burst = burstWrapRef.current;
    if (!burst) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: PointerEvent) => {
      const px = e.clientX / window.innerWidth - 0.5;
      const py = e.clientY / window.innerHeight - 0.5;
      burst.style.translate = `${px * 26}px ${py * 20}px`;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // slow-spinning wireframe icosahedron behind the hero, same renderer as home/join
  useEffect(() => {
    const canvas = icoCanvasRef.current;
    if (!canvas) return;
    const ico = buildIcosahedron();
    sizeCanvasToDisplay(canvas);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rot = 0.8;
    let raf = 0;
    const draw = () => {
      if (canvas.width > 2) {
        drawIcosahedron(ico, canvas, rot, { color: getStoredAccent(), scale: 0.3, rings: true, explode: 0.12, tilt: 0.2 });
      }
    };
    if (reduce) {
      draw();
      return;
    }
    const tick = () => {
      rot += 0.004;
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => sizeCanvasToDisplay(canvas);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (status !== 'sending') return;
    const t = window.setInterval(() => setSendLine((i) => (i + 1) % SENDING_LINES.length), 500);
    return () => window.clearInterval(t);
  }, [status]);

  const nameOk = form.name.trim().length > 1;
  const emailOk = EMAIL_RE.test(form.email.trim());
  const referralOk = referral.trim().length > 1;
  // drives the fill-o-meter donut next to the form — name + email carry it, referral tops it off
  const fillScore = (nameOk ? 0.45 : 0) + (emailOk ? 0.45 : 0) + (referralOk ? 0.1 : 0);

  // searchable junior roster for the referral field — type a few letters, pick a name
  const refMatches = GAUNTLET_REFERRALS.filter((m) => m.name.toLowerCase().includes(referral.trim().toLowerCase()));

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nameOk) errs.name = 'we need a name bestie';
    if (!emailOk) errs.email = 'that email looks sus';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (status === 'sending') return;
    if (!validate()) return;
    setStatus('sending');
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      referral: referral.trim(),
    };
    try {
      await Promise.all([submitGauntletRegistration(payload), new Promise((r) => setTimeout(r, 1400))]);
      const id = Math.floor(100 + Math.random() * 900);
      const rank = RANKS[Math.floor(Math.random() * RANKS.length)][1];
      setTicket({ id, rank });
      setStatus('done');
      fireConfetti("YOU'RE IN ✦");
    } catch {
      setStatus('idle');
      setErrors({ submit: 'network said no — try again in a sec' });
    }
  };

  const errText = (key: string) =>
    errors[key] ? (
      <div style={{ ...mono, fontSize: 10, color: 'var(--pink)', marginTop: 6 }}>{errors[key].toUpperCase()}</div>
    ) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0B0B',
        color: '#F5F3F0',
        fontFamily: "'Space Grotesk', sans-serif",
        overflowX: 'clip',
        position: 'relative',
      }}
    >
      <FilmGrain />
      {/* halftone dot layer — page-wide, same layering idea as FilmGrain */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.55,
          backgroundImage: 'radial-gradient(#FFFFFF1A 1px, transparent 1.4px)',
          backgroundSize: '16px 16px',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-10%',
          left: '10%',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 16%, transparent), transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        .g-quirk-blob:hover .g-quirk-inner { transform: scale(1.18, 0.8); }
        .g-quirk-flip { perspective: 600px; }
        .g-quirk-flip:hover .g-quirk-inner { transform: rotateY(180deg); }
        .g-quirk-hop:hover .g-quirk-inner { transform: translateY(-10px) rotate(-8deg); }
        .g-burst { animation: bob 2.2s ease-in-out infinite alternate; }
        .g-spider { transform-origin: top center; animation: spiderSwing 6s ease-in-out infinite; }
        @keyframes spiderSwing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .g-cta { animation: pulseGlow 2.8s ease-in-out infinite; }
        .g-hype-orbit { transform-box: fill-box; transform-origin: center; animation: hypeSpin 14s linear infinite; }
        @keyframes hypeSpin { to { transform: rotate(360deg); } }
        .g-zone { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s, box-shadow 0.3s; }
        .g-zone:hover {
          transform: translateY(-6px);
          border-color: color-mix(in oklab, var(--accent) 55%, transparent);
          box-shadow: 0 18px 50px #00000066;
        }
        .g-flip {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
          cursor: pointer;
        }
        .g-flip.is-flipped { transform: rotateY(180deg); }
        @media (hover: hover) {
          .g-zone:hover .g-flip { transform: rotateY(180deg); }
        }
        .g-flip:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 22px; }
        .g-face {
          position: absolute;
          inset: 0;
          box-sizing: border-box;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 22px;
        }
        .g-face-back { transform: rotateY(180deg); background: #141414; }
        .g-ref-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
        @media (max-width: 480px) {
          .g-ref-grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .g-quirk-inner { transition: none !important; transform: none !important; }
          .g-burst, .g-cta, .g-ticker-track, .g-hype-orbit { animation: none !important; }
          .g-spider { animation: none !important; }
          .g-zone { transition: none !important; }
          .g-zone:hover { transform: none !important; }
          .g-flip { transition: none !important; }
        }
      `}</style>

      {/* top bar */}
      <div
        data-mpad="true"
        style={{
          padding: '22px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 12 }} aria-label="CLIQUE — home">
          <Logo size={30} withWordmark wordmarkSize={15} />
          <span data-mhide="true" style={{ ...mono, fontSize: 10, color: '#6E6862' }}>
            {GAUNTLET_META.issue}
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/join" className="hover-accent" style={{ ...mono, fontSize: 11, color: '#9A948C', textDecoration: 'none' }}>
            ← JOIN
          </Link>
          <a
            href="#register"
            data-magnet="true"
            style={{
              ...mono,
              fontSize: 11,
              fontWeight: 500,
              color: '#0B0B0B',
              background: 'var(--lime)',
              padding: '10px 20px',
              borderRadius: 100,
              textDecoration: 'none',
              display: 'inline-block',
              willChange: 'translate',
            }}
          >
            REGISTER →
          </a>
        </div>
      </div>

      <main data-mpad="true" style={{ maxWidth: 980, margin: '0 auto', padding: 'clamp(12px, 4vh, 44px) 32px 70px 32px', boxSizing: 'border-box', position: 'relative', zIndex: 2 }}>
        {/* spinning wireframe backdrop for the hero */}
        <div
          data-mhide="true"
          aria-hidden
          style={{
            position: 'absolute',
            top: '-4%',
            right: '-10%',
            width: 'min(42vw, 540px)',
            height: 'min(42vw, 540px)',
            opacity: 0.5,
            pointerEvents: 'none',
            animation: 'floatA 16s ease-in-out infinite',
          }}
        >
          <canvas ref={icoCanvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
        {/* spider doodle hanging in the hero */}
        <div
          data-mhide="true"
          aria-hidden
          className="g-spider"
          style={{
            position: 'absolute',
            top: 110,
            right: '2%',
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        >
          <SpiderDoodle size={64} />
        </div>
        {/* hero */}
        <div style={{ ...mono, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
          {GAUNTLET_META.issue}
          <span style={{ width: 34, height: 1, background: '#3A3630', display: 'inline-block' }} />
          FRIENDS ONLY · MOCK RUN
          <span style={{ animation: 'blink 1.1s step-end infinite' }}>_</span>
          {!isGauntletSheetConfigured() && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6E6862', border: '1px dashed #FFFFFF33', borderRadius: 100, padding: '4px 10px' }}>
              DEMO MODE
            </span>
          )}
        </div>

        <div style={{ position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
          <h1
            style={{
              margin: '20px 0 8px 0',
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(38px, 7vw, 88px)',
              lineHeight: 1.02,
              letterSpacing: '-0.01em',
              maxWidth: 760,
            }}
          >
            {splitWords(HEADLINE).map((word, wi) => (
              <span key={wi} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.08em', marginRight: '0.28em' }}>
                {word.split('').map((ch, ci) => (
                  <span
                    key={ci}
                    style={{
                      display: 'inline-block',
                      animation: `heroRise 0.85s cubic-bezier(0.22, 1, 0.36, 1) ${(wi * 0.14 + ci * 0.045).toFixed(3)}s both`,
                      color: word === 'night.' ? 'var(--accent)' : word === 'invite' ? 'var(--lime)' : undefined,
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <div
            style={{
              position: 'absolute',
              top: -14,
              right: -16,
              rotate: '8deg',
              background: 'var(--lime)',
              color: '#0B0B0B',
              fontFamily: "'Shantell Sans', cursive",
              fontWeight: 700,
              fontSize: 13,
              padding: '7px 14px',
              borderRadius: 100,
              border: '2px solid #0B0B0B',
              boxShadow: '4px 4px 0 #00000080',
              animation: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ display: 'inline-block', animation: 'wiggle 3s ease-in-out infinite' }}>good vibes · good times ✦</span>
          </div>
        </div>

        <p style={{ margin: '12px 0 22px 0', maxWidth: 560, color: '#9A948C', fontSize: 16, lineHeight: 1.65 }}>
          CLIQUE&apos;s game night — Fall Guys chaos, a Jeopardy board and beer pong with a twist across three play
          zones. No eliminations, no pressure — just good chaos.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
          <MetaPill>{`◷ ${GAUNTLET_META.date}`}</MetaPill>
          <MetaPill>{`◎ ${GAUNTLET_META.venue}`}</MetaPill>
          <MetaPill>{`✦ ${GAUNTLET_META.format}`}</MetaPill>
        </div>

        <div ref={burstWrapRef} style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 54 }}>
          {/* comic impact burst — pure CSS, no image asset */}
          <div
            aria-hidden
            className="g-burst"
            style={{
              width: 92,
              height: 92,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--pink)',
              clipPath: BURST_CLIP,
              rotate: '12deg',
              color: '#0B0B0B',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.08em',
              textAlign: 'center',
              lineHeight: 1.1,
              padding: 18,
              boxSizing: 'border-box',
            }}
          >
            LVL UP
          </div>
        </div>

        <HeroBanner delay={0} />

        {/* marquee strip */}
        <div
          style={{
            borderTop: '1px dashed #FFFFFF1F',
            borderBottom: '1px dashed #FFFFFF1F',
            overflow: 'hidden',
            background: '#111111',
            padding: '12px 0',
            margin: '0 0 54px 0',
          }}
        >
          <div
            className="g-ticker-track"
            style={{
              display: 'flex',
              width: 'max-content',
              animation: 'ticker 26s linear infinite',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              letterSpacing: '0.24em',
              color: '#9A948C',
              whiteSpace: 'nowrap',
            }}
          >
            {[0, 1].map((copy) => (
              <span key={copy} style={{ paddingRight: 24 }}>
                {TICKER.map((item, i) => (
                  <span key={i}>
                    {item.text} <span style={{ color: item.color }}>✦</span>{' '}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* rounds */}
        <div style={{ ...mono, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          THE LINEUP
          <span style={{ flex: 1, height: 1, background: '#FFFFFF14' }} />
          <span style={{ fontSize: 9, color: '#6E6862' }}>HOVER / TAP A CARD →</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 60 }}>
          {ROUNDS.map((round, i) => (
            <div
              key={round.id}
              style={{ animation: 'fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both', animationDelay: `${0.15 + i * 0.12}s` }}
            >
              <RoundCard round={round} />
            </div>
          ))}
        </div>

        {/* register */}
        <div id="register" style={{ scrollMarginTop: 90 }}>
          {status !== 'done' ? (
            <div
              style={{
                border: '1px solid #FFFFFF14',
                borderRadius: 22,
                background: '#FFFFFF08',
                backdropFilter: 'blur(14px)',
                padding: 'clamp(22px, 4vw, 40px)',
                position: 'relative',
                animation: 'fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both',
              }}
            >
              <div style={{ position: 'absolute', top: 12, right: 18, ...mono, fontSize: 10, color: '#4A443C' }}>
                IGNUS_v1.0 · PLAYGROUND (trust)
              </div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 18px 0' }}>
                PLAY PASS
                <span style={{ flex: 1, height: 1, background: '#FFFFFF14' }} />
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', margin: '0 0 26px 0' }}>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <h2 style={{ margin: '0 0 8px 0', fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.1 }}>
                    Claim your spot.
                  </h2>
                  <p style={{ margin: 0, color: '#9A948C', fontSize: 15, lineHeight: 1.65, maxWidth: 480 }}>
                    Just your name, your email, and who told you about us. Takes 10 seconds — the fun lasts way
                    longer.
                  </p>
                </div>
                <HypeDonut value={fillScore} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
                <div>
                  <label style={fieldLabel}>FULL NAME *</label>
                  <input value={form.name} onChange={set('name')} placeholder="your name" maxLength={60} className="join-input" style={inputStyle} />
                  {errText('name')}
                </div>
                <div>
                  <label style={fieldLabel}>EMAIL *</label>
                  <input value={form.email} onChange={set('email')} placeholder="you@nirmauni.ac.in" type="email" maxLength={80} className="join-input" style={inputStyle} />
                  {errText('email')}
                </div>
              </div>

              <div style={{ marginTop: 16, position: 'relative' }}>
                <label style={fieldLabel}>HOW DID YOU HEAR ABOUT US?</label>
                <input
                  value={referral}
                  onChange={(e) => {
                    setReferral(e.target.value);
                    setRefOpen(true);
                  }}
                  onFocus={() => setRefOpen(true)}
                  onBlur={() => window.setTimeout(() => setRefOpen(false), 120)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setRefOpen(false);
                  }}
                  placeholder="search a member's name… e.g. Harsh"
                  maxLength={60}
                  autoComplete="off"
                  className="join-input"
                  style={inputStyle}
                />
                {refOpen && refMatches.length > 0 && (
                  <div
                    className="g-ref-grid"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 5,
                      marginTop: 8,
                      background: '#141414',
                      border: '1px solid #FFFFFF1F',
                      borderRadius: 12,
                      overflowY: 'auto',
                      maxHeight: 224,
                      padding: 6,
                      boxShadow: '0 12px 40px #000000AA',
                    }}
                  >
                    {refMatches.map((m) => (
                      <button
                        key={m.slug}
                        type="button"
                        onMouseDown={() => {
                          setReferral(m.name);
                          setRefOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          padding: '10px 12px',
                          color: '#F5F3F0',
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 14,
                          textAlign: 'left',
                        }}
                      >
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {errText('submit')}

              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 34, flexWrap: 'wrap' }}>
                <button
                  onClick={submit}
                  disabled={status === 'sending'}
                  data-magnet="true"
                  className="g-cta"
                  style={{
                    cursor: 'pointer',
                    background: 'var(--accent)',
                    color: '#0B0B0B',
                    border: 'none',
                    ...mono,
                    fontSize: 13,
                    fontWeight: 500,
                    padding: '17px 36px',
                    borderRadius: 100,
                    willChange: 'translate',
                    opacity: status === 'sending' ? 0.75 : 1,
                    minWidth: 260,
                  }}
                >
                  {status === 'sending' ? SENDING_LINES[sendLine] : 'LOCK IN MY SPOT →'}
                </button>
                <span style={{ ...mono, fontSize: 10, color: '#6E6862' }}>NO SPAM. ONLY BANGERS.</span>
              </div>
            </div>
          ) : (
            /* ticket confirmation */
            <div style={{ textAlign: 'center', paddingTop: '2vh' }}>
              <div
                style={{
                  width: 'fit-content',
                  margin: '0 auto 26px auto',
                  rotate: '-3deg',
                  background: 'var(--lime)',
                  color: '#0B0B0B',
                  fontFamily: "'Shantell Sans', cursive",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '8px 16px',
                  borderRadius: 100,
                  border: '2px solid #0B0B0B',
                  boxShadow: '4px 4px 0 #00000080',
                  animation: 'fadeUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
                }}
              >
                play pass: stamped ✦
              </div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--lime)', marginBottom: 24 }}>
                STATUS: LOCKED IN ✦ TICKET #{ticket?.id}
              </div>
              <h1
                ref={successRef}
                style={{
                  margin: 0,
                  fontFamily: "'Unbounded', sans-serif",
                  fontWeight: 900,
                  fontSize: 'clamp(38px, 7vw, 84px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                }}
              >
                You&apos;re in.
              </h1>
              <p style={{ margin: '24px auto 36px auto', maxWidth: 440, color: '#9A948C', fontSize: 16, lineHeight: 1.65 }}>
                Flash this ticket at the gate. {GAUNTLET_META.venue} — don&apos;t be late, the games wait for no
                one.
              </p>
              {/* player ticket */}
              <div
                style={{
                  margin: '0 auto 40px auto',
                  maxWidth: 520,
                  background: '#F5F3F0',
                  color: '#0B0B0B',
                  borderRadius: 18,
                  border: '2px solid #0B0B0B',
                  boxShadow: '6px 6px 0 #00000080',
                  overflow: 'hidden',
                  textAlign: 'left',
                  rotate: '-1deg',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 20px',
                    background: '#0B0B0B',
                    color: 'var(--lime)',
                    ...mono,
                    fontSize: 11,
                  }}
                >
                  <span>★ ADMIT ONE — IGNUS</span>
                  <span>#{ticket?.id}</span>
                </div>
                <div style={{ padding: '20px 22px', display: 'grid', gap: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.06em' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ color: '#6E6862' }}>PLAYER</span>
                    <span style={{ fontWeight: 700 }}>{form.name.trim().toUpperCase() || 'YOU'}</span>
                  </div>
                  <div style={{ borderTop: '2px dashed #0B0B0B33', marginTop: 6, paddingTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ color: '#6E6862' }}>RANK</span>
                    <span style={{ fontWeight: 700 }}>{ticket?.rank}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  to="/"
                  data-magnet="true"
                  style={{
                    background: 'var(--lime)',
                    color: '#0B0B0B',
                    ...mono,
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    padding: '16px 32px',
                    borderRadius: 100,
                    display: 'inline-block',
                    willChange: 'translate',
                  }}
                >
                  BACK TO THE LORE ←
                </Link>
                <Link
                  to="/join"
                  data-magnet="true"
                  style={{
                    border: '1px dashed #FFFFFF33',
                    color: '#F5F3F0',
                    ...mono,
                    fontSize: 13,
                    textDecoration: 'none',
                    padding: '16px 32px',
                    borderRadius: 100,
                    display: 'inline-block',
                    willChange: 'translate',
                  }}
                >
                  JOIN CLIQUE →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
