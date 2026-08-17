import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FiCheckCircle,
  FiInfo,
  FiUserCheck,
  FiXCircle,
  FiList,
  FiClock,
  FiThumbsUp,
  FiAlertCircle,
} from "react-icons/fi";

import SearchField from "../../../components/shared/SearchField";
import KpiCards from "../../../components/KpiCards";
import { CommonTable } from "../../../components/common";
import type { TableRowAction } from "../../../components/common";
import { renderProfileRequestCell } from "../../../components/ProfileRequestTableRenderer";
import {
  useGetProfileUpdateRequestsQuery,
  useUpdateProfileUpdateRequestStatusMutation,
  type ProfileUpdateDoctorProfile,
  type ProfileUpdateQualification,
  type ProfileUpdateRequestItem,
  type ProfileUpdateRequestListStatus,
} from "../../../redux/api/requestApi";
import ProfileRequestDetailsModal from "../../../components/ProfileRequestDetailsModal";
import DashboardDateRangePicker from "../DashboardDateRangePicker";
import PageContainer from "../../../components/common/PageContainer";
import PageHeader from "../../../components/common/PageHeader";

type ChipColor = "success" | "warning" | "primary" | "danger" | "default";

type DetailItem = {
  label: string;
  value?: string | number | null;
};

type RequestSummary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type RejectRequestTarget = {
  id: string;
  name: string;
};

type RequestStatusFilter = "all" | ProfileUpdateRequestListStatus;

type StatusFilterTone = "slate" | "warning" | "success" | "danger";

type StatusFilterOption = {
  label: string;
  value: RequestStatusFilter;
  count: number;
  tone: StatusFilterTone;
};

type PageSizeOption = 6 | 10 | 15;

const DEFAULT_PAGE_SIZE: PageSizeOption = 10;

interface KpiCardConfig {
  title: string;
  key: "total" | "pending" | "approved" | "rejected";
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  progressColor: string;
}

const KPI_CARD_CONFIG: KpiCardConfig[] = [
  {
    title: "Total",
    key: "total",
    description: "All profile requests",
    icon: <FiList className="h-5 w-5 text-slate-600" />,
    iconBg: "bg-slate-50",
    progressColor: "bg-slate-500",
  },
  {
    title: "Pending",
    key: "pending",
    description: "Awaiting review",
    icon: <FiClock className="h-5 w-5 text-amber-600" />,
    iconBg: "bg-amber-50",
    progressColor: "bg-amber-500",
  },
  {
    title: "Approved",
    key: "approved",
    description: "Successfully approved",
    icon: <FiThumbsUp className="h-5 w-5 text-emerald-600" />,
    iconBg: "bg-emerald-50",
    progressColor: "bg-emerald-500",
  },
  {
    title: "Rejected",
    key: "rejected",
    description: "Requests declined",
    icon: <FiAlertCircle className="h-5 w-5 text-rose-600" />,
    iconBg: "bg-rose-50",
    progressColor: "bg-rose-500",
  },
];

const displayValue = (value?: string | number | null) => {
  if (value === undefined || value === null) return "—";
  const text = String(value).trim();
  return text || "—";
};

const hasDetailValue = (value?: string | number | null) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const withSubmittedValues = (items: DetailItem[]) =>
  items.filter((item) => hasDetailValue(item.value));

const getStatusColor = (status?: string | null): ChipColor => {
  const value = String(status ?? "").trim().toLowerCase();

  if (value === "approved" || value === "active") return "success";
  if (value === "rejected") return "danger";
  if (value === "reviewing" || value === "in review") return "primary";
  if (value === "pending") return "warning";

  return "default";
};

const getStatusValue = (status?: string | null) =>
  String(status ?? "pending").trim().toLowerCase();

const getStatusLabel = (status?: string | null) => {
  const value = getStatusValue(status);

  if (value === "approved") return "Accepted";
  if (value === "rejected") return "Rejected";
  if (value === "pending") return "Pending";

  return displayValue(status);
};

const getErrorMessage = (error: unknown) => {
  const err = error as {
    data?: { message?: string };
    error?: string;
    status?: string | number;
  };

  return (
    err?.data?.message ??
    err?.error ??
    `Failed to load profile requests${err?.status ? ` (${err.status})` : ""}`
  );
};

const getMutationErrorMessage = (error: unknown) => {
  const err = error as {
    data?: { message?: string };
    error?: string;
    message?: string;
    status?: string | number;
  };

  return (
    err?.data?.message ??
    err?.error ??
    err?.message ??
    `Failed to update request${err?.status ? ` (${err.status})` : ""}`
  );
};

const getProfileFields = (
  profile?: ProfileUpdateDoctorProfile | null,
): DetailItem[] =>
  withSubmittedValues([
    { label: "Name", value: profile?.name },
    { label: "Mobile", value: profile?.mobile },
    { label: "Alternate Mobile", value: profile?.alternateMobile },
    { label: "Speciality", value: profile?.speciality },
    { label: "Qualification", value: profile?.qualification },
    { label: "Registration Number", value: profile?.registrationNumber },
  ]);

const getQualificationFields = (
  qualification: ProfileUpdateQualification,
): DetailItem[] =>
  withSubmittedValues([
    { label: "Specialization", value: qualification.specialization },
    { label: "Year Of Completion", value: qualification.yearOfCompletion },
    { label: "Board Or University", value: qualification.boardOrUniversity },
    { label: "Qualification Type", value: qualification.qualificationType },
    { label: "Qualification Title", value: qualification.qualificationTitle },
  ]);

const requestMatchesSearch = (
  request: ProfileUpdateRequestItem,
  query: string,
) => {
  const profile = request.requestedData?.doctorProfile;
  const qualifications = request.requestedData?.qualifications ?? [];
  const searchableValues = [
    request.doctorId,
    request.doctorName,
    request.doctorEmail,
    request.doctorMobile,
    request.clinicName,
    request.reason,
    request.requestReason,
    request.notes,
    request.rejectionReason,
    ...getProfileFields(profile).map((field) => field.value),
    ...qualifications.flatMap((qualification) =>
      getQualificationFields(qualification).map((field) => field.value),
    ),
  ];

  return searchableValues.some((value) =>
    displayValue(value).toLowerCase().includes(query),
  );
};

const getFilterButtonClassName = (
  tone: StatusFilterTone,
  isSelected: boolean,
) => {
  const base =
    "inline-flex h-9 items-center rounded-lg border px-2.5 text-xs font-medium transition-colors";

  if (!isSelected) {
    return `${base} border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:bg-slate-50`;
  }

  if (tone === "success") {
    return `${base} border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm`;
  }

  if (tone === "warning") {
    return `${base} border-amber-300 bg-amber-50 text-amber-800 shadow-sm`;
  }

  if (tone === "danger") {
    return `${base} border-rose-300 bg-rose-50 text-rose-800 shadow-sm`;
  }

  return `${base} border-slate-300 bg-slate-100 text-slate-900 shadow-sm`;
};

const StatusFilterBar: React.FC<{
  options: StatusFilterOption[];
  selectedValue: RequestStatusFilter;
  onChange: (value: RequestStatusFilter) => void;
}> = ({ onChange, options, selectedValue }) => {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-1.5">
      {options.map((option) => {
        const isSelected = option.value === selectedValue;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={getFilterButtonClassName(option.tone, isSelected)}
          >
            {option.label}
            <span
              className={`ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${isSelected ? "bg-white/80 text-inherit" : "bg-slate-100 text-slate-700"
                }`}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const EmptyState: React.FC<{ description?: string; title?: string }> = ({
  description = "Profile update requests will appear here when users submit changes for review.",
  title = "No profile requests yet",
}) => (
  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
    <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
      <FiUserCheck className="text-xl" />
    </div>
    <h3 className="mt-3 text-base font-semibold text-slate-900">
      {title}
    </h3>
    <p className="mt-1.5 max-w-md text-xs text-slate-500">
      {description}
    </p>
  </div>
);

const ProfileRequest: React.FC = () => {
  const [searchBy, setSearchBy] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [rowsPerPage, setRowsPerPage] =
    useState<PageSizeOption>(DEFAULT_PAGE_SIZE);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(
    null,
  );
  const [rejectRequestTarget, setRejectRequestTarget] =
    useState<RejectRequestTarget | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [doctorIdFilter, setDoctorIdFilter] = useState<string | undefined>();
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<RequestStatusFilter>("all");
  const [selectedRequestForDetails, setSelectedRequestForDetails] =
    useState<ProfileUpdateRequestItem | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(thirtyDaysAgo.getDate()).padStart(2, "0")}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  const statusFilter = useMemo(
    () =>
      selectedStatusFilter === "all" ? undefined : selectedStatusFilter,
    [selectedStatusFilter],
  );

  const summaryQueryArgs = useMemo(
    () => ({
      page: 1,
      limit: rowsPerPage,
      doctorId: doctorIdFilter,
      startDate,
      endDate,
    }),
    [doctorIdFilter, rowsPerPage, startDate, endDate],
  );

  const queryArgs = useMemo(
    () => ({
      page: pageNumber,
      limit: rowsPerPage,
      doctorId: doctorIdFilter,
      status: statusFilter,
      startDate,
      endDate,
    }),
    [doctorIdFilter, pageNumber, rowsPerPage, statusFilter, startDate, endDate],
  );

  const { data: summaryData } =
    useGetProfileUpdateRequestsQuery(summaryQueryArgs);

  const {
    data: profileRequestsData,
    isLoading,
    isError,
    error,
  } = useGetProfileUpdateRequestsQuery(queryArgs);

  const allProfileRequests = useMemo(
    () => summaryData?.requests ?? [],
    [summaryData],
  );
  const profileRequests = useMemo(
    () => profileRequestsData?.requests ?? [],
    [profileRequestsData],
  );
  const pagination = profileRequestsData?.pagination;

  const [updateProfileRequestStatus, { isLoading: isUpdatingStatus }] =
    useUpdateProfileUpdateRequestStatusMutation();

  const filteredRequests = useMemo(() => {
    const query = searchBy.trim().toLowerCase();
    if (!query) return profileRequests;

    return profileRequests.filter((request) =>
      requestMatchesSearch(request, query),
    );
  }, [profileRequests, searchBy]);

  useEffect(() => {
    const query = searchBy.trim().toLowerCase();

    if (!query) {
      setDoctorIdFilter(undefined);
      return;
    }

    const matchedDoctorId = allProfileRequests.find((request) =>
      requestMatchesSearch(request, query),
    )?.doctorId;

    setDoctorIdFilter((currentDoctorId) =>
      currentDoctorId === matchedDoctorId ? currentDoctorId : matchedDoctorId,
    );
  }, [allProfileRequests, searchBy]);

  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const currentPage = Math.min(pageNumber, totalPages);

  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
  }, [pageNumber, totalPages]);

  const summary = useMemo<RequestSummary>(() => {
    if (summaryData?.stats) {
      return summaryData.stats;
    }

    const pageSummary = allProfileRequests.reduce<RequestSummary>(
      (acc, request) => {
        const status = getStatusValue(request.status);

        acc.total += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "pending") acc.pending += 1;
        if (status === "rejected") acc.rejected += 1;

        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 },
    );

    return {
      ...pageSummary,
      total: summaryData?.pagination.totalRecords ?? pageSummary.total,
    };
  }, [allProfileRequests, summaryData]);

  const statusFilterOptions = useMemo<StatusFilterOption[]>(
    () => [
      { label: "All", value: "all", count: summary.total, tone: "slate" },
      {
        label: "Pending",
        value: "pending",
        count: summary.pending,
        tone: "warning",
      },
      {
        label: "Accepted",
        value: "approved",
        count: summary.approved,
        tone: "success",
      },
      {
        label: "Rejected",
        value: "rejected",
        count: summary.rejected,
        tone: "danger",
      },
    ],
    [summary],
  );

  const handleStatusFilterChange = (value: RequestStatusFilter) => {
    setSelectedStatusFilter(value);
    setPageNumber(1);
  };

  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value as PageSizeOption);
    setPageNumber(1);
  };

  const handleAcceptRequest = async (requestId?: string) => {
    if (!requestId) {
      addToast({
        title: "Action unavailable",
        description: "This profile request does not have a request ID.",
        color: "warning",
      });
      return;
    }

    try {
      await updateProfileRequestStatus({
        requestId,
        status: "approved",
      }).unwrap();

      addToast({
        title: "Request approved",
        description: "Profile request approved successfully.",
        color: "success",
      });
    } catch (err: unknown) {
      addToast({
        title: "Update failed",
        description: getMutationErrorMessage(err),
        color: "danger",
      });
    }
  };

  const openRejectModal = (requestId: string | undefined, name: string) => {
    if (!requestId) {
      addToast({
        title: "Action unavailable",
        description: "This profile request does not have a request ID.",
        color: "warning",
      });
      return;
    }

    setRejectRequestTarget({ id: requestId, name });
    setRejectionReason("");
  };

  const closeRejectModal = () => {
    if (rejectingRequestId) return;
    setRejectRequestTarget(null);
    setRejectionReason("");
  };

  const handleRejectRequest = async () => {
    if (!rejectRequestTarget) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      addToast({
        title: "Reason required",
        description: "Please enter a rejection reason before submitting.",
        color: "warning",
      });
      return;
    }

    setRejectingRequestId(rejectRequestTarget.id);

    try {
      await updateProfileRequestStatus({
        requestId: rejectRequestTarget.id,
        status: "rejected",
        rejectionReason: reason,
      }).unwrap();

      addToast({
        title: "Request rejected",
        description: "Profile request rejected successfully.",
        color: "success",
      });

      setRejectRequestTarget(null);
      setRejectionReason("");
    } catch (err: unknown) {
      addToast({
        title: "Update failed",
        description: getMutationErrorMessage(err),
        color: "danger",
      });
    } finally {
      setRejectingRequestId(null);
    }
  };

  const tableColumns = useMemo(
    () => [
      { key: "doctor", label: "Doctor", sortable: true },
      { key: "specialty", label: "Specialty", sortable: false },
      { key: "clinic", label: "Clinic", sortable: false },
      { key: "requestedOn", label: "Requested On", sortable: true },
      { key: "status", label: "Status", sortable: false },
      { key: "contact", label: "Contact", sortable: false },
      { key: "view", label: "View", sortable: false, width: "80px" },
    ],
    [],
  );

  const tableRowActions = useMemo(
    (): TableRowAction<ProfileUpdateRequestItem>[] => [
      {
        id: "approve",
        label: "Approve",
        icon: <FiCheckCircle size={18} />,
        color: "success",
        onClick: (row: ProfileUpdateRequestItem) => {
          const requestId = row.id ?? row._id ?? row.requestId;
          handleAcceptRequest(requestId);
        },
        isDisabled: (row: ProfileUpdateRequestItem) => {
          const status = getStatusValue(row.status);
          return status === "approved" || status === "rejected" || isUpdatingStatus;
        },
      },
      {
        id: "reject",
        label: "Reject",
        icon: <FiXCircle size={18} />,
        color: "danger",
        onClick: (row: ProfileUpdateRequestItem) => {
          const requestId = row.id ?? row._id ?? row.requestId;
          const displayName = displayValue(
            row.requestedData?.doctorProfile?.name ?? row.doctorName,
          );
          openRejectModal(requestId, displayName);
        },
        isDisabled: (row: ProfileUpdateRequestItem) => {
          const status = getStatusValue(row.status);
          return status === "approved" || status === "rejected" || isUpdatingStatus;
        },
      },
    ],
    [isUpdatingStatus],
  );

  const handleViewDetails = useCallback(
    (row: ProfileUpdateRequestItem) => {
      setSelectedRequestForDetails(row);
    },
    []
  );

  const renderTableCell = useCallback(
    (columnKey: string, rowData: ProfileUpdateRequestItem) => {
      if (columnKey === "view") {
        return null; // This is handled in the main renderCell function
      }
      return renderProfileRequestCell({
        columnKey,
        rowData,
        displayValue,
        getStatusColor,
        getStatusLabel,
      });
    },
    []
  );

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Profile Requests"
        description="Review and manage all doctor profile requests."
        actions={<div className="flex flex-col gap-2 sm:flex-row items-end sm:gap-2 lg:gap-3">
          <div className="flex-1 min-w-0">
            <SearchField
              placeholder="Search by name, email, phone or clinic..."
              value={searchBy}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSearchBy(event.target.value);
                setPageNumber(1);
              }}
              onClear={() => {
                setSearchBy("");
                setPageNumber(1);
              }}
            />
          </div>
          <div className="w-full sm:w-auto">
            <DashboardDateRangePicker
              startYmd={startDate}
              endYmd={endDate}
              isFetching={false}
              onApply={(startYmd, endYmd) => {
                setStartDate(startYmd);
                setEndDate(endYmd);
                setPageNumber(1);
              }}
            />
          </div>
        </div>}

      />



      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARD_CONFIG.map((config) => {
          const value =
            config.key === "total"
              ? summary.total
              : config.key === "pending"
                ? summary.pending
                : config.key === "approved"
                  ? summary.approved
                  : summary.rejected;

          const percentage =
            summary.total > 0 ? Math.round((value / summary.total) * 100) : 0;

          return (
            <KpiCards
              key={config.key}
              description={config.description}
              title={config.title}
              value={value}
              icon={config.icon}
              iconBg={config.iconBg}
              progressColor={config.progressColor}
              percentage={percentage}
              loading={isLoading}
            />
          );
        })}
      </div>

      <StatusFilterBar
        options={statusFilterOptions}
        selectedValue={selectedStatusFilter}
        onChange={handleStatusFilterChange}
      />

      <CommonTable
        columns={tableColumns}
        data={filteredRequests}
        renderCell={(columnKey: string, rowData: any) => {
          // Add custom view details button
          if (columnKey === "view") {
            return (
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(rowData as ProfileUpdateRequestItem);
                }}
                title="View Details"
                className="hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiInfo size={18} />
              </Button>
            );
          }
          return renderTableCell(columnKey, rowData);
        }}
        rowActions={tableRowActions}
        pagination={{
          currentPage,
          totalPages,
          rowsPerPage,
          totalRecords: pagination?.totalRecords || 0,
          onPageChange: handlePageChange,
          onRowsPerPageChange: handleRowsPerPageChange,
        }}
        state={{
          isLoading,
          hasError: isError,
          errorMessage: getErrorMessage(error),
          isEmpty: filteredRequests.length === 0,
          emptyStateContent: (
            <EmptyState
              title={
                selectedStatusFilter === "all"
                  ? "No profile requests found"
                  : `No ${getStatusLabel(selectedStatusFilter).toLowerCase()} requests found`
              }
              description="Try a different status filter or search term."
            />
          ),
        }}
      />

      <Modal
        isOpen={Boolean(rejectRequestTarget)}
        onOpenChange={(open) => {
          if (!open) closeRejectModal();
        }}
        placement="center"
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-sm">
                Reject Profile Request
              </ModalHeader>

              <ModalBody>
                <p className="text-xs text-slate-600">
                  Add a reason for rejecting{" "}
                  <span className="font-semibold text-slate-900">
                    {rejectRequestTarget?.name}
                  </span>
                  .
                </p>

                <Textarea
                  label="Rejection Reason"
                  placeholder="Enter rejection reason..."
                  minRows={3}
                  value={rejectionReason}
                  onValueChange={setRejectionReason}
                  isDisabled={Boolean(rejectingRequestId)}
                  size="sm"
                />
              </ModalBody>

              <ModalFooter className="gap-2">
                <Button
                  variant="light"
                  isDisabled={Boolean(rejectingRequestId)}
                  onPress={() => {
                    closeRejectModal();
                    onClose();
                  }}
                  size="sm"
                >
                  Cancel
                </Button>

                <Button
                  color="danger"
                  isLoading={Boolean(rejectingRequestId)}
                  onPress={handleRejectRequest}
                  className="text-sm font-medium"
                  size="sm"
                >
                  Submit Reject
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ProfileRequestDetailsModal
        isOpen={Boolean(selectedRequestForDetails)}
        onClose={() => setSelectedRequestForDetails(null)}
        request={selectedRequestForDetails}
        displayValue={displayValue}
        getStatusColor={getStatusColor}
        getStatusLabel={getStatusLabel}
      />
    </PageContainer>
  );
};

export default ProfileRequest;
