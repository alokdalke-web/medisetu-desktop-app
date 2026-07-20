import { useEffect } from "react";

type UseGlobalUndoRedoOptions = {
  undo: () => void;
  redo: () => void;
};

export const useGlobalUndoRedo = ({ undo, redo }: UseGlobalUndoRedoOptions) => {
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();

          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (event.key.toLowerCase() === "y") {
          event.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [undo, redo]);
};
