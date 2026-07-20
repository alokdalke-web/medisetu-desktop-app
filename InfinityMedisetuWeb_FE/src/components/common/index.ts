/**
 * CommonTable Component Library
 * Export all table-related components and utilities
 */

// Main component
export { default as CommonTable } from "./CommonTable";

// Sub-components
export { default as CommonTableEmpty } from "./CommonTableEmpty";
export { default as CommonTableLoading } from "./CommonTableLoading";
export { default as CommonTableError } from "./CommonTableError";
export { default as CommonTablePagination } from "./CommonTablePagination";

// Types
export type {
  TableColumn,
  TableRowAction,
  TableFilter,
  SortDescriptor,
  BulkAction,
  SelectionState,
  RowSelectionConfig,
  PaginationConfig,
  TableStateConfig,
  CommonTableProps,
  CellRenderContext,
} from "./types";

// Utilities
export {
  displayValue,
  hasValue,
  filterByValue,
  getStatusLabel,
  getStatusColor,
  getNestedValue,
  formatDate,
  formatTime,
  truncateText,
  calculatePaginationInfo,
  calculateTotalPages,
  generateId,
  debounce,
  createInitialSelectionState,
  toggleRowSelection,
  toggleSelectAll,
  getSelectedRowIndices,
  isRowSelected,
  sortByKey,
  filterBySearchTerm,
  getSearchableColumns,
  getSortableColumns,
  isValidColumnKey,
  getColumnByKey,
  hasRequiredColumns,
} from "./utils";

// Constants
export {
  DEFAULT_PAGINATION_CONFIG,
  DEFAULT_ROW_SELECTION_CONFIG,
  TABLE_CLASSES,
  LOADING_CLASSES,
  EMPTY_STATE_CLASSES,
  ERROR_STATE_CLASSES,
  PAGINATION_CLASSES,
  ROW_ACTIONS_CLASSES,
  ROW_SELECTION_CLASSES,
  BULK_ACTIONS_CLASSES,
  DEFAULT_EMPTY_STATE,
  DEFAULT_LOADING_MESSAGE,
  DEFAULT_ERROR_MESSAGE,
  MAX_SKELETON_ROWS,
  KEYBOARD_KEYS,
  ARIA_LABELS,
} from "./constants";
