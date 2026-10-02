import type { Person } from '../engine/types';

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const HUES = [265, 315, 45, 170, 200, 15, 120, 285, 55, 210, 335, 95];

export function avatarDataUrl(name: string, seed = 0): string {
  const hue1 = HUES[seed % HUES.length];
  const hue2 = HUES[(seed + 5) % HUES.length];
  const initials = initialsOf(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue1},80%,55%)"/><stop offset="1" stop-color="hsl(${hue2},80%,38%)"/></linearGradient></defs><rect width="256" height="256" fill="url(#g)"/><text x="128" y="150" font-family="Arial, sans-serif" font-size="92" font-weight="700" fill="rgba(255,255,255,0.92)" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function fileNameToName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/\s*\(\d+\)\s*$/, '');
  const words = base
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\d{4,}/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((w) => (w.length <= 2 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

const ROSTER: { name: string; photo: string }[] = [
  { name: 'Chinmay', photo: `${import.meta.env.BASE_URL}assets/members/Chinmay.jpeg` },
  { name: 'Nandini', photo: `${import.meta.env.BASE_URL}assets/members/Nandini.jpeg` },
  { name: 'Aryan', photo: `${import.meta.env.BASE_URL}assets/members/Aaryan.jpeg` },
  { name: 'Dharm', photo: `${import.meta.env.BASE_URL}assets/members/Dharm.jpeg` },
  { name: 'Raunak', photo: `${import.meta.env.BASE_URL}assets/members/Raunak.jpeg` },
  { name: 'Sparsh', photo: `${import.meta.env.BASE_URL}assets/members/Sparsh.jpeg` },
  { name: 'Dev', photo: `${import.meta.env.BASE_URL}assets/members/Dev.jpeg` },
  { name: 'Ansh', photo: `${import.meta.env.BASE_URL}assets/members/Ansh.jpeg` },
  { name: 'Raghav', photo: `${import.meta.env.BASE_URL}assets/members/Raghav.jpeg` },
  { name: 'Bhavnish', photo: `${import.meta.env.BASE_URL}assets/members/Bhavnish.jpeg` },
  { name: 'Rudraksh', photo: `${import.meta.env.BASE_URL}assets/members/Rudraksh.jpeg` },
  { name: 'Dhun', photo: `${import.meta.env.BASE_URL}assets/members/Dhun.jpg` },
  { name: 'Hardik', photo: `${import.meta.env.BASE_URL}assets/members/Hardik.jpeg` },
];

export function demoPeople(): Person[] {
  return ROSTER.map((p, i) => ({
    id: `demo-${i + 1}`,
    name: p.name,
    photo: p.photo,
    present: true,
  }));
}
