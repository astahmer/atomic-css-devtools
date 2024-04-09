import { onMessage, sendMessage } from "webext-bridge/content-script";
import { WindowEnv, inspectApi } from "./devtools-pane/inspect-api";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(_ctx) {
    import.meta.env.DEV && console.log("Started content.ts");

    window.addEventListener("resize", async function () {
      const env: WindowEnv = {
        location: window.location.href,
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
      return rule;
    });
    onMessage("updateStyleRule", async (message) => {
      if (message.data.kind === "inlineStyle") {
        const element = document.querySelector(message.data.selector) as
          | HTMLElement
          | undefined;
        if (!element) return;

        return inspectApi.updateElementStyle(
          element,
          message.data.prop,
          message.data.value
        );
      }

      const rule = inspectApi.updateStyleRule(
        message.data.selector,
        message.data.prop,
        message.data.value
      );
      console.log(rule);
      return rule;
    });
  },
});
