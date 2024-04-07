import type { ProtocolWithReturn } from "webext-bridge";
import type { WindowEnv, inspectApi } from "./inspect-api";

declare module "webext-bridge" {
  export interface ProtocolMap {
    inspectElement: ProtocolWithReturn<
      { selector: string },
      ReturnType<typeof inspectApi.inspectElement>
    >;
    updateStyleRule: ProtocolWithReturn<
      { selector: string; prop: string; value: string },
      ReturnType<typeof inspectApi.updateStyleRule>
    >;
    resize: WindowEnv;
  }
}
