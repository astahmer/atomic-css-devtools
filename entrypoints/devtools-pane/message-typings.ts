import type { Endpoint, ProtocolWithReturn } from "webext-bridge";
import type { WindowEnv, inspectApi } from "./inspect-api";

interface UpdateStyleRuleMessage {
  selector: string;
  prop: string;
  value: string;
  kind: "cssRule" | "inlineStyle";
}

export type DevtoolMessage<Data, Return> = { data: Data; return: Return };

export interface MessageMap {
  inspectElement: DevtoolMessage<
    { selector: string },
    ReturnType<typeof inspectApi.inspectElement>
  >;
  computePropertyValue: DevtoolMessage<
    { selector: string; prop: string },
    ReturnType<typeof inspectApi.computePropertyValue>
  >;
  updateStyleRule: DevtoolMessage<
    UpdateStyleRuleMessage,
    { hasUpdated: boolean; computedValue: string | null }
  >;
  appendInlineStyle: DevtoolMessage<
    Omit<UpdateStyleRuleMessage, "kind">,
    { hasUpdated: boolean; computedValue: string | null }
  >;
  resize: DevtoolMessage<WindowEnv, void>;
  focus: DevtoolMessage<null, void>;
}

//

export type OnMessageProxy = {
  [T in keyof MessageMap]: MessageMap[T] extends DevtoolMessage<
    infer Data,
    infer Return
  >
    ? (cb: OnMessageCallback<Data, Return>) => void
    : never;
};

export type SendMessageProxy = {
  [T in keyof MessageMap]: MessageMap[T] extends DevtoolMessage<
    infer Data,
    infer Return
  >
    ? (args: Data) => Promise<Return>
    : (args: MessageMap[T]) => Promise<void>;
};

//

interface BridgeMessage<T> {
  sender: Endpoint;
  id: string;
  data: T;
  timestamp: number;
}
type OnMessageCallback<T, R = void | JsonValue> = (
  message: BridgeMessage<T>
) => R | Promise<R>;

// from type-fest 2.19 (version of type-fest that is used in webext-bridge)
type JsonObject = { [Key in string]?: JsonValue };
type JsonArray = JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

//

type AutoProtocolMap = {
  [T in keyof MessageMap]: MessageMap[T] extends DevtoolMessage<
    infer Data,
    infer Return
  >
    ? ProtocolWithReturn<Data, Return>
    : never;
};

declare module "webext-bridge" {
  export interface ProtocolMap extends AutoProtocolMap {}
}
