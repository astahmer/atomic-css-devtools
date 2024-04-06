import { Runtime, browser } from "wxt/browser";

export default defineBackground(() => {
  console.log("Started background.ts");

  const ports = new Map<string, Runtime.Port>();

  browser.runtime.onConnect.addListener((port) => {
    ports.set(port.name, port);

    if (port.name === "content") {
      port.onMessage.addListener((message) => {
        // console.log("From content to background:", message, port.sender?.url);
        const devtools = ports.get("devtools");
        if (devtools) {
          devtools.postMessage(message);
        }
      });
    }
  });

  // browser.runtime.onConnect
});
