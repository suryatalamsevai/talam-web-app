import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'MemberExpression[object.name="process"][property.name="env"][parent.property.name=/^NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|^NEXT_PUBLIC_.*SECRET|^NEXT_PUBLIC_.*KEY.*SECRET/]',
          message: "Never expose secret keys with NEXT_PUBLIC_ prefix.",
        },
      ],
    },
  },
]);

export default eslintConfig;
