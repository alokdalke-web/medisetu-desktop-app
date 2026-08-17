import {
  addToast,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Image,
  Input,
  Skeleton,
  Spinner,
  User
} from "@heroui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import InputField from "../../components/shared/InputField";
import Icons from "../../constants/icons";
import { useGetUserQuery } from "../../redux/api/authApi";
import {
  useCreateInvoiceMutation,
  useLazySearchInvoiceMedicinesQuery,
} from "../../redux/api/pharmacyApi";
import {
  useGetPrescriptionQueueByIdQuery,
  useUpdatePrescriptionStatusMutation,
} from "../../redux/api/prescriptionQueueApi";
import type { PrescriptionStatus } from "../../schemas/prescriptionQueue";

/* ---------------- Inline SVG Icons ---------------- */

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ReceiptIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.64 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17z" />
  </svg>
);

const PillIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PrinterIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const PauseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const XCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const PackageIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

/* ---------------- Skeleton UI ---------------- */

const PrescriptionDetailsSkeleton = () => {
  const meds = Array.from({ length: 3 });
  const invoiceRows = Array.from({ length: 4 });

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-7 w-56 rounded" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Skeleton className="h-10 w-44 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_auto_1.2fr] xl:gap-10">
        <Card className="shadow-none border border-border-color">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-5 w-48 rounded" />
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="p-0 block">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-56 rounded" />
                  <Skeleton className="mt-2 h-3 w-28 rounded" />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 bg-background-secondary">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="mt-2 h-4 w-44 rounded" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <Skeleton className="h-4 w-56 rounded" />
              {meds.map((_, i) => (
                <div key={i} className="py-4 border-t border-border-color">
                  <div className="flex gap-3">
                    <Skeleton className="h-6 w-6 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-64 rounded" />
                      <Skeleton className="mt-2 h-3 w-52 rounded" />
                      <Skeleton className="mt-2 h-3 w-72 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="hidden xl:flex items-center justify-center">
          <Skeleton className="h-16 w-16 rounded-lg" />
        </div>

        <Card className="shadow-none border border-border-color">
          <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-5 w-32 rounded" />
            </div>
            <div className="space-y-2 sm:text-right">
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="mt-6">
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="border border-border-color rounded-lg mt-6 sm:mt-9 overflow-hidden">
              <div className="p-3 bg-background border-b border-border-color">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-3">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-10 rounded" />
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-3 w-12 rounded ml-auto" />
                  <div />
                </div>
              </div>
              {invoiceRows.map((_, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-3 px-4 py-3 border-b last:border-b-0 items-center">
                  <div className="min-w-0">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="mt-2 h-3 w-32 rounded" />
                    <Skeleton className="mt-2 h-3 w-28 rounded" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-20 rounded ml-auto" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))}
            </div>
          </CardBody>
          <CardFooter className="bg-background block p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-6 w-28 rounded" />
            </div>
            <div className="mt-6 sm:mt-10">
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

/* ---------------- Status Badge ---------------- */

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:    { label: "Pending",    cls: "bg-amber-50 text-amber-600 border border-amber-200" },
    ON_HOLD:    { label: "On Hold",    cls: "bg-orange-50 text-orange-600 border border-orange-200" },
    COMPLETED:  { label: "Completed",  cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    REJECTED:   { label: "Rejected",   cls: "bg-red-50 text-red-600 border border-red-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 border border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};

/* ---------------- Component ---------------- */

const formatINR = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
};

const PrescriptionDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: userResp } = useGetUserQuery();
  const user: any = (userResp as any)?.data ?? userResp;
  const pharmacyId: string = String(user?.pharmacyDetails?.pharmacyId ?? "");

  const { data, isLoading, isError } = useGetPrescriptionQueueByIdQuery(id!, {
    skip: !id,
  });

  const [updatePrescriptionStatus, { isLoading: isUpdating }] =
    useUpdatePrescriptionStatusMutation();

  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  const [triggerSearch, { data: searchResult, isFetching }] =
    useLazySearchInvoiceMedicinesQuery();

  const prescription = data?.result;
  const isCompleted = prescription?.status === "COMPLETED";

  const { control, watch, setValue } = useForm({
    defaultValues: {
      customerName: "",
      mobile: "",
    },
  });

  useEffect(() => {
    if (prescription) {
      setValue("customerName", prescription.patient.name);
      setValue("mobile", prescription.patient.mobile);
    }
  }, [prescription, setValue]);

  const customerName = watch("customerName");
  const mobile = watch("mobile");

  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownWrapRef = useRef<HTMLDivElement | null>(null);

  /* Sync invoiceItems with prescription invoicePreview */
  useEffect(() => {
    if (prescription?.invoicePreview?.items) {
      const items = prescription.invoicePreview.items.map((item: any) => {
        const medicine = prescription.medicines.find(
          (m: any) => m.id === item.prescriptionId,
        );
        return {
          ...item,
          batchItemId: item.batchItemId || item.batches?.[0]?.batchItemId || item.batches?.[0]?.id,
          qty: item.quantity || Number(medicine?.medicineCount) || 1,
          sellingPrice: Number(
            item.batches?.[0]?.sellingPrice || item.unitPrice || 0,
          ),
          gstPercentage: Number(
            item.batches?.[0]?.gstPercentage ?? item.gstPercentage ?? 0,
          ),
          expiryDate: item.batches?.[0]?.expiryDate ?? item.expiryDate ?? null,
          batchNumber:
            item.batches?.[0]?.batchNumber ?? item.batchNumber ?? "—",
        };
      });
      setInvoiceItems(items);
    }
  }, [prescription]);

  /* Debounced search */
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setShowDropdown(false);
      return;
    }
    setShowDropdown(true);

    const t = window.setTimeout(() => {
      triggerSearch(term);
    }, 300);

    return () => window.clearTimeout(t);
  }, [searchTerm, triggerSearch]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = dropdownWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const searchItems = useMemo(() => {
    const arr =
      (searchResult as any)?.data ||
      (searchResult as any)?.items ||
      searchResult ||
      [];
    return Array.isArray(arr) ? arr : [];
  }, [searchResult]);

  const total = invoiceItems.reduce((sum, item) => {
    const unitInclusive = Number(item.sellingPrice || 0);
    const qty = Number(item.qty || 0);
    return sum + unitInclusive * qty;
  }, 0);

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;

  const handleStatusUpdate = async (status: PrescriptionStatus) => {
    if (!id) return;
    try {
      await updatePrescriptionStatus({ id, status }).unwrap();
      addToast({ title: "Prescription updated", color: "success" });
    } catch (err) {
      console.error("Failed to update status", err);
      addToast({ title: "Failed to update status", color: "danger" });
    }
  };

  const handleCreateInvoice = async () => {
    if (!pharmacyId) {
      addToast({ title: "Pharmacy ID not found", color: "danger" });
      return;
    }
    if (invoiceItems.length === 0) {
      addToast({ title: "No items in invoice", color: "warning" });
      return;
    }
    const missingStock = invoiceItems.find((it) => !it.batchItemId);
    if (missingStock) {
      addToast({
        title: "Stock required",
        description: `No stock available for "${missingStock.medicineName}". Please remove it or add stock first.`,
        color: "danger",
      });
      return;
    }

    const payload = {
      pharmacyId,
      customerName,
      mobile,
      items: invoiceItems.map((item) => ({
        productId: item.productId || item.prescriptionId,
        batchItemId: item.batchItemId,
        quantity: item.qty,
      })),
      billing: {
        paymentMethod: "CASH",
        tax: 0,
        discount: 0,
      },
    };

    try {
      await createInvoice(payload as any).unwrap();
      await handleStatusUpdate("COMPLETED");
      addToast({ title: "Invoice created successfully", color: "success" });
      navigate("/pharmacy/invoice");
    } catch (err: any) {
      console.error("Failed to create invoice", err);
      addToast({
        title: "Failed to create invoice",
        description: err?.data?.message || "Unknown error",
        color: "danger",
      });
    }
  };

  const addItem = (item: any) => {
    const s0 = item.stock?.[0] || {};
    const newItem = {
      productId: item.medicineId || item.productId,
      batchItemId: s0.batchItemId || s0.id,
      medicineName: item.name || item.medicineName,
      qty: 1,
      sellingPrice: Number(s0.sellingPrice || item.sellingPrice || 0),
      gstPercentage: Number(s0.gstPercentage || item.gstPercentage || 0),
      expiryDate: s0.expiryDate || item.expiryDate || null,
      batchNumber: s0.batchNumber || item.batchNumber || "—",
      availableStock: s0.availableStrips || item.availableQuantity || 0,
      status: "READY",
    };
    setInvoiceItems((prev) => [...prev, newItem]);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const removeItem = (index: number) => {
    setInvoiceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQty = (index: number, qty: number) => {
    setInvoiceItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: Math.max(1, qty) } : item,
      ),
    );
  };

  if (isLoading) {
    return <PrescriptionDetailsSkeleton />;
  }

  if (isError || !prescription) {
    return (
      <div className="h-64 flex flex-col justify-center items-center gap-3 text-red-500">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-base font-medium">Failed to load prescription details</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-full border border-border-color bg-background hover:bg-background-secondary transition-colors text-secondary hover:text-primary flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeftIcon />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-xl sm:text-2xl truncate">
                Prescription Details
              </h3>
              <StatusBadge status={prescription.status} />
            </div>
            <p className="text-xs text-secondary mt-0.5 flex items-center gap-1">
              <CalendarIcon />
              {new Date(prescription.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-shrink-0">
          {prescription.status !== "COMPLETED" && (
            <>
              {prescription.status !== "REJECTED" && (
                <>
                  {prescription.status !== "ON_HOLD" && (
                    <button
                      onClick={() => handleStatusUpdate("ON_HOLD")}
                      disabled={isUpdating}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-primary text-primary bg-background-secondary hover:bg-primary/5 text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      <PauseIcon />
                      Hold Prescription
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate("REJECTED")}
                    disabled={isUpdating}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-danger text-danger bg-danger/5 hover:bg-danger/10 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    <XCircleIcon />
                    Reject
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_auto_1.2fr] xl:gap-10">

        {/* ── Left Card: Digital Prescription ── */}
        <Card className="shadow-none border border-border-color">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <FileTextIcon />
              <h2 className="font-semibold text-base">Digital Prescription</h2>
            </div>
          </CardHeader>
          <Divider />

          <CardBody className="p-0 block">
            {/* Doctor info */}
            <div className="p-4 sm:p-5">
              <User
                avatarProps={{
                  src: "https://i.pravatar.cc/150?u=a04258114e29026702d",
                }}
                description={prescription.doctor.specialization ?? "Doctor"}
                name={prescription.doctor.name}
                classNames={{
                  name: "font-semibold text-sm",
                  description: "text-xs text-secondary",
                }}
              />
            </div>

            {/* Patient info */}
            <div className="px-4 sm:px-5 py-4 bg-background-secondary border-y border-border-color">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">
                    Patient
                  </p>
                  <p className="font-semibold text-sm">{prescription.patient.name}</p>
                  <p className="text-xs text-secondary mt-0.5 flex items-center gap-1">
                    <UserIcon />
                    {prescription.patient.age} yrs · {prescription.patient.gender}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-secondary bg-background rounded-lg px-3 py-1.5 border border-border-color self-start">
                  <PhoneIcon />
                  {prescription.patient.mobile}
                </div>
              </div>
            </div>

            {/* Medicines list */}
            <div className="p-4 sm:p-5">
              <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-3">
                Prescribed Medicines ({prescription.medicines.length})
              </p>

              <div className="space-y-1">
                {prescription.medicines.map((med: any, idx: number) => (
                  <div
                    key={med.id}
                    className={`py-3 ${idx > 0 ? "border-t border-border-color" : ""}`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                        <PillIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{med.medicineName}</p>
                        <p className="text-xs text-primary mt-0.5">
                          {med.strength} · {med.manufacturer}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {[med.dosage, med.frequency, med.duration].filter(Boolean).map((tag: string, ti: number) => (
                            <span key={ti} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-background-secondary border border-border-color text-secondary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Divider arrow: xl only */}
        <div className="hidden xl:flex items-center justify-center">
          <Image src={Icons.arrowDividerIcon} />
        </div>

        {/* ── Right Card: Invoice ── */}
        <Card className="shadow-none border border-border-color">
          <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-3">
            <div className="flex items-center gap-2 text-primary">
              <ReceiptIcon />
              <h2 className="font-semibold text-base">
                {isCompleted ? "Invoice Details" : "New Invoice"}
              </h2>
            </div>
            <span className="text-xs text-secondary bg-background-secondary border border-border-color rounded-lg px-3 py-1 self-start sm:self-auto flex items-center gap-1">
              <CalendarIcon />
              {new Date(prescription.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </span>
          </CardHeader>
          <Divider />

          <CardBody className="p-4 sm:p-5">
            {/* Customer section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Customer Name"
                name="customerName"
                control={rhfControl}
                isDisabled={isCompleted}
              />
              <InputField
                label="Contact No."
                name="mobile"
                control={rhfControl}
                isDisabled={isCompleted}
              />
            </div>

            {/* Invoice Table */}
            <div className="border border-border-color rounded-xl mt-5 overflow-hidden">
              {/* Desktop Header */}
              <div className="hidden lg:grid lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.6fr_0.8fr_1fr_40px] px-4 py-2.5 bg-background-secondary text-[11px] font-semibold text-secondary uppercase tracking-wider border-b border-border-color">
                <p>Item</p>
                <p>Batch</p>
                <p>Expiry</p>
                <p>Qty</p>
                <p>Price</p>
                <p className="text-right">Total</p>
                <p />
              </div>

              <div className="flex flex-col divide-y divide-border-color">
                {invoiceItems
                  .filter((it) => !(isCompleted && it.status === "NO_MATCH"))
                  .map((item, i) => {
                    const unitInclusive = Number(item.sellingPrice || 0);
                    const gstPerc = Number(item.gstPercentage || 0);
                    const qty = Number(item.qty || 0);
                    const basePerUnit = gstPerc > 0 ? unitInclusive / (1 + gstPerc / 100) : unitInclusive;
                    const gstPerUnit = unitInclusive - basePerUnit;
                    const totalExcl = basePerUnit * qty;
                    const gstAmt = gstPerUnit * qty;
                    const totalVal = unitInclusive * qty;

                    const expiry = item.expiryDate
                      ? new Date(item.expiryDate).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                        })
                      : "—";

                    const isNoMatch = item.status === "NO_MATCH";

                    return (
                      <div
                        key={item.productId || item.prescriptionId || i}
                        className={`flex flex-col lg:grid lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.6fr_0.8fr_1fr_40px] px-4 py-4 lg:py-3 lg:items-center gap-3 lg:gap-0 ${isNoMatch ? "bg-red-50/50" : ""}`}
                      >
                        {/* ITEM */}
                        <div className="min-w-0 flex justify-between items-start lg:block">
                          <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
                            <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${isNoMatch ? "bg-red-100 text-red-500" : "bg-primary/10 text-primary"}`}>
                              <PillIcon />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{item.medicineName}</p>
                              {item.manufacturer && (
                                <p className="text-[11px] text-secondary truncate">{item.manufacturer}</p>
                              )}
                              <div className="mt-1">
                                {isNoMatch ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                    <span className="w-1 h-1 rounded-full bg-red-500" />
                                    No Match
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                    <PackageIcon />
                                    Stock: {item.availableStock ?? 0}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {!isCompleted && (
                            <div className="lg:hidden">
                              <button
                                onClick={() => removeItem(i)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Batch */}
                        <div className="flex justify-between lg:block lg:pr-2">
                          <span className="lg:hidden text-[11px] text-secondary uppercase font-semibold tracking-wide">Batch</span>
                          <span className="text-sm text-slate-700 font-mono truncate">{item.batchNumber || "—"}</span>
                        </div>

                        {/* Expiry */}
                        <div className="flex justify-between lg:block lg:pr-2">
                          <span className="lg:hidden text-[11px] text-secondary uppercase font-semibold tracking-wide">Expiry</span>
                          <span className="text-sm text-slate-700">{expiry}</span>
                        </div>

                        {/* Qty */}
                        <div className="flex justify-between items-center lg:block lg:pr-2">
                          <span className="lg:hidden text-[11px] text-secondary uppercase font-semibold tracking-wide">Qty</span>
                          <input
                            type="number"
                            value={item.qty}
                            min={1}
                            max={item.availableStock}
                            disabled={isCompleted}
                            className="w-16 px-2 py-1.5 border border-border-color rounded-lg text-sm text-center disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (!value || value < 1) { updateQty(i, 1); return; }
                              if (value > item.availableStock) { updateQty(i, item.availableStock); return; }
                              updateQty(i, value);
                            }}
                          />
                        </div>

                        {/* Price + GST */}
                        <div className="flex justify-between lg:block lg:pr-2">
                          <span className="lg:hidden text-[11px] text-secondary uppercase font-semibold tracking-wide">Price</span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{formatINR(totalExcl)}</p>
                            <p className="text-[10px] text-secondary">GST: {formatINR(gstAmt)}</p>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="flex justify-between lg:block lg:pr-1">
                          <span className="lg:hidden text-[11px] text-secondary uppercase font-semibold tracking-wide">Total</span>
                          <span className="font-bold text-sm text-slate-900 lg:text-right block">{formatINR(totalVal)}</span>
                        </div>

                        {/* Delete (desktop) */}
                        {!isCompleted && (
                          <div className="hidden lg:flex justify-end">
                            <button
                              onClick={() => removeItem(i)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {invoiceItems.length === 0 && (
                  <div className="py-10 flex flex-col items-center gap-2 text-secondary">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                    </svg>
                    <p className="text-sm">No items added to invoice</p>
                  </div>
                )}
              </div>
            </div>

            {/* Medicine Search */}
            {!isCompleted && (
              <div className="mt-4 relative" ref={dropdownWrapRef}>
                <Input
                  placeholder="Search medicines to add..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  startContent={
                    <span className="text-secondary">
                      <SearchIcon />
                    </span>
                  }
                  isClearable
                  onClear={() => setSearchTerm("")}
                  classNames={{
                    inputWrapper: "rounded-xl border border-border-color bg-background shadow-none",
                  }}
                />

                {showDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border-color rounded-xl shadow-xl max-h-60 overflow-y-auto bottom-full mb-1">
                    {isFetching ? (
                      <div className="p-6 text-center">
                        <Spinner size="sm" />
                      </div>
                    ) : searchItems.length > 0 ? (
                      searchItems.map((item: any) => {
                        const stockItem = item.stock?.[0];
                        return (
                          <div
                            key={item.medicineId || item.productId}
                            className="p-3 hover:bg-background-secondary cursor-pointer border-b border-border-color last:border-0 transition-colors"
                            onClick={() => addItem(item)}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                  <PillIcon />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm truncate">{item.name || item.medicineName}</p>
                                  <p className="text-xs text-secondary mt-0.5">{item.strength} · {item.manufacturer || "N/A"}</p>
                                  <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                                    <PackageIcon />
                                    Stock: {stockItem?.availableStrips || item.availableQuantity || 0}
                                    &nbsp;·&nbsp;
                                    ₹{stockItem?.sellingPrice || item.sellingPrice || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                {stockItem?.expiryDate && (
                                  <span className="text-[10px] text-red-500 font-medium whitespace-nowrap bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                    Exp: {new Date(stockItem.expiryDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                                  </span>
                                )}
                                <span className="text-[10px] text-primary flex items-center gap-0.5">
                                  Add <ChevronRightIcon />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center flex flex-col items-center gap-2 text-secondary">
                        <SearchIcon />
                        <p className="text-sm">No medicines found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardBody>

          {/* Footer: total + confirm */}
          <CardFooter className="bg-background-secondary block p-4 sm:p-5 border-t border-border-color">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider font-semibold">Total Payable</p>
                <p className="font-bold text-xl sm:text-2xl text-primary mt-0.5">
                  {formatINR(total)}
                </p>
              </div>
              <div className="text-right text-xs text-secondary">
                <p>{invoiceItems.filter(it => it.status !== "NO_MATCH").length} item{invoiceItems.filter(it => it.status !== "NO_MATCH").length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {prescription.status !== "REJECTED" &&
              prescription.status !== "COMPLETED" && (
                <button
                  onClick={handleCreateInvoice}
                  disabled={isCreating}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {isCreating ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <PrinterIcon />
                  )}
                  Confirm & Print Invoice
                </button>
              )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PrescriptionDetails;
