import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/roulette/**/*.test.ts'],
    restoreMocks: true,
  },
});
