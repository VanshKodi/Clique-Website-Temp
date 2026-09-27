import { BARCODE_WIDTHS, SOCIAL_LINKS } from '../lib/content';
import { useClock } from '../hooks/useClock';
import { ChaiCounter } from './ChaiCounter';
import { SocialIcon } from './SocialIcon';

export function Footer() {
  const time = useClock();

  return (
    <footer
      data-mpad="true"
      style={{
        padding: '44px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 28,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.14em',
        color: '#6E6862',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>CLIQUE — THE IT &amp; ANALYTICS CLUB · INSTITUTE OF MANAGEMENT, NIRMA UNIVERSITY</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>AHMEDABAD, IN</span>
          <span style={{ color: 'var(--accent)' }}>✦</span>
          <span>
            LOCAL TIME <span style={{ color: '#B9B4AE' }}>{time}</span> IST
          </span>
        </div>
        <ChaiCounter />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 26, opacity: 0.55 }}>
          {BARCODE_WIDTHS.map((w, i) => (
            <div key={i} style={{ width: w, height: '100%', background: '#9A948C' }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover-accent"
              style={{
                color: '#B9B4AE',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: '0.08em',
                lineHeight: 1,
                textTransform: 'none',
              }}
            >
              <SocialIcon icon={link.icon} size={17} />
              <span>{link.handle}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
