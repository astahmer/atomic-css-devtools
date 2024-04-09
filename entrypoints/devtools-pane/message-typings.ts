import type { ProtocolWithReturn } from "webext-bridge";
import type { WindowEnv, inspectApi } from "./inspect-api";

export interface UpdateStyleRuleMessage {
  selector: string;
  prop: string;
  value: string;
  kind: "cssRule" | "inlineStyle";
}

export interface ComputePropertyValueMessage {
  selector: string;
  prop: string;
}

declare module "webext-bridge" {
  export interface ProtocolMap {
    inspectElement: ProtocolWithReturn<
      { selector: string },
      ReturnType<typeof inspectApi.inspectElement>
    >;
    computePropertyValue: ProtocolWithReturn<
      ComputePropertyValueMessage,
      ReturnType<typeof inspectApi.computePropertyValue>
    >;
    updateStyleRule: ProtocolWithReturn<
      UpdateStyleRuleMessage,
      { hasUpdated: boolean; computedValue: string | null }
    >;
    resize: WindowEnv;
  }
}
