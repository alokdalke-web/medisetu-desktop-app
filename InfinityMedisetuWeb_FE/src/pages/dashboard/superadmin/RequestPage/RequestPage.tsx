import React, { useState, useMemo, useCallback } from "react";
import { addToast } from "@heroui/react";
import {
  useGetClinicsWithDoctorsQuery,
  useUpdateRequestDoctorStatusMutation,
  useArchiveUserMutation,
  useBulkUpdateRequestDoctorStatusMutation,
  useBulkAssignRequestsMutation,
} from "../../../../redux/api/requestApi";
import PageContainer from "../../../../components/common/PageContainer";
import {
  RequestHeader,
  KpiCardSection,
  LoadingState,
  ErrorState,
  EmptyState,
  StatusChangeModal,
} from "./components";
import RequestListView from "./views/RequestListView";
import RequestBoardView from "./views/RequestBoardView";
import RequestAnalyticsView from "./views/RequestAnalyticsView";
import {
  useRequestCards,
  useSearchedRequestCards,
  useActiveAndArchivedCards,
  useGroupedRequests,
} from "./hooks";
import { useRequestPageHandlers } from "./useRequestPageHandlers";
import type { PendingStatusChange, ActiveBoardStatus, RequestCard } from "./types";
import { getErrorMessage, toStartIso, toEndIso, getCurrentMonthRange } from "./utils";
import { STATUS_TO_USER_STATUS } from "./constants";
import PageHeader from "../../../../components/common/PageHeader";
import SearchField from "../../../../components/shared/SearchField";
import { useAppLoader } from "../../../../components/common/AppLoaderContext";
import DashboardDateRangePicker from "../../DashboardDateRangePicker";

type ViewType = "list" | "board" | "analytics";

/**
 * Main RequestPage component with multiple view modes
 * - List View: Table with filtering and pagination
 * - Board View: Kanban board for drag-and-drop status management
 * - Analytics View: Custom analytics dashboard
 */
const RequestPage: React.FC = () => {
  const [viewType, setViewType] = useState<ViewType>("board");
  const currentMonthRange = getCurrentMonthRange();

  // State: Date filters
  const [startDate, setStartDate] = useState(currentMonthRange.start);
  const [endDate, setEndDate] = useState(currentMonthRange.end);

  // State: Search and view toggles
  const [doctorSearch, setDoctorSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // State: Drag and drop
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // State: Status change confirmation
  const [pendingStatusChange, setPendingStatusChange] =
    useState<PendingStatusChange | null>(null);

  // Memoize query params
  const queryParams = useMemo(
    () => ({
      startDate: toStartIso(startDate),
      endDate: toEndIso(endDate),
    }),
    [endDate, startDate],
  );

  // Queries
  const { data, isLoading, isFetching, isError, error } =
    useGetClinicsWithDoctorsQuery(queryParams);
  useAppLoader(isLoading);

  const [updateRequestDoctorStatus, { isLoading: isUpdatingStatus }] =
    useUpdateRequestDoctorStatusMutation();

  const [archiveUser, { isLoading: isArchivingUser }] =
    useArchiveUserMutation();

  const [bulkUpdateRequestDoctorStatus, { isLoading: isUpdatingBulkStatus }] =
    useBulkUpdateRequestDoctorStatusMutation();

  const [bulkAssignRequests, { isLoading: isAssigningBulk }] =
    useBulkAssignRequestsMutation();

  const isUpdatingRequest = isUpdatingStatus || isArchivingUser || isUpdatingBulkStatus || isAssigningBulk;

  // Data transformations
  const requestCards = useRequestCards(data);
  const searchedRequestCards = useSearchedRequestCards(
    requestCards,
    doctorSearch,
  );

  const { activeRequestCards, archivedRequestCards } =
    useActiveAndArchivedCards(searchedRequestCards);

  const groupedRequests = useGroupedRequests(activeRequestCards);

  // For archived view: create a pseudo-grouping where all archived cards are under "Pending" key
  // (since the board view will check for "Archive" status when showArchived=true)
  const groupedArchivedRequests = useMemo<Record<ActiveBoardStatus, RequestCard[]>>(() => {
    return {
      Pending: archivedRequestCards,
      Reviewing: [],
      Approved: [],
      Rejected: [],
    };
  }, [archivedRequestCards]);

  // Event handlers
  const {
    handleViewClinic,
    handleDragStart,
    handleDrop,
    handleArchiveRequest,
    handleUnarchiveRequest,
    handleMobileStatusChange,
  } = useRequestPageHandlers({
    onStatusChangeSet: setPendingStatusChange,
    onDraggingIdSet: setDraggingId,
    requestCards,
    isUpdatingRequest,
  });

  // Handle status change confirmation
  const handleConfirmStatusChange = useCallback(async () => {
    if (!pendingStatusChange) return;

    try {
      if (pendingStatusChange.action !== "status") {
        // Archive or unarchive action
        await archiveUser({
          userId: pendingStatusChange.doctorId,
        }).unwrap();
      } else {
        // Status change action
        await updateRequestDoctorStatus({
          doctorId: pendingStatusChange.doctorId,
          userStatus:
            STATUS_TO_USER_STATUS[pendingStatusChange.toStatus],
        }).unwrap();
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

      setPendingStatusChange(null);
    } catch (err: any) {
      addToast({
        title: "Update failed",
        description:
          err?.data?.message || "Failed to update request status",
        color: "danger",
      });
    }
  }, [pendingStatusChange, archiveUser, updateRequestDoctorStatus]);

  const cardsToDisplay = showArchived ? archivedRequestCards : activeRequestCards;

  // Bulk action handlers
  const handleBulkApprove = useCallback(
    async (requestIds: string[]) => {
      try {
        const doctorIds = requestIds
          .map(id => {
            const card = requestCards.find(c => c.id === id);
            return card?.doctor?.id;
          })
          .filter(Boolean) as string[];

        if (doctorIds.length === 0) {
          throw new Error("No valid requests found");
        }

        await bulkUpdateRequestDoctorStatus({
          doctorIds,
          userStatus: "Active",
        }).unwrap();
      } catch (error: any) {
        throw error?.data?.message || error?.message || "Failed to approve requests";
      }
    },
    [requestCards, bulkUpdateRequestDoctorStatus],
  );

  const handleBulkReject = useCallback(
    async (requestIds: string[]) => {
      try {
        const doctorIds = requestIds
          .map(id => {
            const card = requestCards.find(c => c.id === id);
            return card?.doctor?.id;
          })
          .filter(Boolean) as string[];

        if (doctorIds.length === 0) {
          throw new Error("No valid requests found");
        }

        await bulkUpdateRequestDoctorStatus({
          doctorIds,
          userStatus: "Rejected",
        }).unwrap();
      } catch (error: any) {
        throw error?.data?.message || error?.message || "Failed to reject requests";
      }
    },
    [requestCards, bulkUpdateRequestDoctorStatus],
  );

  const handleBulkAssign = useCallback(
    async (requestIds: string[], assignedTo: string, notes?: string) => {
      try {
        await bulkAssignRequests({
          requestIds,
          assignedTo,
          notes,
        }).unwrap();
      } catch (error: any) {
        throw error?.data?.message || error?.message || "Failed to assign requests";
      }
    },
    [bulkAssignRequests],
  );

  return (
    <PageContainer className="space-y-5">
      {/* Header with search and filters */}
      <PageHeader
        title="Clinic Requests"
        description="Manage doctor and clinic profile requests"
        actions={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <div className="w-full sm:w-[300px]">
              <SearchField
                value={doctorSearch}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDoctorSearch(event.target.value)
                }
                onClear={() => setDoctorSearch("")}
                placeholder="Search doctor or clinic..."
                className="w-full"
              />
            </div>

            <div className="w-full sm:w-auto">
              <DashboardDateRangePicker
                startYmd={startDate}
                endYmd={endDate}
                isFetching={isFetching}
                onApply={(startYmd, endYmd) => {
                  setStartDate(startYmd);
                  setEndDate(endYmd);
                }}
              />
            </div>
          </div>
        }
      />


      {/* KPI Statistics */}
      <KpiCardSection
        requestCards={activeRequestCards}
        isLoading={isLoading}
      />
      <RequestHeader

        archivedCount={archivedRequestCards.length}
        showArchived={showArchived}

        onToggleArchived={() => setShowArchived((prev) => !prev)}
        viewType={viewType}
        onViewChange={setViewType}
      />
      {/* Content Area */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} />
      ) : cardsToDisplay.length === 0 ? (
        <EmptyState
          title={
            showArchived
              ? "No archived requests found"
              : "No active requests found"
          }
          message={
            showArchived
              ? "No archived requests match your current filters."
              : "No active requests match your current filters."
          }
        />
      ) : viewType === "list" ? (
        <RequestListView
          cards={cardsToDisplay}
          isUpdating={isUpdatingRequest}
          onArchive={handleArchiveRequest}
          onUnarchive={handleUnarchiveRequest}
          onViewClinic={handleViewClinic}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onBulkAssign={handleBulkAssign}
        />
      ) : viewType === "analytics" ? (
        <RequestAnalyticsView
          cards={showArchived ? archivedRequestCards : activeRequestCards}
          isLoading={isLoading}
        />
      ) : (
        <RequestBoardView
          groupedRequests={showArchived ? groupedArchivedRequests : groupedRequests}
          showArchived={showArchived}
          isDragging={Boolean(draggingId)}
          isUpdating={isUpdatingRequest}
          onDragStart={handleDragStart}
          onDragEnd={() => setDraggingId(null)}
          onDrop={handleDrop}
          onStatusChange={handleMobileStatusChange}
          onArchive={handleArchiveRequest}
          onUnarchive={handleUnarchiveRequest}
          onViewClinic={handleViewClinic}
        />
      )}

      {/* Status Change Confirmation Modal */}
      <StatusChangeModal
        isOpen={Boolean(pendingStatusChange)}
        pendingStatusChange={pendingStatusChange}
        isLoading={isUpdatingRequest}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setPendingStatusChange(null)}
      />
    </PageContainer>
  );
};

export default RequestPage;
