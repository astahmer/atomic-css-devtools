import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import vitePluginInspect from "vite-plugin-inspect";

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [react(), vitePluginInspect({ open: true })],
  }),
  manifest: {
    name: "Atomic CSS",
    short_name: "Atomic CSS",
    description:
      "A panel for inspecting Atomic CSS rules as if they were not atomic",
    author: "@astahmer_dev",
    homepage_url: "https://github.com/astahmer/atomic-css-devtools",
  },
});
