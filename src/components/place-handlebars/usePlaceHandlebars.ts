import {
  useState,
  useRef,
  useMemo,
  useCallback,
  type DragEvent,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import {
  useRunGeminiAutoAlignMutation,
  type GeminiRequestPart,
} from "../../redux/api/autoAlignGeminiApi";

import {
  HandlebarPoint,
  RawSelectionArea,
  NormalizedSelectionArea,
  VitalsTableOrientation,
  DateSeparator,
  DateDisplayFormat,
  TimeSeparator,
  TimeDisplayFormat,
  CanvasPaperSize,
  CanvasOrientation,
  CanvasImageFitMode,
  AutoAlignDirection,
  PlaceHandlebarsProps,
} from "./types";
import {
  CLINIC_LOGO_FIELD_ID,
  FIELD_DRAG_DATA_KEY,
  POINT_DRAG_DATA_KEY,
  HANDLEBAR_FIELD_GROUPS,
  HANDLEBAR_FIELDS,
  HANDLEBAR_FIELDS_BY_ID,
} from "./constants";
import {
  clampPercent,
  normalizeSelectionArea,
  clampFontScale,
  clampMarkerSizeScale,
} from "./utils";
import {
  getPercentPositionFromClient,
  getVisibleFieldGroups,
  handleCanvasKeyboard,
  isClientPointOverImage,
  buildHandlebarsHtmlOutput,
  computeAutoAlignedPoints,
  runGeminiAutoAlignAgent,
} from "./logic";
import {
  useCanvasPresentation,
  useGlobalUndoRedo,
  useUndoablePoints,
} from "./hooks";

type AutoAlignChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

export const usePlaceHandlebars = (props: PlaceHandlebarsProps) => {
  const { filters, imageUrl, onError } = props;

  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const dragAnchorOffsetRef = useRef<{
    xPercent: number;
    yPercent: number;
  } | null>(null);
  const [nextPointId, setNextPointId] = useState(1);
  const [fieldKeyNameVisibility, setFieldKeyNameVisibility] = useState<
    Record<string, boolean>
  >({});
  const [autoAlignDirection, setAutoAlignDirection] =
    useState<AutoAlignDirection>("left-to-right");
  const [syncedFontScale, setSyncedFontScale] = useState<number | null>(null);
  const [isAutoAlignRunning, setIsAutoAlignRunning] = useState(false);
  const [isAutoAlignFeedbackRunning, setIsAutoAlignFeedbackRunning] =
    useState(false);
  const { points, redo, setPoints, undo } = useUndoablePoints();
  const [runGeminiAutoAlign] = useRunGeminiAutoAlignMutation();
  const isGeminiAutoAlignEnabled = true;
  const autoAlignChatMessageIdRef = useRef(1);

  const requestGeminiAutoAlignContent = useCallback(
    async (requestParts: GeminiRequestPart[]) => {
      const payload = await runGeminiAutoAlign({ requestParts }).unwrap();

      if (typeof payload?.text !== "string") {
        throw new Error(
          payload?.message ||
            "Gemini backend response did not include text content.",
        );
      }

      return payload.text;
    },
    [runGeminiAutoAlign],
  );

  useGlobalUndoRedo({ undo, redo });

  const [preAutoAlignState, setPreAutoAlignState] = useState<
    HandlebarPoint[] | null
  >(null);
  const [autoAlignChatMessages, setAutoAlignChatMessages] = useState<
    AutoAlignChatMessage[]
  >([]);
  const [lastAutoAlignSelectionArea, setLastAutoAlignSelectionArea] =
    useState<NormalizedSelectionArea | null>(null);
  const [lastAutoAlignedFieldKeys, setLastAutoAlignedFieldKeys] = useState<
    string[]
  >([]);
  const [activePointId, setActivePointId] = useState<number | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<number | null>(null);
  const [isDragOverImage, setIsDragOverImage] = useState(false);
  const [isSelectingAutoAlignArea, setIsSelectingAutoAlignArea] =
    useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<RawSelectionArea | null>(
    null,
  );
  const [selectedAutoAlignArea, setSelectedAutoAlignArea] =
    useState<NormalizedSelectionArea | null>(null);
  const [hiddenGroupLabels, setHiddenGroupLabels] = useState<string[]>([]);
  const [hiddenFieldKeys, setHiddenFieldKeys] = useState<string[]>([]);
  const [showHiddenList, setShowHiddenList] = useState(false);
  const [vitalsTableOrientation, setVitalsTableOrientation] =
    useState<VitalsTableOrientation>("horizontal");
  const [dateFormat, setDateFormat] = useState<DateDisplayFormat>("DD MM YYYY");
  const [dateSeparator, setDateSeparator] =
    useState<DateSeparator>("space");
  const [timeFormat, setTimeFormat] = useState<TimeDisplayFormat>("hh:mm A");
  const [timeSeparator, setTimeSeparator] =
    useState<TimeSeparator>("colon");
  const [printType, setPrintType] = useState<"With Background" | "Without Background">("With Background");
  const [canvasPaperSize, setCanvasPaperSize] = useState<CanvasPaperSize>("A4");
  const [canvasOrientation, setCanvasOrientation] =
    useState<CanvasOrientation>("portrait");
  const [canvasImageFitMode, setCanvasImageFitMode] =
    useState<CanvasImageFitMode>("contain");

  const placedFieldIds = useMemo(
    () => new Set(points.map((point) => point.key)),
    [points],
  );

  const visibleFieldGroups = useMemo(
    () =>
      getVisibleFieldGroups({
        groups: HANDLEBAR_FIELD_GROUPS,
        hiddenGroupLabels,
        hiddenFieldKeys,
        placedFieldIds,
      }),
    [hiddenFieldKeys, hiddenGroupLabels, placedFieldIds],
  );

  const hiddenItemCount = hiddenGroupLabels.length + hiddenFieldKeys.length;

  const selectionOverlayArea = useMemo(() => {
    if (selectionDraft) {
      return normalizeSelectionArea(
        selectionDraft.startX,
        selectionDraft.startY,
        selectionDraft.endX,
        selectionDraft.endY,
      );
    }

    return selectedAutoAlignArea;
  }, [selectionDraft, selectedAutoAlignArea]);

  const visibleFieldIds = useMemo(
    () =>
      visibleFieldGroups.flatMap((group) =>
        group.fields.map((field) => field.id),
      ),
    [visibleFieldGroups],
  );

  const autoAlignCandidates = useMemo(() => visibleFieldIds, [visibleFieldIds]);

  const {
    canvasContainerStyle,
    canvasDimensions,
    canvasImageStyle,
    canvasToPrintScale,
  } = useCanvasPresentation({
    canvasPaperSize,
    canvasOrientation,
    canvasImageFitMode,
    filters,
    canvasViewportRef,
    imageContainerRef,
  });

  const includeImageInHtml = printType === "With Background";

  const htmlOutput = useMemo(
    () =>
      buildHandlebarsHtmlOutput({
        points,
        vitalsTableOrientation,
        includeImageInHtml,
        canvasDimensions,
        canvasImageFitMode,
        imageUrl,
        filters,
      }),
    [
      points,
      vitalsTableOrientation,
      includeImageInHtml,
      canvasDimensions,
      canvasImageFitMode,
      imageUrl,
      filters,
    ],
  );



  const getPointFontSize = (point: HandlebarPoint) => {
    const pointFieldMeta = HANDLEBAR_FIELDS_BY_ID.get(point.key);
    const baseFontSize = pointFieldMeta?.tablePreview ? 8 : 12;
    const scaledFontSize = baseFontSize * point.fontScale * canvasToPrintScale;

    return Number(scaledFontSize.toFixed(2));
  };

  const fieldSupportsKeyName = useCallback((fieldId: string) => {
    const fieldMeta = HANDLEBAR_FIELDS_BY_ID.get(fieldId);

    return fieldId !== CLINIC_LOGO_FIELD_ID && !fieldMeta?.tablePreview;
  }, []);

  const isFieldKeyNameVisible = useCallback(
    (fieldId: string) => {
      if (!fieldSupportsKeyName(fieldId)) {
        return false;
      }

      return fieldKeyNameVisibility[fieldId] ?? true;
    },
    [fieldKeyNameVisibility, fieldSupportsKeyName],
  );

  const remainingKeyNameFieldIds = useMemo(
    () => visibleFieldIds.filter((fieldId) => fieldSupportsKeyName(fieldId)),
    [fieldSupportsKeyName, visibleFieldIds],
  );

  const showKeyNames = useMemo(
    () =>
      remainingKeyNameFieldIds.length > 0 &&
      remainingKeyNameFieldIds.every((fieldId) =>
        isFieldKeyNameVisible(fieldId),
      ),
    [isFieldKeyNameVisible, remainingKeyNameFieldIds],
  );

  const shouldShowKeyNameForField = useCallback(
    (fieldId: string) => isFieldKeyNameVisible(fieldId),
    [isFieldKeyNameVisible],
  );

  const addHandlebarPoint = (field: string, x: number, y: number) => {
    const createdPointId = nextPointId;

    setPoints((currentPoints) => [
      ...currentPoints,
      {
        id: createdPointId,
        key: field,
        x,
        y,
        fontScale: syncedFontScale ?? 1,
        widthScale: syncedFontScale ?? 1,
        heightScale: syncedFontScale ?? 1,
        alignDirection: autoAlignDirection,
        showKeyName: shouldShowKeyNameForField(field),
      },
    ]);
    setActivePointId(createdPointId);
    setNextPointId((currentValue) => currentValue + 1);
  };

  const moveHandlebarPoint = (pointId: number, x: number, y: number) => {
    setPoints((currentPoints) =>
      currentPoints.map((point) =>
        point.id === pointId ? { ...point, x, y } : point,
      ),
    );
    setActivePointId(pointId);
  };

  const handleFieldDragStart = (
    event: DragEvent<HTMLButtonElement>,
    field: string,
  ) => {
    if (isSelectingAutoAlignArea) {
      event.preventDefault();

      return;
    }
    event.dataTransfer.setData(FIELD_DRAG_DATA_KEY, field);
    event.dataTransfer.setData("text/plain", field);
    event.dataTransfer.effectAllowed = "copy";
    setDraggedField(field);
    dragAnchorOffsetRef.current = null;
  };

  const handleFieldDragEnd = () => {
    setDraggedField(null);
    setIsDragOverImage(false);
  };

  const handlePointDragStart = (
    event: DragEvent<HTMLButtonElement>,
    pointId: number,
  ) => {
    if (isSelectingAutoAlignArea) {
      event.preventDefault();

      return;
    }
    event.dataTransfer.setData(POINT_DRAG_DATA_KEY, String(pointId));
    event.dataTransfer.setData("text/plain", `point:${pointId}`);
    event.dataTransfer.effectAllowed = "move";
    setDraggingPointId(pointId);
    setDraggedField(null);

    const container = imageContainerRef.current;
    const draggedPoint = points.find((point) => point.id === pointId);

    if (!container || !draggedPoint) {
      dragAnchorOffsetRef.current = null;

      return;
    }

    const bounds = container.getBoundingClientRect();
    const containerWidth = container.clientWidth || bounds.width;
    const containerHeight = container.clientHeight || bounds.height;

    if (containerWidth <= 0 || containerHeight <= 0) {
      dragAnchorOffsetRef.current = null;

      return;
    }

    const contentLeft = bounds.left + container.clientLeft;
    const contentTop = bounds.top + container.clientTop;
    const cursorPercentX =
      ((event.clientX - contentLeft) / containerWidth) * 100;
    const cursorPercentY =
      ((event.clientY - contentTop) / containerHeight) * 100;

    dragAnchorOffsetRef.current = {
      xPercent: cursorPercentX - draggedPoint.x,
      yPercent: cursorPercentY - draggedPoint.y,
    };
  };

  const handlePointDragEnd = () => {
    setDraggingPointId(null);
    setIsDragOverImage(false);
    dragAnchorOffsetRef.current = null;
  };

  const handleImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isSelectingAutoAlignArea) return;
    event.preventDefault();
    if (
      !isClientPointOverImage(
        imageContainerRef.current,
        canvasImageFitMode,
        event.clientX,
        event.clientY,
      )
    ) {
      event.dataTransfer.dropEffect = "none";
      setIsDragOverImage(false);

      return;
    }
    const dropTypes = Array.from(event.dataTransfer.types);
    const isPointDrag =
      dropTypes.includes(POINT_DRAG_DATA_KEY) || draggingPointId !== null;

    event.dataTransfer.dropEffect = isPointDrag ? "move" : "copy";
    setIsDragOverImage(true);
  };

  const handleImageDragLeave = () => {
    if (isSelectingAutoAlignArea) return;
    setIsDragOverImage(false);
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isSelectingAutoAlignArea) return;
    setIsDragOverImage(false);
    if (
      !isClientPointOverImage(
        imageContainerRef.current,
        canvasImageFitMode,
        event.clientX,
        event.clientY,
      )
    )
      return;
    const dropPosition = getPercentPositionFromClient(
      imageContainerRef.current,
      event.clientX,
      event.clientY,
    );

    if (!dropPosition) return;

    const droppedPointData =
      event.dataTransfer.getData(POINT_DRAG_DATA_KEY) ||
      (() => {
        const plainText = event.dataTransfer.getData("text/plain");

        if (plainText.startsWith("point:")) {
          return plainText.replace("point:", "");
        }

        return "";
      })();

    const droppedPointId = Number(droppedPointData || draggingPointId);

    if (
      Number.isInteger(droppedPointId) &&
      points.some((point) => point.id === droppedPointId)
    ) {
      const dragAnchorOffset = dragAnchorOffsetRef.current;
      const adjustedX = clampPercent(
        dropPosition.x - (dragAnchorOffset?.xPercent ?? 0),
      );
      const adjustedY = clampPercent(
        dropPosition.y - (dragAnchorOffset?.yPercent ?? 0),
      );

      moveHandlebarPoint(droppedPointId, adjustedX, adjustedY);
      setDraggingPointId(null);
      dragAnchorOffsetRef.current = null;

      return;
    }

    const droppedField =
      event.dataTransfer.getData(FIELD_DRAG_DATA_KEY) ||
      event.dataTransfer.getData("text/plain") ||
      draggedField;

    if (!droppedField || !HANDLEBAR_FIELDS.includes(droppedField as any))
      return;
    addHandlebarPoint(droppedField, dropPosition.x, dropPosition.y);
    setDraggedField(null);
    dragAnchorOffsetRef.current = null;
  };

  const getMousePercentPosition = (event: MouseEvent<HTMLDivElement>) => {
    return getPercentPositionFromClient(
      imageContainerRef.current,
      event.clientX,
      event.clientY,
    );
  };

  const handleSelectionMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!isSelectingAutoAlignArea) return;
    event.preventDefault();
    const mousePosition = getMousePercentPosition(event);

    if (!mousePosition) return;
    setSelectionStart(mousePosition);
    setSelectionDraft({
      startX: mousePosition.x,
      startY: mousePosition.y,
      endX: mousePosition.x,
      endY: mousePosition.y,
    });
  };

  const handleSelectionMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isSelectingAutoAlignArea || !selectionStart) return;
    const mousePosition = getMousePercentPosition(event);

    if (!mousePosition) return;
    setSelectionDraft({
      startX: selectionStart.x,
      startY: selectionStart.y,
      endX: mousePosition.x,
      endY: mousePosition.y,
    });
  };

  const cancelSelectionDrag = () => {
    setSelectionStart(null);
    setSelectionDraft(null);
  };

  const removePoint = (pointId: number) => {
    setPoints((currentPoints) =>
      currentPoints.filter((point) => point.id !== pointId),
    );
    setActivePointId((currentId) => (currentId === pointId ? null : currentId));
  };

  const nudgePointPosition = (
    pointId: number,
    deltaX: number,
    deltaY: number,
  ) => {
    setPoints((currentPoints) =>
      currentPoints.map((point) =>
        point.id === pointId
          ? {
              ...point,
              x: clampPercent(point.x + deltaX),
              y: clampPercent(point.y + deltaY),
            }
          : point,
      ),
    );
    setActivePointId(pointId);
  };

  const adjustPointFontScale = (pointId: number, delta: number) => {
    setPoints((currentPoints) =>
      currentPoints.map((point) =>
        point.id === pointId
          ? {
              ...point,
              ...(point.key === CLINIC_LOGO_FIELD_ID
                ? (() => {
                    const currentLogoScale =
                      (point.widthScale + point.heightScale) / 2;
                    const nextLogoScale = clampMarkerSizeScale(
                      Number((currentLogoScale + delta).toFixed(2)),
                    );

                    return {
                      fontScale: clampFontScale(nextLogoScale),
                      widthScale: nextLogoScale,
                      heightScale: nextLogoScale,
                    };
                  })()
                : {
                    fontScale: clampFontScale(
                      Number((point.fontScale + delta).toFixed(2)),
                    ),
                  }),
            }
          : point,
      ),
    );
    setActivePointId(pointId);
  };

  const adjustPointSizeScale = (
    pointId: number,
    widthDelta: number,
    heightDelta: number,
  ) => {
    setPoints((currentPoints) =>
      currentPoints.map((point) =>
        point.id === pointId
          ? {
              ...point,
              widthScale: clampMarkerSizeScale(
                Number((point.widthScale + widthDelta).toFixed(2)),
              ),
              heightScale: clampMarkerSizeScale(
                Number((point.heightScale + heightDelta).toFixed(2)),
              ),
            }
          : point,
      ),
    );
    setActivePointId(pointId);
  };

  const appendAutoAlignChatMessage = (
    role: AutoAlignChatMessage["role"],
    text: string,
  ) => {
    setAutoAlignChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: autoAlignChatMessageIdRef.current,
        role,
        text,
      },
    ]);
    autoAlignChatMessageIdRef.current += 1;
  };

  const clearPoints = () => {
    setPoints([]);
    setActivePointId(null);
    setPreAutoAlignState(null);
    setIsSelectingAutoAlignArea(false);
    setSelectedAutoAlignArea(null);
    setSelectionDraft(null);
    setSelectionStart(null);
    setSyncedFontScale(null);
    setLastAutoAlignSelectionArea(null);
    setLastAutoAlignedFieldKeys([]);
    setAutoAlignChatMessages([]);
    autoAlignChatMessageIdRef.current = 1;
  };

  const copyHtmlOutput = async () => {
    try {
      await navigator.clipboard.writeText(htmlOutput);
    } catch {
      onError("Could not copy HTML output to clipboard.");
    }
  };

  const autoAlignRemainingFields = async (
    selectionArea: NormalizedSelectionArea,
  ) => {
    if (isAutoAlignRunning) return;

    setIsAutoAlignRunning(true);

    try {
      const combinedNewPoints: HandlebarPoint[] = [];
      const placedFieldIds = new Set<string>();
      let nextGeneratedPointId = nextPointId;
      let nextGeneratedSyncedFontScale: number | null = null;

      if (isGeminiAutoAlignEnabled) {
        try {
          const geminiPoints = await runGeminiAutoAlignAgent({
            autoAlignCandidates,
            selectionArea,
            nextPointId: nextGeneratedPointId,
            existingPoints: points,
            autoAlignDirection,
            showKeyNames,
            shouldShowKeyNameForField,
            imageUrl,
            filters,
            requestGeminiAutoAlignContent,
          });

          if (geminiPoints && geminiPoints.length > 0) {
            combinedNewPoints.push(...geminiPoints);
            geminiPoints.forEach((point) => placedFieldIds.add(point.key));
            nextGeneratedPointId += geminiPoints.length;
          }
        } catch (error) {
          const geminiErrorMessage =
            error instanceof Error
              ? error.message
              : "Gemini auto align could not complete, so local smart auto align was used.";

          onError(geminiErrorMessage);
        }
      }

      const remainingCandidates = autoAlignCandidates.filter(
        (candidateFieldId) => !placedFieldIds.has(candidateFieldId),
      );

      if (remainingCandidates.length > 0) {
        const fallbackAutoAlignResult = computeAutoAlignedPoints({
          autoAlignCandidates: remainingCandidates,
          selectionArea,
          nextPointId: nextGeneratedPointId,
          syncedFontScale,
          autoAlignDirection,
          shouldShowKeyNameForField,
        });

        if (fallbackAutoAlignResult) {
          combinedNewPoints.push(...fallbackAutoAlignResult.newPoints);
          nextGeneratedPointId = fallbackAutoAlignResult.nextPointId;
          nextGeneratedSyncedFontScale =
            fallbackAutoAlignResult.nextSyncedFontScale;
        }
      }

      if (combinedNewPoints.length === 0) {
        onError("Auto align could not place remaining fields in this area.");
        appendAutoAlignChatMessage(
          "assistant",
          "I could not place fields in that selected area. Please choose a larger or different region.",
        );

        return;
      }

      if (nextGeneratedSyncedFontScale !== null) {
        setSyncedFontScale(nextGeneratedSyncedFontScale);
      }

      setPreAutoAlignState([...points]);
      setPoints((currentPoints) => [...currentPoints, ...combinedNewPoints]);
      setNextPointId(nextGeneratedPointId);
      setActivePointId(combinedNewPoints[combinedNewPoints.length - 1].id);
      setLastAutoAlignSelectionArea(selectionArea);
      setLastAutoAlignedFieldKeys(
        Array.from(new Set(combinedNewPoints.map((point) => point.key))),
      );
      appendAutoAlignChatMessage(
        "assistant",
        `Placed ${combinedNewPoints.length} fields. Share what is off and I will regenerate those positions.`,
      );
    } finally {
      setIsAutoAlignRunning(false);
    }
  };

  const submitAutoAlignFeedback = async (feedback: string) => {
    const trimmedFeedback = feedback.trim();

    if (!trimmedFeedback || isAutoAlignRunning || isAutoAlignFeedbackRunning) {
      return;
    }

    if (!isGeminiAutoAlignEnabled) {
      onError("Configure Gemini API key to use feedback-based re-alignment.");

      return;
    }

    if (!lastAutoAlignSelectionArea || lastAutoAlignedFieldKeys.length === 0) {
      onError("Run auto align once before sending feedback.");

      return;
    }

    appendAutoAlignChatMessage("user", trimmedFeedback);
    setIsAutoAlignFeedbackRunning(true);

    try {
      const feedbackFieldSet = new Set(lastAutoAlignedFieldKeys);
      const previousGeneratedPoints = points.filter((point) =>
        feedbackFieldSet.has(point.key),
      );

      if (previousGeneratedPoints.length === 0) {
        onError(
          "Previous auto-aligned fields were not found. Run auto align again first.",
        );
        appendAutoAlignChatMessage(
          "assistant",
          "I could not find a previous auto-align result to refine. Please run auto align first.",
        );

        return;
      }

      const staticPoints = points.filter(
        (point) => !feedbackFieldSet.has(point.key),
      );
      const feedbackCandidates = Array.from(
        new Set(previousGeneratedPoints.map((point) => point.key)),
      );
      let nextGeneratedPointId =
        staticPoints.reduce(
          (highestPointId, point) => Math.max(highestPointId, point.id),
          0,
        ) + 1;
      let nextGeneratedSyncedFontScale: number | null = null;
      let regeneratedPoints: HandlebarPoint[] = [];

      try {
        const geminiPoints = await runGeminiAutoAlignAgent({
          autoAlignCandidates: feedbackCandidates,
          selectionArea: lastAutoAlignSelectionArea,
          nextPointId: nextGeneratedPointId,
          existingPoints: staticPoints,
          autoAlignDirection,
          showKeyNames,
          shouldShowKeyNameForField,
          imageUrl,
          filters,
          requestGeminiAutoAlignContent,
          userFeedback: trimmedFeedback,
          previousGeneratedPoints,
        });

        if (geminiPoints && geminiPoints.length > 0) {
          regeneratedPoints = geminiPoints;
          nextGeneratedPointId += geminiPoints.length;
        }
      } catch (error) {
        const geminiErrorMessage =
          error instanceof Error
            ? error.message
            : "Gemini could not apply feedback, so local auto align was used.";

        onError(geminiErrorMessage);
      }

      if (regeneratedPoints.length === 0) {
        const fallbackAutoAlignResult = computeAutoAlignedPoints({
          autoAlignCandidates: feedbackCandidates,
          selectionArea: lastAutoAlignSelectionArea,
          nextPointId: nextGeneratedPointId,
          syncedFontScale,
          autoAlignDirection,
          shouldShowKeyNameForField,
        });

        if (fallbackAutoAlignResult) {
          regeneratedPoints = fallbackAutoAlignResult.newPoints;
          nextGeneratedPointId = fallbackAutoAlignResult.nextPointId;
          nextGeneratedSyncedFontScale =
            fallbackAutoAlignResult.nextSyncedFontScale;
        }
      }

      if (regeneratedPoints.length === 0) {
        onError("Could not regenerate field positions from this feedback.");
        appendAutoAlignChatMessage(
          "assistant",
          "I could not regenerate placements from that feedback. Please try a more specific instruction.",
        );

        return;
      }

      if (nextGeneratedSyncedFontScale !== null) {
        setSyncedFontScale(nextGeneratedSyncedFontScale);
      }

      setPreAutoAlignState([...points]);
      setPoints([...staticPoints, ...regeneratedPoints]);
      setNextPointId(nextGeneratedPointId);
      setActivePointId(regeneratedPoints[regeneratedPoints.length - 1].id);
      setLastAutoAlignedFieldKeys(
        Array.from(new Set(regeneratedPoints.map((point) => point.key))),
      );
      appendAutoAlignChatMessage(
        "assistant",
        `Updated ${regeneratedPoints.length} fields using your feedback.`,
      );
    } finally {
      setIsAutoAlignFeedbackRunning(false);
    }
  };

  const revertAutoAlign = () => {
    if (preAutoAlignState !== null) {
      setPoints(preAutoAlignState);
      setPreAutoAlignState(null);
      setActivePointId(null);
      setLastAutoAlignSelectionArea(null);
      setLastAutoAlignedFieldKeys([]);
      setAutoAlignChatMessages([]);
      autoAlignChatMessageIdRef.current = 1;
    }
  };

  const beginPrecisionSelectForAutoAlign = () => {
    if (autoAlignCandidates.length === 0 || isAutoAlignRunning) return;
    const nextMode = !isSelectingAutoAlignArea;

    setIsSelectingAutoAlignArea(nextMode);
    setSelectionStart(null);
    setSelectionDraft(null);
    if (nextMode) setSelectedAutoAlignArea(null);
  };

  const finalizeSelectionAndAutoAlign = async (endX: number, endY: number) => {
    if (!selectionStart) return;
    const normalizedArea = normalizeSelectionArea(
      selectionStart.x,
      selectionStart.y,
      endX,
      endY,
    );
    const areaWidth = normalizedArea.maxX - normalizedArea.minX;
    const areaHeight = normalizedArea.maxY - normalizedArea.minY;

    if (areaWidth < 2 || areaHeight < 2) {
      onError("Please drag to select a larger area before running auto align.");
      cancelSelectionDrag();

      return;
    }

    setSelectedAutoAlignArea(normalizedArea);
    setIsSelectingAutoAlignArea(false);
    cancelSelectionDrag();
    try {
      await autoAlignRemainingFields(normalizedArea);
    } finally {
      setSelectedAutoAlignArea(null);
    }
  };

  const handleSelectionMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    if (!isSelectingAutoAlignArea || !selectionStart) return;
    const mousePosition = getMousePercentPosition(event);

    if (!mousePosition) return;
    void finalizeSelectionAndAutoAlign(mousePosition.x, mousePosition.y);
  };

  const handleSelectionMouseLeave = () => {
    if (!isSelectingAutoAlignArea) return;
    cancelSelectionDrag();
  };

  const hideGroup = (groupLabel: string) => {
    setHiddenGroupLabels((currentLabels) => {
      if (currentLabels.includes(groupLabel)) return currentLabels;

      return [...currentLabels, groupLabel];
    });

    if (draggedField) {
      const matchingGroup = HANDLEBAR_FIELD_GROUPS.find(
        (group) => group.label === groupLabel,
      );

      if (matchingGroup?.fields.some((field) => field.id === draggedField)) {
        setDraggedField(null);
      }
    }
  };

  const hideField = (fieldKey: string) => {
    setHiddenFieldKeys((currentFieldKeys) => {
      if (currentFieldKeys.includes(fieldKey)) return currentFieldKeys;

      return [...currentFieldKeys, fieldKey];
    });

    if (draggedField === fieldKey) {
      setDraggedField(null);
    }
  };

  const unhideGroup = (groupLabel: string) => {
    setHiddenGroupLabels((currentLabels) =>
      currentLabels.filter((label) => label !== groupLabel),
    );
  };

  const unhideField = (fieldKey: string) => {
    setHiddenFieldKeys((currentFieldKeys) =>
      currentFieldKeys.filter((key) => key !== fieldKey),
    );
  };

  const toggleFieldKeyNameVisibility = (fieldId: string) => {
    if (!fieldSupportsKeyName(fieldId)) {
      return;
    }

    const nextFieldKeyNameVisibility = !isFieldKeyNameVisible(fieldId);

    setFieldKeyNameVisibility((currentVisibility) => ({
      ...currentVisibility,
      [fieldId]: nextFieldKeyNameVisibility,
    }));
    setPoints((currentPoints) =>
      currentPoints.map((point) =>
        point.key === fieldId
          ? {
              ...point,
              showKeyName: fieldSupportsKeyName(point.key)
                ? nextFieldKeyNameVisibility
                : false,
            }
          : point,
      ),
    );
  };

  const cancelSelectionMode = () => {
    setIsSelectingAutoAlignArea(false);
    cancelSelectionDrag();
  };

  const toggleActivePointKeyName = (pointId: number) => {
    const targetPoint = points.find((point) => point.id === pointId);

    if (!targetPoint || !fieldSupportsKeyName(targetPoint.key)) {
      return;
    }

    toggleFieldKeyNameVisibility(targetPoint.key);
  };

  const handleCanvasKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    handleCanvasKeyboard({
      event,
      activePointId,
      isSelectingAutoAlignArea,
      cancelSelectionMode,
      toggleActivePointKeyName,
      removePoint,
      adjustPointSizeScale,
      nudgePointPosition,
      adjustPointFontScale,
    });
  };

  const activePointAlignDirection =
    points.find((point) => point.id === activePointId)?.alignDirection ??
    "left-to-right";
  const activePoint =
    points.find((point) => point.id === activePointId) ?? null;
  const activePointFontSize = activePoint
    ? Math.round(getPointFontSize(activePoint))
    : null;

  const setActivePointAlignDirection = (direction: AutoAlignDirection) => {
    if (activePointId === null) return;

    setPoints((currentPoints) =>
      currentPoints.map((point) =>
        point.id === activePointId
          ? { ...point, alignDirection: direction }
          : point,
      ),
    );
  };

  const setActivePointFontSize = (fontSize: number) => {
    if (activePointId === null) return;

    const targetFontSize = Math.max(6, Math.min(72, fontSize));

    setPoints((currentPoints) =>
      currentPoints.map((point) => {
        if (point.id !== activePointId) return point;

        const pointFieldMeta = HANDLEBAR_FIELDS_BY_ID.get(point.key);
        const baseFontSize = pointFieldMeta?.tablePreview ? 8 : 12;
        const nextScale = clampFontScale(
          Number((targetFontSize / (baseFontSize * canvasToPrintScale)).toFixed(2)),
        );

        return {
          ...point,
          fontScale: nextScale,
        };
      }),
    );
  };

  const increaseActivePointFontSize = () => {
    if (activePointFontSize === null) return;
    setActivePointFontSize(activePointFontSize + 1);
  };

  const decreaseActivePointFontSize = () => {
    if (activePointFontSize === null) return;
    setActivePointFontSize(activePointFontSize - 1);
  };

  return {
    activePointId,
    activePointFontSize,
    activePointAlignDirection,
    adjustPointFontScale,
    autoAlignCandidates,
    autoAlignChatMessages,
    autoAlignDirection,
    beginPrecisionSelectForAutoAlign,
    canSubmitAutoAlignFeedback:
      isGeminiAutoAlignEnabled &&
      lastAutoAlignSelectionArea !== null &&
      lastAutoAlignedFieldKeys.length > 0,
    isAutoAlignRunning,
    isAutoAlignFeedbackRunning,
    isGeminiAutoAlignEnabled,
    revertAutoAlign,
    isAutoAlignRevertable: preAutoAlignState !== null,
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
    htmlOutput,
    imageContainerRef,
    includeImageInHtml,
    printType,
    isDragOverImage,
    isFieldKeyNameVisible,
    isSelectingAutoAlignArea,
    matchFontSizeToAll: () => {
      const activePoint = points.find((p) => p.id === activePointId);

      if (!activePoint) return;

      const syncedScale = activePoint.fontScale;

      setSyncedFontScale(syncedScale);

      setPoints((currentPoints) =>
        currentPoints.map((point) => ({
          ...point,
          fontScale: syncedScale,
          widthScale: syncedScale,
          heightScale: syncedScale,
        })),
      );
    },
    points,
    removePoint,
    selectionOverlayArea,
    setActivePointAlignDirection,
    setActivePointFontSize,
    increaseActivePointFontSize,
    decreaseActivePointFontSize,
    setActivePointId,
    setAutoAlignDirection,
    setCanvasImageFitMode,
    setCanvasOrientation,
    setCanvasPaperSize,
    setDateFormat,
    setDateSeparator,
    setPrintType,
    setShowHiddenList,
    setTimeFormat,
    setTimeSeparator,
    setVitalsTableOrientation,
    showHiddenList,
    showKeyNames,
    submitAutoAlignFeedback,
    timeFormat,
    timeSeparator,
    toggleShowKeyNames: () => {
      if (remainingKeyNameFieldIds.length === 0) {
        return;
      }

      const nextVisibility = !showKeyNames;

      setFieldKeyNameVisibility((currentVisibility) => {
        const nextFieldKeyNameVisibility = { ...currentVisibility };

        remainingKeyNameFieldIds.forEach((fieldId) => {
          nextFieldKeyNameVisibility[fieldId] = nextVisibility;
        });

        return nextFieldKeyNameVisibility;
      });
    },
    toggleFieldKeyNameVisibility,
    unhideField,
    unhideGroup,
    visibleFieldGroups,
    vitalsTableOrientation,
  };
};
