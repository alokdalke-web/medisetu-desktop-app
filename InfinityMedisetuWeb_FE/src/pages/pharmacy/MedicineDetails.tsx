
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { useForm, Controller } from "react-hook-form";
import {
  Avatar,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Autocomplete,
  AutocompleteItem,
  addToast,
  Button,
  Spinner,
  Card,
  CardBody,
  Tabs,
  Tab,
  Chip,
  Pagination,
} from "@heroui/react";
import { 
  FiChevronRight, 
  FiPackage, 
  FiClock, 
  FiActivity, 
  FiTruck, 
  FiArrowLeft,
  FiChevronDown,
} from "react-icons/fi";

import {
  useGetInvoiceMedicineStockDetailsQuery,
  useLazyGetInvoiceInventoryHistoryQuery,
} from "../../redux/api/pharmaDashApi";
import { useGetUserQuery } from "../../redux/api/authApi";
import { 
  useCreateManualBatchMutation, 
  useGetSuppliersQuery 
} from "../../redux/api/supplierApi";
import AppButton from "../../components/shared/AppButton";
import SearchField from "../../components/shared/SearchField";
import InputField from "../../components/shared/InputField";
import StatusChip from "../../components/shared/StatusChip";

const formatINR = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${(n || 0).toFixed(2)}`;
  }
};

const formatExpiry = (raw: unknown) => {
  const s = typeof raw === "string" ? raw : "";
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (raw: unknown) => {
  const s = typeof raw === "string" ? raw : "";
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type HistoryCard = {
  batchNo?: string;
  quantity?: number | string;
  referenceType?: string;
  inoviceid?: string;
  invoiceId?: string; // fallback
  createdAt?: string;
};

const MedicineDetails: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();

  const { data, isLoading, isFetching, isError, refetch } =
    useGetInvoiceMedicineStockDetailsQuery(productId ?? "", {
      skip: !productId,
      refetchOnMountOrArgChange: true,
    });

  const [fetchHistory, { isFetching: isHistoryFetching, data: historyDataRaw }] =
    useLazyGetInvoiceInventoryHistoryQuery();

  const payload: any = data?.data ?? data?.result;
  const medicine = payload?.medicine ?? {};
  const stock = payload?.stock ?? {};
  const { data: userRes } = useGetUserQuery();
  const pharmacyId =
    (userRes as any)?.pharmacyDetails?.pharmacyId ||
    (userRes as any)?.result?.pharmacyDetails?.pharmacyId ||
    (userRes as any)?.data?.pharmacyDetails?.pharmacyId;

  const {
    isOpen: isAddBatchOpen,
    onOpen: onAddBatchOpen,
    onOpenChange: onAddBatchOpenChange,
  } = useDisclosure();

  const [createManualBatch, { isLoading: isBatchSaving }] =
    useCreateManualBatchMutation();

  const { data: suppliersRes } = useGetSuppliersQuery(
    { pharmacyId: pharmacyId ?? "" },
    { skip: !pharmacyId },
  );

  const suppliers = useMemo(() => {
    const raw = suppliersRes?.result?.data ?? suppliersRes?.data ?? suppliersRes?.result ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [suppliersRes]);

  const { control, handleSubmit, reset, watch, setValue, getValues } = useForm({
    defaultValues: {
      supplierId: "",
      batchNo: "",
      expiryDate: "",
      qty: "",
      purchasePrice: "",
      mrp: "",
      gstPercentage: "",
      sellingPrice: "",
    },
  });

  const formValues = watch();

  useEffect(() => {
    const purchase = parseFloat(formValues.purchasePrice || "0");
    const gst = parseFloat(formValues.gstPercentage || "0");
    const mrp = parseFloat(formValues.mrp || "0");

    if (purchase > 0) {
      let calculated = purchase * (1 + gst / 100);
      if (mrp > 0 && calculated > mrp) calculated = mrp;
      
      const formatted = calculated.toFixed(2);
      if (getValues("sellingPrice") !== formatted) {
        setValue("sellingPrice", formatted);
      }
    }
  }, [formValues.purchasePrice, formValues.gstPercentage, formValues.mrp, setValue, getValues]);

  const onSaveManualBatch = async (data: any) => {
    if (!pharmacyId) return;
    
    try {
      const body = {
        supplierId: data.supplierId,
        batchNo: data.batchNo.trim(),
        items: [{
          productId: productId ?? "",
          expiryDate: data.expiryDate,
          quantity: Number(data.qty),
          mrp: Number(data.mrp),
          purchasePrice: Number(data.purchasePrice),
          gstPercentage: Number(data.gstPercentage),
          sellingPrice: Number(data.sellingPrice),
        }]
      };

      await createManualBatch({ pharmacyId, body }).unwrap();
      addToast({ title: "Batch added successfully", color: "success" });
      onAddBatchOpenChange();
      reset();
      refetch();
    } catch (e: any) {
      addToast({ 
        title: e?.data?.message || "Failed to add batch", 
        color: "danger" 
      });
    }
  };

  const batches: any[] = useMemo(() => {
    return Array.isArray(payload?.batches) ? payload.batches : [];
  }, [payload?.batches]);

  const [activeTab, setActiveTab] = useState<any>("batches");

  useEffect(() => {
    if (activeTab === "history" && productId) {
      fetchHistory(productId);
    }
  }, [activeTab, productId, fetchHistory]);

  const historyCards = useMemo(() => {
    const p: any = historyDataRaw?.data ?? historyDataRaw?.result;
    const list: any[] = p?.consumption?.recentOutMovements ?? [];
    return [...list].sort((a, b) => {
      const at = new Date(a?.createdAt ?? 0).getTime();
      const bt = new Date(b?.createdAt ?? 0).getTime();
      return bt - at;
    });
  }, [historyDataRaw]);

  // Search + Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const pageSizeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pageSizeRef.current && !pageSizeRef.current.contains(event.target as Node)) {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => setPage(1), [searchQuery, pageSize]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return batches;

    return batches.filter((b: any) => {
      const s = b?.supplier ?? {};
      const hay = [
        b?.batchNo,
        b?.expiryDate,
        b?.sellingPrice,
        b?.receivedQty,
        b?.soldQty,
        b?.availableQty,
        s?.name,
        s?.companyName,
        s?.location,
        s?.contactPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [batches, searchQuery]);

  const totalRecords = filtered.length;
  const totalPages = totalRecords === 0 ? 1 : Math.ceil(totalRecords / pageSize);

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pageRows = filtered.slice(startIndex, endIndex);

  const isBusy = isLoading || isFetching;

  if (isBusy) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-red-500 font-medium">Failed to load medicine details</p>
        <Button onPress={() => refetch()} variant="flat" color="danger" radius="full">
          Retry
        </Button>
      </div>
    );
  }

  const goToInvoice = (item: HistoryCard) => {
    const invoiceId = item?.inoviceid ?? item?.invoiceId;
    if (!invoiceId) return;
    navigate(`/pharmacy/invoice/${invoiceId}`);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 md:px-4 py-4">
      {/* Breadcrumbs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
        <Link to="/pharmacy/medicine" className="hover:text-primary transition-colors">Pharmacy</Link>
        <FiChevronRight className="opacity-40" />
        <Link to="/pharmacy/medicine" className="hover:text-primary transition-colors">Medicines</Link>
        <FiChevronRight className="opacity-40" />
        <span className="font-semibold text-slate-900 truncate max-w-[200px]">
          {medicine?.drugName}
        </span>
      </div>

      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Button 
              isIconOnly 
              variant="light" 
              className="rounded-full w-10 h-10 hover:bg-slate-100"
              onPress={() => navigate(-1)}
            >
              <FiArrowLeft className="w-6 h-6 text-slate-600" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                  {medicine?.drugName}
                </h1>
                <StatusChip status={stock?.totalAvailable > 0 ? "Active" : "Cancelled"} text={stock?.totalAvailable > 0 ? "In Stock" : "Out of Stock"} />
              </div>
              <p className="text-sm font-medium text-secondary flex items-center gap-2">
                {medicine?.strength} <span className="opacity-30">|</span> {medicine?.packSize} <span className="opacity-30">|</span> {medicine?.manufacturer || "Generic Pharma"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              <Button
                variant="flat"
                onPress={() => {
                  reset({
                    supplierId: "",
                    batchNo: "",
                    expiryDate: "",
                    qty: "",
                    purchasePrice: "",
                    mrp: "",
                    gstPercentage: medicine?.gstPercentage?.toString() || "",
                    sellingPrice: "",
                  });
                  onAddBatchOpen();
                }}
                className="font-bold text-primary bg-primary/10 hover:bg-primary/20 h-10 px-5 rounded-full"
              >
                Add Batch
              </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Available", value: stock?.totalAvailable ?? 0, icon: <FiPackage className="text-primary"/>, bg: "bg-primary/5" },
          { label: "Units Received", value: stock?.totalReceived ?? 0, icon: <FiTruck className="text-blue-500"/>, bg: "bg-blue-50" },
          { label: "Units Sold", value: stock?.totalSold ?? 0, icon: <FiActivity className="text-teal-500"/>, bg: "bg-teal-50" },
          { label: "Active Batches", value: batches.length, icon: <FiClock className="text-orange-500"/>, bg: "bg-orange-50" },
        ].map((stat, i) => (
          <Card key={i} className="shadow-none border border-border-color bg-white">
            <CardBody className="p-4 flex flex-row items-center gap-4">
              <div className={`p-3 rounded-xl text-lg ${stat.bg}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{stat.value}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs 
        selectedKey={activeTab}
        onSelectionChange={setActiveTab}
        variant="underlined" 
        classNames={{
          tabList: "gap-8 w-full relative rounded-none p-0 border-b border-divider mb-2",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-0 h-12",
          tabContent: "group-data-[selected=true]:text-primary font-bold text-sm uppercase tracking-wider"
        }}
      >
        <Tab 
          key="batches" 
          title="Inventory Batches"
        >
          <div className="py-6">
             <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="w-full sm:w-[360px]">
                <SearchField
                  placeholder="Search by batch or supplier..."
                  value={searchQuery}
                  onChange={(e: any) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery("")}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[1000px] text-left">
                  <thead className="bg-slate-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-4 text-[13px] font-semibold text-slate-500">Batch Info</th>
                      <th className="px-5 py-4 text-[13px] font-semibold text-slate-500">Expiry Date</th>
                      <th className="px-5 py-4 text-[13px] font-semibold text-slate-500">Pricing</th>
                      <th className="px-5 py-4 text-[13px] font-semibold text-slate-500">Available</th>
                      <th className="px-5 py-4 text-[13px] font-semibold text-slate-500">Sold</th>
                      <th className="px-5 py-4 text-[13px] font-semibold text-slate-500">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="h-40 text-center text-slate-400">
                          No stock batches found
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((b: any, idx: number) => {
                        const s = b?.supplier ?? {};
                        const isExpired = new Date(b?.expiryDate) < new Date();
                        return (
                          <tr key={`${b?.batchNo}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-semibold text-slate-900">
                                  {b?.batchNo || "—"}
                                </p>
                                <p className="truncate text-[12px] font-medium text-slate-500">
                                  ID: {b?.id?.slice(-8).toUpperCase()}
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                               <div className="min-w-0">
                                <p className="truncate text-[14px] font-semibold text-slate-900">
                                  {formatExpiry(b?.expiryDate)}
                                </p>
                                <p className={`truncate text-[12px] font-medium ${isExpired ? "text-red-500" : "text-slate-500"}`}>
                                  {isExpired ? "Expired" : "Valid"}
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="truncate text-[14px] font-medium text-slate-900">
                                {formatINR(b?.sellingPrice)}
                              </p>
                              <p className="truncate text-[12px] font-medium text-slate-500">
                                per {medicine?.packSize || "unit"}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                               <Chip 
                                size="sm" 
                                variant="flat" 
                                color={b?.availableQty > 10 ? "success" : b?.availableQty > 0 ? "warning" : "danger"}
                                className="font-bold tabular-nums"
                              >
                                {b?.availableQty ?? 0}
                              </Chip>
                            </td>
                            <td className="px-5 py-4">
                              <p className="truncate text-[14px] font-medium text-slate-900 tabular-nums">
                                {b?.soldQty ?? 0}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  name={s?.name || "Supplier"}
                                  size="sm"
                                  className="bg-slate-100 text-slate-500 font-bold"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-semibold text-slate-900">
                                    {s?.name || "—"}
                                  </p>
                                  <p className="truncate text-[12px] font-medium text-slate-500">
                                    {s?.companyName || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section matching AppointmentListView */}
              <div className="border-t border-gray-100 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Rows per page */}
                  <div className="flex items-center justify-center gap-2 text-[13px] text-slate-600 sm:justify-start">
                    <span className="whitespace-nowrap">Batches per page :</span>

                    <div ref={pageSizeRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPageSizeOpen((prev) => !prev)}
                        className={[
                          "flex h-9 w-[72px] items-center justify-between rounded-full border border-primary/40",
                          "bg-white px-3 text-[13px] font-medium text-primary shadow-sm",
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
                        <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          {[6, 10, 15].map((size) => {
                            const active = pageSize === size;

                            return (
                              <button
                                key={size}
                                onClick={() => {
                                  setPageSize(size as any);
                                  setIsPageSizeOpen(false);
                                }}
                                className={`flex h-10 w-full items-center justify-center px-3 text-[13px] transition hover:bg-slate-50 ${
                                  active ? "font-bold text-primary" : "text-slate-600"
                                }`}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 justify-center sm:justify-end">
                    <Pagination
                      isCompact
                      showControls
                      total={totalPages}
                      page={page}
                      onChange={setPage}
                      radius="full"
                      classNames={{
                        wrapper: "gap-2 flex-wrap justify-center sm:justify-end",
                        item:
                          "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none " +
                          "hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                        prev:
                          "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                        next:
                          "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                        cursor: "hidden",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tab>
        
        <Tab 
          key="history" 
          title="Sales History"
        >
          <div className="py-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Movement History</h3>
              <p className="text-sm text-secondary">Inventory consumption logs for this medicine</p>
            </div>

            {isHistoryFetching ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-24 shadow-none border border-border-color animate-pulse" />
                ))}
              </div>
            ) : historyCards.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center gap-4">
                <FiClock className="text-4xl text-slate-300" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-sm">No sales records found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyCards.map((m, idx) => {
                  const invoiceId = (m as any)?.inoviceid ?? (m as any)?.invoiceId;
                  return (
                    <Card 
                      key={`${invoiceId}-${idx}`} 
                      isPressable
                      onPress={() => goToInvoice(m)}
                      className="shadow-none border border-border-color hover:border-primary/50 transition-all bg-white"
                    >
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col gap-1">
                             <StatusChip status="Confirmed" text={(m as any)?.referenceType || "INVOICE"} />
                              <p className="text-[11px] font-bold text-slate-400">
                                {formatDateTime((m as any)?.createdAt)}
                              </p>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">Units Sold</p>
                             <p className="text-xl font-black text-slate-900 tabular-nums">{String((m as any)?.quantity || 0)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Invoice</p>
                            <p className="text-sm font-mono font-bold text-slate-700 truncate max-w-[120px]">#{invoiceId || "—"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Batch</p>
                            <p className="text-sm font-bold text-slate-900">{(m as any)?.batchNo || "—"}</p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Tab>
      </Tabs>

      {/* Add Batch Modal */}
      <Modal 
        isOpen={isAddBatchOpen} 
        onOpenChange={onAddBatchOpenChange}
        size="2xl"
        backdrop="opaque"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Add New Batch
                <span className="text-xs font-normal text-slate-500">
                  Adding stock for: <b className="text-slate-900">{medicine?.drugName}</b>
                </span>
              </ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Controller
                      name="supplierId"
                      control={control}
                      rules={{ required: "Supplier is required" }}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          label="Supplier"
                          placeholder="Select a supplier"
                          variant="bordered"
                          selectedKey={field.value}
                          onSelectionChange={(key) => field.onChange(key)}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                          classNames={{
                            base: "max-w-full",
                          }}
                        >
                          {suppliers.map((s: any) => (
                            <AutocompleteItem key={s.id || s._id} textValue={s.name}>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{s.name}</span>
                                <span className="text-xs text-slate-400">{s.companyName}</span>
                              </div>
                            </AutocompleteItem>
                          ))}
                        </Autocomplete>
                      )}
                    />
                  </div>

                  <InputField
                    name="batchNo"
                    control={control}
                    label="Batch Number"
                    placeholder="e.g. 12345"
                    rules={{ required: "Required" }}
                  />

                  <InputField
                    name="expiryDate"
                    control={control}
                    label="Expiry Date"
                    type="date"
                    rules={{ required: "Required" }}
                  />

                  <InputField
                    name="qty"
                    control={control}
                    label="Quantity"
                    placeholder="0"
                    type="number"
                    rules={{ required: "Required" }}
                  />

                  <InputField
                    name="mrp"
                    control={control}
                    label="MRP"
                    placeholder="0.00"
                    type="number"
                    rules={{ required: "Required" }}
                  />

                  <InputField
                    name="purchasePrice"
                    control={control}
                    label="Purchase Price"
                    placeholder="0.00"
                    type="number"
                    rules={{ required: "Required" }}
                  />

                  <InputField
                    name="gstPercentage"
                    control={control}
                    label="GST %"
                    placeholder="0"
                    type="number"
                  />

                  <InputField
                    name="sellingPrice"
                    control={control}
                    label="Selling Price"
                    placeholder="0.00"
                    type="number"
                    rules={{ required: "Required" }}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <AppButton
                  text="Add Batch"
                  buttonVariant="primary"
                  onPress={() => handleSubmit(onSaveManualBatch)()}
                  isLoading={isBatchSaving}
                  className="px-8"
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default MedicineDetails;
