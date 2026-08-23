import antfu from "@antfu/eslint-config";
import boundaries from "eslint-plugin-boundaries";

const applicationTypeScript = ["apps/**/*.{ts,tsx}"];
const gatewaySource = ["apps/gateway/src/**/*.ts"];
const webSource = ["apps/web/src/**/*.{ts,tsx}"];

export default antfu(
  {
    type: "app",
    isInEditor: false,
    gitignore: true,
    node: true,
    react: true,
    jsx: {
      a11y: true,
    },
    typescript: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    formatters: false,
    stylistic: {
      indent: 2,
      quotes: "double",
      semi: true,
      braceStyle: "1tbs",
    },
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      ".artifacts/**",
      "apps/web/src/components/ui/**",
      "apps/web/src/api/schema.d.ts",
      "apps/web/src/routeTree.gen.ts",
      "apps/gateway/drizzle/**",
    ],
  },
  {
    name: "aigw/typescript-safety",
    files: applicationTypeScript,
    rules: {
      "ts/consistent-type-imports": "error",
      "ts/ban-ts-comment": ["error", {
        "ts-check": false,
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": true,
        "minimumDescriptionLength": 10,
      }],
      "ts/no-explicit-any": "error",
      "ts/no-floating-promises": "error",
      "ts/no-misused-promises": "error",
      "ts/strict-boolean-expressions": ["error", {
        allowString: true,
        allowNumber: false,
        allowNullableObject: true,
        allowNullableBoolean: false,
      }],
    },
  },
  {
    name: "aigw/source-quality",
    files: [...gatewaySource, ...webSource],
    rules: {
      "complexity": ["error", 15],
      "max-lines": ["error", { max: 350, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
      "no-nested-ternary": "error",
    },
  },
  {
    name: "aigw/gateway-boundaries",
    files: gatewaySource,
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "gateway-app", pattern: "apps/gateway/src/app/**", partialMatch: false },
        { type: "gateway-control", pattern: "apps/gateway/src/control-plane/**", partialMatch: false },
        { type: "gateway-data", pattern: "apps/gateway/src/data-plane/**", partialMatch: false },
        { type: "gateway-core", pattern: "apps/gateway/src/core/**", partialMatch: false },
        { type: "gateway-db", pattern: "apps/gateway/src/db/**", partialMatch: false },
        { type: "gateway-config", pattern: "apps/gateway/src/config/**", partialMatch: false },
      ],
    },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "disallow",
        policies: [
          {
            from: { element: { type: "gateway-app" } },
            allow: { to: { element: { type: ["gateway-app", "gateway-control", "gateway-data", "gateway-core", "gateway-db", "gateway-config"] } } },
          },
          {
            from: { element: { type: "gateway-control" } },
            allow: { to: { element: { type: ["gateway-control", "gateway-core", "gateway-db", "gateway-config"] } } },
          },
          {
            from: { element: { type: "gateway-data" } },
            allow: { to: { element: { type: ["gateway-data", "gateway-core", "gateway-db", "gateway-config"] } } },
          },
          {
            from: { element: { type: "gateway-core" } },
            allow: { to: { element: { type: ["gateway-core", "gateway-config"] } } },
          },
          {
            from: { element: { type: "gateway-db" } },
            allow: { to: { element: { type: ["gateway-db", "gateway-core", "gateway-config"] } } },
          },
          {
            from: { element: { type: "gateway-config" } },
            allow: { to: { element: { type: "gateway-config" } } },
          },
        ],
      }],
    },
  },
  {
    name: "aigw/control-feature-isolation",
    files: ["apps/gateway/src/control-plane/features/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/features/*", "**/features/*/**"],
          message: "Control-plane features may not import another feature; compose at the application boundary.",
        }],
      }],
    },
  },
  {
    name: "aigw/web-feature-isolation",
    files: ["apps/web/src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/features/*", "@/features/*/**"],
          message: "Web features may not import another feature; use relative imports inside the feature and compose in routes.",
        }],
      }],
    },
  },
  {
    name: "aigw/repository-scripts",
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "error",
      "complexity": ["error", 20],
      "max-lines-per-function": ["error", { max: 180, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    name: "aigw/test-title-style",
    files: ["**/*.test.{ts,tsx,mjs}", "**/*.spec.{ts,tsx,mjs}"],
    rules: {
      // describe 是主题分组，允许 PascalCase 类名/模块名；it 保持小写行为描述。
      "test/prefer-lowercase-title": ["error", { ignore: ["describe"] }],
    },
  },
  {
    name: "aigw/repository-script-tests",
    files: ["scripts/tests/**/*.test.mjs"],
    rules: {
      "test/no-import-node-test": "off",
    },
  },
  {
    name: "aigw/generated-contract",
    files: ["apps/web/src/api/schema.d.ts"],
    rules: {
      "ts/no-explicit-any": "off",
      "ts/consistent-type-imports": "off",
    },
  },
);
