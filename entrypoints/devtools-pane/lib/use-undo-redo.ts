import { SetStateAction, useRef, useState } from "react";

const updatedKey = Symbol("updatedKey");

export function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const indexRef = useRef(0);

  const setHistoryState = (newState: React.SetStateAction<T>) => {
    const resolvedState =
      typeof newState === "function" ? (newState as Function)(state) : newState;
    const newHistory = historyRef.current.slice(0, indexRef.current + 1);
    newHistory.push(resolvedState);

    historyRef.current = newHistory;
    indexRef.current += 1;
    setState(resolvedState);
  };

  const undo = (cb?: (prev: T, next: T) => void) => {
    const newIndex = Math.max(indexRef.current - 1, 0);
    if (newIndex !== indexRef.current) {
      cb?.(historyRef.current[indexRef.current], historyRef.current[newIndex]);
      indexRef.current = newIndex;
      setState(historyRef.current[newIndex]);
    }
  };

  const redo = (cb?: (prev: T, next: T) => void) => {
    const newIndex = Math.min(
      indexRef.current + 1,
      historyRef.current.length - 1
    );
    if (newIndex !== indexRef.current) {
      cb?.(historyRef.current[indexRef.current], historyRef.current[newIndex]);
      indexRef.current = newIndex;
      setState(historyRef.current[newIndex]);
    }
  };

  return {
    state,
    setState: setHistoryState,
    setNestedState:
      <K extends keyof T>(key: K) =>
      (update: SetStateAction<T[K]>) =>
        setHistoryState((current) => ({
          ...current,
          [updatedKey]: key,
          [key]:
            typeof update === "function"
              ? (update as Function)(current[key])
              : update,
        })),
    undo,
    redo,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
    reset: () => {
      setState(initialState);
      historyRef.current = [initialState];
      indexRef.current = 0;
    },
    getUpdatedKey: (state: T) => (state as any)[updatedKey] as string,
  };
}
