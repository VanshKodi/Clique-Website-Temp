import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:5173';
mkdirSync('screenshots', { recursive: true });

async function launch() {
  for (const channel of ['msedge', 'chrome', undefined]) {
    try {
      return await chromium.launch(channel ? { channel } : {});
    } catch {
      /* try next */
    }
  }
  throw new Error('No browser could be launched');
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

const state = () =>
  page.evaluate(() => {
    const s = window.__tr;
    if (!s) return 'no-hook';
    const g = s.getState();
    return {
      teams: g.teams.length,
      animating: Boolean(g.animating),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      banner: document.body.innerText.includes('TEAM LOCKED'),
      chip: document.querySelector('[data-testid^="team-chip-"]')?.innerText.replace(/\n/g, '|') ?? '',
      poolFaces: document.querySelectorAll('[data-testid^="pool-face-"]').length,
      gridFaces: document.querySelectorAll('[data-testid^="grid-face-"]').length,
      gridVisible: [...document.querySelectorAll('[data-testid^="grid-face-"]')].filter(
        (el) => getComputedStyle(el).opacity !== '0',
      ).length,
    };
  });

const log = async (label) => console.log(Date.now() % 100000, label, JSON.stringify(await state()));

const MODE = process.argv[2] ?? 'slots';
const STAMP = Date.now();
console.log('stamp', STAMP);

await page.goto(`${BASE}/hidden`, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'screenshots/smoke-setup.png' });
await log('setup-loaded');

await page.locator('[data-testid=start-draw]').click();
await page.waitForURL('**/hidden/draw/slots');
if (MODE !== 'slots') {
  await page.goto(`${BASE}/hidden/draw/${MODE}`, { waitUntil: 'networkidle' });
  await page.waitForURL(`**/hidden/draw/${MODE}`);
}
await log('draw-page');

await page.click('[data-testid=next-team]');
await log('clicked-next');

await page.waitForTimeout(1500);
await page.screenshot({ path: `screenshots/smoke-${STAMP}-${MODE}-mid.png` });
await log('mid-spin-screenshot');

const deadline = Date.now() + 15000;
while (Date.now() < deadline) {
  const s = await state();
  if (s.animating === false) break;
  await page.waitForTimeout(300);
}
await log('animating-cleared');
await page.waitForTimeout(1500);
await log('settled');
await page.screenshot({ path: `screenshots/smoke-${STAMP}-${MODE}-end.png` });

console.log('console errors:', JSON.stringify(errors, null, 2));
await browser.close();


