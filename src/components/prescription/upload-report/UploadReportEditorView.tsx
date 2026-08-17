import { Button, Slider, Tab, Tabs } from "@heroui/react";
import React from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCamera,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiCrop,
  FiEye,
  FiMove,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiRotateCw,
  FiSun,
  FiTrash2,
  FiX,
  FiZoomIn,
  FiZoomOut,
} from "react-icons/fi";
import type {
  CropArea,
  FilterType,
  PageImage,
  ResizeCorner,
} from "./types";

type UploadReportEditorViewProps = {
  pages: PageImage[];
  activePage: PageImage;
  activePageIdx: number;
  setActivePageIdx: React.Dispatch<React.SetStateAction<number>>;
  addMoreRef: React.RefObject<HTMLInputElement | null>;
  onAddMore: React.ChangeEventHandler<HTMLInputElement>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  brightness: number;
  setBrightness: React.Dispatch<React.SetStateAction<number>>;
  contrast: number;
  setContrast: React.Dispatch<React.SetStateAction<number>>;
  activeFilter: FilterType | null;
  showCropOverlay: boolean;
  setShowCropOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  cropArea: CropArea;
  setCropArea: React.Dispatch<React.SetStateAction<CropArea>>;
  displayCropArea: CropArea;
  isProcessing: boolean;
  isDragging: boolean;
  movingCrop: boolean;
  resizingCorner: ResizeCorner | null;
  setResizingCorner: React.Dispatch<React.SetStateAction<ResizeCorner | null>>;
  setMovingCrop: React.Dispatch<React.SetStateAction<boolean>>;
  setDragStart: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  toNaturalCoords: (clientX: number, clientY: number) => { x: number; y: number };
  handleMouseDown: React.MouseEventHandler<HTMLDivElement>;
  handleMouseMove: React.MouseEventHandler<HTMLDivElement>;
  handleMouseUp: () => void;
  removePage: (idx: number) => void;
  autoScanActivePage: () => void;
  handleApplyCrop: () => void;
  handleApplyFilter: (filter: FilterType) => void;
  restoreOriginal: () => void;
  handleRotate: (dir: "left" | "right") => void;
  handleFlip: (h: boolean, v: boolean) => void;
  resetPage: () => void;
  addViaCamera: () => void;
  discardPages: () => void;
  buildPreview: () => void;
  processAndSave: () => void;
};

const UploadReportEditorView = ({
  pages,
  activePage,
  activePageIdx,
  setActivePageIdx,
  addMoreRef,
  onAddMore,
  imageRef,
  zoom,
  setZoom,
  activeTab,
  setActiveTab,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  activeFilter,
  showCropOverlay,
  setShowCropOverlay,
  cropArea,
  setCropArea,
  displayCropArea,
  isProcessing,
  isDragging,
  movingCrop,
  resizingCorner,
  setResizingCorner,
  setMovingCrop,
  setDragStart,
  toNaturalCoords,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  removePage,
  autoScanActivePage,
  handleApplyCrop,
  handleApplyFilter,
  restoreOriginal,
  handleRotate,
  handleFlip,
  resetPage,
  addViaCamera,
  discardPages,
  buildPreview,
  processAndSave,
}: UploadReportEditorViewProps) => (
  <div className="flex min-h-0 gap-5">
    <div className="flex min-w-0 flex-1 gap-3">
      <div className="w-[72px] shrink-0 flex-col gap-2">
        <div className="mb-1 text-center text-xs font-semibold text-slate-500">
          Pages
        </div>

        <div className="flex max-h-[480px] flex-col gap-2 overflow-y-auto pr-1">
          {pages.map((page, idx) => (
            <div
              key={page.id}
              onClick={() => setActivePageIdx(idx)}
              className={`relative shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${
                idx === activePageIdx
                  ? "border-emerald-600"
                  : "border-transparent hover:border-gray-300"
              }`}
              style={{ width: 64, height: 80 }}
            >
              <img src={page.current} className="h-full w-full object-cover" />

              <div className="absolute left-0 right-0 top-0 bg-black/50 py-0.5 text-center text-[9px] text-white">
                {idx + 1}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePage(idx);
                }}
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
              >
                <FiX />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => addMoreRef.current?.click()}
          className="mt-1 flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-emerald-500 hover:text-emerald-600"
        >
          <FiPlus className="text-lg" />
          <span className="text-[9px]">Add</span>
        </button>

        <input
          ref={addMoreRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onAddMore}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Edit Document
            </h3>
            <p className="text-xs text-slate-500">
              Page {activePageIdx + 1} of {pages.length}
            </p>
          </div>

          <div className="flex gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              isDisabled={activePageIdx === 0}
              onPress={() => setActivePageIdx((p) => p - 1)}
            >
              <FiChevronLeft />
            </Button>

            <Button
              isIconOnly
              size="sm"
              variant="flat"
              isDisabled={activePageIdx === pages.length - 1}
              onPress={() => setActivePageIdx((p) => p + 1)}
            >
              <FiChevronRight />
            </Button>
          </div>
        </div>

        <div
          className="relative overflow-auto rounded-lg border-2 border-gray-200 bg-gray-100 select-none"
          style={{
            maxHeight: 460,
            maxWidth: "100%",
            cursor: resizingCorner
              ? "nwse-resize"
              : movingCrop
                ? "grabbing"
                : isDragging
                  ? "crosshair"
                  : showCropOverlay
                    ? "crosshair"
                    : "default",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="relative inline-block min-w-full"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <img
              ref={imageRef}
              src={activePage.current}
              draggable={false}
              className="block h-auto w-full select-none object-contain"
            />

            {showCropOverlay &&
              cropArea.width > 4 &&
              cropArea.height > 4 && (
                <div className="pointer-events-none absolute inset-0">
                  <svg
                    className="absolute inset-0 h-full w-full"
                    style={{ pointerEvents: "none" }}
                  >
                    <defs>
                      <mask id="cropMask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect
                          x={displayCropArea.x}
                          y={displayCropArea.y}
                          width={displayCropArea.width}
                          height={displayCropArea.height}
                          fill="black"
                        />
                      </mask>
                    </defs>

                    <rect
                      width="100%"
                      height="100%"
                      fill="rgba(0,0,0,0.45)"
                      mask="url(#cropMask)"
                    />
                  </svg>

                  <div
                    className="absolute border-2 border-blue-400"
                    style={{
                      left: displayCropArea.x,
                      top: displayCropArea.y,
                      width: displayCropArea.width,
                      height: displayCropArea.height,
                      pointerEvents: "all",
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0">
                      {[1, 2].map((i) => (
                        <React.Fragment key={i}>
                          <div
                            className="absolute w-px bg-white/30"
                            style={{
                              left: `${(i / 3) * 100}%`,
                              top: 0,
                              height: "100%",
                            }}
                          />
                          <div
                            className="absolute h-px bg-white/30"
                            style={{
                              top: `${(i / 3) * 100}%`,
                              left: 0,
                              width: "100%",
                            }}
                          />
                        </React.Fragment>
                      ))}
                    </div>

                    {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                      <div
                        key={corner}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingCorner(corner);
                        }}
                        className="absolute z-10 h-3 w-3 rounded-sm border-2 border-blue-500 bg-white"
                        style={{
                          left: corner.includes("l") ? -6 : undefined,
                          right: corner.includes("r") ? -6 : undefined,
                          top: corner.includes("t") ? -6 : undefined,
                          bottom: corner.includes("b") ? -6 : undefined,
                          cursor:
                            corner === "tl" || corner === "br"
                              ? "nwse-resize"
                              : "nesw-resize",
                        }}
                      />
                    ))}

                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setMovingCrop(true);
                        setDragStart(toNaturalCoords(e.clientX, e.clientY));
                      }}
                      className="absolute z-10 flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-blue-500 text-xs text-white"
                      style={{
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%,-50%)",
                      }}
                    >
                      <FiMove />
                    </div>
                  </div>
                </div>
              )}

            {isProcessing && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                <div className="flex items-center gap-2 text-white">
                  <FiRefreshCw className="animate-spin" />
                  <span>Processing…</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            onPress={() => setZoom((z) => Math.max(0.3, z - 0.1))}
          >
            <FiZoomOut />
          </Button>

          <span className="w-14 text-center text-sm">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            isIconOnly
            size="sm"
            variant="flat"
            onPress={() => setZoom((z) => Math.min(4, z + 0.1))}
          >
            <FiZoomIn />
          </Button>
        </div>
      </div>
    </div>

    <div className="w-72 shrink-0 border-l border-gray-200 pl-5">
      <Tabs
        aria-label="Editor tools"
        selectedKey={activeTab}
        onSelectionChange={(k) => setActiveTab(k as string)}
        className="mb-4"
        size="sm"
      >
        <Tab key="crop" title="Crop" />
        <Tab key="adjust" title="Adjust" />
        <Tab key="filters" title="Filters" />
        <Tab key="transform" title="Rotate" />
      </Tabs>

      {activeTab === "crop" && (
        <div className="space-y-3">
          <Button
            className="w-full"
            color="secondary"
            variant="flat"
            size="sm"
            onPress={autoScanActivePage}
          >
            Auto Scan Document
          </Button>

          <Button
            className="w-full"
            size="sm"
            color={showCropOverlay ? "primary" : "default"}
            variant={showCropOverlay ? "solid" : "flat"}
            onPress={() => {
              if (!showCropOverlay) {
                setCropArea({ x: 0, y: 0, width: 0, height: 0 });
              }
              setShowCropOverlay((v) => !v);
            }}
            startContent={<FiCrop />}
          >
            {showCropOverlay ? "Cancel Selection" : "Select Area to Crop"}
          </Button>

          {showCropOverlay && (
            <Button
              className="w-full"
              color="primary"
              size="sm"
              onPress={handleApplyCrop}
              isDisabled={cropArea.width < 10 || cropArea.height < 10}
            >
              Apply Crop
            </Button>
          )}

          {showCropOverlay && cropArea.width > 0 && (
            <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
              {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
            </div>
          )}
        </div>
      )}

      {activeTab === "adjust" && (
        <div className="space-y-5">
          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-sm">Brightness</span>
              <span className="text-sm text-slate-500">{brightness}</span>
            </div>

            <Slider
              aria-label="Brightness"
              size="sm"
              step={1}
              minValue={-50}
              maxValue={50}
              value={brightness}
              onChange={(v) => setBrightness(v as number)}
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-sm">Contrast</span>
              <span className="text-sm text-slate-500">{contrast}</span>
            </div>

            <Slider
              aria-label="Contrast"
              size="sm"
              step={1}
              minValue={-50}
              maxValue={50}
              value={contrast}
              onChange={(v) => setContrast(v as number)}
            />
          </div>

          <Button
            className="w-full"
            color="primary"
            variant="flat"
            size="sm"
            onPress={() => handleApplyFilter("enhance")}
            startContent={<FiSun />}
          >
            Auto Enhance
          </Button>
        </div>
      )}

      {activeTab === "filters" && (
        <div className="space-y-2">
          {([null, "grayscale", "bw", "sharpen"] as const).map((f) => (
            <Button
              key={String(f)}
              className="w-full justify-start"
              size="sm"
              variant={activeFilter === f ? "solid" : "flat"}
              color={activeFilter === f ? "primary" : "default"}
              onPress={() => {
                if (f === null) {
                  restoreOriginal();
                } else {
                  handleApplyFilter(f);
                }
              }}
            >
              {f === null
                ? "Original"
                : f === "grayscale"
                  ? "Grayscale"
                  : f === "bw"
                    ? "Black & White"
                    : "Sharpen"}
            </Button>
          ))}
        </div>
      )}

      {activeTab === "transform" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="w-full"
              size="sm"
              variant="flat"
              onPress={() => handleRotate("left")}
              startContent={<FiRotateCcw />}
            >
              Left
            </Button>

            <Button
              className="w-full"
              size="sm"
              variant="flat"
              onPress={() => handleRotate("right")}
              startContent={<FiRotateCw />}
            >
              Right
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              className="w-full"
              size="sm"
              variant="flat"
              onPress={() => handleFlip(true, false)}
              startContent={<FiArrowLeft />}
            >
              Flip H
            </Button>

            <Button
              className="w-full"
              size="sm"
              variant="flat"
              onPress={() => handleFlip(false, true)}
              startContent={<FiArrowRight className="rotate-90" />}
            >
              Flip V
            </Button>
          </div>

          <Button
            className="w-full"
            size="sm"
            color="danger"
            variant="flat"
            onPress={resetPage}
            startContent={<FiTrash2 />}
          >
            Reset Page
          </Button>
        </div>
      )}

      <div className="mt-5 space-y-2 border-t border-gray-200 pt-5">
        <Button
          className="w-full"
          size="sm"
          variant="flat"
          onPress={addViaCamera}
          startContent={<FiCamera />}
        >
          Add via Camera
        </Button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button size="sm" variant="bordered" onPress={discardPages}>
            Discard
          </Button>

          <Button
            size="sm"
            color="primary"
            onPress={buildPreview}
            isLoading={isProcessing}
            startContent={!isProcessing && <FiEye />}
          >
            Preview
          </Button>
        </div>

        <Button
          className="w-full"
          size="sm"
          color="success"
          variant="flat"
          onPress={processAndSave}
          isLoading={isProcessing}
          startContent={!isProcessing && <FiCheck />}
        >
          Save as PDF ({pages.length} {pages.length === 1 ? "page" : "pages"})
        </Button>
      </div>
    </div>
  </div>
);

export default UploadReportEditorView;
