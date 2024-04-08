import React from "react";
import ReactDOM from "react-dom/client";
import { SidebarPane } from "./sidebar-pane.tsx";
import { sendMessage } from "webext-bridge/devtools";

browser.runtime.onMessage.addListener(
  function (_request, _sender, _sendResponse) {
    // Dummy listener to prevent error:
    // Could not establish connection. Receiving end does not exist.
    // the actual listener will be in the <EditableValue /> component
    sendMessage("devtools-shown", null, {
      context: "devtools",
      tabId: null as any,
    });
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SidebarPane />
  </React.StrictMode>
);
