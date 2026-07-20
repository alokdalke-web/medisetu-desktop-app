import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Chip,
  addToast,
  useDisclosure,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Pagination,
} from "@heroui/react";
import {
  FiPlus,
  FiEdit,
  FiAlertCircle,
  FiCheckCircle,
  FiPauseCircle,
  FiChevronDown,
  FiChevronRight,
  FiShoppingBag,
  FiEye,
  FiMessageCircle,
  FiCheck,
} from "react-icons/fi";
import { BsFillWalletFill, BsFillPersonFill } from "react-icons/bs";
import { useNavigate } from "react-router";

import {
  useGetSubscriptionsQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  useGetSubscriptionStatsQuery,
  type Subscription,
  useGetSubscriptionNotificationsQuery,
  useMarkSubscriptionNotificationReadMutation,
  useGetSubscriptionSalesQuery,
  useGetSaleByIdQuery,
  useSendInvoiceWhatsAppMutation,
} from "../../redux/api/pharmaciesApi";
import SubscriptionModal from "./SubscriptionModal";
import SubscriptionNotificationModal from "./SubscriptionNotificationModal";
import SearchField from "../../components/shared/SearchField";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { patientSubscriptionTips } from "../../constants/featureTips";

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
            {sale.items.map((item: any) => (
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

      {/* PAYMENT DETAILS */}
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

type PageSize = 6 | 10 | 15;

// ─── Main Component ───────────────────────────────────────────────────────────

const pharmacyPatientSubscription: React.FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const navigate = useNavigate();

  // ── Filter states ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Status filter
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Date range states - initialize as empty
  const [displayStartDate, setDisplayStartDate] = useState<string>("");
  const [displayEndDate, setDisplayEndDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10 as PageSize,
  });

  // Rows per page dropdown state
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pageSizeOptions: PageSize[] = [6, 10, 15];

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

  // ── API hooks ──────────────────────────────────────────────────────────────
  const {
    data: subscriptionsData,
    isLoading: subscriptionsLoading,
    refetch,
  } = useGetSubscriptionsQuery({
    pageNumber: pagination.pageNumber,
    pageSize: pagination.pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter as any || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: statsData, isLoading: statsLoading } = useGetSubscriptionStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [createSubscription] = useCreateSubscriptionMutation();
  const [updateSubscription] = useUpdateSubscriptionMutation();

  // ── State for expanded rows ───────────────────────────────────────────────
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (subscriptionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(subscriptionId)) {
      newExpanded.delete(subscriptionId);
    } else {
      newExpanded.add(subscriptionId);
    }
    setExpandedRows(newExpanded);
  };

  const subscriptions = subscriptionsData?.data || [];
  const paginationInfo = subscriptionsData?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = statsData || {
    totalSubscriptions: { value: 0, percentageChange: 0, trend: "neutral" as const },
    activeSubscriptions: { value: 0, percentageFromTotal: 0, percentageChange: 0, trend: "neutral" as const },
    inactiveSubscriptions: { value: 0, percentageFromTotal: 0, percentageChange: 0, trend: "neutral" as const },
    pausedSubscriptions: { value: 0, percentageFromTotal: 0, percentageChange: 0, trend: "neutral" as const },
  };

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(prev => ({ ...prev, pageNumber: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, pageNumber: page }));
  };

  const handleRowsPerPageChange = (size: PageSize) => {
    setPagination(prev => ({ ...prev, pageSize: size, pageNumber: 1 }));
    setIsPageSizeOpen(false);
  };

  const handleStatusFilterChange = (statusKey: string) => {
    setStatusFilter(statusKey);
    setIsStatusOpen(false);
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
  };

  const onApplyRange = (startYmd: string, endYmd: string) => {
    if (!startYmd || !endYmd) return;
    
    setDisplayStartDate(startYmd);
    setDisplayEndDate(endYmd);
    setStartDate(`${startYmd}T00:00:00Z`);
    setEndDate(`${endYmd}T23:59:59Z`);
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
  };

  const handleClearDateRange = () => {
    setDisplayStartDate("");
    setDisplayEndDate("");
    setStartDate(null);
    setEndDate(null);
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
  };

  const handleCreateSubscription = async (data: any) => {
    await createSubscription(data).unwrap();
    addToast({
      title: "Success",
      description: "Subscription created successfully",
      color: "success",
    });
    refetch();
  };

  const handleUpdateSubscription = async (data: any) => {
    if (!selectedSubscription) return;
    await updateSubscription({
      id: selectedSubscription.id,
      body: data,
    }).unwrap();
    addToast({
      title: "Success",
      description: "Subscription updated successfully",
      color: "success",
    });
    refetch();
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsEditMode(true);
    onOpen();
  };

  const handleOpenCreateModal = () => {
    setSelectedSubscription(null);
    setIsEditMode(false);
    onOpen();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { color: "success" as const, label: "Active", icon: FiCheckCircle };
      case "paused":
        return { color: "warning" as const, label: "Paused", icon: FiPauseCircle };
      case "cancelled":
        return { color: "danger" as const, label: "Cancelled", icon: FiAlertCircle };
      default:
        return { color: "default" as const, label: status, icon: FiAlertCircle };
    }
  };

  const statusOptions = [
    { key: "", label: "Status - All" },
    { key: "active", label: "Status - Active" },
    { key: "paused", label: "Status - Paused" },
    { key: "cancelled", label: "Status - Cancelled" },
  ];

  const statusLabel = (key: string): string => {
    const option = statusOptions.find(opt => opt.key === key);
    return option ? option.label : "Status - All";
  };

  // ── Stats cards configuration ─────────────────────────────────────────────
  const statCards = [
    {
      title: "Total Subscriptions",
      value: stats.totalSubscriptions.value,
      percentageChange: stats.totalSubscriptions.percentageChange,
      trend: stats.totalSubscriptions.trend,
      icon: BsFillWalletFill,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
      detail: `${stats.totalSubscriptions.percentageChange > 0 ? '↑' : '↓'} ${Math.abs(stats.totalSubscriptions.percentageChange)}% from last month`,
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptions.value,
      percentageFromTotal: stats.activeSubscriptions.percentageFromTotal,
      percentageChange: stats.activeSubscriptions.percentageChange,
      trend: stats.activeSubscriptions.trend,
      icon: BsFillPersonFill,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600",
      detail: `${stats.activeSubscriptions.percentageFromTotal}% of total`,
    },
    {
      title: "Paused Subscriptions",
      value: stats.pausedSubscriptions.value,
      percentageFromTotal: stats.pausedSubscriptions.percentageFromTotal,
      percentageChange: stats.pausedSubscriptions.percentageChange,
      trend: stats.pausedSubscriptions.trend,
      icon: BsFillPersonFill,
      iconBg: "bg-amber-100 dark:bg-amber-900/20",
      iconColor: "text-amber-600",
      detail: `${stats.pausedSubscriptions.percentageFromTotal}% of total`,
    },
    {
      title: "Cancelled Subscriptions",
      value: stats.inactiveSubscriptions.value,
      percentageFromTotal: stats.inactiveSubscriptions.percentageFromTotal,
      percentageChange: stats.inactiveSubscriptions.percentageChange,
      trend: stats.inactiveSubscriptions.trend,
      icon: BsFillPersonFill,
      iconBg: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600",
      detail: `${stats.inactiveSubscriptions.percentageFromTotal}% of total`,
    },
  ];

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

    if (
      previousUnreadCountRef.current === 0 &&
      unreadCount > 0
    ) {
      onNotificationOpen();
    }

    if (
      unreadCount > previousUnreadCountRef.current
    ) {
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
  }, [
    notifications.length,
    isNotificationOpen,
    onNotificationOpen,
  ]);

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

  // ── Sales Modal states ────────────────────────────────────────────────────
  const [viewSalesModalOpen, setViewSalesModalOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [viewSalesPagination, setViewSalesPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
  });
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const { 
    data: subscriptionSalesData, 
    isFetching: isFetchingSales
  } = useGetSubscriptionSalesQuery(
    { 
      subscriptionId: selectedSubscriptionId || "", 
      pageNumber: viewSalesPagination.pageNumber,
      pageSize: viewSalesPagination.pageSize
    },
    { skip: !selectedSubscriptionId, refetchOnMountOrArgChange: true }
  );

  const { data: saleDetailData, isFetching: isFetchingSaleDetail } = useGetSaleByIdQuery(
    { id: selectedSaleId || "" },
    { skip: !selectedSaleId, refetchOnMountOrArgChange: true }
  );

  const [sendInvoiceWhatsApp] = useSendInvoiceWhatsAppMutation();

  const handleViewSales = (subscriptionId: string) => {
    setSelectedSubscriptionId(subscriptionId);
    setViewSalesPagination({ pageNumber: 1, pageSize: 10 });
    setViewSalesModalOpen(true);
  };

  const handleViewSalesPageChange = (page: number) => {
    setViewSalesPagination(prev => ({ ...prev, pageNumber: page }));
  };

  const handleViewInvoice = (saleId: string) => {
    setSelectedSaleId(saleId);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedSaleId(null);
  };

  const handleSendInvoiceWhatsApp = async () => {
    if (!selectedSaleId) return;
    try {
      await sendInvoiceWhatsApp({ saleId: selectedSaleId }).unwrap();
      addToast({
        title: "Success",
        description: "Invoice sent successfully",
        color: "success",
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to send invoice",
        color: "danger",
      });
    }
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

  const subscriptionSales = subscriptionSalesData?.data || [];
  const salesPaginationInfo = subscriptionSalesData?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  const isLoading = subscriptionsLoading;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id="tour-pharmacy-subscriptions-page"
      className="w-full min-w-0 scroll-mt-6 px-0 py-0"
    >
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Subscription Management
            </h2>
            <FeatureInfoTip
              title="Subscription Management Tips"
              tips={patientSubscriptionTips}
              guideSection="pharmacy-guide-subscriptions"
              linkLabel="Read subscription guide"
            />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
            Manage patient subscriptions and delivery schedules
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap xl:justify-end mb-2">
          <div className="shrink-0">
            <Button
              color="primary"
              startContent={<FiPlus />}
              onPress={handleOpenCreateModal}
              className="h-10 shrink-0 whitespace-nowrap bg-primary px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover"
            >
              New Subscription
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stat cards - Updated for better mobile responsiveness ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 xl:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isNegative = stat.trend === "decrease";
          const trendColor = isNegative ? "text-red-600" : "text-emerald-600";

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
                    {statsLoading ? "..." : stat.value}
                  </p>
                  <p className={["mt-0.5 truncate text-[10px] font-semibold sm:mt-1 sm:text-[12px]", trendColor].join(" ")}>
                    {stat.detail}
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
              placeholder="Search by name or mobile..."
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

          {/* Status filter dropdown - Matching Appointment style */}
          <div ref={statusDropdownRef} className="relative w-full sm:w-[190px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              onKeyDown={(e) => { if (e.key === "Escape") setIsStatusOpen(false); }}
              aria-expanded={isStatusOpen}
              aria-label="Subscription status filter"
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
          {subscriptionsLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-pulse text-slate-500 dark:text-white">Loading subscriptions...</div>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-white">
              No subscriptions found
            </div>
          ) : (
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-slate-50/80 dark:bg-[#111726]">
                <tr className="border-b border-slate-100 dark:border-[#273244]">
                  <th className="w-[4%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    #
                  </th>
                  <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Customer
                  </th>
                  <th className="w-[16%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Address
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Frequency
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Next Delivery
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Medicines
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Remarks
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Created At
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Status
                  </th>
                  <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                {subscriptions.map((subscription: Subscription) => {
                  const statusConfig = getStatusConfig(subscription.status);
                  const StatusIcon = statusConfig.icon;
                  const totalMedicineCount = subscription.medicines?.reduce(
                    (sum, m) => sum + m.quantity,
                    0
                  ) || 0;
                  const isExpanded = expandedRows.has(subscription.id);
                  const hasMedicines = subscription.medicines && subscription.medicines.length > 0;

                  return (
                    <React.Fragment key={subscription.id}>
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => hasMedicines && toggleRowExpansion(subscription.id)}
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-[#273244] ${!hasMedicines ? 'opacity-30 cursor-default' : ''}`}
                            disabled={!hasMedicines}
                          >
                            {hasMedicines ? (
                              isExpanded ? (
                                <FiChevronDown className="text-lg text-slate-500" />
                              ) : (
                                <FiChevronRight className="text-lg text-slate-500" />
                              )
                            ) : (
                              <FiChevronRight className="text-lg text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                              {subscription.customerName || "-"}
                            </span>
                            <span className="text-[12px] font-medium text-slate-500 dark:text-white">
                              {subscription.customerMobile || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                            {subscription.customerAddress || "-"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Chip variant="flat" color="primary" size="sm">
                            Every {subscription.frequencyDays} days
                          </Chip>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-[14px] font-semibold text-slate-900 dark:text-white ${isToday(subscription.nextDeliveryDate) && subscription.status === "active" ? "px-1 py-1 rounded-md bg-amber-200 animate-pulse dark:animate-pulse" : ""}`}>
                              {formatDate(subscription.nextDeliveryDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                              {subscription.medicines?.length || 0} medicines
                            </span>
                            <span className="text-[12px] font-medium text-slate-500 dark:text-white">
                              Total qty: {totalMedicineCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                            {subscription.remarks || "-"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                            {formatDate(subscription.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Chip
                            color={statusConfig.color}
                            variant="flat"
                            startContent={<StatusIcon className="text-sm" />}
                          >
                            {statusConfig.label}
                          </Chip>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Tooltip content="Edit Subscription">
                              <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                onPress={() => handleEditSubscription(subscription)}
                                className="min-w-0 h-8 px-2"
                              >
                                <FiEdit />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Generate Sale">
                              <Button
                                size="sm"
                                color="success"
                                variant="flat"
                                onPress={() => navigate(`/pharmacy/patient-subscription/generate-sale/${subscription.id}`)}
                                className="min-w-0 h-8 px-2"
                              >
                                <FiShoppingBag />
                              </Button>
                            </Tooltip>
                            {subscription.salesAvailable && (
                              <Tooltip content="View Sales">
                                <Button
                                  size="sm"
                                  color="secondary"
                                  variant="flat"
                                  onPress={() => handleViewSales(subscription.id)}
                                  className="min-w-0 h-8 px-2"
                                >
                                  <FiEye />
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && hasMedicines && (
                        <tr className="bg-slate-50/70 dark:bg-[#151e31]">
                          <td colSpan={11} className="px-5 py-4">
                            <div className="p-4">
                              <h3 className="text-[14px] font-bold text-slate-950 dark:text-white mb-3">
                                Medicines in this Subscription
                              </h3>
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-left">
                                  <thead className="bg-slate-100/80 dark:bg-[#1a2335]">
                                    <tr className="border-b border-slate-200 dark:border-[#273244]">
                                      <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">SKU</th>
                                      <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Medicine Name</th>
                                      <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Brand</th>
                                      <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Category</th>
                                      <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Form</th>
                                      <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Quantity</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                                    {subscription.medicines.map((medicine: any) => (
                                      <tr key={medicine.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a2335]">
                                        <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{medicine.sku || "-"}</td>
                                        <td className="px-4 py-2 text-[13px] font-bold text-slate-900 dark:text-white">{medicine.medicineName || "Unknown"}</td>
                                        <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{medicine.brand || "-"}</td>
                                        <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{medicine.category || "-"}</td>
                                        <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{medicine.form || "-"}</td>
                                        <td className="px-4 py-2 text-[13px] font-bold text-slate-900 dark:text-white">{medicine.quantity}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                Showing {subscriptions.length > 0 ? ((pagination.pageNumber - 1) * paginationInfo.pageSize) + 1 : 0}-
                {Math.min(pagination.pageNumber * paginationInfo.pageSize, paginationInfo.totalRecords)} of {paginationInfo.totalRecords} subscriptions
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
                      className={`text-primary transition-transform duration-200 ${
                        isPageSizeOpen ? "rotate-180" : ""
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

      {/* ── View Sales Modal ── */}
      <Modal
        isOpen={viewSalesModalOpen}
        onClose={() => {
          setViewSalesModalOpen(false);
          setSelectedSubscriptionId(null);
        }}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="text-xl font-bold">Sales History</h2>
                </div>
              </ModalHeader>
              <ModalBody className="py-4">
                {isFetchingSales ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-pulse text-slate-500">Loading sales...</div>
                  </div>
                ) : subscriptionSales.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    No sales found for this subscription
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/80 dark:bg-[#111726]">
                          <tr className="border-b border-slate-100 dark:border-[#273244]">
                            <th className="px-4 py-3 text-[12px] font-bold text-slate-500 dark:text-white">Sale Created At</th>
                            <th className="px-4 py-3 text-[12px] font-bold text-slate-500 dark:text-white">Units</th>
                            <th className="px-4 py-3 text-[12px] font-bold text-slate-500 dark:text-white">Total Amount</th>
                            <th className="px-4 py-3 text-[12px] font-bold text-slate-500 dark:text-white">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                          {subscriptionSales.map((sale: any) => (
                            <tr key={sale.createdAt} className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                              <td className="px-4 py-3 text-[13px] font-semibold text-slate-900 dark:text-white">
                                {formatDate(sale.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-[13px] font-semibold text-slate-900 dark:text-white">{sale.units}</td>
                              <td className="px-4 py-3 text-[13px] font-bold text-slate-900 dark:text-white">
                                ₹{parseFloat(sale.totalAmount).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  size="sm"
                                  color="primary"
                                  variant="flat"
                                  startContent={<FiEye className="text-sm" />}
                                  onPress={() => handleViewInvoice(sale.salesId)}
                                >
                                  View Invoice
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {salesPaginationInfo.totalPages > 1 && (
                      <div className="flex justify-center mt-4">
                        <Pagination
                          isCompact
                          showControls
                          total={salesPaginationInfo.totalPages}
                          page={viewSalesPagination.pageNumber}
                          onChange={handleViewSalesPageChange}
                          radius="lg"
                          classNames={{
                            wrapper: "gap-2",
                            item: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                            prev: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                            next: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                            cursor: "hidden",
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
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
                  {saleDetailData?.data?.patientMobile && (
                    <Button
                      color="success"
                      variant="flat"
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
                    formatCurrency={(amount: string | number) => {
                      const num = typeof amount === "string" ? parseFloat(amount) : amount;
                      return new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(num);
                    }}
                    formatDate={(dateString: string) => {
                      const date = new Date(dateString);
                      return date.toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      });
                    }}
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

      {/* ── Modals ── */}
      <SubscriptionModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onSave={isEditMode ? handleUpdateSubscription : handleCreateSubscription}
        initialData={selectedSubscription}
        isEditing={isEditMode}
      />

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

export default pharmacyPatientSubscription;
