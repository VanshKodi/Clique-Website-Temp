import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FilmGrain } from '../components/FilmGrain';
import { Footer } from '../components/Footer';
import { Logo } from '../components/Logo';
import { fireConfetti } from '../lib/confetti';
import { AmuletArt, BidArt, ClueCardArt, FightArt } from '../components/ZoneArt';
import ignusRemastered from '../assets/banner/ignus-remastered.png';
import ignusPosterFull from '../assets/banner/ignus-poster-full.png';
import { GAUNTLET_META } from '../lib/content';
import { GAUNTLET_REFERRALS } from '../lib/members';
import { buildIcosahedron, drawIcosahedron, sizeCanvasToDisplay } from '../lib/icosahedron';
import { isGauntletSheetConfigured, submitGauntletRegistration } from '../lib/eventRegistration';
import { useMagnetic } from '../hooks/useMagnetic';
import { useScramble } from '../hooks/useScramble';

// DOOM vault palette (green, first poster) — scoped to /gauntlet only, so the
// rest of CLIQUE keeps its black/cyan std theme. Rune emerald = primary, Doom
// gold = secondary, venom lime = fight.
const IGNUS = {
  ember: '#4ADE80',
  gold: '#E7C44A',
  inferno: '#A3E635',
  blood: '#14532D',
  coal: '#07120C',
  ash: '#EAF6EC',
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

// Vault inputs — deep moss, rune dashed border.
const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#0A1A10',
  border: '1px dashed #4ADE8044',
  borderRadius: 12,
  color: '#EAF6EC',
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
    tag: 'survey says… seal the sigil ✦',
    body: 'Survey-style showdown meets guess-who chaos — rank the top answers, then figure out who you are from the clues stuck on your back. Wrong guess? The cloak takes you.',
    points: '≈ 15 MIN · CANTRIP',
    quirkClass: 'g-quirk-blob',
    art: ClueCardArt,
  },
  {
    id: 'tk',
    chip: 'TEKKEN FIGHT',
    chipColor: IGNUS.inferno,
    title: 'Zone 02 — Tekken-Style Fight',
    tag: 'round 1… fight! ✦',
    body: 'Pick your fighter, read your opponent, and take it to the next round in the arena — combos, counters and one perfect KO to claim Doom’s favor.',
    points: '≈ 10 MIN · HEX',
    quirkClass: 'g-quirk-hop',
    art: FightArt,
  },
  {
    id: 'bw',
    chip: 'BIDDING WAR',
    chipColor: IGNUS.ember,
    title: 'Zone 03 — Bidding War',
    tag: 'raise the runes ✦',
    body: 'Pockets deep. Nerves deeper. Bid rune-shards for the relic — highest seal takes it. Overspend and the spell backfires.',
    points: '≈ 15 MIN · RITUAL',
    quirkClass: 'g-quirk-flip',
    art: BidArt,
  },
];

// Same [threshold, label] shape as AURA_RANKS in JoinPage — we pick one at
// random for the vault ticket instead of scoring it.
const RANKS: [number, string][] = [
  [1, 'DOOM’S CHOSEN ✦'],
  [0.8, 'CLOAKBEARER'],
  [0.6, 'RUNE KEEPER'],
  [0.4, 'VAULT INITIATE'],
  [0.2, 'CURIOUS APPRENTICE'],
  [0, 'LATVERIAN TOURIST'],
];

const HEADLINE = 'Enter the sanctum.';
const splitWords = (s: string) => s.split(' ');

const SENDING_LINES = ['CONSULTING THE ORACLE…', 'ETCHING THE RUNES…', 'SEALING YOUR FATE…'];

const TICKER: { text: string; color: string }[] = [
  { text: 'DOOM DECREE', color: IGNUS.ember },
  { text: 'FAMILY FEUD × WHO AM I', color: IGNUS.gold },
  { text: 'TEKKEN-STYLE FIGHT', color: IGNUS.inferno },
  { text: 'BIDDING WAR', color: IGNUS.ember },
  { text: 'WEAVE THE SPELL', color: IGNUS.gold },
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
                color: '#07130D',
                background: round.chipColor,
                border: '2px solid #07130D',
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
          <p style={{ margin: 0, color: '#EAF6EC', fontSize: 14, lineHeight: 1.6, flex: 1, overflowY: 'auto', minHeight: 0 }}>
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

// Rune-o-meter donut (DOOM): tracks how much of the form is filled —
// rune wobble ±3%, slow-spinning dashed orbit. Motion-heavy on purpose.
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
  const status = value >= 1 ? 'BOUND ✦' : value >= 0.5 ? 'AWAKENING…' : value > 0 ? 'STIRRING' : 'DORMANT';
  const statusColor = value >= 1 ? IGNUS.gold : value >= 0.5 ? IGNUS.ember : '#9A948C';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={{ ...mono, fontSize: 10, color: '#6E6862' }}>RUNE-O-METER</span>
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
            style={{ filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.6))' }}
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

  // slow-spinning rune wireframe behind the hero — DOOM vault green, not CLIQUE cyan
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
  // drives the rune-o-meter donut next to the form — name + email carry it, referral tops it off
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
          background: `radial-gradient(1200px 600px at 85% -10%, #0F3A22 0%, transparent 60%), radial-gradient(900px 500px at 0% 20%, #0A2417 0%, transparent 55%), radial-gradient(700px 700px at 50% 110%, #123F24 0%, transparent 60%), ${IGNUS.coal}`,
          color: IGNUS.ash,
          fontFamily: "'Space Grotesk', sans-serif",
          overflow: 'clip',
          position: 'relative',
          // scope vault vars so every var(--accent/lime/pink) inside = doom green palette
          '--accent': IGNUS.ember,
          '--lime': IGNUS.gold,
          '--pink': IGNUS.inferno,
        } as CSSProperties
      }
    >
      <FilmGrain />
      {/* rune dust layer + vault glow — replaces CLIQUE halftone/cyan glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.5,
          backgroundImage: 'radial-gradient(#4ADE8022 1px, transparent 1.6px)',
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
          background: 'radial-gradient(circle, #4ADE802E, transparent 70%)',
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
          background: 'radial-gradient(circle, #14532D55, transparent 70%)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
              color: '#07130D',
              background: 'linear-gradient(135deg, #E7C44A, #4ADE80)',
              padding: '10px 20px',
              borderRadius: 100,
              textDecoration: 'none',
              display: 'inline-block',
              willChange: 'translate',
              boxShadow: '0 0 18px #4ADE8044',
            }}
          >
            ENTER VAULT →
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
        {/* strange-style amulet hanging on a thread, swinging like the old spider */}
        <div
          data-mhide="true"
          aria-hidden
          className="g-spider"
          style={{
            position: 'absolute',
            top: 64,
            right: '2%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: 0.9,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 14px rgba(74, 222, 128, 0.35))',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 0,
              height: 54,
              borderLeft: '3px dashed rgba(231, 196, 74, 0.7)',
            }}
          />
          <AmuletArt size={76} />
        </div>
        {/* hero — DOOM vault trial */}
        <div style={{ ...mono, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
          {GAUNTLET_META.issue}
          <span style={{ width: 34, height: 1, background: '#4ADE8066', display: 'inline-block' }} />
          ARCANE TRIAL · FRIENDS ONLY
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
                      color: word === 'sanctum.' ? 'var(--accent)' : word === 'the' ? 'var(--lime)' : undefined,
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
              background: 'linear-gradient(135deg, #E7C44A, #4ADE80)',
              color: '#07130D',
              fontFamily: "'Shantell Sans', cursive",
              fontWeight: 700,
              fontSize: 13,
              padding: '7px 14px',
              borderRadius: 100,
              border: '2px solid #07130D',
              boxShadow: '4px 4px 0 #00000080, 0 0 22px #4ADE8055',
              animation: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ display: 'inline-block', animation: 'wiggle 3s ease-in-out infinite' }}>doom has spoken ✦</span>
          </div>
        </div>

        <p style={{ margin: '12px 0 22px 0', maxWidth: 580, color: '#B7CFC0', fontSize: 16, lineHeight: 1.65 }}>
          Doom has opened the vault — three arcane trials: a Family Feud × Who Am I cantrip, a rune-shard
          Bidding War ritual, and a Tekken-style hex in the arena. No eliminations, no pressure — weave the spell.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
          <MetaPill>{`◷ ${GAUNTLET_META.date}`}</MetaPill>
          <MetaPill>{`◎ ${GAUNTLET_META.venue}`}</MetaPill>
          <MetaPill>{`✦ ${GAUNTLET_META.format}`}</MetaPill>
        </div>

        <div ref={burstWrapRef} style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 54 }}>
          {/* doom seal burst — pure CSS, no image asset */}
          <div
            aria-hidden
            className="g-burst"
            style={{
              width: 96,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #E7C44A, #4ADE80 55%, #14532D)',
              clipPath: BURST_CLIP,
              rotate: '12deg',
              color: '#07130D',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.08em',
              textAlign: 'center',
              lineHeight: 1.1,
              padding: 18,
              boxSizing: 'border-box',
              boxShadow: '0 0 28px #4ADE8055',
            }}
          >
            DOOM
          </div>
          <div style={{ ...mono, fontSize: 11, color: '#B7CFC0', letterSpacing: '0.18em' }}>
            THREE TRIALS · ONE DOOM
          </div>
        </div>

        {/* NEW POSTER DROP — IGNUS remastered banner (old HeroBanner moved to bottom) */}
        <div
          style={{
            border: '1px dashed #4ADE8044',
            borderRadius: 22,
            overflow: 'hidden',
            background: '#0B1F14',
            marginBottom: 54,
            boxShadow: '0 18px 60px #00000088, 0 0 40px #4ADE8022',
          }}
        >
          <img
            src={ignusRemastered}
            alt="IGNUS — Clique game night banner"
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
          />
        </div>

        {/* marquee strip — vault green */}
        <div
          style={{
            borderTop: '1px dashed #4ADE8044',
            borderBottom: '1px dashed #4ADE8044',
            overflow: 'hidden',
            background: 'linear-gradient(90deg, #0B1F14, #0E2A1A 50%, #0B1F14)',
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
          THE THREE TRIALS
          <span style={{ flex: 1, height: 1, background: '#4ADE8033' }} />
          <span style={{ fontSize: 9, color: '#7A9187' }}>HOVER / TAP A CARD →</span>
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

        {/* register — vault entry */}
        <div id="register" style={{ scrollMarginTop: 90 }}>
          {status !== 'done' ? (
            <div
              style={{
                border: '1px solid #4ADE8033',
                borderRadius: 22,
                background: 'linear-gradient(180deg, #0E2A1A, #0A1A10)',
                backdropFilter: 'blur(14px)',
                padding: 'clamp(22px, 4vw, 40px)',
                position: 'relative',
                animation: 'fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both',
                boxShadow: '0 18px 60px #00000088, inset 0 1px 0 #4ADE8022',
              }}
            >
              <div style={{ position: 'absolute', top: 12, right: 18, ...mono, fontSize: 10, color: '#7A8F7E' }}>
                IGNUS_v1.0 · VAULT ENTRY
              </div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 18px 0' }}>
                ARCANE PASS
                <span style={{ flex: 1, height: 1, background: '#4ADE8033' }} />
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', margin: '0 0 26px 0' }}>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <h2 style={{ margin: '0 0 8px 0', fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.1 }}>
                    Claim your rune.
                  </h2>
                  <p style={{ margin: 0, color: '#B7CFC0', fontSize: 15, lineHeight: 1.65, maxWidth: 480 }}>
                    Just your name, your email, and who led you to the vault. Takes 10 seconds — Doom
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
                    background: 'linear-gradient(135deg, #E7C44A, #4ADE80 60%, #14532D)',
                    color: '#07130D',
                    border: '2px solid #07130D',
                    ...mono,
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '17px 36px',
                    borderRadius: 100,
                    willChange: 'translate',
                    opacity: status === 'sending' ? 0.75 : 1,
                    minWidth: 0,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    boxShadow: '4px 4px 0 #00000080, 0 0 26px #4ADE8055',
                  }}
                >
                  {status === 'sending' ? SENDING_LINES[sendLine] : 'ENTER THE VAULT →'}
                </button>
                <span style={{ ...mono, fontSize: 10, color: '#7A9187' }}>NO SPAM. ONLY SPELLS.</span>
              </div>
            </div>
          ) : (
            /* ticket confirmation — bound */
            <div style={{ textAlign: 'center', paddingTop: '2vh' }}>
              <div
                style={{
                  width: 'fit-content',
                  margin: '0 auto 26px auto',
                  rotate: '-3deg',
                  background: 'linear-gradient(135deg, #E7C44A, #4ADE80)',
                  color: '#07130D',
                  fontFamily: "'Shantell Sans', cursive",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '8px 16px',
                  borderRadius: 100,
                  border: '2px solid #07130D',
                  boxShadow: '4px 4px 0 #00000080, 0 0 22px #4ADE8055',
                  animation: 'fadeUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
                }}
              >
                vault pass: sealed ✦
              </div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--lime)', marginBottom: 24 }}>
                STATUS: BOUND ✦ TICKET #{ticket?.id}
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
              <p style={{ margin: '24px auto 36px auto', maxWidth: 440, color: '#B7CFC0', fontSize: 16, lineHeight: 1.65 }}>
                Flash this ticket at the vault gate. {GAUNTLET_META.venue} — don&apos;t be late, Doom waits
                for no one.
              </p>

              {/* player ticket — vault green */}
              <div
                style={{
                  margin: '0 auto 40px auto',
                  maxWidth: 520,
                  background: '#EAF6EC',
                  color: '#07130D',
                  borderRadius: 18,
                  border: '2px solid #07130D',
                  boxShadow: '6px 6px 0 #00000080, 0 0 32px #4ADE8033',
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
                    background: 'linear-gradient(90deg, #0A1A10, #123F24)',
                    color: '#E7C44A',
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
            border: '1px dashed #4ADE8044',
            borderRadius: 22,
            overflow: 'hidden',
            background: '#060F0A',
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
