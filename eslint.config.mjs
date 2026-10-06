import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Patrón fetch-en-useEffect usado en dashboard/book: válido aquí,
      // la regla nueva de React 19 lo marca como error. Lo dejamos en warn
      // hasta la refactorización a Server Components / TanStack Query.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
