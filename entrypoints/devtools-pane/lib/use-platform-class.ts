import { useEffect } from "react";

export const usePlatformClass = () => {
  useEffect(() => {
    browser.runtime.getPlatformInfo().then((info) => {
      document.body.classList.add("platform-" + info.os);
    });
  }, []);
};
