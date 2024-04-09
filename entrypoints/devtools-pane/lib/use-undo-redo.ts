import { useRef, useState } from "react";

export function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const indexRef = useRef(0);

  const setCurrentState = (newState: React.SetStateAction<T>) => {
    const resolvedState =
      typeof newState === "function" ? (newState as Function)(state) : newState;
    const newHistory = historyRef.current.slice(0, indexRef.current + 1);
    newHistory.push(resolvedState);

    historyRef.current = newHistory;
    indexRef.current += 1;
    setState(resolvedState);
  };

  const undo = () => {
    const newIndex = Math.max(indexRef.current - 1, 0);
    if (newIndex !== indexRef.current) {
      indexRef.current = newIndex;
      setState(historyRef.current[newIndex]);
    }
  };

  const redo = () => {
    const newIndex = Math.min(
      indexRef.current + 1,
      historyRef.current.length - 1
    );
    if (newIndex !== indexRef.current) {
      indexRef.current = newIndex;
      setState(historyRef.current[newIndex]);
    }
  };

  return {
    state,
    setState: setCurrentState,
    undo,
    redo,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
  };
}
