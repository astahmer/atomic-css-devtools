import { onMessage, sendMessage } from "webext-bridge/devtools";
import { InspectResult } from "./inspect-api";
import {
  DevtoolMessage,
  MessageMap,
  OnMessageProxy,
  SendMessageProxy,
} from "./message-typings";

const devtools = browser.devtools;
const inspectedWindow = devtools.inspectedWindow;

type AnyFunction = (...args: any[]) => any;
type AnyElementFunction = (element: HTMLElement, ...args: any[]) => any;
type WithoutFirst<T extends AnyFunction> =
  Parameters<T> extends [any, ...infer R] ? R : never;

const evalEl = <T extends AnyElementFunction>(
  fn: T,
  ...args: WithoutFirst<T>
) => {
  return new Promise<ReturnType<T>>(async (resolve, reject) => {
    const stringified =
      "(" +
      fn.toString() +
      ")(" +
      ["$0"]
        .concat(args as any)
        .map((arg, index) => (index === 0 ? arg : JSON.stringify(arg)))
        .join() +
      ")";
    const [result, error] = await inspectedWindow.eval(stringified);
    if (error) {
      // console.error("{evalEl} error");
      console.log({ stringified });
      return reject(error.value);
    }

    return resolve(result);
  });
};

const evalFn = <T extends AnyFunction>(fn: T, ...args: Parameters<T>) => {
  return new Promise<ReturnType<T>>(async (resolve, reject) => {
    const stringified =
      "(" +
      fn.toString() +
      ")(" +
      args.map((arg) => JSON.stringify(arg)).join() +
      ")";
    const [result, error] = await inspectedWindow.eval(stringified);
    if (error) {
      // console.error("{eval} error");
      console.log({ stringified });
      return reject(error.value);
    }

    return resolve(result);
  });
};

const inspect = async () => {
  const selectors = await evalEl((el) => {
    if (!el) return null;

    function getElementSelectors(el: Element) {
      const rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|^-|[^\x80-\uFFFF\w-]/g;
      const fcssescape = function (ch: string, asCodePoint: string) {
        if (!asCodePoint) return "\\" + ch;
        if (ch === "\0") return "\uFFFD";
        if (ch === "-" && ch.length === 1) return "\\-";
        return (
          ch.slice(0, -1) +
          "\\" +
          ch.charCodeAt(ch.length - 1).toString(16) +
          ""
        );
      };
      const esc = (sel: string) => {
        return (sel + "").replace(rcssescape, fcssescape);
      };

      // Use nth-of-type as a more reliable alternative to nth-child
      const getNthSelector = (el: Element) => {
        const parent = el.parentNode;
        if (!parent) return;

        const tag = el.tagName;
        const siblings = parent.children;

        let count = 0;
        for (let i = 0; i < siblings.length; i++) {
          if (siblings[i].tagName === tag) {
            count++;
            if (siblings[i] === el && count > 1) {
              return `:nth-of-type(${count})`;
            }
          }
        }
      };

      function getUniqueSelector(element: Element) {
        const path = [];
        let currentElement = element;

        while (currentElement.nodeType === Node.ELEMENT_NODE) {
          let selector = currentElement.nodeName.toLowerCase();
          if (currentElement.id) {
            selector = "#" + esc(currentElement.id);
            path.unshift(selector);
            break; // ID is unique enough
          }

          const nth = getNthSelector(currentElement);
          if (nth) selector += nth;
          path.unshift(selector);

          if (currentElement.parentElement) {
            currentElement = currentElement.parentElement;
          } else if ((currentElement as any as ShadowRoot).host) {
            // Move up through shadow DOM
            path.unshift("::shadow-root");
            currentElement = (currentElement as any as ShadowRoot).host;
          } else {
            break; // No parent or host means we're at the top
          }
        }
        return path.join(" > ");
      }

      const selectors = [];
      let currentContext = el;
      while (currentContext) {
        selectors.unshift(getUniqueSelector(currentContext));

        const rootNode = currentContext.getRootNode() as ShadowRoot;
        if (rootNode && rootNode.host) {
          currentContext = rootNode.host;
        } else {
          break;
        }
      }

      // Check for being inside an iframe by checking defaultView.frameElement
      let contextWindow = el.ownerDocument.defaultView;
      while (contextWindow && contextWindow.frameElement) {
        selectors.unshift(getUniqueSelector(contextWindow.frameElement));
        contextWindow = contextWindow.parent as Window & typeof globalThis;
      }

      return selectors;
    }

    return getElementSelectors(el);
  });

  console.log({ selectors });
  if (!selectors) return null;

  return api.inspectElement({ selectors });
};

const api = new Proxy<SendMessageProxy>({} as any, {
  get<T extends keyof MessageMap>(_target: any, propKey: T) {
    const context = "content-script";
    const tabId = null as any;

    return async function (arg?: any) {
      // console.log(`Calling ${propKey} with payload`, arg);
      return sendMessage(propKey, arg, { context, tabId });
    } as MessageMap[T] extends DevtoolMessage<infer Data, infer Return>
      ? (args: Data) => Promise<Return>
      : (args: MessageMap[T]) => Promise<void>;
  },
});

const onMsg = new Proxy<OnMessageProxy>({} as any, {
  get<T extends keyof MessageMap>(_target: any, propKey: T) {
    return function (cb: (message: any) => any) {
      return onMessage(propKey, (message) => {
        console.log(`Received ${propKey} with message`, message.data);
        return cb(message);
      });
    };
  },
});

export const evaluator = {
  api,
  onMsg,
  fn: evalFn,
  el: evalEl,
  copy: (valueToCopy: string) => {
    return evalFn(
      // @ts-expect-error https://developer.chrome.com/docs/devtools/console/utilities/#copy-function
      (value: string) => window.copy(value),
      valueToCopy
    );
  },
  inspectElement: inspect,
  onSelectionChanged: (cb: (element: InspectResult | null) => void) => {
    const handleSelectionChanged = async () => {
      const result = await inspect();
      cb(result ?? null);
    };
    devtools.panels.elements.onSelectionChanged.addListener(
      handleSelectionChanged
    );

    handleSelectionChanged();

    return () => {
      devtools.panels.elements.onSelectionChanged.removeListener(
        handleSelectionChanged
      );
    };
  },
  onPaneShown: (cb: () => void) => {
    onMessage("devtools-shown", () => {
      cb();
    });
  },
  onPaneHidden: (cb: () => void) => {
    onMessage("devtools-hidden", () => {
      cb();
    });
  },
};
