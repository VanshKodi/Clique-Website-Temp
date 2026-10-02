import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { NAV_LINKS } from '../lib/content';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Logo } from './Logo';

interface NavProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogoTap: () => void;
  accent: string;
  onPickAccent: (color: string) => void;
}

export const Nav = forwardRef<HTMLElement, NavProps>(({ soundEnabled, onToggleSound, onLogoTap, accent, onPickAccent }, ref) => (
  <nav
    ref={ref}
    data-mnav="true"
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px 16px',
      padding: '18px 32px',
      background: '#0B0B0B66',
      backdropFilter: 'blur(14px)',
      transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
    }}
  >
    <a
      href="#top"
      onClick={onLogoTap}
      aria-label="CLIQUE — home"
      style={{ textDecoration: 'none', display: 'inline-flex' }}
    >
      <Logo size={38} withWordmark wordmarkSize={18} />
    </a>
    <div
      data-mnavlinks="true"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 28,
        alignItems: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        letterSpacing: '0.14em',
      }}
    >
      <span
        data-mhide="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          color: 'var(--lime)',
          fontSize: 11,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--lime)',
            display: 'inline-block',
            animation: 'blink 1.4s step-end infinite',
          }}
        />
        RECRUITING
      </span>
      <button
        onClick={onToggleSound}
        className="hover-sound"
        style={{
          cursor: 'pointer',
          background: 'transparent',
          border: '1px dashed #FFFFFF33',
          color: '#9A948C',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.14em',
          padding: '6px 12px',
          borderRadius: 100,
        }}
      >
        {soundEnabled ? 'SND ✦ ON' : 'SND ✦ OFF'}
      </button>
      <span data-mhide="true">
        <ThemeSwitcher accent={accent} onPick={onPickAccent} />
      </span>
      {NAV_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          data-mhide="true"
          className="hover-accent"
          style={{ color: '#9A948C', textDecoration: 'none' }}
        >
          {link.label}
        </a>
      ))}
      <a
        href="#join"
        data-magnet="true"
        style={{
          color: '#0B0B0B',
          background: 'var(--accent)',
          padding: '9px 18px',
          borderRadius: 100,
          textDecoration: 'none',
          fontWeight: 500,
          display: 'inline-block',
          willChange: 'translate',
        }}
      >
        JOIN US
      </a>
      <Link
        to="/gauntlet"
        data-mhide="true"
        style={{
          color: 'var(--lime)',
          border: '1px dashed #FFFFFF33',
          padding: '8px 16px',
          borderRadius: 100,
          textDecoration: 'none',
          fontWeight: 500,
          display: 'inline-block',
          fontSize: 11,
        }}
      >
        ⚡ IGNUS
      </Link>
    </div>
  </nav>
));
Nav.displayName = 'Nav';
