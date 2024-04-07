import React from "react";
import ReactDOM from "react-dom/client";
import "./panda.css";
import { SidebarPane } from "./sidebar-pane.tsx";

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Dummy listener to prevent error:
  // Could not establish connection. Receiving end does not exist.
  // the actual listener will be in the <EditableValue /> component
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SidebarPane />
  </React.StrictMode>
);
