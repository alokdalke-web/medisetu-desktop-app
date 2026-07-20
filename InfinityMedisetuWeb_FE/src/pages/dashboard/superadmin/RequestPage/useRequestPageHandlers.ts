import { useCallback } from "react";
import { useNavigate } from "react-router";
import { addToast } from "@heroui/react";
import type {
  PendingStatusChange,
  RequestCard,
  BoardStatus,
  ActiveBoardStatus,
} from "./types";
import { getClinicId, getBoardStatus } from "./utils";
import { STATUS_TO_USER_STATUS } from "./constants";

interface UseRequestPageHandlersProps {
  onStatusChangeSet: (change: PendingStatusChange | null) => void;
  onDraggingIdSet: (id: string | null) => void;
  requestCards: RequestCard[];
  isUpdatingRequest?: boolean;
}

interface UseRequestPageHandlersReturn {
  handleViewClinic: (clinic: RequestCard["clinic"]) => void;
  handleDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    card: RequestCard,
  ) => void;
  handleDrop: (
    event: React.DragEvent<HTMLDivElement>,
    targetStatus: ActiveBoardStatus,
  ) => void;
  handleArchiveRequest: (card: RequestCard) => void;
  handleUnarchiveRequest: (card: RequestCard) => void;
  handleMobileStatusChange: (
    card: RequestCard,
    selectedKeys: any,
  ) => void;
  handleConfirmStatusChange: (
    pendingStatusChange: PendingStatusChange | null,
    updateRequestDoctorStatus: (args: {
      doctorId: string;
      userStatus: string;
    }) => any,
    archiveUser: (args: { userId: string }) => any,
  ) => Promise<void>;
}

/**
 * Custom hook for managing request page handlers
 * Encapsulates all event handlers and their side effects
 */
export const useRequestPageHandlers = ({
  onStatusChangeSet,
  onDraggingIdSet,
  requestCards,
  isUpdatingRequest = false,
}: UseRequestPageHandlersProps): UseRequestPageHandlersReturn => {
  const navigate = useNavigate();

  const handleViewClinic = useCallback((clinic: RequestCard["clinic"]) => {
    const clinicId = getClinicId(clinic);
    if (clinicId) navigate(`/clinics/${clinicId}`);
  }, [navigate]);

  const handleDragStart = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      card: RequestCard,
    ) => {
      if (!card.doctorId || isUpdatingRequest) {
        event.preventDefault();
        return;
      }

      onDraggingIdSet(card.id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "application/request-doctor",
        JSON.stringify({ doctorId: card.doctorId, currentStatus: card.status }),
      );
    },
    [onDraggingIdSet, isUpdatingRequest],
  );

  const handleDrop = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      targetStatus: ActiveBoardStatus,
    ) => {
      event.preventDefault();
      onDraggingIdSet(null);

      const rawData = event.dataTransfer.getData("application/request-doctor");
      if (!rawData) return;

      const payload = JSON.parse(rawData) as {
        doctorId?: string;
        currentStatus?: BoardStatus;
      };

      if (!payload.doctorId || payload.currentStatus === targetStatus) return;

      onStatusChangeSet({
        action: "status",
        doctorId: payload.doctorId,
        fromStatus: payload.currentStatus ?? "Pending",
        toStatus: targetStatus,
        card: requestCards.find((card) => card.doctorId === payload.doctorId),
      });
    },
    [onDraggingIdSet, onStatusChangeSet, requestCards],
  );

  const handleArchiveRequest = useCallback(
    (card: RequestCard) => {
      if (card.status === "Archive") return;

      if (!card.doctorId || isUpdatingRequest) {
        addToast({
          title: "Action unavailable",
          description: "This request cannot be archived right now.",
          color: "warning",
        });
        return;
      }

      onStatusChangeSet({
        action: "archive",
        doctorId: card.doctorId,
        fromStatus: card.status,
        toStatus: "Archive",
        card,
      });
    },
    [onStatusChangeSet, isUpdatingRequest],
  );

  const handleUnarchiveRequest = useCallback(
    (card: RequestCard) => {
      if (card.status !== "Archive") return;

      if (!card.doctorId || isUpdatingRequest) {
        addToast({
          title: "Action unavailable",
          description: "This request cannot be unarchived right now.",
          color: "warning",
        });
        return;
      }

      const restoreStatus = getBoardStatus(card.doctor.userStatus, false);

      onStatusChangeSet({
        action: "unarchive",
        doctorId: card.doctorId,
        fromStatus: "Archive",
        toStatus: restoreStatus === "Archive" ? "Pending" : restoreStatus,
        card,
      });
    },
    [onStatusChangeSet, isUpdatingRequest],
  );

  const handleMobileStatusChange = useCallback(
    (
      card: RequestCard,
      selectedKeys: any,
    ) => {
      const selectedStatus =
        selectedKeys === "all"
          ? undefined
          : (Array.from(selectedKeys)[0] as BoardStatus | undefined);

      if (!selectedStatus || selectedStatus === card.status) return;

      if (!card.doctorId || isUpdatingRequest) {
        addToast({
          title: "Action unavailable",
          description: "This request cannot be updated right now.",
          color: "warning",
        });
        return;
      }

      onStatusChangeSet({
        action: "status",
        doctorId: card.doctorId,
        fromStatus: card.status,
        toStatus: selectedStatus,
        card,
      });
    },
    [onStatusChangeSet, isUpdatingRequest],
  );

  const handleConfirmStatusChange = useCallback(
    async (
      pendingStatusChange: PendingStatusChange | null,
      updateRequestDoctorStatus: (args: {
        doctorId: string;
        userStatus: string;
      }) => any,
      archiveUser: (args: { userId: string }) => any,
    ) => {
      if (!pendingStatusChange) return;

      try {
        if (pendingStatusChange.action !== "status") {
          const result = await archiveUser({
            userId: pendingStatusChange.doctorId,
          });
          // Handle both Promise and Redux result types
          if (result && typeof result.unwrap === "function") {
            await result.unwrap();
          }
        } else {
          const result = await updateRequestDoctorStatus({
            doctorId: pendingStatusChange.doctorId,
            userStatus:
              STATUS_TO_USER_STATUS[pendingStatusChange.toStatus],
          });
          // Handle both Promise and Redux result types
          if (result && typeof result.unwrap === "function") {
            await result.unwrap();
          }
        }

        const actionMessages = {
          archive: {
            title: "Request archived",
            description: "Request archived successfully.",
          },
          unarchive: {
            title: "Request unarchived",
            description: "Request unarchived successfully.",
          },
          status: {
            title: "Status updated",
            description: `Request moved to ${pendingStatusChange.toStatus}.`,
          },
        };

        const message =
          actionMessages[pendingStatusChange.action];

        addToast({
          ...message,
          color: "success",
        });

        onStatusChangeSet(null);
      } catch (err: any) {
        addToast({
          title: "Update failed",
          description:
            err?.data?.message || "Failed to update request status",
          color: "danger",
        });
      }
    },
    [onStatusChangeSet],
  );

  return {
    handleViewClinic,
    handleDragStart,
    handleDrop,
    handleArchiveRequest,
    handleUnarchiveRequest,
    handleMobileStatusChange,
    handleConfirmStatusChange,
  };
};
