// web-ext.config.ts
import { defineRunnerConfig } from "wxt";

export default defineRunnerConfig({
  startUrls: ["https://panda-css.com"],
  //   chromiumArgs: ["--window-size=200x300", "--browser-console", "--devtools"],
  chromiumArgs: [
    "--browser-console",
    "--devtools",
    "--auto-open-devtools-for-tabs",
  ],
  //   openDevtools: true,
  openConsole: true,
});
