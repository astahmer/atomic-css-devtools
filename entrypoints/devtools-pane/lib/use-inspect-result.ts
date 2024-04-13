import { useEffect, useRef, useState } from "react";
import { evaluator } from "../eval";
import { InspectResult } from "../inspect-api";

export const useInspectedResult = (
  cb?: (result: InspectResult | null) => void
) => {
  const [result, setResult] = useState(null as InspectResult | null);

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

  return result;
};
