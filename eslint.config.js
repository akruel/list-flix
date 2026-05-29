import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import jsxA11y from "eslint-plugin-jsx-a11y";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import testingLibrary from "eslint-plugin-testing-library";
import vitest from "@vitest/eslint-plugin";
import boundaries from "eslint-plugin-boundaries";
import { defineConfig, globalIgnores } from "eslint/config";

const jsxA11yRecommendedRules = jsxA11y.configs.recommended.rules;

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
    "stryker-tmp",
    "src/routeTree.gen.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.strict,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      security.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      prettier,
    ],
    plugins: {
      "simple-import-sort": simpleImportSort,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "security/detect-object-injection": "off",
      "@typescript-eslint/no-dynamic-delete": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      ...jsxA11yRecommendedRules,
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/no-autofocus": "error",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/mouse-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "react/prop-types": "off",
      "react/require-default-props": "off",
      "react/jsx-no-target-blank": "error",
      "react/self-closing-comp": "warn",
      "react/jsx-no-leaked-render": "warn",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-restricted-types": [
        "warn",
        {
          types: {
            "React.FC": {
              message:
                "Use function declaration (props: Props): JSX.Element instead",
            },
          },
        },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/contexts/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
      "src/routes/**/*.{ts,tsx}",
      "src/services/**/*.{ts,tsx}",
      "src/types/**/*.{ts,tsx}",
    ],
    ignores: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    plugins: {
      boundaries,
    },
    settings: {
      "import/resolver": {
        typescript: true,
      },
      "boundaries/elements": [
        { type: "query", pattern: "src/services/*.queries.ts", mode: "file" },
        { type: "query", pattern: "src/routes/**/*.queries.ts", mode: "file" },
        { type: "query", pattern: "src/routes/**/-queries.ts", mode: "file" },
        { type: "route", pattern: "src/routes/**" },
        { type: "ui", pattern: "src/components/ui/**" },
        {
          type: "component",
          pattern: "src/components/**",
          mode: "folder",
        },
        { type: "mutation", pattern: "src/hooks/mutations/**" },
        { type: "hook", pattern: "src/hooks/**" },
        { type: "service", pattern: "src/services/**" },
        { type: "context", pattern: "src/contexts/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "type", pattern: "src/types/**" },
        { type: "type", pattern: "src/router.tsx", mode: "file" },
      ],
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: { type: "service" },
              allow: { to: { type: ["service", "lib", "type"] } },
            },
            {
              from: { type: "query" },
              allow: { to: { type: ["service", "lib", "type"] } },
            },
            {
              from: { type: "mutation" },
              allow: { to: { type: ["service", "query", "lib", "type"] } },
            },
            {
              from: { type: "hook" },
              allow: {
                to: {
                  type: [
                    "query",
                    "mutation",
                    "service",
                    "context",
                    "lib",
                    "type",
                  ],
                },
              },
            },
            {
              from: { type: "component" },
              allow: {
                to: {
                  type: [
                    "ui",
                    "component",
                    "hook",
                    "mutation",
                    "context",
                    "lib",
                    "type",
                  ],
                },
              },
            },
            { from: { type: "ui" }, allow: { to: { type: ["lib", "type"] } } },
            {
              from: { type: "route" },
              allow: {
                to: {
                  type: [
                    "ui",
                    "component",
                    "hook",
                    "mutation",
                    "query",
                    "context",
                    "lib",
                    "type",
                  ],
                },
              },
            },
            {
              from: { type: "context" },
              allow: { to: { type: ["service", "query", "lib", "type"] } },
            },
            { from: { type: "lib" }, allow: { to: { type: ["lib", "type"] } } },
            {
              from: { type: "type" },
              allow: { to: { type: ["type", "lib"] } },
            },
          ],
        },
      ],
    },
  },
  {
    ...testingLibrary.configs["flat/react"],
    files: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
  },
  {
    ...vitest.configs.recommended,
    files: [
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    languageOptions: {
      globals: { ...vitest.environments.env.globals },
    },
  },
]);
