import { onMessage, sendMessage } from "webext-bridge/devtools";

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
    pane.onShown.addListener(async () => {
      try {
        await sendMessage("devtools-shown", null, {
          context: "devtools",
          tabId: browser.devtools.inspectedWindow.tabId,
        });
      } catch (error) {
        // Devtools pane might not be ready yet, that's ok
        console.debug("Could not notify devtools-pane of shown event:", error);
      }
    });
    pane.onHidden.addListener(async () => {
      try {
        await sendMessage("devtools-hidden", null, {
          context: "devtools",
          tabId: browser.devtools.inspectedWindow.tabId,
        });
      } catch (error) {
        // Devtools pane might not be ready yet, that's ok
        console.debug("Could not notify devtools-pane of hidden event:", error);
      }
    });
  });
