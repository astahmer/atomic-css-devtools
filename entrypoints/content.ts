import { onMessage, sendMessage } from "webext-bridge/content-script";
import type {
  DevtoolsMessage,
  ContentScriptEvents,
  DevtoolsApi,
} from "../src/devtools-messages";
import { inspectApi } from "../src/inspect-api";
import { WindowEnv } from "../src/devtools-types";
import type { ContentScriptExtensionApi } from "./devtools-pane/message-typings";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(_ctx) {
    import.meta.env.DEV && console.log("Started content.ts");

    window.addEventListener("resize", function () {
      const env: WindowEnv = {
        location: window.location.href,
        widthPx: window.innerWidth,
        heightPx: window.innerHeight,
        deviceWidthPx: window.screen.width,
        deviceHeightPx: window.screen.height,
        dppx: window.devicePixelRatio,
      };
      devtools.resize(env);
    });

    window.addEventListener("focus", () => {
      devtools.focus(null);
    });

    onDevtoolsMessage.inspectElement((message) => {
      const rule = inspectApi.inspectElement(message.data.selectors);
      return rule;
    });
    onDevtoolsMessage.computePropertyValue((message) => {
      return inspectApi.computePropertyValue(
        message.data.selectors,
        message.data.prop
      );
    });
    onDevtoolsMessage.updateStyleRule((message) => {
      let hasUpdated, computedValue;
      if (message.data.kind === "inlineStyle") {
        const element = inspectApi.traverseSelectors(message.data.selectors);
        if (!element) return { hasUpdated: false, computedValue: null };

        hasUpdated = inspectApi.updateInlineStyle({
          element,
          prop: message.data.prop,
          value: message.data.value,
          atIndex: message.data.atIndex,
          isCommented: message.data.isCommented,
          mode: "edit",
        });
      } else {
        let doc = document;
        if (message.data.selectors.length > 1) {
          const element = inspectApi.traverseSelectors(message.data.selectors);
          if (!element) return { hasUpdated: false, computedValue: null };

          doc = element.getRootNode() as Document;
        }

        hasUpdated = inspectApi.updateStyleRule({
          doc,
          selector: message.data.selectors[0],
          prop: message.data.prop,
          value: message.data.value,
        });
      }

      if (hasUpdated) {
        computedValue = inspectApi.computePropertyValue(
          message.data.selectors,
          message.data.prop
        );
      }

      return {
        hasUpdated: Boolean(hasUpdated),
        computedValue: computedValue ?? null,
      };
    });

    onDevtoolsMessage.appendInlineStyle((message) => {
      const element = inspectApi.traverseSelectors(message.data.selectors);
      if (!element) return { hasUpdated: false, computedValue: null };

      const hasUpdated = inspectApi.updateInlineStyle({
        element,
        prop: message.data.prop,
        value: message.data.value,
        atIndex: message.data.atIndex,
        isCommented: message.data.isCommented,
        mode: "insert",
      });
      if (!hasUpdated) return { hasUpdated: false, computedValue: null };

      const computedValue = inspectApi.computePropertyValue(
        message.data.selectors,
        message.data.prop
      );

      return {
        hasUpdated: Boolean(hasUpdated),
        computedValue: computedValue ?? null,
      };
    });

    onDevtoolsMessage.removeInlineStyle((message) => {
      const element = inspectApi.traverseSelectors(message.data.selectors);
      if (!element) return { hasUpdated: false, computedValue: null };

      const hasUpdated = inspectApi.removeInlineStyle({
        element,
        atIndex: message.data.atIndex,
      });
      if (!hasUpdated) return { hasUpdated: false, computedValue: null };

      const computedValue = inspectApi.computePropertyValue(
        message.data.selectors,
        message.data.prop
      );

      return {
        hasUpdated: Boolean(hasUpdated),
        computedValue: computedValue ?? null,
      };
    });
  },
});

const devtools = new Proxy<DevtoolsApi>({} as any, {
  get<T extends keyof ContentScriptEvents>(_target: any, propKey: T) {
    const context = "devtools";
    const tabId = null as any;

    return async function (arg?: any) {
      // console.log(`Calling ${propKey} with payload`, arg);
      return sendMessage(propKey, arg, { context, tabId });
    } as ContentScriptEvents[T] extends DevtoolsMessage<
      infer Data,
      infer Return
    >
      ? (args: Data) => Promise<Return>
      : (args: ContentScriptEvents[T]) => Promise<void>;
  },
});

const onDevtoolsMessage = new Proxy<ContentScriptExtensionApi>({} as any, {
  get<T extends keyof ContentScriptEvents>(_target: any, propKey: T) {
    return function (cb: (message: any) => any) {
      return onMessage(propKey, (message) => {
        // console.log(`Received ${propKey} with message`, message.data);
        return cb(message);
      });
    };
  },
});
