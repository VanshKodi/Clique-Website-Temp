import { Link } from 'react-router-dom';
import { EVENTS } from '../lib/events';
import { SectionTag } from './SectionTag';

const card: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 0,
  border: '1px solid #FFFFFF14',
  borderRadius: 18,
  overflow: 'hidden',
  background: '#FFFFFF08',
  backdropFilter: 'blur(14px)',
  transition: 'border-color 0.3s, transform 0.3s',
};

export function Events() {
  return (
    <section
      id="events"
      data-mpad="true"
      className="evt-section"
      style={{
        padding: '120px 32px',
        maxWidth: 1200,
        margin: '0 auto',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 90,
          right: 0,
          fontFamily: "'Unbounded', sans-serif",
          fontWeight: 900,
          fontSize: 'clamp(110px, 16vw, 260px)',
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: '1px #242019',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        06
      </div>

      <SectionTag fig="06" label="WHAT'S ON" marginBottom={40} />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 34,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(26px, 4vw, 44px)',
            letterSpacing: '-0.02em',
          }}
        >
          Upcoming events
        </h2>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.18em',
            color: '#6E6862',
          }}
        >
          {EVENTS.length} SHOW{EVENTS.length === 1 ? '' : 'S'}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 22 }}>
        {EVENTS.map((e) => (
          <article key={e.id} className="evt-card" style={card}>
            {/* poster: full-width banner at its natural ratio, never cropped */}
            <div style={{ position: 'relative', background: '#000', borderBottom: '1px solid #FFFFFF14' }}>
              {e.poster ? (
                <img
                  src={e.poster}
                  alt={e.title}
                  style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '40vh', objectFit: 'contain' }}
                />
              ) : null}
              {e.status === 'LIVE' && (
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    color: '#0B0B0B',
                    background: 'var(--lime)',
                    border: '2px solid #0B0B0B',
                    borderRadius: 100,
                    padding: '4px 12px',
                    boxShadow: '3px 3px 0 #00000080',
                  }}
                >
                  ● LIVE NOW
                </span>
              )}
            </div>

            {/* details */}
            <div style={{ padding: 'clamp(22px, 3vw, 34px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {/* date block, BMS-style */}
                <div
                  style={{
                    minWidth: 64,
                    textAlign: 'center',
                    border: '1px solid #FFFFFF26',
                    borderRadius: 12,
                    padding: '8px 6px',
                    background: '#00000059',
                  }}
                >
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.16em', color: 'var(--accent)' }}>
                    {e.month}
                  </div>
                  <div style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 26, lineHeight: 1.1 }}>{e.day}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.2em', color: '#6E6862' }}>
                    {e.kicker}
                  </div>
                  <h3
                    style={{
                      margin: '4px 0 0',
                      fontFamily: "'Unbounded', sans-serif",
                      fontWeight: 700,
                      fontSize: 'clamp(20px, 2.6vw, 30px)',
                      letterSpacing: '-0.01em',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {e.title}
                  </h3>
                </div>
              </div>

              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  color: '#B9B3AA',
                  display: 'grid',
                  gap: 6,
                }}
              >
                <span>📅 {e.time} · {e.venue}</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {e.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      color: '#CDFF4D',
                      border: '1px solid #CDFF4D4D',
                      borderRadius: 100,
                      padding: '4px 12px',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <Link
                  to={e.href}
                  style={{
                    display: 'inline-block',
                    textDecoration: 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: '0.16em',
                    color: '#0B0B0B',
                    background: 'var(--accent)',
                    border: '2px solid #0B0B0B',
                    borderRadius: 100,
                    padding: '11px 26px',
                    boxShadow: '3px 3px 0 #00000080',
                  }}
                >
                  {e.cta} →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <style>{`
        .evt-card:hover { border-color: color-mix(in oklab, var(--accent) 55%, transparent); transform: translateY(-3px); }
      `}</style>
    </section>
  );
}
