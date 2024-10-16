import { defineConfig } from "@pandacss/dev";
import preset from "./panda.preset";

export default defineConfig({
  presets: ["@pandacss/dev/presets", preset],
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: [
    "./{components,entrypoints,lib,src,playground}/**/*.{js,jsx,ts,tsx}",
  ],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {},
  },

  // The output directory for your css system
  outdir: "styled-system",
  jsxFramework: "react",
  // importMap: "styled-system",
  hooks: {
    "parser:before": ({ configure }) => {
      configure({
        // ignore the <Tooltip /> entirely,
        // prevents: `🐼 error [sheet:process] > 1 | .content_Hide_\`\*\,_\:before\,_\:after\`_styles {content: Hide `*, :before, :after` styles;`
        matchTag: (tag) => tag !== "Tooltip",
      });
    },
  },
});
