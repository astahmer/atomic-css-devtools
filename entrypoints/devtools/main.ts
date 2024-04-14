import { onMessage } from "webext-bridge/devtools";

onMessage("resize", () => {
  // Dummy listener to prevent error:
  // Error: [webext-bridge] No handler registered in 'devtools' to accept messages with id 'resize'
});

onMessage("focus", () => {
  // Dummy listener to prevent error:
  // Error: [webext-bridge] No handler registered in 'devtools' to accept messages with id 'resize'
});

browser.devtools.panels.elements
  .createSidebarPane("Atomic CSS")
  .then((pane) => {
    pane.setPage("devtools-pane.html");
    pane.onShown.addListener(() => {
      browser.runtime.sendMessage({ type: "devtools-shown" });
    });
    pane.onHidden.addListener(() => {
      browser.runtime.sendMessage({ type: "devtools-hidden" });
    });
  });
