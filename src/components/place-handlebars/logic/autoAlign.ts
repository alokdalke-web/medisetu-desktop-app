import {
  AutoAlignDirection,
  HandlebarPoint,
  NormalizedSelectionArea,
} from "../types";
import {
  HANDLEBAR_FIELDS_BY_ID,
  IDEAL_FIELD_POSITIONS,
  VITALS_TABLE_ID,
} from "../constants";
import { clampPercent, formatDummyValueForDisplay } from "../utils";

type AutoAlignOptions = {
  autoAlignCandidates: string[];
  selectionArea: NormalizedSelectionArea;
  nextPointId: number;
  syncedFontScale: number | null;
  autoAlignDirection: AutoAlignDirection;
  shouldShowKeyNameForField: (fieldId: string) => boolean;
};

type AutoAlignComputation = {
  newPoints: HandlebarPoint[];
  nextPointId: number;
  activePointId: number | null;
  nextSyncedFontScale: number | null;
};

export const computeAutoAlignedPoints = (
  options: AutoAlignOptions,
): AutoAlignComputation | null => {
  const {
    autoAlignCandidates,
    selectionArea,
    nextPointId,
    syncedFontScale,
    autoAlignDirection,
    shouldShowKeyNameForField,
  } = options;

  if (autoAlignCandidates.length === 0) {
    return null;
  }

  const areaWidth = Math.max(0.1, selectionArea.maxX - selectionArea.minX);
  const areaHeight = Math.max(0.1, selectionArea.maxY - selectionArea.minY);

  const sortedCandidates = [...autoAlignCandidates].sort((a, b) => {
    const posA = IDEAL_FIELD_POSITIONS[a as string] || { x: 50, y: 100 };
    const posB = IDEAL_FIELD_POSITIONS[b as string] || { x: 50, y: 100 };

    if (Math.abs(posA.y - posB.y) > 4) {
      return posA.y - posB.y;
    }

    return posA.x - posB.x;
  });

  const startId = nextPointId;
  const newPoints: HandlebarPoint[] = [];
  const fallbackCandidates: string[] = [];

  for (const fieldId of sortedCandidates) {
    const idealPosition = IDEAL_FIELD_POSITIONS[fieldId as string];

    if (!idealPosition) {
      fallbackCandidates.push(fieldId);
      continue;
    }

    const isTable =
      fieldId === VITALS_TABLE_ID || fieldId === "prescriptions.table";
    const fieldMeta = HANDLEBAR_FIELDS_BY_ID.get(fieldId);
    const aliasLength = (fieldMeta?.alias ?? fieldId).length;
    const showKeyName =
      shouldShowKeyNameForField(fieldId) && aliasLength <= 22;
    const mappedX = selectionArea.minX + (idealPosition.x / 100) * areaWidth;
    const mappedY = selectionArea.minY + (idealPosition.y / 100) * areaHeight;
    const professionalFontScale = isTable
      ? Math.max(1, idealPosition.fontScale)
      : Math.max(0.95, idealPosition.fontScale);
    const professionalWidthScale = isTable
      ? Math.min(1.1, Math.max(0.95, idealPosition.widthScale))
      : Math.min(1.12, Math.max(0.95, idealPosition.widthScale));
    const professionalHeightScale = isTable
      ? Math.max(1, idealPosition.heightScale)
      : Math.max(1, idealPosition.heightScale);
    const horizontalMid = selectionArea.minX + areaWidth / 2;
    const strictEdgeDirection: AutoAlignDirection =
      autoAlignDirection === "left-to-right" ||
      autoAlignDirection === "right-to-left"
        ? autoAlignDirection
        : mappedX <= horizontalMid
          ? "left-to-right"
          : "right-to-left";

    newPoints.push({
      id: startId + newPoints.length,
      key: fieldId,
      x: clampPercent(mappedX),
      y: clampPercent(mappedY),
      fontScale: Number(professionalFontScale.toFixed(2)),
      widthScale: Number(professionalWidthScale.toFixed(2)),
      heightScale: Number(professionalHeightScale.toFixed(2)),
      alignDirection: isTable ? "center" : strictEdgeDirection,
      showKeyName,
    });
  }

  if (fallbackCandidates.length === 0) {
    return {
      newPoints,
      nextPointId: startId + newPoints.length,
      activePointId: newPoints[newPoints.length - 1]?.id ?? null,
      nextSyncedFontScale: null,
    };
  }

  const fallbackScale = Math.max(1, syncedFontScale ?? 1);

  let currentX = 0;
  let currentRow: Array<{
    key: string;
    width: number;
    height: number;
    isTable: boolean;
  }> = [];
  const rows: Array<
    Array<{ key: string; width: number; height: number; isTable: boolean }>
  > = [];

  for (const fieldId of fallbackCandidates) {
    const isTable =
      fieldId === VITALS_TABLE_ID || fieldId === "prescriptions.table";

    let estWidth = 20;
    let estHeight = 4;

    if (isTable) {
      estWidth = areaWidth * 0.95;
      estHeight = fieldId === "prescriptions.table" ? 18 : 14;
    } else {
      const meta = HANDLEBAR_FIELDS_BY_ID.get(fieldId);
      let textStr = meta ? formatDummyValueForDisplay(meta.dummyValue) : "Sample";
      const showKeyName = shouldShowKeyNameForField(fieldId);

      if (showKeyName) {
        textStr = (meta?.alias || fieldId) + ": " + textStr;
      }

      estWidth = Math.min(
        areaWidth * 0.8,
        Math.max(18, textStr.length * 0.95 * fallbackScale),
      );
      estHeight = 5.5 * fallbackScale;
    }

    if (isTable) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }

      rows.push([
        { key: fieldId, width: areaWidth, height: estHeight, isTable: true },
      ]);
      currentX = 0;
      continue;
    }

    if (currentX + estWidth > areaWidth && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      currentX = 0;
    }

    currentRow.push({
      key: fieldId,
      width: estWidth,
      height: estHeight,
      isTable: false,
    });
    currentX += estWidth + 2;
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  let fallbackMinY = selectionArea.minY;

  if (newPoints.length > 0) {
    const maxIdealY = Math.max(...newPoints.map((point) => point.y));

    fallbackMinY = Math.max(selectionArea.minY, maxIdealY + 2);
  }

  if (fallbackMinY >= selectionArea.maxY - 1) {
    fallbackMinY = selectionArea.minY;
  }

  const fallbackAreaHeight = Math.max(0.1, selectionArea.maxY - fallbackMinY);

  const totalRowHeights = rows.reduce(
    (sum, row) => sum + Math.max(...row.map((r) => r.height)),
    0,
  );
  const numGaps = Math.max(1, rows.length - 1);
  let verticalGap = (fallbackAreaHeight - totalRowHeights) / numGaps;

  verticalGap = Math.min(8, Math.max(2, verticalGap));

  const actualTotalHeight = totalRowHeights + verticalGap * numGaps;
  let yCursor = fallbackMinY;

  if (actualTotalHeight < fallbackAreaHeight) {
    yCursor += (fallbackAreaHeight - actualTotalHeight) / 2;
  }

  const defaultHorizontalGap = 3;

  rows.forEach((row) => {
    const maxRowHeight = Math.max(...row.map((item) => item.height));
    const totalRowWidthTracker = row.reduce((sum, item) => sum + item.width, 0);
    const isTableRow = row.length === 1 && row[0].isTable;
    const rowDirection: AutoAlignDirection = isTableRow
      ? "center"
      : autoAlignDirection === "center"
        ? "left-to-right"
        : autoAlignDirection;

    let hGap = defaultHorizontalGap;
    let xCursor = selectionArea.minX;

    if (row.length === 1 && !isTableRow) {
      xCursor = selectionArea.minX + areaWidth / 2 - row[0].width / 2;
      hGap = 0;
    } else if (!isTableRow) {
      const distributedGap =
        (areaWidth - totalRowWidthTracker) / Math.max(1, row.length - 1);

      hGap = Math.min(12, Math.max(defaultHorizontalGap, distributedGap));

      const actualRowWidth = totalRowWidthTracker + hGap * (row.length - 1);

      xCursor = selectionArea.minX + areaWidth / 2 - actualRowWidth / 2;
    }

    row.forEach((item) => {
      let finalFontScale = Math.max(1, fallbackScale);
      let wScale = 1;
      let hScale = 1;

      if (item.isTable) {
        finalFontScale = 1;
        wScale = 1;
        hScale = 1;
      }

      const itemLeft = xCursor;
      const pointX = item.isTable
        ? selectionArea.minX + areaWidth / 2
        : rowDirection === "left-to-right"
          ? itemLeft
          : rowDirection === "center"
            ? itemLeft + item.width / 2
            : itemLeft + item.width;
      const centerY = yCursor + maxRowHeight / 2;

      newPoints.push({
        id: startId + newPoints.length,
        key: item.key,
        x: clampPercent(pointX),
        y: clampPercent(centerY),
        fontScale: Number(finalFontScale.toFixed(2)),
        widthScale: Number(wScale.toFixed(2)),
        heightScale: Number(hScale.toFixed(2)),
        alignDirection: item.isTable ? "center" : rowDirection,
        showKeyName: shouldShowKeyNameForField(item.key),
      });

      if (!item.isTable) {
        xCursor += item.width + hGap;
      }
    });

    yCursor += maxRowHeight + verticalGap;
  });

  return {
    newPoints,
    nextPointId: startId + newPoints.length,
    activePointId: newPoints[newPoints.length - 1]?.id ?? null,
    nextSyncedFontScale: null,
  };
};
