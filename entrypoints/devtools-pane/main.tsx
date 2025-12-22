import React from "react";
import ReactDOM from "react-dom/client";
import { SidebarPane } from "../../src/sidebar-pane.tsx";
import { onMessage } from "webext-bridge/devtools";
import { WithPlatformClass } from "./use-platform-class.ts";
import { DevtoolsProvider } from "../../src/devtools-context.ts";
import { extensionContext } from "./context.ts";

// Register listeners early to prevent "Receiving end does not exist" errors
onMessage("devtools-shown", () => {
  // Handler for devtools shown event
});

onMessage("devtools-hidden", () => {
  // Handler for devtools hidden event
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevtoolsProvider value={extensionContext}>
      <SidebarPane />
    </DevtoolsProvider>
    <WithPlatformClass />
  </React.StrictMode>,
);
