import React from "react";
import ReactDOM from "react-dom/client";
import { SidebarPane } from "../../src/sidebar-pane.tsx";
import { sendMessage } from "webext-bridge/devtools";
import { WithPlatformClass } from "./use-platform-class.ts";
import { DevtoolsProvider } from "../../src/devtools-context.ts";
import { extensionContext } from "./context.ts";

browser.runtime.onMessage.addListener(
  // @ts-expect-error
  function (_request, _sender, _sendResponse) {
    // Dummy listener to prevent error:
    // Could not establish connection. Receiving end does not exist.
    // the actual listener will be in the <EditableValue /> component
    sendMessage("devtools-shown", null, {
      context: "devtools",
      tabId: null as any,
    });
  },
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevtoolsProvider value={extensionContext}>
      <SidebarPane />
    </DevtoolsProvider>
    <WithPlatformClass />
  </React.StrictMode>,
);
