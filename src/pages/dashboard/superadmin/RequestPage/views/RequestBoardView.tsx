import React from "react";
import { Chip } from "@heroui/react";
import type { RequestCard, ActiveBoardStatus } from "../types";
import { STATUS_META, BOARD_STATUSES } from "../constants";
import { RequestCard as RequestCardComponent } from "../components/RequestCard";
import { SCROLLBAR_STYLES } from "../styles";

interface RequestBoardViewProps {
  groupedRequests: Record<ActiveBoardStatus, RequestCard[]>;
  isDragging: boolean;
  isUpdating: boolean;
  showArchived?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, card: RequestCard) => void;
  onDragEnd?: () => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>, status: ActiveBoardStatus) => void;
  onStatusChange?: (card: RequestCard, selectedKeys: any) => void;
  onArchive?: (card: RequestCard) => void;
  onUnarchive?: (card: RequestCard) => void;
  onViewClinic?: (clinic: RequestCard["clinic"]) => void;
}

/**
 * Kanban board view for managing requests with drag-and-drop
 */
export const RequestBoardView: React.FC<RequestBoardViewProps> = ({
  groupedRequests,
  isDragging,
  isUpdating,
  showArchived = false,
  onDragStart,
  onDragEnd,
  onDrop,
  onStatusChange,
  onArchive,
  onUnarchive,
  onViewClinic,
}) => {
  // Determine which statuses to display
  // When showing archived: display Archive header with all cards in groupedRequests.Pending
  // When showing active: display the 4 active statuses
  const statusesToDisplay = showArchived ? (["Archive"] as const) : BOARD_STATUSES;
  
  const getCardsForStatus = (status: string) => {
    if (showArchived || status === "Archive") {
      // All archived cards are in the "Pending" key as a placeholder
      return groupedRequests.Pending ?? [];
    }
    return groupedRequests[status as ActiveBoardStatus] ?? [];
  };
  return (
    <>
      <style>{SCROLLBAR_STYLES}</style>

      {/* Mobile View */}
      <div className="space-y-4 lg:hidden">
        {/* Status Summary */}
        <div className={`grid ${showArchived ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
          {statusesToDisplay.map((status) => {
            const cards = getCardsForStatus(status);
            const count = cards.length;
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

        {/* Cards by Status */}
        <div className="space-y-4">
          {statusesToDisplay.map((status) => {
            const cards = getCardsForStatus(status);

            if (cards.length === 0) return null;

            const statusMeta = STATUS_META[status];

            return (
              <div
                key={status}
                className={`rounded-2xl border p-3 ${statusMeta.className}`}
              >
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

                <div className="space-y-3">
                  {cards.map((card) => (
                    <RequestCardComponent
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

      {/* Desktop Kanban Board */}
      <div className="request-board-scroll hidden overflow-x-auto pb-2 lg:block">
        <div className={`grid ${showArchived ? "grid-cols-1" : "grid-cols-4"} min-w-[${showArchived ? "320" : "1180"}px] gap-4`}>
          {statusesToDisplay.map((status) => {
            const cards = getCardsForStatus(status);
            const statusMeta = STATUS_META[status];

            return (
              <div
                key={status}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  if (status !== "Archive") {
                    onDrop?.(event, status as ActiveBoardStatus);
                  }
                }}
                className={`flex h-[calc(100vh-300px)] min-h-[430px] max-h-[580px] flex-col overflow-hidden rounded-2xl border p-3 transition-colors ${statusMeta.className}`}
              >
                {/* Column Header */}
                <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
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

                {/* Cards Container */}
                <div className="request-board-scroll flex-1 space-y-3 overflow-y-auto pr-1.5">
                  {cards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                      Drop requests here
                    </div>
                  ) : (
                    cards.map((card) => (
                      <RequestCardComponent
                        key={card.id}
                        card={card}
                        isDragging={isDragging}
                        isUpdating={isUpdating}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onStatusChange={onStatusChange}
                        onArchive={onArchive}
                        onUnarchive={onUnarchive}
                        onViewClinic={onViewClinic}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default RequestBoardView;