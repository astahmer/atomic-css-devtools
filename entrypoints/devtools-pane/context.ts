import type { DevtoolsContextValue } from "../../src/devtools-context";
import { contentScript, onDevtoolEvent, onContentScriptMessage } from "./api";
import { evaluator } from "./eval";

export const extensionContext: DevtoolsContextValue = {
  evaluator,
  contentScript,
  onDevtoolEvent,
  onContentScriptMessage,
};
