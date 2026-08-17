import React, { useEffect, useState } from "react";
import AppointmentCardGrid from "./components/list/AppointmentCardGrid";
import AppointmentTable from "./components/list/AppointmentTable";
import type { AppointmentListViewProps } from "../../types/appointment";
import {
  APPOINTMENT_PRESCRIPTION_DRAFT_EVENT,
  canUseAppointmentPrescriptionDrafts,
  getAppointmentPrescriptionDraft,
} from "./helpers/appointmentPrescriptionDraft";
import { isTerminalAppointmentStatus } from "./helpers/appointmentListFormatters";

/**
 * Thin dispatcher between the two appointment layouts. Both `AppointmentTable`
 * (list) and `AppointmentCardGrid` (card) live in `components/list/` and share
 * the prescription-draft-indicator state computed here — see
 * `AppointmentListSharedProps` in `src/types/appointment`.
 */
const AppointmentListView: React.FC<AppointmentListViewProps> = ({
  layout,
  showSkeleton,
  isRefreshing,
  rows,
  page,
  setPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  setRowsPerPage,
  goToDetails,
  sortDir,
  onSortStatus,
  queueWaitData,
  noShowPolicyActive: _noShowPolicyActive,
  showDraftIndicators = true,
}) => {
  const [draftAppointmentIds, setDraftAppointmentIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const refreshDraftIndicators = () => {
      if (!showDraftIndicators) {
        setDraftAppointmentIds(new Set());
        return;
      }

      if (!canUseAppointmentPrescriptionDrafts()) {
        setDraftAppointmentIds(new Set());
        return;
      }

      const ids = rows
        .filter((row) => !isTerminalAppointmentStatus(row.status))
        .filter((row) => !!getAppointmentPrescriptionDraft(row.rawId))
        .map((row) => row.rawId);

      setDraftAppointmentIds(new Set(ids));
    };

    refreshDraftIndicators();

    window.addEventListener("cookie-consent-updated", refreshDraftIndicators);
    window.addEventListener(
      APPOINTMENT_PRESCRIPTION_DRAFT_EVENT,
      refreshDraftIndicators,
    );
    window.addEventListener("storage", refreshDraftIndicators);
    window.addEventListener("focus", refreshDraftIndicators);

    return () => {
      window.removeEventListener(
        "cookie-consent-updated",
        refreshDraftIndicators,
      );
      window.removeEventListener(
        APPOINTMENT_PRESCRIPTION_DRAFT_EVENT,
        refreshDraftIndicators,
      );
      window.removeEventListener("storage", refreshDraftIndicators);
      window.removeEventListener("focus", refreshDraftIndicators);
    };
  }, [rows, showDraftIndicators]);

  const shared = {
    rows,
    showSkeleton,
    isRefreshing,
    page,
    setPage,
    totalPages,
    totalRecords,
    rowsPerPage,
    setRowsPerPage,
    goToDetails,
    draftAppointmentIds,
  };

  if (layout === "list") {
    return (
      <AppointmentTable
        {...shared}
        sortDir={sortDir}
        onSortStatus={onSortStatus}
        queueWaitData={queueWaitData}
      />
    );
  }

  return <AppointmentCardGrid {...shared} />;
};

export default AppointmentListView;
