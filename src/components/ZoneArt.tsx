interface ArtProps {
  size?: number;
}

const OUT = '#0B0B0B';

// Original chubby bean mascot (Fall Guys energy, drawn from scratch).
export function BeanArt({ size = 84 }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <g stroke={OUT} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
        {/* legs */}
        <path d="M46 100 L42 112" />
        <path d="M74 100 L78 112" />
        <ellipse cx="40" cy="114" rx="9" ry="5" fill="#4DE8FF" />
        <ellipse cx="80" cy="114" rx="9" ry="5" fill="#4DE8FF" />
        {/* arms */}
        <path d="M24 66 C14 64 10 72 14 80" fill="none" />
        <path d="M96 66 C106 64 110 72 106 80" fill="none" />
        {/* crown */}
        <path d="M44 22 L48 10 L56 18 L64 8 L72 18 L78 10 L80 24 Z" fill="#CDFF4D" />
        {/* body */}
        <path
          d="M60 20 C84 20 98 38 98 64 C98 90 82 106 60 106 C40 106 24 92 23 72 C22 54 30 40 39 31 C46 24 50 20 60 20 Z"
          fill="#4DE8FF"
        />
        {/* face */}
        <ellipse cx="48" cy="58" rx="8" ry="9" fill="#FFFFFF" strokeWidth={3} />
        <ellipse cx="73" cy="58" rx="8" ry="9" fill="#FFFFFF" strokeWidth={3} />
        <circle cx="50" cy="60" r="3.5" fill={OUT} stroke="none" />
        <circle cx="75" cy="60" r="3.5" fill={OUT} stroke="none" />
        <path d="M50 76 C56 84 66 84 72 76" fill="none" strokeWidth={3} />
        {/* cheek blush */}
        <ellipse cx="36" cy="72" rx="5" ry="3" fill="#FF6FB5" stroke="none" opacity={0.8} />
        <ellipse cx="85" cy="72" rx="5" ry="3" fill="#FF6FB5" stroke="none" opacity={0.8} />
      </g>
    </svg>
  );
}

// Jeopardy-style clue card with a big question mark.
export function ClueCardArt({ size = 84 }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <g stroke={OUT} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
        <g transform="rotate(-9 60 62)">
          <rect x="16" y="24" width="88" height="76" rx="12" fill="#CDFF4D" />
          <rect x="26" y="34" width="68" height="56" rx="7" fill="#0B0B0B" stroke="none" />
          <text
            x="60"
            y="78"
            textAnchor="middle"
            fontSize="42"
            fontWeight="900"
            fill="#CDFF4D"
            stroke="none"
            fontFamily="'Unbounded', sans-serif"
          >
            ?
          </text>
          <text
            x="60"
            y="114"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill={OUT}
            stroke="none"
            fontFamily="'JetBrains Mono', monospace"
          >
            $400
          </text>
        </g>
        {/* sparkles */}
        <path d="M104 20 L107 28 L115 31 L107 34 L104 42 L101 34 L93 31 L101 28 Z" fill="#FF6FB5" strokeWidth={3} />
        <path d="M14 100 L16 106 L22 108 L16 110 L14 116" fill="none" strokeWidth={3} />
      </g>
    </svg>
  );
}

// Beer pong cups with a webbed ping-pong ball (the twist).
export function PongArt({ size = 84 }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <g stroke={OUT} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
        {/* motion dashes */}
        <path d="M86 30 L98 22" stroke="#4DE8FF" strokeWidth={4} />
        <path d="M90 42 L104 40" stroke="#4DE8FF" strokeWidth={4} />
        {/* cups */}
        <path d="M30 64 L38 106 L62 106 L70 64 Z" fill="#FF6FB5" />
        <ellipse cx="50" cy="64" rx="20" ry="7" fill="#FFD9EC" />
        <path d="M56 74 L62 108 L84 108 L92 74 Z" fill="#FF6FB5" />
        <ellipse cx="74" cy="74" rx="18" ry="6" fill="#FFD9EC" />
        <path d="M8 78 L14 110 L34 110 L42 78 Z" fill="#FF6FB5" />
        <ellipse cx="25" cy="78" rx="17" ry="6" fill="#FFD9EC" />
        {/* webbed ball */}
        <circle cx="84" cy="34" r="15" fill="#F5F3F0" />
        <g stroke="#0B0B0B" strokeWidth={2} strokeLinecap="round" fill="none">
          <path d="M84 19 L84 49 M69 34 L99 34 M74 24 L94 44 M94 24 L74 44" />
          <path d="M77 27 Q84 34 91 27 M77 41 Q84 34 91 41" />
        </g>
      </g>
    </svg>
  );
}

// Spider hanging on a thread — a little Spider-Verse doodle for the hero.
export function SpiderDoodle({ size = 96 }: ArtProps) {
  return (
    <svg width={size} height={size * 1.55} viewBox="0 0 80 124" fill="none" aria-hidden>
      <g stroke="#F5F3F0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 0 L40 56" strokeDasharray="2 6" />
        <path d="M40 74 C26 66 16 68 10 60" fill="none" />
        <path d="M40 74 C54 66 64 68 70 60" fill="none" />
        <path d="M40 80 C24 78 14 84 8 80" fill="none" />
        <path d="M40 80 C56 78 66 84 72 80" fill="none" />
        <path d="M40 86 C26 90 18 98 14 104" fill="none" />
        <path d="M40 86 C54 90 62 98 66 104" fill="none" />
        <path d="M40 90 C32 98 30 106 30 112" fill="none" />
        <path d="M40 90 C48 98 50 106 50 112" fill="none" />
        <ellipse cx="40" cy="82" rx="14" ry="16" fill="#F5F3F0" stroke="#0B0B0B" strokeWidth={3} />
        <ellipse cx="40" cy="66" rx="9" ry="8" fill="#F5F3F0" stroke="#0B0B0B" strokeWidth={3} />
        <circle cx="37" cy="65" r="2" fill="#FF6FB5" stroke="none" />
        <circle cx="43" cy="65" r="2" fill="#FF6FB5" stroke="none" />
        <path d="M34 84 L46 84" stroke="#0B0B0B" strokeWidth={3} />
        <path d="M40 76 L36 80 M40 76 L44 80" stroke="#0B0B0B" strokeWidth={2} />
      </g>
    </svg>
  );
}
