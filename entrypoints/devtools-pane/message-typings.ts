import type { Endpoint, ProtocolWithReturn } from "webext-bridge";
import {
  ContentScriptEvents,
  DevtoolsApiEvents,
  DevtoolsMessage,
} from "../../src/devtools-messages";

export type ContentScriptExtensionApi = {
  [T in keyof ContentScriptEvents]: ContentScriptEvents[T] extends DevtoolsMessage<
    infer Data,
    infer Return
  >
    ? (cb: OnMessageCallback<Data, Return>) => void
    : never;
};

export type DevtoolsExtensionApi = {
  [T in keyof DevtoolsApiEvents]: DevtoolsApiEvents[T] extends DevtoolsMessage<
    infer Data,
    infer Return
  >
    ? (cb: OnMessageCallback<Data, Return>) => void
    : never;
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

type InferredProtocolMap = {
  [T in keyof ContentScriptEvents]: ContentScriptEvents[T] extends DevtoolsMessage<
    infer Data,
    infer Return
  >
    ? ProtocolWithReturn<Data, Return>
    : never;
};

declare module "webext-bridge" {
  export interface ProtocolMap extends InferredProtocolMap {}
}
