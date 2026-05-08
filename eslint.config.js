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
import { defineConfig, globalIgnores } from "eslint/config";

const jsxA11yRecommendedRules = jsxA11y.configs.recommended.rules;

export default defineConfig([
  globalIgnores(["dist", "coverage", "playwright-report", "test-results"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.strict,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      security.configs.recommended,
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
      "no-secrets/no-secrets": [
        "error",
        { ignoreContent: [/via\.placeholder\.com/, /markEpisodeAsUnwatched/] },
      ],
      "security/detect-object-injection": "warn",
      "security/detect-possible-timing-attacks": "warn",
      "@typescript-eslint/no-dynamic-delete": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      ...jsxA11yRecommendedRules,
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
    },
  },
]);
