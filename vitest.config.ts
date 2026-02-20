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
      exclude: [
        'src/routeTree.gen.ts',
        'src/vite-env.d.ts',
        'src/App.tsx',
        'src/main.tsx',
        'src/router.tsx',
        'src/routes/**',
        'src/types/**',
        'src/components/index.ts',
        'src/components/ui/**',
        'src/components/skeletons/**',
        'src/components/icons/**',
      ],
      thresholds: {
        perFile: true,
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
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
