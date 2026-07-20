import React from "react";
import { Chip } from "@heroui/react";
import type { RequestCard as RequestCardType, ActiveBoardStatus } from "../types";
import { STATUS_META, BOARD_STATUSES } from "../constants";
import { RequestCard } from "./RequestCard";

interface MobileRequestBoardProps {
  groupedRequests: Record<ActiveBoardStatus, RequestCardType[]>;
  isUpdating: boolean;
  onStatusChange?: (card: RequestCardType, selectedKeys: any) => void;
  onArchive?: (card: RequestCardType) => void;
  onUnarchive?: (card: RequestCardType) => void;
  onViewClinic?: (clinic: RequestCardType["clinic"]) => void;
}

/**
 * Mobile-optimized layout for displaying request cards by status
 */
export const MobileRequestBoard: React.FC<MobileRequestBoardProps> = ({
  groupedRequests,
  isUpdating,
  onStatusChange,
  onArchive,
  onUnarchive,
  onViewClinic,
}) => {
  return (
    <div className="space-y-4 lg:hidden">
      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {BOARD_STATUSES.map((status) => {
          const count = groupedRequests[status].length;
          const statusMeta = STATUS_META[status];

          return (
            <div
              key={status}
              className={`rounded-xl border px-3 py-3 ${statusMeta.className}`}
            >
              <Chip
                size="sm"
                variant="flat"
                color={statusMeta.color}
                className="font-semibold"
              >
                {status}
              </Chip>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {count}
              </p>
              <p className="text-xs text-slate-500">Requests</p>
            </div>
          );
        })}
      </div>

      {/* Request Cards by Status */}
      <div className="space-y-4">
        {BOARD_STATUSES.map((status) => {
          const cards = groupedRequests[status];

          if (cards.length === 0) return null;

          const statusMeta = STATUS_META[status];

          return (
            <div
              key={status}
              className={`rounded-2xl border p-3 ${statusMeta.className}`}
            >
              {/* Section Header */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Chip
                    size="sm"
                    variant="flat"
                    color={statusMeta.color}
                    className="font-semibold"
                  >
                    {status}
                  </Chip>
                  <span className="text-sm font-semibold text-slate-500">
                    {cards.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {cards.map((card) => (
                  <RequestCard
                    key={card.id}
                    card={card}
                    isMobile
                    isUpdating={isUpdating}
                    onStatusChange={onStatusChange}
                    onArchive={onArchive}
                    onUnarchive={onUnarchive}
                    onViewClinic={onViewClinic}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
