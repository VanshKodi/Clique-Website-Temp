interface ControlBarProps {
  animating: boolean;
  nextLabel: string;
  canDraw: boolean;
  canUndo: boolean;
  muted: boolean;
  chrome: boolean;
  onNext: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onRevealRemaining: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onToggleChrome: () => void;
}

export function ControlBar(props: ControlBarProps) {
  const btn =
    'rounded-full px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[#7c3aed]/40 bg-[#0b0618]/95 px-4 py-3 backdrop-blur">
      <button
        type="button"
        data-testid="next-team"
        disabled={props.animating || !props.canDraw}
        onClick={props.onNext}
        className={`${btn} border-2 border-[#ffc83d] bg-gradient-to-r from-[#ffc83d] to-[#ff2bd6] text-[#0b0618] shadow-[0_0_22px_rgba(255,43,214,0.45)] hover:brightness-110`}
      >
        {props.nextLabel}
      </button>

      {props.animating ? (
        <button
          type="button"
          data-testid="skip"
          onClick={props.onSkip}
          className={`${btn} border border-[#22d3ee] text-[#22d3ee] hover:bg-[#22d3ee]/15`}
        >
          Skip
        </button>
      ) : null}

      <button
        type="button"
        data-testid="undo"
        disabled={!props.canUndo}
        onClick={props.onUndo}
        className={`${btn} border border-white/25 text-[#b9a9e8] hover:border-[#ff2bd6] hover:text-[#ff2bd6]`}
      >
        Undo last team
      </button>

      <button
        type="button"
        data-testid="reveal-remaining"
        disabled={!props.canDraw || props.animating}
        onClick={props.onRevealRemaining}
        className={`${btn} border border-white/25 text-[#b9a9e8] hover:border-[#ffc83d] hover:text-[#ffc83d]`}
      >
        Reveal remaining
      </button>

      <span className="mx-1 h-5 w-px bg-white/15" />

      <button
        type="button"
        data-testid="mute-toggle"
        onClick={props.onToggleMute}
        aria-pressed={props.muted}
        className={`${btn} border border-white/25 text-[#b9a9e8] hover:text-white`}
        title="Mute (M)"
      >
        {props.muted ? '🔇' : '🔊'}
      </button>
      <button
        type="button"
        onClick={props.onFullscreen}
        className={`${btn} border border-white/25 text-[#b9a9e8] hover:text-white`}
        title="Fullscreen (F)"
      >
        ⛶
      </button>
      <button
        type="button"
        data-testid="toggle-chrome"
        onClick={props.onToggleChrome}
        className={`${btn} border border-white/25 text-[#b9a9e8] hover:text-white`}
        title="Hide chrome (H)"
      >
        {props.chrome ? 'Hide UI' : 'Show UI'}
      </button>
    </div>
  );
}
