import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import vitePluginInspect from "vite-plugin-inspect";

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [react(), vitePluginInspect({ open: true })],
  }),
  manifest: {
    name: "Atomic CSS Devtools",
    short_name: "Atomic CSS Devtools",
    description:
      "A devtool panel for debugging Atomic CSS rules as if they were not atomic",
    author: "@astahmer_dev",
    homepage_url: "https://github.com/astahmer/atomic-css-devtools",
    developer: {
      name: "@astahmer_dev",
      url: "https://twitter.com/astahmer_dev",
    },
  },
});
