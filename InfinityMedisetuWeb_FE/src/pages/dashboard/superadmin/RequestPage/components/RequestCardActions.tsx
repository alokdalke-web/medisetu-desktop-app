import { Button, Chip, Select, SelectItem } from "@heroui/react";
import React from "react";
import type { RequestCard } from "../types";
import { BOARD_STATUSES, STATUS_META } from "../constants";
import { formatDate } from "../../../../../utils";

interface RequestCardActionsProps {
  card: RequestCard;
  isMobile?: boolean;
  isUpdating?: boolean;
  onStatusChange?: (card: RequestCard, selectedKeys: any) => void;
  onArchive?: (card: RequestCard) => void;
  onUnarchive?: (card: RequestCard) => void;
  onViewClinic?: (clinic: RequestCard["clinic"]) => void;
}

/**
 * Displays action buttons and status controls for a request card
 * Supports both desktop (drag) and mobile (select) interactions
 */
export const RequestCardActions: React.FC<RequestCardActionsProps> = ({
  card,
  isMobile = false,
  isUpdating = false,
  onStatusChange,
  onArchive,
  onUnarchive,
  onViewClinic,
}) => {
  const canPerformAction = Boolean(card.doctorId) && !isUpdating;

  return (
    <>
      {/* Mobile Status Selector */}
      {isMobile && card.status !== "Archive" && onStatusChange && (
        <div className="mt-3">
          <Select
            size="sm"
            label="Change Status"
            selectedKeys={new Set([card.status])}
            isDisabled={!canPerformAction}
            onSelectionChange={(keys) => onStatusChange(card, keys)}
            classNames={{
              trigger: "min-h-10 bg-slate-50",
              label: "font-medium text-slate-500",
            }}
          >
            {BOARD_STATUSES.map((status) => (
              <SelectItem key={status} textValue={status}>
                <div className="flex items-center justify-between gap-3">
                  <span>{status}</span>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={STATUS_META[status].color}
                    className="font-semibold"
                  >
                    {status}
                  </Chip>
                </div>
              </SelectItem>
            ))}
          </Select>
        </div>
      )}

      {/* Mobile Status Indicator */}
      {isMobile && (
        <Chip
          size="sm"
          variant="flat"
          color={STATUS_META[card.status].color}
          className="w-fit shrink-0 font-semibold"
        >
          {card.status}
        </Chip>
      )}

      {/* Footer with Date and Buttons */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500">
          {card.createdAt ? formatDate(card.createdAt) : "—"}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          {card.status === "Archive" ? (
            <Button
              size="sm"
              variant="flat"
              color="primary"
              isDisabled={!canPerformAction}
              onClick={() => onUnarchive?.(card)}
              className="h-8 min-w-[88px]"
            >
              Unarchive
            </Button>
          ) : (
            <Button
              size="sm"
              variant="flat"
              color="default"
              isDisabled={!canPerformAction}
              onClick={() => onArchive?.(card)}
              className="h-8 min-w-[72px]"
            >
              Archive
            </Button>
          )}

          <Button
            size="sm"
            variant="flat"
            color="primary"
            isDisabled={!card.clinic?.id && !card.clinic?._id}
            onClick={() => onViewClinic?.(card.clinic)}
            className="h-8 min-w-[72px]"
          >
            View
          </Button>
        </div>
      </div>
    </>
  );
};
