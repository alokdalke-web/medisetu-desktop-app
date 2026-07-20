/**
 * CommonTable Component
 * A reusable, dynamic, and highly configurable table component
 * for use across the entire application
 */

import React, { useCallback, useState, forwardRef } from "react";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import {
  FiEye,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
} from "react-icons/fi";

import { CommonTableProps, TableRowAction, SelectionState } from "./types";
import {
  displayValue as utilDisplayValue,
  createInitialSelectionState,
  toggleRowSelection,
  toggleSelectAll,
  isRowSelected,
} from "./utils";
import CommonTableEmpty from "./CommonTableEmpty";
import CommonTableLoading from "./CommonTableLoading";
import CommonTableError from "./CommonTableError";
import CommonTablePagination from "./CommonTablePagination";
import { TABLE_CLASSES, ROW_SELECTION_CLASSES, ROW_ACTIONS_CLASSES } from "./constants";

// Default configurations
const DEFAULT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  rowsPerPage: 10,
  totalRecords: 0,
};

const DEFAULT_ROW_SELECTION = {
  enabled: false,
  single: false,
  showCheckbox: true,
};

// Component function with forwardRef
const CommonTableComponent = forwardRef<HTMLDivElement, CommonTableProps>(
  (
    {
      columns,
      data,
      renderCell,
      rowActions = [],
      rowSelection: rowSelectionConfig,
      pagination: paginationConfig,
      state: stateConfig = {},
      sortDescriptor,
      onSortChange,
      showHeader = true,
      showFooter = true,
      className = "",
      tableClassName = "",
      striped = true,
      dense = false,
      showRowNumbers = false,
      clickableRows = false,
      onRowClick,
      rowClassName = "",
    },
    ref
  ) => {
    const displayValue = useCallback(
      (value?: string | number | null) => utilDisplayValue(value),
      []
    );

    const {
      isLoading = false,
      loadingMessage = "Loading data...",
      isEmpty = data.length === 0,
      emptyStateContent,
      emptyStateTitle,
      emptyStateDescription,
      renderEmptyState,
      hasError = false,
      errorMessage,
    } = stateConfig;

    const {
      currentPage = DEFAULT_PAGINATION.currentPage,
      totalPages = DEFAULT_PAGINATION.totalPages,
      rowsPerPage = DEFAULT_PAGINATION.rowsPerPage,
      totalRecords = DEFAULT_PAGINATION.totalRecords,
      onPageChange = () => {},
      onRowsPerPageChange = () => {},
      showPagination = true,
      showRowsPerPage = true,
      showRowCount = true,
      rowsPerPageOptions = [6, 10, 15, 25, 50],
    } = paginationConfig || {};

    const {
      enabled: selectionEnabled = DEFAULT_ROW_SELECTION.enabled,
      single: singleSelection = DEFAULT_ROW_SELECTION.single,
      showCheckbox = DEFAULT_ROW_SELECTION.showCheckbox,
      isRowSelectable,
      state: externalSelectionState,
      onChange: onSelectionChange,
    } = rowSelectionConfig || {};

    // Selection state management
    const [internalSelectionState, setInternalSelectionState] =
      useState<SelectionState>(createInitialSelectionState());
    const selectionState = externalSelectionState || internalSelectionState;

    const handleSelectionChange = useCallback(
      (newState: SelectionState) => {
        setInternalSelectionState(newState);
        onSelectionChange?.(newState);
      },
      [onSelectionChange]
    );

    // Action confirmation modal state
    const [confirmAction, setConfirmAction] = useState<{
      action: TableRowAction;
      rowData: any;
      rowIndex: number;
    } | null>(null);

    // Handle row selection toggle
    const handleToggleRowSelection = useCallback(
      (rowIndex: number) => {
        if (!selectionEnabled) return;
        if (isRowSelectable && !isRowSelectable(data[rowIndex], rowIndex))
          return;

        const newState = toggleRowSelection(
          selectionState,
          rowIndex,
          singleSelection
        );
        handleSelectionChange(newState);
      },
      [
        selectionEnabled,
        data,
        selectionState,
        singleSelection,
        isRowSelectable,
        handleSelectionChange,
      ]
    );

    // Handle select all toggle
    const handleToggleSelectAll = useCallback(() => {
      if (!selectionEnabled) return;
      const newState = toggleSelectAll(selectionState, data.length);
      handleSelectionChange(newState);
    }, [selectionEnabled, data.length, selectionState, handleSelectionChange]);

    // Handle row action
    const handleRowAction = useCallback(
      (action: TableRowAction, rowData: any, rowIndex: number) => {
        if (action.confirmBeforeAction) {
          setConfirmAction({ action, rowData, rowIndex });
        } else {
          action.onClick(rowData, rowIndex);
        }
      },
      []
    );

    // Confirm action
    const handleConfirmAction = useCallback(() => {
      if (confirmAction) {
        confirmAction.action.onClick(confirmAction.rowData, confirmAction.rowIndex);
        setConfirmAction(null);
      }
    }, [confirmAction]);

    // Cancel action
    const handleCancelAction = useCallback(() => {
      setConfirmAction(null);
    }, []);

    // Get row className
    const getRowClassName = useCallback(
      (rowData: any, rowIndex: number): string => {
        let className = TABLE_CLASSES.tr;

        if (dense) {
          className = TABLE_CLASSES.tr_dense;
        }

        if (striped && rowIndex % 2 !== 0) {
          className += ` ${TABLE_CLASSES.tr_striped_even}`;
        }

        if (clickableRows) {
          className += " cursor-pointer";
        }

        if (typeof rowClassName === "function") {
          className += ` ${rowClassName(rowData, rowIndex)}`;
        } else if (rowClassName) {
          className += ` ${rowClassName}`;
        }

        return className;
      },
      [dense, striped, clickableRows, rowClassName]
    );

    // Render default cell
    const renderDefaultCell = useCallback(
      (columnKey: string, rowData: any): React.ReactNode => {
        const value = rowData[columnKey];
        return displayValue(value);
      },
      [displayValue]
    );

    // Show loading state
    if (isLoading) {
      return (
        <div ref={ref} className={className}>
          <CommonTableLoading message={loadingMessage} />
        </div>
      );
    }

    // Show error state
    if (hasError) {
      return (
        <div ref={ref} className={className}>
          <CommonTableError message={errorMessage} />
        </div>
      );
    }

    // Show empty state
    if (isEmpty) {
      return (
        <div ref={ref} className={className}>
          {emptyStateContent ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              {emptyStateContent}
            </div>
          ) : renderEmptyState ? (
            renderEmptyState()
          ) : (
            <CommonTableEmpty
              title={emptyStateTitle}
              description={emptyStateDescription}
            />
          )}
        </div>
      );
    }

    return (
      <>
        <div ref={ref} className={`${className}`}>
          {/* Table Container */}
          <div className={TABLE_CLASSES.container}>
            <div className="overflow-x-auto">
              <table
                className={`${TABLE_CLASSES.table} ${tableClassName}`}
                role="table"
                aria-label="Data table"
              >
                {/* Table Header */}
                {showHeader && (
                  <thead className={TABLE_CLASSES.thead}>
                    <tr className={TABLE_CLASSES.thead_tr}>
                      {/* Checkbox for row selection */}
                      {selectionEnabled && showCheckbox && (
                        <th className={ROW_SELECTION_CLASSES.cell}>
                          <input
                            type="checkbox"
                            className={ROW_SELECTION_CLASSES.checkbox}
                            checked={selectionState.selectAll}
                            onChange={handleToggleSelectAll}
                            aria-label="Select all rows"
                          />
                        </th>
                      )}

                      {/* Row numbers */}
                      {showRowNumbers && (
                        <th className={TABLE_CLASSES.th} style={{ width: "50px" }}>
                          #
                        </th>
                      )}

                      {/* Column headers */}
                      {columns.map((column: any) => (
                        <th
                          key={column.key}
                          className={`${TABLE_CLASSES.th} ${column.className || ""}`}
                          style={{
                            width: column.width,
                            minWidth: column.minWidth,
                            maxWidth: column.maxWidth,
                            textAlign: column.align || "left",
                          }}
                          scope="col"
                        >
                          <div className="flex items-center gap-2">
                            <span>{column.label}</span>
                            {column.sortable && onSortChange && (
                              <button
                                onClick={() => onSortChange(column.key)}
                                className="hover:text-primary transition-colors"
                                title={`Sort by ${column.label}`}
                                aria-label={`Sort by ${column.label}`}
                              >
                                {sortDescriptor?.column === column.key ? (
                                  sortDescriptor?.direction === "ascending" ? (
                                    <FiChevronUp size={14} />
                                  ) : (
                                    <FiChevronDown size={14} />
                                  )
                                ) : (
                                  <FiChevronDown size={14} className="opacity-50" />
                                )}
                              </button>
                            )}
                          </div>
                        </th>
                      ))}

                      {/* Actions column header */}
                      {rowActions.length > 0 && (
                        <th
                          className={`${TABLE_CLASSES.th} text-center`}
                          scope="col"
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                )}

                {/* Table Body */}
                <tbody className={TABLE_CLASSES.tbody}>
                  {data.map((row: any, index: number) => (
                    <tr
                      key={row.id || row._id || index}
                      className={getRowClassName(row, index)}
                      onClick={() => {
                        if (clickableRows && onRowClick) {
                          onRowClick(row, index);
                        }
                      }}
                      role="row"
                    >
                      {/* Checkbox for row selection */}
                      {selectionEnabled && showCheckbox && (
                        <td className={ROW_SELECTION_CLASSES.cell}>
                          <input
                            type="checkbox"
                            className={ROW_SELECTION_CLASSES.checkbox}
                            checked={isRowSelected(selectionState, index)}
                            onChange={() => handleToggleRowSelection(index)}
                            disabled={
                              isRowSelectable
                                ? !isRowSelectable(row, index)
                                : false
                            }
                            aria-label={`Select row ${index + 1}`}
                          />
                        </td>
                      )}

                      {/* Row number */}
                      {showRowNumbers && (
                        <td
                          className={`${TABLE_CLASSES.td} text-center text-xs text-slate-500`}
                        >
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </td>
                      )}

                      {/* Data cells */}
                      {columns.map((column: any) => (
                        <td
                          key={`${column.key}-${index}`}
                          className={`${TABLE_CLASSES.td} ${column.className || ""}`}
                          style={{
                            width: column.width,
                            minWidth: column.minWidth,
                            maxWidth: column.maxWidth,
                            textAlign: column.align || "left",
                          }}
                        >
                          {renderCell
                            ? renderCell(column.key, row, index)
                            : renderDefaultCell(column.key, row)}
                        </td>
                      ))}

                      {/* Actions cell */}
                      {rowActions.length > 0 && (
                        <td className={ROW_ACTIONS_CLASSES.cell}>
                          {rowActions.length === 1 ? (
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowAction(rowActions[0], row, index);
                              }}
                              isDisabled={rowActions[0].isDisabled?.(row, index)}
                              title={rowActions[0].tooltip || rowActions[0].label}
                              className={ROW_ACTIONS_CLASSES.singleButton}
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
                                  aria-label="Row actions"
                                >
                                  <FiChevronDown size={18} />
                                </Button>
                              </DropdownTrigger>
                              <DropdownMenu
                                aria-label="Row actions"
                                onAction={(key) => {
                                  const action = rowActions.find(
                                    (a: any) => a.id === String(key)
                                  );
                                  if (action) {
                                    handleRowAction(action, row, index);
                                  }
                                }}
                              >
                                {rowActions.map((action: any) => (
                                  <DropdownItem
                                    key={action.id}
                                    color={action.color}
                                    isDisabled={action.isDisabled?.(row, index)}
                                    startContent={action.icon}
                                    title={action.tooltip}
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

            {/* Pagination Footer inside table container */}
            {showFooter && totalRecords > 0 && (
              <div className={TABLE_CLASSES.footer}>
                <CommonTablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  rowsPerPage={rowsPerPage}
                  totalRecords={totalRecords}
                  onPageChange={onPageChange}
                  onRowsPerPageChange={onRowsPerPageChange}
                  showPagination={showPagination}
                  showRowsPerPage={showRowsPerPage}
                  showRowCount={showRowCount}
                  rowsPerPageOptions={rowsPerPageOptions}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Confirmation Modal */}
        {confirmAction && (
          <Modal isOpen={true} onClose={handleCancelAction}>
            <ModalContent>
              <ModalHeader className="flex flex-col gap-1">
                Confirm Action
              </ModalHeader>
              <ModalBody>
                <p>
                  {confirmAction.action.confirmationMessage ||
                    `Are you sure you want to ${confirmAction.action.label.toLowerCase()}?`}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="light"
                  onPress={handleCancelAction}
                >
                  Cancel
                </Button>
                <Button
                  color={confirmAction.action.color || "primary"}
                  onPress={handleConfirmAction}
                  startContent={<FiCheck size={18} />}
                >
                  Confirm
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </>
    );
  }
);

CommonTableComponent.displayName = "CommonTable";

export default CommonTableComponent;
