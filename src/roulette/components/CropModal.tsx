import { useRef, useState } from 'react';
import { fileToPhoto } from '../lib/photo';

interface CropModalProps {
  file: File;
  initialName?: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

export function CropModal({ file, initialName, onCancel, onConfirm }: CropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const urlRef = useRef(URL.createObjectURL(file));
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - d.x) / rect.width) * 2;
    const dy = ((e.clientY - d.y) / rect.height) * 2;
    setPan({ x: Math.max(-1, Math.min(1, d.px + dx)), y: Math.max(-1, Math.min(1, d.py + dy)) });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const dataUrl = await fileToPhoto(file, { zoom, panX: pan.x, panY: pan.y });
      onConfirm(dataUrl);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Adjust photo"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#ffc83d40] bg-[#140a2e] p-5 shadow-[0_0_60px_rgba(124,58,237,0.35)]">
        <h2 className="font-display text-lg text-[#ffc83d]">ADJUST PHOTO</h2>
        {initialName ? <p className="mt-1 text-sm text-[#b9a9e8]">{initialName}</p> : null}
        <div
          className="relative mt-4 aspect-square w-full cursor-grab touch-none overflow-hidden rounded-xl border-2 border-[#7c3aed] bg-black active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            src={urlRef.current}
            alt=""
            draggable={false}
            className="pointer-events-none h-full w-full select-none object-cover transition-transform duration-75"
            style={{
              transform: `scale(${zoom}) translate(${pan.x * 12}%, ${pan.y * 12}%)`,
              objectPosition: '50% 20%',
            }}
          />
          <div className="pointer-events-none absolute inset-4 rounded-lg border border-dashed border-white/30" />
        </div>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[#b9a9e8]">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-1 w-full accent-[#ff2bd6]"
            aria-label="Zoom"
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-[#b9a9e8] hover:border-white/50"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="crop-confirm"
            disabled={busy}
            onClick={confirm}
            className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ff2bd6] px-5 py-2 text-sm font-bold text-white shadow-[0_0_20px_#ff2bd666] disabled:opacity-60"
          >
            {busy ? 'Processing…' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
