import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { TICKER_ITEMS } from '../lib/content';

interface HeroProps {
  gridRef: RefObject<HTMLDivElement | null>;
  heroContentRef: RefObject<HTMLDivElement | null>;
  heroCanvasRef: RefObject<HTMLCanvasElement | null>;
}

const HERO_LETTERS = ['C', 'L', 'I', 'Q', 'U', 'E'];

export function Hero({ gridRef, heroContentRef, heroCanvasRef }: HeroProps) {
  return (
    <header
      id="top"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={gridRef}
        style={{
          position: 'absolute',
          inset: '-10% 0',
          backgroundImage:
            'linear-gradient(#FFFFFF08 1px, transparent 1px), linear-gradient(90deg, #FFFFFF08 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 90% 80% at 50% 40%, black 30%, transparent 100%)',
          willChange: 'transform',
          transformOrigin: '50% 100%',
        }}
      />
      <div
        data-plx="0.25"
        style={{
          position: 'absolute',
          top: '12%',
          left: '8%',
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 20%, transparent), transparent 70%)',
          filter: 'blur(46px)',
          animation: 'floatA 16s ease-in-out infinite',
          willChange: 'transform',
        }}
      />
      <div
        data-plx="-0.18"
        style={{
          position: 'absolute',
          top: '30%',
          right: '4%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #8A5A2E26, transparent 70%)',
          filter: 'blur(54px)',
          animation: 'floatB 20s ease-in-out infinite',
          willChange: 'transform',
        }}
      />

      <div
        data-hero-shape="true"
        style={{
          position: 'absolute',
          top: '5%',
          right: 0,
          width: 'min(46vw, 640px)',
          height: 'min(46vw, 640px)',
          display: 'var(--shapes-display)',
          pointerEvents: 'none',
        }}
      >
        <canvas ref={heroCanvasRef} style={{ width: '100%', height: '100%' }} />
        <div
          data-mhide="true"
          style={{
            position: 'absolute',
            bottom: '34%',
            right: '4%',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.2em',
            color: '#6E6862',
            textAlign: 'right',
            lineHeight: 1.9,
          }}
        >
          FIG. 01 — ICOSAHEDRON
          <br />
          ROTATION: SCROLL + CURSOR
          <br />
          MAT: WIREFRAME / BLUEPRINT
        </div>
      </div>

      <div
        ref={heroContentRef}
        data-mpad="true"
        data-hero-content="true"
        style={{
          position: 'relative',
          padding: '130px 32px 0 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          willChange: 'transform, opacity',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            letterSpacing: '0.22em',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 2.0s both',
          }}
        >
          <span style={{ width: 34, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
          THE IT &amp; ANALYTICS CLUB · IMNU
          <span style={{ animation: 'blink 1.1s step-end infinite' }}>_</span>
        </div>

        <h1
          data-hero-h1="true"
          style={{
            margin: 0,
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(68px, 14.5vw, 235px)',
            lineHeight: 0.95,
            letterSpacing: '-0.01em',
            display: 'flex',
            position: 'relative',
          }}
        >
          {HERO_LETTERS.map((letter, i) => (
            <span key={i} style={{ overflow: 'hidden', display: 'inline-block', paddingBottom: '0.08em' }}>
              <span
                data-hero-letter={i}
                style={{
                  display: 'inline-block',
                  animation: `heroRise 0.95s cubic-bezier(0.22, 1, 0.36, 1) ${2.05 + i * 0.08}s both`,
                  willChange: 'transform',
                  color: i === 5 ? 'var(--accent)' : undefined,
                }}
              >
                {letter}
              </span>
            </span>
          ))}
          <div
            data-hsticker="true"
            style={{
              position: 'absolute',
              top: -34,
              right: '3%',
              rotate: '7deg',
              zIndex: 3,
              background: 'var(--lime)',
              color: '#0B0B0B',
              fontFamily: "'Shantell Sans', cursive",
              fontWeight: 700,
              fontSize: 'clamp(13px, 1.2vw, 17px)',
              padding: '10px 18px',
              borderRadius: 100,
              border: '2px solid #0B0B0B',
              boxShadow: '5px 5px 0 #00000080',
              animation: 'fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 2.7s both',
            }}
          >
            <span style={{ display: 'inline-block', animation: 'wiggle 3.2s ease-in-out infinite' }}>
              student-run ✦ no cap
            </span>
          </div>
          <div
            data-hsticker="true"
            style={{
              position: 'absolute',
              bottom: -14,
              left: '35%',
              rotate: '-6deg',
              zIndex: 3,
              background: 'var(--pink)',
              color: '#0B0B0B',
              fontFamily: "'Shantell Sans', cursive",
              fontWeight: 700,
              fontSize: 'clamp(12px, 1.1vw, 16px)',
              padding: '9px 16px',
              borderRadius: 100,
              border: '2px solid #0B0B0B',
              boxShadow: '5px 5px 0 #00000080',
              animation: 'fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 2.85s both',
            }}
          >
            <span style={{ display: 'inline-block', animation: 'wiggle 2.7s ease-in-out infinite' }}>
              POV: you found your people
            </span>
          </div>
        </h1>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 20,
            paddingBottom: 32,
            animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 2.55s both',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 520 }}>
            <p
              style={{
                margin: 0,
                maxWidth: 520,
                fontFamily: "'Unbounded', sans-serif",
                fontSize: 'clamp(18px, 1.9vw, 26px)',
                fontWeight: 800,
                lineHeight: 1.3,
                letterSpacing: '-0.005em',
                color: '#F5F3F0',
              }}
            >
              Stay <span style={{ color: 'var(--accent)' }}>Hungry</span>. Stay{' '}
              <span style={{ color: 'var(--lime)' }}>Nerdy</span>. Stay{' '}
              <span style={{ color: 'var(--pink)' }}>Awesome</span>.
            </p>
            <Link
              to="/gauntlet"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 14,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.18em',
                color: '#0B0B0B',
                background: 'var(--lime)',
                border: '2px solid #0B0B0B',
                boxShadow: '4px 4px 0 #00000080',
                padding: '10px 18px',
                borderRadius: 100,
                textDecoration: 'none',
                fontWeight: 500,
                width: 'fit-content',
                rotate: '-1deg',
              }}
            >
              ⚡ ISSUE Nº 01 — IGNUS IS LIVE →
            </Link>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.18em',
              color: '#6E6862',
            }}
          >
            <span data-mhide="true">23.1288° N, 72.5450° E</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              SCROLL TO EXPLORE{' '}
              <span style={{ color: 'var(--accent)', display: 'inline-block', animation: 'bob 0.9s ease-in-out infinite alternate' }}>
                ↓
              </span>
            </span>
          </div>
        </div>
      </div>

      <div
        data-skew="1"
        style={{
          borderTop: '1px dashed #FFFFFF1F',
          borderBottom: '1px dashed #FFFFFF1F',
          overflow: 'hidden',
          background: '#111111',
          padding: '14px 0',
          position: 'relative',
          willChange: 'transform',
        }}
      >
        <div
          data-marquee="true"
          style={{
            display: 'flex',
            width: 'max-content',
            animation: 'ticker var(--ticker-dur) linear infinite',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            letterSpacing: '0.24em',
            color: '#9A948C',
            whiteSpace: 'nowrap',
          }}
        >
          {[0, 1].map((copy) => (
            <span key={copy} style={{ paddingRight: 24 }}>
              {TICKER_ITEMS.map((item, i) => (
                <span key={i}>
                  {item.text} <span style={{ color: item.color }}>✦</span>{' '}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
