import React, { useState, useCallback, useMemo } from "react";
import { Avatar, Chip, addToast } from "@heroui/react";
import { FiEye, FiArchive } from "react-icons/fi";
import CommonTable from "../../../../../components/common/CommonTable";
import { RequestListSidebar } from "../components";
import BulkActionsBar from "../components/BulkActionsBar";
import BulkActionConfirmModal from "../components/BulkActionConfirmModal";
import BulkApproveModal from "../components/BulkApproveModal";
import BulkRejectModal from "../components/BulkRejectModal";
import BulkAssignModal from "../components/BulkAssignModal";
import type { RequestCard, BulkActionType } from "../types";
import { STATUS_META } from "../constants";
import { formatDate } from "../../../../../utils";
import type { SelectionState } from "../../../../../components/common/types";

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

interface ExportData {
  doctorName: string;
  clinicName: string;
  speciality: string;
  registrationNumber: string;
  status: string;
  createdAt: string;
  email: string;
  phone: string;
}

const escapeCSV = (value: string): string => {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const exportToCSV = (data: ExportData[], filename: string) => {
  const headers = [
    "Doctor Name",
    "Clinic Name",
    "Specialty",
    "Registration Number",
    "Status",
    "Created Date",
    "Email",
    "Phone",
  ];

  const csvContent = [
    headers.join(","),
    ...data.map(row =>
      [
        escapeCSV(row.doctorName),
        escapeCSV(row.clinicName),
        escapeCSV(row.speciality),
        escapeCSV(row.registrationNumber),
        escapeCSV(row.status),
        escapeCSV(row.createdAt),
        escapeCSV(row.email),
        escapeCSV(row.phone),
      ].join(",")
    ),
  ].join("\n");

  downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8");
};

const exportToJSON = (data: ExportData[], filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, "application/json;charset=utf-8");
};

const exportToExcel = (data: ExportData[], filename: string) => {
  const headers = [
    "Doctor Name",
    "Clinic Name",
    "Specialty",
    "Registration Number",
    "Status",
    "Created Date",
    "Email",
    "Phone",
  ];

  const tsvContent = [
    headers.join("\t"),
    ...data.map(row =>
      [
        row.doctorName,
        row.clinicName,
        row.speciality,
        row.registrationNumber,
        row.status,
        row.createdAt,
        row.email,
        row.phone,
      ].join("\t")
    ),
  ].join("\n");

  downloadFile(tsvContent, `${filename}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8");
};

// ============================================================================
// INTERFACES
// ============================================================================

interface RequestListViewProps {
  cards: RequestCard[];
  isUpdating: boolean;
  onArchive?: (card: RequestCard) => void;
  onUnarchive?: (card: RequestCard) => void;
  onViewClinic?: (clinic: RequestCard["clinic"]) => void;
  onBulkApprove?: (requestIds: string[]) => Promise<void>;
  onBulkReject?: (requestIds: string[], reason?: string) => Promise<void>;
  onBulkAssign?: (requestIds: string[], assignedTo: string, notes?: string) => Promise<void>;
}

interface Row {
  id: string;
  requester: { name: string; email: string };
  type: string;
  speciality: string;
  regNo: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  assigned: string;
  actions: RequestCard;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * List view with table rendering for clinic requests
 */
export const RequestListView: React.FC<RequestListViewProps> = ({
  cards,
  isUpdating,
  onArchive,
  onUnarchive,
  onViewClinic,
  onBulkApprove,
  onBulkReject,
  onBulkAssign,
}) => {
  // State
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<BulkActionType | null>(null);
  const [isExecutingBulk, setIsExecutingBulk] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Bulk action modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Data
  const rows: Row[] = cards.map((card) => ({
    id: card.id,
    requester: {
      name: card.doctor.name ?? "Unknown",
      email: card.doctor.email ?? "—",
    },
    type: card.clinic.name ? "Clinic" : "Doctor",
    speciality: card.doctor.speciality ?? "—",
    regNo: card.doctor.registrationNumber ?? "—",
    date: formatDate(card.createdAt ?? new Date().toISOString()),
    priority: "High",
    status: card.status,
    assigned: "Unassigned",
    actions: card,
  }));

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return rows.slice(startIndex, endIndex);
  }, [rows, currentPage, rowsPerPage]);

  // Map table row indices to card IDs for selection
  const rowIndexToIdMap = useMemo(() => {
    const map = new Map<number, string>();
    paginatedRows.forEach((row, index) => map.set(index, row.id));
    return map;
  }, [paginatedRows]);

  const idToRowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    paginatedRows.forEach((row, index) => map.set(row.id, index));
    return map;
  }, [paginatedRows]);

  // Compute table selection state from selectedRows and paginatedRows
  const tableSelectionState = useMemo<SelectionState>(() => {
    const selectedRowIndices = new Set<number>();
    paginatedRows.forEach((row, index) => {
      if (selectedRows.has(row.id)) {
        selectedRowIndices.add(index);
      }
    });

    return {
      selectedRows: selectedRowIndices,
      selectAll: selectedRowIndices.size === paginatedRows.length && paginatedRows.length > 0,
      selectSome: selectedRowIndices.size > 0 && selectedRowIndices.size < paginatedRows.length,
    };
  }, [paginatedRows, selectedRows]);

  // Columns configuration for CommonTable
  const columns = [
    { key: "requester", label: "Requester", width: "200px" },
    { key: "type", label: "Type", width: "80px" },
    { key: "speciality", label: "Specialty", width: "150px" },
    { key: "regNo", label: "Reg. No.", width: "100px" },
    { key: "date", label: "Date", width: "140px" },
    { key: "priority", label: "Priority", width: "100px" },
    { key: "status", label: "Status", width: "120px" },
  ];

  // Row actions configuration for CommonTable
  const rowActions = [
    {
      id: "view",
      label: "View",
      icon: <FiEye size={16} />,
      color: "primary" as const,
      onClick: (row: Row) => onViewClinic?.(row.actions.clinic),
    },
    {
      id: "archive",
      label: "Archive",
      icon: <FiArchive size={16} />,
      color: "warning" as const,
      onClick: (row: Row) => {
        if (row.actions.status === "Archive") {
          onUnarchive?.(row.actions);
        } else {
          onArchive?.(row.actions);
        }
      },
    },
  ];

  // Handlers
  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  // Handle row selection changes from CommonTable
  const handleSelectionChange = useCallback((newState: SelectionState) => {
    // Convert row indices to card IDs
    const newSelectedIds = new Set<string>();
    newState.selectedRows.forEach((rowIndex) => {
      const cardId = rowIndexToIdMap.get(rowIndex);
      if (cardId) {
        newSelectedIds.add(cardId);
      }
    });
    
    // Keep previously selected items from other pages and update current page items
    setSelectedRows(prev => {
      const updated = new Set(prev);
      // Remove any items from current page that are not in new selection
      idToRowIndexMap.forEach((_, cardId) => {
        if (!newSelectedIds.has(cardId)) {
          updated.delete(cardId);
        }
      });
      // Add new selected items
      newSelectedIds.forEach(id => updated.add(id));
      return updated;
    });
  }, [rowIndexToIdMap, idToRowIndexMap]);

  const handleBulkExport = useCallback(() => {
    if (selectedRows.size === 0) {
      addToast({
        title: "No selection",
        description: "Please select items to export",
        color: "warning",
      });
      return;
    }
    setPendingBulkAction("export");
    setShowConfirmModal(true);
  }, [selectedRows.size]);

  const handleConfirmExport = useCallback(
    (format?: string) => {
      const selectedFormat = format as "csv" | "json" | "excel";
      const selectedCards = cards.filter(c => selectedRows.has(c.id));

      if (selectedCards.length === 0) {
        addToast({
          title: "No items selected",
          description: "Please select items to export",
          color: "warning",
        });
        return;
      }

      setIsExecutingBulk(true);

      try {
        const exportData = selectedCards.map(card => ({
          doctorName: card.doctor.name ?? "—",
          clinicName: card.clinic.name ?? "—",
          speciality: card.doctor.speciality ?? "—",
          registrationNumber: card.doctor.registrationNumber ?? "—",
          status: card.status,
          createdAt: card.createdAt ? formatDate(card.createdAt) : "—",
          email: card.doctor.email ?? "—",
          phone: card.doctor.mobile ?? "—",
        }));

        const timestamp = new Date().toISOString().split("T")[0];
        const filename = `clinic-requests-${timestamp}`;

        if (selectedFormat === "csv") {
          exportToCSV(exportData, filename);
        } else if (selectedFormat === "json") {
          exportToJSON(exportData, filename);
        } else if (selectedFormat === "excel") {
          exportToExcel(exportData, filename);
        }

        addToast({
          title: "Success",
          description: `${selectedCards.length} requests exported as ${selectedFormat.toUpperCase()}`,
          color: "success",
        });

        setSelectedRows(new Set());
        setShowConfirmModal(false);
        setPendingBulkAction(null);
      } catch (error: any) {
        addToast({
          title: "Export Failed",
          description: error?.message || "Failed to export data",
          color: "danger",
        });
      } finally {
        setIsExecutingBulk(false);
      }
    },
    [cards, selectedRows],
  );

  const handleCancelModal = useCallback(() => {
    setShowConfirmModal(false);
    setPendingBulkAction(null);
  }, []);

  // Bulk Action Handlers
  const handleBulkApprove = useCallback(() => {
    if (selectedRows.size === 0) {
      addToast({
        title: "No selection",
        description: "Please select items to approve",
        color: "warning",
      });
      return;
    }
    setShowApproveModal(true);
  }, [selectedRows.size]);

  const handleConfirmBulkApprove = useCallback(async () => {
    try {
      setIsExecutingBulk(true);
      const requestIds = Array.from(selectedRows);
      await onBulkApprove?.(requestIds);

      addToast({
        title: "Success",
        description: `${requestIds.length} requests approved successfully`,
        color: "success",
      });

      setSelectedRows(new Set());
      setShowApproveModal(false);
    } catch (error: any) {
      addToast({
        title: "Approval Failed",
        description: error?.message || "Failed to approve requests",
        color: "danger",
      });
    } finally {
      setIsExecutingBulk(false);
    }
  }, [selectedRows, onBulkApprove]);

  const handleBulkReject = useCallback(() => {
    if (selectedRows.size === 0) {
      addToast({
        title: "No selection",
        description: "Please select items to reject",
        color: "warning",
      });
      return;
    }
    setShowRejectModal(true);
  }, [selectedRows.size]);

  const handleConfirmBulkReject = useCallback(
    async (reason?: string) => {
      try {
        setIsExecutingBulk(true);
        const requestIds = Array.from(selectedRows);
        await onBulkReject?.(requestIds, reason);

        addToast({
          title: "Success",
          description: `${requestIds.length} requests rejected successfully`,
          color: "success",
        });

        setSelectedRows(new Set());
        setShowRejectModal(false);
      } catch (error: any) {
        addToast({
          title: "Rejection Failed",
          description: error?.message || "Failed to reject requests",
          color: "danger",
        });
      } finally {
        setIsExecutingBulk(false);
      }
    },
    [selectedRows, onBulkReject],
  );

  const handleBulkAssign = useCallback(() => {
    if (selectedRows.size === 0) {
      addToast({
        title: "No selection",
        description: "Please select items to assign",
        color: "warning",
      });
      return;
    }
    setShowAssignModal(true);
  }, [selectedRows.size]);

  const handleConfirmBulkAssign = useCallback(
    async (assignedTo: string, notes?: string) => {
      try {
        setIsExecutingBulk(true);
        const requestIds = Array.from(selectedRows);
        await onBulkAssign?.(requestIds, assignedTo, notes);

        addToast({
          title: "Success",
          description: `${requestIds.length} requests assigned to ${assignedTo}`,
          color: "success",
        });

        setSelectedRows(new Set());
        setShowAssignModal(false);
      } catch (error: any) {
        addToast({
          title: "Assignment Failed",
          description: error?.message || "Failed to assign requests",
          color: "danger",
        });
      } finally {
        setIsExecutingBulk(false);
      }
    },
    [selectedRows, onBulkAssign],
  );

  const renderCell = (key: string, row: Row) => {
    switch (key) {
      case "requester":
        return (
          <div className="flex items-center gap-2">
            <Avatar
              name={row.requester.name.substring(0, 2).toUpperCase()}
              size="sm"
              className="bg-primary text-white"
            />
            <div>
              <p className="font-medium text-slate-900">{row.requester.name}</p>
              <p className="text-xs text-slate-500">{row.requester.email}</p>
            </div>
          </div>
        );

      case "type":
        return (
          <Chip
            size="sm"
            variant="flat"
            color={row.type === "Clinic" ? "primary" : "default"}
            className="font-medium"
          >
            {row.type}
          </Chip>
        );

      case "priority":
        const priorityColor =
          row.priority === "High"
            ? "danger"
            : row.priority === "Medium"
              ? "warning"
              : "success";
        return (
          <Chip size="sm" variant="flat" color={priorityColor}>
            ● {row.priority}
          </Chip>
        );

      case "status":
        const statusMeta = STATUS_META[row.status as keyof typeof STATUS_META];
        return (
          <Chip
            size="sm"
            variant="flat"
            color={statusMeta.color}
            className="font-medium"
          >
            {row.status}
          </Chip>
        );

      default:
        const cellValue = row[key as keyof Row];
        if (typeof cellValue === "string" || typeof cellValue === "number") {
          return <span className="text-slate-700">{cellValue}</span>;
        }
        return <span className="text-slate-700">—</span>;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Main Content - Table */}
      <div className="lg:col-span-3 space-y-4">
        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedRows.size}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onBulkArchive={() => {
            addToast({
              title: "Coming Soon",
              description: "Bulk archive feature will be implemented soon",
              color: "default",
            });
          }}
          onExport={handleBulkExport}
          onClearSelection={clearSelection}
          isLoading={isExecutingBulk || isUpdating}
        />

        {/* Table */}
        <CommonTable
          columns={columns}
          data={paginatedRows}
          state={{
            isLoading: isUpdating,
            isEmpty: rows.length === 0,
            emptyStateContent: (
              <div className="text-center">
                <p className="text-sm font-medium text-slate-900">
                  No clinic requests found
                </p>
                <p className="text-xs text-slate-500">
                  Try adjusting your filters or date range
                </p>
              </div>
            ),
          }}
          pagination={{
            currentPage,
            totalPages: Math.ceil(rows.length / rowsPerPage),
            rowsPerPage,
            totalRecords: rows.length,
            onPageChange: setCurrentPage,
            onRowsPerPageChange: (value: number) => {
              setRowsPerPage(value);
              setCurrentPage(1);
            },
          }}
          rowSelection={{
            enabled: true,
            state: tableSelectionState,
            onChange: handleSelectionChange,
          }}
          rowActions={rowActions}
          renderCell={renderCell}
        />
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-4">
          <RequestListSidebar
            cards={cards}
            isLoading={isUpdating}
            selectedCount={selectedRows.size}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onBulkAssign={handleBulkAssign}
            onExportReport={handleBulkExport}
          />
        </div>
      </div>

      {/* Confirmation Modals */}
      <BulkActionConfirmModal
        isOpen={showConfirmModal}
        action={pendingBulkAction}
        selectedCount={selectedRows.size}
        isLoading={isExecutingBulk}
        onConfirm={handleConfirmExport}
        onCancel={handleCancelModal}
      />

      <BulkApproveModal
        isOpen={showApproveModal}
        selectedCount={selectedRows.size}
        isLoading={isExecutingBulk}
        onConfirm={handleConfirmBulkApprove}
        onCancel={() => setShowApproveModal(false)}
      />

      <BulkRejectModal
        isOpen={showRejectModal}
        selectedCount={selectedRows.size}
        isLoading={isExecutingBulk}
        onConfirm={handleConfirmBulkReject}
        onCancel={() => setShowRejectModal(false)}
      />

      <BulkAssignModal
        isOpen={showAssignModal}
        selectedCount={selectedRows.size}
        isLoading={isExecutingBulk}
        onConfirm={handleConfirmBulkAssign}
        onCancel={() => setShowAssignModal(false)}
      />
    </div>
  );
};

export default RequestListView;
