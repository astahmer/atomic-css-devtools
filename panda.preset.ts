import { definePreset } from "@pandacss/dev";

export default definePreset({
  theme: {
    extend: {
      semanticTokens: {
        colors: {
          background: {
            // DEFAULT: { value: "#282828" },
            DEFAULT: { value: "#212629" },
          },
          content: {
            DEFAULT: { value: "white" },
          },
        },
      },
    },
  },
});
