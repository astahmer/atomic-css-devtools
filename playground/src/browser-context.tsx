import { DevtoolsContextValue, Evaluator } from "../../src/devtools-context";
import { ContentScriptApi } from "../../src/devtools-messages";
import { inspectApi } from "../../src/inspect-api";
import {
  getInspectedElement,
  inspectedElementSelector,
  listeners,
} from "./inspected";

const noop = () => {};

const evaluator: Evaluator = {
  fn: (fn, ...args) => {
    return new Promise((resolve, reject) => {
      try {
        const result = fn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },
  el: (fn, ...args) => {
    return new Promise((resolve, reject) => {
      try {
        const element = getInspectedElement();
        const result = fn(element, ...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },
  copy: async (valueToCopy: string) => {
    navigator.clipboard.writeText(valueToCopy);
  },
  inspect: async () => {
    return inspectApi.inspectElement([inspectedElementSelector]);
  },
  onSelectionChanged: (cb) => {
    const handleSelectionChanged = async () => {
      const result = await evaluator.inspect();
      cb(result ?? null);
    };
    listeners.set("selectionChanged", handleSelectionChanged);

    return noop;
  },
};

const contentScript: ContentScriptApi = {
  inspectElement: async () => {
    return inspectApi.inspectElement([inspectedElementSelector]);
  },
  computePropertyValue: async (message) => {
    return inspectApi.computePropertyValue(message.selectors, message.prop);
  },
  updateStyleRule: async (message) => {
    return inspectApi.updateStyleAction(message);
  },
  appendInlineStyle: async (message) => {
    return inspectApi.appendInlineStyleAction(message);
  },
  removeInlineStyle: async (message) => {
    return inspectApi.removeInlineStyleAction(message);
  },
  highlightSelector: async (message) => {
    return inspectApi.highlightSelector(message);
  },
};

export const browserContext: DevtoolsContextValue = {
  evaluator,
  onDevtoolEvent: (event, cb) => {
    listeners.set(event, cb);
  },
  contentScript,
  onContentScriptMessage: {
    resize: () => noop,
    focus: () => noop,
  },
};
