import globals from "globals";

const sharedRules = {
  "no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
    },
  ],
  "no-console": "off",
};

const sharedGlobals = {
  ...globals.browser,
  ...globals.node,
};

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["app.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: sharedGlobals,
    },
    rules: sharedRules,
  },
  {
    files: ["**/*.js"],
    ignores: ["app.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: sharedGlobals,
    },
    rules: sharedRules,
  },
];
