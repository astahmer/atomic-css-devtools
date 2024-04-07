import { inspectApi } from "./inspect-api";
import {
  MatchedStyleRule,
  MatchedRule,
  MatchedMediaRule,
  MatchedLayerBlockRule,
} from "./matched-rule";
import { WindowEnv } from "./protocol-typings";
import { getMedia, getLayer, getComputedLayer } from "./rules";
import { sendMessage, onMessage } from "webext-bridge/devtools";

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
      ["$0 || (document.documentElement)"]
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
  const selector = await evalEl((el) => {
    const rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|^-|[^\x80-\uFFFF\w-]/g;
    const fcssescape = function (ch: string, asCodePoint: string) {
      if (!asCodePoint) return "\\" + ch;
      if (ch === "\0") return "\uFFFD";
      if (ch === "-" && ch.length === 1) return "\\-";
      return (
        ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + ""
      );
    };
    const esc = (sel: string) => {
      return (sel + "").replace(rcssescape, fcssescape);
    };
    const getClassSelector = (el: HTMLElement) => {
      return Array.from(el.classList)
        .map((c) => "." + esc(c))
        .join("");
    };

    // Use nth-of-type as a more reliable alternative to nth-child
    const getNthSelector = (el: HTMLElement) => {
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

    function getUniqueSelector(element: HTMLElement) {
      if (element.id) {
        return "#" + element.id;
      }

      if (["HTML", "BODY"].includes(element.tagName)) {
        return element.tagName.toLowerCase();
      }

      const path = [];
      while (element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();

        if (element.className) {
          // selector += getClassSelector(element);
        }

        if (element.parentNode && element.parentNode.childElementCount > 1) {
          const nth = getNthSelector(element);

          if (nth) {
            selector += nth;
          }
        }

        path.unshift(selector);
        // @ts-expect-error
        element = element.parentNode;
      }

      return path.join(" > ");
    }

    return getUniqueSelector(el);
  });

  // console.log(selector);
  const result = await sendMessage(
    "inspectElement",
    { selector: selector },
    { context: "content-script", tabId: null as any }
  );
  if (!result) return;

  const layers = new Map<string, MatchedStyleRule[]>();
  result.rules.forEach((_rule) => {
    const rule = _rule as MatchedStyleRule;
    const parentMedia = getMedia(rule);
    const parentLayer = getLayer(rule);

    if (parentLayer) {
      rule.layer = getComputedLayer(parentLayer)
        .reverse()
        .map((r) => r.layer)
        .join(".");

      if (!layers.has(rule.layer)) {
        layers.set(rule.layer, []);
      }
      layers.get(rule.layer)!.push(rule);
    }

    if (parentMedia) {
      rule.media = parentMedia.media;
    }
  });

  return {
    ...result,
    layers,
  };
};

export const evaluator = {
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
  onSelectionChanged: (cb: (element: MatchResult) => void) => {
    const handleSelectionChanged = async () => {
      const element = await inspect();
      cb(element);
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
  onWindowResize: (cb: (env: MatchResult["env"]) => void) => {
    onMessage("resize", (message) => {
      cb(message.data);
    });
  },
  findMatchingRule: async (selector: string, prop: string, value: string) => {
    console.log("from devtools");
    const rule = await sendMessage(
      "findMatchingRule",
      { selector, prop, value },
      { context: "content-script" }
    );
    // styleRule.style.setProperty(prop, value);
    console.log(111, rule);
  },
};

export type MatchResult = Awaited<ReturnType<typeof inspect>>;
