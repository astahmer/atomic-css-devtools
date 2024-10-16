import { useEffect } from "react";

/**
 * Add platform class to apply targeted styles
 */
const usePlatformClass = () => {
  useEffect(() => {
    const listener = (themeName: string) => {
      if (themeName === "dark") {
        document.body.classList.add("-theme-with-dark-background");
      } else {
        document.body.classList.remove("-theme-with-dark-background");
      }
    };

    const hasOnThemeChanged =
      typeof browser.devtools.panels.onThemeChanged !== "undefined";

    hasOnThemeChanged &&
      browser.devtools.panels.onThemeChanged.addListener(listener);

    if (browser.runtime.getPlatformInfo) {
      browser.runtime.getPlatformInfo().then((info) => {
        document.body.classList.add("platform-" + info.os);
      });
    }

    return () => {
      hasOnThemeChanged &&
        browser.devtools.panels.onThemeChanged.removeListener(listener);
    };
  }, []);
};

export const WithPlatformClass = () => {
  usePlatformClass();

  return null;
};
