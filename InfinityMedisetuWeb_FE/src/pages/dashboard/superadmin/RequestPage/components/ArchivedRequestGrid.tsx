import React from "react";
import type { RequestCard as RequestCardType } from "../types";
import { RequestCard } from "./RequestCard";

interface ArchivedRequestGridProps {
  archivedCards: RequestCardType[];
  isUpdating: boolean;
  onStatusChange?: (card: RequestCardType, selectedKeys: any) => void;
  onArchive?: (card: RequestCardType) => void;
  onUnarchive?: (card: RequestCardType) => void;
  onViewClinic?: (clinic: RequestCardType["clinic"]) => void;
}

/**
 * Grid display for archived request cards
 */
export const ArchivedRequestGrid: React.FC<ArchivedRequestGridProps> = ({
  archivedCards,
  isUpdating,
  onStatusChange,
  onArchive,
  onUnarchive,
  onViewClinic,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {archivedCards.map((card) => (
        <RequestCard
          key={card.id}
          card={card}
          isMobile
          isUpdating={isUpdating}
          onStatusChange={onStatusChange}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onViewClinic={(clinic) => onViewClinic?.(clinic)}
        />
      ))}
    </div>
  );
};
