import { useEffect, useState } from "react";
import { evaluator } from "../eval";
import { InspectResult } from "../inspect-api";

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({} as InspectResult["env"]);

  useEffect(() => {
    return evaluator.onWindowResize((ev) => {
      setWindowSize(ev);
    });
  }, []);

  return windowSize;
};
