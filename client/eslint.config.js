import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooksPlugin from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import a11yPlugin from "eslint-plugin-jsx-a11y";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs",
      ".eslintrc*",
    ],
  },
  // Base JS recommended rules
  js.configs.recommended,
  // TypeScript recommended + stylistic
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  // React settings (no plugin object spread — avoids flat-config plugins-array bug)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off", // React 19 JSX transform
      "react/prop-types": "off", // deprecated with TS
      "react/no-unknown-property": "off", // false-positives on CSS vars
      "react/jsx-uses-react": "off",
    },
  },
  // React Hooks
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": hooksPlugin,
    },
    rules: hooksPlugin.configs.recommended.rules,
  },
  // jsx-a11y
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "jsx-a11y": a11yPlugin,
    },
    rules: a11yPlugin.configs.recommended.rules,
  },
  // import ordering
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/order": [
        "error",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
          ],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          "newlines-between": "never",
        },
      ],
      "import/no-duplicates": "error",
      "import/no-unresolved": "off", // handled by TS + bundler
    },
  },
  // Custom rule overrides
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
  // Test file overrides
  {
    files: ["**/__tests__/**"],
    rules: {
      "import/order": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  // Prettier — disable conflicting rules
  prettierConfig,
);
