import ignusPoster from '../assets/banner/ignus-poster-full.png';

// ---- HOME: event-is-live popup + "what's on" section ----
// Single source of truth for both. Flip `enabled` to kill the popup without
// touching components.
export const EVENT_POPUP = {
  enabled: true,
  // Popup only renders after this instant (ISO, local time).
  startsAt: '2026-10-02T00:00:00+05:30',
  // Hard schedule: popup removes itself this many days after first shown,
  // even if the visitor never closes it.
  hideAfterDays: 2,
};

export interface EventItem {
  id: string;
  title: string;
  kicker: string;
  day: string;
  month: string;
  time: string;
  venue: string;
  tags: string[];
  status: 'LIVE' | 'UPCOMING';
  cta: string;
  href: string;
  poster?: string;
}

export const EVENTS: EventItem[] = [
  {
    id: 'gauntlet-01',
    title: 'THE GAUNTLET',
    kicker: 'IGNUS · ISSUE NO. 01',
    day: '03',
    month: 'OCT',
    time: 'TIME TBA',
    venue: 'NIRMA CAMPUS · VENUE TBA',
    tags: ['GAME NIGHT', 'BIDDING WAR', 'DOOM DECREE'],
    status: 'LIVE',
    cta: 'ENTER',
    href: '/gauntlet',
    poster: ignusPoster,
  },
];
