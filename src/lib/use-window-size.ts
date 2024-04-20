import { useSelector } from "@xstate/store/react";
import { useEffect } from "react";
import { store } from "../store";
import { useDevtoolsContext } from "../devtools-context";

export const useWindowSize = () => {
  const { onContentScriptMessage } = useDevtoolsContext();
  const windowSize = useSelector(store, (s) => s.context.env);

  useEffect(() => {
    return onContentScriptMessage.resize((ev) => {
      store.send({ type: "setEnv", env: ev.data });
    });
  }, []);

  return windowSize;
};
