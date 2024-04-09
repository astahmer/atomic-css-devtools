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
    onMessage("computePropertyValue", async (message) => {
      return inspectApi.computePropertyValue(
        message.data.selector,
        message.data.prop
      );
    });
    onMessage("updateStyleRule", async (message) => {
      let hasUpdated, computedValue;
      if (message.data.kind === "inlineStyle") {
        const element = document.querySelector(message.data.selector) as
          | HTMLElement
          | undefined;
        if (!element) return { hasUpdated: false, computedValue: null };

        hasUpdated = inspectApi.updateElementStyle(
          element,
          message.data.prop,
          message.data.value
        );
      } else {
        hasUpdated = inspectApi.updateStyleRule(
          message.data.selector,
          message.data.prop,
          message.data.value
        );
      }

      if (hasUpdated) {
        computedValue = inspectApi.computePropertyValue(
          message.data.selector,
          message.data.prop
        );
      }

      return {
        hasUpdated: Boolean(hasUpdated),
        computedValue: computedValue ?? null,
      };
    });
  },
});
