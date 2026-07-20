import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
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
  Tabs,
  Tab,
} from "@heroui/react";
import {
  FiEye,
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiPlus,
  FiEdit,
  FiCreditCard,
  FiFile,
  FiStar,
  FiUpload,
  FiAlertTriangle,
  FiClock,
  FiCalendar,
  FiCheck,
} from "react-icons/fi";
import { BsFillWalletFill } from "react-icons/bs";

// Import your API hooks
import {
  useDownloadStockSampleTemplateMutation,
  useExportStocksMutation,
  useGetAllStocksQuery,
  useGetAllSuppliersQuery,
  useGetStockStatsQuery,
  useImportStockMutation,
  useGetExpiryStockQuery,
  type StockPaymentStatus,
  useGetSubscriptionNotificationsQuery,
  useMarkSubscriptionNotificationReadMutation,
} from "../../redux/api/pharmaciesApi";
import SubscriptionNotificationModal from "./SubscriptionNotificationModal";
import SearchField from "../../components/shared/SearchField";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { stockTips } from "../../constants/featureTips";

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

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatCurrency = (amount: string | number): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

const getPaymentStatusConfig = (status: StockPaymentStatus) => {
  switch (status) {
    case "paid":
      return { color: "success" as const, label: "Paid" };
    case "unpaid":
      return { color: "danger" as const, label: "Unpaid" };
    case "partial":
      return { color: "warning" as const, label: "Partial" };
    default:
      return { color: "default" as const, label: status };
  }
};

// Get expiry status color and label
const getExpiryStatus = (expiryDate: string): { color: "success" | "warning" | "danger" | "default"; label: string } => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    return { color: "danger", label: "Expired" };
  } else if (daysRemaining <= 30) {
    return { color: "danger", label: `${daysRemaining} days left` };
  } else if (daysRemaining <= 60) {
    return { color: "warning", label: `${daysRemaining} days left` };
  } else {
    return { color: "success", label: `${daysRemaining} days left` };
  }
};

// ====================== EXPIRY STOCK TABLE COMPONENT ======================
interface ExpiryStockTableProps {
  expiryData: any[];
  loading: boolean;
  paginationInfo: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  currentPage: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  title: string;
  isPageSizeOpen: boolean;
  onPageSizeToggle: () => void;
  pageSizeOptions: PageSize[];
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

const ExpiryStockTable: React.FC<ExpiryStockTableProps> = ({
  expiryData,
  loading,
  paginationInfo,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  title,
  isPageSizeOpen,
  onPageSizeToggle,
  pageSizeOptions,
  dropdownRef,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-pulse text-slate-500 dark:text-white">Loading {title}...</div>
      </div>
    );
  }

  if (expiryData.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500 dark:text-white">
        No {title.toLowerCase()} found
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
        <table className="w-full min-w-[1180px] text-left">
          <thead className="bg-slate-50/80 dark:bg-[#111726]">
            <tr className="border-b border-slate-100 dark:border-[#273244]">
              <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">SKU</th>
              <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Medicine Name</th>
              <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Brand</th>
              <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Batch</th>
              <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Expiry Date</th>
              <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Status</th>
              <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Remaining Qty</th>
              <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Purchased</th>
              <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Sold</th>
              <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">MRP</th>
              <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Cost</th>
              <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Supplier</th>
              <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Purchase Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
            {expiryData.map((item) => {
              const expiryStatus = getExpiryStatus(item.expiry);
              return (
                <tr key={item.stockMedicineId} className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {item.sku || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
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
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {item.medicineBrand || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Chip size="sm" variant="flat" color="default">
                      {item.batch || "-"}
                    </Chip>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {formatDate(item.expiry)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Chip color={expiryStatus.color} variant="flat" size="sm">
                      {expiryStatus.label}
                    </Chip>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                      {item.remainingQuantity}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {item.purchasedQuantity}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {item.soldQuantity}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {formatCurrency(item.mrp)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {formatCurrency(item.cost)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {item.supplierName || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                      {formatDate(item.purchaseDate)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Bottom Controls ── */}
      <div className="border-t border-slate-100 px-4 py-3 dark:border-[#273244]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-center sm:justify-start">
            <span className="text-center text-[13px] font-medium text-slate-500 dark:text-white sm:text-left">
              Showing {expiryData.length > 0 ? ((currentPage - 1) * paginationInfo.pageSize) + 1 : 0}-
              {Math.min(currentPage * paginationInfo.pageSize, paginationInfo.totalRecords)} of {paginationInfo.totalRecords} {title.toLowerCase()}
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
            <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 dark:text-white sm:justify-start">
              <span className="whitespace-nowrap">Rows per page:</span>

              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={onPageSizeToggle}
                  className={[
                    "flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35",
                    "bg-white px-3 text-[13px] font-semibold text-primary shadow-sm",
                    "dark:bg-[#111726] dark:text-white",
                    "outline-none transition",
                    "hover:border-primary/60 hover:bg-primary/5",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20",
                  ].join(" ")}
                >
                  <span>{pageSize}</span>

                  <FiChevronDown
                    className={`text-primary transition-transform duration-200 ${
                      isPageSizeOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isPageSizeOpen && (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                    {pageSizeOptions.map((size) => {
                      const active = pageSize === size;

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => onPageSizeChange(size)}
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
                  page={currentPage}
                  onChange={onPageChange}
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
    </>
  );
};

// ====================== MAIN COMPONENT ======================
const PharmacistStock: React.FC = () => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedInvoiceUrl, setSelectedInvoiceUrl] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>("all-stocks");
  
  // Import modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedStockFile, setSelectedStockFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    show: boolean;
    data?: {
      totalStocks: number;
      totalMedicines: number;
      totalErrors: number;
      insertedStocks?: string[];
      insertedMedicines?: string[];
      errors?: string[];
    };
  }>({ show: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ====================== FILTER STATES ======================
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Supplier filter - custom dropdown
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
  
  // Payment status filter
  const [isPaymentStatusOpen, setIsPaymentStatusOpen] = useState(false);
  const paymentStatusDropdownRef = useRef<HTMLDivElement | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<StockPaymentStatus | "">("");
  
  // Date range states
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

  // Expiry stock pagination states with page size
  const [expiredPagination, setExpiredPagination] = useState({ pageNumber: 1, pageSize: 10 as PageSize });
  const [expiring30Pagination, setExpiring30Pagination] = useState({ pageNumber: 1, pageSize: 10 as PageSize });
  const [expiring60Pagination, setExpiring60Pagination] = useState({ pageNumber: 1, pageSize: 10 as PageSize });

  // Expiry page size dropdown states
  const [isExpiredPageSizeOpen, setIsExpiredPageSizeOpen] = useState(false);
  const [isExpiring30PageSizeOpen, setIsExpiring30PageSizeOpen] = useState(false);
  const [isExpiring60PageSizeOpen, setIsExpiring60PageSizeOpen] = useState(false);
  
  const expiredDropdownRef = useRef<HTMLDivElement | null>(null);
  const expiring30DropdownRef = useRef<HTMLDivElement | null>(null);
  const expiring60DropdownRef = useRef<HTMLDivElement | null>(null);

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
        expiredDropdownRef.current &&
        !expiredDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExpiredPageSizeOpen(false);
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
        expiring30DropdownRef.current &&
        !expiring30DropdownRef.current.contains(event.target as Node)
      ) {
        setIsExpiring30PageSizeOpen(false);
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
        expiring60DropdownRef.current &&
        !expiring60DropdownRef.current.contains(event.target as Node)
      ) {
        setIsExpiring60PageSizeOpen(false);
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
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSupplierOpen(false);
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
        paymentStatusDropdownRef.current &&
        !paymentStatusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPaymentStatusOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ====================== API HOOKS ======================
  const {
    data: stocksData,
    isLoading: stocksLoading,
    refetch
  } = useGetAllStocksQuery({
    pageNumber: pagination.pageNumber,
    pageSize: pagination.pageSize,
    search: debouncedSearch || undefined,
    supplierId: supplierFilter || undefined,
    pharmacyStockPaymentStatus: paymentStatusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }, {
    skip: activeTab !== "all-stocks",
  });

  // Expired stocks (expiryDays <= 0)
  const {
    data: expiredData,
    isLoading: expiredLoading,
  } = useGetExpiryStockQuery({
    pageNumber: expiredPagination.pageNumber,
    pageSize: expiredPagination.pageSize,
    medicineName: activeTab === "expired" ? debouncedSearch || undefined : undefined,
    expiryDays: 0,
  }, {
    skip: activeTab !== "expired",
  });

  // Expiring in 30 days (expiryDays <= 30)
  const {
    data: expiring30Data,
    isLoading: expiring30Loading,
  } = useGetExpiryStockQuery({
    pageNumber: expiring30Pagination.pageNumber,
    pageSize: expiring30Pagination.pageSize,
    medicineName: activeTab === "expiring-30" ? debouncedSearch || undefined : undefined,
    expiryDays: 30,
  }, {
    skip: activeTab !== "expiring-30",
  });

  // Expiring in 60 days (expiryDays <= 60)
  const {
    data: expiring60Data,
    isLoading: expiring60Loading,
  } = useGetExpiryStockQuery({
    pageNumber: expiring60Pagination.pageNumber,
    pageSize: expiring60Pagination.pageSize,
    medicineName: activeTab === "expiring-60" ? debouncedSearch || undefined : undefined,
    expiryDays: 60,
  }, {
    skip: activeTab !== "expiring-60",
  });

  const {
    data: suppliersData,
    isLoading: suppliersLoading,
  } = useGetAllSuppliersQuery(
    {
      pageNumber: 1,
      pageSize: 20,
      status: "active",
      search: debouncedSupplierSearch || undefined,
    },
    {
      skip: !isSupplierOpen,
    }
  );

  const [exportStocks, { isLoading: isExporting }] = useExportStocksMutation();
  const [downloadStockSampleTemplate, { isLoading: isDownloadingTemplate }] = useDownloadStockSampleTemplateMutation();
  const [importStock, { isLoading: isImportingStock }] = useImportStockMutation();

  const stocks = stocksData?.data || [];
  const paginationInfo = stocksData?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  const expiredStocks = expiredData?.data || [];
  const expiredPaginationInfo = expiredData?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  const expiring30Stocks = expiring30Data?.data || [];
  const expiring30PaginationInfo = expiring30Data?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  const expiring60Stocks = expiring60Data?.data || [];
  const expiring60PaginationInfo = expiring60Data?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  const suppliers = suppliersData?.data || [];

  // ====================== STOCK STATS ======================
  const {
    data: stockStatsData,
    isLoading: isSalesStatsLoading,
  } = useGetStockStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const purchaseAmountChange = stockStatsData?.totalPurchaseAmount?.percentageChange ?? 0;
  const purchaseEntriesChange = stockStatsData?.totalPurchaseEntries?.percentageChange ?? 0;
  const unitsPurchasedChange = stockStatsData?.totalUnitsPurchased?.percentageChange ?? 0;
  const paidAmountChange = stockStatsData?.paidAmount?.percentageChange ?? 0;

  const stockStats = [
    {
      title: "Current Month Purchase",
      value: `₹${(stockStatsData?.totalPurchaseAmount?.value ?? 0).toLocaleString("en-IN")}`,
      percentageChange: purchaseAmountChange,
      trend: purchaseAmountChange === 0 ? "neutral" as const : purchaseAmountChange > 0 ? "increase" as const : "decrease" as const,
      icon: BsFillWalletFill,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600",
    },
    {
      title: "Current Month Paid Amount",
      value: `₹${(stockStatsData?.paidAmount?.value ?? 0).toLocaleString("en-IN")}`,
      percentageChange: paidAmountChange,
      trend: paidAmountChange === 0 ? "neutral" as const : paidAmountChange > 0 ? "increase" as const : "decrease" as const,
      icon: FiStar,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
    },
    {
      title: "Current Month Purchases",
      value: `${(stockStatsData?.totalPurchaseEntries?.value ?? 0).toLocaleString("en-IN")}`,
      percentageChange: purchaseEntriesChange,
      trend: purchaseEntriesChange === 0 ? "neutral" as const : purchaseEntriesChange > 0 ? "increase" as const : "decrease" as const,
      icon: FiCreditCard,
      iconBg: "bg-amber-100 dark:bg-amber-900/20",
      iconColor: "text-amber-600",
    },
    {
      title: "Current Month Units Purchased",
      value: stockStatsData?.totalUnitsPurchased?.value ?? 0,
      percentageChange: unitsPurchasedChange,
      trend: unitsPurchasedChange === 0 ? "neutral" as const : unitsPurchasedChange > 0 ? "increase" as const : "decrease" as const,
      icon: FiFile,
      iconBg: "bg-violet-100 dark:bg-violet-900/20",
      iconColor: "text-violet-600",
    },
  ];

  // Calculate expiry stock counts for tab badges
  const getExpiryCount = (data: any) => {
    return data?.pagination?.totalRecords || 0;
  };

  // ====================== SEARCH DEBOUNCE ======================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (activeTab === "all-stocks") {
        setPagination((prev) => ({ ...prev, pageNumber: 1 }));
      } else if (activeTab === "expired") {
        setExpiredPagination((prev) => ({ ...prev, pageNumber: 1 }));
      } else if (activeTab === "expiring-30") {
        setExpiring30Pagination((prev) => ({ ...prev, pageNumber: 1 }));
      } else if (activeTab === "expiring-60") {
        setExpiring60Pagination((prev) => ({ ...prev, pageNumber: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSupplierSearch(supplierSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [supplierSearch]);

  // ====================== CLEANUP MODAL ======================
  useEffect(() => {
    if (!uploadModalOpen) {
      setSelectedStockFile(null);
      setUploadResult({ show: false });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [uploadModalOpen]);

  // ====================== HANDLERS ======================
  const handleSupplierFilterChange = (supplierId: string) => {
    setSupplierFilter(supplierId);
    const selectedSupplier = suppliers.find((s: any) => s.id === supplierId);
    setSupplierSearch(selectedSupplier?.supplierName || "");
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
    setIsSupplierOpen(false);
  };

  const handleClearSupplierFilter = () => {
    setSupplierFilter("");
    setSupplierSearch("");
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handleSupplierSearchChange = (value: string) => {
    setSupplierSearch(value);
    setIsSupplierOpen(true);
  };

  const handlePaymentStatusFilterChange = (statusKey: string) => {
    setPaymentStatusFilter(statusKey as StockPaymentStatus | "");
    setIsPaymentStatusOpen(false);
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

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleRowsPerPageChange = (size: PageSize) => {
    setPagination((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }));
    setIsPageSizeOpen(false);
  };

  const handleExpiredPageChange = (page: number) => {
    setExpiredPagination((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleExpiredRowsPerPageChange = (size: PageSize) => {
    setExpiredPagination((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }));
    setIsExpiredPageSizeOpen(false);
  };

  const handleExpiring30PageChange = (page: number) => {
    setExpiring30Pagination((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleExpiring30RowsPerPageChange = (size: PageSize) => {
    setExpiring30Pagination((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }));
    setIsExpiring30PageSizeOpen(false);
  };

  const handleExpiring60PageChange = (page: number) => {
    setExpiring60Pagination((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleExpiring60RowsPerPageChange = (size: PageSize) => {
    setExpiring60Pagination((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }));
    setIsExpiring60PageSizeOpen(false);
  };

  const handleViewInvoice = (invoiceUrl: string | null) => {
    if (!invoiceUrl) return;
    setSelectedInvoiceUrl(invoiceUrl);
    onOpen();
  };

  const handleEditStock = (id: string) => {
    navigate(`/pharmacy/stock/edit/${id}`);
  };

  const handleExportStocks = async () => {
    try {
      const blob = await exportStocks().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `all-stock-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast({
        title: "Success",
        description: "Stock exported successfully",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to export stock",
        color: "danger",
      });
    }
  };

  const handleDownloadStockSampleTemplate = async () => {
    try {
      const blob = await downloadStockSampleTemplate().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stock-sample-template-${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const handleOpenUploadModal = () => {
    setSelectedStockFile(null);
    setUploadResult({ show: false });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadModalOpen(true);
  };

  const handleStockFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        addToast({
          title: "Error",
          description: "Please upload a valid Excel or CSV file",
          color: "danger",
        });
        return;
      }
      setSelectedStockFile(file);
    }
  };

  const handleUploadBulkStock = async () => {
    if (!selectedStockFile) {
      addToast({
        title: "Error",
        description: "Please select a file to upload",
        color: "danger",
      });
      return;
    }

    try {
      const result = await importStock(selectedStockFile).unwrap();
      setUploadResult({
        show: true,
        data: result.data,
      });

      const { totalStocks, totalMedicines, totalErrors } = result.data;
      let toastColor: "success" | "warning" | "danger" = "success";
      let message = "";

      if (totalStocks > 0 && totalErrors === 0) {
        message = `Successfully imported ${totalStocks} stock entries with ${totalMedicines} medicines`;
      } else if (totalErrors > 0 && totalStocks === 0) {
        message = `Import failed with ${totalErrors} error(s)`;
        toastColor = "danger";
      } else {
        message = `Imported: ${totalStocks} stocks, ${totalMedicines} medicines, Errors: ${totalErrors}`;
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
        description: error?.data?.message || "Failed to import stock",
        color: "danger",
      });
    }
  };

  const toggleRowExpansion = (stockId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(stockId)) {
      newExpanded.delete(stockId);
    } else {
      newExpanded.add(stockId);
    }
    setExpandedRows(newExpanded);
  };

  const handleTabChange = (key: React.Key) => {
    setActiveTab(key as string);
    setSearch("");
    setDebouncedSearch("");
  };

  // ── Payment status options ──────────────────────────────────────────────
  const paymentStatusOptions = [
    { key: "", label: "Payment - All" },
    { key: "paid", label: "Payment - Paid" },
    { key: "unpaid", label: "Payment - Unpaid" },
    { key: "partial", label: "Payment - Partial" },
  ];

  const paymentStatusLabel = (key: string): string => {
    const option = paymentStatusOptions.find(opt => opt.key === key);
    return option ? option.label : "Payment - All";
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

  const isLoading = stocksLoading;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id="tour-pharmacy-stock-page"
      className="w-full min-w-0 scroll-mt-6 px-0 py-0"
    >
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Stock Management
            </h2>
            <FeatureInfoTip
              title="Stock Management Tips"
              tips={stockTips}
              guideSection="pharmacy-guide-stock"
              linkLabel="Read stock guide"
            />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
            Monitor and manage medicine stock purchases and expiry tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap xl:justify-end mb-2">
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiDownload />}
            className="h-10 shrink-0 border border-green-400 text-green-800 text-[13px] font-semibold rounded-lg"
            onPress={handleDownloadStockSampleTemplate}
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
            isLoading={isImportingStock}
          >
            Bulk Stock
          </Button>
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiDownload />}
            className="h-10 shrink-0 text-[13px] font-semibold rounded-lg"
            onPress={handleExportStocks}
            isLoading={isExporting}
          >
            Export
          </Button>
          <Button
            color="primary"
            startContent={<FiPlus />}
            onPress={() => navigate("/pharmacy/stock/add")}
            className="h-10 shrink-0 whitespace-nowrap bg-primary px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            Add Stock
          </Button>
        </div>
      </div>

      {/* ── Stat cards - Updated for better mobile responsiveness ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 xl:grid-cols-4">
        {stockStats.map((stat, index) => {
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
                    {isSalesStatsLoading ? "..." : stat.value}
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

      {/* ── Tabs ── */}
      <div className="mt-6">
        <div className="mt-6 overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={handleTabChange}
            color="primary"
            variant="underlined"
            classNames={{
              tabList: "gap-6 w-full border-b border-slate-200 dark:border-[#273244]",
              cursor: "w-full bg-primary",
              tab: "h-12 px-4",
              tabContent: "text-[14px] font-semibold group-data-[selected=true]:text-primary",
            }}
          >
            <Tab
              key="all-stocks"
              title={
                <div className="flex items-center gap-2">
                  <FiFile className="text-lg" />
                  <span>All Stocks</span>
                </div>
              }
            />
            <Tab
              key="expired"
              title={
                <div className="flex items-center gap-2">
                  <FiAlertTriangle className="text-lg text-danger" />
                  <span>Expired</span>
                  {getExpiryCount(expiredData) > 0 && (
                    <Chip size="sm" color="danger" className="ml-1">
                      {getExpiryCount(expiredData)}
                    </Chip>
                  )}
                </div>
              }
            />
            <Tab
              key="expiring-30"
              title={
                <div className="flex items-center gap-2">
                  <FiClock className="text-lg text-warning" />
                  <span>Expiring in 30 Days</span>
                  {getExpiryCount(expiring30Data) > 0 && (
                    <Chip size="sm" color="warning" className="ml-1">
                      {getExpiryCount(expiring30Data)}
                    </Chip>
                  )}
                </div>
              }
            />
            <Tab
              key="expiring-60"
              title={
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-lg text-info" />
                  <span>Expiring in 60 Days</span>
                  {getExpiryCount(expiring60Data) > 0 && (
                    <Chip size="sm" color="default" className="ml-1">
                      {getExpiryCount(expiring60Data)}
                    </Chip>
                  )}
                </div>
              }
            />
          </Tabs>
        </div>
      </div>

      {/* ── Toolbar - Updated for better mobile responsiveness ── */}
      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Search - Using SearchField component */}
          <div className="w-full sm:w-[280px]">
            <SearchField
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder={
                activeTab === "all-stocks" 
                  ? "Search by sku, medicine name or batch..." 
                  : "Search by sku, medicine name..."
              }
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

          {/* Supplier filter - Only for All Stocks tab */}
          {activeTab === "all-stocks" && (
            <div ref={supplierDropdownRef} className="relative w-full sm:w-[220px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search supplier..."
                  maxLength={30}
                  value={supplierSearch}
                  onChange={(e) => handleSupplierSearchChange(e.target.value)}
                  onFocus={() => setIsSupplierOpen(true)}
                  className={[
                    "flex h-10 w-full cursor-pointer items-center rounded-lg border border-slate-200 bg-white",
                    "px-3 pr-10 text-[13px] font-semibold text-slate-700 shadow-sm",
                    "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                    "outline-none transition",
                    "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                    "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
                  ].join(" ")}
                />
                {supplierFilter && (
                  <button
                    type="button"
                    onClick={handleClearSupplierFilter}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    ✕
                  </button>
                )}
                <FiChevronDown
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-transform duration-200 dark:text-white ${isSupplierOpen ? "rotate-180" : ""}`}
                />
              </div>

              {isSupplierOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                  {suppliersLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="px-3 py-2 text-[13px] text-slate-500 dark:text-white">
                      No suppliers found
                    </div>
                  ) : (
                    suppliers.map((supplier: any) => {
                      const isActive = supplierFilter === supplier.id;
                      return (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => handleSupplierFilterChange(supplier.id)}
                          className={[
                            "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                            isActive
                              ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                              : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                          ].join(" ")}
                        >
                          <div className="flex flex-col">
                            <span className="line-clamp-1">{supplier.supplierName}</span>
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              {supplier.contactPerson || "N/A"} • {supplier.phone || "N/A"}
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
          )}

          {/* Payment status filter - Only for All Stocks tab */}
          {activeTab === "all-stocks" && (
            <div ref={paymentStatusDropdownRef} className="relative w-full sm:w-[200px]">
              <button
                type="button"
                onClick={() => setIsPaymentStatusOpen(!isPaymentStatusOpen)}
                onKeyDown={(e) => { if (e.key === "Escape") setIsPaymentStatusOpen(false); }}
                aria-expanded={isPaymentStatusOpen}
                aria-label="Payment status filter"
                className={[
                  "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white",
                  "px-3 text-[13px] font-semibold text-slate-700 shadow-sm",
                  "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                  "outline-none transition",
                  "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
                ].join(" ")}
              >
                <span className="truncate text-left">{paymentStatusLabel(paymentStatusFilter)}</span>
                <FiChevronDown
                  className={`ml-2 shrink-0 text-slate-500 transition-transform duration-200 dark:text-white ${isPaymentStatusOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isPaymentStatusOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                  {paymentStatusOptions.map((option) => {
                    const isActive = paymentStatusFilter === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handlePaymentStatusFilterChange(option.key)}
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
          )}

          {/* Date range picker - Only for All Stocks tab */}
          {activeTab === "all-stocks" && (
            <div className="flex w-full items-center gap-2 sm:w-auto [&>div]:!w-full sm:[&>div]:!w-auto [&_button]:!h-10 [&_button]:!rounded-lg [&_button]:!border-slate-200 [&_button]:!px-3 [&_button]:!shadow-sm [&_button_span]:!text-[13px]">
              <DashboardDateRangePicker
                startYmd={displayStartDate}
                endYmd={displayEndDate}
                isFetching={isLoading}
                onApply={(s, e) => onApplyRange(s, e)}
              />
            </div>
          )}

          {/* Clear button - Only shows when dates are selected */}
          {activeTab === "all-stocks" && displayStartDate && displayEndDate && (
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
        {activeTab === "all-stocks" ? (
          <>
            <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
              {stocksLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-pulse text-slate-500 dark:text-white">Loading stocks...</div>
                </div>
              ) : stocks.length === 0 ? (
                <div className="text-center py-20 text-slate-500 dark:text-white">
                  No stock records found
                </div>
              ) : (
                <table className="w-full min-w-[1180px] text-left">
                  <thead className="bg-slate-50/80 dark:bg-[#111726]">
                    <tr className="border-b border-slate-100 dark:border-[#273244]">
                      <th className="w-[4%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Expand</th>
                      <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Purchase Date</th>
                      <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Supplier Name</th>
                      <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Contact Person</th>
                      <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Phone</th>
                      <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Payment Status</th>
                      <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Payment Notes</th>
                      <th className="w-[6%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Unit</th>
                      <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Total Amount</th>
                      <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                    {stocks.map((item: any) => {
                      const paymentConfig = getPaymentStatusConfig(item.pharmacyStockPaymentStatus);
                      const isExpanded = expandedRows.has(item.id);
                      const hasMedicines = item.medicines && item.medicines.length > 0;

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                            <td className="px-5 py-4">
                              {hasMedicines && (
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpansion(item.id)}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#273244]"
                                >
                                  {isExpanded ? (
                                    <FiChevronDown className="text-lg text-slate-500" />
                                  ) : (
                                    <FiChevronRight className="text-lg text-slate-500" />
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                                {formatDateTime(item.purchaseDate)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                                {item.supplierName || "-"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                                {item.contactPerson || "-"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                                {item.phone || "-"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <Chip color={paymentConfig.color} variant="flat" size="sm">
                                {paymentConfig.label}
                              </Chip>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-semibold text-slate-700 dark:text-white truncate block max-w-[150px]">
                                {item.paymentNotes || "-"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                                {item.unit}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                                {formatCurrency(item.totalAmount)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-2">
                                <Tooltip content="Edit Stock">
                                  <Button
                                    size="sm"
                                    color="primary"
                                    variant="flat"
                                    onPress={() => handleEditStock(item.id)}
                                    className="min-w-0 h-8 px-2"
                                  >
                                    <FiEdit />
                                  </Button>
                                </Tooltip>
                                {item.invoice && (
                                  <Tooltip content="View Invoice">
                                    <Button
                                      size="sm"
                                      color="secondary"
                                      variant="flat"
                                      onPress={() => handleViewInvoice(item.invoice)}
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
                              <td colSpan={10} className="px-5 py-4">
                                <div className="p-4">
                                  <h3 className="text-[14px] font-bold text-slate-950 dark:text-white mb-3">
                                    Medicines in this Purchase
                                  </h3>
                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[800px] text-left">
                                      <thead className="bg-slate-100/80 dark:bg-[#1a2335]">
                                        <tr className="border-b border-slate-200 dark:border-[#273244]">
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">SKU</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Medicine Name</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Category</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Form</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Batch</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Expiry</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Qty</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">MRP</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Cost</th>
                                          <th className="px-4 py-2 text-[12px] font-bold text-slate-500 dark:text-white">Total Cost</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                                        {item.medicines.map((medicine: any) => (
                                          <tr key={medicine.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a2335]">
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{medicine.sku || "-"}</td>
                                            <td className="px-4 py-2 text-[13px] font-bold text-slate-900 dark:text-white">
                                              {medicine.medicineName}
                                              {medicine.packOf && (
                                                <span className="text-[11px] font-medium text-slate-500 dark:text-white block">
                                                  Pack of {medicine.packOf}
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{medicine.category || "-"}</td>
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{medicine.form || "-"}</td>
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{medicine.batch || "-"}</td>
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{formatDate(medicine.expiry)}</td>
                                            <td className="px-4 py-2 text-[13px] font-bold text-slate-900 dark:text-white">{medicine.quantity}</td>
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{formatCurrency(medicine.mrp)}</td>
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-white">{formatCurrency(medicine.cost)}</td>
                                            <td className="px-4 py-2 text-[13px] font-bold text-slate-900 dark:text-white">{formatCurrency(medicine.totalCost)}</td>
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
                    Showing {stocks.length > 0 ? ((pagination.pageNumber - 1) * paginationInfo.pageSize) + 1 : 0}-
                    {Math.min(pagination.pageNumber * paginationInfo.pageSize, paginationInfo.totalRecords)} of {paginationInfo.totalRecords} stocks
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
          </>
        ) : (
          // Expiry tabs
          <>
            {activeTab === "expired" && (
              <ExpiryStockTable
                expiryData={expiredStocks}
                loading={expiredLoading}
                paginationInfo={expiredPaginationInfo}
                currentPage={expiredPagination.pageNumber}
                pageSize={expiredPagination.pageSize}
                onPageChange={handleExpiredPageChange}
                onPageSizeChange={handleExpiredRowsPerPageChange}
                title="Expired Stock"
                isPageSizeOpen={isExpiredPageSizeOpen}
                onPageSizeToggle={() => setIsExpiredPageSizeOpen(!isExpiredPageSizeOpen)}
                pageSizeOptions={pageSizeOptions}
                dropdownRef={expiredDropdownRef}
              />
            )}

            {activeTab === "expiring-30" && (
              <ExpiryStockTable
                expiryData={expiring30Stocks}
                loading={expiring30Loading}
                paginationInfo={expiring30PaginationInfo}
                currentPage={expiring30Pagination.pageNumber}
                pageSize={expiring30Pagination.pageSize}
                onPageChange={handleExpiring30PageChange}
                onPageSizeChange={handleExpiring30RowsPerPageChange}
                title="Stock Expiring in 30 Days"
                isPageSizeOpen={isExpiring30PageSizeOpen}
                onPageSizeToggle={() => setIsExpiring30PageSizeOpen(!isExpiring30PageSizeOpen)}
                pageSizeOptions={pageSizeOptions}
                dropdownRef={expiring30DropdownRef}
              />
            )}

            {activeTab === "expiring-60" && (
              <ExpiryStockTable
                expiryData={expiring60Stocks}
                loading={expiring60Loading}
                paginationInfo={expiring60PaginationInfo}
                currentPage={expiring60Pagination.pageNumber}
                pageSize={expiring60Pagination.pageSize}
                onPageChange={handleExpiring60PageChange}
                onPageSizeChange={handleExpiring60RowsPerPageChange}
                title="Stock Expiring in 60 Days"
                isPageSizeOpen={isExpiring60PageSizeOpen}
                onPageSizeToggle={() => setIsExpiring60PageSizeOpen(!isExpiring60PageSizeOpen)}
                pageSizeOptions={pageSizeOptions}
                dropdownRef={expiring60DropdownRef}
              />
            )}
          </>
        )}
      </div>

      {/* ── Invoice Modal ── */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" scrollBehavior="inside" classNames={{ base: "h-[90vh]" }}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Invoice Preview</ModalHeader>
              <ModalBody className="p-0">
                {selectedInvoiceUrl ? (
                  <iframe src={selectedInvoiceUrl} title="Invoice PDF" width="100%" height="100%" className="min-h-[75vh] border-0" />
                ) : (
                  <div className="flex items-center justify-center h-[75vh] text-slate-500">No invoice available</div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Stock Import Modal ── */}
      <Modal isOpen={uploadModalOpen} onOpenChange={setUploadModalOpen} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Upload Bulk Stock</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {!uploadResult.show ? (
                    <>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleStockFileSelect}
                          className="hidden"
                          id="stock-bulk-upload-file"
                        />
                        <label htmlFor="stock-bulk-upload-file" className="cursor-pointer flex flex-col items-center gap-2">
                          <FiUpload className="text-4xl text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {selectedStockFile ? selectedStockFile.name : "Click to select Excel/CSV file"}
                          </span>
                          <span className="text-xs text-gray-500">
                            Supported formats: .xlsx, .xls, .csv
                          </span>
                        </label>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          📌 <strong>Important Instructions:</strong>
                        </p>
                        <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                          <li>Download the sample template to see the required format</li>
                          <li>Stock Number is used to group multiple medicines into one purchase</li>
                          <li>Same Stock Number across rows = Same purchase entry</li>
                          <li>Medicine names must exactly match existing medicines in your inventory</li>
                          <li>Batch numbers must be unique per medicine</li>
                          <li>Expiry date must be a future date</li>
                          <li>Payment Status: paid, pending, or partial</li>
                        </ul>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ <strong>Note:</strong> If a batch already exists for a medicine, 
                          the quantity will be added to the existing stock. If the batch is new, 
                          a new stock entry will be created.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Import Summary</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {uploadResult.data?.totalStocks || 0}
                            </div>
                            <div className="text-sm text-gray-600">Stock Entries</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {uploadResult.data?.totalMedicines || 0}
                            </div>
                            <div className="text-sm text-gray-600">Medicines Added</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {uploadResult.data?.totalErrors || 0}
                            </div>
                            <div className="text-sm text-gray-600">Errors</div>
                          </div>
                        </div>

                        {uploadResult.data?.insertedStocks?.length ? (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-600">Inserted Stock Entries:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                              {(uploadResult.data?.insertedStocks || []).slice(0, 5).map((name, idx) => (
                                <li key={idx}>{name}</li>
                              ))}
                              {(uploadResult.data?.insertedStocks || []).length > 5 && (
                                <li>...and {(uploadResult.data?.insertedStocks || []).length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        ) : null}

                        {uploadResult.data?.insertedMedicines?.length ? (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-blue-600">Inserted Medicines:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                              {(uploadResult.data?.insertedMedicines || []).slice(0, 5).map((name, idx) => (
                                <li key={idx}>{name}</li>
                              ))}
                              {(uploadResult.data?.insertedMedicines || []).length > 5 && (
                                <li>...and {(uploadResult.data?.insertedMedicines || []).length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        ) : null}

                        {uploadResult.data?.errors?.length ? (
                          <div>
                            <p className="text-sm font-medium text-red-600">Errors:</p>
                            <ul className="text-sm text-red-500 list-disc list-inside max-h-40 overflow-y-auto">
                              {(uploadResult.data?.errors || []).map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                {!uploadResult.show ? (
                  <>
                    <Button variant="light" onPress={onClose}>
                      Cancel
                    </Button>
                    <Button
                      color="primary"
                      onPress={handleUploadBulkStock}
                      isLoading={isImportingStock}
                      isDisabled={!selectedStockFile}
                    >
                      Upload Stock
                    </Button>
                  </>
                ) : (
                  <Button
                    color="primary"
                    onPress={() => {
                      setUploadResult({ show: false });
                      setSelectedStockFile(null);
                      onClose();
                    }}
                  >
                    Close
                  </Button>
                )}
              </ModalFooter>
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

export default PharmacistStock;
