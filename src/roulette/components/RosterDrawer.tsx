import { useRef } from 'react';
import { newId, useRouletteStore } from '../store';
import { fileNameToName } from '../lib/demo';
import { fileToPhoto } from '../lib/photo';

interface RosterDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function RosterDrawer({ open, onClose }: RosterDrawerProps) {
  const people = useRouletteStore((s) => s.people);
  const addRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const addLateArrival = async (file: File) => {
    const photo = await fileToPhoto(file);
    const name = fileNameToName(file.name) || `Late arrival ${people.length + 1}`;
    useRouletteStore.getState().addPeople([{ id: newId(), name, photo, present: true }]);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-80 max-w-[85vw] flex-col border-l-2 border-[#7c3aed] bg-[#140a2e] shadow-[-20px_0_60px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between border-b border-[#7c3aed]/50 px-4 py-3">
        <h2 className="font-display text-sm text-[#ffc83d]">ROSTER</h2>
        <button type="button" onClick={onClose} className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#b9a9e8] hover:text-white">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg bg-black/30 p-2">
              <img
                src={p.photo || undefined}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
                style={{ objectPosition: '50% 20%' }}
              />
              <span className={`min-w-0 flex-1 truncate text-sm ${p.present ? 'text-white' : 'text-[#8f7fc0] line-through'}`}>
                {p.name}
              </span>
              <button
                type="button"
                data-testid={`present-toggle-${p.id}`}
                onClick={() => useRouletteStore.getState().togglePresent(p.id)}
                aria-pressed={p.present}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  p.present
                    ? 'bg-[#22d3ee]/15 text-[#22d3ee] hover:bg-[#22d3ee]/30'
                    : 'bg-[#ff2bd6]/15 text-[#ff2bd6] hover:bg-[#ff2bd6]/30'
                }`}
              >
                {p.present ? 'HERE' : 'OUT'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-[#7c3aed]/50 p-3">
        <button
          type="button"
          onClick={() => addRef.current?.click()}
          className="w-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ff2bd6] px-4 py-2.5 text-sm font-bold text-white"
        >
          + Late arrival
        </button>
        <input
          ref={addRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addLateArrival(f);
            e.target.value = '';
          }}
        />
        <p className="mt-2 text-center text-[11px] text-[#8f7fc0]">
          Late arrivals drop into the pool for the next draw.
        </p>
      </div>
    </div>
  );
}
