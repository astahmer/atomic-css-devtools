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
