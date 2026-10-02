import { useState } from 'react';
import type { Remainder } from '../engine/types';
import { getPool, previewPlan, useRouletteStore } from '../store';

const REMAINDERS: Array<{ key: Remainder; label: string; blurb: string }> = [
  { key: 'balanced', label: 'Balanced', blurb: 'Even spread, size is a max — 12 people, size 5 → 4 / 4 / 4' },
  { key: 'fillLast', label: 'Fill last', blurb: 'Fill up, smaller team last — 12 people, size 5 → 5 / 5 / 2' },
  { key: 'bench', label: 'Bench', blurb: 'Full teams only, rest are substitutes — 12 people, size 5 → 5 / 5 + 2 subs' },
];

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
        active
          ? 'bg-gradient-to-r from-[#7c3aed] to-[#ff2bd6] text-white shadow-[0_0_16px_#ff2bd655]'
          : 'text-[#b9a9e8] hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export function SettingsPanel() {
  const settings = useRouletteStore((s) => s.settings);
  const setSettings = useRouletteStore((s) => s.setSettings);
  const people = useRouletteStore((s) => s.people);
  const teams = useRouletteStore((s) => s.teams);
  const [custom, setCustom] = useState(String(settings.size));

  const state = { people, teams, settings };
  const pool = getPool(state);
  const plan = previewPlan(state);
  const total = plan.sizes.reduce((a, b) => a + b, 0);

  const setCustomSize = (raw: string) => {
    setCustom(raw);
    const n = Math.max(1, Math.min(20, Math.round(Number(raw) || 1)));
    setSettings({ by: 'size', size: n });
  };

  return (
    <div className="rounded-2xl border border-[#7c3aed]/50 bg-[#140a2e]/80 p-5 backdrop-blur">
      <h2 className="font-display text-sm tracking-wide text-[#22d3ee]">SETTINGS</h2>

      <div className="mt-4 flex gap-1 rounded-xl bg-black/40 p-1">
        <SegButton active={settings.by === 'size'} onClick={() => setSettings({ by: 'size' })}>
          Team size
        </SegButton>
        <SegButton active={settings.by === 'count'} onClick={() => setSettings({ by: 'count' })}>
          Number of teams
        </SegButton>
      </div>

      {settings.by === 'size' ? (
        <>
          <div className="mt-3 flex gap-1 rounded-xl bg-black/40 p-1">
            {[3, 4, 5].map((n) => (
              <SegButton
                key={n}
                active={settings.size === n && String(n) !== custom}
                onClick={() => {
                  setCustom(String(n));
                  setSettings({ by: 'size', size: n });
                }}
              >
                {n}
              </SegButton>
            ))}
            <div
              className={`flex flex-1 items-center gap-1 rounded-lg px-2 ${
                ![3, 4, 5].includes(settings.size) ? 'bg-gradient-to-r from-[#7c3aed] to-[#ff2bd6]' : ''
              }`}
            >
              <input
                type="number"
                min={1}
                max={20}
                value={custom}
                onChange={(e) => setCustomSize(e.target.value)}
                aria-label="Custom team size"
                className={`w-full min-w-0 bg-transparent text-center text-sm font-bold outline-none ${
                  ![3, 4, 5].includes(settings.size) ? 'text-white' : 'text-[#b9a9e8]'
                }`}
              />
              <span className={`text-xs ${![3, 4, 5].includes(settings.size) ? 'text-white' : 'text-[#b9a9e8]'}`}>
                max
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {REMAINDERS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setSettings({ remainder: r.key })}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  settings.remainder === r.key
                    ? 'border-[#ffc83d] bg-[#ffc83d]/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <span className="block text-sm font-bold text-white">{r.label}</span>
                <span className="block text-xs text-[#b9a9e8]">{r.blurb}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-3 flex items-center justify-center gap-4 rounded-xl bg-black/40 py-3">
          <button
            type="button"
            onClick={() => setSettings({ count: Math.max(1, settings.count - 1) })}
            className="h-9 w-9 rounded-full border border-white/20 text-lg text-white hover:border-[#ff2bd6] hover:text-[#ff2bd6]"
            aria-label="Fewer teams"
          >
            −
          </button>
          <span className="font-display text-2xl text-[#ffc83d]" aria-live="polite">
            {settings.count}
          </span>
          <button
            type="button"
            onClick={() => setSettings({ count: Math.min(50, settings.count + 1) })}
            className="h-9 w-9 rounded-full border border-white/20 text-lg text-white hover:border-[#ff2bd6] hover:text-[#ff2bd6]"
            aria-label="More teams"
          >
            +
          </button>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-[#22d3ee]/40 bg-[#0b0618] p-3">
        <div data-testid="preview-line" className="flex items-center gap-2 text-sm text-white">
          <span className="font-bold text-[#22d3ee]">{pool.length} here</span>
          <span className="text-[#b9a9e8]">→</span>
          <span className="font-bold text-[#ffc83d]">
            {plan.sizes.length} {plan.sizes.length === 1 ? 'team' : 'teams'}
            {plan.bench > 0 ? ` + ${plan.bench} subs` : ''}
          </span>
          {plan.sizes.length > 0 ? (
            <span className="font-mono text-[#b9a9e8]">: {plan.sizes.join(' / ')}</span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {pool.slice(0, 14).map((p) => (
            <img
              key={p.id}
              src={p.photo || undefined}
              alt=""
              title={p.name}
              className="h-6 w-6 rounded-full border border-[#7c3aed]/60 object-cover"
              style={{ objectPosition: '50% 20%' }}
            />
          ))}
          {pool.length > 14 ? <span className="text-xs text-[#b9a9e8]">+{pool.length - 14}</span> : null}
          {total > pool.length ? <span className="text-xs text-[#b9a9e8]">…</span> : null}
        </div>
        {plan.warnings.includes('single-person-team') ? (
          <p className="mt-2 rounded bg-[#ff2bd6]/15 px-2 py-1 text-xs font-semibold text-[#ff2bd6]">
            ⚠ One-person team — pick a smaller team size or another strategy.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('Reset everything? This clears all saved data and reloads.')) {
            localStorage.removeItem('team-roulette:v2');
            window.location.reload();
          }
        }}
        className="mt-4 w-full rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-400 transition hover:bg-red-500/20"
      >
        Reset All Data
      </button>
    </div>
  );
}
