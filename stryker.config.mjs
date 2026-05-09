const config = {
  packageManager: "npm",
  plugins: [
    "@stryker-mutator/vitest-runner",
    "@stryker-mutator/typescript-checker",
  ],
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.stryker.config.ts",
  },
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
  mutate: [
    "src/**/*.{ts,tsx}",
    "!src/routeTree.gen.ts",
    "!src/vite-env.d.ts",
    "!src/App.tsx",
    "!src/main.tsx",
    "!src/router.tsx",
    "!src/routes/**",
    "!src/types/**",
    "!src/components/index.ts",
    "!src/components/ui/**",
    "!src/components/skeletons/**",
    "!src/components/icons/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
  ],
  reporters: ["html", "clear-text", "progress"],
  thresholds: { high: 80, low: 60, break: 50 },
  concurrency: 4,
  tempDirName: "stryker-tmp",
};

export default config;
