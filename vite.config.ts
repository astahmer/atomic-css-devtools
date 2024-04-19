import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  publicDir: path.resolve(import.meta.dirname, "playground", "public"),
  plugins: [react()],
});
