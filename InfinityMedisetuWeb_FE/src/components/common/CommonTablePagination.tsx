/**
 * CommonTable Pagination Component
 * Handles pagination controls and row count display
 */

import React, { useMemo } from "react";
import { Pagination } from "@heroui/react";
import { PaginationConfig } from "./types";
import { calculatePaginationInfo } from "./utils";

interface CommonTablePaginationProps extends Partial<PaginationConfig> {
  /** Total number of records */
  totalRecords: number;
  /** Current page number */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Rows per page */
  rowsPerPage: number;
  /** Whether to show pagination controls */
  showPagination?: boolean;
  /** Whether to show rows per page selector */
  showRowsPerPage?: boolean;
  /** Whether to show row count info */
  showRowCount?: boolean;
  /** Available options for rows per page */
  rowsPerPageOptions?: number[];
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when rows per page changes */
  onRowsPerPageChange: (value: number) => void;
}

const CommonTablePagination: React.FC<CommonTablePaginationProps> = ({
  totalRecords,
  currentPage,
  totalPages,
  rowsPerPage,
  showPagination = true,
  showRowsPerPage = true,
  showRowCount = true,
  rowsPerPageOptions = [6, 10, 15, 25, 50],
  onPageChange,
  onRowsPerPageChange,
}) => {
  const paginationInfo = useMemo(
    () => calculatePaginationInfo(currentPage, rowsPerPage, totalRecords),
    [currentPage, rowsPerPage, totalRecords]
  );

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between w-full">
      {/* Row Count Information */}
      <div className="text-sm text-slate-600 order-2 md:order-1">
        {showRowCount && totalRecords > 0 && (
          <span className="text-xs sm:text-sm">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {paginationInfo.start}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {paginationInfo.end}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {totalRecords}
            </span>{" "}
            records
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 order-1 md:order-2 w-full md:w-auto">
        {/* Rows Per Page Selector */}
        {showRowsPerPage && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="table-rows-per-page"
              className="text-xs sm:text-sm font-medium text-slate-600 whitespace-nowrap"
            >
              Rows per page:
            </label>
            <select
              id="table-rows-per-page"
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Rows per page"
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Navigation */}
        {showPagination && totalPages > 1 && (
          <div className="flex justify-center sm:justify-end">
            <Pagination
              isCompact
              showControls
              color="primary"
              page={currentPage}
              total={totalPages}
              onChange={onPageChange}
              className="gap-1 sm:gap-2"
              classNames={{
                item: "w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm font-medium rounded-xl",
                cursor:
                  "w-8 h-8 sm:w-10 sm:h-10 bg-primary text-white font-semibold rounded-xl shadow-md",
              }}
              aria-label="Table pagination"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommonTablePagination;
