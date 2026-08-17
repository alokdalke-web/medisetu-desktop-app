import Handlebars from "handlebars";
import {
  ARRAY_FIELD_IDS,
  CLINIC_LOGO_BASE_HEIGHT_PX,
  CLINIC_LOGO_BASE_WIDTH_PX,
  CLINIC_LOGO_FIELD_ID,
  HANDLEBAR_FIELDS_BY_ID,
  VITALS_TABLE_ID,
} from "../constants";
import {
  CanvasImageFitMode,
  HandlebarPoint,
  VitalsTableOrientation,
} from "../types";
import {
  escapeHtmlText,
  FIELD_ID_TO_HANDLEBAR_KEY,
  renderTablePreviewHtml,
  toHandlebarValueExpression,
} from "../utils";

type CanvasDimensions = {
  widthMm: number;
  heightMm: number;
};

type BuildHtmlOutputOptions = {
  points: HandlebarPoint[];
  vitalsTableOrientation: VitalsTableOrientation;
  includeImageInHtml: boolean;
  canvasDimensions: CanvasDimensions;
  canvasImageFitMode: CanvasImageFitMode;
  imageUrl: string;
  filters: string;
};

const clampScale = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getHandlebarCondition = (fieldId: string): string | null => {
  if (fieldId === CLINIC_LOGO_FIELD_ID) return "clinic.logo";
  if (fieldId === VITALS_TABLE_ID) return "vitalsMoreThanOne";
  if (fieldId === "testNames") return "hasTests";
  if (fieldId === "appointmentSlot") return null;
  if (fieldId === "prescriptions.table") return "prescriptions.length";

  const mappedKey = FIELD_ID_TO_HANDLEBAR_KEY[fieldId];
  if (mappedKey) return mappedKey;

  const arrayMatch = fieldId.match(/^(.+)\[\d+\]/);
  if (arrayMatch) {
    return `${arrayMatch[1]}.length`;
  }

  return fieldId;
};

const buildImageInlineStyle = (
  canvasImageFitMode: CanvasImageFitMode,
  escapedFilter: string,
) => {
  if (canvasImageFitMode === "contain") {
    return `filter: ${escapedFilter}; left: 0; top: 0; width: 100%; height: 100%; object-fit: contain;`;
  }
  if (canvasImageFitMode === "cover") {
    return `filter: ${escapedFilter}; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover;`;
  }
  if (canvasImageFitMode === "stretch") {
    return `filter: ${escapedFilter}; left: 0; top: 0; width: 100%; height: 100%; object-fit: fill;`;
  }
  if (canvasImageFitMode === "width-fit") {
    return `filter: ${escapedFilter}; left: 0; top: 50%; width: 100%; height: auto; object-fit: contain; transform: translateY(-50%);`;
  }
  if (canvasImageFitMode === "height-fit") {
    return `filter: ${escapedFilter}; left: 50%; top: 0; width: auto; height: 100%; object-fit: contain; transform: translateX(-50%);`;
  }
  if (canvasImageFitMode === "original") {
    return `filter: ${escapedFilter}; left: 50%; top: 50%; width: auto; height: auto; max-width: none; max-height: none; object-fit: none; transform: translate(-50%, -50%);`;
  }

  return `filter: ${escapedFilter}; left: 0; top: 0; width: 100%; height: 100%; object-fit: contain;`;
};

/**
 * Minifies the HTML output to a single line.
 * This prevents FormData (multipart/form-data) from converting \n -> \r\n,
 * as required by RFC 2046. Since there are no newlines, nothing gets converted.
 * Safe for HTML, CSS inside <style> blocks, and Handlebars expressions.
 */
const minifyHtmlForTransport = (html: string): string =>
  html
    .replace(/\r/g, "")           // strip any carriage returns first
    .replace(/\n[ \t]*/g, " ")    // collapse newlines + leading whitespace to a single space
    .replace(/>[ \t]+</g, "><")   // remove whitespace-only text nodes between tags
    .replace(/[ \t]{2,}/g, " ")  // collapse multiple spaces/tabs to one
    .trim();

export const buildHandlebarsHtmlOutput = (
  options: BuildHtmlOutputOptions,
): string => {
  const {
    points,
    vitalsTableOrientation,
    includeImageInHtml,
    canvasDimensions,
    canvasImageFitMode,
    imageUrl,
    filters,
  } = options;

  const pointHtml = points
    .map((point) => {
      const fieldMeta = HANDLEBAR_FIELDS_BY_ID.get(point.key);
      const markerOrientation: VitalsTableOrientation =
        point.key === VITALS_TABLE_ID ? vitalsTableOrientation : "horizontal";
      const markerAlignDirection = point.alignDirection ?? "left-to-right";
      const markerTranslateX =
        markerAlignDirection === "center"
          ? "-50%"
          : markerAlignDirection === "right-to-left"
            ? "-100%"
            : "0";
      const markerTransformOriginX =
        markerAlignDirection === "center"
          ? "center"
          : markerAlignDirection === "right-to-left"
            ? "right"
            : "left";
      const isTableMarker = Boolean(fieldMeta?.tablePreview);
      const baseFontSize = isTableMarker ? 8 : 12;
      const minReadableFontSize = isTableMarker ? 9.5 : 10.5;
      const markerFontSize = Number(
        Math.max(minReadableFontSize, baseFontSize * point.fontScale).toFixed(
          2,
        ),
      );
      const markerWidthScale = Number(
        (isTableMarker
          ? clampScale(point.widthScale, 0.95, 1.1)
          : clampScale(
              point.widthScale,
              0.92,
              ARRAY_FIELD_IDS.has(point.key) || point.key.includes("[")
                ? 1.2
                : 1.12,
            )
        ).toFixed(2),
      );
      const markerHeightScale = Number(
        (isTableMarker
          ? clampScale(point.heightScale, 0.95, 1.05)
          : clampScale(point.heightScale, 0.95, 1.08)
        ).toFixed(2),
      );
      const markerToken = toHandlebarValueExpression(point.key);
      const markerLabel = `${escapeHtmlText(fieldMeta?.alias ?? point.key)}: `;
      const isLogoMarker = point.key === CLINIC_LOGO_FIELD_ID;
      const isAvailabilityMarker = point.key === "doctor.availability[0].display";
      const isSlotMarker = point.key === "appointmentSlot";
      const markerContent =
        isTableMarker && fieldMeta?.tablePreview
          ? renderTablePreviewHtml(
              point.key,
              fieldMeta.tablePreview,
              markerOrientation,
            )
          : isLogoMarker
            ? `<img class="marker-logo" src="${markerToken}" alt="${escapeHtmlText(fieldMeta?.alias ?? "Clinic logo")}" />`
          : isAvailabilityMarker
            ? `<div style="font-size: 9px; margin-top: 4px; display: inline-block;">{{#each doctor.availability}}<div style="display: flex; margin-bottom: 2px;"><span style="width: 35px; font-weight: 500; color: #0A6C74;">{{this.day}}:</span>{{#if this.isAvailable}}<span style="color: #666666;">{{{this.display}}}</span>{{else}}<span style="color: #000000;">Off</span>{{/if}}</div>{{/each}}</div>`
          : isSlotMarker
            ? `{{#if token}}<div style="font-size: 11px;">Token #: {{token}}</div>{{else}}<div style="font-size: 11px;">Time: {{appointmentTime}}</div>{{/if}}`
          : `<span class="marker-text">${point.showKeyName ? markerLabel : ""}${markerToken}</span>`;

      const markerHtml = `<div class="marker" data-handlebar-id="${escapeHtmlText(
        point.key,
      )}" style="left: ${point.x.toFixed(2)}%; top: ${point.y.toFixed(2)}%; font-size: ${markerFontSize}px; text-align: ${markerAlignDirection === "center" ? "center" : markerAlignDirection === "right-to-left" ? "right" : "left"}; transform-origin: ${markerTransformOriginX} center; transform: translate(${markerTranslateX}, -50%) scale(${markerWidthScale}, ${markerHeightScale});">${markerContent}</div>`;

      // STRATEGY: Flattened Handlebars control flow.
      // Every marker is wrapped and CLOSED immediately.
      const condition = getHandlebarCondition(point.key);
      if (condition) {
        return `{{#if ${condition}}}${markerHtml}{{/if}}`;
      }

      return markerHtml;
    })
    .join("\n    ");

  const imageHtml = `<img class="template-image" src="${escapeHtmlText(
    imageUrl,
  )}" alt="Template preview" style="${buildImageInlineStyle(
    canvasImageFitMode,
    escapeHtmlText(filters),
  )}" />`;

  const canvasClass = includeImageInHtml
    ? "template-canvas with-image"
    : "template-canvas without-image";

  const finalHtml = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "  <title>Handlebar Template Output</title>",
    "  <style>",
    "    @page { size: auto; margin: 0; }",
    "    body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; text-rendering: geometricPrecision; }",
    "    .template-canvas {",
    "      position: relative;",
    `      width: ${canvasDimensions.widthMm}mm;`,
    `      height: ${canvasDimensions.heightMm}mm;`,
    "      margin: 0 auto;",
    "      border: none;",
    "      border-radius: 0;",
    "      overflow: hidden;",
    "      background: #ffffff;",
    "      font-family: 'Lora', serif;",
    "    }",
    "    .template-canvas.without-image { background: #ffffff; }",
    "    .template-canvas.without-image .template-image { display: none; }",
    "    .template-image {",
    "      position: absolute;",
    "      user-select: none;",
    "      pointer-events: none;",
    "    }",
    "    .marker {",
    "      position: absolute;",
    "      transform-origin: center center;",
    "      background: transparent;",
    "      border-radius: 0;",
    "      box-shadow: none;",
    "      color: #1f2933;",
    "      font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;",
    "      font-weight: 500;",
    "      max-width: 44%;",
    "      padding: 0;",
    "      line-height: 1.35;",
    "      letter-spacing: 0.01em;",
    "      white-space: normal;",
    "      overflow-wrap: anywhere;",
    "      word-break: break-word;",
    "    }",
    "    .marker-text { display: inline-block; max-width: 100%; }",
    `    .marker-logo { display: block; width: ${CLINIC_LOGO_BASE_WIDTH_PX}px; height: ${CLINIC_LOGO_BASE_HEIGHT_PX}px; object-fit: contain; }`,
    "    .marker[data-handlebar-id='vitals.table'], .marker[data-handlebar-id='prescriptions.table'] { width: 82%; max-width: 82%; }",
    "    .marker-table { border-collapse: collapse; background: transparent; width: 100%; table-layout: fixed; font-size: inherit; }",
    "    .marker-table th, .marker-table td {",
    "      border: 1px solid #d4d4d8;",
    "      padding: 3px 6px;",
    "      text-align: left;",
    "      white-space: normal;",
    "      overflow-wrap: anywhere;",
    "    }",
    "    .marker-table th { background: #f8fafc; font-weight: 600; }",
    "    .vitals-grid { display: flex; flex-wrap: wrap; gap: 8px; }",
    "    .vital-item { background: #f9f9f9; padding: 2px 4px; border-radius: 6px; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }",
    "    .vital-title { font-size: 8px; font-weight: 600; color: #666666; text-transform: uppercase; }",
    "    .vital-reading { font-size: 10px; font-weight: 600; color: #333333; }",
    "    .medicine-name { font-weight: 600; color: #0A6C74; font-size: 11px; }",
    "    .medicine-notes { font-size: 8px; color: #666666; margin-top: 2px; }",
    "    .med-table { width: 100%; border-collapse: collapse; margin: 0; }",
    "    .med-table th { text-align: left; border-bottom: 2px solid #0A6C74; padding: 8px; font-size: 10px; font-weight: 600; color: #0A6C74; }",
    "    .med-table td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }",
    "  </style>",
    "</head>",
    "<body>",
    `  <div class="${canvasClass}">`,
    imageHtml ? `    ${imageHtml}` : "",
    pointHtml ? `    ${pointHtml}` : "",
    "  </div>",
    "</body>",
    "</html>",
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\r/g, "");

  // RECOMMENDED DEBUGGING STRATEGY: Validate template syntax before transport.
  // This catches unclosed blocks or structural issues early.
  try {
    Handlebars.parse(finalHtml);
  } catch (e) {
    console.error("Handlebars Template Structural Issue:", e instanceof Error ? e.message : e);
    // We still return it so the user can see the error in the preview or console,
    // but the console error will pinpoint the exact structural collapse.
  }
  
  return minifyHtmlForTransport(finalHtml);
};
