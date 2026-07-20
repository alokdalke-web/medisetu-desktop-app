import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast,
} from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  HeaderBar,
  SettingsSidebar,
  FieldsControlsBar,
  PlacementCanvas,
  FieldsSidebar,
  usePlaceHandlebars,
  type PlaceHandlebarsProps,
} from "../../components/place-handlebars";
import { PAPER_SIZE_DIMENSIONS_MM } from "../../components/place-handlebars/constants";
import { useUploadManualTemplateMutation } from "../../redux/api/manualPrescriptionApi";

const PlaceHandlebars = (props: PlaceHandlebarsProps) => {
  const { onBack, onImageReady, imageUrl, onError } = props;
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [uploadManualTemplate, { isLoading: isSavingTemplate }] =
    useUploadManualTemplateMutation();

  const toggleFullscreen = useCallback(() => {
    const el = sectionRef.current;

    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const el = sectionRef.current;

    if (!el) return;

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    el.addEventListener("fullscreenchange", handleFullscreenChange);

    return () =>
      el.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const hookReturns = usePlaceHandlebars(props);
  const {
    activePointId,
    activePointAlignDirection,
    activePointFontSize,
    adjustPointFontScale,
    autoAlignCandidates,
    autoAlignChatMessages,
    beginPrecisionSelectForAutoAlign,
    canSubmitAutoAlignFeedback,
    isAutoAlignRunning,
    isAutoAlignFeedbackRunning,
    isGeminiAutoAlignEnabled,
    canvasContainerStyle,
    canvasImageFitMode,
    canvasImageStyle,
    canvasOrientation,
    canvasPaperSize,
    canvasViewportRef,
    clearPoints,
    copyHtmlOutput,
    dateFormat,
    dateSeparator,
    draggedField,
    draggingPointId,
    getPointFontSize,
    handleCanvasKeyDown,
    handleFieldDragEnd,
    handleFieldDragStart,
    handleImageDragLeave,
    handleImageDragOver,
    handleImageDrop,
    handlePointDragEnd,
    handlePointDragStart,
    handleSelectionMouseDown,
    handleSelectionMouseLeave,
    handleSelectionMouseMove,
    handleSelectionMouseUp,
    hiddenFieldKeys,
    hiddenGroupLabels,
    hiddenItemCount,
    hideField,
    hideGroup,
    increaseActivePointFontSize,
    imageContainerRef,
    isDragOverImage,
    isFieldKeyNameVisible,
    isSelectingAutoAlignArea,
    points,
    removePoint,
    selectionOverlayArea,
    setActivePointId,
    setCanvasImageFitMode,
    setCanvasOrientation,
    setCanvasPaperSize,
    setDateFormat,
    setDateSeparator,
    setActivePointAlignDirection,
    setShowHiddenList,
    setTimeFormat,
    setTimeSeparator,
    setVitalsTableOrientation,
    showHiddenList,
    timeFormat,
    timeSeparator,
    unhideField,
    unhideGroup,
    visibleFieldGroups,
    vitalsTableOrientation,
    showKeyNames,
    submitAutoAlignFeedback,
    toggleShowKeyNames,
    toggleFieldKeyNameVisibility,
    revertAutoAlign,
    setActivePointFontSize,
    isAutoAlignRevertable,
    decreaseActivePointFontSize,
    htmlOutput,
    printType,
    setPrintType,
  } = hookReturns;

  const handleShowPreview = () => {
    setShowPreview(!showPreview);
  };

  const handleSaveTemplate = async () => {
    try {
      const imageResponse = await fetch(imageUrl);

      if (!imageResponse.ok) {
        throw new Error("Template image could not be prepared for saving.");
      }

      const templateImage = await imageResponse.blob();
      
      const response = await uploadManualTemplate({
        templateImage,
        templateHtml: htmlOutput,
        printType,
      }).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to save manual template.");
      }

      addToast({
        title: "Success",
        description: "Prescription template saved successfully.",
        color: "success",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save manual template.";

      onError(errorMessage);

      addToast({
        title: "Error",
        description: "There was some error saving prescription template.",
        color: "danger",
      });
    }
  };

  const canvasDims = PAPER_SIZE_DIMENSIONS_MM[hookReturns.canvasPaperSize];
  const previewWidthMm =
    hookReturns.canvasOrientation === "landscape"
      ? canvasDims.heightMm
      : canvasDims.widthMm;
  const previewHeightMm =
    hookReturns.canvasOrientation === "landscape"
      ? canvasDims.widthMm
      : canvasDims.heightMm;

  const handlePrint = () => {
    const iframe = previewIframeRef.current;

    if (!iframe) return;

    const printIframe = () => {
      const printWindow = iframe.contentWindow;

      if (!printWindow) return;
      printWindow.focus();
      printWindow.print();
    };

    if (iframe.contentDocument?.readyState === "complete") {
      printIframe();

      return;
    }

    const onLoad = () => {
      printIframe();
    };

    iframe.addEventListener("load", onLoad, { once: true });
  };

  return (
    <>
      <section
        ref={sectionRef}
        className={`flex min-h-0 flex-col gap-0 overflow-hidden rounded-xl border border-default-200 bg-content1 shadow-sm ${isFullscreen ? "h-screen" : "h-[calc(100vh_-_12rem)]"}`}
      >
        <HeaderBar
          printType={printType}
          isSavingTemplate={isSavingTemplate}
          pointsCount={points.length}
          isFullscreen={isFullscreen}
          onBack={onBack}
          onClearAll={clearPoints}
          onSaveTemplate={handleSaveTemplate}
          onPrintTypeChange={setPrintType}
          onShowPreview={handleShowPreview}
          onToggleFullscreen={toggleFullscreen}
        />

          <SettingsSidebar
            canvasImageFitMode={canvasImageFitMode}
            canvasOrientation={canvasOrientation}
            canvasPaperSize={canvasPaperSize}
            dateFormat={dateFormat}
            dateSeparator={dateSeparator}
            setCanvasImageFitMode={setCanvasImageFitMode}
            setCanvasOrientation={setCanvasOrientation}
            setCanvasPaperSize={setCanvasPaperSize}
            setDateFormat={setDateFormat}
            setDateSeparator={setDateSeparator}
            setTimeFormat={setTimeFormat}
            setTimeSeparator={setTimeSeparator}
            timeFormat={timeFormat}
            timeSeparator={timeSeparator}
          />

          <FieldsControlsBar
            activePointAlignDirection={activePointAlignDirection}
            activePointFontSize={activePointFontSize}
            activePointId={activePointId}
            autoAlignCandidates={autoAlignCandidates}
            beginPrecisionSelectForAutoAlign={beginPrecisionSelectForAutoAlign}
            decreaseActivePointFontSize={decreaseActivePointFontSize}
            increaseActivePointFontSize={increaseActivePointFontSize}
            isAutoAlignRevertable={isAutoAlignRevertable}
            isAutoAlignRunning={isAutoAlignRunning}
            revertAutoAlign={revertAutoAlign}
            setActivePointAlignDirection={setActivePointAlignDirection}
            setActivePointFontSize={setActivePointFontSize}
            setVitalsTableOrientation={setVitalsTableOrientation}
            showKeyNames={showKeyNames}
            toggleShowKeyNames={toggleShowKeyNames}
            vitalsTableOrientation={vitalsTableOrientation}
          />

        <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">

          <PlacementCanvas
            activePointId={activePointId}
            adjustPointFontScale={adjustPointFontScale}
            canvasContainerStyle={canvasContainerStyle}
            canvasImageStyle={canvasImageStyle}
            canvasViewportRef={canvasViewportRef}
            dateFormat={dateFormat}
            dateSeparator={dateSeparator}
            draggingPointId={draggingPointId}
            getPointFontSize={getPointFontSize}
            handleCanvasKeyDown={handleCanvasKeyDown}
            handleImageDragLeave={handleImageDragLeave}
            handleImageDragOver={handleImageDragOver}
            handleImageDrop={handleImageDrop}
            handlePointDragEnd={handlePointDragEnd}
            handlePointDragStart={handlePointDragStart}
            handleSelectionMouseDown={handleSelectionMouseDown}
            handleSelectionMouseLeave={handleSelectionMouseLeave}
            handleSelectionMouseMove={handleSelectionMouseMove}
            handleSelectionMouseUp={handleSelectionMouseUp}
            imageContainerRef={imageContainerRef}
            imageUrl={imageUrl}
            isDragOverImage={isDragOverImage}
            isSelectingAutoAlignArea={isSelectingAutoAlignArea}
            points={points}
            removePoint={removePoint}
            selectionOverlayArea={selectionOverlayArea}
            setActivePointId={setActivePointId}
            timeFormat={timeFormat}
            timeSeparator={timeSeparator}
            vitalsTableOrientation={vitalsTableOrientation}
            onError={onError}
            onImageReady={onImageReady}
          />

          <FieldsSidebar
            autoAlignChatMessages={autoAlignChatMessages}
            canSubmitAutoAlignFeedback={canSubmitAutoAlignFeedback}
            dateFormat={dateFormat}
            dateSeparator={dateSeparator}
            draggedField={draggedField}
            handleFieldDragEnd={handleFieldDragEnd}
            handleFieldDragStart={handleFieldDragStart}
            hiddenFieldKeys={hiddenFieldKeys}
            hiddenGroupLabels={hiddenGroupLabels}
            hiddenItemCount={hiddenItemCount}
            hideField={hideField}
            hideGroup={hideGroup}
            isFieldKeyNameVisible={isFieldKeyNameVisible}
            isAutoAlignFeedbackRunning={isAutoAlignFeedbackRunning}
            isAutoAlignRunning={isAutoAlignRunning}
            isGeminiAutoAlignEnabled={isGeminiAutoAlignEnabled}
            isSelectingAutoAlignArea={isSelectingAutoAlignArea}
            setShowHiddenList={setShowHiddenList}
            showHiddenList={showHiddenList}
            submitAutoAlignFeedback={submitAutoAlignFeedback}
            timeFormat={timeFormat}
            timeSeparator={timeSeparator}
            toggleFieldKeyNameVisibility={toggleFieldKeyNameVisibility}
            unhideField={unhideField}
            unhideGroup={unhideGroup}
            visibleFieldGroups={visibleFieldGroups}
            vitalsTableOrientation={vitalsTableOrientation}
          />
        </div>
      </section>
      {/* Render the HTML in a preview modal at page size */}
      <Modal
        backdrop="blur"
        isOpen={showPreview}
        scrollBehavior="inside"
        size="5xl"
        onOpenChange={setShowPreview}
      >
        <ModalContent className="h-[90vh] max-h-[90vh] overflow-hidden">
          <ModalHeader className="shrink-0 flex items-center justify-between border-b border-default-200 bg-content1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">
                Full Canvas Preview
              </span>
              <span className="rounded-full bg-default-100 px-2 py-1 text-xs text-default-500">
                1:1 Size
              </span>
            </div>
          </ModalHeader>

          <ModalBody className="flex-auto overflow-auto bg-content2 p-0">
            <div className="flex min-h-full items-start justify-center bg-default-100/50 p-4">
              <iframe
                ref={previewIframeRef}
                className="border border-default-300 bg-white shadow-2xl ring-1 ring-black/5"
                id="print-iframe"
                scrolling="no"
                srcDoc={htmlOutput}
                style={{
                  width: `${previewWidthMm}mm`,
                  height: `${previewHeightMm}mm`,
                  overflow: "hidden",
                }}
                title="HTML Preview"
              />
            </div>
          </ModalBody>

          <ModalFooter className="shrink-0 flex items-center justify-end gap-3 border-t border-default-200 bg-content1 px-6 py-4">
            <Button variant="bordered" onPress={() => setShowPreview(false)}>
              Close
            </Button>
            <Button
              color="primary"
              onPress={() => {
                copyHtmlOutput();
                setShowPreview(false);
              }}
              className="hidden"
            >
              <svg
                className="mr-1.5 h-4 w-4"
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
              Copy HTML & Close
            </Button>
            <Button color="primary" onPress={handlePrint} className="hidden">
              Print
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      </>
  );
};

export default PlaceHandlebars;
