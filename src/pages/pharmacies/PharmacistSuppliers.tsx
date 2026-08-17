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
  ModalFooter,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  FiEdit2,
  FiPlus,
  FiDownload,
  FiUpload,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiCheckSquare,
  FiChevronDown,
  FiCheck,
} from "react-icons/fi";
import {
  useGetAllSuppliersQuery,
  useAddSupplierMutation,
  useUpdatePharmacySupplierMutation,
  useDownloadSupplierSampleTemplateMutation,
  useImportSupplierMutation,
  type AddSupplierRequest,
  type UpdatePharmacySupplierRequest,
  useExportSuppliersMutation,
  useGetSupplierStatsQuery,
  useGetSubscriptionNotificationsQuery,
  useMarkSubscriptionNotificationReadMutation,
} from "../../redux/api/pharmaciesApi";
import SubscriptionNotificationModal from "./component/SubscriptionNotificationModal";
import SupplierFormModal, { type Supplier } from "./component/SupplierFormModal";
import BulkUploadModal from "./component/BulkUploadModal";
import SearchField from "../../components/shared/SearchField";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { supplierTips } from "../../constants/featureTips";
import PharmacyStatCard from "./component/PharmacyStatCard";

type PageSize = 6 | 10 | 15;

const PharmacistSuppliers: React.FC = () => {
  const {
    isOpen: isAddSupplierOpen,
    onOpen: onAddSupplierOpen,
    onOpenChange: onAddSupplierOpenChange,
  } = useDisclosure();
  const {
    isOpen: isEditSupplierOpen,
    onOpen: onEditSupplierOpen,
    onOpenChange: onEditSupplierOpenChange,
  } = useDisclosure();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Status filter
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10 as PageSize,
  });

  // Rows per page dropdown state
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pageSizeOptions: PageSize[] = [6, 10, 15];

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedSupplierFile, setSelectedSupplierFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    show: boolean;
    data?: {
      totalInserted: number;
      totalUpdated: number;
      totalSkipped: number;
      totalErrors: number;
      insertedSuppliers?: string[];
      updatedSuppliers?: string[];
      skippedSuppliers?: string[];
      errors?: string[];
    };
  }>({ show: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(prev => ({ ...prev, pageNumber: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { 
    data: suppliersData, 
    isLoading: isFetching,
    refetch
  } = useGetAllSuppliersQuery({
    pageNumber: pagination.pageNumber,
    pageSize: pagination.pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter as "active" | "inactive" | undefined,
  });

  const [addSupplier, { isLoading: isAddingSupplier }] = useAddSupplierMutation();
  const [updateSupplier, { isLoading: isUpdatingSupplier }] = useUpdatePharmacySupplierMutation();
  const [downloadSupplierSampleTemplate, { isLoading: isDownloadingTemplate }] = useDownloadSupplierSampleTemplateMutation();
  const [importSupplier, { isLoading: isImporting }] = useImportSupplierMutation();
  const [exportSuppliers, { isLoading: isExporting }] = useExportSuppliersMutation();

  const suppliers = suppliersData?.data || [];
  const paginationInfo = suppliersData?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  const {
    data: supplierStats,
    isLoading: isStatsLoading,
  } = useGetSupplierStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const percentageChange = supplierStats?.totalSuppliers?.percentageChange ?? 0;
  const isIncrease = percentageChange >= 0;

  const stats = [
    {
      title: "Total Suppliers",
      value: supplierStats?.totalSuppliers?.count ?? 0,
      subText: percentageChange === 0
        ? "No change from previous week"
        : `${isIncrease ? "↑" : "↓"} ${Math.abs(percentageChange)}% from previous week`,
      icon: FiUsers,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
      subColor: percentageChange === 0
        ? "text-slate-500"
        : isIncrease
        ? "text-emerald-600"
        : "text-red-600",
      trend: percentageChange === 0 ? "neutral" as const : isIncrease ? "increase" as const : "decrease" as const,
    },
    {
      title: "Active Suppliers",
      value: supplierStats?.activeSuppliers?.count ?? 0,
      subText: `${supplierStats?.activeSuppliers?.percentageOfTotal ?? 0}% of total`,
      icon: FiCheckCircle,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600",
      subColor: "text-emerald-600",
      trend: "increase" as const,
    },
    {
      title: "Inactive Suppliers",
      value: supplierStats?.inactiveSuppliers?.count ?? 0,
      subText: `${supplierStats?.inactiveSuppliers?.percentageOfTotal ?? 0}% of total`,
      icon: FiXCircle,
      iconBg: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600",
      subColor: "text-red-600",
      trend: "decrease" as const,
    },
    {
      title: "GST Registered",
      value: supplierStats?.gstRegisteredSuppliers?.count ?? 0,
      subText: `${supplierStats?.gstRegisteredSuppliers?.percentageOfTotal ?? 0}% of total`,
      icon: FiCheckSquare,
      iconBg: "bg-amber-100 dark:bg-amber-900/20",
      iconColor: "text-amber-600",
      subColor: "text-amber-600",
      trend: "increase" as const,
    },
  ];

  const handleAddSupplier = async (data: AddSupplierRequest) => {
    try {
      await addSupplier(data).unwrap();
      addToast({
        title: "Success",
        description: "Supplier added successfully",
        color: "success",
      });
      setPagination({ pageNumber: 1, pageSize: 10 });
      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to add supplier",
        color: "danger",
      });
      throw error;
    }
  };

  const handleUpdateSupplier = async (data: UpdatePharmacySupplierRequest) => {
    if (!selectedSupplier) return;

    try {
      await updateSupplier({
        supplierId: selectedSupplier.id,
        body: data,
      }).unwrap();
      addToast({
        title: "Success",
        description: "Supplier updated successfully",
        color: "success",
      });
      setSelectedSupplier(null);
      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update supplier",
        color: "danger",
      });
      throw error;
    }
  };

  const handleDownloadSupplierSampleTemplate = async () => {
    try {
      const blob = await downloadSupplierSampleTemplate().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `supplier-sample-template-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addToast({
        title: "Success",
        description: "Sample template downloaded successfully",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to download sample template",
        color: "danger",
      });
    }
  };

  const handleExportSuppliers = async () => {
    try {
      const blob = await exportSuppliers().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `suppliers-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addToast({
        title: "Success",
        description: "Suppliers exported successfully",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to export suppliers",
        color: "danger",
      });
    }
  };

  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
  };

  const handleUploadBulkSuppliers = async (file: File) => {
    const result = await importSupplier(file).unwrap();
    refetch();
    return result.data;
  };

  const handleOpenAddModal = () => {
    setSelectedSupplier(null);
    onAddSupplierOpen();
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    onEditSupplierOpen();
  };

  const handleEditSupplierOpenChange = (open: boolean) => {
    onEditSupplierOpenChange();

    if (!open) {
      setSelectedSupplier(null);
    }
  };

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

  const statusOptions = [
    { key: "", label: "Status - All" },
    { key: "active", label: "Status - Active" },
    { key: "inactive", label: "Status - Inactive" },
  ];

  const statusLabel = (key: string): string => {
    const option = statusOptions.find(opt => opt.key === key);
    return option ? option.label : "Status - All";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { color: "success" as const, label: "Active" };
      case "inactive":
        return { color: "danger" as const, label: "Inactive" };
      default:
        return { color: "default" as const, label: status };
    }
  };

  const isLoading = isFetching;

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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id="tour-pharmacy-suppliers-page"
      className="w-full min-w-0 scroll-mt-6 px-0 py-0"
    >
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Suppliers
            </h2>
            <FeatureInfoTip
              title="Suppliers Guide"
              tips={supplierTips}
              guideSection="pharmacy-guide-suppliers"
              linkLabel="Read suppliers guide"
            />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
            Manage medicine suppliers and contact information
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap xl:justify-end mb-2">
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiDownload />}
            className="h-10 shrink-0 border border-green-400 text-green-800 text-[13px] font-semibold rounded-lg"
            onPress={handleDownloadSupplierSampleTemplate}
            isLoading={isDownloadingTemplate}
          >
            Sample Template
          </Button>
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiUpload />}
            className="h-10 shrink-0 border border-blue-400 text-blue-800 text-[13px] font-semibold rounded-lg"
            onPress={handleOpenUploadModal}
            isLoading={isImporting}
          >
            Bulk Supplier
          </Button>
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiDownload />}
            className="h-10 shrink-0 text-[13px] font-semibold rounded-lg"
            onPress={handleExportSuppliers}
            isLoading={isExporting}
          >
            Export
          </Button>
          <Button
            color="primary"
            startContent={<FiPlus />}
            onPress={handleOpenAddModal}
            className="h-10 shrink-0 whitespace-nowrap bg-primary px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            Add Supplier
          </Button>
        </div>
      </div>

      {/* ── Stat cards - Updated for better mobile responsiveness ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <PharmacyStatCard
            key={index}
            title={stat.title}
            value={stat.value}
            detail={stat.subText}
            icon={stat.icon}
            iconBg={stat.iconBg}
            iconColor={stat.iconColor}
            isLoading={isStatsLoading}
            detailColor={stat.subColor}
          />
        ))}
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
              placeholder="Search suppliers by name or contact..."
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

          {/* Status filter dropdown - Matching subscription style */}
          <div ref={statusDropdownRef} className="relative w-full sm:w-[190px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              onKeyDown={(e) => { if (e.key === "Escape") setIsStatusOpen(false); }}
              aria-expanded={isStatusOpen}
              aria-label="Supplier status filter"
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
        </div>
      </div>

      {/* ── Table ── */}
      <div className="mt-4 overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
        <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-pulse text-slate-500 dark:text-white">Loading suppliers...</div>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-white">
              No suppliers found
            </div>
          ) : (
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-slate-50/80 dark:bg-[#111726]">
                <tr className="border-b border-slate-100 dark:border-[#273244]">
                  <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Supplier Name
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Contact Person
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Phone
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Email
                  </th>
                  <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Address
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    GST
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    PAN
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Credit Days
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Created At
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Status
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                {suppliers.map((supplier: Supplier) => {
                  const statusConfig = getStatusConfig(supplier.status);

                  return (
                    <tr key={supplier.id} className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {supplier.supplierName}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.contactPerson}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.phone}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.email || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.address || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.gstNumber || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.panNumber || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.creditDays || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {formatDate(supplier.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Chip
                          color={statusConfig.color}
                          variant="flat"
                          size="sm"
                        >
                          {statusConfig.label}
                        </Chip>
                      </td>
                      <td className="px-5 py-4">
                        <Tooltip content="Edit Supplier">
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            onPress={() => handleOpenEditModal(supplier)}
                            className="min-w-0 h-8 px-2"
                          >
                            <FiEdit2 />
                          </Button>
                        </Tooltip>
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
                Showing {suppliers.length > 0 ? ((pagination.pageNumber - 1) * paginationInfo.pageSize) + 1 : 0}-
                {Math.min(pagination.pageNumber * paginationInfo.pageSize, paginationInfo.totalRecords)} of {paginationInfo.totalRecords} suppliers
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

      {/* ── Upload Modal ── */}
      <BulkUploadModal
        isOpen={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        title="Upload Bulk Suppliers"
        type="supplier"
        onUpload={handleUploadBulkSuppliers}
        isUploading={isImporting}
      />

      {/* ── Supplier Form Modal ── */}
      <SupplierFormModal
        isOpen={isAddSupplierOpen}
        onOpenChange={onAddSupplierOpenChange}
        initialData={null}
        onSubmit={(data) => handleAddSupplier(data as AddSupplierRequest)}
        isLoading={isAddingSupplier}
      />

      <SupplierFormModal
        isOpen={isEditSupplierOpen}
        onOpenChange={handleEditSupplierOpenChange}
        initialData={selectedSupplier}
        onSubmit={(data) =>
          handleUpdateSupplier(data as UpdatePharmacySupplierRequest)
        }
        isLoading={isUpdatingSupplier}
      />

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

export default PharmacistSuppliers;
