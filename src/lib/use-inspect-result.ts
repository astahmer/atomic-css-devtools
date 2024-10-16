import { useSelector } from "@xstate/store/react";
import { useEffect, useRef } from "react";
import { InspectResult } from "../inspect-api";
import { store } from "../store";
import { useDevtoolsContext } from "../devtools-context";

export const useInspectedResult = (
  cb?: (result: InspectResult | null) => void,
) => {
  const { evaluator, onDevtoolEvent, onContentScriptMessage } =
    useDevtoolsContext();
  const result = useSelector(store, (s) => s.context.inspected);
  const setResult = (inspected: InspectResult | null) =>
    store.send({ type: "setInspected", inspected });

  // Refresh on inspected element changed
  useEffect(() => {
    return evaluator.onSelectionChanged((update) => {
      // console.log(update);
      setResult(update);
      cb?.(update);
    });
  }, []);

  // Refresh on pane shown, maybe styles were updated in the official `Styles` devtools panel
  useEffect(() => {
    return onDevtoolEvent("devtools-shown", async () => {
      const update = await evaluator.inspect();

      setResult(update ?? null);
      cb?.(update ?? null);
    });
  }, []);

  // Keep track of the location of the inspected element
  const prevLocation = useRef(result?.env.location ?? null);
  useEffect(() => {
    if (!result?.env.location) return;

    const run = async () => {
      prevLocation.current = result?.env.location;
      const update = await evaluator.inspect();
      setResult(update ?? null);
      cb?.(update ?? null);
    };

    if (!prevLocation.current) {
      prevLocation.current = result?.env.location;
      return;
    }

    if (prevLocation.current === result?.env.location) return;

    run();
  }, [result?.env.location]);

  // Keep track of the window size, will be useful to match the applied rules based on the current env
  useEffect(() => {
    return onContentScriptMessage.resize((ev) => {
      store.send({ type: "setEnv", env: ev.data });
    });
  }, []);

  const refresh = async () => {
    const update = await evaluator.inspect();
    setResult(update ?? null);
  };

  return { inspected: result, refresh };
};
