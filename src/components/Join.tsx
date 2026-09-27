import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { INSTAGRAM_URL } from '../lib/content';

interface JoinProps {
  joinCanvasRef: RefObject<HTMLCanvasElement | null>;
}

const TORN_EDGE_PATH =
  'M0,0 L1440,0 L1440,18 L1372,34 L1330,12 L1264,40 L1208,20 L1142,46 L1080,16 L1012,38 L948,10 L886,44 L820,22 L758,48 L692,14 L628,36 L566,8 L502,42 L440,18 L376,46 L314,12 L250,34 L186,6 L124,40 L62,20 L0,44 Z';

export function Join({ joinCanvasRef }: JoinProps) {
  return (
    <section
      id="join"
      data-mpad="true"
      style={{
        padding: '200px 32px 220px 32px',
        background: 'var(--lime)',
        color: '#0B0B0B',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 1440 52"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: -1, left: 0, width: '100%', height: 'clamp(26px, 4vw, 52px)', display: 'block', pointerEvents: 'none' }}
      >
        <path d={TORN_EDGE_PATH} fill="#0B0B0B" />
      </svg>
      <svg
        viewBox="0 0 1440 52"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          bottom: -1,
          left: 0,
          width: '100%',
          height: 'clamp(26px, 4vw, 52px)',
          display: 'block',
          pointerEvents: 'none',
          transform: 'scale(-1, -1)',
        }}
      >
        <path d={TORN_EDGE_PATH} fill="#0B0B0B" />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 'min(80vw, 820px)',
          height: 'min(80vw, 820px)',
          transform: 'translate(-50%, -50%)',
          display: 'var(--shapes-display)',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <canvas ref={joinCanvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '-30%',
          width: 900,
          height: 600,
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse at bottom, color-mix(in oklab, var(--pink) 24%, transparent), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div data-zoom="true" style={{ position: 'relative', willChange: 'transform, opacity' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '0.22em', color: '#0B0B0B99', marginBottom: 28 }}>
          FIG. 06 — GET IN
        </div>
        <h2
          style={{
            margin: '0 auto',
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(44px, 8vw, 120px)',
            lineHeight: 1.02,
            letterSpacing: '-0.01em',
            maxWidth: 1000,
          }}
        >
          Join the
          <br />
          <span style={{ color: 'transparent', WebkitTextStroke: '3px #0B0B0B' }}>CLIQUE</span>
        </h2>
        <div
          data-mjs="true"
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            marginLeft: 'clamp(120px, 16vw, 290px)',
            rotate: '9deg',
            background: '#0B0B0B',
            color: 'var(--lime)',
            fontFamily: "'Shantell Sans', cursive",
            fontWeight: 700,
            fontSize: 16,
            padding: '9px 16px',
            borderRadius: 100,
            border: '2px solid #0B0B0B',
            boxShadow: '4px 4px 0 #00000080',
          }}
        >
          <span style={{ display: 'inline-block', animation: 'wiggle 3s ease-in-out infinite' }}>say less →</span>
        </div>
        <p style={{ margin: '28px auto 44px auto', maxWidth: 440, color: '#23201C', fontSize: 16, lineHeight: 1.65, fontWeight: 500 }}>
          Be so fr — if tech, data and what&apos;s-next excite you, you already belong here. No gatekeeping. Only green
          flags.
        </p>
        <div style={{ position: 'relative', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/join"
            data-magnet="true"
            className="hover-member-btn"
            style={{
              background: 'var(--accent)',
              color: '#0B0B0B',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              letterSpacing: '0.14em',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '18px 36px',
              borderRadius: 100,
              display: 'inline-block',
              willChange: 'translate',
              transition: 'box-shadow 0.3s',
            }}
          >
            BECOME A MEMBER →
          </Link>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-magnet="true"
            className="hover-lurk"
            style={{
              border: '2px solid #0B0B0B',
              color: '#0B0B0B',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              letterSpacing: '0.14em',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '17px 36px',
              borderRadius: 100,
              display: 'inline-block',
              willChange: 'translate',
              transition: 'background 0.3s',
            }}
          >
            LURK ON IG FIRST
          </a>
        </div>
        <div style={{ marginTop: 26, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.14em', color: '#23201C' }}>
          HERE FOR THE SHOWDOWN?{' '}
          <Link to="/gauntlet" style={{ color: '#0B0B0B', fontWeight: 700 }}>
            ⚡ ENTER IGNUS →
          </Link>
        </div>
      </div>
    </section>
  );
}
