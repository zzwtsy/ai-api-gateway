export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 100],
    "scope-empty": [0],
    "subject-case": [0],
    "subject-empty": [2, "never"],
    "type-enum": [2, "always", [
      "feat",
      "fix",
      "refactor",
      "perf",
      "test",
      "docs",
      "build",
      "ci",
      "chore",
      "revert",
      "style",
    ]],
  },
};
