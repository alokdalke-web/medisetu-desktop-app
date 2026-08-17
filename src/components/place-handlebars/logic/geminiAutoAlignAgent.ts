import {
  AutoAlignDirection,
  HandlebarPoint,
  NormalizedSelectionArea,
} from "../types";
import {
  ARRAY_FIELD_IDS,
  HANDLEBAR_FIELDS_BY_ID,
  IDEAL_FIELD_POSITIONS,
  VITALS_TABLE_ID,
} from "../constants";
import {
  clampFontScale,
  clampMarkerSizeScale,
  clampPercent,
  formatDummyValueForDisplay,
} from "../utils";

type GeminiAutoAlignAgentOptions = {
  autoAlignCandidates: string[];
  selectionArea: NormalizedSelectionArea;
  nextPointId: number;
  existingPoints: HandlebarPoint[];
  autoAlignDirection: AutoAlignDirection;
  showKeyNames: boolean;
  shouldShowKeyNameForField: (fieldId: string) => boolean;
  imageUrl: string;
  filters: string;
  requestGeminiAutoAlignContent: (
    requestParts: GeminiRequestPart[],
  ) => Promise<string>;
  userFeedback?: string;
  previousGeneratedPoints?: HandlebarPoint[];
};

type GeminiPlacement = {
  fieldId: string;
  x: number;
  y: number;
  fontScale?: number;
  widthScale?: number;
  heightScale?: number;
  alignDirection?: AutoAlignDirection;
  showKeyName?: boolean;
};

type GeminiAlignJson = {
  placements?: GeminiPlacement[];
  result?: {
    placements?: GeminiPlacement[];
  };
};

type GeminiSdkError = {
  status?: number;
  message?: string;
};

export type GeminiRequestPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type EdgeAlignDirection = "left-to-right" | "right-to-left";

const clampToRange = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  const sdkError = error as GeminiSdkError;

  if (typeof sdkError?.message === "string" && sdkError.message.trim()) {
    return sdkError.message;
  }

  return fallbackMessage;
};

const parseGeminiJson = (rawText: string): GeminiAlignJson | null => {
  const normalized = rawText.trim();

  if (!normalized) return null;

  const withoutFence = normalized
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const candidates = [withoutFence];
  const firstBraceIndex = withoutFence.indexOf("{");
  const lastBraceIndex = withoutFence.lastIndexOf("}");

  if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
    candidates.push(withoutFence.slice(firstBraceIndex, lastBraceIndex + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as GeminiAlignJson;

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Try the next parser candidate.
    }
  }

  return null;
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onloadend = () => {
      const result = fileReader.result;

      if (typeof result !== "string") {
        reject(new Error("Failed to read image data."));

        return;
      }

      const base64Data = result.split(",")[1];

      if (!base64Data) {
        reject(new Error("Could not convert image to base64."));

        return;
      }

      resolve(base64Data);
    };

    fileReader.onerror = () => reject(fileReader.error);
    fileReader.readAsDataURL(blob);
  });

const getImageInlinePart = async (imageUrl: string) => {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return null;
    }

    const imageBlob = await response.blob();

    if (!imageBlob.type.startsWith("image/")) {
      return null;
    }

    const imageData = await blobToBase64(imageBlob);

    return {
      mimeType: imageBlob.type || "image/png",
      data: imageData,
    };
  } catch {
    return null;
  }
};

const getDefaultScales = (fieldId: string) => {
  const idealPosition = IDEAL_FIELD_POSITIONS[fieldId as string];
  const isTable =
    fieldId === VITALS_TABLE_ID || fieldId === "prescriptions.table";
  const isArrayField = ARRAY_FIELD_IDS.has(fieldId) || fieldId.includes("[");

  return {
    fontScale: idealPosition?.fontScale ?? (isTable ? 1 : 1),
    widthScale:
      idealPosition?.widthScale ?? (isTable ? 0.95 : isArrayField ? 1.15 : 1),
    heightScale: idealPosition?.heightScale ?? 1,
    alignDirection: (idealPosition
      ? "center"
      : isTable
        ? "center"
        : "left-to-right") as AutoAlignDirection,
  };
};

const mapIdealCoordinateToSelection = (
  normalizedIdealPercent: number,
  minPercent: number,
  maxPercent: number,
) => {
  const range = Math.max(0, maxPercent - minPercent);

  return minPercent + (normalizedIdealPercent / 100) * range;
};

const blendTowardPreferred = (
  modelValue: number,
  preferredValue: number | null,
  preferredWeight = 0.35,
) => {
  if (preferredValue === null) {
    return modelValue;
  }

  const boundedWeight = clampToRange(preferredWeight, 0, 1);

  return modelValue * (1 - boundedWeight) + preferredValue * boundedWeight;
};

const getIdealAnchorWeight = () => {
  const fromEnv = Number(import.meta.env.VITE_GEMINI_IDEAL_WEIGHT ?? "");

  if (Number.isFinite(fromEnv)) {
    return clampToRange(fromEnv, 0.05, 0.8);
  }

  return 0.35;
};

const resolveStrictEdgeDirection = (
  xPercent: number,
  selectionArea: NormalizedSelectionArea,
  autoAlignDirection: AutoAlignDirection,
  suggestedDirection: AutoAlignDirection | null,
): EdgeAlignDirection => {
  if (suggestedDirection === "left-to-right") {
    return "left-to-right";
  }

  if (suggestedDirection === "right-to-left") {
    return "right-to-left";
  }

  if (autoAlignDirection === "left-to-right") {
    return "left-to-right";
  }

  if (autoAlignDirection === "right-to-left") {
    return "right-to-left";
  }

  const midX = (selectionArea.minX + selectionArea.maxX) / 2;

  return xPercent <= midX ? "left-to-right" : "right-to-left";
};

type ShowKeyNameDecisionOptions = {
  defaultShowKeyName: boolean;
  suggestedShowKeyName: boolean | null;
  isTable: boolean;
  fieldId: string;
  alias: string;
  resolvedX: number;
  resolvedY: number;
  resolvedFontScale: number;
  resolvedWidthScale: number;
  selectionArea: NormalizedSelectionArea;
  contextPoints: HandlebarPoint[];
};

const decideShowKeyName = ({
  defaultShowKeyName,
  suggestedShowKeyName,
  isTable,
  fieldId,
  alias,
  resolvedX,
  resolvedY,
  resolvedFontScale,
  resolvedWidthScale,
  selectionArea,
  contextPoints,
}: ShowKeyNameDecisionOptions) => {
  if (!defaultShowKeyName || isTable) {
    return false;
  }

  if (suggestedShowKeyName !== null) {
    return suggestedShowKeyName;
  }

  const isArrayField = ARRAY_FIELD_IDS.has(fieldId) || fieldId.includes("[");
  const isLongLabel = alias.length > 18;
  const isSmallText = resolvedFontScale <= 0.9;
  const isTightWidth = resolvedWidthScale <= 1;
  const nearCanvasEdge =
    resolvedX <= selectionArea.minX + 8 || resolvedX >= selectionArea.maxX - 8;

  const nearbyPlacedPoints = contextPoints.filter(
    (point) =>
      Math.abs(point.x - resolvedX) <= 10 && Math.abs(point.y - resolvedY) <= 4,
  ).length;
  const denseNeighborhood = nearbyPlacedPoints >= 2;

  if (
    isArrayField ||
    isLongLabel ||
    isSmallText ||
    isTightWidth ||
    nearCanvasEdge ||
    denseNeighborhood
  ) {
    return false;
  }

  return true;
};

type MarkerBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type MarkerSize = {
  width: number;
  height: number;
};

type MarkerSizeOptions = {
  fieldId: string;
  alias: string;
  sampleValue: string;
  isTable: boolean;
  widthScale: number;
  heightScale: number;
  fontScale: number;
  showKeyName: boolean;
  selectionArea: NormalizedSelectionArea;
};

type OverlapNudgeOptions = {
  x: number;
  y: number;
  selectionArea: NormalizedSelectionArea;
  occupiedPoints: HandlebarPoint[];
  fieldId: string;
  alias: string;
  sampleValue: string;
  isTable: boolean;
  widthScale: number;
  heightScale: number;
  fontScale: number;
  showKeyName: boolean;
  alignDirection: AutoAlignDirection;
};

const estimateMarkerSizePercent = ({
  fieldId,
  alias,
  sampleValue,
  isTable,
  widthScale,
  heightScale,
  fontScale,
  showKeyName,
  selectionArea,
}: MarkerSizeOptions): MarkerSize => {
  const selectionWidth = Math.max(8, selectionArea.maxX - selectionArea.minX);
  const selectionHeight = Math.max(6, selectionArea.maxY - selectionArea.minY);

  if (isTable) {
    const tableWidth = clampToRange(
      selectionWidth * clampToRange(widthScale, 0.85, 1.1),
      Math.min(26, selectionWidth * 0.6),
      selectionWidth * 0.95,
    );
    const tableHeight = clampToRange(
      selectionHeight * 0.22 * clampToRange(heightScale, 0.85, 1.1),
      Math.min(8, selectionHeight * 0.16),
      selectionHeight * 0.45,
    );

    return {
      width: tableWidth,
      height: tableHeight,
    };
  }

  const estimatedTextLength = Math.max(
    6,
    alias.length + sampleValue.length * 0.55 + (showKeyName ? 3 : 0),
  );
  const isArrayField = ARRAY_FIELD_IDS.has(fieldId) || fieldId.includes("[");
  const baseWidth = estimatedTextLength * 0.28;
  const width = clampToRange(
    baseWidth * widthScale * Math.max(0.9, fontScale),
    6,
    Math.min(selectionWidth * 0.58, isArrayField ? 26 : 20),
  );
  const height = clampToRange(
    2.2 * heightScale * Math.max(0.9, fontScale),
    2,
    Math.min(selectionHeight * 0.24, 6),
  );

  return {
    width,
    height,
  };
};

const getMarkerBounds = (
  x: number,
  y: number,
  size: MarkerSize,
  alignDirection: AutoAlignDirection,
): MarkerBounds => {
  if (alignDirection === "right-to-left") {
    return {
      left: x - size.width,
      right: x,
      top: y - size.height / 2,
      bottom: y + size.height / 2,
    };
  }

  if (alignDirection === "center") {
    return {
      left: x - size.width / 2,
      right: x + size.width / 2,
      top: y - size.height / 2,
      bottom: y + size.height / 2,
    };
  }

  return {
    left: x,
    right: x + size.width,
    top: y - size.height / 2,
    bottom: y + size.height / 2,
  };
};

const clampPointInsideSelection = (
  x: number,
  y: number,
  size: MarkerSize,
  alignDirection: AutoAlignDirection,
  selectionArea: NormalizedSelectionArea,
) => {
  const minY = selectionArea.minY + size.height / 2;
  const maxY = selectionArea.maxY - size.height / 2;
  const clampedY = clampPercent(clampToRange(y, minY, maxY));

  if (alignDirection === "right-to-left") {
    const minX = selectionArea.minX + size.width;
    const maxX = selectionArea.maxX;

    return {
      x: clampPercent(clampToRange(x, minX, maxX)),
      y: clampedY,
    };
  }

  if (alignDirection === "center") {
    const minX = selectionArea.minX + size.width / 2;
    const maxX = selectionArea.maxX - size.width / 2;

    return {
      x: clampPercent(clampToRange(x, minX, maxX)),
      y: clampedY,
    };
  }

  const minX = selectionArea.minX;
  const maxX = selectionArea.maxX - size.width;

  return {
    x: clampPercent(clampToRange(x, minX, maxX)),
    y: clampedY,
  };
};

const getOverlapArea = (a: MarkerBounds, b: MarkerBounds) => {
  const overlapX = Math.max(
    0,
    Math.min(a.right, b.right) - Math.max(a.left, b.left),
  );
  const overlapY = Math.max(
    0,
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  );

  return overlapX * overlapY;
};

const nudgeAwayFromOverlaps = ({
  x,
  y,
  selectionArea,
  occupiedPoints,
  fieldId,
  alias,
  sampleValue,
  isTable,
  widthScale,
  heightScale,
  fontScale,
  showKeyName,
  alignDirection,
}: OverlapNudgeOptions) => {
  const markerSize = estimateMarkerSizePercent({
    fieldId,
    alias,
    sampleValue,
    isTable,
    widthScale,
    heightScale,
    fontScale,
    showKeyName,
    selectionArea,
  });
  const occupiedBounds = occupiedPoints.map((point) => {
    const pointFieldMeta = HANDLEBAR_FIELDS_BY_ID.get(point.key);
    const pointIsTable =
      point.key === VITALS_TABLE_ID || point.key === "prescriptions.table";
    const pointAlignDirection = pointIsTable
      ? "center"
      : point.alignDirection === "right-to-left"
        ? "right-to-left"
        : point.alignDirection === "center"
          ? "center"
          : "left-to-right";
    const pointSize = estimateMarkerSizePercent({
      fieldId: point.key,
      alias: pointFieldMeta?.alias ?? point.key,
      sampleValue: pointFieldMeta
        ? formatDummyValueForDisplay(pointFieldMeta.dummyValue)
        : "",
      isTable: pointIsTable,
      widthScale: point.widthScale,
      heightScale: point.heightScale,
      fontScale: point.fontScale,
      showKeyName: Boolean(point.showKeyName),
      selectionArea,
    });
    const clampedPoint = clampPointInsideSelection(
      point.x,
      point.y,
      pointSize,
      pointAlignDirection,
      selectionArea,
    );

    return getMarkerBounds(
      clampedPoint.x,
      clampedPoint.y,
      pointSize,
      pointAlignDirection,
    );
  });

  const xOffsets = [0, 2, -2, 4, -4, 6, -6, 8, -8, 10, -10, 12, -12];
  const yOffsets = [0, 0.9, -0.9, 1.8, -1.8, 2.7, -2.7, 3.6, -3.6];

  let best = clampPointInsideSelection(
    x,
    y,
    markerSize,
    alignDirection,
    selectionArea,
  );
  let bestScore = Number.POSITIVE_INFINITY;

  for (const yOffset of yOffsets) {
    for (const xOffset of xOffsets) {
      const candidatePoint = clampPointInsideSelection(
        x + xOffset,
        y + yOffset,
        markerSize,
        alignDirection,
        selectionArea,
      );
      const candidateBounds = getMarkerBounds(
        candidatePoint.x,
        candidatePoint.y,
        markerSize,
        alignDirection,
      );
      const overlapScore = occupiedBounds.reduce(
        (sum, occupied) => sum + getOverlapArea(candidateBounds, occupied),
        0,
      );
      const movementPenalty =
        Math.abs(xOffset) * 0.03 + Math.abs(yOffset) * 0.05;
      const score = overlapScore + movementPenalty;

      if (score < bestScore) {
        best = candidatePoint;
        bestScore = score;
      }

      if (overlapScore <= 0.001) {
        return {
          adjustedX: candidatePoint.x,
          adjustedY: candidatePoint.y,
        };
      }
    }
  }

  return {
    adjustedX: best.x,
    adjustedY: best.y,
  };
};

const toValidatedPoints = (
  placements: GeminiPlacement[],
  options: GeminiAutoAlignAgentOptions,
): HandlebarPoint[] => {
  const {
    autoAlignCandidates,
    selectionArea,
    nextPointId,
    existingPoints,
    autoAlignDirection,
    shouldShowKeyNameForField,
  } = options;

  const allowedFields = new Set(autoAlignCandidates);
  const placementByField = new Map<string, GeminiPlacement>();

  for (const placement of placements) {
    if (!placement || typeof placement !== "object") continue;

    const fieldId = placement.fieldId;

    if (typeof fieldId !== "string") continue;
    if (!allowedFields.has(fieldId)) continue;
    if (placementByField.has(fieldId)) continue;

    placementByField.set(fieldId, placement);
  }

  const points: HandlebarPoint[] = [];
  const idealAnchorWeight = getIdealAnchorWeight();

  for (const fieldId of autoAlignCandidates) {
    const placement = placementByField.get(fieldId);

    if (!placement) continue;

    const fieldMeta = HANDLEBAR_FIELDS_BY_ID.get(fieldId);
    const fieldAlias = fieldMeta?.alias ?? fieldId;
    const fieldSampleValue = fieldMeta
      ? formatDummyValueForDisplay(fieldMeta.dummyValue)
      : "";
    const defaultScales = getDefaultScales(fieldId);
    const idealPosition = IDEAL_FIELD_POSITIONS[fieldId as string];
    const isTable =
      fieldId === VITALS_TABLE_ID || fieldId === "prescriptions.table";

    const rawX = Number(placement.x);
    const rawY = Number(placement.y);

    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) continue;

    const clampedX = clampPercent(
      clampToRange(rawX, selectionArea.minX, selectionArea.maxX),
    );
    const clampedY = clampPercent(
      clampToRange(rawY, selectionArea.minY, selectionArea.maxY),
    );

    const mappedIdealX = idealPosition
      ? clampPercent(
          mapIdealCoordinateToSelection(
            idealPosition.x,
            selectionArea.minX,
            selectionArea.maxX,
          ),
        )
      : null;
    const mappedIdealY = idealPosition
      ? clampPercent(
          mapIdealCoordinateToSelection(
            idealPosition.y,
            selectionArea.minY,
            selectionArea.maxY,
          ),
        )
      : null;

    const rawFontScale = Number(placement.fontScale);
    const rawWidthScale = Number(placement.widthScale);
    const rawHeightScale = Number(placement.heightScale);
    const suggestedShowKeyName =
      typeof placement.showKeyName === "boolean" ? placement.showKeyName : null;

    const minReadableFontScale = isTable ? 1 : 0.95;
    const minReadableWidthScale = isTable ? 0.95 : 0.95;
    const maxReadableWidthScale = isTable
      ? 1.1
      : ARRAY_FIELD_IDS.has(fieldId) || fieldId.includes("[")
        ? 1.2
        : 1.12;
    const minReadableHeightScale = isTable ? 1 : 1;

    const baseModelFontScale = Number.isFinite(rawFontScale)
      ? rawFontScale
      : Number(defaultScales.fontScale.toFixed(2));
    const baseModelWidthScale = Number.isFinite(rawWidthScale)
      ? rawWidthScale
      : Number(defaultScales.widthScale.toFixed(2));
    const baseModelHeightScale = Number.isFinite(rawHeightScale)
      ? rawHeightScale
      : Number(defaultScales.heightScale.toFixed(2));

    const preferredFontScale = idealPosition
      ? Number(idealPosition.fontScale.toFixed(2))
      : null;
    const preferredWidthScale = idealPosition
      ? Number(idealPosition.widthScale.toFixed(2))
      : null;
    const preferredHeightScale = idealPosition
      ? Number(idealPosition.heightScale.toFixed(2))
      : null;

    const resolvedFontScale = clampFontScale(
      Math.max(
        minReadableFontScale,
        blendTowardPreferred(baseModelFontScale, preferredFontScale, 0.3),
      ),
    );
    const resolvedWidthScale = clampMarkerSizeScale(
      clampToRange(
        Math.max(
          minReadableWidthScale,
          blendTowardPreferred(baseModelWidthScale, preferredWidthScale, 0.3),
        ),
        minReadableWidthScale,
        maxReadableWidthScale,
      ),
    );
    const resolvedHeightScale = clampMarkerSizeScale(
      Math.max(
        minReadableHeightScale,
        blendTowardPreferred(baseModelHeightScale, preferredHeightScale, 0.3),
      ),
    );

    const modelAlignDirection =
      placement.alignDirection === "left-to-right" ||
      placement.alignDirection === "center" ||
      placement.alignDirection === "right-to-left"
        ? placement.alignDirection
        : null;

    let resolvedX = clampPercent(
      blendTowardPreferred(clampedX, mappedIdealX, idealAnchorWeight),
    );
    let resolvedY = clampPercent(
      blendTowardPreferred(
        clampedY,
        mappedIdealY,
        clampToRange(idealAnchorWeight + 0.08, 0.08, 0.85),
      ),
    );

    let resolvedAlignDirection: AutoAlignDirection = isTable
      ? "center"
      : resolveStrictEdgeDirection(
          resolvedX,
          selectionArea,
          autoAlignDirection,
          modelAlignDirection,
        );

    const overlapAdjusted = nudgeAwayFromOverlaps({
      x: resolvedX,
      y: resolvedY,
      selectionArea,
      occupiedPoints: [...existingPoints, ...points],
      fieldId,
      alias: fieldAlias,
      sampleValue: fieldSampleValue,
      isTable,
      widthScale: resolvedWidthScale,
      heightScale: resolvedHeightScale,
      fontScale: resolvedFontScale,
      showKeyName: shouldShowKeyNameForField(fieldId),
      alignDirection: resolvedAlignDirection,
    });

    resolvedX = overlapAdjusted.adjustedX;
    resolvedY = overlapAdjusted.adjustedY;

    if (!isTable) {
      resolvedAlignDirection = resolveStrictEdgeDirection(
        resolvedX,
        selectionArea,
        autoAlignDirection,
        modelAlignDirection,
      );
    }

    const resolvedShowKeyName = decideShowKeyName({
      defaultShowKeyName: shouldShowKeyNameForField(fieldId),
      suggestedShowKeyName,
      isTable,
      fieldId,
      alias: fieldAlias,
      resolvedX,
      resolvedY,
      resolvedFontScale,
      resolvedWidthScale,
      selectionArea,
      contextPoints: [...existingPoints, ...points],
    });

    points.push({
      id: nextPointId + points.length,
      key: fieldId,
      x: resolvedX,
      y: resolvedY,
      fontScale: Number(resolvedFontScale.toFixed(2)),
      widthScale: Number(resolvedWidthScale.toFixed(2)),
      heightScale: Number(resolvedHeightScale.toFixed(2)),
      alignDirection: isTable ? "center" : resolvedAlignDirection,
      showKeyName: resolvedShowKeyName,
    });
  }

  return points;
};

export const runGeminiAutoAlignAgent = async (
  options: GeminiAutoAlignAgentOptions,
): Promise<HandlebarPoint[] | null> => {
  const {
    autoAlignCandidates,
    selectionArea,
    existingPoints,
    autoAlignDirection,
    showKeyNames,
    shouldShowKeyNameForField,
    imageUrl,
    filters,
    requestGeminiAutoAlignContent,
    userFeedback,
    previousGeneratedPoints,
  } = options;

  const candidateFields = autoAlignCandidates.map((fieldId) => {
    const fieldMeta = HANDLEBAR_FIELDS_BY_ID.get(fieldId);
    const idealPosition = IDEAL_FIELD_POSITIONS[fieldId as string];

    return {
      fieldId,
      alias: fieldMeta?.alias ?? fieldId,
      sampleValue: fieldMeta
        ? formatDummyValueForDisplay(fieldMeta.dummyValue)
        : "",
      tableField: Boolean(fieldMeta?.tablePreview),
      defaultShowKeyName: shouldShowKeyNameForField(fieldId),
      ideal: idealPosition
        ? {
            x: idealPosition.x,
            y: idealPosition.y,
            fontScale: idealPosition.fontScale,
            widthScale: idealPosition.widthScale,
            heightScale: idealPosition.heightScale,
          }
        : null,
    };
  });

  const existingPointSummaries = existingPoints.map((point) => ({
    fieldId: point.key,
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2)),
    widthScale: Number(point.widthScale.toFixed(2)),
    heightScale: Number(point.heightScale.toFixed(2)),
    fontScale: Number(point.fontScale.toFixed(2)),
  }));

  const previousGenerationSummaries = (previousGeneratedPoints ?? []).map(
    (point) => ({
      fieldId: point.key,
      x: Number(point.x.toFixed(2)),
      y: Number(point.y.toFixed(2)),
      widthScale: Number(point.widthScale.toFixed(2)),
      heightScale: Number(point.heightScale.toFixed(2)),
      fontScale: Number(point.fontScale.toFixed(2)),
      alignDirection: point.alignDirection ?? "left-to-right",
      showKeyName: Boolean(point.showKeyName),
    }),
  );

  const imageInlinePart = await getImageInlinePart(imageUrl);

  const instructions = [
    `You are a layout agent responsible for arranging template fields on a medical document canvas.

### Core Responsibilities
- Place **only the remaining unpositioned template fields** with clear, readable spacing.
- Produce a **professional, print-ready medical layout** with consistent visual rhythm.

### Layout Rules
1. **Field Distribution:** Never collapse all fields into a single horizontal row. Distribute fields across the canvas naturally.
2. **Alignment:** For all non-table fields, "alignDirection" must be either "left-to-right" or "right-to-left" — never "center".
3. **Label Visibility:** Decide "showKeyName" per field individually, based on readability and whether the template visually implies the label already.
4. **Sizing:** Avoid tiny text and narrow widths for non-table fields. Keep tables wide and legible — never compress table rendering.
5. **Array Fields:** For fields with IDs containing "[", assign a wider "widthScale" and avoid dense inline packing.

### Inputs You Receive
- You receive the full template image as inline image data (entire page, not cropped).
- "selectionArea" is a separate rectangle (canvas percentages) where new placements are allowed.
- Use full-image context for structure, but keep all returned placements inside "selectionArea".

### Image Reading First (OCR-Like Anchor Pass)
- First, read the full image and identify printed anchors: headings, section labels, table borders, ruled lines, and key text baselines.
- Infer structural regions (header, patient block, diagnosis block, vitals area, prescriptions area) before assigning placements.
- Use those anchors as the primary placement guide; do not guess free-floating positions without anchor evidence.

### Coordinate & Context Guidance
- Use the **background image structure** and **existing field placements** as primary layout context.
- Treat ideal coordinates as a **soft prior** (a helpful suggestion, not a strict rule).
- If the image structure conflicts with ideal coordinates, **prefer the image and current layout context**.

### Feedback Refinement
- If "userFeedback" is present, treat this request as a refinement pass over "previousGeneration".
- Keep positions that already look good, and move only what the feedback says is off.
- Correct drift/stretch issues precisely rather than re-randomizing the full layout.

### Output
- Return **strict JSON only** — no explanations, comments, or additional text.`,
  ].join(" ");

  const inputContext = {
    selectionArea,
    imageContext: {
      fullImageProvided: Boolean(imageInlinePart),
      imageScope: "full-image",
      croppedToSelectionArea: false,
    },
    autoAlignDirection,
    showKeyNamesEnabled: showKeyNames,
    imageFilters: filters,
    userFeedback: userFeedback?.trim() || null,
    existingPoints: existingPointSummaries,
    previousGeneration: previousGenerationSummaries,
    candidateFields,
    outputSchema: {
      placements: [
        {
          fieldId: "string",
          x: "number (0-100 absolute canvas %)",
          y: "number (0-100 absolute canvas %)",
          fontScale: "number",
          widthScale: "number",
          heightScale: "number",
          alignDirection:
            "left-to-right | right-to-left (non-table), center (table only)",
          showKeyName: "boolean",
        },
      ],
    },
    hardRules: [
      "include each candidate field at most once",
      "keep x/y inside selectionArea",
      "the attached image is the full page, not a crop of selectionArea",
      "use full-image visual context, but place fields only inside selectionArea",
      "perform an OCR-like anchor read of the image before choosing coordinates",
      "anchor each placement to visible structure (labels, lines, boxes, or table geometry)",
      "for the same image and same inputs, keep outputs nearly identical between runs",
      "ideal coordinates are hints and can be adapted for this template",
      "for non-table fields, do not use center alignment",
      "when candidateFields.defaultShowKeyName is false, keep that field label hidden",
      "for non-table fields, do not use fontScale below 0.95",
      "for non-table fields, keep widthScale generally between 0.95 and 1.12 unless array fields need more room",
      "for table fields, keep widthScale generally between 0.95 and 1.10",
      "prioritize non-overlap with existingPoints",
      "center-align table fields",
      "do not assign the same y to many unrelated fields",
      "when userFeedback is present, adjust placements according to feedback while preserving good placements from previousGeneration",
    ],
  };

  const prompt = `${instructions}\n\nINPUT_JSON:\n${JSON.stringify(inputContext)}`;
  const requestParts: GeminiRequestPart[] = [{ text: prompt }];

  if (imageInlinePart) {
    requestParts.push({ inlineData: imageInlinePart });
  }

  try {
    const rawText = await requestGeminiAutoAlignContent(requestParts);

    if (!rawText) {
      return null;
    }

    const parsed = parseGeminiJson(rawText);

    if (!parsed) {
      return null;
    }

    const placements = Array.isArray(parsed.placements)
      ? parsed.placements
      : Array.isArray(parsed.result?.placements)
        ? parsed.result.placements
        : [];

    if (placements.length === 0) {
      return null;
    }

    const validatedPoints = toValidatedPoints(placements, options);

    return validatedPoints.length > 0 ? validatedPoints : null;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Gemini request failed for auto align."),
    );
  }
};
