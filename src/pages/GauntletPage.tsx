import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FilmGrain } from '../components/FilmGrain';
import { Footer } from '../components/Footer';
import { Logo } from '../components/Logo';
import { fireConfetti } from '../lib/confetti';
import { BidArt, ClueCardArt, FightArt, SpiderDoodle } from '../components/ZoneArt';
import ignusRemastered from '../assets/banner/ignus-remastered.png';
import ignusPosterFull from '../assets/banner/ignus-poster-full.png';
import { GAUNTLET_META } from '../lib/content';
import { GAUNTLET_REFERRALS } from '../lib/members';
import { buildIcosahedron, drawIcosahedron, sizeCanvasToDisplay } from '../lib/icosahedron';
import { isGauntletSheetConfigured, submitGauntletRegistration } from '../lib/eventRegistration';
import { useMagnetic } from '../hooks/useMagnetic';
import { useScramble } from '../hooks/useScramble';

// IGNUS forge palette — scoped to /gauntlet only, so the rest of CLIQUE keeps
// its black/cyan std theme. Ember orange = primary, molten gold = secondary,
// inferno red = danger/fight.
const IGNUS = {
  ember: '#FF6B1A',
  gold: '#FFC93C',
  inferno: '#FF3D2E',
  blood: '#C1121F',
  coal: '#160603',
  ash: '#F5EDE4',
} as const;

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

// IGNUS inputs — forge coal, ember dashed border.
const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#1A0805',
  border: '1px dashed #FF6B1A44',
  borderRadius: 12,
  color: '#F5EDE4',
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
    chip: 'FEUD × WHO AM I',
    chipColor: IGNUS.gold,
    title: 'Zone 01 — Family Feud × Who Am I',
    tag: 'survey says… forge your answer ✦',
    body: 'Survey-style showdown meets guess-who chaos — rank the top answers, then figure out who you are from the clues stuck on your back. Wrong guess? Into the forge.',
    points: '≈ 15 MIN · KINDLING',
    quirkClass: 'g-quirk-blob',
    art: ClueCardArt,
  },
  {
    id: 'tk',
    chip: 'TEKKEN FIGHT',
    chipColor: IGNUS.inferno,
    title: 'Zone 02 — Tekken-Style Fight',
    tag: 'round 1… fight! ✦',
    body: 'Pick your fighter, read your opponent, and take it to the next round in the pit — combos, counters and one perfect KO to claim the flame.',
    points: '≈ 10 MIN · BLAZE',
    quirkClass: 'g-quirk-hop',
    art: FightArt,
  },
  {
    id: 'bw',
    chip: 'BIDDING WAR',
    chipColor: IGNUS.ember,
    title: 'Zone 03 — Bidding War',
    tag: 'raise the flame ✦',
    body: 'Pockets deep. Nerves deeper. Bid ember-coins for the relic — highest flame takes it. Overspend and you get burned.',
    points: '≈ 15 MIN · STOKE',
    quirkClass: 'g-quirk-flip',
    art: BidArt,
  },
];

// Same [threshold, label] shape as AURA_RANKS in JoinPage — we pick one at
// random for the forge ticket instead of scoring it.
const RANKS: [number, string][] = [
  [1, 'FLAMEKEEPER SUPREME ✦'],
  [0.8, 'EMBER ARCHITECT'],
  [0.6, 'FORGE REGULAR'],
  [0.4, 'KINDLING CARRIER'],
  [0.2, 'SPARK SEEKER'],
  [0, 'COLD HANDS, WARM HEART'],
];

const HEADLINE = 'Enter the forge.';
const splitWords = (s: string) => s.split(' ');

const SENDING_LINES = ['STOKING THE FORGE…', 'POURING THE EMBER…', 'STAMPING YOUR PASS…'];

const TICKER: { text: string; color: string }[] = [
  { text: 'EMBER TRIAL', color: IGNUS.ember },
  { text: 'FAMILY FEUD × WHO AM I', color: IGNUS.gold },
  { text: 'TEKKEN-STYLE FIGHT', color: IGNUS.inferno },
  { text: 'BIDDING WAR', color: IGNUS.ember },
  { text: 'FORGED IN FIRE', color: IGNUS.gold },
  { text: 'SAT · OCT 3', color: IGNUS.ember },
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
        border: `1px dashed ${round.chipColor}55`,
        borderRadius: 22,
        background: `linear-gradient(180deg, ${round.chipColor}14, #FFFFFF08 55%)`,
        backdropFilter: 'blur(14px)',
        minHeight: 320,
        position: 'relative',
        perspective: 1200,
        overflow: 'hidden',
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
                color: '#1A0A06',
                background: round.chipColor,
                border: '2px solid #1A0A06',
                boxShadow: '3px 3px 0 #00000080',
                borderRadius: 100,
                padding: '6px 12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                maxWidth: 'calc(100% - 86px)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {round.chip}
            </span>
            <span style={{ flexShrink: 0, display: 'inline-flex' }}>
              <round.art size={72} />
            </span>
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

        {/* back — the trial rules */}
        <div className="g-face g-face-back" style={{ background: '#1F0B06' }}>
          <div
            style={{
              ...mono,
              fontSize: 9,
              color: round.chipColor,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              wordBreak: 'break-word',
            }}
          >
            <span style={{ minWidth: 0 }}>{round.chip}</span>
            <span style={{ flex: '1 0 24px', height: 1, background: '#FFFFFF14' }} />
          </div>
          <p style={{ margin: 0, color: '#F5EDE4', fontSize: 14, lineHeight: 1.6, flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {round.body}
          </p>
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

// Forge-o-meter donut (IGNUS): tracks how much of the form is filled —
// ember wobble ±3%, slow-spinning dashed orbit. Motion-heavy on purpose.
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
  const status = value >= 1 ? 'FORGED ✦' : value >= 0.5 ? 'HEATING…' : value > 0 ? 'KINDLING' : 'COLD FORGE';
  const statusColor = value >= 1 ? IGNUS.gold : value >= 0.5 ? IGNUS.ember : '#9A948C';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={{ ...mono, fontSize: 10, color: '#6E6862' }}>FORGE-O-METER</span>
      <div style={{ position: 'relative', width: 132, height: 132 }}>
        <svg viewBox="0 0 132 132" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="hypeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: IGNUS.gold }} />
              <stop offset="55%" style={{ stopColor: IGNUS.ember }} />
              <stop offset="100%" style={{ stopColor: IGNUS.blood }} />
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
            style={{ filter: 'drop-shadow(0 0 8px rgba(255, 107, 26, 0.65))' }}
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

  // slow-spinning ember wireframe behind the hero — IGNUS forge, not CLIQUE cyan
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
        drawIcosahedron(ico, canvas, rot, { color: IGNUS.ember, scale: 0.3, rings: true, explode: 0.12, tilt: 0.2 });
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
      style={
        {
          minHeight: '100vh',
          background: `radial-gradient(1200px 600px at 85% -10%, #3A0E04 0%, transparent 60%), radial-gradient(900px 500px at 0% 20%, #2A0A05 0%, transparent 55%), radial-gradient(700px 700px at 50% 110%, #4A0F06 0%, transparent 60%), ${IGNUS.coal}`,
          color: IGNUS.ash,
          fontFamily: "'Space Grotesk', sans-serif",
          overflow: 'clip',
          position: 'relative',
          // scope IGNUS vars so every var(--accent/lime/pink) inside = forge palette
          '--accent': IGNUS.ember,
          '--lime': IGNUS.gold,
          '--pink': IGNUS.inferno,
        } as CSSProperties
      }
    >
      <FilmGrain />
      {/* ember dust layer + forge glow — replaces CLIQUE halftone/cyan glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.5,
          backgroundImage: 'radial-gradient(#FF6B1A22 1px, transparent 1.6px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-10%',
          left: '10%',
          width: 560,
          height: 560,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #FF6B1A2E, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #C1121F33, transparent 70%)',
          filter: 'blur(80px)',
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
        .g-face-back { transform: rotateY(180deg); background: #1F0B06; }
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
              fontWeight: 700,
              color: '#1A0A06',
              background: 'linear-gradient(135deg, #FFC93C, #FF6B1A)',
              padding: '10px 20px',
              borderRadius: 100,
              textDecoration: 'none',
              display: 'inline-block',
              willChange: 'translate',
              boxShadow: '0 0 18px #FF6B1A44',
            }}
          >
            ENTER FORGE →
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
        {/* hero — IGNUS forge trial */}
        <div style={{ ...mono, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
          {GAUNTLET_META.issue}
          <span style={{ width: 34, height: 1, background: '#FF6B1A66', display: 'inline-block' }} />
          FORGE TRIAL · FRIENDS ONLY
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
                      color: word === 'forge.' ? 'var(--accent)' : word === 'the' ? 'var(--lime)' : undefined,
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
              background: 'linear-gradient(135deg, #FFC93C, #FF6B1A)',
              color: '#1A0A06',
              fontFamily: "'Shantell Sans', cursive",
              fontWeight: 700,
              fontSize: 13,
              padding: '7px 14px',
              borderRadius: 100,
              border: '2px solid #1A0A06',
              boxShadow: '4px 4px 0 #00000080, 0 0 22px #FF6B1A55',
              animation: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ display: 'inline-block', animation: 'wiggle 3s ease-in-out infinite' }}>forged in fire ✦</span>
          </div>
        </div>

        <p style={{ margin: '12px 0 22px 0', maxWidth: 580, color: '#C9BBAE', fontSize: 16, lineHeight: 1.65 }}>
          Step into the forge — three ember trials: a Family Feud × Who Am I kindling round, an ember-coin
          Bidding War stoke, and a Tekken-style blaze in the pit. No eliminations, no pressure — feed the flame.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
          <MetaPill>{`◷ ${GAUNTLET_META.date}`}</MetaPill>
          <MetaPill>{`◎ ${GAUNTLET_META.venue}`}</MetaPill>
          <MetaPill>{`✦ ${GAUNTLET_META.format}`}</MetaPill>
        </div>

        <div ref={burstWrapRef} style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 54 }}>
          {/* forge burst — pure CSS, no image asset */}
          <div
            aria-hidden
            className="g-burst"
            style={{
              width: 96,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #FFC93C, #FF6B1A 55%, #C1121F)',
              clipPath: BURST_CLIP,
              rotate: '12deg',
              color: '#1A0A06',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.08em',
              textAlign: 'center',
              lineHeight: 1.1,
              padding: 18,
              boxSizing: 'border-box',
              boxShadow: '0 0 28px #FF6B1A55',
            }}
          >
            FORGE
          </div>
          <div style={{ ...mono, fontSize: 11, color: '#C9BBAE', letterSpacing: '0.18em' }}>
            THREE TRIALS · ONE FLAME
          </div>
        </div>

        {/* NEW POSTER DROP — IGNUS remastered banner (old HeroBanner moved to bottom) */}
        <div
          style={{
            border: '1px dashed #FF6B1A44',
            borderRadius: 22,
            overflow: 'hidden',
            background: '#1F0B06',
            marginBottom: 54,
            boxShadow: '0 18px 60px #00000088, 0 0 40px #FF6B1A22',
          }}
        >
          <img
            src={ignusRemastered}
            alt="IGNUS — Clique game night banner"
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
          />
        </div>

        {/* marquee strip — ember */}
        <div
          style={{
            borderTop: '1px dashed #FF6B1A44',
            borderBottom: '1px dashed #FF6B1A44',
            overflow: 'hidden',
            background: 'linear-gradient(90deg, #1F0B06, #2A0E06 50%, #1F0B06)',
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

        {/* trials */}
        <div style={{ ...mono, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          THE THREE FORGES
          <span style={{ flex: 1, height: 1, background: '#FF6B1A33' }} />
          <span style={{ fontSize: 9, color: '#8A7A6E' }}>HOVER / TAP A CARD →</span>
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

        {/* register — forge entry */}
        <div id="register" style={{ scrollMarginTop: 90 }}>
          {status !== 'done' ? (
            <div
              style={{
                border: '1px solid #FF6B1A33',
                borderRadius: 22,
                background: 'linear-gradient(180deg, #2A0E06, #1A0805)',
                backdropFilter: 'blur(14px)',
                padding: 'clamp(22px, 4vw, 40px)',
                position: 'relative',
                animation: 'fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both',
                boxShadow: '0 18px 60px #00000088, inset 0 1px 0 #FF6B1A22',
              }}
            >
              <div style={{ position: 'absolute', top: 12, right: 18, ...mono, fontSize: 10, color: '#8A6A55' }}>
                IGNUS_v1.0 · FORGE ENTRY
              </div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 18px 0' }}>
                FORGE PASS
                <span style={{ flex: 1, height: 1, background: '#FF6B1A33' }} />
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', margin: '0 0 26px 0' }}>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <h2 style={{ margin: '0 0 8px 0', fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.1 }}>
                    Claim your ember.
                  </h2>
                  <p style={{ margin: 0, color: '#C9BBAE', fontSize: 15, lineHeight: 1.65, maxWidth: 480 }}>
                    Just your name, your email, and who led you to the flame. Takes 10 seconds — the forge
                    remembers longer.
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
                    background: 'linear-gradient(135deg, #FFC93C, #FF6B1A 60%, #C1121F)',
                    color: '#1A0A06',
                    border: '2px solid #1A0A06',
                    ...mono,
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '17px 36px',
                    borderRadius: 100,
                    willChange: 'translate',
                    opacity: status === 'sending' ? 0.75 : 1,
                    minWidth: 260,
                    boxShadow: '4px 4px 0 #00000080, 0 0 26px #FF6B1A55',
                  }}
                >
                  {status === 'sending' ? SENDING_LINES[sendLine] : 'ENTER THE FORGE →'}
                </button>
                <span style={{ ...mono, fontSize: 10, color: '#8A7A6E' }}>NO SPAM. ONLY EMBERS.</span>
              </div>
            </div>
          ) : (
            /* ticket confirmation — forged */
            <div style={{ textAlign: 'center', paddingTop: '2vh' }}>
              <div
                style={{
                  width: 'fit-content',
                  margin: '0 auto 26px auto',
                  rotate: '-3deg',
                  background: 'linear-gradient(135deg, #FFC93C, #FF6B1A)',
                  color: '#1A0A06',
                  fontFamily: "'Shantell Sans', cursive",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '8px 16px',
                  borderRadius: 100,
                  border: '2px solid #1A0A06',
                  boxShadow: '4px 4px 0 #00000080, 0 0 22px #FF6B1A55',
                  animation: 'fadeUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
                }}
              >
                forge pass: stamped ✦
              </div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--lime)', marginBottom: 24 }}>
                STATUS: FORGED ✦ TICKET #{ticket?.id}
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
              <p style={{ margin: '24px auto 36px auto', maxWidth: 440, color: '#C9BBAE', fontSize: 16, lineHeight: 1.65 }}>
                Flash this ticket at the forge gate. {GAUNTLET_META.venue} — don&apos;t be late, the flame waits
                for no one.
              </p>
              {/* player ticket — ember */}
              <div
                style={{
                  margin: '0 auto 40px auto',
                  maxWidth: 520,
                  background: '#F5EDE4',
                  color: '#1A0A06',
                  borderRadius: 18,
                  border: '2px solid #1A0A06',
                  boxShadow: '6px 6px 0 #00000080, 0 0 32px #FF6B1A33',
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
                    background: 'linear-gradient(90deg, #1A0805, #4A0F06)',
                    color: '#FFC93C',
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

        {/* IGNUS poster — flattened full-dimension image so mobile just scales it like the top banner */}
        <div
          style={{
            marginTop: 60,
            border: '1px dashed #FFFFFF33',
            borderRadius: 22,
            overflow: 'hidden',
            background: '#0A0406',
          }}
        >
          <img
            src={ignusPosterFull}
            alt="IGNUS poster — Iron Man, Spider-Man, Dr Doom, Thor, Iron Man, Cap"
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
          />
        </div>
      </main>

      {/* footer stays on CLIQUE std theme — reset the scoped IGNUS vars here */}
      <div
        style={
          {
            position: 'relative',
            zIndex: 2,
            background: '#0B0B0B',
            borderTop: '1px dashed #FFFFFF1F',
            '--accent': '#4DE8FF',
            '--lime': '#CDFF4D',
            '--pink': '#FF6FB5',
          } as CSSProperties
        }
      >
        <Footer />
      </div>
    </div>
  );
}
