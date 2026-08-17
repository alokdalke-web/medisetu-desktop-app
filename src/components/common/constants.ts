/**
 * CommonTable Component Constants
 * Shared constants and default configurations
 */

import { PaginationConfig, RowSelectionConfig } from "./types";

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGINATION_CONFIG: Partial<PaginationConfig> = {
  currentPage: 1,
  totalPages: 1,
  rowsPerPage: 10,
  rowsPerPageOptions: [6, 10, 15, 25, 50],
  totalRecords: 0,
  showPagination: true,
  showRowsPerPage: true,
  showRowCount: true,
};

/**
 * Default row selection configuration
 */
export const DEFAULT_ROW_SELECTION_CONFIG: Partial<RowSelectionConfig> = {
  enabled: false,
  single: false,
  showCheckbox: true,
};

/**
 * CSS class names for table structure
 */
export const TABLE_CLASSES = {
  container: "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden",
  table: "w-full",
  thead: "border-b border-slate-200 bg-slate-50/50",
  thead_tr: "border-b border-slate-200 bg-slate-50/50",
  th: "px-6 py-4 text-left text-sm font-semibold text-slate-500 uppercase tracking-wider",
  tbody: "divide-y divide-slate-100",
  tr: "border-b border-slate-100 hover:bg-slate-50/50 transition-colors",
  tr_dense: "border-b border-slate-100 hover:bg-slate-50/50 transition-colors py-2",
  tr_striped_odd: "bg-white",
  tr_striped_even: "bg-slate-50/30 hover:bg-slate-50/50",
  td: "px-6 py-5 text-sm text-slate-900",
  td_dense: "px-6 py-3 text-sm text-slate-900",
  footer: "flex flex-col items-center justify-between gap-4 px-6 py-4 bg-white border-t border-slate-200",
};

/**
 * CSS class names for loading state
 */
export const LOADING_CLASSES = {
  container:
    "flex justify-center rounded-lg border border-slate-200 py-16 bg-white",
  message: "text-slate-600 text-sm",
};

/**
 * CSS class names for empty state
 */
export const EMPTY_STATE_CLASSES = {
  container:
    "rounded-lg border border-slate-200 bg-white p-8 text-center space-y-3",
  title: "text-lg font-semibold text-slate-900",
  description: "text-sm text-slate-600",
  icon: "text-4xl text-slate-300 mx-auto",
};

/**
 * CSS class names for error state
 */
export const ERROR_STATE_CLASSES = {
  container:
    "rounded-lg border border-red-200 bg-red-50 p-8 text-center space-y-3",
  title: "text-lg font-semibold text-red-900",
  description: "text-sm text-red-700",
  icon: "text-4xl text-red-300 mx-auto",
};

/**
 * CSS class names for pagination
 */
export const PAGINATION_CLASSES = {
  container: "flex flex-col items-center justify-between gap-4 sm:flex-row",
  info: "text-sm text-slate-600",
  controls: "flex items-center gap-4",
  rowsPerPage: "flex items-center gap-2",
  label: "text-sm font-medium text-slate-600",
  select:
    "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
};

/**
 * CSS class names for row actions
 */
export const ROW_ACTIONS_CLASSES = {
  cell: "px-4 py-3 text-center",
  button: "relative inline-flex items-center justify-center",
  singleButton: "hover:bg-slate-100 rounded-lg transition-colors",
};

/**
 * CSS class names for row selection
 */
export const ROW_SELECTION_CLASSES = {
  cell: "px-4 py-3 text-center w-12",
  checkbox: "cursor-pointer",
};

/**
 * CSS class names for bulk actions
 */
export const BULK_ACTIONS_CLASSES = {
  container: "flex items-center gap-2",
  button: "px-3 py-1.5 text-sm font-medium rounded-lg",
};

/**
 * Default empty state configuration
 */
export const DEFAULT_EMPTY_STATE = {
  title: "No data available",
  description: "There are no records to display at the moment.",
};

/**
 * Default loading message
 */
export const DEFAULT_LOADING_MESSAGE = "Loading data...";

/**
 * Default error message
 */
export const DEFAULT_ERROR_MESSAGE =
  "An error occurred while loading the data. Please try again.";

/**
 * Maximum number of skeleton rows to display
 */
export const MAX_SKELETON_ROWS = 5;

/**
 * Keyboard navigation keys
 */
export const KEYBOARD_KEYS = {
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
};

/**
 * Accessibility attributes for ARIA
 */
export const ARIA_LABELS = {
  TABLE: "Data table",
  SELECT_ALL: "Select all rows",
  SELECT_ROW: "Select row",
  SORT_ASCENDING: "Sort ascending",
  SORT_DESCENDING: "Sort descending",
  ACTIONS: "Row actions",
  PAGINATION: "Table pagination",
  LOADING: "Loading table data",
  EMPTY: "Table is empty",
  ERROR: "Error loading table data",
};
