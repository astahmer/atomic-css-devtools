import { useSelector } from "@xstate/store/react";
import { useEffect } from "react";
import { evaluator } from "../eval";
import { store } from "../store";

export const useWindowSize = () => {
  const windowSize = useSelector(store, (s) => s.context.env);

  useEffect(() => {
    return evaluator.onMsg.resize((ev) => {
      store.send({ type: "setEnv", env: ev.data });
    });
  }, []);

  return windowSize;
};
