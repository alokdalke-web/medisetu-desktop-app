import React from "react";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
  Spinner,
} from "@heroui/react";
import { FiEye, FiChevronDown } from "react-icons/fi";

interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface RowActionConfig {
  label: string;
  icon?: React.ReactNode;
  color?: "default" | "primary" | "success" | "warning" | "danger";
  onClick: (rowData: any) => void;
  isDisabled?: (rowData: any) => boolean;
}

interface ProfileRequestTableProps {
  columns: ColumnConfig[];
  data: any[];
  isLoading?: boolean;
  rowsPerPage?: number;
  onRowsPerPageChange?: (value: number) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  renderCell: (columnKey: string, rowData: any) => React.ReactNode;
  rowActions?: RowActionConfig[];
  emptyStateContent?: React.ReactNode;
  sortDescriptor?: { column: string; direction: "ascending" | "descending" };
  onSortChange?: (column: string) => void;
  showRowCount?: boolean;
  totalRecords?: number;
}

const ProfileRequestTable: React.FC<ProfileRequestTableProps> = ({
  columns,
  data,
  isLoading = false,
  rowsPerPage = 10,
  onRowsPerPageChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  renderCell,
  rowActions = [],
  emptyStateContent,
  showRowCount = true,
  totalRecords = 0,
}) => {
  const handlePageChange = (page: number) => {
    onPageChange?.(page);
  };

  const handleRowsPerPageChange = (value: string) => {
    onRowsPerPageChange?.(Number(value));
  };

  const startRecord = (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-lg border border-slate-200 py-16">
        <Spinner label="Loading profile requests..." />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        {emptyStateContent}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <FiChevronDown className="text-xs opacity-50" />
                      )}
                    </div>
                  </th>
                ))}
                {rowActions.length > 0 && (
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={row.id || row._id || index}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={`${column.key}-${index}`}
                      className="px-4 py-3 text-sm text-slate-900"
                    >
                      {renderCell(column.key, row)}
                    </td>
                  ))}

                  {rowActions.length > 0 && (
                    <td className="px-4 py-3 text-center">
                      {rowActions.length === 1 ? (
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            rowActions[0].onClick(row);
                          }}
                          isDisabled={rowActions[0].isDisabled?.(row)}
                          title={rowActions[0].label}
                        >
                          {rowActions[0].icon || <FiEye size={18} />}
                        </Button>
                      ) : (
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              className="hover:bg-slate-100"
                            >
                              <FiChevronDown size={18} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label="Row actions"
                            onAction={(key) => {
                              const action = rowActions.find(
                                (a) => a.label === key
                              );
                              if (action) {
                                action.onClick(row);
                              }
                            }}
                          >
                            {rowActions.map((action) => (
                              <DropdownItem
                                key={action.label}
                                color={action.color}
                                isDisabled={action.isDisabled?.(row)}
                                startContent={action.icon}
                              >
                                {action.label}
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination and Row Count */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="text-sm text-slate-600">
          {showRowCount && totalRecords > 0 && (
            <span>
              Showing <span className="font-semibold text-slate-900">{startRecord}</span> to{" "}
              <span className="font-semibold text-slate-900">{endRecord}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalRecords}</span> requests
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="rowsPerPage"
              className="text-sm font-medium text-slate-600"
            >
              Rows per page:
            </label>
            <select
              id="rowsPerPage"
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="6">6</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </div>

          {totalPages > 1 && (
            <Pagination
              isCompact
              showControls
              color="primary"
              page={currentPage}
              total={totalPages}
              onChange={handlePageChange}
              className="gap-2"
              classNames={{
                item: "w-8 h-8 text-sm font-medium",
                cursor:
                  "w-8 h-8 bg-primary text-white font-semibold rounded-lg",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileRequestTable;
