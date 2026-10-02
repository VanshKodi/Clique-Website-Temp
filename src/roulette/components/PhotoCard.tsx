import { useEffect, useRef, useState } from 'react';
import type { Person } from '../engine/types';

interface PhotoCardProps {
  person: Person;
  onToggle: () => void;
  onRename: (name: string) => void;
  onReplace: (file: File) => void;
  onRemove: () => void;
}

export function PhotoCard({ person, onToggle, onRename, onReplace, onRemove }: PhotoCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(person.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next) onRename(next);
    else setDraft(person.name);
    setEditing(false);
  };

  return (
    <div
      data-testid={`person-card-${person.id}`}
      className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
        person.present
          ? 'border-[#ffc83d]/60 shadow-[0_0_18px_rgba(255,200,61,0.15)] hover:shadow-[0_0_26px_rgba(255,43,214,0.35)]'
          : 'border-white/10 opacity-55 grayscale'
      }`}
    >
      <button
        type="button"
        data-testid={`present-toggle-${person.id}`}
        aria-label={person.present ? `Mark ${person.name} absent` : `Mark ${person.name} present`}
        aria-pressed={person.present}
        onClick={onToggle}
        className="block w-full"
      >
        <div className="aspect-square w-full overflow-hidden bg-[#1c0f3f]">
          <img
            src={person.photo || undefined}
            alt={person.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: '50% 20%' }}
          />
        </div>
      </button>

      {!person.present ? (
        <span className="absolute left-1/2 top-1/3 -translate-x-1/2 -rotate-12 rounded border-2 border-[#ff2bd6] bg-black/70 px-3 py-1 font-display text-sm text-[#ff2bd6]">
          ABSENT
        </span>
      ) : null}

      <div className="flex items-center gap-1 border-t border-white/10 bg-[#140a2e] px-2 py-1.5">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(person.name);
                setEditing(false);
              }
            }}
            className="w-full min-w-0 rounded bg-black/40 px-1 py-0.5 text-sm text-white outline-none ring-1 ring-[#ff2bd6]"
            aria-label="Person name"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(person.name);
              setEditing(true);
            }}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-white hover:text-[#ffc83d]"
            title="Click to rename"
          >
            {person.name}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 rounded p-1 text-xs text-[#b9a9e8] hover:bg-white/10 hover:text-white"
          aria-label={`Replace photo for ${person.name}`}
          title="Replace photo"
        >
          ↻
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-xs text-[#b9a9e8] hover:bg-[#ff2bd6]/20 hover:text-[#ff2bd6]"
          aria-label={`Remove ${person.name}`}
          title="Remove"
        >
          ✕
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onReplace(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
