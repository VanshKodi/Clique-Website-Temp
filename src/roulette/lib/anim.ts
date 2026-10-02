export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function backOut(t: number, overshoot = 1.4): number {
  const c = overshoot;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

export interface TweenOpts {
  from: number;
  to: number;
  dur: number;
  ease?: (t: number) => number;
  onUpdate: (value: number) => void;
  onDone?: () => void;
}

export function tween(opts: TweenOpts): () => void {
  let raf = 0;
  let cancelled = false;
  let start: number | null = null;
  const step = (ts: number) => {
    if (cancelled) return;
    if (start === null) start = ts;
    const p = opts.dur <= 0 ? 1 : Math.min(1, (ts - start) / opts.dur);
    const e = opts.ease ? opts.ease(p) : p;
    opts.onUpdate(opts.from + (opts.to - opts.from) * e);
    if (p < 1) raf = requestAnimationFrame(step);
    else opts.onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
