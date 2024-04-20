import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";

export default defineConfig({
  presets: [
    "@pandacss/dev/presets",
    createPreset({ grayColor: "sand", accentColor: "blue" }),
  ],
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
});
