import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import vitePluginInspect from "vite-plugin-inspect";

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [react(), vitePluginInspect({ open: true })],
  }),
});
