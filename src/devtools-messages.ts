import type { WindowEnv } from "./devtools-types";
import type {
  InspectAPI,
  RemoveInlineStyle,
  UpdateStyleRuleMessage,
} from "./inspect-api";

interface InlineStyleReturn {
  hasUpdated: boolean;
  computedValue: string | null;
}

export type DevtoolsMessage<Data, Return> = { data: Data; return: Return };
export interface ContentScriptEvents {
  // devtools to contentScript
  inspectElement: DevtoolsMessage<
    { selectors: string[] },
    ReturnType<InspectAPI["inspectElement"]>
  >;
  computePropertyValue: DevtoolsMessage<
    { selectors: string[]; prop: string },
    ReturnType<InspectAPI["computePropertyValue"]>
  >;
  updateStyleRule: DevtoolsMessage<UpdateStyleRuleMessage, InlineStyleReturn>;
  appendInlineStyle: DevtoolsMessage<
    Omit<UpdateStyleRuleMessage, "kind">,
    InlineStyleReturn
  >;
  removeInlineStyle: DevtoolsMessage<
    RemoveInlineStyle & Pick<UpdateStyleRuleMessage, "selectors" | "prop">,
    InlineStyleReturn
  >;
  highlightSelector: DevtoolsMessage<
    { selectors: string[] },
    ReturnType<InspectAPI["highlightSelector"]>
  >;
}

export type ContentScriptApi = {
  [T in keyof ContentScriptEvents]: ContentScriptEvents[T] extends DevtoolsMessage<
    infer Data,
    infer Return
  >
    ? (args: Data) => Promise<Return>
    : (args: ContentScriptEvents[T]) => Promise<void>;
};

/**
 * contentScript to devtools
 */
export interface DevtoolsApiEvents {
  resize: DevtoolsMessage<WindowEnv, void>;
  focus: DevtoolsMessage<null, void>;
}

export type DevtoolsApi = {
  [T in keyof DevtoolsApiEvents]: DevtoolsApiEvents[T] extends DevtoolsMessage<
    infer Data,
    infer Return
  >
    ? (args: Data) => Promise<Return>
    : (args: DevtoolsApiEvents[T]) => Promise<void>;
};

type MessageCallback<Data, Return> = (message: {
  data: Data;
}) => Return | Promise<Return>;

export type DevtoolsListeners = {
  [T in keyof DevtoolsApiEvents]: DevtoolsApiEvents[T] extends DevtoolsMessage<
    infer Data,
    infer Return
  >
    ? (cb: MessageCallback<Data, Return>) => void
    : never;
};
