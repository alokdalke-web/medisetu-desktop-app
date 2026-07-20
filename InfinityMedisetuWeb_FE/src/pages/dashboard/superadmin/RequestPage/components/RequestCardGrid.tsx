import React from "react";
import { Chip } from "@heroui/react";
import type { RequestCard as RequestCardType, ActiveBoardStatus } from "../types";
import { STATUS_META, BOARD_STATUSES } from "../constants";
import { RequestCard } from "./RequestCard";

interface RequestCardGridProps {
  groupedRequests: Record<ActiveBoardStatus, RequestCardType[]>;
  isDragging: boolean;
  isUpdating: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, card: RequestCardType) => void;
  onDragEnd?: () => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>, status: ActiveBoardStatus) => void;
  onStatusChange?: (card: RequestCardType, selectedKeys: any) => void;
  onArchive?: (card: RequestCardType) => void;
  onUnarchive?: (card: RequestCardType) => void;
  onViewClinic?: (clinic: RequestCardType["clinic"]) => void;
}

/**
 * Desktop kanban-style board for managing request statuses
 */
export const RequestCardGrid: React.FC<RequestCardGridProps> = ({
  groupedRequests,
  isDragging,
  isUpdating,
  onDragStart,
  onDragEnd,
  onDrop,
  onStatusChange,
  onArchive,
  onUnarchive,
  onViewClinic,
}) => {
  return (
    <div className="request-board-scroll hidden overflow-x-auto pb-2 lg:block">
      <div className="grid min-w-[1180px] grid-cols-4 gap-4">
        {BOARD_STATUSES.map((status) => {
          const cards = groupedRequests[status];
          const statusMeta = STATUS_META[status];

          return (
            <div
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop?.(event, status)}
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
                    <RequestCard
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
  );
};
