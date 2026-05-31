import { defineConfig } from 'vitest/config';

// Unit tests for the pure logic layer only. Playwright owns tests/ (testDir),
// so we scope Vitest to co-located src/**/*.test.js and never touch the E2E specs.
export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
});
