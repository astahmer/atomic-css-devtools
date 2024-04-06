export default defineContentScript({
  matches: ["<all_urls>"],
  main(_ctx) {
    console.log("Started content.ts");

    const port = browser.runtime.connect({ name: "content" });
    window.addEventListener("resize", function () {
      const env = {
        widthPx: window.innerWidth,
        heightPx: window.innerHeight,
        deviceWidthPx: window.screen.width,
        deviceHeightPx: window.screen.height,
        dppx: window.devicePixelRatio,
      };
      port.postMessage({ action: "resize", data: env });
    });
  },
});
