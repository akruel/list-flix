import path from 'node:path'
import { defineConfig, defineProject } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/routeTree.gen.ts', 'src/vite-env.d.ts'],
    },
    projects: [
      defineProject({
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.unit.test.ts', 'src/**/*.test.ts'],
          exclude: ['src/**/*.test.tsx', 'tests/rls/**/*.test.ts', 'e2e/**/*.ts'],
        },
      }),
      defineProject({
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/test/setup.ts'],
          exclude: ['tests/rls/**/*.test.ts', 'e2e/**/*.ts'],
        },
      }),
      defineProject({
        extends: true,
        test: {
          name: 'rls',
          environment: 'node',
          include: ['tests/rls/**/*.test.ts'],
          exclude: ['e2e/**/*.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      }),
    ],
  },
})
