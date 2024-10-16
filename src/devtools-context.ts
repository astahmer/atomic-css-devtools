import { createContext, useContext } from "react";
import { ContentScriptApi, DevtoolsListeners } from "./devtools-messages";
import { InspectResult } from "./inspect-api";
import { AnyElementFunction, AnyFunction, WithoutFirst } from "./lib/types";

const DevtoolsContext = createContext<DevtoolsContextValue>({} as any);
export const DevtoolsProvider = DevtoolsContext.Provider;
export const useDevtoolsContext = () => useContext(DevtoolsContext);

export interface Evaluator {
  fn: <T extends AnyFunction>(
    fn: T,
    ...args: Parameters<T>
  ) => Promise<ReturnType<T>>;
  el: <T extends AnyElementFunction>(
    fn: T,
    ...args: WithoutFirst<T>
  ) => Promise<ReturnType<T>>;
  copy: (valueToCopy: string) => Promise<void>;
  inspect: () => Promise<InspectResult | null | undefined>;
  onSelectionChanged: (
    cb: (element: InspectResult | null) => void,
  ) => () => void;
}

export interface DevtoolsContextValue {
  evaluator: Evaluator;
  onDevtoolEvent: (
    event: "devtools-shown" | "devtools-hidden",
    cb: () => void,
  ) => void;
  contentScript: ContentScriptApi;
  onContentScriptMessage: DevtoolsListeners;
}
