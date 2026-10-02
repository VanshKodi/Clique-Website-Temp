import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EVENT_POPUP, EVENTS } from '../lib/events';

const SCHEDULE_KEY = 'clique:evt-popup-shown-at';
const DAY_MS = 86_400_000;

const read = (key: string): number | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

// Decided once per load (module scope) so StrictMode's double mount can't
// stamp the schedule twice. First impression starts the 2-day countdown.
const firstShownAt = (() => {
  if (!EVENT_POPUP.enabled) return null;
  const existing = read(SCHEDULE_KEY);
  if (existing) return existing;
  const now = Date.now();
  write(SCHEDULE_KEY, now);
  return now;
})();

const withinSchedule =
  firstShownAt !== null &&
  Date.now() >= Date.parse(EVENT_POPUP.startsAt) &&
  Date.now() - firstShownAt < EVENT_POPUP.hideAfterDays * DAY_MS;

export function EventPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!withinSchedule) return;
    const t = window.setTimeout(() => setVisible(true), 3800);
    return () => window.clearTimeout(t);
  }, []);

  // Hard schedule: if the tab stays open past the 2-day mark, drop the popup.
  useEffect(() => {
    if (!visible) return;
    const expiresAt = (firstShownAt ?? Date.now()) + EVENT_POPUP.hideAfterDays * DAY_MS;
    const t = window.setTimeout(() => setVisible(false), Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  const event = EVENTS[0];

  const close = () => setVisible(false);

  return (
    <div
      role="dialog"
      aria-label="Event is live"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
        background: '#05050599',
        backdropFilter: 'blur(8px)',
        animation: 'fadeUp 0.4s ease both',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 'min(920px, 100%)',
          maxHeight: '86vh',
          overflow: 'auto',
          background: '#101010',
          border: '1px solid #FFFFFF1F',
          borderRadius: 18,
          boxShadow: '0 30px 90px #000000CC, 0 0 60px color-mix(in oklab, var(--accent) 22%, transparent)',
          animation: 'heroRise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        {/* ticker strip */}
        <div
          style={{
            overflow: 'hidden',
            background: 'var(--accent)',
            color: '#0B0B0B',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.24em',
            whiteSpace: 'nowrap',
            padding: '9px 0',
          }}
        >
          <span style={{ display: 'inline-block', paddingLeft: '100%', animation: 'ticker 14s linear infinite' }}>
            EVENT IS LIVE ✦ EVENT IS LIVE ✦ EVENT IS LIVE ✦ EVENT IS LIVE ✦ EVENT IS LIVE ✦&nbsp;
          </span>
        </div>

        <button
          onClick={close}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 44,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '1px solid #FFFFFF2E',
            background: '#000000AA',
            color: '#F5F3F0',
            fontSize: 16,
            cursor: 'pointer',
            lineHeight: 1,
            zIndex: 2,
          }}
        >
          ×
        </button>

        {/* poster: full-width banner at its natural 3:1 ratio, never cropped */}
        <div style={{ background: '#000', borderBottom: '1px solid #FFFFFF14' }}>
          <img
            src={event.poster}
            alt={event.title}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              maxHeight: '34vh',
              objectFit: 'contain',
            }}
          />
        </div>

        <div style={{ padding: 'clamp(24px, 4vw, 42px)', boxSizing: 'border-box' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.24em',
              color: 'var(--accent)',
              marginBottom: 14,
            }}
          >
            {event.kicker}
          </div>
            <h2
              style={{
                margin: '0 0 6px',
                fontFamily: "'Unbounded', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(30px, 5vw, 46px)',
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
              }}
            >
              {event.title}
            </h2>
            <div
              style={{
                fontFamily: "'Shantell Sans', cursive",
                fontWeight: 700,
                fontSize: 17,
                color: '#0B0B0B',
                background: 'var(--lime)',
                display: 'inline-block',
                padding: '5px 14px',
                borderRadius: 100,
                border: '2px solid #0B0B0B',
                boxShadow: '3px 3px 0 #00000080',
                transform: 'rotate(-2deg)',
                margin: '10px 0 18px',
              }}
            >
              event is live 🎟
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 18px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: '0.1em',
                color: '#B9B3AA',
                marginBottom: 24,
              }}
            >
              <span>📅 {event.month} {event.day} · {event.time}</span>
              <span>📍 {event.venue}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <Link
                to={event.href}
                onClick={close}
                style={{
                  textDecoration: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.16em',
                  color: '#0B0B0B',
                  background: 'var(--accent)',
                  border: '2px solid #0B0B0B',
                  borderRadius: 100,
                  padding: '12px 26px',
                  boxShadow: '3px 3px 0 #00000080',
                }}
              >
                CHECK IT OUT →
              </Link>
              <button
                onClick={close}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  color: '#9A948C',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 10,
                }}
              >
                LATER
              </button>
            </div>

            <div
              style={{
                marginTop: 22,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.12em',
                color: '#4A443C',
              }}
            >
              AUTO-DISMISSES IN {EVENT_POPUP.hideAfterDays} DAYS
            </div>
          </div>
      </div>
    </div>
  );
}
