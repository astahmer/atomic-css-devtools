import { useEffect } from "react";

/**
 * Add platform class to apply targeted styles
 */
const usePlatformClass = () => {
  useEffect(() => {
    browser.runtime.getPlatformInfo().then((info) => {
      document.body.classList.add("platform-" + info.os);
    });
  }, []);
};

export const WithPlatformClass = () => {
  usePlatformClass();

  return null;
};
