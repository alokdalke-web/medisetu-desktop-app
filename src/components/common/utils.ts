/**
 * CommonTable Component Utilities
 * Reusable utility functions for the table component
 */

import { TableColumn, SelectionState } from "./types";

/**
 * Display a value safely, replacing empty values with a dash
 * @param value - The value to display
 * @returns Formatted string value
 */
export const displayValue = (value?: string | number | null): string => {
  if (value === undefined || value === null) return "—";
  const text = String(value).trim();
  return text || "—";
};

/**
 * Check if a value has content (not empty, null, or undefined)
 * @param value - The value to check
 * @returns Whether the value has content
 */
export const hasValue = (value?: string | number | null): boolean =>
  value !== undefined && value !== null && String(value).trim() !== "";

/**
 * Filter items to only include those with valid values
 * @param items - Array of items with value property
 * @returns Filtered array
 */
export const filterByValue = <T extends { value?: string | number | null }>(
  items: T[]
): T[] => items.filter((item) => hasValue(item.value));

/**
 * Get display label based on status
 * @param status - The status value
 * @returns Formatted status label
 */
export const getStatusLabel = (status?: string | null): string => {
  const value = String(status ?? "").trim().toLowerCase();

  const statusMap: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    active: "Active",
    inactive: "Inactive",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return statusMap[value] || displayValue(status);
};

/**
 * Get status color based on status value
 * @param status - The status value
 * @returns Color for status badge
 */
export const getStatusColor = (
  status?: string | null
): "default" | "primary" | "success" | "warning" | "danger" => {
  const value = String(status ?? "").trim().toLowerCase();

  const colorMap: Record<
    string,
    "default" | "primary" | "success" | "warning" | "danger"
  > = {
    approved: "success",
    accepted: "success",
    active: "success",
    completed: "success",
    rejected: "danger",
    inactive: "danger",
    failed: "danger",
    cancelled: "danger",
    pending: "warning",
    processing: "primary",
    reviewing: "primary",
    "in review": "primary",
  };

  return colorMap[value] || "default";
};

/**
 * Safely get nested object property
 * @param obj - The object to access
 * @param path - Dot-notation path (e.g., "user.profile.name")
 * @param defaultValue - Default value if path doesn't exist
 * @returns The value at the path
 */
export const getNestedValue = (
  obj: any,
  path: string,
  defaultValue?: any
): any => {
  try {
    const value = path.split(".").reduce((current, prop) => current?.[prop], obj);
    return value !== undefined ? value : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Format a date string to a readable format
 * @param date - The date string or Date object
 * @param format - Format type
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date,
  format: "short" | "long" | "datetime" = "short"
): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "—";

    switch (format) {
      case "short":
        return dateObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      case "long":
        return dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "datetime":
        return dateObj.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      default:
        return dateObj.toLocaleDateString();
    }
  } catch {
    return "—";
  }
};

/**
 * Format time from a date string
 * @param date - The date string or Date object
 * @returns Formatted time string (HH:MM)
 */
export const formatTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "—";
    return dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
};

/**
 * Truncate text to a specific length
 * @param text - The text to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to add (default: "...")
 * @returns Truncated text
 */
export const truncateText = (
  text: string,
  length: number,
  suffix: string = "..."
): string => {
  if (!text || text.length <= length) return text;
  return text.slice(0, length - suffix.length) + suffix;
};

/**
 * Calculate pagination start and end record numbers
 * @param currentPage - Current page number (1-indexed)
 * @param rowsPerPage - Number of rows per page
 * @param totalRecords - Total number of records
 * @returns Object with start and end record numbers
 */
export const calculatePaginationInfo = (
  currentPage: number,
  rowsPerPage: number,
  totalRecords: number
): { start: number; end: number } => {
  const start = (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, totalRecords);
  return { start, end };
};

/**
 * Calculate total pages based on records and rows per page
 * @param totalRecords - Total number of records
 * @param rowsPerPage - Number of rows per page
 * @returns Total number of pages
 */
export const calculateTotalPages = (
  totalRecords: number,
  rowsPerPage: number
): number => {
  return Math.ceil(totalRecords / rowsPerPage) || 1;
};

/**
 * Generate unique ID
 * @param prefix - Optional prefix for the ID
 * @returns Unique identifier
 */
export const generateId = (prefix: string = "id"): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Debounce a function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
};

/**
 * Create a new selection state for rows
 * @returns Initial selection state
 */
export const createInitialSelectionState = (): SelectionState => ({
  selectedRows: new Set(),
  selectAll: false,
  selectSome: false,
});

/**
 * Toggle row selection
 * @param state - Current selection state
 * @param rowIndex - Index of the row to toggle
 * @param singleSelection - Whether to use single selection
 * @returns New selection state
 */
export const toggleRowSelection = (
  state: SelectionState,
  rowIndex: number,
  singleSelection: boolean = false
): SelectionState => {
  const newSelectedRows = new Set(state.selectedRows);

  if (singleSelection) {
    // Single selection: clear previous selections
    newSelectedRows.clear();
    if (!newSelectedRows.has(rowIndex)) {
      newSelectedRows.add(rowIndex);
    }
  } else {
    // Multiple selection: toggle current row
    if (newSelectedRows.has(rowIndex)) {
      newSelectedRows.delete(rowIndex);
    } else {
      newSelectedRows.add(rowIndex);
    }
  }

  return {
    selectedRows: newSelectedRows,
    selectAll: false,
    selectSome: newSelectedRows.size > 0,
  };
};

/**
 * Toggle select all rows
 * @param state - Current selection state
 * @param totalRows - Total number of rows
 * @returns New selection state
 */
export const toggleSelectAll = (
  state: SelectionState,
  totalRows: number
): SelectionState => {
  if (state.selectAll) {
    // Deselect all
    return createInitialSelectionState();
  } else {
    // Select all
    const selectedRows = new Set<number>();
    for (let i = 0; i < totalRows; i++) {
      selectedRows.add(i);
    }
    return {
      selectedRows,
      selectAll: true,
      selectSome: false,
    };
  }
};

/**
 * Get selected row indices
 * @param state - Selection state
 * @returns Array of selected row indices
 */
export const getSelectedRowIndices = (state: SelectionState): number[] => {
  return Array.from(state.selectedRows).sort((a, b) => a - b);
};

/**
 * Check if a specific row is selected
 * @param state - Selection state
 * @param rowIndex - Index of the row to check
 * @returns Whether the row is selected
 */
export const isRowSelected = (
  state: SelectionState,
  rowIndex: number
): boolean => {
  return state.selectedRows.has(rowIndex);
};

/**
 * Sort array of objects by a specific key
 * @param data - Array to sort
 * @param key - Key to sort by (supports dot notation)
 * @param direction - Sort direction
 * @returns Sorted array
 */
export const sortByKey = <T extends Record<string, any>>(
  data: T[],
  key: string,
  direction: "ascending" | "descending" = "ascending"
): T[] => {
  const sorted = [...data].sort((a, b) => {
    const valueA = getNestedValue(a, key);
    const valueB = getNestedValue(b, key);

    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    if (typeof valueA === "string" && typeof valueB === "string") {
      return valueA.localeCompare(valueB);
    }

    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
  });

  return direction === "descending" ? sorted.reverse() : sorted;
};

/**
 * Filter data by search term across multiple columns
 * @param data - Array to filter
 * @param searchTerm - Search term
 * @param searchableColumns - Columns to search in
 * @returns Filtered array
 */
export const filterBySearchTerm = <T extends Record<string, any>>(
  data: T[],
  searchTerm: string,
  searchableColumns: string[]
): T[] => {
  if (!searchTerm) return data;

  const lowerSearchTerm = searchTerm.toLowerCase();
  return data.filter((item) =>
    searchableColumns.some((column) => {
      const value = getNestedValue(item, column);
      return value != null && String(value).toLowerCase().includes(lowerSearchTerm);
    })
  );
};

/**
 * Get columns that are searchable
 * @param columns - Array of columns
 * @returns Searchable column keys
 */
export const getSearchableColumns = (columns: TableColumn[]): string[] => {
  return columns.filter((col) => col.searchable !== false).map((col) => col.key);
};

/**
 * Get columns that are sortable
 * @param columns - Array of columns
 * @returns Sortable column keys
 */
export const getSortableColumns = (columns: TableColumn[]): string[] => {
  return columns.filter((col) => col.sortable !== false).map((col) => col.key);
};

/**
 * Validate if a column key exists in the columns array
 * @param columnKey - Column key to validate
 * @param columns - Array of columns
 * @returns Whether the column exists
 */
export const isValidColumnKey = (
  columnKey: string,
  columns: TableColumn[]
): boolean => {
  return columns.some((col) => col.key === columnKey);
};

/**
 * Get column configuration by key
 * @param columnKey - Column key
 * @param columns - Array of columns
 * @returns Column configuration or undefined
 */
export const getColumnByKey = (
  columnKey: string,
  columns: TableColumn[]
): TableColumn | undefined => {
  return columns.find((col) => col.key === columnKey);
};

/**
 * Check if all required columns are present in data
 * @param data - Data object
 * @param columns - Columns to check
 * @returns Whether all required columns are present
 */
export const hasRequiredColumns = (
  data: Record<string, any>,
  columns: TableColumn[]
): boolean => {
  return columns.every((col) => col.key in data);
};
