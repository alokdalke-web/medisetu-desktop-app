import { useCallback, useState } from "react";

import { HandlebarPoint } from "../types";

export type PointsUpdater =
  | HandlebarPoint[]
  | ((prev: HandlebarPoint[]) => HandlebarPoint[]);

type UndoablePointsState = {
  past: HandlebarPoint[][];
  present: HandlebarPoint[];
  future: HandlebarPoint[][];
};

export const useUndoablePoints = (initialPoints: HandlebarPoint[] = []) => {
  const [pointsState, setPointsState] = useState<UndoablePointsState>({
    past: [],
    present: initialPoints,
    future: [],
  });

  const points = pointsState.present;

  const setPoints = useCallback((updater: PointsUpdater) => {
    setPointsState((currentState) => {
      const nextPoints =
        typeof updater === "function" ? updater(currentState.present) : updater;

      if (nextPoints === currentState.present) {
        return currentState;
      }

      return {
        past: [...currentState.past, currentState.present],
        present: nextPoints,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setPointsState((currentState) => {
      if (currentState.past.length === 0) {
        return currentState;
      }

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setPointsState((currentState) => {
      if (currentState.future.length === 0) {
        return currentState;
      }

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  return {
    points,
    setPoints,
    undo,
    redo,
  };
};
