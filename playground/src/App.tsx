import { useState } from "react";
import { SidebarPane } from "../../entrypoints/devtools-pane/sidebar-pane";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>Vite + React</h1>
      <SidebarPane />
    </>
  );
}

export default App;
