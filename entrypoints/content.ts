import { onMessage, sendMessage } from "webext-bridge/content-script";
import { inspectApi } from "./devtools-pane/inspect-api";
import { WindowEnv } from "./devtools-pane/protocol-typings";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(_ctx) {
    console.log("Started content.ts");

    window.addEventListener("resize", async function () {
      const env: WindowEnv = {
        widthPx: window.innerWidth,
        heightPx: window.innerHeight,
        deviceWidthPx: window.screen.width,
        deviceHeightPx: window.screen.height,
        dppx: window.devicePixelRatio,
      };
      // @ts-expect-error
      sendMessage("resize", env, { context: "devtools" });
    });

    onMessage("inspectElement", async (message) => {
      const rule = inspectApi.inspectElement(message.data.selector);
      console.log(rule);
      return rule;
    });
    onMessage("findMatchingRule", async (message) => {
      const rule = inspectApi.findStyleRule(message.data.selector);
      console.log(rule);
      return rule;
    });
  },
});
