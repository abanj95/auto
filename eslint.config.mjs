import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Scripts in scripts/ use the secret key; app code must never import them.
    files: ["app/**", "components/**", "lib/**", "proxy.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/scripts/**", "@/scripts/**"],
              message: "scripts/ is for local tools only; never import it in app code.",
            },
          ],
        },
      ],
    },
  },
  // Turn off rules that conflict with Prettier (must come last).
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
    "public/vendor/**",
  ]),
]);

export default eslintConfig;
