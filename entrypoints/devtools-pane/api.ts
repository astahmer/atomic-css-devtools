import { onMessage, sendMessage } from "webext-bridge/devtools";
import { DevtoolsContextValue } from "../../src/devtools-context";
import type {
  ContentScriptApi,
  ContentScriptEvents,
} from "../../src/devtools-messages";
import type { DevtoolsExtensionApi } from "./message-typings";

/**
 * From devtools to content script
 */
export const contentScript = new Proxy<ContentScriptApi>({} as any, {
  get<T extends keyof ContentScriptEvents>(_target: any, propKey: T) {
    const context = "content-script";
    const tabId = null as any;

    return async function (arg?: any) {
      // console.log(`Calling ${propKey} with payload`, arg);
      return sendMessage(propKey, arg, { context, tabId });
    };
  },
});

/**
 * From (currently) content script to devtools
 */
export const onContentScriptMessage = new Proxy<DevtoolsExtensionApi>(
  {} as any,
  {
    get<T extends keyof ContentScriptEvents>(_target: any, propKey: T) {
      return function (cb: (message: any) => any) {
        return onMessage(propKey, (message) => {
          // console.log(`Received ${propKey} with message`, message.data);
          return cb(message);
        });
      };
    },
  },
);

const listeners = new Map<string, () => void>();
export const onDevtoolEvent: DevtoolsContextValue["onDevtoolEvent"] = (
  event,
  cb,
) => {
  listeners.set(event, cb);
};

onMessage("devtools-shown", () => {
  const cb = listeners.get("devtools-shown");
  cb?.();
});

onMessage("devtools-hidden", () => {
  const cb = listeners.get("devtools-hidden");
  cb?.();
});
