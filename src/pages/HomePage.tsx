import { useMemo, useRef } from 'react';
import { usePointerNormalized } from '../hooks/usePointerNormalized';
import { useMasterScrollLoop, type MasterLoopRefs } from '../hooks/useMasterScrollLoop';
import { useReveal } from '../hooks/useReveal';
import { useTilt } from '../hooks/useTilt';
import { useMagnetic } from '../hooks/useMagnetic';
import { useMarquee } from '../hooks/useMarquee';
import { useSound } from '../hooks/useSound';
import { useEasterEgg } from '../hooks/useEasterEgg';
import { useAccent } from '../hooks/useAccent';
import { FilmGrain } from '../components/FilmGrain';
import { BootScreen } from '../components/BootScreen';
import { ScrollProgress } from '../components/ScrollProgress';
import { Nav } from '../components/Nav';
import { Hero } from '../components/Hero';
import { About } from '../components/About';
import { Story } from '../components/Story';
import { Focus } from '../components/Focus';
import { Wall } from '../components/Wall';
import { DriftStrip } from '../components/DriftStrip';
import { People } from '../components/People';
import { Events } from '../components/Events';
import { EventPopup } from '../components/EventPopup';
import { Join } from '../components/Join';
import { Footer } from '../components/Footer';

export function HomePage() {
  const progressRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const joinCanvasRef = useRef<HTMLCanvasElement>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const storyCanvasRef = useRef<HTMLCanvasElement>(null);
  const storySectionRef = useRef<HTMLElement>(null);
  const storyGlowRef = useRef<HTMLDivElement>(null);
  const storyReadoutRef = useRef<HTMLSpanElement>(null);

  const pointerRef = usePointerNormalized();
  const { accent, accentRef, setAccent } = useAccent();

  const loopRefs = useMemo<MasterLoopRefs>(
    () => ({
      progressRef,
      navRef,
      heroContentRef,
      gridRef,
      heroCanvasRef,
      joinCanvasRef,
      cardCanvasRef,
      storyCanvasRef,
      storySectionRef,
      storyGlowRef,
      storyReadoutRef,
      pointerRef,
      accentRef,
    }),
    [pointerRef, accentRef],
  );

  useMasterScrollLoop(loopRefs);
  useReveal();
  useTilt();
  useMagnetic();
  useMarquee();
  const sound = useSound();
  const { logoTap } = useEasterEgg(sound.blip);

  return (
    <div
      style={{
        background: '#0B0B0B',
        color: '#F5F3F0',
        fontFamily: "'Space Grotesk', sans-serif",
        overflowX: 'clip',
        position: 'relative',
      }}
    >
      <FilmGrain />
      <BootScreen />
      <ScrollProgress ref={progressRef} />
      <Nav
        ref={navRef}
        soundEnabled={sound.enabled}
        onToggleSound={sound.toggle}
        onLogoTap={logoTap}
        accent={accent}
        onPickAccent={setAccent}
      />
      <Hero gridRef={gridRef} heroContentRef={heroContentRef} heroCanvasRef={heroCanvasRef} />
      <About />
      <Story
        storySectionRef={storySectionRef}
        storyCanvasRef={storyCanvasRef}
        storyGlowRef={storyGlowRef}
        storyReadoutRef={storyReadoutRef}
      />
      <Focus cardCanvasRef={cardCanvasRef} />
      <Wall />
      <DriftStrip />
      <People />
      <Events />
      <Join joinCanvasRef={joinCanvasRef} />
      <Footer />
      <EventPopup />
    </div>
  );
}
