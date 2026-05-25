import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Legal/marketing copy uses straight quotes; not worth entity escapes in prose.
      "react/no-unescaped-entities": "off",
      // Common patterns (localStorage hydration, fetch-on-mount) are valid here.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "app/.well-known/**",
  ]),
]);
