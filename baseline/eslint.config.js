// The Baseline 2025 check of the built page: its markup, styles and scripts may use only
// web features that became Baseline in 2025 or earlier. The features allowed beyond that are the
// exceptions of decision 0022; a browser without one of them ignores it.
import css from "@eslint/css";
import html from "@html-eslint/eslint-plugin";
import htmlParser from "@html-eslint/parser";
import baselineJs from "eslint-plugin-baseline-js";

const available = 2025;
const ignoreFeatures = ["audio-session", "devicepixelratio"];
const allowProperties = ["overscroll-behavior", "user-select"];

export default [
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script" },
    plugins: { "baseline-js": baselineJs },
    rules: {
      "baseline-js/use-baseline": [
        "error",
        {
          available,
          includeWebApis: { preset: "auto" },
          includeJsBuiltins: { preset: "auto" },
          ignoreFeatures,
        },
      ],
    },
  },
  {
    files: ["eslint.config.js"],
    languageOptions: { sourceType: "module" },
  },
  {
    files: ["**/*.css"],
    language: "css/css",
    plugins: { css },
    rules: { "css/use-baseline": ["error", { available, allowProperties }] },
  },
  {
    files: ["**/*.html"],
    languageOptions: { parser: htmlParser },
    plugins: { "@html-eslint": html },
    rules: { "@html-eslint/use-baseline": ["error", { available }] },
  },
];
