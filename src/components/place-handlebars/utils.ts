import {
  DateSeparator,
  DateDisplayFormat,
  NormalizedSelectionArea,
  TimeSeparator,
  TimeDisplayFormat,
  VitalsTableOrientation,
} from "./types";
import {
  ARRAY_FIELD_IDS,
  DATE_FIELD_IDS,
  MAX_MARKER_FONT_SCALE,
  MAX_MARKER_SIZE_SCALE,
  MIN_MARKER_FONT_SCALE,
  MIN_MARKER_SIZE_SCALE,
  TABLE_HANDLEBAR_ID_MAP,
  TIME_FIELD_IDS,
  VITALS_TABLE_ID,
} from "./constants";

export const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, value));

export const FIELD_ID_TO_HANDLEBAR_KEY: Record<string, string> = {};

export const normalizeSelectionArea = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): NormalizedSelectionArea => {
  const minX = clampPercent(Math.min(startX, endX));
  const minY = clampPercent(Math.min(startY, endY));
  const maxX = clampPercent(Math.max(startX, endX));
  const maxY = clampPercent(Math.max(startY, endY));

  return { minX, minY, maxX, maxY };
};

export const getFallbackAutoAlignPosition = (index: number) => {
  const columns = 3;
  const startX = 38;
  const startY = 26;
  const xGap = 20;
  const yGap = 6;
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: clampPercent(startX + column * xGap),
    y: clampPercent(startY + row * yGap),
  };
};

export const clampFontScale = (value: number) =>
  Math.max(MIN_MARKER_FONT_SCALE, Math.min(MAX_MARKER_FONT_SCALE, value));

export const clampMarkerSizeScale = (value: number) =>
  Math.max(MIN_MARKER_SIZE_SCALE, Math.min(MAX_MARKER_SIZE_SCALE, value));

export const pad2 = (value: number) => String(value).padStart(2, "0");

export const parseDateParts = (rawValue: string) => {
  const trimmed = rawValue.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return { day: Number(day), month: Number(month), year: Number(year) };
  }

  const parsedDate = new Date(trimmed);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    day: parsedDate.getDate(),
    month: parsedDate.getMonth() + 1,
    year: parsedDate.getFullYear(),
  };
};

export const formatDateValue = (
  rawValue: string,
  format: DateDisplayFormat,
  separator: DateSeparator,
) => {
  const parsed = parseDateParts(rawValue);

  if (!parsed) {
    return rawValue;
  }

  const dd = pad2(parsed.day);
  const mm = pad2(parsed.month);
  const yyyy = String(parsed.year);
  const yy = yyyy.slice(-2);
  const dateSeparator = separator === "space"
    ? " "
    : separator === "slash"
      ? "/"
      : separator === "dash"
        ? "-"
        : "";
  const orderedParts =
    format === "DD MM YYYY"
      ? [dd, mm, yyyy]
      : format === "MM DD YY"
        ? [mm, dd, yy]
        : [dd, mm, yy];

  return orderedParts.join(dateSeparator);
};

export const parseTimeParts = (rawValue: string) => {
  const trimmed = rawValue.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (match) {
    const [, rawHour, rawMinute, rawSecond, meridiemToken] = match;
    let hours = Number(rawHour);
    const minutes = Number(rawMinute);
    const seconds = rawSecond ? Number(rawSecond) : 0;

    if (minutes > 59 || seconds > 59) return null;

    if (meridiemToken) {
      const meridiem = meridiemToken.toUpperCase();

      if (hours < 1 || hours > 12) return null;
      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    } else if (hours > 23) {
      return null;
    }

    return { hours24: hours, minutes, seconds };
  }

  const parsedDate = new Date(trimmed);

  if (Number.isNaN(parsedDate.getTime())) return null;

  return {
    hours24: parsedDate.getHours(),
    minutes: parsedDate.getMinutes(),
    seconds: parsedDate.getSeconds(),
  };
};

export const formatTimeValue = (
  rawValue: string,
  format: TimeDisplayFormat,
  separator: TimeSeparator,
) => {
  const parsed = parseTimeParts(rawValue);

  if (!parsed) return rawValue;

  const hh24 = pad2(parsed.hours24);
  const mm = pad2(parsed.minutes);
  const ss = pad2(parsed.seconds);
  const period = parsed.hours24 >= 12 ? "PM" : "AM";
  const hours12 = parsed.hours24 % 12 || 12;
  const hh12 = pad2(hours12);
  const timeSeparator = separator === "colon"
    ? ":"
    : separator === "slash"
      ? "/"
      : separator === "dash"
        ? "-"
        : "";

  if (format === "HH:mm") return [hh24, mm].join(timeSeparator);
  if (format === "HH:mm:ss") return [hh24, mm, ss].join(timeSeparator);
  if (format === "hh:mm:ss A") {
    return `${[hh12, mm, ss].join(timeSeparator)} ${period}`;
  }

  return `${[hh12, mm].join(timeSeparator)} ${period}`;
};

export const formatDummyValueForDisplay = (
  value: string | string[],
): string => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value;
};

export const resolveFieldDisplayValue = (
  fieldId: string,
  fallbackValue: string | string[],
  dateFormat: DateDisplayFormat,
  dateSeparator: DateSeparator,
  timeFormat: TimeDisplayFormat,
  timeSeparator: TimeSeparator,
) => {
  const formatValue = (rawValue: string) => {
    if (DATE_FIELD_IDS.has(fieldId)) {
      return formatDateValue(rawValue, dateFormat, dateSeparator);
    }

    if (TIME_FIELD_IDS.has(fieldId)) {
      return formatTimeValue(rawValue, timeFormat, timeSeparator);
    }

    return rawValue;
  };

  if (Array.isArray(fallbackValue)) {
    return fallbackValue.map(formatValue).join(", ");
  }

  return formatValue(fallbackValue);
};

export const escapeHtmlText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const toHandlebarToken = (fieldId: string) => {
  const key = FIELD_ID_TO_HANDLEBAR_KEY[fieldId] ?? fieldId;
  return `{{${key}}}`;
};

const parseIndexedArrayField = (fieldId: string) => {
  const match = fieldId.match(/^(.+)\[\d+\](?:\.(.+))?$/);

  if (!match) return null;

  return {
    collectionPath: match[1],
    nestedPath: match[2] ?? null,
  };
};

export const toHandlebarValueExpression = (fieldId: string) => {
  const indexedArrayField = parseIndexedArrayField(fieldId);

  if (indexedArrayField) {
    const itemToken = indexedArrayField.nestedPath
      ? `{{this.${indexedArrayField.nestedPath}}}`
      : "{{this}}";

    return `{{#each ${indexedArrayField.collectionPath}}}${itemToken}{{#unless @last}}, {{/unless}}{{/each}}`;
  }

  if (ARRAY_FIELD_IDS.has(fieldId)) {
    return `{{#each ${fieldId}}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}`;
  }

  return toHandlebarToken(fieldId);
};

export const renderTablePreviewHtml = (
  fieldId: string,
  tablePreview: { headers: string[]; row: string[] },
  orientation: VitalsTableOrientation,
) => {
  if (fieldId === VITALS_TABLE_ID) {
    return `
      <div style="display: flex; align-items: center; margin: 0 0 4px 0;">
          <div style="font-size: 12px; font-weight: 600; margin-right: 8px; white-space: nowrap; color: #0A6C74;">Vitals:</div>
          <div class="vitals-grid">
              {{#if vitals.bpSys}}{{#if vitals.bpDia}}
              <div class="vital-item">
                  <span class="vital-title">BP</span>
                  <span class="vital-reading">{{vitals.bpSys}}/{{vitals.bpDia}}</span>
              </div>
              {{/if}}{{/if}}
              {{#if vitals.pulse}}
              <div class="vital-item">
                  <span class="vital-title">Pulse</span>
                  <span class="vital-reading">{{vitals.pulse}}</span>
              </div>
              {{/if}}
              {{#if vitals.spo2}}
              <div class="vital-item">
                  <span class="vital-title">SpO2</span>
                  <span class="vital-reading">{{vitals.spo2}}%</span>
              </div>
              {{/if}}
              {{#if vitals.temperatureC}}
              <div class="vital-item">
                  <span class="vital-title">Temp</span>
                  <span class="vital-reading">{{vitals.temperatureC}}°C</span>
              </div>
              {{/if}}
              {{#if vitals.weightKg}}
              <div class="vital-item">
                  <span class="vital-title">Wt</span>
                  <span class="vital-reading">{{vitals.weightKg}} kg</span>
              </div>
              {{/if}}
              {{#if vitals.heightCm}}
              <div class="vital-item">
                  <span class="vital-title">Ht</span>
                  <span class="vital-reading">{{vitals.heightCm}} cm</span>
              </div>
              {{/if}}
              {{#if vitals.bmi}}
              <div class="vital-item">
                  <span class="vital-title">BMI</span>
                  <span class="vital-reading">{{vitals.bmi}}</span>
              </div>
              {{/if}}
          </div>
      </div>`.trim();
  }

  if (fieldId === "prescriptions.table") {
    return `
      <table class="med-table">
          <thead>
              <tr>
                  <th>Medication</th>
                  <th>Dosage / Frequency</th>
                  <th>Duration</th>
                  <th>Instructions</th>
              </tr>
          </thead>
          <tbody>
              {{#each prescriptions}}
              <tr>
                  <td>
                      <div class="medicine-name">{{this.medicineName}}</div>
                  </td>
                  <td>{{this.dosage}} - {{this.frequency}}</td>
                  <td>{{this.duration}}</td>
                  <td>{{this.notes}}</td>
              </tr>
              {{/each}}
          </tbody>
      </table>`.trim();
  }

  const mappedFieldIds =
    TABLE_HANDLEBAR_ID_MAP[fieldId] ??
    tablePreview.headers.map((_, index) => `${fieldId}.${index}`);

  if (orientation === "vertical") {
    const verticalRows = tablePreview.headers
      .map((header, index) => {
        const valueToken = toHandlebarValueExpression(
          mappedFieldIds[index] ?? fieldId,
        );

        return `<tr><td>${escapeHtmlText(header)}</td><td>${valueToken}</td></tr>`;
      })
      .join("");

    return `<table class="marker-table marker-table-vertical"><thead><tr><th>Vital</th><th>Reading</th></tr></thead><tbody>${verticalRows}</tbody></table>`;
  }

  const headerCells = tablePreview.headers
    .map((header) => `<th>${escapeHtmlText(header)}</th>`)
    .join("");
  const valueCells = mappedFieldIds
    .map((fieldIdToken) => `<td>${toHandlebarValueExpression(fieldIdToken)}</td>`)
    .join("");

  return `<table class="marker-table"><thead><tr>${headerCells}</tr></thead><tbody><tr>${valueCells}</tr></tbody></table>`;
};
