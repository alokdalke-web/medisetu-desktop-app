import { Spinner } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiEye,
  FiMaximize,
  FiMaximize2,
  FiZoomIn,
  FiZoomOut,
} from "react-icons/fi";
import Tooltip from "../../../../components/shared/Tooltip";
import type {
  LivePreviewPanelProps,
  PreviewZoom,
} from "../../../../types/prescription";

/** Hides the preview's own scrollbars so the A4 sheet reads as paper. */
const HIDE_SCROLLBARS =
  "<style>::-webkit-scrollbar{display:none}*{scrollbar-width:none;-ms-overflow-style:none}</style></head>";

/** A4 at 96dpi — the fixed pixel size the iframe renders before scaling. */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(3))));

const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
  previewHtml,
  isLoading,
  templateLabel,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.6);
  const [zoom, setZoom] = useState<PreviewZoom>(null);

  // Read inside the wheel listener, which is bound once and would otherwise
  // close over a stale fit value.
  const fitScaleRef = useRef(fitScale);
  fitScaleRef.current = fitScale;

  // The iframe always renders a fixed 794x1123 page. Measure the stage so
  // "Fit" can show the whole sheet at once instead of scrolling a tall page.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const apply = () => {
      const { clientWidth, clientHeight } = stage;
      if (!clientWidth || !clientHeight) return;

      setFitScale(
        Math.min(clientWidth / A4_WIDTH_PX, clientHeight / A4_HEIGHT_PX),
      );
    };

    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  // Ctrl/⌘ + wheel zooms continuously, the way every document viewer does.
  // Bound manually because preventDefault needs a non-passive listener.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      setZoom((current) =>
        clampZoom((current ?? fitScaleRef.current) * (1 - event.deltaY * 0.002)),
      );
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });

    return () => stage.removeEventListener("wheel", handleWheel);
  }, []);

  const scale = zoom ?? fitScale;
  const isFitting = zoom === null;

  // Stepping from "Fit" starts at whatever fit currently resolves to, so the
  // first click never jumps the sheet to an unrelated size.
  const step = useCallback(
    (delta: number) =>
      setZoom((current) => clampZoom((current ?? fitScaleRef.current) + delta)),
    [],
  );

  const zoomButton =
    "grid h-10 w-10 place-items-center rounded-lg border border-line text-text-muted transition-colors hover:bg-surface-muted disabled:opacity-40 lg:h-8 lg:w-8";

  return (
    <section
      aria-label="Live prescription preview"
      className="flex h-[58dvh] min-h-[340px] flex-col rounded-2xl border border-line bg-surface lg:h-[calc(100dvh-7rem)] lg:min-h-[560px]"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line px-3 py-2 sm:px-4">
        <FiEye size={13} className="shrink-0 text-primary" />
        <h3 className="text-[12px] font-semibold text-text">Live Preview</h3>
        {templateLabel && (
          <span className="hidden truncate text-[11px] text-text-subtle sm:inline">
            · {templateLabel}
          </span>
        )}

        {isLoading && (
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-text-subtle">
            <Spinner size="sm" />
            Updating
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Tooltip content="Zoom out" placement="top" delay={400}>
            <button
              type="button"
              aria-label="Zoom out"
              className={zoomButton}
              onClick={() => step(-ZOOM_STEP)}
              disabled={scale <= MIN_ZOOM}
            >
              <FiZoomOut size={14} />
            </button>
          </Tooltip>

          <Tooltip
            content="Drag to zoom — or hold Ctrl and scroll over the page"
            placement="top"
            delay={400}
          >
            <input
              type="range"
              aria-label="Zoom level"
              min={Math.round(MIN_ZOOM * 100)}
              max={Math.round(MAX_ZOOM * 100)}
              step={1}
              value={Math.round(scale * 100)}
              onChange={(event) => setZoom(Number(event.target.value) / 100)}
              className="hidden h-1 w-[104px] cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary sm:block"
            />
          </Tooltip>

          <Tooltip content="Zoom in" placement="top" delay={400}>
            <button
              type="button"
              aria-label="Zoom in"
              className={zoomButton}
              onClick={() => step(ZOOM_STEP)}
              disabled={scale >= MAX_ZOOM}
            >
              <FiZoomIn size={14} />
            </button>
          </Tooltip>

          <span
            aria-live="polite"
            className="min-w-[42px] text-center font-mono text-[11px] text-text-muted"
          >
            {Math.round(scale * 100)}%
          </span>

          <Tooltip content="Fit to screen" placement="top" delay={400}>
            <button
              type="button"
              aria-label="Fit preview to screen"
              aria-pressed={isFitting}
              className={`${zoomButton} ${
                isFitting ? "border-primary bg-primary/10 text-primary" : ""
              }`}
              onClick={() => setZoom(null)}
            >
              <FiMaximize size={14} />
            </button>
          </Tooltip>

          <Tooltip content="Actual size (100%)" placement="top" delay={400}>
            <button
              type="button"
              aria-label="View at actual size"
              aria-pressed={zoom === 1}
              className={`${zoomButton} ${
                zoom === 1 ? "border-primary bg-primary/10 text-primary" : ""
              }`}
              onClick={() => setZoom(1)}
            >
              <FiMaximize2 size={14} />
            </button>
          </Tooltip>
        </div>
      </header>

      <div
        ref={stageRef}
        className={`min-h-0 flex-1 bg-background-secondary p-3 sm:p-4 ${
          isFitting
            ? "flex items-center justify-center overflow-hidden"
            : "overflow-auto [scrollbar-width:thin]"
        }`}
      >
        <div
          className="relative mx-auto shrink-0 overflow-hidden rounded-lg border border-line shadow-sm"
          style={{
            width: `${A4_WIDTH_PX * scale}px`,
            height: `${A4_HEIGHT_PX * scale}px`,
            backgroundColor: "#ffffff",
          }}
        >
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml.replace("</head>", HIDE_SCROLLBARS)}
              title="Prescription template preview"
              className="absolute left-0 top-0 border-0"
              style={{
                width: `${A4_WIDTH_PX}px`,
                height: `${A4_HEIGHT_PX}px`,
                transformOrigin: "top left",
                transform: `scale(${scale})`,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Spinner size="lg" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LivePreviewPanel;
