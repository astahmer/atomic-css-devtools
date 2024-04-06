import React from "react";
import ReactDOM from "react-dom/client";
import { SidebarPane } from "./sidebar-pane.tsx";
import "./panda.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SidebarPane />
  </React.StrictMode>
);
