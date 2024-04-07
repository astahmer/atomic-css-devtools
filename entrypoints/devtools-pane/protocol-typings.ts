import type { ProtocolWithReturn } from "webext-bridge";
import type { inspectApi } from "./inspect-api";

export interface WindowEnv {
  widthPx: number;
  heightPx: number;
  deviceWidthPx: number;
  deviceHeightPx: number;
  dppx: number;
}

declare module "webext-bridge" {
  export interface ProtocolMap {
    inspectElement: ProtocolWithReturn<
      { selector: string },
      ReturnType<typeof inspectApi.inspectElement>
    >;
    findMatchingRule: ProtocolWithReturn<
      { selector: string },
      ReturnType<typeof inspectApi.findStyleRule>
    >;
    resize: WindowEnv;
  }
}
