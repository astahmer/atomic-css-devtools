import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  presets: ["@pandacss/dev/presets", "@park-ui/panda-preset"],
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./{components,entrypoints,lib}/**/*.{js,jsx,ts,tsx}"],

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
