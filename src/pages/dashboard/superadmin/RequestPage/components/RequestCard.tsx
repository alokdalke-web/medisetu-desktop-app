import { Avatar, Chip } from "@heroui/react";
import React from "react";
import type { RequestCard as RequestCardType } from "../types";
import { STATUS_META } from "../constants";
import { RequestCardContent } from "./RequestCardContent";
import { RequestCardActions } from "./RequestCardActions";
import { getClinicName } from "../utils";

interface RequestCardProps {
  card: RequestCardType;
  isMobile?: boolean;
  isDragging?: boolean;
  isUpdating?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, card: RequestCardType) => void;
  onDragEnd?: () => void;
  onStatusChange?: (card: RequestCardType, selectedKeys: any) => void;
  onArchive?: (card: RequestCardType) => void;
  onUnarchive?: (card: RequestCardType) => void;
  onViewClinic?: (clinic: RequestCardType["clinic"]) => void;
}

/**
 * Renders a single request card with doctor and clinic information
 * Supports drag-and-drop on desktop and select on mobile
 */
export const RequestCard: React.FC<RequestCardProps> = ({
  card,
  isMobile = false,
  isDragging = false,
  isUpdating = false,
  onDragStart,
  onDragEnd,
  onStatusChange,
  onArchive,
  onUnarchive,
  onViewClinic,
}) => {
  const canDragCard =
    !isMobile &&
    card.status !== "Archive" &&
    Boolean(card.doctorId) &&
    !isUpdating;

  const statusMeta = STATUS_META[card.status];
  const doctorSpeciality = card.doctor.speciality ?? "—";
    const doctorRegistrationNumber = card.doctor.registrationNumber ?? "—";
    const clinicName = getClinicName(card.clinic);

  return (
    <div
      draggable={canDragCard}
      onDragStart={
        isMobile
          ? undefined
          : (event) => onDragStart?.(event, card)
      }
      onDragEnd={isMobile ? undefined : onDragEnd}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      } ${
        canDragCard
          ? "cursor-grab active:cursor-grabbing"
          : isMobile
            ? ""
            : "cursor-not-allowed opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <RequestCardContent card={card} />
        </div>

        {!isMobile && (
          <Chip
            size="sm"
            variant="flat"
            color={statusMeta.color}
            className="shrink-0 font-semibold"
          >
            {card.status}
          </Chip>
        )}

      </div>

          {/* Doctor Details */}
      <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="min-w-0">
            <p className="font-bold uppercase tracking-wide text-slate-500">
              Speciality
            </p>
            <p className="mt-1 break-words font-semibold leading-snug text-slate-800">
              {doctorSpeciality}
            </p>
          </div>

          <div className="min-w-0">
            <p className="font-bold uppercase tracking-wide text-slate-500">
              Reg. No.
            </p>
            <p className="mt-1 break-words font-semibold leading-snug text-slate-800">
              {doctorRegistrationNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Clinic Info */}
      <div className="mt-1 rounded-xl border border-dashed border-slate-200 bg-white p-2">
        <div className="flex items-start gap-3">
          <Avatar
            src={card.clinic.clinicLogo ?? ""}
            name={clinicName}
            size="sm"
            radius="md"
            className="shrink-0 bg-primary/10 text-primary"
          />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Clinic
            </p>

            <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-slate-800">
              {clinicName}
            </p>
          </div>
        </div>
      </div>
      <RequestCardActions
        card={card}
        isMobile={isMobile}
        isUpdating={isUpdating}
        onStatusChange={onStatusChange}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onViewClinic={(clinic) => onViewClinic?.(clinic)}
      />
    </div>
  );
};
