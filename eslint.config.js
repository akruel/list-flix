import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";
import jsxA11y from "eslint-plugin-jsx-a11y";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import testingLibrary from "eslint-plugin-testing-library";
import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";

const jsxA11yRecommendedRules = jsxA11y.configs.recommended.rules;

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
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
      "no-secrets": noSecrets,
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
