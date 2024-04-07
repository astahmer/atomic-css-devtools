import type { ProtocolWithReturn } from "webext-bridge";
import type { WindowEnv, inspectApi } from "./inspect-api";

export interface UpdateStyleRuleMessage {
  selector: string;
  prop: string;
  value: string;
  kind: "cssRule" | "inlineStyle";
}

declare module "webext-bridge" {
  export interface ProtocolMap {
    inspectElement: ProtocolWithReturn<
      { selector: string },
      ReturnType<typeof inspectApi.inspectElement>
    >;
    updateStyleRule: ProtocolWithReturn<
      UpdateStyleRuleMessage,
      ReturnType<typeof inspectApi.updateStyleRule>
    >;
    resize: WindowEnv;
  }
}
