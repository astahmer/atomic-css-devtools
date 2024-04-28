import { definePreset } from "@pandacss/dev";

export default definePreset({
  conditions: {
    extend: {
      dark: ".-theme-with-dark-background &, .dark &",
    },
  },
  theme: {
    extend: {
      tokens: {
        colors: {
          devtools: {
            // https://github.com/ChromeDevTools/devtools-frontend/blob/368d71862d3726025131629fc18a887954750531/front_end/ui/legacy/tokens.css#L157
            // https://github.com/szoxidy/Websites/blob/c96a6db64901830792678cd1c9a4c27c37f2be28/css/color.css#L65
            surface4: { value: "#eceff7ff" }, // color-mix(in sRGB,#d1e1ff 12%,var(--ref-palette-neutral10))
            neutral10: { value: "#1f1f1fff" },
            neutral15: { value: "#282828ff" },
            neutral25: { value: "#3c3c3cff" },
            neutral50: { value: "#757575ff" },
            neutral60: { value: "#8f8f8fff" },
            neutral80: { value: "#c7c7c7ff" },
            neutral90: { value: "#e3e3e3ff" },
            neutral95: { value: "#f2f2f2ff" },
            neutral98: { value: "#faf9f8ff" },
            neutral99: { value: "#fdfcfbff" },
            primary20: { value: "#062e6fff" },
            primary50: { value: "#1a73e8ff" },
            primary70: { value: "#7cacf8ff" },
            primary90: { value: "#d3e3fdff" },
            primary100: { value: "#ffffffff" },
            secondary25: { value: "#003f66ff" },
            secondary30: { value: "#004a77ff" },
            error50: { value: "#dc362eff" },
            cyan80: { value: "rgb(92 213 251 / 100%)" },
          },
        },
      },
      semanticTokens: {
        colors: {
          // https://github.com/ChromeDevTools/devtools-frontend/blob/368d71862d3726025131629fc18a887954750531/front_end/ui/legacy/themeColors.css#L302
          devtools: {
            "base-container": {
              value: {
                base: "{colors.devtools.surface4}",
                _dark: "{colors.devtools.neutral15}",
              },
            },
            "cdt-base-container": {
              value: {
                base: "{colors.devtools.neutral98}",
                _dark: "{colors.devtools.base-container}",
              },
            },
            "tonal-container": {
              value: {
                base: "{colors.devtools.primary90}",
                _dark: "{colors.devtools.secondary30}",
              },
            },
            "state-hover-on-subtle": {
              value: {
                base: "{colors.devtools.neutral10/6}",
                _dark: "{colors.devtools.neutral99/10}",
              },
            },
            "state-disabled": {
              value: {
                base: "rgb(31 31 31 / 38%)",
                _dark: "rgb(227 227 227 / 38%)",
              },
            },
            "primary-bright": {
              value: {
                base: "{colors.devtools.primary50}",
                _dark: "{colors.devtools.primary70}",
              },
            },
            "neutral-outline": {
              value: {
                base: "{colors.devtools.neutral80}",
                _dark: "{colors.devtools.neutral50}",
              },
            },
            "neutral-container": {
              value: {
                base: "{colors.devtools.neutral95}",
                _dark: "{colors.devtools.neutral25}",
              },
            },
            "on-primary": {
              value: {
                base: "{colors.devtools.primary20}",
                _dark: "{colors.devtools.primary100}",
              },
            },
            "on-surface": {
              value: {
                base: "{colors.devtools.neutral10}",
                _dark: "{colors.devtools.neutral90}",
              },
            },
            "token-property-special": {
              value: {
                base: "{colors.devtools.error50}",
                _dark: "{colors.devtools.cyan80}",
              },
            },
            "token-subtle": {
              value: {
                base: "{colors.devtools.neutral60}",
                _dark: "{colors.devtools.neutral60}",
              },
            },
          },
        },
      },
    },
  },
});
