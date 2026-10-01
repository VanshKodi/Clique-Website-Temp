import type { CSSProperties } from 'react';
import { POSTERS } from '../lib/content';
import webPattern from '../assets/banner/web.png';
import ironmanLeft from '../assets/banner/ironman-left.png';
import spideyRight from '../assets/banner/spidey-right.jpg';
import spiderA from '../assets/banner/spider-a.jpg';
import spiderB from '../assets/banner/spider-b.jpg';

const maskLeft = 'linear-gradient(90deg, #000 54%, rgba(0,0,0,0.55) 78%, transparent 100%)';
const maskRight = 'linear-gradient(270deg, #000 52%, rgba(0,0,0,0.55) 78%, transparent 100%)';

const mono: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: '0.2em',
};

interface HeroBannerProps {
  // Entrance delay — home waits out the boot screen (~3s), other pages don't.
  delay?: number;
}

export function HeroBanner({ delay = 3 }: HeroBannerProps) {
  return (
    <div
      data-band="true"
      style={{
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderTop: '1px dashed #FFFFFF1F',
        borderBottom: '1px dashed #FFFFFF1F',
        background: '#0A0406',
        animation: `fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both`,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${webPattern})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.62,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 58% 130% at 50% 50%, rgba(224, 27, 36, 0.1), transparent 72%)',
          pointerEvents: 'none',
        }}
      />

      <img
        data-band-spidey="true"
        src={ironmanLeft}
        alt="Iron Man"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: 'auto',
          objectFit: 'cover',
          objectPosition: 'center',
          maskImage: maskLeft,
          WebkitMaskImage: maskLeft,
          pointerEvents: 'none',
        }}
      />
      <img
        data-band-spidey="true"
        src={spideyRight}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          height: '100%',
          width: 'auto',
          objectFit: 'cover',
          objectPosition: 'center',
          maskImage: maskRight,
          WebkitMaskImage: maskRight,
          pointerEvents: 'none',
        }}
      />

      <img
        src={spiderA}
        alt=""
        aria-hidden="true"
        data-band-spidey="true"
        style={{
          position: 'absolute',
          left: '13%',
          top: '16%',
          width: 32,
          mixBlendMode: 'screen',
          opacity: 0.92,
          animation: 'bob 1.6s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />
      <img
        src={spiderB}
        alt=""
        aria-hidden="true"
        data-band-spidey="true"
        style={{
          position: 'absolute',
          right: '14%',
          bottom: '14%',
          width: 38,
          mixBlendMode: 'screen',
          opacity: 0.92,
          animation: 'bob 2.1s ease-in-out 0.4s infinite alternate',
          pointerEvents: 'none',
        }}
      />

      <div
        data-band-inner="true"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 'clamp(18px, 2.6vw, 46px)',
          padding: '26px clamp(18px, 8vw, 215px) 20px',
          boxSizing: 'border-box',
          maxWidth: '100%',
        }}
      >
        <div
          data-band-text="true"
          style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}
        >
          <div
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(28px, 3.9vw, 50px)',
              lineHeight: 1,
              letterSpacing: '0.01em',
              color: '#FF3131',
              textShadow: '0 0 14px rgba(255, 49, 49, 0.55), 0 0 46px rgba(224, 27, 36, 0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            IGNUS
          </div>
          <div
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(11px, 1.15vw, 15px)',
              letterSpacing: '0.16em',
              color: '#FF6B6B',
              textShadow: '0 0 12px rgba(224, 27, 36, 0.55)',
              marginTop: 2,
              textAlign: 'center',
              maxWidth: '100%',
              overflowWrap: 'anywhere',
              whiteSpace: 'normal',
            }}
          >
            ITS TIME TO WEAVE SOME NETWORK
          </div>
        </div>

        <div
          data-band-cards="true"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            flexWrap: 'nowrap',
            gap: 'clamp(6px, 2vw, 14px)',
            width: '100%',
            maxWidth: 420,
            minWidth: 0,
          }}
        >
          {POSTERS.map((poster, i) => (
            <figure
              key={poster.id}
              className="poster-card"
              style={
                {
                  '--tilt': `${poster.tilt}deg`,
                  margin: 0,
                  flex: '1 1 0',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'center',
                  animation: `fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay + 0.1 + i * 0.07}s both`,
                } as CSSProperties
              }
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 86,
                  aspectRatio: '3 / 4',
                  overflow: 'hidden',
                  isolation: 'isolate',
                  background: 'linear-gradient(165deg, #262626 0%, #121212 58%, #080808 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow: '0 10px 26px rgba(0, 0, 0, 0.6)',
                }}
              >
                <img
                  src={poster.src}
                  alt={poster.name}
                  draggable={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: poster.focus,
                          filter: 'contrast(1.08) saturate(1.12)',
                        }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(255, 49, 49, 0.16), transparent 42%, rgba(8, 2, 4, 0.7))',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <figcaption style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, maxWidth: '100%' }}>
                <span
                  style={{
                    fontFamily: "'Unbounded', sans-serif",
                    fontWeight: 800,
                    fontSize: 'clamp(7px, 2.4vw, 9.5px)',
                    letterSpacing: '0.06em',
                    color: '#F5F3F0',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {poster.name}
                </span>
                <span style={{ ...mono, fontSize: 8, letterSpacing: '0.14em', color: '#E01B24' }}>{poster.tag}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
