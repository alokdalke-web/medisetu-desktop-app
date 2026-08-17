import {
  useEffect,
  useState,
  type DependencyList,
  type RefObject,
} from "react";

type ElementSize = {
  width: number;
  height: number;
};

const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

const normalizeSize = (width: number, height: number): ElementSize => ({
  width: Math.max(0, Math.floor(width)),
  height: Math.max(0, Math.floor(height)),
});

export const useElementContentSize = <T extends HTMLElement>(
  elementRef: RefObject<T | null>,
  deps: DependencyList = [],
) => {
  const [size, setSize] = useState<ElementSize>(EMPTY_SIZE);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const updateSize = (width: number, height: number) => {
      const nextSize = normalizeSize(width, height);

      setSize((currentSize) =>
        currentSize.width === nextSize.width &&
        currentSize.height === nextSize.height
          ? currentSize
          : nextSize,
      );
    };

    const initialRect = element.getBoundingClientRect();

    updateSize(initialRect.width, initialRect.height);

    if (typeof ResizeObserver === "undefined") {
      const handleWindowResize = () => {
        const fallbackRect = element.getBoundingClientRect();

        updateSize(fallbackRect.width, fallbackRect.height);
      };

      window.addEventListener("resize", handleWindowResize);

      return () => window.removeEventListener("resize", handleWindowResize);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const firstEntry = entries[0];

      if (!firstEntry) return;

      updateSize(firstEntry.contentRect.width, firstEntry.contentRect.height);
    });

    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [elementRef, ...deps]);

  return size;
};
