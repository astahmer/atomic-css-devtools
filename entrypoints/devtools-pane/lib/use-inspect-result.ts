import { useSelector } from "@xstate/store/react";
import { useEffect, useRef } from "react";
import { evaluator } from "../eval";
import { InspectResult } from "../inspect-api";
import { store } from "../store";

export const useInspectedResult = (
  cb?: (result: InspectResult | null) => void
) => {
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
    return evaluator.onPaneShown(async () => {
      const update = await evaluator.inspectElement();

      setResult(update ?? null);
      cb?.(update ?? null);
    });
  }, []);

  // Keep track of the location of the inspected element
  const prevLocation = useRef(null as string | null);
  useEffect(() => {
    if (!result?.env.location) return;
    prevLocation.current = result?.env.location;

    const run = async () => {
      const update = await evaluator.inspectElement();
      setResult(update ?? null);
      cb?.(update ?? null);
    };
    run();
  }, [result?.env.location]);

  // Keep track of the window size, will be useful to match the applied rules based on the current env
  useEffect(() => {
    return evaluator.onMsg.resize((ev) => {
      store.send({ type: "setEnv", env: ev.data });
    });
  }, []);

  const refresh = async () => {
    const update = await evaluator.inspectElement();
    setResult(update ?? null);
  };

  return { inspected: result, refresh };
};
