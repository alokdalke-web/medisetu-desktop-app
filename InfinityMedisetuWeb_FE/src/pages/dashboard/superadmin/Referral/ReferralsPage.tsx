import {
  addToast,
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import React, { useMemo, useState } from "react";
import { FiList, FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { useAppLoader } from "../../../../components/common/AppLoaderContext";

import SearchField from "../../../../components/shared/SearchField";
import KpiCards from "../../../../components/KpiCards";
import { CommonTable } from "../../../../components/common";
import {
  useGetAllReferralsQuery,
  useUpdateReferralStatusMutation,
  type ReferralStatus,
  type SuperAdminReferralItem,
} from "../../../../redux/api/referralApi";
import PageHeader from "../../../../components/common/PageHeader";
import PageContainer from "../../../../components/common/PageContainer";
import { ReferralInsights } from "./ReferralInsights";
import { RecentActivity } from "./RecentActivity";
import DashboardDateRangePicker from "../../DashboardDateRangePicker";

type KpiCardConfig = {
  title: string;
  key: "total" | "pending" | "approved" | "rejected";
  icon: React.ReactNode;
  iconBg: string;
  progressColor: string;
  description: string;
};

const KPI_CARD_CONFIG: KpiCardConfig[] = [
  {
    title: "Total Referrals",
    key: "total",
    icon: <FiList className="h-5 w-5 text-slate-600" />,
    iconBg: "bg-slate-50",
    progressColor: "bg-slate-500",
    description: "All time",
  },
  {
    title: "Pending",
    key: "pending",
    icon: <FiClock className="h-5 w-5 text-amber-600" />,
    iconBg: "bg-amber-50",
    progressColor: "bg-amber-500",
    description: "Awaiting review",
  },
  {
    title: "Approved",
    key: "approved",
    icon: <FiCheckCircle className="h-5 w-5 text-emerald-600" />,
    iconBg: "bg-emerald-50",
    progressColor: "bg-emerald-500",
    description: "Successfully approved",
  },
  {
    title: "Rejected",
    key: "rejected",
    icon: <FiXCircle className="h-5 w-5 text-rose-600" />,
    iconBg: "bg-rose-50",
    progressColor: "bg-rose-500",
    description: "Not approved",
  },
];

const getStatusColor = (status: ReferralStatus) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
};

const ReferralsPage: React.FC = () => {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [searchBy, setSearchBy] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReferralStatus>("all");
  const [selectedReferral, setSelectedReferral] =
    useState<SuperAdminReferralItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ReferralStatus>("pending");
  const [updateComments, setUpdateComments] = useState("");

  const queryArgs = useMemo(
    () => ({
      pageNumber,
      pageSize,
      searchBy: searchBy.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [pageNumber, pageSize, searchBy, statusFilter],
  );

  const { data, isLoading, isError, error } =
    useGetAllReferralsQuery(queryArgs);
  useAppLoader(isLoading);
  const [updateReferralStatus, { isLoading: isUpdating }] =
    useUpdateReferralStatusMutation();

  const openUpdateModal = (item: SuperAdminReferralItem) => {
    setSelectedReferral(item);
    setUpdateStatus(item.status);
    setUpdateComments(item.comments ?? "");
  };

  const closeUpdateModal = () => {
    if (isUpdating) return;
    setSelectedReferral(null);
    setUpdateComments("");
    setUpdateStatus("pending");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUpdateReferral = async () => {
    if (!selectedReferral) return;
    try {
      const res = await updateReferralStatus({
        id: selectedReferral.id,
        status: updateStatus,
        comments: updateComments.trim(),
      }).unwrap();

      addToast({
        title: "Referral updated",
        description: res?.message ?? "Referral status updated successfully",
        color: "success",
      });

      closeUpdateModal();
    } catch (err: any) {
      addToast({
        title: "Update failed",
        description: err?.data?.message || err?.error || "Something went wrong",
        color: "danger",
      });
    }
  };

  const stats = data?.stats;
  const referrals = data?.referrals ?? [];
  const pagination = data?.pagination;

  const tableColumns = useMemo(
    () => [
      { key: "referredBy", label: "Referred By" },
      { key: "referredTo", label: "Referred To" },
      { key: "comments", label: "Comments" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Referred At" },
      { key: "actions", label: "Actions", width: "100px" },
    ],
    [],
  );

  const renderCell = (columnKey: string, rowData: SuperAdminReferralItem) => {
    switch (columnKey) {
      case "referredBy":
        return (
          <div>
            <p className="font-medium text-slate-900">{rowData.referredBy?.name || "—"}</p>
            <p className="text-xs text-slate-500">{rowData.referredBy?.email || "—"}</p>
            <p className="text-xs text-slate-500">{rowData.referredBy?.mobile || "—"}</p>
          </div>
        );
      case "referredTo":
        return (
          <div>
            <p className="font-medium text-slate-900">{rowData.referredTo?.name || "—"}</p>
            <p className="text-xs text-slate-500">{rowData.referredTo?.email || "—"}</p>
            <p className="text-xs text-slate-500">{rowData.referredTo?.mobile || "—"}</p>
          </div>
        );
      case "comments":
        return (
          <p className="max-w-xs text-slate-700">
            {rowData.comments || "—"}
          </p>
        );
      case "status":
        return (
          <Chip
            size="sm"
            variant="flat"
            color={getStatusColor(rowData.status)}
            className="font-semibold capitalize"
          >
            {rowData.status}
          </Chip>
        );
      case "createdAt":
        return (
          <span className="whitespace-nowrap text-slate-700">
            {rowData.createdAt ? formatDate(rowData.createdAt) : "—"}
          </span>
        );
      case "actions":
        return (
          <Button
            size="sm"
            variant="flat"
            color="primary"
            onPress={() => openUpdateModal(rowData)}
          >
            Update
          </Button>
        );
      default:
        return rowData[columnKey as keyof SuperAdminReferralItem];
    }
  };
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
  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Referrals"
        description="Review referral records and update their approval status."
        actions={
          <div className="w-full">
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
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {KPI_CARD_CONFIG.map((config) => {
          const value =
            config.key === "total"
              ? stats?.totalReferrals ?? 0
              : config.key === "pending"
                ? stats?.pendingReferrals ?? 0
                : config.key === "approved"
                  ? stats?.approvedReferrals ?? 0
                  : stats?.rejectedReferrals ?? 0;

          return (
            <KpiCards
              description={config.description}
              key={config.key}
              title={config.title}
              value={value}
              icon={config.icon}
              iconBg={config.iconBg}
              progressColor={config.progressColor}
              showProgress={false}
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SearchField
            placeholder="Search by referral code or user details..."
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

        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | ReferralStatus);
              setPageNumber(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <CommonTable
        columns={tableColumns}
        data={referrals}
        renderCell={renderCell}
        pagination={{
          currentPage: pageNumber,
          totalPages: pagination?.totalPages ?? 1,
          rowsPerPage: pageSize,
          totalRecords: pagination?.totalRecords ?? 0,
          onPageChange: setPageNumber,
          onRowsPerPageChange: () => { },
          showPagination: true,
          showRowsPerPage: false,
          showRowCount: true,
        }}
        state={{
          isLoading,
          hasError: isError,
          errorMessage: (error as any)?.data?.message || "Failed to load referrals",
          isEmpty: referrals.length === 0,
          emptyStateTitle: "No referrals found",
          emptyStateDescription: "No referrals match your search criteria.",
        }}
      />

      <Modal
        isOpen={Boolean(selectedReferral)}
        onOpenChange={(open) => !open && closeUpdateModal()}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Update Referral Status</ModalHeader>
              <ModalBody className="gap-4">
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as ReferralStatus)}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <Textarea
                  label="Comments"
                  placeholder="Add update comments..."
                  minRows={4}
                  value={updateComments}
                  onValueChange={setUpdateComments}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  isDisabled={isUpdating}
                  onPress={() => {
                    closeUpdateModal();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  isLoading={isUpdating}
                  onPress={handleUpdateReferral}
                >
                  Submit
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReferralInsights stats={stats ?? null} isLoading={isLoading} />
        <RecentActivity referrals={referrals} isLoading={isLoading} />
      </div>
    </PageContainer>
  );
};

export default ReferralsPage;