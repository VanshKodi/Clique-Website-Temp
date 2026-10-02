export const THEME = {
  accent: '#4DE8FF',
  lime: '#CDFF4D',
  pink: '#FF6FB5',
  tickerSecs: 30,
  show3d: true,
};

// Accent palettes from the design prototype's theme props.
export const ACCENT_OPTIONS = ['#E8823A', '#CDFF4D', '#4DE8FF', '#B48CFF'];

export const NAV_LINKS = [
  { href: '#about', label: 'ABOUT' },
  { href: '#story', label: 'STORY' },
  { href: '#focus', label: 'FOCUS' },
  { href: '#wall', label: 'WALL' },
  { href: '#events', label: 'EVENTS' },
  { href: '#people', label: 'PEOPLE' },
];

export const TICKER_ITEMS = [
  { text: 'INFORMATION TECHNOLOGY', color: 'var(--accent)' },
  { text: 'ANALYTICS', color: 'var(--lime)' },
  { text: 'COMMUNICATIONS', color: 'var(--accent)' },
  { text: 'MEDIA', color: 'var(--pink)' },
  { text: 'DIGITAL ECONOMY', color: 'var(--accent)' },
];

export const STORY_PHASES = [
  {
    tag: 'PHASE 01',
    title: 'Built like a network.',
    body: 'Every member a node. Every project an edge. Certified connected.',
  },
  {
    tag: 'PHASE 02',
    title: 'Look closer.',
    body: "IT × analytics, fused at the core. That's the whole personality.",
  },
  {
    tag: 'PHASE 03',
    title: 'Take it apart.',
    body: 'Workshops. Events. Comps. Careers. The full lore.',
  },
  {
    tag: 'PHASE 04',
    title: 'It snaps back together.',
    body: 'One clique. No cap.',
  },
];

export const STORY_EXPLODE_LABELS = [
  { tag: 'NODE / 21', label: 'THE MEMBERS' },
  { tag: 'EDGE / ∞', label: 'THE COLLABORATIONS' },
  { tag: 'CORE / 01', label: 'THE IDEA' },
];

export const TERMINAL_LINES = [
  '$ workshop --topic sql',
  '→ 14 seats · 14 built dashboards',
  '$ workshop --topic python',
  '→ intro to analytics, saturday, cr-4',
  '$ vibe --check',
  '→ hands-on. no lectures. only building.',
];

const MEMORY_TAPES = [
  'color-mix(in oklab, var(--accent) 55%, #FFFFFF30)',
  'color-mix(in oklab, var(--lime) 60%, #FFFFFF30)',
  'color-mix(in oklab, var(--pink) 60%, #FFFFFF30)',
];
const MEMORY_ROTATIONS = ['-5deg', '4deg', '-3deg', '6deg'];

// Photos live in src/assets/memory. Each file's name (sans extension) is its
// tagline — drop a new image in that folder and it joins the globe automatically.
const memoryImages = import.meta.glob('../assets/memory/*.{jpeg,jpg,png,JPEG,JPG,PNG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const stripExt = (file: string) => file.replace(/\.[^.]+$/, '');

const memoryEntries = Object.entries(memoryImages)
  .map(([path, src]) => ({ label: stripExt(path.split('/').pop() ?? ''), src }))
  .sort((a, b) => a.label.localeCompare(b.label));

export interface MemoryCard {
  i: number;
  id: string;
  label: string;
  joke: string;
  src: string;
  tape: string;
  tapeRot: string;
}

export const MEMORY_CARDS: MemoryCard[] = memoryEntries.map(({ label, src }, i) => ({
  i,
  id: `wall-${i + 1}`,
  label,
  joke: label,
  src,
  tape: MEMORY_TAPES[i % MEMORY_TAPES.length],
  tapeRot: MEMORY_ROTATIONS[i % MEMORY_ROTATIONS.length],
}));

// ---- HERO BAND · POSTER DROP Nº 01 ----
// Photos live in src/assets/posters (Wikimedia Commons cosplay shots, CC BY /
// CC BY-SA). `focus` is the object-position used when the portrait card crops
// the landscape/oversized originals — nudge it if a face sits too low.
const posterImages = import.meta.glob('../assets/posters/*.{jpeg,jpg,png,JPEG,JPG,PNG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export interface Poster {
  id: string;
  name: string;
  tag: string;
  src: string;
  focus: string;
  tilt: number;
}

const POSTER_ORDER = [
  { key: 'doom', name: 'DR. DOOM', tag: '/ VILLAIN', focus: 'center 28%', tilt: -2.5 },
  { key: 'thor', name: 'THOR', tag: '/ ASGARD', focus: 'center 14%', tilt: 2 },
  { key: 'ironman', name: 'IRON MAN', tag: '/ SUIT', focus: 'center 26%', tilt: -1.5 },
  { key: 'cap', name: 'CAP', tag: '/ SHIELD', focus: 'center 24%', tilt: 1.5 },
];

const posterSrc = (file: string) =>
  posterImages[Object.keys(posterImages).find((p) => p.endsWith(`/${file}.jpg`)) ?? ''] ?? '';

export const POSTERS: Poster[] = POSTER_ORDER.map((p) => ({
  id: `poster-${p.key}`,
  name: p.name,
  tag: p.tag,
  src: posterSrc(p.key),
  focus: p.focus,
  tilt: p.tilt,
}));

export const FOCUS_CARDS = {
  handsOn: {
    tag: '/ 01',
    title: 'Hands-on Learning',
    body: 'We conduct workshops and hands-on sessions to build practical IT and analytics skills.',
    sticker: 'actually useful ✦',
  },
  industry: {
    tag: '/ 02',
    title: 'Industry Connect',
    body: 'We host speaker sessions with industry experts, bringing real-world insights to campus.',
    sticker: 'unfiltered lore',
  },
  events: {
    tag: '/ 03',
    title: 'Events & Engagement',
    body: 'We organize gaming events, case competitions, and innovation challenges that spark creativity and teamwork.',
    sticker: 'chaos, but productive',
  },
  community: {
    tag: '/ 04',
    title: 'Community Building',
    body: 'We foster a community where like-minded peers connect, collaborate, and grow.',
    sticker: 'no gatekeeping',
  },
};

export const MEMBER_ROWS: { names: string[]; outline: boolean; speedMult: number; direction: 'forward' | 'reverse' }[] = [
  {
    names: ['Dharm Thummar', 'Bhavnish Nanda', 'Dev Mehta', 'Raghav Joshi', 'Sparsh Partani'],
    outline: false,
    speedMult: 1.4,
    direction: 'forward',
  },
  {
    names: ['Hardik Jain', 'Chinmay', 'Ansh Shah', 'Nandini Agarwal'],
    outline: true,
    speedMult: 1.6,
    direction: 'reverse',
  },
  {
    names: ['Dhun Chhabra', 'Aryan Patel', 'Raunak Prasad', 'Rudraksh Chhabra'],
    outline: false,
    speedMult: 1.8,
    direction: 'forward',
  },
];

export const FACULTY_COORDINATOR = 'Prof. Somayya Madakam';

export const BARCODE_WIDTHS = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2];

export const SOCIAL_LINKS = [
  { label: 'Instagram', handle: '@clique_imnu', href: 'https://instagram.com/clique_imnu', icon: 'instagram' as const },
  { label: 'LinkedIn', handle: 'clique-the-it-analytics-club-imnu', href: 'https://www.linkedin.com/company/clique-the-it-analytics-club-imnu/', icon: 'linkedin' as const },
  { label: 'Nirma', handle: 'management.nirmauni.ac.in', href: 'https://management.nirmauni.ac.in/student/clique/', icon: 'globe' as const },
];

export const JOIN_FORM_URL = 'https://management.nirmauni.ac.in/student/clique/';
export const INSTAGRAM_URL = 'https://instagram.com/clique_imnu';
export const LINKEDIN_URL = 'https://www.linkedin.com/company/clique-the-it-analytics-club-imnu/';
export const NIRMA_URL = 'https://management.nirmauni.ac.in/student/clique/';

// ---- THE GAUNTLET (Issue Nº 01) ----
// Single source of truth for the /gauntlet hero meta pills. Update these
// when the date / venue / format is locked — GauntletPage reads them.
export const GAUNTLET_META = {
  issue: 'ISSUE Nº 01 — IGNUS',
  date: 'SAT · OCT 3 · TIME TBA',
  venue: 'VENUE TBA',
  format: 'JUST FOR FUN',
};

export const GAUNTLET_TRIVIA_CATEGORIES = [
  'Tech & AI',
  'Comics & Cinema',
  'Sports & Speed',
  'Random Chaos',
];
