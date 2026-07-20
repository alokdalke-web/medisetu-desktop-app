import React from "react";
import { Button, Chip } from "@heroui/react";
import {
  FiCheckCircle,
  FiXCircle,
  FiArchive,
  FiDownload,
  FiX,
} from "react-icons/fi";

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkArchive: () => void;
  onExport: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

/**
 * Bulk Actions Bar
 * Displays selected count and action buttons
 * Only enabled when rows are selected
 */
export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onBulkApprove,
  onBulkReject,
  onBulkArchive,
  onExport,
  onClearSelection,
  isLoading = false,
}) => {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
      {/* Selection Display */}
      <div className="flex items-center gap-3">
        <Chip
          color="primary"
          variant="flat"
          className="font-semibold text-sm"
          startContent={
            hasSelection ? (
              <span className="h-2 w-2 rounded-full bg-primary-500" />
            ) : null
          }
        >
          {selectedCount} {selectedCount === 1 ? "Item" : "Items"} Selected
        </Chip>

        {hasSelection && (
          <button
            onClick={onClearSelection}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            title="Clear selection"
          >
            <FiX className="inline mr-1" />
            Clear
          </button>
        )}
      </div>

      {/* Actions */}
      {hasSelection && (
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <Button
            isIconOnly={false}
            size="sm"
            color="success"
            variant="flat"
            startContent={<FiCheckCircle size={16} />}
            onClick={onBulkApprove}
            isLoading={isLoading}
            disabled={isLoading || selectedCount === 0}
            className="font-semibold"
          >
            Approve
          </Button>

          <Button
            isIconOnly={false}
            size="sm"
            color="danger"
            variant="flat"
            startContent={<FiXCircle size={16} />}
            onClick={onBulkReject}
            isLoading={isLoading}
            disabled={isLoading || selectedCount === 0}
            className="font-semibold"
          >
            Reject
          </Button>

          <Button
            isIconOnly={false}
            size="sm"
            color="warning"
            variant="flat"
            startContent={<FiArchive size={16} />}
            onClick={onBulkArchive}
            isLoading={isLoading}
            disabled={isLoading || selectedCount === 0}
            className="font-semibold"
          >
            Archive
          </Button>

          <Button
            isIconOnly={false}
            size="sm"
            variant="flat"
            startContent={<FiDownload size={16} />}
            onClick={onExport}
            disabled={isLoading || selectedCount === 0}
            className="font-semibold"
          >
            Export
          </Button>
        </div>
      )}
    </div>
  );
};

export default BulkActionsBar;
