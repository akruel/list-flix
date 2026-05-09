module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["fix", "feat", "refactor", "chore", "docs", "test", "style", "perf"],
    ],
    "subject-case": [0],
  },
};
