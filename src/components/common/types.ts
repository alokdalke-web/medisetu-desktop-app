/**
 * CommonTable Component Types
 * Comprehensive type definitions for the reusable table component
 */

import React from "react";

/**
 * Represents a column configuration for the table
 */
export interface TableColumn {
  /** Unique identifier for the column */
  key: string;
  /** Display label for the column header */
  label: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Whether the column is searchable */
  searchable?: boolean;
  /** Fixed width for the column (e.g., "200px", "30%") */
  width?: string;
  /** Additional CSS classes for the column */
  className?: string;
  /** Whether to hide the column on mobile devices */
  hideOnMobile?: boolean;
  /** Alignment of the column content */
  align?: "left" | "center" | "right";
  /** Minimum width for the column */
  minWidth?: string;
  /** Maximum width for the column */
  maxWidth?: string;
}

/**
 * Represents a row action (button in actions column)
 */
export interface TableRowAction<T = any> {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the action */
  label: string;
  /** Icon component to display */
  icon?: React.ReactNode;
  /** Color variant for the action button */
  color?: "default" | "primary" | "success" | "warning" | "danger";
  /** Callback when action is clicked */
  onClick: (rowData: T, rowIndex: number) => void;
  /** Whether the action button should be disabled */
  isDisabled?: (rowData: T, rowIndex: number) => boolean;
  /** Whether to show a confirmation dialog before executing */
  confirmBeforeAction?: boolean;
  /** Confirmation message to display */
  confirmationMessage?: string;
  /** Tooltip text to display on hover */
  tooltip?: string;
  /** Additional CSS classes for the button */
  className?: string;
}

/**
 * Represents a filter option for the table
 */
export interface TableFilter {
  /** Unique identifier for the filter */
  id: string;
  /** Display label for the filter */
  label: string;
  /** Current value(s) of the filter */
  value: string | string[] | null;
  /** Type of filter */
  type: "select" | "multiselect" | "search" | "date" | "daterange" | "custom";
  /** Available options for select/multiselect filters */
  options?: Array<{ label: string; value: string | number }>;
  /** Placeholder text for the filter input */
  placeholder?: string;
  /** Whether the filter is active/applied */
  isActive?: boolean;
  /** Callback when filter value changes */
  onChange?: (value: string | string[] | null) => void;
  /** Custom render function for the filter input */
  renderInput?: (
    value: string | string[] | null,
    onChange: (value: string | string[] | null) => void
  ) => React.ReactNode;
}

/**
 * Represents the sort configuration
 */
export interface SortDescriptor {
  /** The column key to sort by */
  column: string;
  /** Sort direction */
  direction: "ascending" | "descending";
}

/**
 * Represents bulk action configuration
 */
export interface BulkAction<T = any> {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the action */
  label: string;
  /** Icon component to display */
  icon?: React.ReactNode;
  /** Color variant for the action button */
  color?: "default" | "primary" | "success" | "warning" | "danger";
  /** Callback when action is executed on selected rows */
  onClick: (selectedRows: T[]) => void | Promise<void>;
  /** Tooltip text to display on hover */
  tooltip?: string;
}

/**
 * Represents the state of selected rows
 */
export interface SelectionState {
  /** Set of selected row indices */
  selectedRows: Set<number>;
  /** Whether all rows are selected */
  selectAll: boolean;
  /** Whether some rows are selected (but not all) */
  selectSome: boolean;
}

/**
 * Configuration for row selection
 */
export interface RowSelectionConfig {
  /** Enable row selection */
  enabled: boolean;
  /** Allow single selection only */
  single?: boolean;
  /** Selection state */
  state?: SelectionState;
  /** Callback when selection changes */
  onChange?: (state: SelectionState) => void;
  /** Whether to show selection checkbox */
  showCheckbox?: boolean;
  /** Whether to disable selection for specific rows */
  isRowSelectable?: (rowData: any, rowIndex: number) => boolean;
}

/**
 * Configuration for pagination
 */
export interface PaginationConfig {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of rows per page */
  rowsPerPage: number;
  /** Available options for rows per page */
  rowsPerPageOptions?: number[];
  /** Total number of records */
  totalRecords: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when rows per page changes */
  onRowsPerPageChange: (value: number) => void;
  /** Whether to show pagination controls */
  showPagination?: boolean;
  /** Whether to show rows per page selector */
  showRowsPerPage?: boolean;
  /** Whether to show row count info */
  showRowCount?: boolean;
}

/**
 * Configuration for table loading and empty states
 */
export interface TableStateConfig {
  /** Whether the table is in loading state */
  isLoading?: boolean;
  /** Loading message to display */
  loadingMessage?: string;
  /** Whether the table is empty */
  isEmpty?: boolean;
  /** Empty state content to render */
  emptyStateContent?: React.ReactNode;
  /** Empty state title */
  emptyStateTitle?: string;
  /** Empty state description */
  emptyStateDescription?: string;
  /** Custom empty state render function */
  renderEmptyState?: () => React.ReactNode;
  /** Whether there was an error loading data */
  hasError?: boolean;
  /** Error message to display */
  errorMessage?: string;
}

/**
 * Main CommonTable component props
 */
export interface CommonTableProps<T = any> {
  /** Unique identifier for the table instance */
  id?: string;
  /** Table columns configuration */
  columns: TableColumn[];
  /** Table data rows */
  data: T[];
  /** Function to render custom cell content */
  renderCell?: (
    columnKey: string,
    rowData: T,
    rowIndex: number
  ) => React.ReactNode;
  /** Row actions configuration */
  rowActions?: TableRowAction<T>[];
  /** Bulk actions configuration */
  bulkActions?: BulkAction<T>[];
  /** Row selection configuration */
  rowSelection?: RowSelectionConfig;
  /** Pagination configuration */
  pagination?: PaginationConfig;
  /** Table state configuration (loading, empty, error) */
  state?: TableStateConfig;
  /** Sort configuration */
  sortDescriptor?: SortDescriptor;
  /** Callback when sort changes */
  onSortChange?: (column: string) => void;
  /** Filters configuration */
  filters?: TableFilter[];
  /** Whether to show table header */
  showHeader?: boolean;
  /** Whether to show table footer with pagination */
  showFooter?: boolean;
  /** Custom className for the table container */
  className?: string;
  /** Custom className for the table element */
  tableClassName?: string;
  /** Whether the table is striped (alternating row colors) */
  striped?: boolean;
  /** Whether to show hover effect on rows */
  hoverable?: boolean;
  /** Row click handler */
  onRowClick?: (rowData: T, rowIndex: number) => void;
  /** Whether rows are clickable */
  clickableRows?: boolean;
  /** Custom row className */
  rowClassName?: string | ((rowData: T, rowIndex: number) => string);
  /** Dense table layout (reduced padding) */
  dense?: boolean;
  /** Number of rows to display (for virtualization) */
  visibleRows?: number;
  /** Whether to enable keyboard navigation */
  keyboardNavigation?: boolean;
  /** Whether to show row numbers */
  showRowNumbers?: boolean;
  /** Whether the table should be responsive */
  responsive?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
  /** Additional properties for custom implementations */
  [key: string]: any;
}

/**
 * Cell render context with useful utilities
 */
export interface CellRenderContext<T = any> {
  /** The row data */
  rowData: T;
  /** The column key */
  columnKey: string;
  /** The row index */
  rowIndex: number;
  /** All columns configuration */
  columns: TableColumn[];
  /** Utility function to get display value */
  displayValue: (value?: string | number | null) => string;
}
