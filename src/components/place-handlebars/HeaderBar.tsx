import React, { useState } from "react";
import { Button } from "@heroui/react";

interface HeaderBarProps {
  onBack: () => void;
  pointsCount: number;
  onClearAll: () => void;
  printType: "With Background" | "Without Background";
  onPrintTypeChange: (val: "With Background" | "Without Background") => void;
  onSaveTemplate: () => void;
  isSavingTemplate?: boolean;
  onShowPreview: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onBack,
  pointsCount,
  onClearAll,
  printType,
  onPrintTypeChange,
  onSaveTemplate,
  isSavingTemplate = false,
  onShowPreview,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-default-200 bg-content1/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-default-600 transition-colors hover:border-default-400 hover:bg-default-100"
          type="button"
          onClick={onBack}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
        <div className="h-4 w-px bg-default-200" />
        <h1 className="text-sm font-semibold tracking-tight">
          Place Handlebars
        </h1>
        {pointsCount > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {pointsCount} placed
          </span>
        )}
      </div>

      <div className="relative flex items-center gap-2">
        <button
          aria-expanded={showShortcuts}
          aria-label="Toggle shortcuts"
          className="rounded-lg border border-default-200 bg-default-50 p-1.5 text-default-600 transition-colors hover:border-default-400 hover:bg-default-100"
          type="button"
          onClick={() => setShowShortcuts((prev) => !prev)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
            />
          </svg>
        </button>

        {showShortcuts && (
          <div className="absolute right-0 top-full mt-2 hidden lg:flex items-center gap-2 rounded-xl border border-default-200 bg-content1 p-2 shadow-lg xl:gap-4">
            {[
              { keys: "Drag field → canvas", label: "Place" },
              { keys: "↑ ↓ ← →", label: "Nudge" },
              { keys: "+ / −", label: "Font / logo size" },
              { keys: "Alt + ↑↓←→", label: "Resize" },
              { keys: "Del", label: "Remove" },
            ].map(({ keys, label }) => (
              <span
                key={label}
                className="flex items-center gap-1 text-[10px] text-default-400"
              >
                <kbd className="rounded border border-default-200 bg-content1 px-1 py-0.5 font-mono text-[9px] text-default-500">
                  {keys}
                </kbd>
                <span className="hidden xl:inline">{label}</span>
              </span>
            ))}
          </div>
        )}

        <button
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="rounded-lg border border-default-200 bg-default-50 p-1.5 text-default-600 transition-colors hover:border-default-400 hover:bg-default-100"
          type="button"
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          )}
        </button>

        <Button
          isDisabled={pointsCount === 0}
          variant="bordered"
          onPress={onClearAll}
        >
          Clear All
        </Button>
        <label
          className="flex items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-default-600"
          htmlFor="include-image-html"
        >
          <input
            checked={printType === "With Background"}
            className="h-3.5 w-3.5 rounded border-default-300 text-primary focus:ring-primary"
            id="include-image-html"
            type="checkbox"
            onChange={(event) =>
              onPrintTypeChange(
                event.target.checked ? "With Background" : "Without Background",
              )
            }
          />
          Include image
        </label>
        <Button
          color="primary"
          isLoading={isSavingTemplate}
          onPress={onSaveTemplate}
        >
          <svg
            className="mr-1.5 h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 4h11l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M8 4v6h8V4" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M8 17h8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Save Template
        </Button>
        <Button color="primary" onClick={onShowPreview}>
          <svg
            className="mr-1.5 h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
            <path
              d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Preview
        </Button>
      </div>
    </header>
  );
};
