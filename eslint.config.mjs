import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      // Generated / vendored bundles — linting these blew ESLint past its
      // ~4 GB heap (OOM, exit 134). The OpenNext worker output in
      // `.open-next/**` is the main offender; the rest are tooling artifacts.
      ".open-next/**",
      ".wrangler/**",
      ".opencode/**",
      ".agents/**",
      "coverage/**",
      ".claude/**",
      ".claude-flow/**",
      ".swarm/**",
      "scripts/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
];

export default config;
