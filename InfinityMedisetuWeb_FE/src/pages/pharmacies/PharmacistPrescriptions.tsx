import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Chip,
  addToast,
  useDisclosure,
  Tooltip,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { useNavigate, useLocation } from "react-router";
import {
  FiEye,
  FiPlay,
  FiMessageCircle,
  FiClock,
  FiXCircle,
  FiCheckCircle,
  FiPause,
  FiChevronDown,
  FiCheck,
} from "react-icons/fi";

import {
  useGetPrescriptionsQuery,
  useGetPrescriptionStatsQuery,
  useGetSaleByIdQuery,
  useGetSubscriptionNotificationsQuery,
  useMarkSubscriptionNotificationReadMutation,
  useSendInvoiceWhatsAppMutation,
  useUpdatePrescriptionStatusMutation,
  type PrescriptionStatus,
} from "../../redux/api/pharmaciesApi";

import SubscriptionNotificationModal from "./SubscriptionNotificationModal";
import SearchField from "../../components/shared/SearchField";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { prescriptionQueueTips } from "../../constants/featureTips";

type PageSize = 6 | 10 | 15;

// ====================== HELPERS ======================

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(num);
};

const getStatusConfig = (status: PrescriptionStatus) => {
  switch (status) {
    case "PENDING":
      return { color: "warning" as const, label: "Pending" };
    case "ON_HOLD":
      return { color: "secondary" as const, label: "On Hold" };
    case "COMPLETED":
      return { color: "success" as const, label: "Completed" };
    case "REJECTED":
      return { color: "danger" as const, label: "Rejected" };
    default:
      return { color: "default" as const, label: status };
  }
};

// ====================== COMPONENT ======================

const PharmacistPrescriptions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isOpen,
    onOpen,
    onOpenChange,
  } = useDisclosure();

  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<{
    id: string;
    status: PrescriptionStatus;
    prescriptionPdf: string | null;
  } | null>(null);

  // ── Filter states ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Status filter
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "">("");

  // Date range states
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayStart = `${todayDate}T00:00:00Z`;
  const todayEnd = `${todayDate}T23:59:59Z`;

  const [displayStartDate, setDisplayStartDate] = useState<string>(todayDate);
  const [displayEndDate, setDisplayEndDate] = useState<string>(todayDate);
  const [startDate, setStartDate] = useState<string | null>(todayStart);
  const [endDate, setEndDate] = useState<string | null>(todayEnd);

  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10 as PageSize,
  });

  // Rows per page dropdown state
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pageSizeOptions: PageSize[] = [6, 10, 15];

  const [processingPrescriptionId, setProcessingPrescriptionId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectPrescription, setSelectedRejectPrescription] = useState<{
    id: string;
    status: PrescriptionStatus;
  } | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // ── Click outside handlers ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsPageSizeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ── Handle location state for invoice opening ──
  useEffect(() => {
    const saleId = (location.state as any)?.openInvoiceId;
    if (!saleId) return;

    setSelectedSaleId(saleId);
    setIsInvoiceModalOpen(true);
    window.history.replaceState({}, document.title);
  }, [location]);

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, pageNumber: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // ── API hooks ──────────────────────────────────────────────────────────────
  const {
    data: prescriptionsData,
    isLoading: isFetching,
    refetch,
  } = useGetPrescriptionsQuery({
    pageNumber: pagination.pageNumber,
    pageSize: pagination.pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const [updatePrescriptionStatus] = useUpdatePrescriptionStatusMutation();

  const { data: saleDetailData, isFetching: isFetchingSaleDetail } = useGetSaleByIdQuery(
    { id: selectedSaleId || "" },
    { skip: !selectedSaleId }
  );

  const [sendInvoiceWhatsApp] = useSendInvoiceWhatsAppMutation();

  const prescriptions = prescriptionsData?.data || [];
  const paginationInfo = prescriptionsData?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const {
    data: prescriptionStats,
    isLoading: isPrescriptionStatsLoading,
  } = useGetPrescriptionStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const stats = [
    {
      title: "Pending Prescriptions",
      value: prescriptionStats?.pending?.count ?? 0,
      percentageOfTotal: prescriptionStats?.pending?.percentageOfTotal ?? 0,
      icon: FiClock,
      iconBg: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600",
      trend: "neutral" as const,
    },
    {
      title: "On-Hold Prescriptions",
      value: prescriptionStats?.onHold?.count ?? 0,
      percentageOfTotal: prescriptionStats?.onHold?.percentageOfTotal ?? 0,
      icon: FiPause,
      iconBg: "bg-orange-100 dark:bg-orange-900/20",
      iconColor: "text-orange-600",
      trend: "neutral" as const,
    },
    {
      title: "Completed Prescriptions",
      value: prescriptionStats?.completed?.count ?? 0,
      percentageOfTotal: prescriptionStats?.completed?.percentageOfTotal ?? 0,
      icon: FiCheckCircle,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600",
      trend: "increase" as const,
    },
    {
      title: "Rejected Prescriptions",
      value: prescriptionStats?.rejected?.count ?? 0,
      percentageOfTotal: prescriptionStats?.rejected?.percentageOfTotal ?? 0,
      icon: FiXCircle,
      iconBg: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600",
      trend: "decrease" as const,
    },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (id: string, status: PrescriptionStatus) => {
    try {
      await updatePrescriptionStatus({
        id,
        body: { status },
      }).unwrap();

      addToast({
        title: "Success",
        description: "Prescription status updated successfully",
        color: "success",
      });

      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update prescription status",
        color: "danger",
      });
    }
  };

  const getAllowedStatusOptions = (currentStatus: PrescriptionStatus) => {
    switch (currentStatus) {
      case "PENDING":
        return [{ key: "REJECTED", label: "Rejected" }];
      case "ON_HOLD":
        return [
          { key: "PENDING", label: "Pending" },
          { key: "REJECTED", label: "Rejected" },
        ];
      default:
        return [];
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleRowsPerPageChange = (size: PageSize) => {
    setPagination((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }));
    setIsPageSizeOpen(false);
  };

  const handleStatusFilterChange = (statusKey: string) => {
    setStatusFilter(statusKey as PrescriptionStatus | "");
    setIsStatusOpen(false);
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const onApplyRange = (startYmd: string, endYmd: string) => {
    if (!startYmd || !endYmd) return;

    setDisplayStartDate(startYmd);
    setDisplayEndDate(endYmd);
    setStartDate(`${startYmd}T00:00:00Z`);
    setEndDate(`${endYmd}T23:59:59Z`);
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handleClearDateRange = () => {
    setDisplayStartDate("");
    setDisplayEndDate("");
    setStartDate(null);
    setEndDate(null);
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handleViewInvoice = (saleId: string) => {
    setSelectedSaleId(saleId);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedSaleId(null);
  };

  const handlePrintInvoice = () => {
    const invoice = document.getElementById("print-invoice");
    if (!invoice) return;

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { margin: 0; padding: 8px; background: #fff; }
          @page { size: A4; margin: 5mm; }
        </style>
      </head>
      <body>
        ${invoice.outerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const handleSendInvoiceWhatsApp = async () => {
    if (!selectedSaleId) return;

    try {
      setIsSendingWhatsApp(true);
      const response = await sendInvoiceWhatsApp({ saleId: selectedSaleId }).unwrap();
      addToast({
        title: "Success",
        description: response.message || "Invoice sent successfully",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to send invoice",
        color: "danger",
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleViewPrescription = (prescription: {
    id: string;
    status: PrescriptionStatus;
    prescriptionPdf: string | null;
  }) => {
    if (!prescription.prescriptionPdf) {
      addToast({
        title: "PDF Not Found",
        description: "Prescription PDF is not available",
        color: "warning",
      });
      return;
    }

    setSelectedPdf(prescription.prescriptionPdf);
    setSelectedPrescription({
      id: prescription.id,
      status: prescription.status,
      prescriptionPdf: prescription.prescriptionPdf,
    });
    onOpen();
  };

  const processingRef = useRef(false);

  const handleStartProcess = async (prescriptionId: string) => {
    if (processingRef.current) return;

    processingRef.current = true;
    setProcessingPrescriptionId(prescriptionId);

    try {
      const prescription = prescriptions.find((item) => item.id === prescriptionId);
      if (!prescription?.status) {
        throw new Error("Prescription not found");
      }

      if (prescription.status === "PENDING") {
        await updatePrescriptionStatus({
          id: prescriptionId,
          body: { status: "ON_HOLD" },
        }).unwrap();

        addToast({
          title: "Prescription updated",
          description: "Prescription status set to On Hold.",
          color: "success",
        });
      }

      navigate(`/pharmacy/prescriptions/process/${prescriptionId}`);
    } catch {
      addToast({
        title: "Failed to process prescription",
        description: "Unable to set prescription status to On Hold.",
        color: "danger",
      });
    } finally {
      processingRef.current = false;
      setProcessingPrescriptionId(null);
    }
  };

  // ── Status options ──────────────────────────────────────────────────────
  const statusOptions = [
    { key: "", label: "Status - All" },
    { key: "PENDING", label: "Status - Pending" },
    { key: "ON_HOLD", label: "Status - On Hold" },
    { key: "COMPLETED", label: "Status - Completed" },
    { key: "REJECTED", label: "Status - Rejected" },
  ];

  const statusLabel = (key: string): string => {
    const option = statusOptions.find(opt => opt.key === key);
    return option ? option.label : "Status - All";
  };

  // ── Notification code ──────────────────────────────────────────────────────
  const {
    isOpen: isNotificationOpen,
    onOpen: onNotificationOpen,
    onOpenChange: onNotificationOpenChange,
    onClose: onNotificationClose,
  } = useDisclosure();

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
  } = useGetSubscriptionNotificationsQuery(undefined, {
    pollingInterval: 300000,
    refetchOnMountOrArgChange: true,
  });

  const [markNotificationRead] = useMarkSubscriptionNotificationReadMutation();

  const notifications = notificationsData?.data || [];
  const previousUnreadCountRef = useRef(0);

  useEffect(() => {
    const unreadCount = notifications.length;

    if (previousUnreadCountRef.current === 0 && unreadCount > 0) {
      onNotificationOpen();
    }

    if (unreadCount > previousUnreadCountRef.current) {
      onNotificationOpen();
    }

    previousUnreadCountRef.current = unreadCount;
  }, [notifications, onNotificationOpen]);

  useEffect(() => {
    if (!notifications.length) return;

    const interval = setInterval(() => {
      if (!isNotificationOpen) {
        onNotificationOpen();
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [notifications.length, isNotificationOpen, onNotificationOpen]);

  const handleMarkAsRead = async () => {
    try {
      await markNotificationRead().unwrap();
      previousUnreadCountRef.current = 0;
      onNotificationClose();

      addToast({
        title: "Success",
        description: "All notifications marked as read",
        color: "success",
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to mark notifications as read",
        color: "danger",
      });
    }
  };

  const handleCloseNotificationModal = () => {
    onNotificationClose();
  };

  const isLoading = isFetching;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id="tour-pharmacy-prescriptions-page"
      className="w-full min-w-0 scroll-mt-6 px-0 py-0"
    >
      {/* ── Page header ── */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
            Prescriptions
          </h2>
          <FeatureInfoTip
            title="Prescription Queue Guide"
            tips={prescriptionQueueTips}
            guideSection="pharmacy-guide-prescriptions"
            linkLabel="Read prescriptions guide"
          />
        </div>
        <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
          Manage and process patient prescriptions
        </p>
      </div>

      {/* ── Stat cards - Updated for better mobile responsiveness ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const trendColor = stat.trend === "decrease" ? "text-red-600" : "text-emerald-600";

          return (
            <div
              key={index}
              className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sm:px-4 sm:py-4"
            >
              <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
                <div className={["grid h-10 w-10 shrink-0 place-items-center rounded-full sm:h-12 sm:w-12", stat.iconBg].join(" ")}>
                  <Icon className={["text-lg sm:text-xl", stat.iconColor].join(" ")} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-white sm:text-[13px]">
                    {stat.title}
                  </p>
                  <p className="mt-0.5 text-[18px] font-bold leading-none text-slate-900 dark:text-white sm:text-[24px]">
                    {isPrescriptionStatsLoading ? "..." : stat.value.toLocaleString()}
                  </p>
                  <p className={["mt-0.5 truncate text-[10px] font-semibold sm:mt-1 sm:text-[12px]", trendColor].join(" ")}>
                    {stat.percentageOfTotal}% of total
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar - Updated for better mobile responsiveness ── */}
      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Search - Using SearchField component */}
          <div className="w-full sm:w-[320px]">
            <SearchField
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search by patient or doctor..."
              maxLength={50}
              className="w-full"
              classNames={{
                inputWrapper:
                  "h-11 rounded-lg border border-slate-200 bg-white px-3 shadow-sm " +
                  "data-[hover=true]:border-slate-300 data-[focus=true]:border-primary " +
                  "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                input:
                  "text-[14px] text-slate-700 placeholder:text-[14px] placeholder:text-slate-400 dark:text-white dark:placeholder:text-white",
              }}
            />
          </div>

          {/* Status filter dropdown */}
          <div ref={statusDropdownRef} className="relative w-full sm:w-[190px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              onKeyDown={(e) => { if (e.key === "Escape") setIsStatusOpen(false); }}
              aria-expanded={isStatusOpen}
              aria-label="Status filter"
              className={[
                "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white",
                "px-3 text-[13px] font-semibold text-slate-700 shadow-sm",
                "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                "outline-none transition",
                "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              ].join(" ")}
            >
              <span className="truncate text-left">{statusLabel(statusFilter)}</span>
              <FiChevronDown
                className={`ml-2 shrink-0 text-slate-500 transition-transform duration-200 dark:text-white ${isStatusOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isStatusOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                {statusOptions.map((option) => {
                  const isActive = statusFilter === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleStatusFilterChange(option.key)}
                      className={[
                        "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                        isActive
                          ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                          : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                      ].join(" ")}
                    >
                      <span className="line-clamp-2">{option.label}</span>
                      {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date range picker */}
          <div className="flex w-full items-center gap-2 sm:w-auto [&>div]:!w-full sm:[&>div]:!w-auto [&_button]:!h-10 [&_button]:!rounded-lg [&_button]:!border-slate-200 [&_button]:!px-3 [&_button]:!shadow-sm [&_button_span]:!text-[13px]">
            <DashboardDateRangePicker
              startYmd={displayStartDate}
              endYmd={displayEndDate}
              isFetching={isLoading}
              onApply={(s, e) => onApplyRange(s, e)}
            />
          </div>

          {/* Clear button - Only shows when dates are selected */}
          {displayStartDate && displayEndDate && (
            <Button
              variant="bordered"
              className="h-10 text-[13px] font-semibold rounded-lg text-slate-600"
              onPress={handleClearDateRange}
            >
              Clear Dates
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="mt-4 overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
        <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          {isFetching ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-pulse text-slate-500 dark:text-white">Loading prescriptions...</div>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-white">
              No prescriptions found for today
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50/80 dark:bg-[#111726]">
                <tr className="border-b border-slate-100 dark:border-[#273244]">
                  <th className="w-[20%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Patient
                  </th>
                  <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Doctor
                  </th>
                  <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Date
                  </th>
                  <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Status
                  </th>
                  <th className="w-[32%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                {prescriptions.map((item) => {
                  const statusConfig = getStatusConfig(item.status);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                      <td className="px-5 py-4">
                        <div>
                          <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                            {item.patient.name}
                          </span>
                          <div className="text-[12px] font-medium text-slate-500 dark:text-white">
                            {item.patient.age ? `${item.patient.gender} | ${item.patient.age}y | ${item.patient.mobile}` : ""}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                            Dr. {item.doctor.name}
                          </span>
                          <div className="text-[12px] font-medium text-slate-500 dark:text-white">
                            {item.doctor.speciality}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {formatDate(item.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {item.status === "COMPLETED" || item.status === "REJECTED" ? (
                          <Chip color={statusConfig.color} variant="flat" size="sm">
                            {statusConfig.label}
                          </Chip>
                        ) : (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                const dropdown = document.getElementById(`status-dropdown-${item.id}`);
                                if (dropdown) {
                                  dropdown.classList.toggle("hidden");
                                }
                              }}
                              className={[
                                "flex h-9 w-full max-w-[170px] cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white",
                                "px-3 text-[13px] font-semibold text-slate-700 shadow-sm",
                                "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                                "outline-none transition",
                                "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                              ].join(" ")}
                            >
                              <Chip color={statusConfig.color} variant="flat" size="sm">
                                {statusConfig.label}
                              </Chip>
                              <FiChevronDown className="ml-2 shrink-0 text-slate-500 dark:text-white" />
                            </button>
                            <div
                              id={`status-dropdown-${item.id}`}
                              className="absolute left-0 top-[calc(100%+4px)] z-50 hidden min-w-[170px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30"
                            >
                              {[
                                { key: item.status, label: statusConfig.label, disabled: true },
                                ...getAllowedStatusOptions(item.status).map((option) => ({
                                  key: option.key,
                                  label: option.label,
                                  disabled: false,
                                })),
                              ].map((option) => (
                                <button
                                  key={option.key}
                                  type="button"
                                  disabled={option.disabled}
                                  onClick={async () => {
                                    if (option.key === "REJECTED") {
                                      setSelectedRejectPrescription({
                                        id: item.id,
                                        status: option.key as PrescriptionStatus,
                                      });
                                      setRejectModalOpen(true);
                                      const dropdown = document.getElementById(`status-dropdown-${item.id}`);
                                      if (dropdown) dropdown.classList.add("hidden");
                                      return;
                                    }
                                    await handleUpdateStatus(item.id, option.key as PrescriptionStatus);
                                    const dropdown = document.getElementById(`status-dropdown-${item.id}`);
                                    if (dropdown) dropdown.classList.add("hidden");
                                  }}
                                  className={[
                                    "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                                    option.disabled
                                      ? "cursor-default opacity-60"
                                      : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                                  ].join(" ")}
                                >
                                  <span className="line-clamp-2">{option.label}</span>
                                  {option.disabled && <FiCheck className="h-4 w-4 shrink-0 text-teal-600" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {item.prescriptionPdf ? (
                            <Tooltip content="View Prescription">
                              <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                onPress={() => handleViewPrescription({
                                  id: item.id,
                                  status: item.status,
                                  prescriptionPdf: item.prescriptionPdf,
                                })}
                                className="min-w-0 h-8 px-2"
                              >
                                <FiEye /> View Prescription
                              </Button>
                            </Tooltip>
                          ) : null}

                          {item.status === "COMPLETED" && item.id && (
                            <Tooltip content="View Invoice">
                              <Button
                                size="sm"
                                color="secondary"
                                variant="flat"
                                onPress={() => handleViewInvoice(item.id)}
                                className="min-w-0 h-8 px-2"
                              >
                                <FiEye className="text-sm" /> View Invoice
                              </Button>
                            </Tooltip>
                          )}

                          {(item.status === "PENDING" || item.status === "ON_HOLD") && (
                            <Button
                              size="sm"
                              color="success"
                              variant="flat"
                              startContent={<FiPlay className="text-sm" />}
                              onPress={() => handleStartProcess(item.id)}
                              isDisabled={processingPrescriptionId !== null}
                              className="min-w-0 h-8 px-3 text-[12px] font-semibold"
                            >
                              {item.status === "ON_HOLD" ? "Resume" : "Process"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Bottom Controls ── */}
        <div className="border-t border-slate-100 px-4 py-3 dark:border-[#273244]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-center sm:justify-start">
              <span className="text-center text-[13px] font-medium text-slate-500 dark:text-white sm:text-left">
                Showing {prescriptions.length > 0 ? ((pagination.pageNumber - 1) * paginationInfo.pageSize) + 1 : 0}-
                {Math.min(pagination.pageNumber * paginationInfo.pageSize, paginationInfo.totalRecords)} of {paginationInfo.totalRecords} prescriptions
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
              <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 dark:text-white sm:justify-start">
                <span className="whitespace-nowrap">Rows per page:</span>

                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPageSizeOpen((prev) => !prev)}
                    className={[
                      "flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35",
                      "bg-white px-3 text-[13px] font-semibold text-primary shadow-sm",
                      "dark:bg-[#111726] dark:text-white",
                      "outline-none transition",
                      "hover:border-primary/60 hover:bg-primary/5",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                    ].join(" ")}
                  >
                    <span>{pagination.pageSize}</span>

                    <FiChevronDown
                      className={`text-primary transition-transform duration-200 ${isPageSizeOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {isPageSizeOpen && (
                    <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                      {pageSizeOptions.map((size) => {
                        const active = pagination.pageSize === size;

                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => handleRowsPerPageChange(size)}
                            className={[
                              "flex h-9 w-full items-center px-3 text-left text-[13px] transition",
                              active
                                ? "bg-primary text-white"
                                : "bg-white text-slate-700 hover:bg-primary/5 hover:text-primary dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31] dark:hover:text-white",
                            ].join(" ")}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {paginationInfo.totalPages > 1 && (
                <div className="flex justify-center lg:justify-end">
                  <Pagination
                    isCompact
                    showControls
                    total={paginationInfo.totalPages}
                    page={pagination.pageNumber}
                    onChange={handlePageChange}
                    radius="lg"
                    classNames={{
                      wrapper: "gap-2 flex-wrap justify-center lg:justify-end",
                      item: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                      prev: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                      next: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                      cursor: "hidden",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Prescription PDF Modal ── */}
      <Modal
        isOpen={isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedPdf(null);
            setSelectedPrescription(null);
          }
          onOpenChange();
        }}
        size="5xl"
        scrollBehavior="inside"
        classNames={{ base: "h-[90vh]" }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                <span>Prescription Preview</span>
                {selectedPrescription &&
                  (selectedPrescription.status === "PENDING" ||
                    selectedPrescription.status === "ON_HOLD") && (
                    <div className="flex justify-end me-8 gap-2">
                      <Button
                        size="sm"
                        color="success"
                        variant="flat"
                        startContent={<FiPlay className="text-sm" />}
                        onPress={async () => {
                          onOpenChange();
                          await handleStartProcess(selectedPrescription.id);
                        }}
                        isDisabled={processingPrescriptionId !== null}
                      >
                        {selectedPrescription.status === "ON_HOLD" ? "Resume" : "Process"}
                      </Button>
                    </div>
                  )}
              </ModalHeader>

              <ModalBody className="p-0">
                {selectedPdf ? (
                  <iframe
                    src={selectedPdf}
                    title="Prescription PDF"
                    width="100%"
                    height="100%"
                    className="min-h-[75vh] border-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[75vh] text-slate-500">
                    No PDF available
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Reject Confirmation Modal ── */}
      <Modal isOpen={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Reject Prescription</ModalHeader>
              <ModalBody className="pb-6">
                <div className="space-y-4">
                  <p className="text-sm text-default-600">
                    Are you sure you want to reject this prescription?
                  </p>
                  <p className="text-sm font-medium text-danger">
                    This action cannot be reversed.
                  </p>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="flat" onPress={onClose}>
                      Cancel
                    </Button>
                    <Button
                      color="danger"
                      onPress={async () => {
                        if (!selectedRejectPrescription) return;
                        await handleUpdateStatus(selectedRejectPrescription.id, "REJECTED");
                        onClose();
                        setSelectedRejectPrescription(null);
                      }}
                    >
                      Reject Prescription
                    </Button>
                  </div>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Invoice Modal ── */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={handleCloseInvoiceModal}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                <span>Invoice</span>
                <div className="flex justify-end me-8 gap-2 print:hidden">
                  {!isFetchingSaleDetail && saleDetailData?.data?.patientMobile && (
                    <Button
                      color="success"
                      variant="flat"
                      isLoading={isSendingWhatsApp}
                      onPress={handleSendInvoiceWhatsApp}
                    >
                      <FiMessageCircle /> WhatsApp Invoice
                    </Button>
                  )}
                  <Button
                    color="primary"
                    variant="flat"
                    onClick={handlePrintInvoice}
                  >
                    Print Invoice
                  </Button>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                {isFetchingSaleDetail ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-pulse text-slate-500">Loading invoice...</div>
                  </div>
                ) : saleDetailData?.data ? (
                  <InvoiceContent
                    sale={saleDetailData.data}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                ) : (
                  <div className="text-center py-10 text-slate-500">
                    Failed to load invoice details
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Notification Modal ── */}
      <SubscriptionNotificationModal
        isOpen={isNotificationOpen}
        onOpenChange={onNotificationOpenChange}
        notifications={notifications}
        loading={notificationsLoading}
        onMarkAsRead={handleMarkAsRead}
        onClose={handleCloseNotificationModal}
      />
    </div>
  );
};

// ─── Invoice Content Component ───────────────────────────────────────────────
interface InvoiceContentProps {
  sale: any;
  formatCurrency: (amount: string | number) => string;
  formatDate: (dateString: string) => string;
}

const InvoiceContent: React.FC<InvoiceContentProps> = ({ sale, formatCurrency, formatDate }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).toLowerCase();
  };

  return (
    <div
      id="print-invoice"
      className="space-y-4 p-4 bg-[#fffdf7] rounded-none print:bg-white text-black border border-black/25"
      style={{
        fontFamily: '"Courier New", "Lucida Console", monospace',
        letterSpacing: "1px",
        fontWeight: 700,
        textTransform: "uppercase",
        imageRendering: "pixelated",
        filter: "contrast(1.1)",
      }}
    >
      {/* PHARMACY HEADER */}
      <div className="border-b border-slate-300 dark:border-slate-600 pb-1 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {sale.pharmacyName}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {sale.pharmacyAddress}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Phone: {sale.pharmacyContactNumber}
        </p>
      </div>

      {/* INVOICE DETAILS */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-dark dark:text-white uppercase">
              Invoice ID: <span className="text-xs text-gray-500">{sale.id?.split('-').pop()}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-dark dark:text-white uppercase">
              Date: <span className="text-xs text-gray-500">{formatDate(sale.createdAt)} ({formatTime(sale.createdAt)})</span>
            </p>
          </div>
        </div>
      </div>

      {/* CUSTOMER DETAILS */}
      <div className="border-l-4 border-r-4 border-gray px-8 bg-gray-100 dark:bg-gray-950 py-2 rounded flex justify-between">
        <div>
          <p className="text-xs font-semibold text-dark dark:text-white uppercase mb-1">Customer Details</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{sale.patientName}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{sale.patientMobile}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-dark dark:text-white uppercase mb-1">Payment Details</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{sale.paymentMethod}</p>
          {sale.paymentNotes && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {sale.paymentNotes}
            </p>
          )}
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="overflow-x-auto pt-2">
        <table className="w-full min-w-full text-sm table-fixed">
          <thead>
            <tr className="border-b-2 border-slate-300 dark:border-slate-600">
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[30%]">Medicine</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[10%]">Qty</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">MRP</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">Amount</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">Disc <span className="font-sans">%</span></th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">GST <span className="font-sans">%</span></th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item: any) => (
              <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="py-2 px-2 text-slate-900 dark:text-white">
                  <div>
                    <p className="font-semibold text-left text-slate-700 dark:text-slate-300">{item.medicineName}</p>
                  </div>
                </td>
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{item.quantity}</td>
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(item.mrp)}</td>
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(item.mrp * item.quantity)}</td>
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{item.discountPercent}<span className="font-sans">%</span></td>
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{item.gstPercentage}<span className="font-sans">%</span></td>
                <td className="py-2 px-2 text-left font-bold text-slate-900 dark:text-white">
                  {formatCurrency(
                    (
                      Number(item.mrp) *
                      item.quantity *
                      (1 - Number(item.discountPercent) / 100)
                    ) +
                    (
                      Number(item.mrp) *
                      item.quantity *
                      (1 - Number(item.discountPercent) / 100) *
                      (Number(item.gstPercentage) / 100)
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AMOUNT SUMMARY */}
      <div className="flex flex-col md:flex-row justify-end items-end gap-6">
        <div className="w-full md:w-80 pt-2">
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-900 dark:text-white">Sub-total</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-900 dark:text-white">Discount</span>
            <span className="font-semibold text-slate-900 dark:text-white">-{formatCurrency(sale.discountAmount)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-900 dark:text-white">GST (CGST+SGST)</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(sale.gstAmount)}</span>
          </div>
          <div className="flex justify-between py-3 rounded font-bold text-lg">
            <span className="text-slate-900 dark:text-white">Total Amount</span>
            <span className="text-slate-900 dark:text-white">{formatCurrency(sale.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="gap-4 border-t border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-1 text-[10px]">
        <p>◦ Schedule H and H1 medicines are sold only with valid prescriptions.</p>
        <p>◦ Verify medicine details, expiry and quantity before leaving pharmacy.</p>
        <p>◦ Store medicines properly and keep away from sunlight and children always.</p>
        <p>◦ {sale.pharmacyName} will not be responsible for medicine misuse or overdose.</p>
      </div>
      <div className="flex justify-center">
        <img
          src="https://infinitymedisetu.com/assets/images/logoDark.svg"
          alt="MediSetu Logo"
          className="w-20 object-contain grayscale"
        />
      </div>
    </div>
  );
};

export default PharmacistPrescriptions;
