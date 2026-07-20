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
  Spinner,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import {
  FiEdit2,
  FiPlus,
  FiDownload,
  FiUpload,
  FiCreditCard,
  FiFile,
  FiPackage,
  FiGrid,
  FiChevronDown,
  FiCheck,
  FiEye,
} from "react-icons/fi";

import {
  useGetAllMedicinesQuery,
  useAddMedicineMutation,
  useUpdateMedicineMutation,
  useGetHSNQuery,
  useGetMedicineCategoriesQuery,
  type AddMedicineRequest,
  type UpdateMedicineRequest,
  type Medicine,
  type HSN,
  useExportMedicinesMutation,
  useDownloadMedicineSampleTemplateMutation,
  useImportMedicineMutation,
  useGetMedicineStatsQuery,
  useGetSubscriptionNotificationsQuery,
  useMarkSubscriptionNotificationReadMutation,
  useGetMedicineTagsQuery,
} from "../../redux/api/pharmaciesApi";
import MedicineFormModal from "./MedicineFormModal";
import SubscriptionNotificationModal from "./SubscriptionNotificationModal";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { medicinesTips } from "../../constants/featureTips";
import SearchField from "../../components/shared/SearchField";

type PageSize = 6 | 10 | 15;

// Get stock status color based on available quantity vs reorder level
const getStockStatus = (
  availableQuantity: number,
  reorder: number
): {
  color: "success" | "warning" | "danger" | "default";
  label: string;
} => {
  if (availableQuantity === 0) {
    return {
      color: "default",
      label: "Empty Stock",
    };
  }

  if (availableQuantity <= reorder) {
    return {
      color: "danger",
      label: "Low Stock",
    };
  }

  if (availableQuantity <= reorder * 3) {
    return {
      color: "warning",
      label: "Medium Stock",
    };
  }

  return {
    color: "success",
    label: "Good Stock",
  };
};

const PharmacistMedicines: React.FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // ── Filter states ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Status filter
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");

  // Stock status filter
  const [isStockStatusOpen, setIsStockStatusOpen] = useState(false);
  const stockStatusDropdownRef = useRef<HTMLDivElement | null>(null);
  const [stockStatusFilter, setStockStatusFilter] = useState<"empty" | "low" | "medium" | "good" | "">("");

  // Category Filter
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryAutocompleteRef = useRef<HTMLDivElement>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [categoryInputValue, setCategoryInputValue] = useState("");

  // Tag Filter
  const [isTagOpen, setIsTagOpen] = useState(false);
  const tagAutocompleteRef = useRef<HTMLDivElement>(null);
  const [tagFilter, setTagFilter] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [debouncedTagSearch, setDebouncedTagSearch] = useState("");
  const [tagInputValue, setTagInputValue] = useState("");

  // HSN Filter
  const [isHsnOpen, setIsHsnOpen] = useState(false);
  const hsnAutocompleteRef = useRef<HTMLDivElement>(null);
  const [hsnFilter, setHsnFilter] = useState("");
  const [hsnSearch, setHsnSearch] = useState("");
  const [hsnInputValue, setHsnInputValue] = useState("");

  // Upload modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    show: boolean;
    data?: any;
    error?: string;
  }>({ show: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stockStatusDropdownRef.current &&
        !stockStatusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStockStatusOpen(false);
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
        categoryAutocompleteRef.current &&
        !categoryAutocompleteRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
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
        tagAutocompleteRef.current &&
        !tagAutocompleteRef.current.contains(event.target as Node)
      ) {
        setIsTagOpen(false);
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
        hsnAutocompleteRef.current &&
        !hsnAutocompleteRef.current.contains(event.target as Node)
      ) {
        setIsHsnOpen(false);
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
      setPagination((prev) => ({ ...prev, pageNumber: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearch(categorySearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTagSearch(tagSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [tagSearch]);

  // ── API hooks ──────────────────────────────────────────────────────────────
  const {
    data: medicinesData,
    isLoading: isFetching,
    refetch,
  } = useGetAllMedicinesQuery({
    pageNumber: pagination.pageNumber,
    pageSize: pagination.pageSize,
    search: debouncedSearch,
    status: statusFilter as "active" | "inactive" | undefined,
    category: categoryFilter || undefined,
    hsnId: hsnFilter || undefined,
    stockStatus: stockStatusFilter || undefined,
    tag: tagFilter || undefined,
  });

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
  } = useGetMedicineCategoriesQuery(
    {
      pageNumber: 1,
      pageSize: 50,
      search: debouncedCategorySearch,
    },
    {
      skip: !isCategoryOpen,
    }
  );

  const {
    data: tagsData,
    isLoading: isTagsLoading,
  } = useGetMedicineTagsQuery(
    {
      pageNumber: 1,
      pageSize: 50,
      search: debouncedTagSearch,
    },
    {
      skip: !isTagOpen,
    }
  );

  const { data: hsnData, isLoading: isHSNLoading } = useGetHSNQuery(undefined, {
    skip: !isHsnOpen,
  });

  const [addMedicine, { isLoading: isAddingMedicine }] = useAddMedicineMutation();
  const [updateMedicine, { isLoading: isUpdatingMedicine }] = useUpdateMedicineMutation();
  const [exportMedicines, { isLoading: isExporting }] = useExportMedicinesMutation();
  const [downloadMedicineSampleTemplate, { isLoading: isDownloadingTemplate }] = useDownloadMedicineSampleTemplateMutation();
  const [importMedicine, { isLoading: isImporting }] = useImportMedicineMutation();

  const medicines = medicinesData?.data || [];
  const paginationInfo = medicinesData?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  const categoryOptions = categoriesData?.data || [];
  const tagOptions = tagsData?.data || [];
  const hsnOptions = hsnData?.data || [];

  // Filter HSN locally
  const filteredHsnOptions = hsnSearch
    ? hsnOptions.filter(
        (hsn: HSN) =>
          hsn.hsnCode.toLowerCase().includes(hsnSearch.toLowerCase()) ||
          hsn.description.toLowerCase().includes(hsnSearch.toLowerCase()) ||
          hsn.gstPercentage.includes(hsnSearch)
      )
    : hsnOptions;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const {
    data: medicineStatsData,
    isLoading: isMedicineStatsLoading,
  } = useGetMedicineStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const medicinesChange = medicineStatsData?.totalMedicines?.percentageChange ?? 0;
  const categoriesChange = medicineStatsData?.totalCategories?.percentageChange ?? 0;
  const brandChange = medicineStatsData?.totalBrands?.percentageChange ?? 0;
  const formChange = medicineStatsData?.totalForms?.percentageChange ?? 0;

  const medicineStats = [
    {
      title: "Medicines",
      value: `${(medicineStatsData?.totalMedicines?.value ?? 0).toLocaleString("en-IN")}`,
      percentageChange: medicinesChange,
      trend: medicinesChange === 0 ? "neutral" as const : medicinesChange > 0 ? "increase" as const : "decrease" as const,
      icon: FiGrid,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600",
    },
    {
      title: "Categories",
      value: `${(medicineStatsData?.totalCategories?.value ?? 0).toLocaleString("en-IN")}`,
      percentageChange: categoriesChange,
      trend: categoriesChange === 0 ? "neutral" as const : categoriesChange > 0 ? "increase" as const : "decrease" as const,
      icon: FiCreditCard,
      iconBg: "bg-amber-100 dark:bg-amber-900/20",
      iconColor: "text-amber-600",
    },
    {
      title: "Brands",
      value: medicineStatsData?.totalBrands?.value ?? 0,
      percentageChange: brandChange,
      trend: brandChange === 0 ? "neutral" as const : brandChange > 0 ? "increase" as const : "decrease" as const,
      icon: FiFile,
      iconBg: "bg-violet-100 dark:bg-violet-900/20",
      iconColor: "text-violet-600",
    },
    {
      title: "Forms",
      value: medicineStatsData?.totalForms?.value ?? 0,
      percentageChange: formChange,
      trend: formChange === 0 ? "neutral" as const : formChange > 0 ? "increase" as const : "decrease" as const,
      icon: FiPackage,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
    },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleRowsPerPageChange = (size: PageSize) => {
    setPagination((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }));
    setIsPageSizeOpen(false);
  };

  const handleStatusFilterChange = (statusKey: string) => {
    setStatusFilter(statusKey as "active" | "inactive" | "");
    setIsStatusOpen(false);
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handleStockStatusFilterChange = (statusKey: string) => {
    setStockStatusFilter(statusKey as "empty" | "low" | "medium" | "good" | "");
    setIsStockStatusOpen(false);
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handleCategoryFilterChange = (key: any) => {
    const value = key || "";
    setCategoryFilter(value);
    setPagination({ pageNumber: 1, pageSize: 10 as PageSize });
    setCategoryInputValue(value);
    setCategorySearch("");
    setIsCategoryOpen(false);
  };

  const handleClearCategoryFilter = () => {
    setCategoryFilter("");
    setCategorySearch("");
    setCategoryInputValue("");
    setPagination({ pageNumber: 1, pageSize: 10 as PageSize });
  };

  const handleTagFilterChange = (key: any) => {
    const value = key || "";
    setTagFilter(value);
    setPagination({ pageNumber: 1, pageSize: 10 as PageSize });
    setTagInputValue(value);
    setTagSearch("");
    setIsTagOpen(false);
  };

  const handleClearTagFilter = () => {
    setTagFilter("");
    setTagSearch("");
    setTagInputValue("");
    setPagination({ pageNumber: 1, pageSize: 10 as PageSize });
  };

  const handleHsnFilterChange = (key: any) => {
    const value = key || "";
    setHsnFilter(value);
    setPagination({ pageNumber: 1, pageSize: 10 as PageSize });
    const selectedHsn = hsnOptions.find((hsn: HSN) => hsn.id === value);
    setHsnInputValue(selectedHsn ? `${selectedHsn.hsnCode} - ${selectedHsn.gstPercentage}%` : "");
    setHsnSearch("");
    setIsHsnOpen(false);
  };

  const handleClearHsnFilter = () => {
    setHsnFilter("");
    setHsnSearch("");
    setHsnInputValue("");
    setPagination({ pageNumber: 1, pageSize: 10 as PageSize });
  };

  const handleAddMedicine = async (data: AddMedicineRequest) => {
    try {
      await addMedicine(data).unwrap();
      addToast({
        title: "Success",
        description: "Medicine added successfully",
        color: "success",
      });
      setPagination({ pageNumber: 1, pageSize: 10 as PageSize });
      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to add medicine",
        color: "danger",
      });
      throw error;
    }
  };

  const handleUpdateMedicine = async (data: UpdateMedicineRequest) => {
    if (!selectedMedicine) return;

    try {
      await updateMedicine({
        medicineId: selectedMedicine.id,
        body: data,
      }).unwrap();
      addToast({
        title: "Success",
        description: "Medicine updated successfully",
        color: "success",
      });
      setSelectedMedicine(null);
      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update medicine",
        color: "danger",
      });
      throw error;
    }
  };

  const handleOpenAddModal = () => {
    setSelectedMedicine(null);
    onOpen();
  };

  const handleOpenEditModal = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    onOpen();
  };

  const handleFormSubmit = async (data: AddMedicineRequest | UpdateMedicineRequest) => {
    if (selectedMedicine) {
      await handleUpdateMedicine(data as UpdateMedicineRequest);
    } else {
      await handleAddMedicine(data as AddMedicineRequest);
    }
  };

  const handleExportMedicines = async () => {
    try {
      const blob = await exportMedicines().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `medicines-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast({
        title: "Success",
        description: "Medicines exported successfully",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to export medicines",
        color: "danger",
      });
    }
  };

  const handleDownloadSampleTemplate = async () => {
    try {
      const blob = await downloadMedicineSampleTemplate().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `medicine-sample-template-${new Date().toISOString().split("T")[0]}.csv`;
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        addToast({
          title: "Error",
          description: "Please upload a valid Excel or CSV file",
          color: "danger",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUploadBulk = async () => {
    if (!selectedFile) {
      addToast({
        title: "Error",
        description: "Please select a file to upload",
        color: "danger",
      });
      return;
    }

    try {
      const result = await importMedicine(selectedFile).unwrap();
      
      setUploadResult({
        show: true,
        data: result.data,
      });
      
      const { totalInserted, totalUpdated, totalSkipped, totalErrors } = result.data;
      let toastColor: "success" | "warning" | "danger" = "success";
      let message = "";

      if (totalInserted > 0 && totalUpdated === 0 && totalErrors === 0 && totalSkipped === 0) {
        message = `Successfully imported ${totalInserted} medicines`;
      } else if (totalUpdated > 0 && totalInserted === 0 && totalErrors === 0) {
        message = `Successfully updated ${totalUpdated} medicines`;
      } else {
        message = `Inserted: ${totalInserted}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`;
        toastColor = totalErrors > 0 ? "warning" : "success";
      }
      
      addToast({
        title: "Import Complete",
        description: message,
        color: toastColor,
      });

      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to import medicines",
        color: "danger",
      });
    }
  };

  // ── Status options ──────────────────────────────────────────────────────
  const statusOptions = [
    { key: "", label: "Status - All" },
    { key: "active", label: "Status - Active" },
    { key: "inactive", label: "Status - Inactive" },
  ];

  const statusLabel = (key: string): string => {
    const option = statusOptions.find(opt => opt.key === key);
    return option ? option.label : "Status - All";
  };

  const stockStatusOptions = [
    { key: "", label: "Stock - All" },
    { key: "good", label: "Stock - Good" },
    { key: "medium", label: "Stock - Medium" },
    { key: "low", label: "Stock - Low" },
    { key: "empty", label: "Stock - Empty" },
  ];

  const stockStatusLabel = (key: string): string => {
    const option = stockStatusOptions.find(opt => opt.key === key);
    return option ? option.label : "Stock - All";
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id="tour-pharmacy-medicines-page"
      className="w-full min-w-0 scroll-mt-6 px-0 py-0"
    >
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Medicines
            </h2>
            <FeatureInfoTip
              title="Medicines Guide"
              tips={medicinesTips}
              guideSection="pharmacy-guide-medicines"
              linkLabel="Read medicines guide"
            />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
            Manage medicine inventory and details
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap xl:justify-end mb-2">
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiDownload />}
            className="h-10 shrink-0 border border-green-400 text-green-800 text-[13px] font-semibold rounded-lg"
            onPress={handleDownloadSampleTemplate}
            isLoading={isDownloadingTemplate}
          >
            Sample Template
          </Button>
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiUpload />}
            className="h-10 shrink-0 border border-blue-400 text-blue-800 text-[13px] font-semibold rounded-lg"
            onPress={() => setUploadModalOpen(true)}
            isLoading={isImporting}
          >
            Bulk Medicine
          </Button>
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiDownload />}
            className="h-10 shrink-0 text-[13px] font-semibold rounded-lg"
            onPress={handleExportMedicines}
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
            Add Medicine
          </Button>
        </div>
      </div>

      {/* ── Stat cards - Updated for better mobile responsiveness ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 xl:grid-cols-4">
        {medicineStats.map((stat, index) => {
          const Icon = stat.icon;
          const isNegative = stat.trend === "decrease";
          const trendColor = isNegative ? "text-red-600" : "text-emerald-600";
          const percentageChange = stat.percentageChange;

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
                    {isMedicineStatsLoading ? "..." : stat.value}
                  </p>
                  <p className={["mt-0.5 truncate text-[10px] font-semibold sm:mt-1 sm:text-[12px]", trendColor].join(" ")}>
                    {percentageChange === 0
                      ? "No change from last month"
                      : `${isNegative ? "↓" : "↑"} ${Math.abs(percentageChange)}% from last month`
                    }
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
          <div className="w-full sm:w-[280px]">
            <SearchField
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search by sku, name, brand, composition..."
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

          {/* Category Filter - Custom dropdown */}
          <div ref={categoryAutocompleteRef} className="relative w-full sm:w-[200px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search category..."
                maxLength={30}
                value={categoryInputValue}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  setCategoryInputValue(e.target.value);
                  setIsCategoryOpen(true);
                }}
                onFocus={() => setIsCategoryOpen(true)}
                className={[
                  "flex h-10 w-full cursor-pointer items-center rounded-lg border border-slate-200 bg-white",
                  "px-3 pr-10 text-[13px] font-semibold text-slate-700 shadow-sm",
                  "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                  "outline-none transition",
                  "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
                ].join(" ")}
              />
              {categoryFilter && (
                <button
                  type="button"
                  onClick={handleClearCategoryFilter}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              )}
              <FiChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-transform duration-200 dark:text-white ${isCategoryOpen ? "rotate-180" : ""}`}
              />
            </div>

            {isCategoryOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                {isCategoriesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : categoryOptions.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] text-slate-500 dark:text-white">
                    No categories found
                  </div>
                ) : (
                  categoryOptions.map((category: string) => {
                    const isActive = categoryFilter === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategoryFilterChange(category)}
                        className={[
                          "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                          isActive
                            ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                            : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                        ].join(" ")}
                      >
                        <span className="line-clamp-1">{category}</span>
                        {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Tag Filter - Custom dropdown */}
          <div ref={tagAutocompleteRef} className="relative w-full sm:w-[200px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tags..."
                maxLength={30}
                value={tagInputValue}
                onChange={(e) => {
                  setTagSearch(e.target.value);
                  setTagInputValue(e.target.value);
                  setIsTagOpen(true);
                }}
                onFocus={() => setIsTagOpen(true)}
                className={[
                  "flex h-10 w-full cursor-pointer items-center rounded-lg border border-slate-200 bg-white",
                  "px-3 pr-10 text-[13px] font-semibold text-slate-700 shadow-sm",
                  "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                  "outline-none transition",
                  "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
                ].join(" ")}
              />
              {tagFilter && (
                <button
                  type="button"
                  onClick={handleClearTagFilter}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              )}
              <FiChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-transform duration-200 dark:text-white ${isTagOpen ? "rotate-180" : ""}`}
              />
            </div>

            {isTagOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                {isTagsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : tagOptions.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] text-slate-500 dark:text-white">
                    No tags found
                  </div>
                ) : (
                  tagOptions.map((tag: string) => {
                    const isActive = tagFilter === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagFilterChange(tag)}
                        className={[
                          "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                          isActive
                            ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                            : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                        ].join(" ")}
                      >
                        <span className="line-clamp-1">{tag}</span>
                        {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* HSN Filter - Custom dropdown */}
          <div ref={hsnAutocompleteRef} className="relative w-full sm:w-[220px]">
            <div className="relative">
              <input
                type="text"
                placeholder="HSN code, GST% or description..."
                value={hsnInputValue}
                onChange={(e) => {
                  setHsnSearch(e.target.value);
                  setHsnInputValue(e.target.value);
                  setIsHsnOpen(true);
                }}
                onFocus={() => setIsHsnOpen(true)}
                className={[
                  "flex h-10 w-full cursor-pointer items-center rounded-lg border border-slate-200 bg-white",
                  "px-3 pr-10 text-[13px] font-semibold text-slate-700 shadow-sm",
                  "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                  "outline-none transition",
                  "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
                ].join(" ")}
              />
              {hsnFilter && (
                <button
                  type="button"
                  onClick={handleClearHsnFilter}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              )}
              <FiChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-transform duration-200 dark:text-white ${isHsnOpen ? "rotate-180" : ""}`}
              />
            </div>

            {isHsnOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                {isHSNLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : filteredHsnOptions.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] text-slate-500 dark:text-white">
                    No HSN codes found
                  </div>
                ) : (
                  filteredHsnOptions.map((hsn: HSN) => {
                    const isActive = hsnFilter === hsn.id;
                    return (
                      <button
                        key={hsn.id}
                        type="button"
                        onClick={() => handleHsnFilterChange(hsn.id)}
                        className={[
                          "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                          isActive
                            ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                            : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                        ].join(" ")}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="line-clamp-1">{hsn.hsnCode}</span>
                            <span className="text-[11px] font-medium text-primary">GST: {hsn.gstPercentage}%</span>
                          </div>
                          <span className="line-clamp-1 text-[11px] font-normal text-slate-400 dark:text-slate-500">
                            {hsn.description}
                          </span>
                        </div>
                        {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Status filter dropdown */}
          <div ref={statusDropdownRef} className="relative w-full sm:w-[170px]">
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

          {/* Stock status filter dropdown */}
          <div ref={stockStatusDropdownRef} className="relative w-full sm:w-[175px]">
            <button
              type="button"
              onClick={() => setIsStockStatusOpen(!isStockStatusOpen)}
              onKeyDown={(e) => { if (e.key === "Escape") setIsStockStatusOpen(false); }}
              aria-expanded={isStockStatusOpen}
              aria-label="Stock status filter"
              className={[
                "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white",
                "px-3 text-[13px] font-semibold text-slate-700 shadow-sm",
                "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                "outline-none transition",
                "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              ].join(" ")}
            >
              <span className="truncate text-left">{stockStatusLabel(stockStatusFilter)}</span>
              <FiChevronDown
                className={`ml-2 shrink-0 text-slate-500 transition-transform duration-200 dark:text-white ${isStockStatusOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isStockStatusOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                {stockStatusOptions.map((option) => {
                  const isActive = stockStatusFilter === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleStockStatusFilterChange(option.key)}
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
          {isFetching ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-pulse text-slate-500 dark:text-white">Loading medicines...</div>
            </div>
          ) : medicines.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-white">
              No medicines found
            </div>
          ) : (
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-slate-50/80 dark:bg-[#111726]">
                <tr className="border-b border-slate-100 dark:border-[#273244]">
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">SKU</th>
                  <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Medicine Name</th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Category</th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Brand</th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Composition</th>
                  <th className="w-[6%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Form</th>
                  <th className="w-[6%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Shelf</th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Reorder</th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">HSN</th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Available Qty</th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Status</th>
                  <th className="w-[6%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                {medicines.map((item: Medicine) => {
                  const stockStatus = getStockStatus(item.availableQuantity, item.reorder);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {item.sku || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                              {item.medicineName}
                            </span>
                            {item.packOf && (
                              <span className="text-[12px] font-medium text-slate-500 dark:text-white block">
                                Pack of {item.packOf}
                              </span>
                            )}
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <Popover placement="right" showArrow={true}>
                              <PopoverTrigger>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  className="min-w-0 h-6 w-6 text-slate-500 hover:text-primary"
                                >
                                  <FiEye className="text-sm" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-3 max-w-[300px]">
                                <div className="space-y-2">
                                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                    Tags ({item.tags.length})
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {item.tags.map((tag) => (
                                      <Chip key={tag} size="sm" variant="flat" color="secondary">
                                        {tag}
                                      </Chip>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {item.category || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {item.brandName || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {item.composition || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {item.form || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {item.shelf || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {item.reorder || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                            {item.hsnCode} ({item.hsnGstPercentage}%)
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-white block truncate max-w-[120px]">
                            {item.description || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Chip color={stockStatus.color} variant="flat" size="sm">
                          {item.availableQuantity} ({stockStatus.label})
                        </Chip>
                      </td>
                      <td className="px-5 py-4">
                        <Chip
                          color={item.status === "active" ? "success" : "danger"}
                          variant="flat"
                          size="sm"
                        >
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Chip>
                      </td>
                      <td className="px-5 py-4">
                        <Tooltip content="Edit Medicine">
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            onPress={() => handleOpenEditModal(item)}
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
                Showing {medicines.length > 0 ? ((pagination.pageNumber - 1) * paginationInfo.pageSize) + 1 : 0}-
                {Math.min(pagination.pageNumber * paginationInfo.pageSize, paginationInfo.totalRecords)} of {paginationInfo.totalRecords} medicines
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

      {/* ── Upload Bulk Modal ── */}
      <Modal isOpen={uploadModalOpen} onOpenChange={setUploadModalOpen} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Upload Bulk Medicines</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {!uploadResult.show ? (
                    <>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="bulk-upload-file"
                        />
                        <label htmlFor="bulk-upload-file" className="cursor-pointer flex flex-col items-center gap-2">
                          <FiUpload className="text-4xl text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {selectedFile ? selectedFile.name : "Click to select Excel/CSV file"}
                          </span>
                          <span className="text-xs text-gray-500">Supported formats: .xlsx, .xls, .csv</span>
                        </label>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          📌 Please ensure your file follows the sample template format. 
                          Download the sample template to see the required columns.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Import Summary</h3>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {uploadResult.data?.totalInserted || 0}
                            </div>
                            <div className="text-sm text-gray-600">Inserted</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {uploadResult.data?.totalUpdated || 0}
                            </div>
                            <div className="text-sm text-gray-600">Updated</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                              {uploadResult.data?.totalSkipped || 0}
                            </div>
                            <div className="text-sm text-gray-600">Skipped</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {uploadResult.data?.totalErrors || 0}
                            </div>
                            <div className="text-sm text-gray-600">Errors</div>
                          </div>
                        </div>
                        
                        {uploadResult.data?.insertedMedicines?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-600">Inserted Medicines:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {uploadResult.data.insertedMedicines.slice(0, 5).map((name: string, idx: number) => (
                                <li key={idx}>{name}</li>
                              ))}
                              {uploadResult.data.insertedMedicines.length > 5 && (
                                <li>...and {uploadResult.data.insertedMedicines.length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        )}

                        {uploadResult.data?.updatedMedicines?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-blue-600">Updated Medicines:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                              {uploadResult.data.updatedMedicines.slice(0, 10).map((name: string, idx: number) => (
                                <li key={idx}>{name}</li>
                              ))}
                              {uploadResult.data.updatedMedicines.length > 10 && (
                                <li>...and {uploadResult.data.updatedMedicines.length - 10} more</li>
                              )}
                            </ul>
                          </div>
                        )}

                        {uploadResult.data?.skippedMedicines?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-yellow-600">Skipped Medicines:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                              {uploadResult.data.skippedMedicines.slice(0, 10).map((name: string, idx: number) => (
                                <li key={idx}>{name}</li>
                              ))}
                              {uploadResult.data.skippedMedicines.length > 10 && (
                                <li>...and {uploadResult.data.skippedMedicines.length - 10} more</li>
                              )}
                            </ul>
                          </div>
                        )}

                        {uploadResult.data?.errors?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-red-600">Errors:</p>
                            <ul className="text-sm text-red-500 list-disc list-inside max-h-40 overflow-y-auto">
                              {uploadResult.data.errors.map((error: string, idx: number) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                {!uploadResult.show ? (
                  <>
                    <Button variant="light" onPress={onClose}>Cancel</Button>
                    <Button color="primary" onPress={handleUploadBulk} isLoading={isImporting} isDisabled={!selectedFile}>
                      Upload
                    </Button>
                  </>
                ) : (
                  <Button color="primary" onPress={() => {
                    setUploadResult({ show: false });
                    setSelectedFile(null);
                    onClose();
                  }}>
                    Close
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Medicine Form Modal ── */}
      <MedicineFormModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        initialData={selectedMedicine}
        onSubmit={handleFormSubmit}
        isLoading={isAddingMedicine || isUpdatingMedicine}
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

export default PharmacistMedicines;
