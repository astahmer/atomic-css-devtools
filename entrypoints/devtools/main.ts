const devtools = browser.devtools;
//   devtools.panels.create(
//   "Example Panel",
//   "icon/128.png",
//   "devtools-panel.html"
// );

devtools.panels.elements.createSidebarPane("Example Pane").then((pane) => {
  pane.setPage("devtools-pane.html");
  //   pane.setObject({ css: { _hover: { color: "green" } } });
});

const inspectedWindow = devtools.inspectedWindow;
