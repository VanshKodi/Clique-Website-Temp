import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CropModal } from '../components/CropModal';
import { PhotoCard } from '../components/PhotoCard';
import { SettingsPanel } from '../components/SettingsPanel';
import { demoPeople, fileNameToName } from '../lib/demo';
import { downloadRoster, parseRosterJson } from '../lib/export';
import { fileToPhoto } from '../lib/photo';
import { getPool, newId, useRouletteStore } from '../store';

type PendingCrop =
  | { mode: 'add'; file: File; name: string }
  | { mode: 'replace'; file: File; personId: string };

export function SetupPage() {
  const navigate = useNavigate();
  const people = useRouletteStore((s) => s.people);
  const teams = useRouletteStore((s) => s.teams);
  const settings = useRouletteStore((s) => s.settings);
  const initialized = useRouletteStore((s) => s.initialized);
  const store = useRouletteStore.getState;

  const [crop, setCrop] = useState<PendingCrop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const singleRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
    if (!initialized) {
      const s = useRouletteStore.getState();
      if (s.people.length === 0) s.addPeople(demoPeople());
      s.markInitialized();
    }
  }, [initialized]);

  const pool = getPool({ people, teams });
  const presentCount = people.filter((p) => p.present).length;
  const hasTeams = teams.length > 0;

  const guard = (fn: () => void) => {
    try {
      fn();
      setError(null);
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        setError('Storage is full — remove some people or photos, then try again. Export a JSON backup first.');
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    }
  };

  const importFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/')).slice(0, 60);
    if (images.length === 0) return;
    guard(() => setError(null));
    const added: { id: string; name: string; photo: string; present: boolean }[] = [];
    let fallback = useRouletteStore.getState().people.length + 1;
    for (const file of images) {
      try {
        const photo = await fileToPhoto(file);
        const name = fileNameToName(file.name) || `Player ${fallback}`;
        added.push({ id: newId(), name, photo, present: true });
        fallback++;
      } catch {
        /* skip unreadable image */
      }
    }
    if (added.length > 0) guard(() => useRouletteStore.getState().addPeople(added));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void importFiles([...e.dataTransfer.files]);
  };

  const onCropConfirm = (dataUrl: string) => {
    if (!crop) return;
    guard(() => {
      const s = useRouletteStore.getState();
      if (crop.mode === 'add') {
        s.addPeople([{ id: newId(), name: crop.name, photo: dataUrl, present: true }]);
      } else {
        s.updatePerson(crop.personId, { photo: dataUrl });
      }
    });
    setCrop(null);
  };

  const startDraw = () => {
    if (hasTeams) {
      navigate('/hidden/draw/slots');
      return;
    }
    navigate('/hidden/draw/slots');
  };

  const startNew = () => {
    if (window.confirm('Start a new draw? Current teams will be cleared.')) {
      guard(() => useRouletteStore.getState().resetDraw());
      navigate('/hidden/draw/slots');
    }
  };

  const onImportRoster = async (file: File) => {
    try {
      const parsed = parseRosterJson(await file.text());
      if (!window.confirm(`Replace the current roster with ${parsed.length} imported people?`)) return;
      guard(() => {
        const s = useRouletteStore.getState();
        s.resetDraw();
        useRouletteStore.setState({ people: parsed });
        s.markInitialized();
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import that file.');
    }
  };

  return (
    <div className="min-h-screen pb-24" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <header className="sticky top-0 z-20 border-b border-[#7c3aed]/40 bg-[#0b0618]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
          <h1 className="font-display text-xl text-white sm:text-2xl">
            TEAM<span className="text-[#ff2bd6]">·</span>ROULETTE
          </h1>
          <span className="rounded-full border border-[#22d3ee] bg-[#22d3ee]/10 px-3 py-1 text-sm font-bold text-[#22d3ee]">
            {presentCount} / {people.length} here
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => singleRef.current?.click()}
              className="rounded-full border border-[#7c3aed] px-3 py-1.5 font-bold text-[#c4b5fd] hover:bg-[#7c3aed]/25"
            >
              + Add person
            </button>
            <button
              type="button"
              onClick={() => bulkRef.current?.click()}
              className="rounded-full border border-[#7c3aed] px-3 py-1.5 font-bold text-[#c4b5fd] hover:bg-[#7c3aed]/25"
            >
              + Bulk photos
            </button>
            <button
              type="button"
              onClick={() => downloadRoster(people, settings)}
              className="rounded-full border border-white/20 px-3 py-1.5 text-[#b9a9e8] hover:border-white/50 hover:text-white"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="rounded-full border border-white/20 px-3 py-1.5 text-[#b9a9e8] hover:border-white/50 hover:text-white"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Remove the demo people from the roster?')) {
                  guard(() =>
                    useRouletteStore.setState({
                      people: useRouletteStore.getState().people.filter((p) => !p.id.startsWith('demo-')),
                    }),
                  );
                }
              }}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[#8f7fc0] hover:border-[#ff2bd6]/60 hover:text-[#ff2bd6]"
            >
              Clear demo
            </button>
          </div>
        </div>
        {error ? (
          <div className="mx-auto mt-3 max-w-7xl rounded-lg border border-[#ff2bd6] bg-[#ff2bd6]/15 px-4 py-2 text-sm font-semibold text-[#ff7de4]" role="alert">
            {error}
          </div>
        ) : null}
      </header>

      <main className="mx-auto mt-6 grid max-w-7xl gap-6 px-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-display text-sm tracking-wide text-[#ffc83d]">ROSTER</h2>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ffc83d]/50 to-transparent" />
            <span className="text-xs text-[#b9a9e8]">tap a photo to mark absent · drop images here to add</span>
          </div>

          <div
            className={`grid grid-cols-2 gap-3 rounded-2xl border-2 border-dashed p-3 transition sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 ${
              dragging ? 'border-[#ff2bd6] bg-[#ff2bd6]/10' : 'border-[#7c3aed]/40'
            }`}
          >
            {people.map((p) => (
              <PhotoCard
                key={p.id}
                person={p}
                onToggle={() => guard(() => store().togglePresent(p.id))}
                onRename={(name) => guard(() => store().updatePerson(p.id, { name }))}
                onReplace={(file) => setCrop({ mode: 'replace', file, personId: p.id })}
                onRemove={() => {
                  if (window.confirm(`Remove ${p.name} from the roster?`)) guard(() => store().removePerson(p.id));
                }}
              />
            ))}
            {people.length === 0 ? (
              <div className="col-span-full py-14 text-center text-sm text-[#b9a9e8]">
                Roster is empty — drop photos here or add people to begin.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <SettingsPanel />

          <div className="rounded-2xl border border-[#ff2bd6]/50 bg-[#140a2e]/80 p-5 backdrop-blur">
            {hasTeams ? (
              <>
                <p className="text-sm text-[#b9a9e8]">
                  Draw in progress — <span className="font-bold text-[#ffc83d]">{teams.length}</span>{' '}
                  {teams.length === 1 ? 'team' : 'teams'} drawn, {pool.length} in the pool.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    data-testid="start-draw"
                    onClick={startDraw}
                    className="flex-1 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ff2bd6] px-6 py-4 font-display text-sm text-white shadow-[0_0_28px_#ff2bd666] transition hover:brightness-125"
                  >
                    RESUME DRAW →
                  </button>
                  <button
                    type="button"
                    onClick={startNew}
                    className="rounded-full border border-white/25 px-4 py-4 text-sm text-[#b9a9e8] hover:border-[#ff2bd6] hover:text-[#ff2bd6]"
                  >
                    Start new
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#b9a9e8]">
                  {presentCount < 2
                    ? 'Need at least 2 people present to draw.'
                    : `${presentCount} ready. The house always picks fairly — crypto-random draws.`}
                </p>
                <button
                  type="button"
                  data-testid="start-draw"
                  disabled={presentCount < 2}
                  onClick={startDraw}
                  className="mt-4 w-full rounded-full border-2 border-[#ffc83d] bg-gradient-to-r from-[#ffc83d] via-[#ff2bd6] to-[#7c3aed] px-6 py-4 font-display text-base text-[#0b0618] shadow-[0_0_36px_rgba(255,43,214,0.55)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-white/20 disabled:from-white/10 disabled:via-white/10 disabled:to-white/10 disabled:text-white/40 disabled:shadow-none"
                >
                  START DRAW →
                </button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-[#8f7fc0]">
            Roster is saved on this laptop. Use the same browser profile on event day.
          </p>
        </aside>
      </main>

      <input
        ref={singleRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setCrop({ mode: 'add', file: f, name: fileNameToName(f.name) || 'New Player' });
          e.target.value = '';
        }}
      />
      <input
        ref={bulkRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void importFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImportRoster(f);
          e.target.value = '';
        }}
      />

      {crop ? (
        <CropModal file={crop.file} initialName={crop.mode === 'add' ? crop.name : undefined} onCancel={() => setCrop(null)} onConfirm={onCropConfirm} />
      ) : null}
    </div>
  );
}
